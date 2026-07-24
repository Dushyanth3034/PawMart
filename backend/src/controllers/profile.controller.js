import { PrismaClient } from '@prisma/client';
import cloudinary from 'cloudinary';

const prisma = new PrismaClient();

// Configure Cloudinary (requires CLOUDINARY_URL in .env)
// If it fails, it will just throw when trying to upload.

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        avatarUrl: true,
        phone: true,
        dob: true,
        gender: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, dob, gender, preferences } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        phone,
        dob: dob ? new Date(dob) : null,
        gender,
        preferences: preferences ? preferences : undefined
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        avatarUrl: true,
        phone: true,
        dob: true,
        gender: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Prepare data URI from buffer
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
    
    let avatarUrl = dataURI; // Fallback to base64 string directly if Cloudinary is not configured

    try {
      if (process.env.CLOUDINARY_URL) {
        const uploadResponse = await cloudinary.v2.uploader.upload(dataURI, {
          folder: 'pawmart/avatars',
        });
        avatarUrl = uploadResponse.secure_url;
      }
    } catch (uploadError) {
      console.warn("Cloudinary upload failed (using base64 string fallback):", uploadError.message);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        avatarUrl: true,
        phone: true,
        dob: true,
        gender: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Server error uploading avatar' });
  }
};

export const deleteAvatar = async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        avatarUrl: true,
        phone: true,
        dob: true,
        gender: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ message: 'Server error deleting avatar' });
  }
};
