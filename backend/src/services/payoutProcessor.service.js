import { prisma } from './prisma.service.js';

/**
 * Process a single payout request automatically.
 * 
 * Lifecycle:
 * PENDING -> PROCESSING -> PAID (if eligible)
 * PENDING -> ON_HOLD (if exception condition like suspended account or missing bank details)
 */
export async function processSinglePayout(payoutId) {
  try {
    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: {
        wallet: {
          include: {
            user: true
          }
        }
      }
    });

    if (!payout) return { success: false, reason: 'Payout request not found' };

    // Idempotency: only process requests in PENDING status
    if (payout.status !== 'PENDING') {
      return { success: false, reason: `Payout is in ${payout.status} state, skipping automatic processing.` };
    }

    const user = payout.wallet?.user;
    const wallet = payout.wallet;

    // Eligibility Check 1: User account must exist and not be suspended
    if (!user || user.isSuspended) {
      await prisma.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'ON_HOLD',
          rejectionReason: 'Account suspended — placed on hold for administrative review.'
        }
      });

      await prisma.notification.create({
        data: {
          userId: payout.userId,
          title: 'Payout Placed On Hold',
          message: `Your withdrawal request of ₹${payout.amount} has been placed ON_HOLD for administrative review.`
        }
      });

      return { success: false, status: 'ON_HOLD', reason: 'User account suspended' };
    }

    // Eligibility Check 2: Complete bank settlement details
    if (!payout.bankName || !payout.accountNumber || !payout.ifscCode || !payout.accountHolder) {
      await prisma.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'ON_HOLD',
          rejectionReason: 'Missing or incomplete bank settlement details.'
        }
      });

      return { success: false, status: 'ON_HOLD', reason: 'Incomplete bank details' };
    }

    // Eligibility Check 3: Reserved balance check
    if (!wallet || wallet.reservedBalance < payout.amount) {
      await prisma.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'ON_HOLD',
          rejectionReason: 'Wallet reserved balance mismatch — placed on hold for administrative review.'
        }
      });

      return { success: false, status: 'ON_HOLD', reason: 'Reserved balance mismatch' };
    }

    // Execute automatic settlement in an atomic database transaction
    const refNum = `PAYOUT_AUTO_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const settledResult = await prisma.$transaction(async (tx) => {
      // Re-verify payout status inside transaction lock
      const currentPayout = await tx.payoutRequest.findUnique({
        where: { id: payoutId }
      });

      if (!currentPayout || currentPayout.status !== 'PENDING') {
        throw new Error('Payout status changed concurrently.');
      }

      // 1. Move status PENDING -> PROCESSING -> PAID (COMPLETED)
      const updatedPayout = await tx.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'PAID',
          processedAt: new Date(),
          referenceNumber: refNum
        }
      });

      // 2. Update Wallet: reservedBalance -= payoutAmount, totalWithdrawn += payoutAmount
      const currentWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          reservedBalance: Math.max(0, currentWallet.reservedBalance - payout.amount),
          totalWithdrawn: currentWallet.totalWithdrawn + payout.amount
        }
      });

      // 3. Create WITHDRAWAL_COMPLETED WalletTransaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: payout.userId,
          type: 'WITHDRAWAL_COMPLETED',
          sourceType: 'WITHDRAWAL',
          sourceId: `${payout.id}_SETTLED`,
          grossAmount: payout.amount,
          netAmount: payout.amount,
          status: 'COMPLETED',
          description: `Withdrawal of ₹${payout.amount} automatically processed and settled to ${payout.bankName} ending in ${payout.accountNumber.slice(-4)}. Ref: ${refNum}`
        }
      });

      // 4. Send user notification
      await tx.notification.create({
        data: {
          userId: payout.userId,
          title: 'Payout Settled!',
          message: `Your withdrawal request of ₹${payout.amount} has been automatically processed and settled to your bank account. Ref: ${refNum}.`
        }
      });

      return updatedPayout;
    });

    console.log(`[Payout Processor] Automatically settled Payout ID ${payoutId} for ₹${payout.amount}`);
    return { success: true, status: 'PAID', data: settledResult };

  } catch (error) {
    console.error(`[Payout Processor] Error processing payout ${payoutId}:`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Process all pending payouts automatically.
 */
export async function processPendingPayouts() {
  try {
    const pendingPayouts = await prisma.payoutRequest.findMany({
      where: { status: 'PENDING' },
      select: { id: true }
    });

    for (const p of pendingPayouts) {
      await processSinglePayout(p.id);
    }
  } catch (error) {
    console.error('[Payout Processor] Error in periodic pending payouts batch:', error);
  }
}
