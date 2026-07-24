import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function getUserProfile(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return next(new AppError(404, 'User not found'));
    }

    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserPets(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return next(new AppError(404, 'User not found'));
    }

    // Return the user's pet profiles
    const pets = await prisma.petProfile.findMany({
      where: { 
        ownerId: id,
        visibility: 'PRIVATE'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: pets.length,
      pets,
    });
  } catch (error) {
    next(error);
  }
}
