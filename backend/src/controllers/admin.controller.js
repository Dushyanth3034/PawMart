import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { getOrCreateWallet } from './wallet.controller.js';
import { getPlatformSettings, updatePlatformSettings } from '../config/platformSettings.js';

// Category CRUD
export async function createCategory(req, res, next) {
  try {
    const { name, slug, description } = req.body;
    if (!name || !slug) {
      return next(new AppError('Name and slug are required', 400));
    }

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] }
    });
    if (existing) {
      return next(new AppError('Category name or slug already exists', 400));
    }

    const category = await prisma.category.create({
      data: { name, slug, description, isActive: true }
    });

    res.status(201).json({ status: 'success', data: category });
  } catch (error) { next(error); }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, slug, description, isActive } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError('Category not found', 404));
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        slug: slug !== undefined ? slug : existing.slug,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? !!isActive : existing.isActive
      }
    });

    res.status(200).json({ status: 'success', data: category });
  } catch (error) { next(error); }
}

export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Category deleted' });
  } catch (error) { next(error); }
}

// Subcategory CRUD
export async function createSubcategory(req, res, next) {
  try {
    const { categoryId, name, slug } = req.body;
    if (!categoryId || !name || !slug) {
      return next(new AppError('Category ID, name, and slug are required', 400));
    }

    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      return next(new AppError('Parent category not found', 404));
    }

    const existing = await prisma.subcategory.findFirst({
      where: { OR: [{ name, categoryId }, { slug }] }
    });
    if (existing) {
      return next(new AppError('Subcategory name or slug already exists', 400));
    }

    const subcategory = await prisma.subcategory.create({
      data: { categoryId, name, slug, isActive: true }
    });

    res.status(201).json({ status: 'success', data: subcategory });
  } catch (error) { next(error); }
}

export async function updateSubcategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, slug, isActive } = req.body;

    const existing = await prisma.subcategory.findUnique({ where: { id } });
    if (!existing) {
      return next(new AppError('Subcategory not found', 404));
    }

    const subcategory = await prisma.subcategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        slug: slug !== undefined ? slug : existing.slug,
        isActive: isActive !== undefined ? !!isActive : existing.isActive
      }
    });

    res.status(200).json({ status: 'success', data: subcategory });
  } catch (error) { next(error); }
}

export async function deleteSubcategory(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.subcategory.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Subcategory deleted' });
  } catch (error) { next(error); }
}

// DogBreed CRUD
export async function createBreed(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return next(new AppError('Name is required', 400));

    const existing = await prisma.dogBreed.findUnique({ where: { name } });
    if (existing) return next(new AppError('Breed name already exists', 400));

    const breed = await prisma.dogBreed.create({
      data: { name, isActive: true }
    });

    res.status(201).json({ status: 'success', data: breed });
  } catch (error) { next(error); }
}

export async function updateBreed(req, res, next) {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const existing = await prisma.dogBreed.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Breed not found', 404));

    const breed = await prisma.dogBreed.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        isActive: isActive !== undefined ? !!isActive : existing.isActive
      }
    });

    res.status(200).json({ status: 'success', data: breed });
  } catch (error) { next(error); }
}

export async function deleteBreed(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.dogBreed.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Breed deleted' });
  } catch (error) { next(error); }
}

// DogAgeGroup CRUD
export async function createAgeGroup(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return next(new AppError('Name is required', 400));

    const existing = await prisma.dogAgeGroup.findUnique({ where: { name } });
    if (existing) return next(new AppError('Age group name already exists', 400));

    const ageGroup = await prisma.dogAgeGroup.create({
      data: { name, isActive: true }
    });

    res.status(201).json({ status: 'success', data: ageGroup });
  } catch (error) { next(error); }
}

export async function updateAgeGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const existing = await prisma.dogAgeGroup.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Age group not found', 404));

    const ageGroup = await prisma.dogAgeGroup.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        isActive: isActive !== undefined ? !!isActive : existing.isActive
      }
    });

    res.status(200).json({ status: 'success', data: ageGroup });
  } catch (error) { next(error); }
}

export async function deleteAgeGroup(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.dogAgeGroup.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Age group deleted' });
  } catch (error) { next(error); }
}

export async function getDisputedBookings(req, res, next) {
  try {
    const disputes = await prisma.appointment.findMany({
      where: {
        bookingStatus: 'ADMIN_REVIEW'
      },
      include: {
        service: true,
        buyer: true,
        pet: true,
        provider: {
          include: { providerProfile: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      data: disputes
    });
  } catch (error) {
    next(error);
  }
}

export async function resolveServiceDispute(req, res, next) {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'RELEASE' or 'REFUND'

    if (!['RELEASE', 'REFUND'].includes(decision)) {
      return next(new AppError('Invalid decision value', 400));
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true }
    });

    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    if (appointment.bookingStatus !== 'ADMIN_REVIEW') {
      return next(new AppError('Appointment is not under admin review', 400));
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (decision === 'REFUND') {
        const app = await tx.appointment.update({
          where: { id },
          data: {
            status: 'REFUNDED',
            bookingStatus: 'REFUNDED',
            paymentStatus: 'REFUNDED',
            refundAt: new Date(),
            adminDecision: 'REFUND'
          },
          include: { service: true }
        });

        // Transaction history log
        await tx.paymentTransaction.create({
          data: {
            appointmentId: app.id,
            providerId: app.providerId,
            buyerId: app.buyerId,
            grossAmount: app.commissionAmount + app.providerAmount,
            commissionAmount: app.commissionAmount,
            providerAmount: app.providerAmount,
            paymentStatus: 'REFUNDED',
            paymentMethod: 'ADMIN_REFUND',
            transactionType: 'REFUND',
            refundedAt: new Date()
          }
        });

        // Update Wallet (Deduct from Pending balance)
        const providerWallet = await getOrCreateWallet(app.providerId, tx);
        await tx.wallet.update({
          where: { id: providerWallet.id },
          data: {
            pendingBalance: Math.max(0, providerWallet.pendingBalance - app.providerAmount)
          }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: providerWallet.id,
            userId: app.providerId,
            type: 'REFUND',
            sourceType: 'SERVICE_APPOINTMENT',
            sourceId: app.id,
            grossAmount: app.service?.price || 0,
            netAmount: -app.providerAmount,
            status: 'COMPLETED',
            description: `Escrow refund approved by admin for service: ${app.service?.name || 'Clinic Service'}`
          }
        });

        // Notify Buyer
        await tx.notification.create({
          data: {
            userId: app.buyerId,
            title: 'Dispute Resolved: Refunded',
            message: `Admin resolved dispute for ${app.service?.name || 'Clinic Service'}. Full refund of ₹${app.commissionAmount + app.providerAmount} processed.`
          }
        });

        // Notify Provider
        await tx.notification.create({
          data: {
            userId: app.providerId,
            title: 'Dispute Resolved: Refunded',
            message: `Admin approved refund for dispute: ${app.service?.name || 'Clinic Service'}.`
          }
        });

        return app;
      } else {
        // RELEASE
        const app = await tx.appointment.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            bookingStatus: 'COMPLETED',
            paymentStatus: 'RELEASED',
            releasedAt: new Date(),
            adminDecision: 'RELEASE'
          },
          include: { service: true }
        });

        // Create provider payout record
        await tx.payoutHistory.create({
          data: {
            sellerId: app.providerId,
            amount: app.providerAmount,
            status: 'PENDING_PAYMENT',
            transactionId: `PAYOUT_ADMIN_${app.id.slice(0, 8).toUpperCase()}`
          }
        });

        // Transaction history log
        await tx.paymentTransaction.create({
          data: {
            appointmentId: app.id,
            providerId: app.providerId,
            buyerId: app.buyerId,
            grossAmount: app.commissionAmount + app.providerAmount,
            commissionAmount: app.commissionAmount,
            providerAmount: app.providerAmount,
            paymentStatus: 'RELEASED',
            paymentMethod: 'ADMIN_RELEASE',
            transactionType: 'PAYOUT',
            releasedAt: new Date()
          }
        });

        // Update Wallet (Pending -> Available)
        const providerWallet = await getOrCreateWallet(app.providerId, tx);
        const baseServiceAmount = app.service?.price || 0;
        // Use stored snapshot values — do NOT recalculate using current settings
        const commissionAmount = app.commissionAmount || 0;
        const providerNetServiceAmount = baseServiceAmount - commissionAmount;
        const gstAmount = app.providerAmount - providerNetServiceAmount;

        await tx.wallet.update({
          where: { id: providerWallet.id },
          data: {
            pendingBalance: Math.max(0, providerWallet.pendingBalance - app.providerAmount),
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
            description: `Earning released by admin resolution for: ${app.service?.name || 'Clinic Service'}`
          }
        });

        // Notify Provider
        await tx.notification.create({
          data: {
            userId: app.providerId,
            title: 'Dispute Resolved: Payout Released',
            message: `Admin resolved dispute in your favor. Payout of ₹${app.providerAmount} has been released to your available balance.`
          }
        });

        // Notify Buyer
        await tx.notification.create({
          data: {
            userId: app.buyerId,
            title: 'Dispute Resolved: Completed',
            message: `Admin resolved dispute for ${app.service?.name || 'Clinic Service'}. Payout released to provider.`
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

export async function getAdminPayouts(req, res, next) {
  try {
    const payouts = await prisma.payoutRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      include: {
        wallet: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                storeProfile: {
                  select: { storeName: true }
                },
                providerProfile: {
                  select: { businessName: true }
                }
              }
            }
          }
        }
      }
    });

    res.status(200).json({ status: 'success', data: payouts });
  } catch (error) { next(error); }
}

export async function approveAdminPayout(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const payout = await prisma.payoutRequest.findUnique({
      where: { id },
      include: { wallet: true }
    });

    if (!payout) {
      return next(new AppError('Payout request not found.', 404));
    }

    if (!['PENDING', 'ON_HOLD'].includes(payout.status)) {
      return next(new AppError('Payout request is already processed or finalized.', 400));
    }

    const refNum = `PAYOUT_REF_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const updatedPayout = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: 'PAID',
          processedAt: new Date(),
          adminId,
          referenceNumber: refNum
        }
      });

      // 2. Decrease Reserved Balance and increase Total Withdrawn
      const wallet = payout.wallet;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          reservedBalance: Math.max(0, wallet.reservedBalance - payout.amount),
          totalWithdrawn: wallet.totalWithdrawn + payout.amount
        }
      });

      // 3. Create wallet transaction WITHDRAWAL_COMPLETED
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
          description: `Withdrawal of ₹${payout.amount} approved and processed. Ref: ${refNum}`
        }
      });

      // 4. Send notification
      await tx.notification.create({
        data: {
          userId: payout.userId,
          title: 'Withdrawal Approved & Completed',
          message: `Your withdrawal request of ₹${payout.amount} has been approved. Reference Number: ${refNum}.`
        }
      });

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'PAYOUT_RELEASED',
          targetType: 'PayoutRequest',
          targetId: id,
          description: `Admin released payout of ₹${payout.amount} for user ${payout.userId}`,
          metadata: { amount: payout.amount, refNum }
        }
      });

      return updatedPayout;
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) { next(error); }
}

export async function rejectAdminPayout(req, res, next) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;

    if (!rejectionReason) {
      return next(new AppError('Rejection reason is required.', 400));
    }

    const payout = await prisma.payoutRequest.findUnique({
      where: { id },
      include: { wallet: true }
    });

    if (!payout) {
      return next(new AppError('Payout request not found.', 404));
    }

    if (!['PENDING', 'ON_HOLD'].includes(payout.status)) {
      return next(new AppError('Payout request is already processed or finalized.', 400));
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const updatedPayout = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          adminId,
          rejectionReason
        }
      });

      // 2. Move Reserved Balance back to Available Balance
      const wallet = payout.wallet;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          reservedBalance: Math.max(0, wallet.reservedBalance - payout.amount),
          availableBalance: wallet.availableBalance + payout.amount
        }
      });

      // 3. Create wallet transaction WITHDRAWAL_REJECTED
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: payout.userId,
          type: 'WITHDRAWAL_REJECTED',
          sourceType: 'WITHDRAWAL',
          sourceId: `${payout.id}_REJECTED`,
          grossAmount: payout.amount,
          netAmount: payout.amount,
          status: 'REJECTED',
          description: `Withdrawal request of ₹${payout.amount} rejected. Reason: ${rejectionReason}`
        }
      });

      // 4. Send notification
      await tx.notification.create({
        data: {
          userId: payout.userId,
          title: 'Withdrawal Request Rejected',
          message: `Your withdrawal request of ₹${payout.amount} was rejected. Reason: ${rejectionReason}. Funds returned to Available balance.`
        }
      });

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'PAYOUT_REJECTED',
          targetType: 'PayoutRequest',
          targetId: id,
          description: `Admin rejected payout of ₹${payout.amount} for user ${payout.userId}. Reason: ${rejectionReason}`,
          metadata: { amount: payout.amount, rejectionReason }
        }
      });

      return updatedPayout;
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) { next(error); }
}

export const resolveAdminDispute = resolveServiceDispute;

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminDashboard(req, res, next) {
  try {
    const [totalUsers, totalSellers, totalProviders, totalProducts, totalAppointments,
           totalOrders, totalAdoptions, pendingPayouts, activeDisputes, recentAuditLogs] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.user.count({ where: { role: 'SERVICE_PROVIDER' } }),
      prisma.product.count(),
      prisma.appointment.count(),
      prisma.order.count(),
      prisma.adoptionRequest.count({ where: { status: 'APPROVED' } }),
      prisma.payoutRequest.count({ where: { status: 'PENDING' } }),
      prisma.appointment.count({ where: { bookingStatus: 'ADMIN_REVIEW' } }),
      prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 10,
        include: { user: { select: { firstName: true, lastName: true, email: true } } } })
    ]);

    // Revenue stats
    const completedOrders = await prisma.order.findMany({
      where: { status: 'DELIVERED' },
      include: { orderItems: true }
    });
    const totalOrderRevenue = completedOrders.reduce((sum, o) => sum + (o.orderItems || []).reduce((s, i) => s + i.price * i.quantity, 0), 0);

    const completedAppointments = await prisma.appointment.findMany({
      where: { paymentStatus: 'RELEASED' }
    });
    const totalServiceRevenue = completedAppointments.reduce((sum, a) => sum + (a.commissionAmount || 0), 0);

    const platformSettings = await getPlatformSettings();

    res.status(200).json({
      status: 'success',
      data: {
        users: { total: totalUsers, sellers: totalSellers, providers: totalProviders, buyers: totalUsers - totalSellers - totalProviders - 1 },
        marketplace: { totalProducts, totalOrders, totalOrderRevenue: parseFloat(totalOrderRevenue.toFixed(2)) },
        services: { totalAppointments, totalAdoptions, totalServiceRevenue: parseFloat(totalServiceRevenue.toFixed(2)) },
        platform: { totalRevenue: parseFloat((totalOrderRevenue * (platformSettings.platformCommissionRate/100) + totalServiceRevenue).toFixed(2)) },
        operations: { pendingPayouts, activeDisputes },
        recentAuditLogs,
        platformSettings
      }
    });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminUsers(req, res, next) {
  try {
    const { role, suspended, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) {
      where.role = role === 'PROVIDER' ? 'SERVICE_PROVIDER' : role;
    }
    if (suspended === 'true') where.isSuspended = true;
    if (suspended === 'false') where.isSuspended = false;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          role: true, isVerified: true, isSuspended: true, createdAt: true,
          storeProfile: { select: { storeName: true } },
          providerProfile: { select: { businessName: true } }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({ status: 'success', data: users, total, page: pageNum, limit: limitNum });
  } catch (error) { next(error); }
}

export async function suspendUser(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (id === adminId) {
      return next(new AppError('You cannot suspend your own account.', 400));
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return next(new AppError('User not found.', 404));
    if (user.isSuspended) return next(new AppError('User is already suspended.', 400));

    await prisma.user.update({ where: { id }, data: { isSuspended: true } });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_SUSPENDED',
        targetType: 'User',
        targetId: id,
        description: `Admin suspended user ${user.email}`,
        metadata: { email: user.email, role: user.role }
      }
    });

    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Account Suspended',
        message: 'Your account has been suspended by the platform administrator. Please contact support.'
      }
    });

    res.status(200).json({ status: 'success', message: 'User suspended successfully.' });
  } catch (error) { next(error); }
}

export async function reactivateUser(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return next(new AppError('User not found.', 404));
    if (!user.isSuspended) return next(new AppError('User is not currently suspended.', 400));

    await prisma.user.update({ where: { id }, data: { isSuspended: false } });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'USER_REACTIVATED',
        targetType: 'User',
        targetId: id,
        description: `Admin reactivated user ${user.email}`,
        metadata: { email: user.email, role: user.role }
      }
    });

    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Account Reactivated',
        message: 'Your account has been reactivated. You can now log in to PawMart.'
      }
    });

    res.status(200).json({ status: 'success', message: 'User reactivated successfully.' });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLER VERIFICATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminSellers(req, res, next) {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = { role: 'SELLER' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [sellers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          isSuspended: true,
          createdAt: true,
          storeProfile: {
            select: { id: true, storeName: true, contactNumber: true, businessAddress: true }
          },
          sellerVerification: {
            select: { id: true, status: true, businessName: true, businessRegNum: true }
          },
          _count: {
            select: { products: true, orders: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({ status: 'success', data: sellers, total });
  } catch (error) { next(error); }
}

export async function verifySellerAction(req, res, next) {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;
    const adminId = req.user.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return next(new AppError('Invalid action. Must be APPROVE or REJECT.', 400));
    }

    const verification = await prisma.sellerVerification.findUnique({
      where: { id }, include: { user: true }
    });
    if (!verification) return next(new AppError('Seller verification record not found.', 404));

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await prisma.$transaction(async (tx) => {
      await tx.sellerVerification.update({
        where: { id },
        data: { status: newStatus }
      });

      if (action === 'APPROVE') {
        await tx.storeProfile.updateMany({
          where: { sellerId: verification.userId },
          data: { isVerified: true }
        });
      }

      await tx.notification.create({
        data: {
          userId: verification.userId,
          title: action === 'APPROVE' ? 'Store Verified!' : 'Verification Rejected',
          message: action === 'APPROVE'
            ? 'Your store has been verified by PawMart. You can now list products.'
            : `Your verification was rejected. Reason: ${rejectionReason || 'See admin notes.'}`
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: `SELLER_${action}D`,
          targetType: 'SellerVerification',
          targetId: id,
          description: `Admin ${action.toLowerCase()}d seller ${verification.user?.email}`,
          metadata: { sellerId: verification.userId, status: newStatus }
        }
      });
    });

    res.status(200).json({ status: 'success', message: `Seller ${action.toLowerCase()}d successfully.` });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER VERIFICATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminProviders(req, res, next) {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = { role: 'SERVICE_PROVIDER' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [providers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          isSuspended: true,
          createdAt: true,
          providerProfile: {
            select: { id: true, businessName: true, contactNumber: true, businessAddress: true, isPremiumProvider: true }
          },
          providerVerification: {
            select: { id: true, status: true, specialization: true, licenseNumber: true }
          },
          _count: {
            select: { services: true, appointmentsAsProv: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({ status: 'success', data: providers, total });
  } catch (error) { next(error); }
}

export async function verifyProviderAction(req, res, next) {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;
    const adminId = req.user.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return next(new AppError('Invalid action. Must be APPROVE or REJECT.', 400));
    }

    const verification = await prisma.providerVerification.findUnique({
      where: { id }, include: { user: true }
    });
    if (!verification) return next(new AppError('Provider verification record not found.', 404));

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await prisma.$transaction(async (tx) => {
      await tx.providerVerification.update({
        where: { id },
        data: { status: newStatus }
      });

      if (action === 'APPROVE') {
        await tx.providerProfile.updateMany({
          where: { providerId: verification.userId },
          data: { isVerified: true }
        });
      }

      await tx.notification.create({
        data: {
          userId: verification.userId,
          title: action === 'APPROVE' ? 'Provider Account Verified!' : 'Verification Rejected',
          message: action === 'APPROVE'
            ? 'Your provider account has been verified by PawMart. You can now list services.'
            : `Your verification was rejected. Reason: ${rejectionReason || 'See admin notes.'}`
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: `PROVIDER_${action}D`,
          targetType: 'ProviderVerification',
          targetId: id,
          description: `Admin ${action.toLowerCase()}d provider ${verification.user?.email}`,
          metadata: { providerId: verification.userId, status: newStatus }
        }
      });
    });

    res.status(200).json({ status: 'success', message: `Provider ${action.toLowerCase()}d successfully.` });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS / LISTINGS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminProducts(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, firstName: true, lastName: true, email: true } },
          category: { select: { name: true } }
        }
      }),
      prisma.product.count({ where })
    ]);

    res.status(200).json({ status: 'success', data: products, total });
  } catch (error) { next(error); }
}

export async function toggleProductStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;  // 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
    const adminId = req.user.id;

    if (!['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(status)) {
      return next(new AppError('Invalid status value.', 400));
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return next(new AppError('Product not found.', 404));

    await prisma.product.update({ where: { id }, data: { status } });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PRODUCT_STATUS_CHANGED',
        targetType: 'Product',
        targetId: id,
        description: `Admin set product "${product.name}" status to ${status}`,
        metadata: { previousStatus: product.status, newStatus: status }
      }
    });

    res.status(200).json({ status: 'success', message: `Product status updated to ${status}.` });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES / APPOINTMENTS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminAppointments(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.bookingStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          service: true,
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          provider: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }),
      prisma.appointment.count({ where })
    ]);

    res.status(200).json({ status: 'success', data: appointments, total });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminOrders(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          orderItems: { include: { product: { select: { name: true, seller: { select: { firstName: true, lastName: true } } } } } }
        }
      }),
      prisma.order.count({ where })
    ]);

    res.status(200).json({ status: 'success', data: orders, total });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADOPTIONS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminAdoptions(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [adoptions, total] = await Promise.all([
      prisma.adoptionRequest.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
          pet: { select: { name: true, category: { select: { name: true } } } }
        }
      }),
      prisma.adoptionRequest.count({ where })
    ]);

    res.status(200).json({ status: 'success', data: adoptions, total });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminPlatformSettings(req, res, next) {
  try {
    const settings = await getPlatformSettings();
    res.status(200).json({ status: 'success', data: settings });
  } catch (error) { next(error); }
}

export async function updateAdminPlatformSettings(req, res, next) {
  try {
    const adminId = req.user.id;
    const { platformCommissionRate, premiumListingFee, escrowConfirmationPeriod, minWithdrawalAmount } = req.body;

    const updates = {};
    if (platformCommissionRate !== undefined) {
      const rate = parseFloat(platformCommissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) return next(new AppError('Commission rate must be between 0 and 100.', 400));
      updates.platformCommissionRate = rate;
    }
    if (premiumListingFee !== undefined) {
      const fee = parseFloat(premiumListingFee);
      if (isNaN(fee) || fee < 0) return next(new AppError('Premium listing fee must be a positive number.', 400));
      updates.premiumListingFee = fee;
    }
    if (escrowConfirmationPeriod !== undefined) {
      const hours = parseInt(escrowConfirmationPeriod);
      if (isNaN(hours) || hours < 1) return next(new AppError('Escrow confirmation period must be at least 1 hour.', 400));
      updates.escrowConfirmationPeriod = hours;
    }
    if (minWithdrawalAmount !== undefined) {
      const min = parseFloat(minWithdrawalAmount);
      if (isNaN(min) || min < 0) return next(new AppError('Minimum withdrawal amount must be a positive number.', 400));
      updates.minWithdrawalAmount = min;
    }

    const updated = await updatePlatformSettings(updates);

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PLATFORM_SETTINGS_UPDATED',
        targetType: 'PlatformSettings',
        targetId: updated.id,
        description: 'Admin updated platform settings',
        metadata: updates
      }
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM FINANCE
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminFinance(req, res, next) {
  try {
    const [releasedAppointments, completedOrders, walletStats, payoutStats] = await Promise.all([
      prisma.appointment.findMany({ where: { paymentStatus: 'RELEASED' } }),
      prisma.order.findMany({ where: { status: 'DELIVERED' }, include: { orderItems: true } }),
      prisma.wallet.aggregate({
        _sum: { totalEarnings: true, totalWithdrawn: true, availableBalance: true, pendingBalance: true, reservedBalance: true }
      }),
      prisma.payoutRequest.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: { _all: true }
      })
    ]);

    const serviceCommissionEarned = releasedAppointments.reduce((sum, a) => sum + (a.commissionAmount || 0), 0);
    const orderGrossRevenue = completedOrders.reduce((sum, o) => sum + (o.orderItems || []).reduce((s, i) => s + i.price * i.quantity, 0), 0);
    const settings = await getPlatformSettings();
    const orderCommissionEarned = orderGrossRevenue * (settings.platformCommissionRate / 100);

    res.status(200).json({
      status: 'success',
      data: {
        serviceCommissionEarned: parseFloat(serviceCommissionEarned.toFixed(2)),
        orderCommissionEarned: parseFloat(orderCommissionEarned.toFixed(2)),
        totalPlatformRevenue: parseFloat((serviceCommissionEarned + orderCommissionEarned).toFixed(2)),
        walletSummary: walletStats._sum,
        payoutsByStatus: payoutStats
      }
    });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminAuditLogs(req, res, next) {
  try {
    const { action, targetType, page = 1, limit = 50 } = req.query;
    const where = {};
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (targetType) where.targetType = targetType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.status(200).json({ status: 'success', data: logs, total });
  } catch (error) { next(error); }
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS & REPORTS
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminReviews(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          product: { select: { id: true, name: true } }
        }
      }),
      prisma.review.count()
    ]);

    res.status(200).json({ status: 'success', data: reviews, total });
  } catch (error) { next(error); }
}

export async function deleteAdminReview(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return next(new AppError('Review not found.', 404));

    await prisma.review.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'REVIEW_DELETED',
        targetType: 'Review',
        targetId: id,
        description: 'Admin deleted a review',
        metadata: { rating: review.rating, productId: review.productId }
      }
    });

    res.status(200).json({ status: 'success', message: 'Review deleted.' });
  } catch (error) { next(error); }
}
