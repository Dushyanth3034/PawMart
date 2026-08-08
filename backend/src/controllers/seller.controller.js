import { prisma } from '../services/prisma.service.js';
import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../middleware/error.middleware.js';

export async function getDashboardStats(req, res, next) {
  try {
    const sellerId = req.user.id;
    
    const totalProducts = await prisma.product.count({ where: { sellerId } });
    const activeProducts = await prisma.product.count({
      where: { sellerId, status: 'ACTIVE' }
    });
    const outOfStockProducts = await prisma.product.count({
      where: { sellerId, inventory: { quantity: 0 } }
    });
    const draftProducts = await prisma.product.count({
      where: { sellerId, status: 'DRAFT' }
    });

    const orderItemStats = await prisma.orderItem.groupBy({
      by: ['status'],
      where: { product: { sellerId } },
      _count: true
    });

    let pendingOrders = 0;
    let acceptedOrders = 0;
    let packedOrders = 0;
    let shippedOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;

    orderItemStats.forEach(stat => {
      if (stat.status === 'PENDING') pendingOrders = stat._count;
      else if (stat.status === 'PROCESSING') acceptedOrders = stat._count;
      else if (stat.status === 'PACKED') packedOrders = stat._count;
      else if (stat.status === 'SHIPPED') shippedOrders = stat._count;
      else if (stat.status === 'DELIVERED') deliveredOrders = stat._count;
      else if (stat.status === 'CANCELLED') cancelledOrders = stat._count;
    });

    const uniqueCustomers = await prisma.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
        orderItems: { some: { product: { sellerId } } }
      },
      select: { buyerId: true },
      distinct: ['buyerId']
    });
    const totalCustomers = uniqueCustomers.length;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Today's Orders
    const todayOrdersCount = await prisma.order.count({
      where: {
        createdAt: { gte: startOfDay },
        orderItems: { some: { product: { sellerId } } }
      }
    });

    // Today's Customers
    const todayCustomersGroup = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay },
        orderItems: { some: { product: { sellerId } } }
      },
      select: { buyerId: true },
      distinct: ['buyerId']
    });
    const todayCustomersCount = todayCustomersGroup.length;

    // Today's Reviews
    const todayReviewsCount = await prisma.review.count({
      where: {
        createdAt: { gte: startOfDay },
        product: { sellerId }
      }
    });

    const revenueItems = await prisma.orderItem.findMany({
      where: {
        product: { sellerId },
        status: { not: 'CANCELLED' },
        order: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } }
      },
      include: { order: { select: { createdAt: true } } }
    });

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let weeklyRevenue = 0;
    let todayRevenue = 0;

    revenueItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      totalRevenue += itemTotal;
      if (item.order && item.order.createdAt) {
        const orderDate = new Date(item.order.createdAt);
        if (orderDate >= startOfMonth) monthlyRevenue += itemTotal;
        if (orderDate >= startOfWeek) weeklyRevenue += itemTotal;
        if (orderDate >= startOfDay) todayRevenue += itemTotal;
      }
    });

    // 1. Week maps (7 days)
    const weekMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      weekMap[key] = { date: key, label: d.toLocaleDateString(undefined, { weekday: 'short' }), revenue: 0, orders: new Set() };
    }

    // 2. Month maps (30 days)
    const monthMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      monthMap[key] = { date: key, label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), revenue: 0, orders: new Set() };
    }

    // 3. Year maps (12 months)
    const yearMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      yearMap[key] = { date: key, label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), revenue: 0, orders: new Set() };
    }

    revenueItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      if (item.order && item.order.createdAt) {
        const orderDate = new Date(item.order.createdAt);
        const dayKey = orderDate.toISOString().split('T')[0];
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        const orderId = item.orderId;

        // Week map fill
        if (weekMap[dayKey]) {
          weekMap[dayKey].revenue += itemTotal;
          weekMap[dayKey].orders.add(orderId);
        }

        // Month map fill
        if (monthMap[dayKey]) {
          monthMap[dayKey].revenue += itemTotal;
          monthMap[dayKey].orders.add(orderId);
        }

        // Year map fill
        if (yearMap[monthKey]) {
          yearMap[monthKey].revenue += itemTotal;
          yearMap[monthKey].orders.add(orderId);
        }
      }
    });

    const weekTrend = Object.keys(weekMap).sort().map(k => ({
      date: weekMap[k].date,
      label: weekMap[k].label,
      revenue: weekMap[k].revenue,
      orders: weekMap[k].orders.size
    }));

    const monthTrend = Object.keys(monthMap).sort().map(k => ({
      date: monthMap[k].date,
      label: monthMap[k].label,
      revenue: monthMap[k].revenue,
      orders: monthMap[k].orders.size
    }));

    const yearTrend = Object.keys(yearMap).sort().map(k => ({
      date: yearMap[k].date,
      label: yearMap[k].label,
      revenue: yearMap[k].revenue,
      orders: yearMap[k].orders.size
    }));

    const salesTrend = {
      week: weekTrend,
      month: monthTrend,
      year: yearTrend
    };

    const reviewAgg = await prisma.review.aggregate({
      where: { product: { sellerId } },
      _avg: { rating: true },
      _count: { _all: true }
    });

    const recentOrders = await prisma.orderItem.findMany({
      where: { product: { sellerId } },
      include: {
        order: { select: { id: true, createdAt: true, status: true, total: true } },
        product: { select: { id: true, name: true, images: { take: 1 } } }
      },
      orderBy: {
        order: {
          createdAt: 'desc'
        }
      },
      take: 5
    });

    const lowStockProducts = await prisma.product.findMany({
      where: { sellerId, inventory: { quantity: { lt: 10 } } },
      select: { id: true, name: true, price: true, inventory: true, images: { take: 1 } },
      take: 5
    });

    const recentReviews = await prisma.review.findMany({
      where: { product: { sellerId } },
      include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const notifications = await prisma.notification.findMany({
      where: { userId: sellerId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    res.json({
      status: 'success',
      data: {
        totalProducts,
        activeProducts,
        draftProducts,
        outOfStockProducts,
        pendingOrders,
        acceptedOrders,
        packedOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalCustomers,
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        todayRevenue,
        todayOrders: todayOrdersCount,
        todayCustomers: todayCustomersCount,
        todayReviews: todayReviewsCount,
        averageRating: reviewAgg._avg.rating || 0,
        totalReviews: reviewAgg._count._all || 0,
        salesTrend,
        recentOrders,
        lowStockProducts,
        recentReviews,
        notifications
      }
    });
  } catch (error) { next(error); }
}

export async function getSellerProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: req.user.id },
      include: { category: true, inventory: true, images: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: products });
  } catch (error) { next(error); }
}

export async function getSellerInventory(req, res, next) {
  try {
    const inventory = await prisma.inventory.findMany({
      where: { product: { sellerId: req.user.id } },
      include: { product: { select: { name: true, price: true, slug: true } } }
    });
    res.json({ status: 'success', data: inventory });
  } catch (error) { next(error); }
}

export async function getSellerOrders(req, res, next) {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: { product: { sellerId: req.user.id } },
      include: {
        order: {
          include: {
            buyer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true
              }
            },
            address: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            images: {
              select: {
                url: true,
                isPrimary: true
              }
            }
          }
        }
      },
      orderBy: { order: { createdAt: 'desc' } }
    });
    res.json({ status: 'success', data: orderItems });
  } catch (error) { next(error); }
}

export async function getSellerRevenue(req, res, next) {
  try {
    const sellerId = req.user.id;
    
    const orderItems = await prisma.orderItem.findMany({
      where: {
        product: { sellerId },
        status: { in: ['DELIVERED', 'SHIPPED', 'PACKED', 'PROCESSING'] }
      },
      include: { order: { select: { createdAt: true } } }
    });

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyData = {};

    orderItems.forEach(item => {
      const itemRev = item.price * item.quantity;
      totalRevenue += itemRev;
      
      if (item.order && item.order.createdAt) {
        const orderDate = new Date(item.order.createdAt);
        if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
          monthlyRevenue += itemRev;
        }
        
        const monthYear = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + itemRev;
      }
    });

    const salesTrends = Object.keys(monthlyData).sort().map(month => ({
      month,
      revenue: monthlyData[month]
    }));

    res.json({
      status: 'success',
      data: { totalRevenue, monthlyRevenue, salesTrends }
    });
  } catch (error) { next(error); }
}

export async function getSellerReviews(req, res, next) {
  try {
    const reviews = await prisma.review.findMany({
      where: { product: { sellerId: req.user.id } },
      include: { user: { select: { firstName: true, lastName: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: reviews });
  } catch (error) { next(error); }
}

export async function getSellerProfile(req, res, next) {
  try {
    let profile = await prisma.sellerStoreProfile.findUnique({
      where: { sellerId: req.user.id }
    });
    if (!profile) {
      profile = await prisma.sellerStoreProfile.create({
        data: { sellerId: req.user.id, storeName: `${req.user.firstName}'s Store` }
      });
    }
    res.json({ status: 'success', data: profile });
  } catch (error) { next(error); }
}

export async function updateSellerProfile(req, res, next) {
  try {
    const { firstName, lastName, phone, storeName, storeDescription, storeCategory, businessAddress, gstNumber, storePolicies, website, facebook, instagram, linkedin, contactNumber } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update User
      const updatedUser = await tx.user.update({
        where: { id: req.user.id },
        data: {
          firstName: firstName !== undefined ? firstName : undefined,
          lastName: lastName !== undefined ? lastName : undefined,
          phone: phone !== undefined ? phone : undefined,
        }
      });

      // 2. Update SellerStoreProfile
      const updatedProfile = await tx.sellerStoreProfile.upsert({
        where: { sellerId: req.user.id },
        update: {
          storeName: storeName !== undefined ? storeName : undefined,
          storeDescription: storeDescription !== undefined ? storeDescription : undefined,
          businessAddress: businessAddress !== undefined ? businessAddress : undefined,
          gstNumber: gstNumber !== undefined ? gstNumber : undefined,
          storePolicies: storePolicies !== undefined ? storePolicies : undefined,
          website: website !== undefined ? website : undefined,
          facebook: facebook !== undefined ? facebook : undefined,
          instagram: instagram !== undefined ? instagram : undefined,
          linkedin: linkedin !== undefined ? linkedin : undefined,
          contactNumber: contactNumber !== undefined ? contactNumber : undefined,
        },
        create: {
          sellerId: req.user.id,
          storeName: storeName || 'My Store',
          storeDescription,
          businessAddress,
          gstNumber,
          storePolicies,
          website,
          facebook,
          instagram,
          linkedin,
          contactNumber
        }
      });

      return { user: updatedUser, profile: updatedProfile };
    });

    res.json({ status: 'success', data: result.profile });
  } catch (error) { next(error); }
}

export async function uploadStoreImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'fail', message: 'No image uploaded' });
    }

    const { type } = req.body; // 'logo' or 'banner'
    if (!['logo', 'banner'].includes(type)) {
      // Delete the just-uploaded file because type is invalid
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ status: 'fail', message: 'Invalid image type. Must be logo or banner' });
    }

    const imagePath = `/uploads/profiles/${req.file.filename}`;

    // Get current profile to find old image
    const currentProfile = await prisma.sellerStoreProfile.findUnique({
      where: { sellerId: req.user.id }
    });

    if (!currentProfile) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ status: 'fail', message: 'Store profile not found' });
    }

    // Determine old image path
    const oldImagePath = type === 'logo' ? currentProfile.storeLogo : currentProfile.storeBanner;

    // Delete old image if it's a local file
    if (oldImagePath && oldImagePath.startsWith('/uploads/profiles/')) {
      const oldFile = path.join(process.cwd(), 'public', oldImagePath);
      await fs.unlink(oldFile).catch((e) => console.log('Old image not found or could not be deleted', e.message));
    }

    // Update database
    const updateData = type === 'logo' ? { storeLogo: imagePath } : { storeBanner: imagePath };
    
    const updatedProfile = await prisma.sellerStoreProfile.update({
      where: { sellerId: req.user.id },
      data: updateData
    });

    res.json({ status: 'success', data: { imagePath, profile: updatedProfile } });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
}

export async function getSellerNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: notifications });
  } catch (error) { next(error); }
}

export async function getSellerCoupons(req, res, next) {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { sellerId: req.user.id }
    });
    res.json({ status: 'success', data: coupons });
  } catch (error) { next(error); }
}

export async function createSellerCoupon(req, res, next) {
  try {
    const { code, discount, isPercent, expiresAt, active, usageLimit, productIds } = req.body;
    
    if (!code || !code.trim()) {
      return next(new AppError(400, 'Promo code is required.'));
    }
    const normalizedCode = code.trim().toUpperCase();

    const numericDiscount = parseFloat(discount);
    if (isNaN(numericDiscount) || numericDiscount <= 0) {
      return next(new AppError(400, 'Discount value must be greater than 0.'));
    }

    if (isPercent && numericDiscount > 100) {
      return next(new AppError(400, 'Percentage discount cannot exceed 100%.'));
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: normalizedCode }
    });
    if (existing) {
      return next(new AppError(400, `Promo code "${normalizedCode}" already exists.`));
    }

    let validProductConnect = [];
    if (Array.isArray(productIds) && productIds.length > 0) {
      const sellerProducts = await prisma.product.findMany({
        where: { id: { in: productIds }, sellerId: req.user.id },
        select: { id: true }
      });
      validProductConnect = sellerProducts.map(p => ({ id: p.id }));
    }

    const defaultExpiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const coupon = await prisma.coupon.create({
      data: {
        sellerId: req.user.id,
        code: normalizedCode,
        discount: numericDiscount,
        isPercent: isPercent !== undefined ? !!isPercent : true,
        expiresAt: defaultExpiry,
        active: active !== undefined ? !!active : true,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        products: {
          connect: validProductConnect
        }
      },
      include: {
        products: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ status: 'success', data: coupon });
  } catch (error) { next(error); }
}

export async function updateSellerCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const { code, discount, isPercent, expiresAt, active, usageLimit, productIds } = req.body;

    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
      include: { products: true }
    });

    if (!existingCoupon || existingCoupon.sellerId !== req.user.id) {
      return next(new AppError(403, 'Unauthorized access to promo code.'));
    }

    let normalizedCode = existingCoupon.code;
    if (code && code.trim().toUpperCase() !== existingCoupon.code) {
      normalizedCode = code.trim().toUpperCase();
      const codeConflict = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
      if (codeConflict) {
        return next(new AppError(400, `Promo code "${normalizedCode}" already exists.`));
      }
    }

    const numericDiscount = discount !== undefined ? parseFloat(discount) : existingCoupon.discount;
    if (isNaN(numericDiscount) || numericDiscount <= 0) {
      return next(new AppError(400, 'Discount value must be greater than 0.'));
    }

    const isPercentVal = isPercent !== undefined ? !!isPercent : existingCoupon.isPercent;
    if (isPercentVal && numericDiscount > 100) {
      return next(new AppError(400, 'Percentage discount cannot exceed 100%.'));
    }

    let productSetData = undefined;
    if (Array.isArray(productIds)) {
      const sellerProducts = await prisma.product.findMany({
        where: { id: { in: productIds }, sellerId: req.user.id },
        select: { id: true }
      });
      productSetData = {
        set: sellerProducts.map(p => ({ id: p.id }))
      };
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: normalizedCode,
        discount: numericDiscount,
        isPercent: isPercentVal,
        expiresAt: expiresAt ? new Date(expiresAt) : existingCoupon.expiresAt,
        active: active !== undefined ? !!active : existingCoupon.active,
        usageLimit: usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit) : null) : existingCoupon.usageLimit,
        products: productSetData
      },
      include: {
        products: { select: { id: true, name: true } }
      }
    });

    res.json({ status: 'success', data: updatedCoupon });
  } catch (error) { next(error); }
}

export async function deleteSellerCoupon(req, res, next) {
  try {
    const { id } = req.params;

    const existingCoupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!existingCoupon || existingCoupon.sellerId !== req.user.id) {
      return next(new AppError(403, 'Unauthorized access to promo code.'));
    }

    await prisma.coupon.delete({
      where: { id }
    });

    res.json({ status: 'success', message: 'Promo code deleted successfully.' });
  } catch (error) { next(error); }
}

export async function getSellerBrands(req, res, next) {
  try {
    const brands = await prisma.sellerBrand.findMany({
      where: { sellerId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: brands });
  } catch (error) { next(error); }
}

export async function addSellerBrand(req, res, next) {
  try {
    const { name, logoUrl, logoPublicId } = req.body;
    if (!name || !name.trim()) {
      return next(new AppError(400, 'Brand name is required.'));
    }
    if (!logoUrl) {
      return next(new AppError(400, 'Brand logo is required.'));
    }

    const brand = await prisma.sellerBrand.create({
      data: {
        sellerId: req.user.id,
        name: name.trim(),
        logoUrl,
        logoPublicId: logoPublicId || null
      }
    });

    res.status(201).json({ status: 'success', data: brand });
  } catch (error) { next(error); }
}

export async function updateSellerBrand(req, res, next) {
  try {
    const { id } = req.params;
    const { name, logoUrl, logoPublicId } = req.body;

    const existingBrand = await prisma.sellerBrand.findUnique({
      where: { id }
    });

    if (!existingBrand || existingBrand.sellerId !== req.user.id) {
      return next(new AppError(403, 'Unauthorized access to brand.'));
    }

    const updatedBrand = await prisma.sellerBrand.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingBrand.name,
        logoUrl: logoUrl || existingBrand.logoUrl,
        logoPublicId: logoPublicId !== undefined ? logoPublicId : existingBrand.logoPublicId
      }
    });

    res.json({ status: 'success', data: updatedBrand });
  } catch (error) { next(error); }
}

export async function deleteSellerBrand(req, res, next) {
  try {
    const { id } = req.params;

    const existingBrand = await prisma.sellerBrand.findUnique({
      where: { id }
    });

    if (!existingBrand || existingBrand.sellerId !== req.user.id) {
      return next(new AppError(403, 'Unauthorized access to brand.'));
    }

    await prisma.sellerBrand.delete({
      where: { id }
    });

    res.json({ status: 'success', message: 'Brand removed successfully.' });
  } catch (error) { next(error); }
}

export async function getSellerReturns(req, res, next) {
  try {
    const returns = await prisma.returnRequest.findMany({
      where: { orderItem: { product: { sellerId: req.user.id } } },
      include: { orderItem: { include: { product: true } } }
    });
    res.json({ status: 'success', data: returns });
  } catch (error) { next(error); }
}

export async function getSellerPayouts(req, res, next) {
  try {
    const payouts = await prisma.payoutHistory.findMany({
      where: { sellerId: req.user.id }
    });
    res.json({ status: 'success', data: payouts });
  } catch (error) { next(error); }
}

export async function getSellerShipping(req, res, next) {
  try {
    const shippings = await prisma.orderItem.findMany({
      where: {
        product: { sellerId: req.user.id },
        status: { in: ['PROCESSING', 'PACKED', 'SHIPPED'] }
      },
      include: {
        order: {
          include: {
            buyer: { select: { firstName: true, lastName: true, email: true } },
            address: true
          }
        },
        product: { select: { name: true, images: { take: 1 } } }
      },
      orderBy: { order: { createdAt: 'desc' } }
    });
    res.json({ status: 'success', data: shippings });
  } catch (error) { next(error); }
}

export async function getSellerPerformance(req, res, next) {
  try {
    const sellerId = req.user.id;

    const orderItems = await prisma.orderItem.findMany({
      where: { product: { sellerId } },
      select: { status: true }
    });

    const totalOrders = orderItems.length;
    let fulfilledOrders = 0;
    let cancelledOrders = 0;

    orderItems.forEach(item => {
      if (item.status === 'DELIVERED') fulfilledOrders++;
      if (item.status === 'CANCELLED') cancelledOrders++;
    });

    const fulfilmentRate = totalOrders > 0 ? (fulfilledOrders / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    const reviewAgg = await prisma.review.aggregate({
      where: { product: { sellerId } },
      _avg: { rating: true }
    });

    res.json({
      status: 'success',
      data: {
        fulfilmentRate: parseFloat(fulfilmentRate.toFixed(2)),
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),
        averageRating: parseFloat((reviewAgg._avg.rating || 0).toFixed(2)),
        totalOrders,
        fulfilledOrders,
        cancelledOrders
      }
    });
  } catch (error) { next(error); }
}

export async function updateOrderItemStatus(req, res, next) {
  try {
    const { orderItemId } = req.params;
    const { status } = req.body;

    if (!status) {
      return next(new AppError('Status is required', 400));
    }

    let dbStatus;
    const cleanStatus = status.toUpperCase();
    if (cleanStatus === 'ACCEPTED') {
      dbStatus = 'PROCESSING';
    } else if (['PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(cleanStatus)) {
      dbStatus = cleanStatus;
    } else {
      return next(new AppError('Invalid status value', 400));
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { product: true }
    });

    if (!orderItem) {
      return next(new AppError('Order item not found', 404));
    }

    if (orderItem.product.sellerId !== req.user.id) {
      return next(new AppError('You are not authorized to update this order item', 403));
    }

    const updateData = { status: dbStatus };
    const now = new Date();
    if (dbStatus === 'PROCESSING') {
      updateData.acceptedAt = now;
      updateData.estimatedDelivery = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    } else if (dbStatus === 'PACKED') {
      updateData.packedAt = now;
    } else if (dbStatus === 'SHIPPED') {
      updateData.shippedAt = now;
    } else if (dbStatus === 'DELIVERED') {
      updateData.deliveredAt = now;
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: updateData
    });

    const parentOrderId = orderItem.orderId;
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: parentOrderId }
    });

    let newParentStatus = 'PENDING';
    const allDelivered = allItems.every(item => item.status === 'DELIVERED');
    const allCancelled = allItems.every(item => item.status === 'CANCELLED');
    const anyShipped = allItems.some(item => item.status === 'SHIPPED');
    const anyProcessing = allItems.some(item => item.status === 'PROCESSING' || item.status === 'PACKED');

    if (allDelivered) {
      newParentStatus = 'DELIVERED';
    } else if (allCancelled) {
      newParentStatus = 'CANCELLED';
    } else if (anyShipped) {
      newParentStatus = 'SHIPPED';
    } else if (anyProcessing) {
      newParentStatus = 'CONFIRMED';
    }

    await prisma.order.update({
      where: { id: parentOrderId },
      data: { status: newParentStatus }
    });

    // ─── Buyer notification on key status changes ────────────────────────────
    try {
      const fullItem = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
        include: {
          product: { select: { name: true } },
          order: { select: { buyerId: true } }
        }
      });
      const buyerId = fullItem?.order?.buyerId;
      const productName = fullItem?.product?.name || 'your product';
      if (buyerId) {
        const statusMessages = {
          PROCESSING: { title: '✅ Order Accepted', type: 'ORDER', message: `Your order for "${productName}" has been accepted and is being prepared.` },
          PACKED:     { title: '📦 Order Packed', type: 'ORDER', message: `Your order for "${productName}" is packed and ready for dispatch.` },
          SHIPPED:    { title: '🚚 Order Shipped', type: 'ORDER', message: `Your order for "${productName}" has been shipped and is on the way!` },
          DELIVERED:  { title: '🎉 Order Delivered', type: 'ORDER', message: `Your order for "${productName}" has been delivered. Enjoy! Please leave a review.` },
          CANCELLED:  { title: '❌ Order Item Cancelled', type: 'ORDER', message: `Your order for "${productName}" has been cancelled by the seller.` }
        };
        const notifData = statusMessages[dbStatus];
        if (notifData) {
          await prisma.notification.create({
            data: { userId: buyerId, type: notifData.type, title: notifData.title, message: notifData.message }
          });
        }
      }
    } catch (notifErr) {
      console.error('[Notification] Failed to send order-status notification:', notifErr.message);
    }

    res.status(200).json({
      status: 'success',
      data: updatedItem
    });

  } catch (error) { next(error); }
}

export async function updateSellerInventory(req, res, next) {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null) {
      return next(new AppError('Quantity is required', 400));
    }

    const qtyVal = parseInt(quantity, 10);
    if (isNaN(qtyVal) || qtyVal < 0) {
      return next(new AppError('Quantity must be a non-negative integer', 400));
    }

    // Verify ownership of the product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    if (product.sellerId !== req.user.id) {
      return next(new AppError('You are not authorized to update this inventory', 403));
    }

    const updatedInventory = await prisma.inventory.upsert({
      where: { productId },
      update: { quantity: qtyVal },
      create: { productId, quantity: qtyVal }
    });

    // ─── Low-stock / out-of-stock seller notifications ───────────────────────
    try {
      if (qtyVal === 0) {
        await prisma.notification.create({
          data: {
            userId: req.user.id,
            type: 'STOCK',
            title: '🚫 Product Out of Stock',
            message: `"${product.name}" is now out of stock. Update your inventory to start receiving orders again.`
          }
        });
      } else if (qtyVal > 0 && qtyVal <= 5) {
        await prisma.notification.create({
          data: {
            userId: req.user.id,
            type: 'STOCK',
            title: '⚠️ Low Stock Alert',
            message: `"${product.name}" has only ${qtyVal} unit(s) remaining. Consider restocking soon.`
          }
        });
      }
    } catch (notifErr) {
      console.error('[Notification] Failed to send stock notification:', notifErr.message);
    }

    res.json({
      status: 'success',
      data: updatedInventory
    });
  } catch (error) { next(error); }
}

export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return next(new AppError('Notification not found', 404));
    if (notification.userId !== req.user.id) return next(new AppError('Unauthorized', 403));

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ status: 'success', data: updated });
  } catch (error) { next(error); }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error) { next(error); }
}
