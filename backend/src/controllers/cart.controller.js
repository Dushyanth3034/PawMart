import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function getCart(req, res, next) {
  try {
    const userId = req.user.id;
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { images: true, variants: true }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: { include: { images: true, variants: true } } } } }
      });
    }

    res.status(200).json({ status: 'success', data: cart });
  } catch (error) {
    next(error);
  }
}

export async function addToCart(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1, selectedColor = '', selectedSize = '' } = req.body;

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const colorVal = selectedColor || '';
    const sizeVal = selectedSize || '';

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_selectedColor_selectedSize: {
          cartId: cart.id,
          productId,
          selectedColor: colorVal,
          selectedSize: sizeVal
        }
      }
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          selectedColor: colorVal,
          selectedSize: sizeVal,
          quantity
        }
      });
    }

    res.status(201).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
}

export async function removeFromCart(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Can be CartItem.id or productId

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // Try deleting by CartItem id first
    const itemById = await prisma.cartItem.findFirst({
      where: { id, cartId: cart.id }
    });

    if (itemById) {
      await prisma.cartItem.delete({ where: { id: itemById.id } });
    } else {
      // Fallback to delete all cart items for this product
      await prisma.cartItem.deleteMany({
        where: { productId: id, cartId: cart.id }
      });
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
}
