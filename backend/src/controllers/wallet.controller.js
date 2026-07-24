import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { config } from '../config/index.js';
import { getPlatformSettings } from '../config/platformSettings.js';
import { processSinglePayout } from '../services/payoutProcessor.service.js';

// Helper to safely reconcile wallet transactions
export async function reconcileWallet(userId, wallet, tx = prisma) {
  // Find all appointments for this provider
  const appointments = await tx.appointment.findMany({
    where: {
      providerId: userId,
      paymentStatus: { in: ['HELD', 'RELEASED'] }
    },
    include: { service: true }
  });

  for (const app of appointments) {
    if (!app.service || app.service.price <= 0) continue;

    // Use stored snapshot values — do NOT recalculate using current settings
    const baseServiceAmount = app.service.price;
    const commissionAmount = app.commissionAmount || 0;
    const providerAmount = app.providerAmount || 0;
    const providerNetServiceAmount = baseServiceAmount - commissionAmount;
    const gstAmount = providerAmount - providerNetServiceAmount;

    const existingTx = await tx.walletTransaction.findFirst({
      where: {
        walletId: wallet.id,
        sourceType: 'SERVICE_APPOINTMENT',
        sourceId: app.id
      }
    });

    if (!existingTx) {
      if (app.paymentStatus === 'HELD') {
        try {
          const doubleCheck = await tx.walletTransaction.findFirst({
            where: {
              sourceType: 'SERVICE_APPOINTMENT',
              sourceId: app.id
            }
          });
          if (!doubleCheck) {
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                userId,
                type: 'EARNING_PENDING',
                sourceType: 'SERVICE_APPOINTMENT',
                sourceId: app.id,
                grossAmount: baseServiceAmount,
                gstAmount,
                commissionAmount,
                netAmount: providerAmount,
                status: 'PENDING',
                description: `Pending earning for service appointment: ${app.service.name}`
              }
            });

            await tx.wallet.update({
              where: { id: wallet.id },
              data: { pendingBalance: { increment: providerAmount } }
            });
          }
        } catch (err) {
          if (err.code !== 'P2002') throw err;
        }
      } else if (app.paymentStatus === 'RELEASED') {
        try {
          const doubleCheck = await tx.walletTransaction.findFirst({
            where: {
              sourceType: 'SERVICE_APPOINTMENT',
              sourceId: app.id
            }
          });
          if (!doubleCheck) {
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                userId,
                type: 'EARNING_RELEASED',
                sourceType: 'SERVICE_APPOINTMENT',
                sourceId: app.id,
                grossAmount: baseServiceAmount,
                gstAmount,
                commissionAmount,
                netAmount: providerAmount,
                status: 'COMPLETED',
                description: `Released earning for service booking: ${app.service.name}`
              }
            });

            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                availableBalance: { increment: providerAmount },
                totalEarnings: { increment: providerNetServiceAmount }
              }
            });
          }
        } catch (err) {
          if (err.code !== 'P2002') throw err;
        }
      }
    } else if (existingTx.type === 'EARNING_PENDING' && app.paymentStatus === 'RELEASED') {
      try {
        const updateResult = await tx.walletTransaction.updateMany({
          where: {
            id: existingTx.id,
            type: 'EARNING_PENDING'
          },
          data: {
            type: 'EARNING_RELEASED',
            status: 'COMPLETED',
            description: `Released earning for service booking: ${app.service.name}`
          }
        });

        if (updateResult.count > 0) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              pendingBalance: { decrement: providerAmount },
              availableBalance: { increment: providerAmount },
              totalEarnings: { increment: providerNetServiceAmount }
            }
          });
        }
      } catch (err) {
        console.error("Reconciliation transition error:", err);
      }
    }
  }
}

// Helper to safely fetch or initialize wallet
export async function getOrCreateWallet(userId, tx = prisma) {
  let wallet = await tx.wallet.findUnique({
    where: { userId }
  });
  if (!wallet) {
    wallet = await tx.wallet.create({
      data: {
        userId,
        availableBalance: 0,
        pendingBalance: 0,
        reservedBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0
      }
    });
  }

  // Perform reconciliation/backfill inside transaction
  await reconcileWallet(userId, wallet, tx);

  // Fetch updated wallet
  wallet = await tx.wallet.findUnique({
    where: { userId }
  });

  return wallet;
}

export async function getWalletDetails(req, res, next) {
  try {
    const userId = req.user.id;
    if (req.user.role !== 'SELLER' && req.user.role !== 'SERVICE_PROVIDER') {
      return next(new AppError(403, 'Only sellers and service providers have wallets.'));
    }

    const wallet = await getOrCreateWallet(userId);
    res.status(200).json({
      status: 'success',
      data: {
        id: wallet.id,
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        reservedBalance: wallet.reservedBalance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawn: wallet.totalWithdrawn
      }
    });
  } catch (error) { next(error); }
}

export async function getWalletTransactions(req, res, next) {
  try {
    const userId = req.user.id;
    if (req.user.role !== 'SELLER' && req.user.role !== 'SERVICE_PROVIDER') {
      return next(new AppError(403, 'Unauthorized.'));
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const wallet = await getOrCreateWallet(userId);

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.walletTransaction.count({
        where: { walletId: wallet.id }
      })
    ]);

    res.status(200).json({
      status: 'success',
      page,
      pages: Math.ceil(total / limit),
      total,
      data: transactions
    });
  } catch (error) { next(error); }
}

export async function requestWithdrawal(req, res, next) {
  try {
    const userId = req.user.id;
    const { amount, bankName, accountNumber, ifscCode, accountHolder } = req.body;

    if (req.user.role !== 'SELLER' && req.user.role !== 'SERVICE_PROVIDER') {
      return next(new AppError(403, 'Unauthorized.'));
    }

    const withdrawAmt = parseFloat(amount);
    if (isNaN(withdrawAmt) || withdrawAmt <= 0) {
      return next(new AppError(400, 'Please enter a valid positive withdrawal amount.'));
    }

    const settings = await getPlatformSettings();
    if (withdrawAmt < settings.minWithdrawalAmount) {
      return next(new AppError(400, `Minimum payout amount is ₹${settings.minWithdrawalAmount}.`));
    }

    if (!bankName || !accountNumber || !ifscCode || !accountHolder) {
      return next(new AppError(400, 'All bank settlement account details are required.'));
    }

    // Pre-check available balance before transaction
    const initialWallet = await getOrCreateWallet(userId);
    if (withdrawAmt > initialWallet.availableBalance) {
      const availFormatted = Number.isInteger(initialWallet.availableBalance) 
        ? initialWallet.availableBalance 
        : initialWallet.availableBalance.toFixed(2);
      return next(new AppError(400, `Insufficient available balance. Your available balance is ₹${availFormatted}.`));
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await getOrCreateWallet(userId, tx);

      // Revalidate available balance inside transaction lock to prevent concurrent over-withdrawal
      if (withdrawAmt > wallet.availableBalance) {
        const availFormatted = Number.isInteger(wallet.availableBalance) 
          ? wallet.availableBalance 
          : wallet.availableBalance.toFixed(2);
        throw new AppError(400, `Insufficient available balance. Your available balance is ₹${availFormatted}.`);
      }

      // Check if there's already a pending payout request to avoid duplicate spamming
      const pendingRequest = await tx.payoutRequest.findFirst({
        where: { userId, status: 'PENDING' }
      });
      if (pendingRequest) {
        throw new AppError(400, 'You already have a pending payout request under processing.');
      }

      // 1. Deduct from availableBalance and add to reservedBalance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: wallet.availableBalance - withdrawAmt,
          reservedBalance: wallet.reservedBalance + withdrawAmt
        }
      });

      // 2. Create PayoutRequest
      const payout = await tx.payoutRequest.create({
        data: {
          userId,
          walletId: wallet.id,
          amount: withdrawAmt,
          status: 'PENDING',
          bankName,
          accountNumber, // Securely saved in DB
          ifscCode,
          accountHolder
        }
      });

      // 3. Create Transaction log
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'WITHDRAWAL_RESERVED',
          sourceType: 'WITHDRAWAL',
          sourceId: payout.id,
          grossAmount: withdrawAmt,
          netAmount: withdrawAmt,
          status: 'PENDING',
          description: `Withdrawal request submitted to ${bankName} account ending in ${accountNumber.slice(-4)}`
        }
      });

      // 4. Notify user about withdrawal request
      await tx.notification.create({
        data: {
          userId,
          title: 'Payout Request Submitted',
          message: `Your withdrawal request of ₹${withdrawAmt} has been submitted.`
        }
      });

      return { wallet: updatedWallet, payout };
    });

    // Automatically trigger payout processing for eligible request (background execution)
    processSinglePayout(result.payout.id).catch(err => {
      console.error('[Payout Request] Automatic background payout execution error:', err);
    });

    res.status(201).json({
      status: 'success',
      message: 'Withdrawal request created successfully.',
      data: result
    });
  } catch (error) { next(error); }
}

export async function getPayoutHistory(req, res, next) {
  try {
    const userId = req.user.id;
    if (req.user.role !== 'SELLER' && req.user.role !== 'SERVICE_PROVIDER') {
      return next(new AppError(403, 'Unauthorized.'));
    }

    const wallet = await getOrCreateWallet(userId);
    const payouts = await prisma.payoutRequest.findMany({
      where: { walletId: wallet.id },
      orderBy: { requestedAt: 'desc' }
    });

    // Mask bank accounts in JSON response
    const maskedPayouts = payouts.map(p => ({
      ...p,
      accountNumber: p.accountNumber ? `••••••${p.accountNumber.slice(-4)}` : null
    }));

    res.status(200).json({
      status: 'success',
      data: maskedPayouts
    });
  } catch (error) { next(error); }
}
