import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const petCategories = [
  { name: 'Puppies', slug: 'puppies', description: 'Young puppies looking for a loving home' },
  { name: 'Adult Dogs', slug: 'adult-dogs', description: 'Fully grown dogs ready for companionship' },
  { name: 'Senior Dogs', slug: 'senior-dogs', description: 'Gentle senior dogs looking for a quiet retirement' },
  { name: 'Small Breeds', slug: 'small-breeds', description: 'Pocket-sized and small breed companions' },
  { name: 'Medium Breeds', slug: 'medium-breeds', description: 'Versatile and friendly medium breed dogs' },
  { name: 'Large Breeds', slug: 'large-breeds', description: 'Majestic and loyal large breed dogs' },
  { name: 'Pure Breeds', slug: 'pure-breeds', description: 'Vetted purebred dogs looking for homes' },
  { name: 'Mixed Breeds', slug: 'mixed-breeds', description: 'Unique and wonderful mixed-breed dogs' },
  { name: 'Rescue Dogs', slug: 'rescue-dogs', description: 'Dogs rescued from shelters and streets' },
  { name: 'Special Needs Dogs', slug: 'special-needs-dogs', description: 'Resilient dogs requiring extra care and love' },
  { name: 'Working Dogs', slug: 'working-dogs', description: 'Active dogs suitable for training and working roles' },
  { name: 'Companion Dogs', slug: 'companion-dogs', description: 'Affectionate and social dogs perfect for families' }
];

async function main() {
  console.log('Seeding pet categories...');
  for (const cat of petCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: cat.slug },
          { name: cat.name }
        ]
      }
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          isPetCategory: true,
          isActive: true
        }
      });
      console.log(`Created pet category: ${cat.name}`);
    } else {
      // Ensure existing is flagged as pet category if it exists
      await prisma.category.update({
        where: { id: existing.id },
        data: { isPetCategory: true }
      });
      console.log(`Updated existing category to pet category: ${cat.name}`);
    }
  }
  console.log('Pet categories seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding pet categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
