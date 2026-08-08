import crypto from 'crypto';
import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { getRazorpayClient } from '../config/razorpay.js';
import { getPlatformSettings } from '../config/platformSettings.js';

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

export function getTodayKolkataString() {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

export function getKolkataTimeComponents() {
  const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
  let hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  return { hour, minute };
}

export function isSessionExpiredKolkata(dateStr, endTimeStr) {
  if (!dateStr) return false;
  const todayKolkata = getTodayKolkataString();

  let targetDateOnly = dateStr;
  if (typeof dateStr === 'string') {
    targetDateOnly = dateStr.split('T')[0];
  } else if (dateStr instanceof Date) {
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(dateStr);
    targetDateOnly = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
  }

  if (targetDateOnly !== todayKolkata) return false;

  const { hour: curHour, minute: curMin } = getKolkataTimeComponents();
  const { hour: endHour, minute: endMin } = parseTime(endTimeStr);

  if (curHour > endHour) return true;
  if (curHour === endHour && curMin >= endMin) return true;
  return false;
}

/**
 * 1. CREATE RAZORPAY ORDER
 * Backend independently calculates the exact amount from PostgreSQL.
 * NEVER trusts price sent from frontend.
 */
export async function createRazorpayOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { type, payload } = req.body;

    if (!type || !payload) {
      return next(new AppError(400, 'Invalid request parameters. Payment type and payload required.'));
    }

    const razorpay = getRazorpayClient();
    let calculatedTotalINR = 0;
    let notes = { userId, paymentType: type };

    if (type === 'SERVICE') {
      const { serviceId, date, selectedSession } = payload;
      if (!serviceId || !date || !selectedSession) {
        return next(new AppError(400, 'Service ID, date, and selected session are required.'));
      }

      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        return next(new AppError(404, 'Service not found in platform records.'));
      }

      // Calculate Service Total (Base + Category GST)
      const basePrice = service.price || 0;
      const cat = (service.category || '').toUpperCase();
      const gstPercent = (cat === 'VET' || cat === 'HEALTH_CHECKUP')
        ? 0
        : (service.gst !== null && service.gst !== undefined ? service.gst : 18);
      
      const gstAmount = basePrice * (gstPercent / 100);
      calculatedTotalINR = basePrice + gstAmount;

      // Session Expiration & Capacity Check
      const sessionEndTime = selectedSession === 'morning'
        ? (service.morningEndTime || '13:00')
        : (service.afternoonEndTime || '17:00');

      if (isSessionExpiredKolkata(date, sessionEndTime)) {
        return next(new AppError(400, 'This session is no longer available. Please select another session or date.'));
      }

      let startOfDate;
      if (typeof date === 'string' && date.includes('-')) {
        const parts = date.split('-');
        startOfDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
      } else {
        const pd = new Date(date);
        startOfDate = new Date(pd.getFullYear(), pd.getMonth(), pd.getDate(), 0, 0, 0, 0);
      }
      const endOfDate = new Date(startOfDate.getFullYear(), startOfDate.getMonth(), startOfDate.getDate(), 23, 59, 59, 999);

      const activeBookingsCount = await prisma.appointment.count({
        where: {
          serviceId,
          date: { gte: startOfDate, lte: endOfDate },
          selectedSession,
          status: { notIn: ['CANCELLED', 'REJECTED', 'REFUNDED'] }
        }
      });

      const maxCapacity = selectedSession === 'morning'
        ? (service.morningCapacity ?? 5)
        : (service.afternoonCapacity ?? 5);

      if (activeBookingsCount >= maxCapacity) {
        return next(new AppError(400, 'Selected session is fully booked. Please choose another session.'));
      }

      notes.serviceId = serviceId;
      notes.selectedSession = selectedSession;
      notes.date = date;

    } else if (type === 'PRODUCT') {
      const { addressId, items, couponCode } = payload;
      if (!addressId || !items || !items.length) {
        return next(new AppError(400, 'Delivery address and order items are required.'));
      }

      const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
      if (!address) {
        return next(new AppError(404, 'Delivery address not found.'));
      }

      let subtotal = 0;
      let totalGst = 0;

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true }
        });

        const availableQty = product?.inventory ? product.inventory.quantity : 0;
        if (!product || product.status === 'INACTIVE' || availableQty <= 0) {
          return next(new AppError(400, `Product ${product?.name || item.productId} is out of stock.`));
        }
        if (availableQty < item.quantity) {
          return next(new AppError(400, `Not enough stock for ${product.name}. Only ${availableQty} left.`));
        }

        const itemSubtotal = product.price * item.quantity;
        const itemGstPercent = product.gst !== null && product.gst !== undefined ? product.gst : 18;
        const itemGst = (itemSubtotal * itemGstPercent) / 100;

        subtotal += itemSubtotal;
        totalGst += itemGst;
      }

      let couponDiscount = 0;
      if (couponCode) {
        const normalizedCode = couponCode.trim().toUpperCase();

        // 1. Check Product-level fixed INR promo code
        let productPromoDiscountTotal = 0;
        for (const item of items) {
          const prod = fetchedProducts.find(p => p.id === item.productId);
          if (prod && prod.promoCode && prod.promoCode.trim().toUpperCase() === normalizedCode && prod.promoDiscount > 0) {
            const perItemDiscount = Math.min(prod.promoDiscount, prod.price);
            productPromoDiscountTotal += perItemDiscount * (item.quantity || 1);
          }
        }

        if (productPromoDiscountTotal > 0) {
          couponDiscount = Math.min(productPromoDiscountTotal, subtotal);
        } else {
          // 2. Check Coupon table promo code
          const coupon = await prisma.coupon.findUnique({
            where: { code: normalizedCode, active: true },
            include: { products: { select: { id: true } } }
          });

          if (coupon && new Date(coupon.expiresAt) > new Date()) {
            let applicableSubtotal = 0;
            if (coupon.products && coupon.products.length > 0) {
              const allowedProductIds = new Set(coupon.products.map(p => p.id));
              for (const item of items) {
                if (allowedProductIds.has(item.productId)) {
                  const prod = fetchedProducts.find(p => p.id === item.productId);
                  applicableSubtotal += (prod?.price || 0) * (item.quantity || 1);
                }
              }
            } else {
              for (const item of items) {
                const prod = fetchedProducts.find(p => p.id === item.productId);
                if (!prod || prod.sellerId === coupon.sellerId) {
                  applicableSubtotal += (prod?.price || 0) * (item.quantity || 1);
                }
              }
              if (applicableSubtotal === 0) applicableSubtotal = subtotal;
            }

            if (applicableSubtotal > 0) {
              if (coupon.isPercent) {
                couponDiscount = (applicableSubtotal * coupon.discount) / 100;
              } else {
                couponDiscount = coupon.discount;
              }
              couponDiscount = Math.min(couponDiscount, applicableSubtotal);
            }
          }
        }
      }

      const shippingCharges = subtotal > 499 ? 0 : 40;
      const platformFee = 5;
      const packagingFee = 10;

      calculatedTotalINR = subtotal - couponDiscount + totalGst + shippingCharges + platformFee + packagingFee;
      notes.addressId = addressId;

    } else {
      return next(new AppError(400, `Unsupported payment type: ${type}`));
    }

    if (calculatedTotalINR <= 0) {
      return next(new AppError(400, 'Invalid calculated order total amount.'));
    }

    // Convert amount to smallest currency unit (Paise)
    const amountInPaise = Math.round(calculatedTotalINR * 100);
    const receipt = `rcpt_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes
    });

    res.status(200).json({
      status: 'success',
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        paymentType: type,
        grossTotalINR: calculatedTotalINR
      }
    });

  } catch (error) { next(error); }
}

/**
 * 2. VERIFY RAZORPAY PAYMENT & FINALIZE BOOKING/ORDER
 * Mandatorily verifies HMAC SHA256 signature on backend.
 * Idempotent: duplicate submissions return existing finalized records.
 */
export async function verifyRazorpayPayment(req, res, next) {
  try {
    const userId = req.user.id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, type, payload } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !type || !payload) {
      return next(new AppError(400, 'Missing Razorpay verification parameters.'));
    }

    // 1. HMAC SHA256 Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return next(new AppError(400, 'Invalid Razorpay payment signature. Payment verification failed.'));
    }

    // 2. Idempotency Check
    if (type === 'SERVICE') {
      const existingTx = await prisma.paymentTransaction.findFirst({
        where: { razorpayPaymentId: razorpay_payment_id }
      });
      if (existingTx) {
        const appointment = await prisma.appointment.findUnique({ where: { id: existingTx.appointmentId } });
        return res.status(200).json({
          status: 'success',
          message: 'Payment already verified.',
          data: { appointment, isDuplicate: true }
        });
      }
    } else if (type === 'PRODUCT') {
      const existingPayment = await prisma.payment.findFirst({
        where: { razorpayPaymentId: razorpay_payment_id }
      });
      if (existingPayment) {
        const order = await prisma.order.findUnique({
          where: { id: existingPayment.orderId },
          include: { orderItems: true, payment: true }
        });
        return res.status(200).json({
          status: 'success',
          message: 'Payment already verified.',
          data: { order, isDuplicate: true }
        });
      }
    }

    // 3. Finalize Transaction inside DB Transaction
    const result = await prisma.$transaction(async (tx) => {
      if (type === 'SERVICE') {
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
          dogVaccinated
        } = payload;

        const service = await tx.service.findUnique({ where: { id: serviceId } });
        if (!service) throw new AppError(404, 'Service not found.');

        let provider = await tx.user.findUnique({ where: { id: service.providerId } });
        if (!provider) {
          provider = await tx.user.findFirst({ where: { role: 'SERVICE_PROVIDER' } });
        }

        const sessionEndTime = selectedSession === 'morning'
          ? (service.morningEndTime || '13:00')
          : (service.afternoonEndTime || '17:00');

        if (isSessionExpiredKolkata(date, sessionEndTime)) {
          throw new AppError(400, 'This session has expired. Please select another available session or date.');
        }

        // Re-verify session capacity
        let startOfDate;
        if (typeof date === 'string' && date.includes('-')) {
          const parts = date.split('-');
          startOfDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
        } else {
          const pd = new Date(date);
          startOfDate = new Date(pd.getFullYear(), pd.getMonth(), pd.getDate(), 0, 0, 0, 0);
        }
        const endOfDate = new Date(startOfDate.getFullYear(), startOfDate.getMonth(), startOfDate.getDate(), 23, 59, 59, 999);

        const activeBookings = await tx.appointment.count({
          where: {
            serviceId,
            date: { gte: startOfDate, lte: endOfDate },
            selectedSession,
            status: { notIn: ['CANCELLED', 'REJECTED', 'REFUNDED'] }
          }
        });

        const maxCap = selectedSession === 'morning' ? (service.morningCapacity ?? 5) : (service.afternoonCapacity ?? 5);
        if (activeBookings >= maxCap) {
          throw new AppError(400, 'Selected session capacity reached during payment checkout.');
        }

        // Calculate financial split
        const baseServiceAmount = service.price || 0;
        const cat = (service.category || '').toUpperCase();
        const gstPercent = (cat === 'VET' || cat === 'HEALTH_CHECKUP')
          ? 0
          : (service.gst !== null && service.gst !== undefined ? service.gst : 18);

        const gstAmount = baseServiceAmount * (gstPercent / 100);
        const grossCustomerPayment = baseServiceAmount + gstAmount;

        const settings = await getPlatformSettings();
        const commissionRate = (settings.platformCommissionRate || 10) / 100;
        const commissionAmount = baseServiceAmount * commissionRate;
        const providerNet = baseServiceAmount - commissionAmount;
        const providerAmount = providerNet + gstAmount;

        const startTime = selectedSession === 'morning' ? (service.morningStartTime || '09:00') : (service.afternoonStartTime || '14:00');
        const endTime = selectedSession === 'morning' ? (service.morningEndTime || '13:00') : (service.afternoonEndTime || '18:00');

        // Create Appointment (bookingStatus = BOOKED, paymentStatus = HELD)
        const appointment = await tx.appointment.create({
          data: {
            buyerId: userId,
            serviceId,
            providerId: provider.id,
            date: startOfDate,
            startTime,
            endTime,
            selectedSession,
            dogName,
            dogAgeCategory,
            dogBreed,
            dogWeight,
            dogGender,
            dogAllergies,
            dogConditions,
            dogVaccinated,
            status: 'BOOKED',
            bookingStatus: 'BOOKED',
            paymentStatus: 'HELD',
            commissionAmount,
            providerAmount
          }
        });

        // Log PaymentTransaction with Razorpay details
        await tx.paymentTransaction.create({
          data: {
            appointmentId: appointment.id,
            providerId: provider.id,
            buyerId: userId,
            grossAmount: grossCustomerPayment,
            commissionAmount,
            providerAmount,
            paymentStatus: 'HELD',
            paymentMethod: 'RAZORPAY',
            transactionType: 'PAYMENT',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            transactionReference: `RAZORPAY_${razorpay_payment_id}`
          }
        });

        // User Notification
        await tx.notification.create({
          data: {
            userId,
            title: 'Service Booking Confirmed!',
            message: `Your appointment for ${service.name} on ${date} (${selectedSession.toUpperCase()}) has been confirmed via Razorpay.`
          }
        });

        return { type: 'SERVICE', appointment };

      } else if (type === 'PRODUCT') {
        const { addressId, items, couponCode } = payload;

        let subtotal = 0;
        let totalGst = 0;

        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: { inventory: true }
          });

          const availableQty = product?.inventory ? product.inventory.quantity : 0;
          if (!product || product.status === 'INACTIVE' || availableQty <= 0) {
            throw new AppError(400, `Product ${product?.name || item.productId} is out of stock.`);
          }

          // Deduct main inventory
          if (product.inventory) {
            if (availableQty < item.quantity) {
              throw new AppError(400, `Not enough stock for ${product.name}. Only ${availableQty} left.`);
            }
            const newQty = availableQty - item.quantity;
            await tx.inventory.update({
              where: { id: product.inventory.id },
              data: { quantity: newQty }
            });
            if (newQty === 0) {
              await tx.product.update({ where: { id: product.id }, data: { status: 'OUT_OF_STOCK' } });
            }
          }

          const itemSubtotal = product.price * item.quantity;
          const itemGstPercent = product.gst !== null && product.gst !== undefined ? product.gst : 18;
          subtotal += itemSubtotal;
          totalGst += (itemSubtotal * itemGstPercent) / 100;
        }

        let couponDiscount = 0;
        if (couponCode) {
          const normalizedCode = couponCode.trim().toUpperCase();

          // 1. Check Product-level fixed INR promo code
          let productPromoDiscountTotal = 0;
          for (const item of items) {
            const prod = fetchedProducts.find(p => p.id === item.productId);
            if (prod && prod.promoCode && prod.promoCode.trim().toUpperCase() === normalizedCode && prod.promoDiscount > 0) {
              const perItemDiscount = Math.min(prod.promoDiscount, prod.price);
              productPromoDiscountTotal += perItemDiscount * (item.quantity || 1);
            }
          }

          if (productPromoDiscountTotal > 0) {
            couponDiscount = Math.min(productPromoDiscountTotal, subtotal);
          } else {
            // 2. Check Coupon table promo code
            const coupon = await tx.coupon.findUnique({
              where: { code: normalizedCode, active: true },
              include: { products: { select: { id: true } } }
            });

            if (coupon && new Date(coupon.expiresAt) > new Date()) {
              let applicableSubtotal = 0;
              if (coupon.products && coupon.products.length > 0) {
                const allowedProductIds = new Set(coupon.products.map(p => p.id));
                for (const item of items) {
                  if (allowedProductIds.has(item.productId)) {
                    const prod = fetchedProducts.find(p => p.id === item.productId);
                    applicableSubtotal += (prod?.price || 0) * (item.quantity || 1);
                  }
                }
              } else {
                for (const item of items) {
                  const prod = fetchedProducts.find(p => p.id === item.productId);
                  if (!prod || prod.sellerId === coupon.sellerId) {
                    applicableSubtotal += (prod?.price || 0) * (item.quantity || 1);
                  }
                }
                if (applicableSubtotal === 0) applicableSubtotal = subtotal;
              }

              if (applicableSubtotal > 0) {
                if (coupon.isPercent) {
                  couponDiscount = (applicableSubtotal * coupon.discount) / 100;
                } else {
                  couponDiscount = coupon.discount;
                }
                couponDiscount = Math.min(couponDiscount, applicableSubtotal);

                await tx.coupon.update({
                  where: { id: coupon.id },
                  data: { usageCount: { increment: 1 } }
                });
              }
            }
          }
        }

        const shippingCharges = subtotal > 499 ? 0 : 40;
        const platformFee = 5;
        const packagingFee = 10;
        const grandTotal = subtotal - couponDiscount + totalGst + shippingCharges + platformFee + packagingFee;

        // Create Order and Payment record
        const order = await tx.order.create({
          data: {
            buyerId: userId,
            addressId,
            total: grandTotal,
            status: 'PENDING',
            couponCode: couponCode || null,
            orderItems: {
              create: items.map(item => ({
                productId: item.productId,
                selectedColor: item.selectedColor || '',
                selectedSize: item.selectedSize || '',
                quantity: item.quantity,
                price: item.price
              }))
            },
            payment: {
              create: {
                paymentMethod: 'RAZORPAY',
                transactionId: razorpay_payment_id,
                gateway: 'RAZORPAY',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: 'COMPLETED',
                amount: grandTotal
              }
            }
          },
          include: {
            orderItems: { include: { product: true } },
            payment: true
          }
        });

        // Clear Buyer Cart
        const cart = await tx.cart.findUnique({ where: { userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }

        // Notification
        await tx.notification.create({
          data: {
            userId,
            title: 'Order Confirmed!',
            message: `Your PawMart order #${order.id.slice(-8).toUpperCase()} for ₹${grandTotal.toFixed(2)} has been placed successfully via Razorpay.`
          }
        });

        return { type: 'PRODUCT', order };
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment verified and transaction completed successfully.',
      data: result
    });

  } catch (error) { next(error); }
}

/**
 * 3. PROCESS RAZORPAY REFUND
 * Initiates Razorpay Gateway Refund for cancellations/disputes.
 */
export async function processRazorpayRefund(appointmentIdOrOrderId, amount, reason = 'Cancellation/Dispute Refund') {
  try {
    const razorpay = getRazorpayClient();

    // Check if appointment payment transaction exists
    const pTx = await prisma.paymentTransaction.findFirst({
      where: { appointmentId: appointmentIdOrOrderId, transactionType: 'PAYMENT' }
    });

    if (pTx && pTx.razorpayPaymentId) {
      if (pTx.paymentStatus === 'REFUNDED' || pTx.razorpayRefundId) {
        return { success: true, message: 'Already refunded.' };
      }

      const amountInPaise = Math.round((amount || pTx.grossAmount) * 100);
      const refund = await razorpay.payments.refund(pTx.razorpayPaymentId, {
        amount: amountInPaise,
        notes: { reason }
      });

      await prisma.paymentTransaction.update({
        where: { id: pTx.id },
        data: {
          paymentStatus: 'REFUNDED',
          razorpayRefundId: refund.id,
          refundedAt: new Date()
        }
      });

      return { success: true, refundId: refund.id };
    }

    // Check if product order payment exists
    const pOrder = await prisma.payment.findFirst({
      where: { orderId: appointmentIdOrOrderId }
    });

    if (pOrder && pOrder.razorpayPaymentId) {
      if (pOrder.status === 'REFUNDED' || pOrder.refundId) {
        return { success: true, message: 'Already refunded.' };
      }

      const amountInPaise = Math.round((amount || pOrder.amount) * 100);
      const refund = await razorpay.payments.refund(pOrder.razorpayPaymentId, {
        amount: amountInPaise,
        notes: { reason }
      });

      await prisma.payment.update({
        where: { id: pOrder.id },
        data: {
          status: 'REFUNDED',
          refundId: refund.id,
          refundedAt: new Date()
        }
      });

      return { success: true, refundId: refund.id };
    }

    return { success: false, reason: 'No Razorpay payment record found for refund execution.' };
  } catch (error) {
    console.error('[Razorpay Refund Error]:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * 4. RAZORPAY WEBHOOK HANDLER
 * Raw body signature verification foundation.
 */
export async function handleRazorpayWebhook(req, res, next) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('[Razorpay Webhook Warning] RAZORPAY_WEBHOOK_SECRET is not configured in environment variables. Webhook verification is disabled.');
      return res.status(200).json({ status: 'ignored', message: 'Webhook secret not configured.' });
    }

    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ status: 'fail', message: 'Invalid webhook signature.' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log(`[Razorpay Webhook Event Received]: ${event.event}`);

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('[Razorpay Webhook Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function validatePromoCode(req, res, next) {
  try {
    const { code, items } = req.body;

    if (!code || !code.trim()) {
      return next(new AppError(400, 'Please enter a promo code.'));
    }

    const normalizedCode = code.trim().toUpperCase();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(new AppError(400, 'Cart items are required for promo validation.'));
    }

    const itemProductIds = items.map(i => i.productId || i.product?.id || (typeof i.id === 'string' && !i.id.startsWith('cart') ? i.id : undefined)).filter(Boolean);
    const fetchedProducts = await prisma.product.findMany({
      where: { id: { in: itemProductIds } }
    });

    let discountAmount = 0;
    let appliedType = '';

    // 1. Check Product-level fixed INR promo code
    let productPromoDiscountTotal = 0;
    for (const item of items) {
      const pId = item.productId || item.product?.id || (typeof item.id === 'string' && !item.id.startsWith('cart') ? item.id : undefined);
      const prod = fetchedProducts.find(p => p.id === pId);
      if (prod && prod.promoCode && prod.promoCode.trim().toUpperCase() === normalizedCode && prod.promoDiscount > 0) {
        const qty = item.quantity || 1;
        const perItemDiscount = Math.min(prod.promoDiscount, prod.price);
        productPromoDiscountTotal += perItemDiscount * qty;
      }
    }

    if (productPromoDiscountTotal > 0) {
      discountAmount = productPromoDiscountTotal;
      appliedType = 'PRODUCT';
    } else {
      // 2. Check Coupon table promo code
      const coupon = await prisma.coupon.findFirst({
        where: { code: { equals: normalizedCode, mode: 'insensitive' }, active: true },
        include: { products: { select: { id: true } } }
      });

      if (coupon && new Date(coupon.expiresAt) > new Date()) {
        let applicableSubtotal = 0;
        if (coupon.products && coupon.products.length > 0) {
          const allowedProductIds = new Set(coupon.products.map(p => p.id));
          for (const item of items) {
            const pId = item.productId || item.product?.id;
            if (allowedProductIds.has(pId)) {
              const prod = fetchedProducts.find(p => p.id === pId);
              applicableSubtotal += (prod?.price || 0) * (item.quantity || 1);
            }
          }
        } else {
          for (const item of items) {
            const pId = item.productId || item.product?.id;
            const prod = fetchedProducts.find(p => p.id === pId);
            if (!prod || prod.sellerId === coupon.sellerId) {
              applicableSubtotal += (prod?.price || 0) * (item.quantity || 1);
            }
          }
        }

        if (applicableSubtotal > 0) {
          if (coupon.isPercent) {
            discountAmount = (applicableSubtotal * coupon.discount) / 100;
          } else {
            discountAmount = coupon.discount;
          }
          discountAmount = Math.min(discountAmount, applicableSubtotal);
          appliedType = 'COUPON';
        }
      }
    }

    if (discountAmount <= 0) {
      const codeExistsOnProduct = await prisma.product.findFirst({
        where: { promoCode: { equals: normalizedCode, mode: 'insensitive' } }
      });

      if (codeExistsOnProduct) {
        return next(new AppError(400, 'Promo code is not available for the products in your cart.'));
      }
      return next(new AppError(400, 'Invalid promo code.'));
    }

    res.json({
      status: 'success',
      data: {
        code: normalizedCode,
        discountAmount,
        type: appliedType
      }
    });
  } catch (error) {
    next(error);
  }
}
