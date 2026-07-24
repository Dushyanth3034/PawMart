import { z } from 'zod';

export const createPetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  breed: z.string().min(1, 'Breed is required'),
  birthday: z.string().transform((str) => new Date(str)),
  weight: z.number().positive('Weight must be a positive number'),
  vaccinations: z.array(z.string()).default([]),
  medicalHistory: z.array(z.string()).default([]),
  favoriteFood: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const updatePetSchema = createPetSchema.partial();
