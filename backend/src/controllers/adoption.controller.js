import { prisma } from '../services/prisma.service.js';

export async function getAdoptionListings(req, res, next) {
  try {
    const { q = '', sellerId, breed, excludeId, limit = 20 } = req.query;

    const queryConditions = [];
    if (q) {
      queryConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { breed: { contains: q, mode: 'insensitive' } },
        ]
      });
    }

    if (breed) {
      queryConditions.push({ breed: { equals: breed, mode: 'insensitive' } });
    }

    if (excludeId) {
      queryConditions.push({ id: { not: excludeId } });
    }

    const where = {
      isPet: true,
      listingType: 'ADOPTION',
      status: 'ACTIVE',
      ...(sellerId ? { sellerId } : {}),
      ...(queryConditions.length > 0 ? { AND: queryConditions } : {})
    };

    const products = await prisma.product.findMany({
      where,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' },
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

    // Map product structure to the AdoptionPage expected structure
    const adoptions = products.map(p => {
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

    res.json(adoptions);
  } catch (error) {
    console.error('Error fetching adoption listings:', error);
    res.status(500).json({ message: 'Server error fetching adoption listings' });
  }
}

export async function createAdoptionRequest(req, res, next) {
  try {
    const { petId, fullName, email, phone, preferredDate, preferredTime, reason, notes } = req.body;
    const buyerId = req.user.id;

    if (!petId || !fullName || !email || !phone || !preferredDate || !preferredTime) {
      return res.status(400).json({ status: 'fail', message: 'Missing required request parameters' });
    }

    const pet = await prisma.product.findFirst({
      where: { id: petId, isPet: true, listingType: 'ADOPTION' }
    });

    if (!pet) {
      return res.status(404).json({ status: 'fail', message: 'Pet listing not found or not available for adoption' });
    }

    // Check duplicate request (mandatory improvement)
    const existing = await prisma.adoptionRequest.findUnique({
      where: {
        buyerId_petId: { buyerId, petId }
      }
    });

    if (existing) {
      return res.status(400).json({ status: 'fail', message: 'You have already submitted an adoption request for this pet.' });
    }

    const parsedDate = new Date(preferredDate);

    const request = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.adoptionRequest.create({
        data: {
          buyerId,
          petId,
          fullName,
          email,
          phone,
          preferredDate: parsedDate,
          preferredTime,
          reason,
          notes,
          status: 'PENDING'
        }
      });

      await tx.appointment.create({
        data: {
          buyerId,
          providerId: pet.sellerId,
          date: parsedDate,
          startTime: preferredTime,
          endTime: preferredTime,
          status: 'PENDING',
          adoptionRequestId: newRequest.id
        }
      });

      return newRequest;
    });

    // Notify provider immediately
    await prisma.notification.create({
      data: {
        userId: pet.sellerId,
        title: 'New Adoption Request',
        message: `${fullName} has submitted an adoption request for ${pet.name}.`
      }
    });

    res.status(201).json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
}

export async function getBuyerAdoptionRequests(req, res, next) {
  try {
    const requests = await prisma.adoptionRequest.findMany({
      where: { buyerId: req.user.id },
      include: {
        pet: {
          include: {
            images: { take: 1 },
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                providerProfile: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const cleanRequests = requests.map(r => {
      if (r.pet?.seller) {
        const publicName = r.pet.seller.providerProfile?.businessName || r.pet.seller.providerProfile?.clinicName || 'Adoption Clinic';
        r.pet.seller.firstName = publicName;
        r.pet.seller.lastName = '';
      }
      return r;
    });

    res.json({ status: 'success', data: cleanRequests });
  } catch (error) {
    next(error);
  }
}

export async function getBuyerAdoptionRequestDetails(req, res, next) {
  try {
    const request = await prisma.adoptionRequest.findFirst({
      where: { id: req.params.id, buyerId: req.user.id },
      include: {
        pet: {
          include: {
            images: true,
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                providerProfile: true
              }
            }
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ status: 'fail', message: 'Adoption request not found' });
    }

    if (request.pet?.seller) {
      const publicName = request.pet.seller.providerProfile?.businessName || request.pet.seller.providerProfile?.clinicName || 'Adoption Clinic';
      request.pet.seller.firstName = publicName;
      request.pet.seller.lastName = '';
    }

    res.json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
}

export async function cancelAdoptionRequest(req, res, next) {
  try {
    const { id } = req.params;
    const buyerId = req.user.id;

    const request = await prisma.adoptionRequest.findFirst({
      where: { id, buyerId }
    });

    if (!request) {
      return res.status(404).json({ status: 'fail', message: 'Adoption request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ status: 'fail', message: 'Adoption applications can only be cancelled while they are pending approval' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.adoptionRequest.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      await tx.appointment.updateMany({
        where: { adoptionRequestId: id },
        data: { status: 'CANCELLED' }
      });

      return reqUpdated;
    });

    // Notify provider
    const pet = await prisma.product.findUnique({
      where: { id: request.petId },
      select: { sellerId: true, name: true }
    });

    if (pet) {
      await prisma.notification.create({
        data: {
          userId: pet.sellerId,
          title: 'Adoption Request Cancelled',
          message: `${request.fullName} has cancelled their adoption request for ${pet.name}.`
        }
      });
    }

    res.json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
}
