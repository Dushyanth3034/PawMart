import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: 'Dog Food & Nutrition',
    slug: 'dog-food-nutrition',
    description: 'Premium dry food, wet food, and diet formulas for dogs',
    subcategories: ['Dry Food', 'Wet Food', 'Puppy Food', 'Adult Food', 'Senior Food', 'Prescription Food', 'Organic Food']
  },
  {
    name: 'Dog Treats & Chews',
    slug: 'dog-treats-chews',
    description: 'Delicious biscuits, dental chews, jerky, and natural treats',
    subcategories: ['Biscuits', 'Dental Chews', 'Bones', 'Natural Chews', 'Jerky Treats']
  },
  {
    name: 'Dog Toys',
    slug: 'dog-toys',
    description: 'Durable chew toys, ropes, balls, and interactive puzzles',
    subcategories: ['Balls', 'Rope Toys', 'Chew Toys', 'Plush Toys', 'Interactive Toys', 'Puzzle Toys']
  },
  {
    name: 'Dog Beds & Furniture',
    slug: 'dog-beds-furniture',
    description: 'Cozy beds, cooling mats, blankets, crates, and houses',
    subcategories: ['Orthopedic Beds', 'Cooling Mats', 'Blankets', 'Cushions', 'Crates', 'Kennels']
  },
  {
    name: 'Dog Clothing',
    slug: 'dog-clothing',
    description: 'Stylish jackets, sweaters, raincoats, bandanas, and booties',
    subcategories: ['Hoodies', 'Jackets', 'Raincoats', 'Sweaters', 'Boots', 'Shoes', 'Bandanas']
  },
  {
    name: 'Dog Collars, Harnesses & Leashes',
    slug: 'dog-collars-harnesses-leashes',
    description: 'Strong collars, harness systems, leashes, and GPS tracking tags',
    subcategories: ['Standard Collars', 'Harnesses', 'Leashes', 'Retractable Leashes', 'GPS Collars', 'ID Tags']
  },
  {
    name: 'Dog Feeding Essentials',
    slug: 'dog-feeding-essentials',
    description: 'Bowls, slow feeders, automatic dispensers, and food storage',
    subcategories: ['Bowls', 'Water Bowls', 'Feeders', 'Water Fountains', 'Storage Containers']
  },
  {
    name: 'Dog Travel Accessories',
    slug: 'dog-travel-accessories',
    description: 'Travel carriers, safety seat covers, travel bowls, and strollers',
    subcategories: ['Carriers', 'Seat Covers', 'Travel Bags', 'Travel Bowls', 'Dog Strollers']
  },
  {
    name: 'Dog Cleaning & Hygiene Products',
    slug: 'dog-cleaning-hygiene-products',
    description: 'Shampoo, brushes, nail clippers, wipes, and poop disposal gear',
    subcategories: ['Shampoo', 'Conditioner', 'Towels', 'Brushes', 'Nail Clippers', 'Ear Cleaner', 'Paw Cleaner', 'Dog Wipes', 'Poop Bags']
  },
  {
    name: 'Dog Accessories',
    slug: 'dog-accessories',
    description: 'Custom name tags, bows, bandanas, and fun dog items',
    subcategories: ['Name Tags', 'Bells', 'Bow Ties', 'Hair Bows', 'Sunglasses']
  },
  {
    name: 'Seasonal Dog Products',
    slug: 'seasonal-dog-products',
    description: 'Weather essentials like heating pads and summer cooling gear',
    subcategories: ['Cooling Mats', 'Rain Gear', 'Winter Jackets', 'Heating Pads']
  }
];

const defaultBreeds = [
  'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Beagle', 'Pug',
  'Rottweiler', 'Doberman', 'Husky', 'Shih Tzu', 'Pomeranian',
  'Dachshund', 'Boxer', 'Great Dane', 'Border Collie', 'Spitz',
  'Indian Spitz', 'Mixed Breed', 'Other'
];

const defaultAgeGroups = ['Puppy', 'Adult', 'Senior'];

async function main() {
  console.log('Seeding database...');

  // 1. Seed Categories & Subcategories
  for (const cat of defaultCategories) {
    let category = await prisma.category.findUnique({
      where: { slug: cat.slug }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          isActive: true
        }
      });
      console.log(`Created category: ${cat.name}`);
    }

    for (const subName of cat.subcategories) {
      const subSlug = `${cat.slug}-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const subExists = await prisma.subcategory.findUnique({
        where: { slug: subSlug }
      });

      if (!subExists) {
        await prisma.subcategory.create({
          data: {
            categoryId: category.id,
            name: subName,
            slug: subSlug,
            isActive: true
          }
        });
        console.log(`  Created subcategory: ${subName}`);
      }
    }
  }

  // 2. Seed Dog Breeds
  for (const breedName of defaultBreeds) {
    const breedExists = await prisma.dogBreed.findUnique({
      where: { name: breedName }
    });

    if (!breedExists) {
      await prisma.dogBreed.create({
        data: {
          name: breedName,
          isActive: true
        }
      });
      console.log(`Created breed: ${breedName}`);
    }
  }

  // 3. Seed Dog Age Groups
  for (const ageName of defaultAgeGroups) {
    const ageExists = await prisma.dogAgeGroup.findUnique({
      where: { name: ageName }
    });

    if (!ageExists) {
      await prisma.dogAgeGroup.create({
        data: {
          name: ageName,
          isActive: true
        }
      });
      console.log(`Created age group: ${ageName}`);
    }
  }

  // 4. Seed Admin account if missing
  const adminEmail = 'admin@pawmart.com';
  const adminExists = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        isVerified: true
      }
    });
    console.log(`Created default Admin account: ${adminEmail}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
