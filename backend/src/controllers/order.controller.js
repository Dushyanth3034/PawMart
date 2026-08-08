import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { getOrCreateWallet } from './wallet.controller.js';
import { getPlatformSettings } from '../config/platformSettings.js';
import { generateInvoicePDF } from '../services/invoice.service.js';

export async function createOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { addressId, items, total, paymentMethod, transactionId } = req.body;

    if (!addressId || !items || !items.length || !total || !paymentMethod) {
      return next(new AppError(400, 'Missing required order fields.'));
    }

    // Verify address exists and belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!address) {
      return next(new AppError(404, 'Delivery address not found.'));
    }

    // Create the order and items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // 0. Ensure products exist and check stock/deduct
      for (const item of items) {
        const existingProduct = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true }
        });
        
        if (!existingProduct) {
          // Find a default category and seller to associate
          let category = await tx.category.findFirst();
          if (!category) {
            category = await tx.category.create({ data: { name: 'General', slug: 'general' } });
          }
          let seller = await tx.user.findFirst({ where: { role: 'SELLER' } });
          if (!seller) {
            throw new AppError(404, 'No active seller account exists in the platform to assign product.');
          }
          
          await tx.product.create({
            data: {
              id: item.productId,
              name: 'Product ' + item.productId,
              description: 'Auto-synced product from cart',
              price: item.price,
              slug: `product-${item.productId}-${Date.now()}`,
              categoryId: category.id,
              sellerId: seller.id
            }
          });
        } else {
          // 1. Validate Product Status
          if (existingProduct.status === 'OUT_OF_STOCK') {
            throw new AppError(400, `${existingProduct.name} is currently out of stock.`);
          }

          // 2. Validate & Deduct Variant Stock (if color or size selected)
          if (item.selectedColor) {
            const colorVariant = await tx.productVariant.findFirst({
              where: {
                productId: item.productId,
                type: { equals: 'color', mode: 'insensitive' },
                value: { equals: item.selectedColor, mode: 'insensitive' }
              }
            });

            if (colorVariant && colorVariant.stock !== null) {
              if (colorVariant.stock < item.quantity) {
                throw new AppError(400, `Not enough stock for variant ${existingProduct.name} (${item.selectedColor}). Only ${colorVariant.stock} left.`);
              }
              await tx.productVariant.update({
                where: { id: colorVariant.id },
                data: { stock: colorVariant.stock - item.quantity }
              });
            }
          }

          if (item.selectedSize) {
            const sizeVariant = await tx.productVariant.findFirst({
              where: {
                productId: item.productId,
                type: { equals: 'size', mode: 'insensitive' },
                value: { equals: item.selectedSize, mode: 'insensitive' }
              }
            });

            if (sizeVariant && sizeVariant.stock !== null) {
              if (sizeVariant.stock < item.quantity) {
                throw new AppError(400, `Not enough stock for variant ${existingProduct.name} (${item.selectedSize}). Only ${sizeVariant.stock} left.`);
              }
              await tx.productVariant.update({
                where: { id: sizeVariant.id },
                data: { stock: sizeVariant.stock - item.quantity }
              });
            }
          }

          // 3. Validate & Deduct Main Inventory Stock
          const inventory = existingProduct.inventory;
          if (inventory) {
            if (inventory.quantity < item.quantity) {
              throw new AppError(400, `Not enough stock for ${existingProduct.name}. Only ${inventory.quantity} left.`);
            }
            const newQty = inventory.quantity - item.quantity;
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: newQty }
            });

            if (newQty === 0) {
              await tx.product.update({
                where: { id: existingProduct.id },
                data: { status: 'OUT_OF_STOCK' }
              });
            }
          }
        }
      }

      // 4. Create the order
      const newOrder = await tx.order.create({
        data: {
          buyerId: userId,
          addressId,
          total,
          status: 'PENDING',
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
              paymentMethod,
              transactionId: transactionId || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              status: 'COMPLETED',
              amount: total
            }
          }
        },
        include: {
          orderItems: {
            include: { product: true }
          },
          address: true,
          payment: true
        }
      });

      // ─── Initialize Seller Wallet & Earnings Pending ───────────────────
      for (const item of newOrder.orderItems) {
        const sellerId = item.product?.sellerId;
        if (sellerId) {
          const grossItemAmount = item.price * item.quantity;
          const gstRate = item.product?.gst !== null && item.product?.gst !== undefined ? item.product.gst : 18;
          const baseItemAmount = grossItemAmount / (1 + gstRate / 100);
          const gstAmount = grossItemAmount - baseItemAmount;
          const platformSettings = await getPlatformSettings();
          const commissionRate = platformSettings.platformCommissionRate / 100;
          const commissionAmount = baseItemAmount * commissionRate;
          const sellerNet = grossItemAmount - commissionAmount;

          const sellerWallet = await getOrCreateWallet(sellerId, tx);
          await tx.wallet.update({
            where: { id: sellerWallet.id },
            data: {
              pendingBalance: sellerWallet.pendingBalance + sellerNet
            }
          });

          await tx.walletTransaction.create({
            data: {
              walletId: sellerWallet.id,
              userId: sellerId,
              type: 'EARNING_PENDING',
              sourceType: 'PRODUCT_ORDER',
              sourceId: newOrder.id,
              grossAmount: baseItemAmount,
              gstAmount: gstAmount,
              commissionAmount: commissionAmount,
              netAmount: sellerNet,
              status: 'PENDING',
              description: `Pending earning for order item: ${item.product?.name || 'Product'} (Order #${newOrder.id.slice(-8).toUpperCase()})`
            }
          });
        }
      }

      // 5. Clear the user's cart (if applicable)
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });
      }

      return newOrder;
    });


    // ─── Notify each seller about the new order (fire-and-forget) ───────────
    try {
      const sellerMap = {};
      for (const item of order.orderItems) {
        const sellerId = item.product?.sellerId;
        if (sellerId && !sellerMap[sellerId]) {
          sellerMap[sellerId] = [];
        }
        if (sellerId) sellerMap[sellerId].push(item.product?.name || 'Product');
      }
      for (const [sellerId, productNames] of Object.entries(sellerMap)) {
        await prisma.notification.create({
          data: {
            userId: sellerId,
            type: 'ORDER',
            title: '🛍️ New Order Received',
            message: `A new order has been placed for: ${productNames.join(', ')}. Order #${order.id.slice(-8).toUpperCase()}.`
          }
        });
      }
    } catch (notifErr) {
      console.error('[Notification] Failed to send new-order notification:', notifErr.message);
    }

    res.status(201).json({
      status: 'success',
      data: order
    });

  } catch (error) {
    console.error('Error in createOrder:', error);
    next(error);
  }
}

export async function getUserOrders(req, res, next) {
  try {
    const userId = req.user.id;
    
    const orders = await prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        },
        address: true,
        payment: true
      }
    });

    res.status(200).json({
      status: 'success',
      data: orders
    });
  } catch (error) {
    console.error('Error in getUserOrders:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch orders' });
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, buyerId: userId }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Order is already cancelled.' });
    }

    // Check if any OrderItem has reached SHIPPED or DELIVERED status
    const shippedOrDeliveredItem = await prisma.orderItem.findFirst({
      where: {
        orderId: id,
        status: { in: ['SHIPPED', 'DELIVERED'] }
      }
    });

    if (shippedOrDeliveredItem) {
      return res.status(400).json({ message: 'This order has already been shipped and can no longer be cancelled.' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { 
        status: 'CANCELLED',
        orderItems: {
          updateMany: {
            where: { orderId: order.id },
            data: { status: 'CANCELLED' }
          }
        }
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        },
        address: true,
        payment: true
      }
    });

    // ─── Notify each affected seller about the cancellation ─────────────────
    try {
      const sellerMap = {};
      for (const item of updatedOrder.orderItems) {
        const sellerId = item.product?.sellerId;
        if (sellerId && !sellerMap[sellerId]) sellerMap[sellerId] = [];
        if (sellerId) sellerMap[sellerId].push(item.product?.name || 'Product');
      }
      for (const [sellerId, productNames] of Object.entries(sellerMap)) {
        await prisma.notification.create({
          data: {
            userId: sellerId,
            type: 'ORDER',
            title: '❌ Order Cancelled',
            message: `An order has been cancelled. Affected item(s): ${productNames.join(', ')}. Order #${updatedOrder.id.slice(-8).toUpperCase()}.`
          }
        });
      }
    } catch (notifErr) {
      console.error('[Notification] Failed to send cancellation notification:', notifErr.message);
    }

    res.status(200).json({
      status: 'success',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to cancel order' });
  }
}

export async function releaseSellerEarning(orderItemId, tx = prisma) {
  const item = await tx.orderItem.findUnique({
    where: { id: orderItemId },
    include: { product: true }
  });
  if (!item || item.sellerEarningsReleased) return;

  const sellerId = item.product?.sellerId;
  if (!sellerId) return;

  const grossItemAmount = item.price * item.quantity;
  const gstRate = item.product?.gst !== null && item.product?.gst !== undefined ? item.product.gst : 18;
  const baseItemAmount = grossItemAmount / (1 + gstRate / 100);
  const gstAmount = grossItemAmount - baseItemAmount;
  // Use snapshot-safe calculation: the commissionAmount was stored at order creation time
  // For legacy items that predate the wallet system, recalculate at 10%
  const platformSettings = await getPlatformSettings();
  const commissionRate = platformSettings.platformCommissionRate / 100;
  const commissionAmount = baseItemAmount * commissionRate;
  const sellerNet = grossItemAmount - commissionAmount;

  // Update order item to mark as released
  await tx.orderItem.update({
    where: { id: orderItemId },
    data: {
      sellerEarningsReleased: true,
      buyerDeliveryConfirmed: true,
      deliveryConfirmedAt: new Date()
    }
  });

  const wallet = await getOrCreateWallet(sellerId, tx);

  // Update wallet balances: Pending -> Available
  await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      pendingBalance: Math.max(0, wallet.pendingBalance - sellerNet),
      availableBalance: wallet.availableBalance + sellerNet,
      totalEarnings: wallet.totalEarnings + baseItemAmount
    }
  });

  // Create WalletTransaction
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId: sellerId,
      type: 'EARNING_RELEASED',
      sourceType: 'PRODUCT_ORDER',
      sourceId: item.orderId,
      grossAmount: baseItemAmount,
      gstAmount: gstAmount,
      commissionAmount: commissionAmount,
      netAmount: sellerNet,
      status: 'COMPLETED',
      description: `Earning released for product: ${item.product.name} (Order #${item.orderId.slice(-8).toUpperCase()})`
    }
  });

  // Send Notification
  try {
    await tx.notification.create({
      data: {
        userId: sellerId,
        type: 'ORDER',
        title: 'Earnings Released',
        message: `Your earnings of ₹${sellerNet} for ${item.product.name} have been released to your available balance.`
      }
    });
  } catch (_) {}
}

export async function confirmDelivery(req, res, next) {
  try {
    const { orderItemId } = req.params;
    const userId = req.user.id;

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true, product: true }
    });

    if (!orderItem) {
      return next(new AppError('Order item not found.', 404));
    }

    if (orderItem.order.buyerId !== userId) {
      return next(new AppError('Unauthorized access.', 403));
    }

    await prisma.$transaction(async (tx) => {
      await releaseSellerEarning(orderItemId, tx);
    });

    res.status(200).json({
      status: 'success',
      message: 'Delivery confirmed successfully and earnings released.'
    });
  } catch (error) { next(error); }
}

export async function disputeDelivery(req, res, next) {
  try {
    const { orderItemId } = req.params;
    const { disputeReason } = req.body;
    const userId = req.user.id;

    if (!disputeReason) {
      return next(new AppError('Dispute reason is required.', 400));
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true, product: true }
    });

    if (!orderItem) {
      return next(new AppError('Order item not found.', 404));
    }

    if (orderItem.order.buyerId !== userId) {
      return next(new AppError('Unauthorized access.', 403));
    }

    const updated = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        deliveryDisputed: true,
        deliveryDisputeReason: disputeReason
      }
    });

    // Notify Seller
    try {
      await prisma.notification.create({
        data: {
          userId: orderItem.product.sellerId,
          type: 'ORDER',
          title: '⚠️ Delivery Disputed',
          message: `Buyer disputed delivery for ${orderItem.product.name}. Reason: ${disputeReason}`
        }
      });
    } catch (_) {}

    // Notify Admin
    try {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: '⚠️ New Delivery Dispute',
            message: `Order item ${orderItemId} disputed by buyer. Reason: ${disputeReason}`
          }
        });
      }
    } catch (_) {}

    res.status(200).json({
      status: 'success',
      message: 'Dispute submitted successfully.',
      data: updated
    });
  } catch (error) { next(error); }
}

export async function downloadInvoice(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id: orderId } = req.params;

    if (!orderId) {
      return next(new AppError(400, 'Order ID is required.'));
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        address: true,
        payment: true,
        orderItems: {
          include: {
            product: {
              select: { id: true, name: true, price: true }
            }
          }
        }
      }
    });

    if (!order) {
      return next(new AppError(404, 'Order not found.'));
    }

    // Security & Ownership Check
    if (order.buyerId !== userId && userRole !== 'ADMIN') {
      return next(new AppError(403, 'Unauthorized. You can only download your own order invoices.'));
    }

    const invoiceNum = `INV-2026-${order.id.slice(-6).toUpperCase()}`;
    const filename = `PawMart-Invoice-${invoiceNum}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    generateInvoicePDF(order, res);
  } catch (error) {
    console.error('Error in downloadInvoice:', error);
    next(error);
  }
}
