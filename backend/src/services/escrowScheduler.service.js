import { prisma } from './prisma.service.js';
import { getOrCreateWallet } from '../controllers/wallet.controller.js';
import { releaseSellerEarning } from '../controllers/order.controller.js';
import { getPlatformSettings } from '../config/platformSettings.js';
import { processPendingPayouts } from './payoutProcessor.service.js';

export function startEscrowScheduler() {
  console.log('[Escrow Scheduler] Background job initialized.');
  
  // Run check every 2 minutes
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Find all bookings awaiting confirmation where the deadline has expired and payment is held
      const expiredAppointments = await prisma.appointment.findMany({
        where: {
          bookingStatus: 'AWAITING_CUSTOMER_CONFIRMATION',
          paymentStatus: 'HELD',
          confirmationDeadline: {
            lte: now
          }
        },
        include: {
          service: true
        }
      });
      
      if (expiredAppointments.length === 0) return;
      
      console.log(`[Escrow Scheduler] Found ${expiredAppointments.length} expired confirmation deadlines. Processing auto-release...`);
      
      for (const app of expiredAppointments) {
        try {
          await prisma.$transaction(async (tx) => {
            // 1. Update appointment to COMPLETED / RELEASED
            await tx.appointment.update({
              where: { id: app.id },
              data: {
                status: 'COMPLETED',
                bookingStatus: 'COMPLETED',
                paymentStatus: 'RELEASED',
                releasedAt: now
              }
            });
            
            // 2. Create PayoutHistory record (status PENDING_PAYMENT)
            await tx.payoutHistory.create({
              data: {
                sellerId: app.providerId,
                amount: app.providerAmount,
                status: 'PENDING_PAYMENT',
                transactionId: `PAYOUT_AUTO_${app.id.slice(0, 8).toUpperCase()}`
              }
            });
            
            // 3. Create payment transaction record
            await tx.paymentTransaction.create({
              data: {
                appointmentId: app.id,
                providerId: app.providerId,
                buyerId: app.buyerId,
                grossAmount: app.commissionAmount + app.providerAmount,
                commissionAmount: app.commissionAmount,
                providerAmount: app.providerAmount,
                paymentStatus: 'RELEASED',
                paymentMethod: 'ESCROW_AUTO_PAYOUT',
                transactionType: 'PAYOUT',
                releasedAt: now
              }
            });

            // 4. Update Wallet (Pending -> Available)
            const existingTx = await tx.walletTransaction.findFirst({
              where: {
                userId: app.providerId,
                sourceType: 'SERVICE_APPOINTMENT',
                sourceId: app.id
              }
            });

            const providerWallet = await getOrCreateWallet(app.providerId, tx);
            const baseServiceAmount = app.service?.price || 0;
            // Use stored snapshot values — do NOT recalculate using current settings
            const commissionAmount = app.commissionAmount || 0;
            const providerNetServiceAmount = baseServiceAmount - commissionAmount;
            const gstAmount = app.providerAmount - providerNetServiceAmount;

            if (!existingTx) {
              // No transaction existed (e.g. booked for free or manual bypass), create released transaction
              await tx.wallet.update({
                where: { id: providerWallet.id },
                data: {
                  availableBalance: providerWallet.availableBalance + app.providerAmount,
                  totalEarnings: providerWallet.totalEarnings + providerNetServiceAmount
                }
              });

              await tx.walletTransaction.create({
                data: {
                  walletId: providerWallet.id,
                  userId: app.providerId,
                  type: 'EARNING_RELEASED',
                  sourceType: 'SERVICE_APPOINTMENT',
                  sourceId: app.id,
                  grossAmount: baseServiceAmount,
                  gstAmount: gstAmount,
                  commissionAmount: commissionAmount,
                  netAmount: app.providerAmount,
                  status: 'COMPLETED',
                  description: `Earning auto-released (72h limit) for completed service: ${app.service?.name || 'Clinic Service'}`
                }
              });
            } else if (existingTx.type === 'EARNING_PENDING') {
              // Transition existing pending to released
              await tx.walletTransaction.update({
                where: { id: existingTx.id },
                data: {
                  type: 'EARNING_RELEASED',
                  status: 'COMPLETED',
                  description: `Earning auto-released (72h limit) for completed service: ${app.service?.name || 'Clinic Service'}`
                }
              });

              await tx.wallet.update({
                where: { id: providerWallet.id },
                data: {
                  pendingBalance: Math.max(0, providerWallet.pendingBalance - app.providerAmount),
                  availableBalance: providerWallet.availableBalance + app.providerAmount,
                  totalEarnings: providerWallet.totalEarnings + providerNetServiceAmount
                }
              });
            }
            
            // 5. Notifications
            // Notify Provider
            await tx.notification.create({
              data: {
                userId: app.providerId,
                title: 'Auto-Payment Released',
                message: `Escrow auto-released! ₹${app.providerAmount} payout has been released to your available balance for completed service: ${app.service?.name || 'Clinic Service'}.`
              }
            });
            
            // Notify Buyer
            await tx.notification.create({
              data: {
                userId: app.buyerId,
                title: 'Auto-Release Completed',
                message: `Escrow for ${app.service?.name || 'Clinic Service'} was automatically released after 72 hours of inactivity.`
              }
            });
          });

          console.log(`[Escrow Scheduler] Auto-released payment for Appointment ID: ${app.id}`);
        } catch (err) {
          console.error(`[Escrow Scheduler] Failed to auto-release Appointment ID: ${app.id}`, err);
        }
      }

      // ─── Scan and process expired physical order item deliveries ───────────
      const expiredItems = await prisma.orderItem.findMany({
        where: {
          status: 'DELIVERED',
          buyerDeliveryConfirmed: false,
          deliveryDisputed: false,
          sellerEarningsReleased: false,
          deliveryConfirmationDeadline: {
            lte: now
          }
        },
        include: {
          product: true,
          order: true
        }
      });

      for (const item of expiredItems) {
        try {
          await prisma.$transaction(async (tx) => {
            await releaseSellerEarning(item.id, tx);

            // Notify Buyer about auto-confirmation
            await tx.notification.create({
              data: {
                userId: item.order.buyerId,
                title: 'Order Automatically Confirmed',
                message: `Your delivery for ${item.product.name} (Order #${item.orderId.slice(-8).toUpperCase()}) has been automatically confirmed after 72 hours.`
              }
            });
          });
          console.log(`[Escrow Scheduler] Auto-released payment for OrderItem ID: ${item.id}`);
        } catch (err) {
          console.error(`[Escrow Scheduler] Failed to auto-release OrderItem ID: ${item.id}`, err);
        }
      }

      // Process any pending payout requests automatically
      await processPendingPayouts();

    } catch (error) {
      console.error('[Escrow Scheduler] Error scanning expired deadlines or processing payouts:', error);
    }
  }, 60000); // Run every 60 seconds
}

