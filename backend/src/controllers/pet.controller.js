import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { createPetSchema, updatePetSchema } from '../validators/pet.validator.js';

export async function createPet(req, res, next) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized. Please login.'));
    }

    const validatedData = createPetSchema.parse(req.body);

    const pet = await prisma.petProfile.create({
      data: {
        ...validatedData,
        ownerId: req.user.id,
      },
    });

    res.status(201).json({
      status: 'success',
      pet,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPets(req, res, next) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized. Please login.'));
    }

    const pets = await prisma.petProfile.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
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

export async function getPetById(req, res, next) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized. Please login.'));
    }

    const pet = await prisma.petProfile.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user.id,
      },
    });

    if (!pet) {
      return next(new AppError(404, 'Pet profile not found or access denied.'));
    }

    res.status(200).json({
      status: 'success',
      pet,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePet(req, res, next) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized. Please login.'));
    }

    const validatedData = updatePetSchema.parse(req.body);

    // Verify ownership first
    const petExists = await prisma.petProfile.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!petExists) {
      return next(new AppError(404, 'Pet profile not found or access denied.'));
    }

    const pet = await prisma.petProfile.update({
      where: { id: req.params.id },
      data: validatedData,
    });

    res.status(200).json({
      status: 'success',
      pet,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePet(req, res, next) {
  try {
    if (!req.user) {
      return next(new AppError(401, 'Unauthorized. Please login.'));
    }

    // Verify ownership
    const petExists = await prisma.petProfile.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!petExists) {
      return next(new AppError(404, 'Pet profile not found or access denied.'));
    }

    await prisma.petProfile.delete({
      where: { id: req.params.id },
    });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}
