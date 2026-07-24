import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function getAddresses(req, res, next) {
  try {
    const userId = req.user.id;
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.status(200).json({
      status: 'success',
      data: addresses
    });
  } catch (error) {
    next(error);
  }
}

export async function addAddress(req, res, next) {
  try {
    const userId = req.user.id;
    const { street, city, state, postalCode, country, isDefault } = req.body;

    if (!street || !city || !state || !postalCode || !country) {
      return next(new AppError(400, 'All address fields are required.'));
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    } else {
      // If no addresses exist, make this one default automatically
      const count = await prisma.address.count({ where: { userId } });
      if (count === 0) {
        req.body.isDefault = true;
      }
    }

    const address = await prisma.address.create({
      data: {
        userId,
        street,
        city,
        state,
        postalCode,
        country,
        isDefault: req.body.isDefault !== undefined ? req.body.isDefault : isDefault
      }
    });

    res.status(201).json({
      status: 'success',
      data: address
    });
  } catch (error) {
    next(error);
  }
}

export async function setDefaultAddress(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const address = await prisma.address.findFirst({
      where: { id, userId }
    });

    if (!address) {
      return next(new AppError(404, 'Address not found'));
    }

    // Unset all existing defaults
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });

    // Set the target address as default
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true }
    });

    res.status(200).json({
      status: 'success',
      data: updatedAddress
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const address = await prisma.address.findFirst({
      where: { id, userId }
    });

    if (!address) {
      return next(new AppError(404, 'Address not found'));
    }

    await prisma.address.delete({
      where: { id }
    });

    // If we deleted the default, set another one to default
    if (address.isDefault) {
      const remaining = await prisma.address.findFirst({
        where: { userId }
      });
      if (remaining) {
        await prisma.address.update({
          where: { id: remaining.id },
          data: { isDefault: true }
        });
      }
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
}
