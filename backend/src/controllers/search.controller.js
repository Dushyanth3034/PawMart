import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const searchProducts = async (req, res) => {
  try {
    const { q = '', category } = req.query;

    const queryConditions = [
      {
        OR: [
          { status: 'ACTIVE' },
          { status: 'OUT_OF_STOCK' }
        ]
      }
    ];

    if (q) {
      queryConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { name: { contains: q, mode: 'insensitive' } } }
        ]
      });
    }

    if (category && (category.toLowerCase() === 'pets' || category.toLowerCase() === 'pets-for-sale' || category.toLowerCase() === 'pets for sale')) {
      queryConditions.push({ isPet: true, listingType: 'SALE' });
    } else {
      queryConditions.push({ isPet: false });
      if (category && category !== 'all') {
        queryConditions.push({ category: { name: { equals: category, mode: 'insensitive' } } });
      }
    }

    const where = queryConditions.length > 0 ? { AND: queryConditions } : {};

    const products = await prisma.product.findMany({
      where,
      take: 50, // Limit results
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            providerProfile: true
          }
        },
        category: true,
        inventory: true
      }
    });

    const cleanProducts = products.map(p => {
      if (p.isPet && p.seller) {
        const publicName = p.seller.providerProfile?.businessName || p.seller.providerProfile?.clinicName || 'Adoption Clinic';
        p.seller.firstName = publicName;
        p.seller.lastName = '';
      }
      return p;
    });

    res.json(cleanProducts);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Server error searching products' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { 
        id: req.params.id,
        status: { in: ['ACTIVE', 'OUT_OF_STOCK'] }
      },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        seller: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true,
            storeProfile: true,
            providerProfile: true
          }
        },
        category: true,
        variants: true,
        inventory: true
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.isPet && product.seller) {
      const publicName = product.seller.providerProfile?.businessName || product.seller.providerProfile?.clinicName || 'Adoption Clinic';
      product.seller.firstName = publicName;
      product.seller.lastName = '';
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ message: 'Server error fetching product' });
  }
};

export const searchPets = async (req, res) => {
  try {
    const { q = '' } = req.query;

    const queryConditions = [];
    if (q) {
      queryConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { breed: { contains: q, mode: 'insensitive' } },
        ]
      });
    }

    const where = {
      isPet: true,
      listingType: 'ADOPTION',
      status: 'ACTIVE',
      ...(queryConditions.length > 0 ? { AND: queryConditions } : {})
    };

    const products = await prisma.product.findMany({
      where,
      take: 20,
      include: {
        images: { take: 1 },
        seller: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true,
            providerProfile: true 
          }
        }
      }
    });

    const pets = products.map(p => {
      const publicName = p.seller?.providerProfile?.businessName || p.seller?.providerProfile?.clinicName || 'Adoption Clinic';
      const clinicAddress = p.seller?.providerProfile?.businessAddress 
        ? `${p.seller.providerProfile.businessAddress}, ${p.seller.providerProfile.city || ''}`.replace(/,\s*$/, '')
        : (p.location || 'Adoption Center');

      const cleanSeller = p.seller ? {
        ...p.seller,
        firstName: publicName,
        lastName: ''
      } : null;

      return {
        id: p.id,
        name: p.name,
        breed: p.breed || 'Unknown Breed',
        gender: p.gender || 'MALE',
        age: p.age || 'Puppy',
        weight: p.weight || 5,
        location: clinicAddress,
        imageUrl: p.images?.[0]?.url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800',
        owner: cleanSeller,
        price: p.price,
        healthStatus: p.healthStatus,
        vaccinationStatus: p.vaccinationStatus,
        availability: p.availability,
        status: p.status
      };
    });

    res.json(pets);
  } catch (error) {
    console.error('Error searching pets:', error);
    res.status(500).json({ message: 'Server error searching pets' });
  }
};

export const searchServices = async (req, res) => {
  try {
    const { q = '', category, date } = req.query;

    const targetDateStr = date || new Date().toISOString().split('T')[0];
    let startOfTarget, endOfTarget;
    if (typeof targetDateStr === 'string' && targetDateStr.includes('-')) {
      const parts = targetDateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      startOfTarget = new Date(y, m, d, 0, 0, 0, 0);
      endOfTarget = new Date(y, m, d, 23, 59, 59, 999);
    } else {
      const targetDate = new Date(targetDateStr);
      startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      endOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    }

    const queryConditions = [];
    if (q) {
      queryConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
        ]
      });
    }

    if (category && category !== 'all' && category !== 'ALL') {
      queryConditions.push({ category: category });
    }

    const where = queryConditions.length > 0 ? { AND: queryConditions } : {};

    const services = await prisma.service.findMany({
      where,
      take: 20,
      include: {
        provider: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true,
            providerProfile: true 
          }
        },
        appointments: {
          where: {
            date: {
              gte: startOfTarget,
              lte: endOfTarget
            },
            status: {
              notIn: ['CANCELLED', 'REJECTED', 'REFUNDED']
            }
          }
        },
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    const cleanServices = services.map(s => {
      const publicName = s.provider?.providerProfile?.businessName || s.provider?.providerProfile?.clinicName || 'Pet Care Clinic';
      const cleanProvider = s.provider ? {
        ...s.provider,
        firstName: publicName,
        lastName: ''
      } : null;

      const morningBooked = s.appointments.filter(a => a.selectedSession === 'morning').length;
      const afternoonBooked = s.appointments.filter(a => a.selectedSession === 'afternoon').length;

      const morningRemaining = Math.max(0, s.morningCapacity - morningBooked);
      const afternoonRemaining = Math.max(0, s.afternoonCapacity - afternoonBooked);

      const { appointments, ...cleanService } = s;

      return {
        ...cleanService,
        provider: cleanProvider,
        morningBooked,
        morningRemaining,
        afternoonBooked,
        afternoonRemaining
      };
    });

    res.json(cleanServices);
  } catch (error) {
    console.error('Error searching services:', error);
    res.status(500).json({ message: 'Server error searching services' });
  }
};

export const getServiceCategories = async (req, res) => {
  try {
    let categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    if (categories.length === 0) {
      const seedData = [
        { name: 'Grooming', slug: 'GROOMING', description: 'Dog bathing, hair trimming, and styling', sortOrder: 1 },
        { name: 'Training', slug: 'TRAINING', description: 'Obedience, behavioral, and agility training', sortOrder: 2 },
        { name: 'Veterinary', slug: 'VET', description: 'Clinical treatments, diagnostics, and checkups', sortOrder: 3 },
        { name: 'Vaccination', slug: 'VACCINATION', description: 'Immunizations and preventive vaccine schedules', sortOrder: 4 },
        { name: 'Health Checkup', slug: 'HEALTH_CHECKUP', description: 'General well-being and health screenings', sortOrder: 5 },
        { name: 'Boarding', slug: 'BOARDING', description: 'Overnight stay and clinic boarding services', sortOrder: 6 },
        { name: 'Walking', slug: 'WALKING', description: 'Daily dog walking and exercise routines', sortOrder: 7 },
        { name: 'Pet Sitting', slug: 'PET_SITTING', description: 'Daytime sitting and home care companionship', sortOrder: 8 },
        { name: 'Emergency Care', slug: 'EMERGENCY_CARE', description: 'Urgent clinical triage and emergency procedures', sortOrder: 9 },
        { name: 'Other', slug: 'OTHER', description: 'Miscellaneous custom pet clinic services', sortOrder: 10 }
      ];

      await prisma.serviceCategory.createMany({
        data: seedData
      });

      categories = await prisma.serviceCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      });
    }

    res.json(categories);
  } catch (error) {
    console.error('Error fetching service categories:', error);
    res.status(500).json({ message: 'Server error fetching service categories' });
  }
};
