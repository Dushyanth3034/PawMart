import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';

export async function getWishlist(req, res, next) {
  try {
    const buyerId = req.user.id;
    const wishlist = await prisma.wishlist.findMany({
      where: { buyerId },
      include: { 
        product: {
          include: { images: true }
        },
        pet: true
      }
    });

    res.status(200).json({
      status: 'success',
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleWishlist(req, res, next) {
  try {
    const { productId, id, name, price, image, category, breed, age, location } = req.body;
    const buyerId = req.user.id;
    
    // For products, productId is sent. For pets, id is sent.
    const targetId = productId || id;
    
    if (category === 'adoption') {
      // Handle Adoption Pet
      let pet = await prisma.petProfile.findUnique({
        where: { id: targetId }
      });
      
      if (!pet) {
        let shelter = await prisma.user.findFirst({ where: { role: 'SELLER' } });
        if (!shelter) {
          shelter = await prisma.user.create({
            data: {
              email: `shelter_${Date.now()}@pawmart.com`,
              passwordHash: '$2b$10$dummy',
              firstName: 'System',
              lastName: 'Shelter',
              role: 'SELLER'
            }
          });
        }
        
        pet = await prisma.petProfile.create({
          data: {
            id: targetId,
            ownerId: shelter.id,
            name: name || 'Unknown Rescue',
            breed: breed || 'Mixed Breed',
            imageUrl: image || null,
            birthday: new Date(),
            weight: 0.0,
            vaccinations: [],
            medicalHistory: [],
            favoriteFood: null
          }
        });
      }
      
      const existing = await prisma.wishlist.findUnique({
        where: {
          buyerId_productId_petId: {
            buyerId,
            productId: '',
            petId: pet.id
          }
        }
      }).catch(async () => {
         // Because productId and petId are nullable, findUnique might fail or not match correctly.
         // Let's use findFirst
         return await prisma.wishlist.findFirst({
           where: { buyerId, petId: pet.id }
         });
      });
      
      const existingPetWishlist = await prisma.wishlist.findFirst({
        where: { buyerId, petId: pet.id }
      });

      if (existingPetWishlist) {
        await prisma.wishlist.delete({ where: { id: existingPetWishlist.id } });
        return res.status(200).json({ status: 'success', action: 'removed' });
      } else {
        await prisma.wishlist.create({
          data: {
            buyerId,
            itemType: 'PET',
            petId: pet.id
          }
        });
        return res.status(200).json({ status: 'success', action: 'added' });
      }
    }

    // 1. Ensure product exists in DB to satisfy foreign key constraints
    let product = await prisma.product.findUnique({ 
      where: { id: productId },
      include: { images: true }
    });

    if (!product) {
      // Find a default seller to attach this dummy product to
      let seller = await prisma.user.findFirst({ where: { role: 'SELLER' } });
      if (!seller) {
        return next(new AppError('Product not found and no active seller available.', 404));
      }

      // Find or create category
      const catSlug = category || 'uncategorized';
      let dbCat = await prisma.category.findUnique({ where: { slug: catSlug } });
      if (!dbCat) {
        dbCat = await prisma.category.create({
          data: {
            name: catSlug.charAt(0).toUpperCase() + catSlug.slice(1),
            slug: catSlug
          }
        });
      }

      // Create dummy product
      product = await prisma.product.create({
        data: {
          id: productId,
          name: name || 'Mock Product',
          slug: `${productId}-slug`,
          description: 'Auto-generated product for wishlist satisfaction',
          price: price || 0,
          categoryId: dbCat.id,
          sellerId: seller.id,
          images: image ? {
            create: { url: image }
          } : undefined
        }
      });
    } else if (product.images.length === 0 && image) {
      // Retroactively add image if it was missing from a previous run
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: image
        }
      });
    }

    // 2. Check if it's already in wishlist (for product)
    const existing = await prisma.wishlist.findFirst({
      where: {
        buyerId,
        productId: product.id
      }
    });

    if (existing) {
      // Remove
      await prisma.wishlist.delete({
        where: { id: existing.id }
      });
      return res.status(200).json({ status: 'success', action: 'removed' });
    } else {
      // Add
      await prisma.wishlist.create({
        data: {
          buyerId,
          itemType: 'PRODUCT',
          productId: product.id
        }
      });
      return res.status(200).json({ status: 'success', action: 'added' });
    }
  } catch (error) {
    next(error);
  }
}
