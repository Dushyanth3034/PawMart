import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function getCategoryCounts(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    const formattedCounts = categories.map(cat => ({
      name: cat.name,
      slug: cat.slug,
      count: cat._count.products
    }));

    res.status(200).json({
      status: 'success',
      data: formattedCounts
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategories(req, res, next) {
  try {
    const { type } = req.query;
    let where = {};
    if (type === 'pet') {
      where = { isPetCategory: true };
    } else {
      where = { isPetCategory: false };
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        subcategories: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    next(error);
  }
}

export async function getBreeds(req, res, next) {
  try {
    const breeds = await prisma.dogBreed.findMany({
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      status: 'success',
      data: breeds
    });
  } catch (error) {
    next(error);
  }
}

export async function getAgeGroups(req, res, next) {
  try {
    const ageGroups = await prisma.dogAgeGroup.findMany({
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      status: 'success',
      data: ageGroups
    });
  } catch (error) {
    next(error);
  }
}
