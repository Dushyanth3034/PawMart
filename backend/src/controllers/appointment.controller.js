import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { config } from '../config/index.js';
import { getPlatformSettings } from '../config/platformSettings.js';
import { processRazorpayRefund } from './payment.controller.js';

const parseTime = (timeStr) => {
  if (!timeStr) return { hour: 0, minute: 0 };
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const nums = clean.replace(/[AP]M/, '').trim();
  const parts = nums.split(':');
  let hr = parseInt(parts[0], 10);
  let min = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isPM && hr < 12) hr += 12;
  if (isAM && hr === 12) hr = 0;
  return { hour: hr, minute: min };
};

const getIndiaTimeComponents = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3600000 * 5.5)); // IST is UTC+5.5
  return {
    year: nd.getUTCFullYear(),
    month: nd.getUTCMonth(),
    date: nd.getUTCDate(),
    hour: nd.getUTCHours(),
    minute: nd.getUTCMinutes()
  };
};

import { getOrCreateWallet } from './wallet.controller.js';

export async function createAppointment(req, res, next) {
  try {
    const { 
      serviceId, 
      date, 
      selectedSession,
      dogName,
      dogAgeCategory,
      dogBreed,
      dogWeight,
      dogGender,
      dogAllergies,
      dogConditions,
      dogVaccinated,
      providerId, 
      serviceName, 
      servicePrice, 
      serviceDuration, 
      serviceCategory 
    } = req.body;
    const buyerId = req.user.id;

    if (!date) {
      return next(new AppError('Please select a date for your appointment.', 400));
    }

    const isMeet = serviceId && serviceId.startsWith('meet-');
    if (!isMeet) {
      if (!selectedSession) {
        return next(new AppError('Please select a session (Morning or Afternoon).', 400));
      }
      if (!dogName || !dogAgeCategory) {
        return next(new AppError('Dog Name and Dog Age Category are required.', 400));
      }
    }

    // 2. Resolve Service and Provider dynamically
    let resolvedProviderId = providerId;
    let service = null;

    if (serviceId) {
      // Check if it is a meet request for a pet adoption
      if (serviceId.startsWith('meet-')) {
        const petProductId = serviceId.replace('meet-', '');
        const petProduct = await prisma.product.findUnique({ where: { id: petProductId } });
        if (petProduct) {
          resolvedProviderId = petProduct.sellerId;
        }
      } else {
        // Look up standard service
        service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (service) {
          resolvedProviderId = service.providerId;
        }
      }
    }

    let provider = null;
    if (resolvedProviderId) {
      provider = await prisma.user.findUnique({ where: { id: resolvedProviderId } });
    }
    if (!provider) {
      provider = await prisma.user.findFirst({
        where: { role: 'SERVICE_PROVIDER' }
      });
    }
    if (!provider) {
      provider = await prisma.user.create({
        data: {
          email: `provider_${Date.now()}@pawmart.com`,
          passwordHash: '$2b$10$dummyHashToSatisfyConstraints',
          firstName: 'Evelyn',
          lastName: 'Carter',
          role: 'SERVICE_PROVIDER'
        }
      });
    }

    if (!service) {
      service = await prisma.service.findUnique({ where: { id: serviceId || '1' } });
      if (!service) {
        service = await prisma.service.create({
          data: {
            id: serviceId || '1',
            providerId: provider.id,
            name: serviceName || 'Clinical Vaccination & Triage',
            description: 'Vetted pet care service.',
            price: servicePrice || 49.0,
            duration: serviceDuration || 30,
            category: serviceCategory || 'VET'
          }
        });
      }
    }

    // ─── Financial calculations ──────────────────────────────────────────────
    const baseServiceAmount = service.price || 0;
    
    // Determine GST percentage based on category
    const cat = (service.category || '').toUpperCase();
    const gstPercentage = (cat === 'VET' || cat === 'HEALTH_CHECKUP')
      ? 0
      : (service.gst !== null && service.gst !== undefined ? service.gst : 18);

    const gstAmount = baseServiceAmount * (gstPercentage / 100);
    const grossCustomerPayment = baseServiceAmount + gstAmount;

    const settings = await getPlatformSettings();
    const commissionRate = settings.platformCommissionRate / 100; // e.g. 10.0 / 100 = 0.10
    const commissionAmount = baseServiceAmount * commissionRate;
    const providerNetServiceAmount = baseServiceAmount - commissionAmount;

    // This is the actual amount released to provider (net + GST)
    const providerAmount = providerNetServiceAmount + gstAmount; 
    const grossAmount = grossCustomerPayment; // Total buyer payment

    const initialStatus = grossAmount > 0 ? 'BOOKED' : 'PENDING';
    const initialBookingStatus = 'BOOKED';
    const initialPaymentStatus = grossAmount > 0 ? 'HELD' : 'RELEASED';

    let startOfDate, endOfDate;
    if (typeof date === 'string' && date.includes('-')) {
      const parts = date.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      startOfDate = new Date(y, m, d, 0, 0, 0, 0);
      endOfDate = new Date(y, m, d, 23, 59, 59, 999);
    } else {
      const parsedDate = new Date(date);
      startOfDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0, 0);
      endOfDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59, 999);
    }

    // Timezone safe checks
    const ind = getIndiaTimeComponents();
    const startOfTodayIndia = new Date(ind.year, ind.month, ind.date, 0, 0, 0, 0);

    if (startOfDate < startOfTodayIndia) {
      return next(new AppError('Appointment date cannot be in the past.', 400));
    }

    // Create appointment and transaction inside a database transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // Concurrency check for dynamic session availability
      if (!isMeet) {
        const currentService = await tx.service.findUnique({ where: { id: service.id } });
        if (!currentService) {
          throw new AppError('Service not found.', 404);
        }

        // Validate session existence
        if (selectedSession !== 'morning' && selectedSession !== 'afternoon') {
          throw new AppError('Invalid session selected.', 400);
        }

        // Validate session expiration for today
        const isToday = startOfDate.getFullYear() === ind.year &&
                        startOfDate.getMonth() === ind.month &&
                        startOfDate.getDate() === ind.date;
        if (isToday) {
          const endTimeStr = selectedSession === 'morning'
            ? (currentService.morningEndTime || '13:00')
            : (currentService.afternoonEndTime || '17:00');
          const { hour, minute } = parseTime(endTimeStr);
          if (ind.hour > hour || (ind.hour === hour && ind.minute >= minute)) {
            throw new AppError('This session is no longer available. Please select another session.', 400);
          }
        }

        const capacity = selectedSession === 'morning'
          ? (currentService.morningCapacity ?? 5)
          : (currentService.afternoonCapacity ?? 5);

        const activeBookingsCount = await tx.appointment.count({
          where: {
            serviceId: service.id,
            date: {
              gte: startOfDate,
              lte: endOfDate
            },
            selectedSession,
            status: {
              notIn: ['CANCELLED', 'REJECTED', 'REFUNDED']
            }
          }
        });

        if (activeBookingsCount >= capacity) {
          throw new AppError('This session is fully booked. Please choose another session or date.', 400);
        }
      }

      // Map session timings
      let finalStartTime = '14:00';
      let finalEndTime = '14:30';
      if (!isMeet) {
        if (selectedSession === 'morning') {
          finalStartTime = service.morningStartTime || '09:00';
          finalEndTime = service.morningEndTime || '13:00';
        } else {
          finalStartTime = service.afternoonStartTime || '14:00';
          finalEndTime = service.afternoonEndTime || '18:00';
        }
      }

      const app = await tx.appointment.create({
        data: {
          buyerId,
          serviceId: service.id,
          providerId: provider.id,
          date: startOfDate,
          startTime: finalStartTime,
          endTime: finalEndTime,
          status: initialStatus,
          bookingStatus: initialBookingStatus,
          paymentStatus: initialPaymentStatus,
          commissionAmount,
          providerAmount,
          selectedSession: isMeet ? 'morning' : selectedSession,
          dogName: isMeet ? 'Adoption Dog' : dogName,
          dogAgeCategory: isMeet ? 'Adult' : dogAgeCategory,
          dogBreed: dogBreed || null,
          dogWeight: dogWeight || null,
          dogGender: dogGender || null,
          dogAllergies: dogAllergies || null,
          dogConditions: dogConditions || null,
          dogVaccinated: dogVaccinated || null
        },
        include: {
          service: true,
          buyer: true
        }
      });

      if (grossAmount > 0) {
        // Create payment transaction history
        await tx.paymentTransaction.create({
          data: {
            appointmentId: app.id,
            providerId: provider.id,
            buyerId,
            grossAmount,
            commissionAmount,
            providerAmount,
            paymentStatus: 'HELD',
            paymentMethod: req.body.paymentMethod || 'UPI',
            transactionType: 'PAYMENT',
            razorpayOrderId: req.body.razorpayOrderId || null,
            razorpayPaymentId: req.body.razorpayPaymentId || null,
            transactionReference: req.body.upiId || req.body.bankName || 'MOCK_PAYMENT'
          }
        });

        // ─── Initialize Provider Wallet & Earning Pending ───────────────────
        const providerWallet = await getOrCreateWallet(provider.id, tx);
        await tx.wallet.update({
          where: { id: providerWallet.id },
          data: {
            pendingBalance: providerWallet.pendingBalance + providerAmount
          }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: providerWallet.id,
            userId: provider.id,
            type: 'EARNING_PENDING',
            sourceType: 'SERVICE_APPOINTMENT',
            sourceId: app.id,
            grossAmount: baseServiceAmount,
            gstAmount: gstAmount,
            commissionAmount: commissionAmount,
            netAmount: providerAmount,
            status: 'PENDING',
            description: `Pending earning for service appointment: ${service.name}`
          }
        });

        // Notify Buyer
        await tx.notification.create({
          data: {
            userId: buyerId,
            title: 'Booking Confirmed',
            message: `Your booking for ${service.name} has been confirmed. Payment of ₹${grossAmount} is safely held in escrow.`
          }
        });

        // Notify Provider
        await tx.notification.create({
          data: {
            userId: provider.id,
            title: 'New Booking & Payment Held',
            message: `New booking received for ${service.name}. Payment of ₹${providerAmount} is held in escrow.`
          }
        });
      }

      return app;
    });

    res.status(201).json({
      status: 'success',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
}

export async function getAppointments(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let appointments = [];

    if (role === 'SERVICE_PROVIDER') {
      appointments = await prisma.appointment.findMany({
        where: { providerId: userId },
        include: { service: true, pet: true, buyer: true }
      });
    } else if (role === 'ADMIN') {
      appointments = await prisma.appointment.findMany({
        include: { service: true, pet: true, buyer: true }
      });
    } else {
      appointments = await prisma.appointment.findMany({
        where: { buyerId: userId },
        include: { 
          service: true, 
          pet: true, 
          buyer: true,
          provider: {
            include: { providerProfile: true }
          },
          adoptionRequest: {
            include: {
              pet: {
                include: {
                  images: { orderBy: { order: 'asc' } },
                  seller: {
                    include: { providerProfile: true }
                  }
                }
              }
            }
          }
        }
      });
    }

    const cleanAppointments = appointments.map(app => {
      if (app.provider) {
        const publicName = app.provider.providerProfile?.businessName || app.provider.providerProfile?.clinicName || 'Adoption Clinic';
        app.provider.firstName = publicName;
        app.provider.lastName = '';
      }
      if (app.adoptionRequest && app.adoptionRequest.pet && app.adoptionRequest.pet.seller) {
        const publicName = app.adoptionRequest.pet.seller.providerProfile?.businessName || app.adoptionRequest.pet.seller.providerProfile?.clinicName || 'Adoption Clinic';
        app.adoptionRequest.pet.seller.firstName = publicName;
        app.adoptionRequest.pet.seller.lastName = '';
      }
      return app;
    });

    res.status(200).json({
      status: 'success',
      results: cleanAppointments.length,
      data: cleanAppointments
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const { status, date, startTime, endTime } = req.body;

    // Fetch the current appointment first to inspect details
    const currentApp = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true }
    });

    if (!currentApp) {
      return next(new AppError('Appointment not found', 404));
    }

    let updateData = {};

    if (status) {
      if (status === 'COMPLETED') {
        const isPaid = (currentApp.providerAmount && currentApp.providerAmount > 0) || (currentApp.service?.price && currentApp.service.price > 0);
        if (isPaid) {
          // Paid service -> trigger awaiting customer confirmation workflow
          const settings = await getPlatformSettings();
          updateData.status = 'AWAITING_CUSTOMER_CONFIRMATION';
          updateData.bookingStatus = 'AWAITING_CUSTOMER_CONFIRMATION';
          updateData.paymentStatus = 'HELD';
          updateData.completionRequestedAt = new Date();
          updateData.confirmationDeadline = new Date(Date.now() + settings.escrowConfirmationPeriod * 60 * 60 * 1000); // Dynamic hours
          updateData.providerConfirmed = true;

          // Notify Buyer
          await prisma.notification.create({
            data: {
              userId: currentApp.buyerId,
              title: 'Confirm Service Completion',
              message: `Your provider has marked ${currentApp.service?.name || 'the service'} as completed. Please confirm within 72 hours.`
            }
          });
        } else {
          // Free/zero price service -> direct completion
          updateData.status = 'COMPLETED';
          updateData.bookingStatus = 'COMPLETED';
          updateData.paymentStatus = 'RELEASED';
          updateData.releasedAt = new Date();
          updateData.providerConfirmed = true;
          updateData.customerConfirmed = true;
        }
      } else if (status === 'CANCELLED') {
        // Provider cancellation -> refund escrow if payment was held
        updateData.status = 'CANCELLED';
        updateData.bookingStatus = 'CANCELLED';

        const wasHeld = currentApp.paymentStatus === 'HELD' && currentApp.providerAmount > 0;
        if (wasHeld) {
          updateData.paymentStatus = 'REFUNDED';
          updateData.refundAt = new Date();
        }

        const cancelled = await prisma.$transaction(async (tx) => {
          const app = await tx.appointment.update({
            where: { id },
            data: updateData,
            include: { service: true, buyer: true }
          });

          if (wasHeld) {
            // Create refund transaction record
            await tx.paymentTransaction.create({
              data: {
                appointmentId: app.id,
                providerId: currentApp.providerId || app.providerId,
                buyerId: app.buyerId,
                grossAmount: currentApp.commissionAmount + currentApp.providerAmount,
                commissionAmount: currentApp.commissionAmount,
                providerAmount: currentApp.providerAmount,
                paymentStatus: 'REFUNDED',
                paymentMethod: 'ESCROW_REFUND',
                transactionType: 'REFUND',
                refundedAt: new Date()
              }
            });
          }

          // Notify Buyer with clear cancellation message
          await tx.notification.create({
            data: {
              userId: currentApp.buyerId,
              title: 'Appointment Cancelled by Clinic',
              message: `Your appointment for ${currentApp.service?.name || 'the service'} has been cancelled by the clinic. ${wasHeld ? 'Your payment has been fully refunded. ' : ''}Please book another available session.`
            }
          });

          return app;
        });

        if (wasHeld) {
          processRazorpayRefund(cancelled.id, currentApp.commissionAmount + currentApp.providerAmount, 'Appointment Cancellation Refund').catch(err => {
            console.error('[Appointment Cancel Refund Error]:', err);
          });
        }

        return res.status(200).json({ status: 'success', data: cancelled });
      } else {
        updateData.status = status;
        updateData.bookingStatus = status; // Keep them in sync
      }
    }

    // Only apply date/time fields if explicitly provided (not for status-only updates)
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { service: true, pet: true, buyer: true }
    });

    res.status(200).json({
      status: 'success',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelAppointment(req, res, next) {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.status(200).json({
      status: 'success',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
}

export async function getProviderSchedule(req, res, next) {
  try {
    const { providerId } = req.params;

    const appointments = await prisma.appointment.findMany({
      where: {
        providerId,
        status: { not: 'CANCELLED' }
      },
      select: {
        date: true,
        startTime: true,
        endTime: true
      }
    });

    res.status(200).json({
      status: 'success',
      data: appointments
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmServiceCompletion(req, res, next) {
  try {
    const { id } = req.params;
    const buyerId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true }
    });

    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    if (appointment.buyerId !== buyerId) {
      return next(new AppError('Unauthorized access', 403));
    }

    if (appointment.bookingStatus !== 'AWAITING_CUSTOMER_CONFIRMATION') {
      return next(new AppError('Appointment is not awaiting completion confirmation', 400));
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update appointment status to COMPLETED and paymentStatus to RELEASED
      const app = await tx.appointment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          bookingStatus: 'COMPLETED',
          paymentStatus: 'RELEASED',
          customerConfirmed: true,
          releasedAt: new Date()
        },
        include: { service: true }
      });

      // 2. Create provider PayoutHistory record (status PENDING_PAYMENT)
      await tx.payoutHistory.create({
        data: {
          sellerId: app.providerId,
          amount: app.providerAmount,
          status: 'PENDING_PAYMENT',
          transactionId: `PAYOUT_CONFIRM_${app.id.slice(0, 8).toUpperCase()}`
        }
      });

      // 3. Create payout record in PaymentTransaction
      await tx.paymentTransaction.create({
        data: {
          appointmentId: app.id,
          providerId: app.providerId,
          buyerId: app.buyerId,
          grossAmount: app.commissionAmount + app.providerAmount,
          commissionAmount: app.commissionAmount,
          providerAmount: app.providerAmount,
          paymentStatus: 'RELEASED',
          paymentMethod: 'ESCROW_PAYOUT',
          transactionType: 'PAYOUT',
          releasedAt: new Date()
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
      const commissionAmount = app.commissionAmount;
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
            description: `Earning released for completed service: ${app.service?.name || 'Clinic Service'}`
          }
        });
      } else if (existingTx.type === 'EARNING_PENDING') {
        // Transition existing pending to released
        await tx.walletTransaction.update({
          where: { id: existingTx.id },
          data: {
            type: 'EARNING_RELEASED',
            status: 'COMPLETED',
            description: `Earning released for completed service: ${app.service?.name || 'Clinic Service'}`
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
          title: 'Earnings Released',
          message: `Customer confirmed completion of ${app.service?.name}. Payout of ₹${app.providerAmount} has been released to your available balance.`
        }
      });

      // Notify Buyer
      await tx.notification.create({
        data: {
          userId: app.buyerId,
          title: 'Service Completed',
          message: `You confirmed completion of ${app.service?.name || 'the service'}. Payment of ₹${app.commissionAmount + app.providerAmount} has been released.`
        }
      });

      return app;
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
}


export async function reportServiceIssue(req, res, next) {
  try {
    const { id } = req.params;
    const { disputeReason } = req.body;
    const buyerId = req.user.id;

    if (!disputeReason) {
      return next(new AppError('Dispute reason is required', 400));
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true }
    });

    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    if (appointment.buyerId !== buyerId) {
      return next(new AppError('Unauthorized access', 403));
    }

    if (appointment.bookingStatus !== 'AWAITING_CUSTOMER_CONFIRMATION') {
      return next(new AppError('Appointment is not in confirmable state', 400));
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update appointment to DISPUTED / ON_HOLD
      const app = await tx.appointment.update({
        where: { id },
        data: {
          status: 'DISPUTED',
          bookingStatus: 'DISPUTED',
          paymentStatus: 'ON_HOLD',
          disputeReason
        }
      });

      // 2. Create transaction record for ON_HOLD
      await tx.paymentTransaction.create({
        data: {
          appointmentId: app.id,
          providerId: app.providerId,
          buyerId: app.buyerId,
          grossAmount: app.commissionAmount + app.providerAmount,
          commissionAmount: app.commissionAmount,
          providerAmount: app.providerAmount,
          paymentStatus: 'ON_HOLD',
          paymentMethod: 'ESCROW_HOLD',
          transactionType: 'PAYMENT'
        }
      });

      // 3. Notify provider
      await tx.notification.create({
        data: {
          userId: app.providerId,
          title: 'Dispute Raised by Customer',
          message: `Customer reported an issue for ${appointment.service?.name || 'the service'}: "${disputeReason}". Payout is ON_HOLD.`
        }
      });

      // Notify Buyer
      await tx.notification.create({
        data: {
          userId: app.buyerId,
          title: 'Dispute Filed Successfully',
          message: `Dispute filed for ${appointment.service?.name}. Platform payout is frozen pending resolution.`
        }
      });

      return app;
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
}

export async function respondServiceDispute(req, res, next) {
  try {
    const { id } = req.params;
    const { accept, providerResponse } = req.body;
    const providerId = req.user.id;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true }
    });

    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    if (appointment.providerId !== providerId) {
      return next(new AppError('Unauthorized access', 403));
    }

    if (appointment.bookingStatus !== 'DISPUTED') {
      return next(new AppError('Appointment is not in disputed state', 400));
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (accept) {
        // Provider accepts complaint -> refund buyer
        const app = await tx.appointment.update({
          where: { id },
          data: {
            status: 'REFUNDED',
            bookingStatus: 'REFUNDED',
            paymentStatus: 'REFUNDED',
            refundAt: new Date(),
            providerConfirmed: true
          }
        });

        // Create transaction record for REFUND
        await tx.paymentTransaction.create({
          data: {
            appointmentId: app.id,
            providerId: app.providerId,
            buyerId: app.buyerId,
            grossAmount: app.commissionAmount + app.providerAmount,
            commissionAmount: app.commissionAmount,
            providerAmount: app.providerAmount,
            paymentStatus: 'REFUNDED',
            paymentMethod: 'ESCROW_REFUND',
            transactionType: 'REFUND',
            refundedAt: new Date()
          }
        });

        // Notify Buyer
        await tx.notification.create({
          data: {
            userId: app.buyerId,
            title: 'Refund Processed',
            message: `Your dispute for ${appointment.service?.name} was accepted by the provider. Refund of ₹${app.commissionAmount + app.providerAmount} has been processed.`
          }
        });

        // Notify Provider
        await tx.notification.create({
          data: {
            userId: app.providerId,
            title: 'Complaint Accepted & Refunded',
            message: `You accepted the customer's complaint. Refund processed successfully.`
          }
        });

        processRazorpayRefund(app.id, app.commissionAmount + app.providerAmount, 'Provider Accepted Dispute Refund').catch(err => {
          console.error('[Dispute Refund Error]:', err);
        });

        return app;
      } else {
        // Provider rejects complaint -> send to Admin Dashboard for manual review
        if (!providerResponse) {
          throw new AppError('Explanation is required when rejecting a complaint', 400);
        }

        const app = await tx.appointment.update({
          where: { id },
          data: {
            status: 'ADMIN_REVIEW',
            bookingStatus: 'ADMIN_REVIEW',
            providerResponse
          }
        });

        // Create admin notification
        // Find admin users
        const admins = await tx.user.findMany({ where: { role: 'ADMIN' } });
        for (const admin of admins) {
          await tx.notification.create({
            data: {
              userId: admin.id,
              title: 'Escrow Dispute Escalated',
              message: `Manual review needed: Provider rejected dispute for ${appointment.service?.name}.`
            }
          });
        }

        // Notify Buyer
        await tx.notification.create({
          data: {
            userId: app.buyerId,
            title: 'Dispute Escalated to Admin',
            message: `The provider rejected your dispute. Booking has been sent to Admin manual review.`
          }
        });

        // Notify Provider
        await tx.notification.create({
          data: {
            userId: app.providerId,
            title: 'Dispute Sent for Admin Review',
            message: `You rejected the complaint. The dispute is escalated to Admin manual arbitration.`
          }
        });

        return app;
      }
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
}
