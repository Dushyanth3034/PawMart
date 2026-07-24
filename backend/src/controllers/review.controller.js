import { prisma } from '../services/prisma.service.js';
import { AppError } from '../middleware/error.middleware.js';

export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

export const checkReviewEligibility = async (req, res, next) => {
  try {
    const { productId, serviceId } = req.query;
    if (!productId && !serviceId) {
      return next(new AppError('Product ID or Service ID is required', 400));
    }

    // Must be logged in buyer
    if (req.user.role !== 'BUYER') {
      return res.status(200).json({ eligible: false, reason: 'Only buyers can submit reviews.' });
    }

    if (productId) {
      // Check if they already reviewed
      const existingReview = await prisma.review.findFirst({
        where: { productId, userId: req.user.id }
      });
      if (existingReview) {
        return res.status(200).json({ eligible: false, reason: 'You have already reviewed this product.' });
      }

      // Check if they purchased and received it
      const deliveredItem = await prisma.orderItem.findFirst({
        where: {
          productId,
          status: 'DELIVERED',
          order: { buyerId: req.user.id }
        }
      });

      if (!deliveredItem) {
        return res.status(200).json({ eligible: false, reason: 'Only verified buyers who have received this product can review it.' });
      }
    } else if (serviceId) {
      // Check if they already reviewed
      const existingReview = await prisma.review.findFirst({
        where: { serviceId, userId: req.user.id }
      });
      if (existingReview) {
        return res.status(200).json({ eligible: false, reason: 'You have already reviewed this service.' });
      }

      // Check if they had a completed appointment
      const completedApp = await prisma.appointment.findFirst({
        where: {
          serviceId,
          status: 'COMPLETED',
          buyerId: req.user.id
        }
      });

      if (!completedApp) {
        return res.status(200).json({ eligible: false, reason: 'Only buyers who have completed a booking for this service can review it.' });
      }
    }

    res.status(200).json({ eligible: true });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const { productId, serviceId, rating, comment, title } = req.body;

    if (!productId && !serviceId) {
      return next(new AppError('Product ID or Service ID is required', 400));
    }
    if (!rating || !comment) {
      return next(new AppError('Rating and comment are required', 400));
    }

    const numericRating = parseInt(rating, 10);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return next(new AppError('Rating must be an integer between 1 and 5', 400));
    }

    if (req.user.role !== 'BUYER') {
      return next(new AppError('Only buyers can submit reviews.', 403));
    }

    if (productId) {
      // Check if they already reviewed
      const existingReview = await prisma.review.findFirst({
        where: { productId, userId: req.user.id }
      });
      if (existingReview) {
        return next(new AppError('You have already submitted a review for this product.', 400));
      }

      // Verify delivery
      const deliveredItem = await prisma.orderItem.findFirst({
        where: {
          productId,
          status: 'DELIVERED',
          order: { buyerId: req.user.id }
        }
      });

      if (!deliveredItem) {
        return next(new AppError('You can only review products that have been delivered to you.', 403));
      }
    } else if (serviceId) {
      // Check if they already reviewed
      const existingReview = await prisma.review.findFirst({
        where: { serviceId, userId: req.user.id }
      });
      if (existingReview) {
        return next(new AppError('You have already submitted a review for this service.', 400));
      }

      // Verify completed appointment
      const completedApp = await prisma.appointment.findFirst({
        where: {
          serviceId,
          status: 'COMPLETED',
          buyerId: req.user.id
        }
      });

      if (!completedApp) {
        return next(new AppError('You can only review services for which you have a completed booking.', 403));
      }
    }

    // Handle review images
    const imageUrls = req.files ? req.files.map(f => `/uploads/reviews/${f.filename}`) : [];

    const review = await prisma.review.create({
      data: {
        productId: productId || null,
        serviceId: serviceId || null,
        userId: req.user.id,
        rating: numericRating,
        title: title || null,
        comment,
        images: imageUrls
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Update ratingAverage
    if (productId) {
      const reviews = await prisma.review.findMany({ where: { productId } });
      const ratingAverage = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await prisma.product.update({
        where: { id: productId },
        data: { ratingAverage }
      });

      // ─── Notify seller about new product review ─────────────────────────
      try {
        const product = await prisma.product.findUnique({ where: { id: productId }, select: { sellerId: true, name: true } });
        if (product?.sellerId) {
          const stars = '⭐'.repeat(numericRating);
          await prisma.notification.create({
            data: {
              userId: product.sellerId,
              type: 'REVIEW',
              title: '⭐ New Product Review',
              message: `${review.user.firstName} ${review.user.lastName} left a ${stars} review on "${product.name}": "${comment.slice(0, 80)}${comment.length > 80 ? '…' : ''}"`
            }
          });
        }
      } catch (notifErr) {
        console.error('[Notification] Failed to send review notification:', notifErr.message);
      }
    }

    res.status(201).json({
      status: 'success',
      data: review
    });

  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment, title } = req.body;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    if (review.userId !== req.user.id) {
      return next(new AppError('You are not authorized to update this review', 403));
    }

    const dataToUpdate = {};
    if (rating !== undefined) {
      const numericRating = parseInt(rating, 10);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return next(new AppError('Rating must be an integer between 1 and 5', 400));
      }
      dataToUpdate.rating = numericRating;
    }
    if (comment !== undefined) {
      dataToUpdate.comment = comment;
    }
    if (title !== undefined) {
      dataToUpdate.title = title || null;
    }

    // Append new review images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `/uploads/reviews/${f.filename}`);
      dataToUpdate.images = [...(review.images || []), ...newImages];
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Update ratingAverage
    if (review.productId) {
      const reviews = await prisma.review.findMany({ where: { productId: review.productId } });
      const ratingAverage = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await prisma.product.update({
        where: { id: review.productId },
        data: { ratingAverage }
      });
    }

    res.status(200).json({
      status: 'success',
      data: updatedReview
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    if (review.userId !== req.user.id) {
      return next(new AppError('You are not authorized to delete this review', 403));
    }

    await prisma.review.delete({ where: { id } });

    // Update ratingAverage
    if (review.productId) {
      const reviews = await prisma.review.findMany({ where: { productId: review.productId } });
      const ratingAverage = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0.0;
      await prisma.product.update({
        where: { id: review.productId },
        data: { ratingAverage }
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const replyToReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    const review = await prisma.review.findUnique({
      where: { id },
      include: { product: true, service: true }
    });

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    // Verify ownership: must be product owner or service provider
    const isProductSeller = review.product && review.product.sellerId === req.user.id;
    const isServiceProvider = review.service && review.service.providerId === req.user.id;

    if (!isProductSeller && !isServiceProvider && req.user.role !== 'ADMIN') {
      return next(new AppError('You are not authorized to reply to this review', 403));
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { reply: reply || null }
    });

    res.status(200).json({
      status: 'success',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
