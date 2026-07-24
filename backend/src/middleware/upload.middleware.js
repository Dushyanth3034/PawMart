import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const profileUploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const productUploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
if (!fs.existsSync(productUploadDir)) {
  fs.mkdirSync(productUploadDir, { recursive: true });
}

// Set up storage for profiles
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profileUploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: <uuid>.<ext>
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter (JPG, JPEG, PNG, WEBP)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.'), false);
  }
};

export const uploadProfileImage = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max size
  },
  fileFilter: fileFilter
});

// Set up storage for products
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

export const uploadProductImages = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB per image
  },
  fileFilter: fileFilter
});

const reviewUploadDir = path.join(process.cwd(), 'public', 'uploads', 'reviews');
if (!fs.existsSync(reviewUploadDir)) {
  fs.mkdirSync(reviewUploadDir, { recursive: true });
}

const reviewStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, reviewUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

export const uploadReviewImages = multer({
  storage: reviewStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB per image
  },
  fileFilter: fileFilter
});

