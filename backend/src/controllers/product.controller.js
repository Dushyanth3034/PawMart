import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';
import fs from 'fs/promises';
import { getPlatformSettings } from '../config/platformSettings.js';

export async function createProduct(req, res, next) {
  try {
    const { 
      name, brand, categoryId, status, sku, shortDescription, description,
      price, originalPrice, discountPercent, gst, currency, promoCode, promoDiscount,
      weight, packageDimensions, shippingCharges, isFreeShipping, estimatedDeliveryDays,
      petType, breedCompatibility, ageGroup,
      seoTitle, seoDescription, searchKeywords,
      inventoryStock,
      images, // Array of strings (paths)
      variants, // Array of objects
      isPet, breed, gender, age, color, vaccinationStatus, healthStatus, medicalHistory, microchipNumber, location, documents, isSold, availability, listingType
    } = req.body;
    
    // Validate required fields
    if (!name || !categoryId || price === undefined || price === null || !images || images.length === 0) {
      return next(new AppError('Product name, categoryId, price, and at least one image are required', 400));
    }

    // Validate promo code & fixed discount
    let cleanPromoCode = null;
    let cleanPromoDiscount = null;

    if (promoCode !== undefined && promoCode !== null) {
      const str = String(promoCode).trim();
      if (str.length > 0) cleanPromoCode = str;
    }

    if (promoDiscount !== undefined && promoDiscount !== null && promoDiscount !== '') {
      const num = parseFloat(promoDiscount);
      if (!isNaN(num) && num > 0) cleanPromoDiscount = num;
      else if (!isNaN(num) && num < 0) return next(new AppError('Discount amount cannot be negative.', 400));
    }

    if (cleanPromoCode && !cleanPromoDiscount) {
      return next(new AppError('Please enter a discount amount.', 400));
    }
    if (cleanPromoDiscount && !cleanPromoCode) {
      return next(new AppError('Please enter a promo code.', 400));
    }
    if (cleanPromoDiscount && cleanPromoDiscount >= parseFloat(price)) {
      return next(new AppError('Discount amount cannot exceed the product price.', 400));
    }

    const isPetListing = isPet !== undefined ? !!isPet : false;
    const isAdoption = (listingType === 'ADOPTION');

    if (isPetListing && isAdoption) {
      const activeCount = await prisma.product.count({
        where: {
          sellerId: req.user.id,
          isPet: true,
          listingType: 'ADOPTION',
          status: 'ACTIVE'
        }
      });

      if (activeCount >= 1) {
        const unusedCreditCount = await prisma.providerListingPayment.count({
          where: {
            providerId: req.user.id,
            status: 'COMPLETED',
            listingCreditUsed: false
          }
        });

        if (unusedCreditCount < 1) {
          const settings = await getPlatformSettings();
          return next(new AppError(`You have already used your free pet listing. Publishing an additional pet listing requires a Premium Listing Fee of \u20b9${settings.premiumListingFee}.`, 400));
        }
      }
    }

    // Validate category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!categoryExists) {
      return next(new AppError('Invalid category selected. Category not found.', 404));
    }

    // Generate a simple slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const product = await prisma.$transaction(async (tx) => {
      // 1. Create Product
      const newProduct = await tx.product.create({
        data: {
          sellerId: req.user.id,
          categoryId,
          name,
          slug,
          brand,
          shortDescription,
          description,
          sku: sku || `SKU-${Date.now()}`,
          status: status || 'DRAFT',
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          discountPercent: discountPercent ? parseFloat(discountPercent) : null,
          gst: gst ? parseFloat(gst) : null,
          currency: currency || 'INR',
          promoCode: cleanPromoCode,
          promoDiscount: cleanPromoDiscount,
          weight: weight ? parseFloat(weight) : null,
          packageDimensions,
          shippingCharges: shippingCharges ? parseFloat(shippingCharges) : null,
          isFreeShipping: !!isFreeShipping,
          estimatedDeliveryDays: estimatedDeliveryDays ? parseInt(estimatedDeliveryDays) : null,
          petType: petType || [],
          breedCompatibility: breedCompatibility || [],
          ageGroup: ageGroup || [],
          seoTitle,
          seoDescription,
          searchKeywords: searchKeywords || [],
          isPet: isPet !== undefined ? !!isPet : false,
          breed,
          gender,
          age,
          color,
          vaccinationStatus,
          healthStatus,
          medicalHistory,
          microchipNumber,
          location,
          documents: documents || [],
          isSold: isSold !== undefined ? !!isSold : false,
          availability: availability !== undefined ? !!availability : true,
          listingType: listingType || 'SALE'
        }
      });

      // 2. Create Inventory
      if (inventoryStock !== undefined) {
        await tx.inventory.create({
          data: {
            productId: newProduct.id,
            quantity: parseInt(inventoryStock)
          }
        });
      }

      // 3. Create Images
      if (images && images.length > 0) {
        const imageRecords = images.map((url, index) => ({
          productId: newProduct.id,
          url,
          isPrimary: index === 0,
          order: index
        }));
        await tx.productImage.createMany({ data: imageRecords });
      }

      // 4. Create Variants
      if (variants && variants.length > 0) {
        const variantRecords = variants.map(v => ({
          productId: newProduct.id,
          type: v.type,
          value: v.value,
          price: v.price ? parseFloat(v.price) : null,
          stock: v.stock !== undefined ? parseInt(v.stock) : null,
          sku: v.sku || null
        }));
        await tx.productVariant.createMany({ data: variantRecords });
      }

      // Consume premium listing credit if applicable
      if (newProduct.isPet && newProduct.listingType === 'ADOPTION') {
        const activeCount = await tx.product.count({
          where: {
            sellerId: req.user.id,
            isPet: true,
            listingType: 'ADOPTION',
            status: 'ACTIVE',
            id: { not: newProduct.id }
          }
        });

        if (activeCount >= 1) {
          const firstUnusedCredit = await tx.providerListingPayment.findFirst({
            where: {
              providerId: req.user.id,
              status: 'COMPLETED',
              listingCreditUsed: false
            },
            orderBy: { createdAt: 'asc' }
          });

          if (!firstUnusedCredit) {
            const settings = await getPlatformSettings();
            throw new AppError(`No unused premium listing credit found. Please purchase a credit for \u20b9${settings.premiumListingFee}.`, 400);
          }

          await tx.providerListingPayment.update({
            where: { id: firstUnusedCredit.id },
            data: {
              listingCreditUsed: true,
              usedAt: new Date(),
              petId: newProduct.id
            }
          });
        }
      }

      return newProduct;
    });

    res.status(201).json({ status: 'success', data: product });
  } catch (error) { next(error); }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct || existingProduct.sellerId !== req.user.id) {
      return next(new AppError(404, 'Product not found or unauthorized'));
    }

    const { 
      name, brand, categoryId, status, sku, shortDescription, description,
      price, originalPrice, discountPercent, gst, currency, promoCode, promoDiscount,
      weight, packageDimensions, shippingCharges, isFreeShipping, estimatedDeliveryDays,
      petType, breedCompatibility, ageGroup,
      seoTitle, seoDescription, searchKeywords,
      inventoryStock,
      images,
      variants,
      isPet, breed, gender, age, color, vaccinationStatus, healthStatus, medicalHistory, microchipNumber, location, documents, isSold, availability, listingType
    } = req.body;

    // Validate required fields
    if (!name || !categoryId || price === undefined || price === null || !images || images.length === 0) {
      return next(new AppError('Product name, categoryId, price, and at least one image are required', 400));
    }

    // Validate promo code & fixed discount
    let cleanPromoCode = null;
    let cleanPromoDiscount = null;

    if (promoCode !== undefined && promoCode !== null) {
      const str = String(promoCode).trim();
      if (str.length > 0) cleanPromoCode = str;
    }

    if (promoDiscount !== undefined && promoDiscount !== null && promoDiscount !== '') {
      const num = parseFloat(promoDiscount);
      if (!isNaN(num) && num > 0) cleanPromoDiscount = num;
      else if (!isNaN(num) && num < 0) return next(new AppError('Discount amount cannot be negative.', 400));
    }

    if (cleanPromoCode && !cleanPromoDiscount) {
      return next(new AppError('Please enter a discount amount.', 400));
    }
    if (cleanPromoDiscount && !cleanPromoCode) {
      return next(new AppError('Please enter a promo code.', 400));
    }
    if (cleanPromoDiscount && cleanPromoDiscount >= parseFloat(price)) {
      return next(new AppError('Discount amount cannot exceed the product price.', 400));
    }
    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      if (!categoryExists) {
        return next(new AppError('Invalid category selected. Category not found.', 404));
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      // Update Product
      const updated = await tx.product.update({
        where: { id },
        data: {
          categoryId, name, brand, shortDescription, description, sku, status,
          price: price !== undefined ? parseFloat(price) : undefined,
          originalPrice: originalPrice !== undefined ? (originalPrice ? parseFloat(originalPrice) : null) : undefined,
          discountPercent: discountPercent !== undefined ? (discountPercent ? parseFloat(discountPercent) : null) : undefined,
          gst: gst !== undefined ? (gst ? parseFloat(gst) : null) : undefined,
          currency,
          promoCode: cleanPromoCode,
          promoDiscount: cleanPromoDiscount,
          weight: weight !== undefined ? (weight ? parseFloat(weight) : null) : undefined,
          packageDimensions,
          shippingCharges: shippingCharges !== undefined ? (shippingCharges ? parseFloat(shippingCharges) : null) : undefined,
          isFreeShipping,
          estimatedDeliveryDays: estimatedDeliveryDays !== undefined ? (estimatedDeliveryDays ? parseInt(estimatedDeliveryDays) : null) : undefined,
          petType, breedCompatibility, ageGroup,
          seoTitle, seoDescription, searchKeywords,
          isPet: isPet !== undefined ? !!isPet : undefined,
          breed: breed !== undefined ? breed : undefined,
          gender: gender !== undefined ? gender : undefined,
          age: age !== undefined ? age : undefined,
          color: color !== undefined ? color : undefined,
          vaccinationStatus: vaccinationStatus !== undefined ? vaccinationStatus : undefined,
          healthStatus: healthStatus !== undefined ? healthStatus : undefined,
          medicalHistory: medicalHistory !== undefined ? medicalHistory : undefined,
          microchipNumber: microchipNumber !== undefined ? microchipNumber : undefined,
          location: location !== undefined ? location : undefined,
          documents: documents !== undefined ? documents : undefined,
          isSold: isSold !== undefined ? !!isSold : undefined,
          availability: availability !== undefined ? !!availability : undefined,
          listingType: listingType !== undefined ? listingType : undefined
        }
      });

      // Update Inventory
      if (inventoryStock !== undefined) {
        await tx.inventory.upsert({
          where: { productId: id },
          update: { quantity: parseInt(inventoryStock) },
          create: { productId: id, quantity: parseInt(inventoryStock) }
        });
      }

      // Update Images (Replace all for simplicity)
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((url, index) => ({
              productId: id,
              url,
              isPrimary: index === 0,
              order: index
            }))
          });
        }
      }

      // Update Variants (Replace all for simplicity)
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map(v => ({
              productId: id,
              type: v.type,
              value: v.value,
              price: v.price ? parseFloat(v.price) : null,
              stock: v.stock !== undefined ? parseInt(v.stock) : null,
              sku: v.sku || null
            }))
          });
        }
      }

      return updated;
    });

    res.json({ status: 'success', data: product });
  } catch (error) { next(error); }
}

export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { orderItems: true }
    });
    
    if (!existingProduct || existingProduct.sellerId !== req.user.id) {
      return next(new AppError('Product not found or unauthorized', 404));
    }

    if (existingProduct.orderItems && existingProduct.orderItems.length > 0) {
      // Archive instead of delete to preserve order history
      await prisma.product.update({
        where: { id },
        data: { status: 'DRAFT' }
      });
      return res.status(200).json({
        status: 'success',
        message: 'This product has existing orders and cannot be permanently deleted. It has been archived instead.',
        action: 'ARCHIVED'
      });
    }

    // Permanently delete
    await prisma.product.delete({ where: { id } });
    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully.',
      action: 'DELETED'
    });
  } catch (error) { next(error); }
}

export async function uploadProductImagesEndpoint(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError(400, 'No images uploaded'));
    }

    if (req.files.length > 8) {
      // Clean up files
      await Promise.all(req.files.map(f => fs.unlink(f.path).catch(()=>{})));
      return next(new AppError(400, 'Maximum 8 images allowed'));
    }

    const imagePaths = req.files.map(f => `/uploads/products/${f.filename}`);

    res.status(201).json({ status: 'success', data: imagePaths });
  } catch (error) { 
    // Clean up files on error
    if (req.files) {
      await Promise.all(req.files.map(f => fs.unlink(f.path).catch(()=>{})));
    }
    next(error); 
  }
}
