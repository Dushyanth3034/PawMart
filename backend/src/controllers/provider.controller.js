import { prisma } from '../services/prisma.service.js';
import { getPlatformSettings } from '../config/platformSettings.js';

export async function getProviderDashboardStats(req, res, next) {
  try {
    const providerId = req.user.id;
    const now = new Date();

    // 1. Pets Stats (Adoptions only, no sales)
    const pets = await prisma.product.findMany({
      where: { sellerId: providerId, isPet: true }
    });

    const totalPetsListed = pets.length;
    // Availability = true means available for adoption
    const availablePets = pets.filter(p => p.availability && p.status === 'ACTIVE').length;
    const activeListings = pets.filter(p => p.status === 'ACTIVE').length;
    const inactiveListings = pets.filter(p => p.status !== 'ACTIVE').length;

    // Adoption requests stats (Live metrics from AdoptionRequest table)
    const adoptionRequests = await prisma.adoptionRequest.findMany({
      where: {
        pet: { sellerId: providerId }
      }
    });

    const pendingAdoptionsCount = adoptionRequests.filter(r => r.status === 'PENDING').length;
    const completedAdoptionsCount = adoptionRequests.filter(r => r.status === 'COMPLETED').length;
    const scheduledMeetingsCount = adoptionRequests.filter(r => r.status === 'MEETING_SCHEDULED').length;

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todayMeetingsCount = adoptionRequests.filter(r => {
      if (r.status !== 'MEETING_SCHEDULED') return false;
      const mDate = new Date(r.preferredDate);
      return mDate >= startOfToday && mDate < startOfTomorrow;
    }).length;

    // 2. Services Stats
    const services = await prisma.service.findMany({
      where: { providerId }
    });

    const totalServices = services.length;
    const activeServices = services.filter(s => s.status === 'ACTIVE').length;
    const inactiveServices = services.filter(s => s.status !== 'ACTIVE').length;

    // 3. Appointments Stats (Services only)
    const appointments = await prisma.appointment.findMany({
      where: { providerId },
      include: { service: true, pet: true, buyer: true }
    });

    const todayBookingsCount = appointments.filter(a => {
      const aDate = new Date(a.date);
      return aDate >= startOfToday && aDate < startOfTomorrow;
    }).length;

    const upcomingBookingsCount = appointments.filter(a => {
      const aDate = new Date(a.date);
      return aDate >= startOfToday && ['PENDING', 'ACCEPTED', 'CONFIRMED'].includes(a.status);
    }).length;

    const completedBookingsCount = appointments.filter(a => a.status === 'COMPLETED').length;
    const cancelledBookingsCount = appointments.filter(a => a.status === 'CANCELLED').length;

    // 4. Premium Listing Payments
    const listingPayments = await prisma.providerListingPayment.findMany({
      where: {
        providerId,
        status: 'COMPLETED'
      }
    });

    // 5. Revenue Calculations (Service Bookings Only)
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let weeklyRevenue = 0;
    let todayRevenue = 0;
    let yearlyRevenue = 0;

    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Sum service revenue (completed appointments)
    appointments.forEach(a => {
      if (a.status === 'COMPLETED' && a.service) {
        const rev = a.service.price;
        totalRevenue += rev;

        const aDate = new Date(a.date);
        if (aDate >= startOfToday) todayRevenue += rev;
        if (aDate >= startOfWeek) weeklyRevenue += rev;
        if (aDate >= startOfMonth) monthlyRevenue += rev;
        if (aDate >= startOfYear) yearlyRevenue += rev;
      }
    });

    // 6. Customers Stats (Services + Adoptions)
    const customerIds = new Set();
    appointments.forEach(a => {
      if (a.buyerId) customerIds.add(a.buyerId);
    });
    adoptionRequests.forEach(r => {
      if (r.buyerId) customerIds.add(r.buyerId);
    });

    const totalCustomers = customerIds.size;
    const returningCustomers = 0;

    // 7. Ratings and Reviews
    const productIds = pets.map(p => p.id);
    const serviceIds = services.map(s => s.id);
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { serviceId: { in: serviceIds } }
        ]
      },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? parseFloat((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1))
      : 5.0;

    // 8. Sales Trend for chart (Week, Month, Year)
    const weekMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      weekMap[key] = { date: key, label: d.toLocaleDateString(undefined, { weekday: 'short' }), revenue: 0, bookings: 0 };
    }

    const monthMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      monthMap[key] = { date: key, label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), revenue: 0, bookings: 0 };
    }

    const yearMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      yearMap[key] = { date: key, label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), revenue: 0, bookings: 0 };
    }

    // Populate charts from service appointments (Completed)
    appointments.forEach(a => {
      if (a.status === 'COMPLETED' && a.service) {
        const rev = a.service.price;
        const dStr = new Date(a.date).toISOString().split('T')[0];
        const mStr = `${new Date(a.date).getFullYear()}-${String(new Date(a.date).getMonth() + 1).padStart(2, '0')}`;

        if (weekMap[dStr]) {
          weekMap[dStr].revenue += rev;
          weekMap[dStr].bookings += 1;
        }
        if (monthMap[dStr]) {
          monthMap[dStr].revenue += rev;
          monthMap[dStr].bookings += 1;
        }
        if (yearMap[mStr]) {
          yearMap[mStr].revenue += rev;
          yearMap[mStr].bookings += 1;
        }
      }
    });



    const weekTrend = Object.keys(weekMap).sort().map(k => weekMap[k]);
    const monthTrend = Object.keys(monthMap).sort().map(k => monthMap[k]);
    const yearTrend = Object.keys(yearMap).sort().map(k => yearMap[k]);

    const salesTrend = { week: weekTrend, month: monthTrend, year: yearTrend };

    const serviceBookings = {};
    appointments.forEach(a => {
      if (a.service?.name) {
        serviceBookings[a.service.name] = (serviceBookings[a.service.name] || 0) + 1;
      }
    });
    const topPerformingService = Object.keys(serviceBookings).length
      ? Object.keys(serviceBookings).reduce((a, b) => serviceBookings[a] > serviceBookings[b] ? a : b)
      : 'N/A';

    // Calculate Top Selling Breed from Listed Pets
    const breedsCount = {};
    pets.forEach(p => {
      if (p.breed) breedsCount[p.breed] = (breedsCount[p.breed] || 0) + 1;
    });
    const topSellingBreed = Object.keys(breedsCount).length
      ? Object.keys(breedsCount).reduce((a, b) => breedsCount[a] > breedsCount[b] ? a : b)
      : 'N/A';

    // Generate recent listing payments (informational only)
    const recentListingPayments = listingPayments.map(p => ({
      id: p.id,
      transactionId: p.transactionId || p.id.slice(0, 8).toUpperCase(),
      paymentDate: p.paymentDate || p.createdAt,
      amount: p.amount,
      paymentMethod: p.paymentMethod || 'Razorpay',
      status: p.status
    })).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 10);

    const totalListingFeesPaid = listingPayments.reduce((acc, p) => acc + p.amount, 0);
    const premiumListingsPurchasedCount = listingPayments.length;

    // Escrow Metrics calculations
    const escrowAppointments = appointments.filter(a => a.providerAmount > 0);
    
    const heldPayments = escrowAppointments
      .filter(a => a.paymentStatus === 'HELD')
      .reduce((acc, a) => acc + a.providerAmount, 0);

    const pendingConfirmations = escrowAppointments
      .filter(a => a.bookingStatus === 'AWAITING_CUSTOMER_CONFIRMATION').length;

    // Fetch all payouts for this provider
    const dbPayouts = await prisma.payoutHistory.findMany({
      where: { sellerId: providerId }
    });

    const upcomingPayouts = dbPayouts
      .filter(p => p.status === 'PENDING_PAYMENT')
      .reduce((acc, p) => acc + p.amount, 0);

    const releasedPayments = escrowAppointments
      .filter(a => a.paymentStatus === 'RELEASED')
      .reduce((acc, a) => acc + a.providerAmount, 0);

    const refundedPayments = escrowAppointments
      .filter(a => a.paymentStatus === 'REFUNDED')
      .reduce((acc, a) => acc + a.providerAmount, 0);

    const disputedPayments = escrowAppointments
      .filter(a => a.paymentStatus === 'ON_HOLD')
      .reduce((acc, a) => acc + a.providerAmount, 0);

    const totalEarnings = releasedPayments;

    const platformCommission = escrowAppointments
      .filter(a => a.paymentStatus === 'RELEASED')
      .reduce((acc, a) => acc + a.commissionAmount, 0);

    // Fetch recent transaction logs
    const dbTransactions = await prisma.paymentTransaction.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const recentTransactionsData = dbTransactions.map(tx => ({
      id: tx.id,
      transactionId: tx.transactionReference || tx.id.slice(0, 8).toUpperCase(),
      paymentDate: tx.createdAt,
      amount: tx.grossAmount,
      paymentMethod: tx.paymentMethod,
      status: tx.paymentStatus,
      type: tx.transactionType === 'PAYMENT' ? 'Payment Received' : tx.transactionType === 'REFUND' ? 'Refund Processed' : 'Payout'
    }));

    const recentPayoutsData = dbPayouts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        date: p.paymentDate || p.createdAt,
        transactionId: p.transactionId || 'N/A'
      }));

    // Generate recent unified transactions list (Service Bookings only)
    const recentTransactions = appointments
      .filter(a => a.status === 'COMPLETED' && a.service)
      .map(a => ({
        id: a.id,
        transactionId: `TXN_${a.id.slice(0, 8).toUpperCase()}`,
        paymentDate: a.date,
        amount: a.service.price,
        paymentMethod: 'Clinic Cash',
        status: 'COMPLETED',
        type: 'Service Fee'
      })).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 10);

    // Generate completed appointments list
    const completedAppointments = appointments
      .filter(a => a.status === 'COMPLETED')
      .map(a => ({
        id: a.id,
        ownerName: a.buyer ? `${a.buyer.firstName} ${a.buyer.lastName}` : 'N/A',
        serviceName: a.service?.name || (a.pet?.name ? `${a.pet.name} (Adoption Meeting)` : 'Pet Adoption Meeting'),
        date: a.date,
        time: `${a.startTime} - ${a.endTime}`,
        status: a.status
      })).slice(0, 10);

    res.json({
      status: 'success',
      data: {
        totalPetsListed, availablePets, activeListings, inactiveListings,
        pendingAdoptionsCount, todayMeetingsCount, scheduledMeetingsCount, completedAdoptionsCount,
        totalServices, activeServices, inactiveServices,
        todayBookings: todayBookingsCount, upcomingBookings: upcomingBookingsCount,
        completedBookings: completedBookingsCount, cancelledBookings: cancelledBookingsCount,
        todayRevenue, weeklyRevenue, monthlyRevenue, yearlyRevenue, totalRevenue,
        totalCustomers, returningCustomers, averageRating, reviewCount,
        recentReviews: reviews.slice(0, 5),
        recentBookings: appointments.slice(0, 5).map(a => ({
          id: a.id, petName: a.dogName || a.pet?.name || 'Dog', ownerName: a.buyer ? `${a.buyer.firstName} ${a.buyer.lastName}` : 'N/A',
          serviceName: a.service?.name, time: `${a.startTime} - ${a.endTime}`, date: a.date, status: a.status
        })),
        topSellingBreed, topPerformingService,
        salesTrend,
        recentTransactions,
        completedAppointments,
        totalListingFeesPaid,
        premiumListingsPurchasedCount,
        recentListingPayments,
        heldPayments,
        pendingConfirmations,
        upcomingPayouts,
        releasedPayments,
        refundedPayments,
        disputedPayments,
        totalEarnings,
        platformCommission,
        recentEscrowTransactions: recentTransactionsData,
        recentPayouts: recentPayoutsData,
        revenueGrowth: 12.5, bookingGrowth: 8.2, customerGrowth: 5.0,
        averageResponseTime: '15m'
      }
    });
  } catch (error) { next(error); }
}

export async function getProviderPets(req, res, next) {
  try {
    const pets = await prisma.product.findMany({
      where: { sellerId: req.user.id, isPet: true },
      include: { images: true, category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: pets });
  } catch (error) { next(error); }
}

export async function getProviderServices(req, res, next) {
  try {
    const targetDateStr = req.query.date || new Date().toISOString().split('T')[0];
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

    const services = await prisma.service.findMany({
      where: { providerId: req.user.id },
      include: { 
        reviews: true,
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const servicesWithSlots = services.map(s => {
      const morningBooked = s.appointments.filter(a => a.selectedSession === 'morning').length;
      const afternoonBooked = s.appointments.filter(a => a.selectedSession === 'afternoon').length;

      const morningRemaining = Math.max(0, s.morningCapacity - morningBooked);
      const afternoonRemaining = Math.max(0, s.afternoonCapacity - afternoonBooked);

      const { appointments, ...cleanService } = s;

      return {
        ...cleanService,
        morningBooked,
        morningRemaining,
        afternoonBooked,
        afternoonRemaining
      };
    });

    res.json({ status: 'success', data: servicesWithSlots });
  } catch (error) { next(error); }
}

export async function createProviderService(req, res, next) {
  try {
    const { name, description, price, duration, category, discountPercent, gst, images, availableDays, timeSlots, capacity, status, homeVisit, clinicVisit, online, offline, cancellationPolicy, location, maxBookings, prepInstructions, requirements, morningStartTime, morningEndTime, morningCapacity, afternoonStartTime, afternoonEndTime, afternoonCapacity } = req.body;
    const service = await prisma.service.create({
      data: {
        providerId: req.user.id,
        name, description, price: parseFloat(price), duration: parseInt(duration, 10), category,
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        gst: gst ? parseFloat(gst) : null,
        images: images || [],
        availableDays: availableDays || [],
        timeSlots: timeSlots || [],
        capacity: capacity ? parseInt(capacity, 10) : 1,
        status: status || 'ACTIVE',
        homeVisit: !!homeVisit,
        clinicVisit: !!clinicVisit,
        online: !!online,
        offline: !!offline,
        cancellationPolicy, location,
        maxBookings: maxBookings ? parseInt(maxBookings, 10) : null,
        prepInstructions, requirements,
        morningStartTime: morningStartTime || '09:00',
        morningEndTime: morningEndTime || '13:00',
        morningCapacity: morningCapacity ? parseInt(morningCapacity, 10) : 5,
        afternoonStartTime: afternoonStartTime || '14:00',
        afternoonEndTime: afternoonEndTime || '18:00',
        afternoonCapacity: afternoonCapacity ? parseInt(afternoonCapacity, 10) : 5
      }
    });
    res.status(201).json({ status: 'success', data: service });
  } catch (error) { next(error); }
}

export async function updateProviderService(req, res, next) {
  try {
    const { name, description, price, duration, category, discountPercent, gst, images, availableDays, timeSlots, capacity, status, homeVisit, clinicVisit, online, offline, cancellationPolicy, location, maxBookings, prepInstructions, requirements, morningStartTime, morningEndTime, morningCapacity, afternoonStartTime, afternoonEndTime, afternoonCapacity } = req.body;
    const service = await prisma.service.update({
      where: { id: req.params.id, providerId: req.user.id },
      data: {
        name, description, price: price !== undefined ? parseFloat(price) : undefined, duration: duration !== undefined ? parseInt(duration, 10) : undefined, category,
        discountPercent: discountPercent !== undefined ? parseFloat(discountPercent) : undefined,
        gst: gst !== undefined ? parseFloat(gst) : undefined,
        images: images || [],
        availableDays: availableDays || [],
        timeSlots: timeSlots || [],
        capacity: capacity !== undefined ? parseInt(capacity, 10) : undefined,
        status: status || undefined,
        homeVisit: homeVisit !== undefined ? !!homeVisit : undefined,
        clinicVisit: clinicVisit !== undefined ? !!clinicVisit : undefined,
        online: online !== undefined ? !!online : undefined,
        offline: offline !== undefined ? !!offline : undefined,
        cancellationPolicy, location,
        maxBookings: maxBookings !== undefined ? parseInt(maxBookings, 10) : undefined,
        prepInstructions, requirements,
        morningStartTime: morningStartTime || undefined,
        morningEndTime: morningEndTime || undefined,
        morningCapacity: morningCapacity !== undefined ? parseInt(morningCapacity, 10) : undefined,
        afternoonStartTime: afternoonStartTime || undefined,
        afternoonEndTime: afternoonEndTime || undefined,
        afternoonCapacity: afternoonCapacity !== undefined ? parseInt(afternoonCapacity, 10) : undefined
      }
    });
    res.json({ status: 'success', data: service });
  } catch (error) { next(error); }
}

export async function deleteProviderService(req, res, next) {
  try {
    await prisma.service.delete({
      where: { id: req.params.id, providerId: req.user.id }
    });
    res.json({ status: 'success', message: 'Service deleted successfully' });
  } catch (error) { next(error); }
}

export async function getProviderBookings(req, res, next) {
  try {
    const providerId = req.user.id;

    // 1. Fetch all appointments where providerId = providerId
    const appointments = await prisma.appointment.findMany({
      where: { providerId },
      include: {
        service: true,
        pet: true,
        buyer: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } }
      },
      orderBy: { date: 'desc' }
    });

    // 2. Fetch all adoption requests where pet.sellerId = providerId
    const adoptionRequests = await prisma.adoptionRequest.findMany({
      where: {
        pet: { sellerId: providerId }
      },
      include: {
        pet: true,
        buyer: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Merge them ensuring no duplicates
    const combinedBookings = [];
    const processedAdoptionRequestIds = new Set();

    // Process appointments
    appointments.forEach(a => {
      let petName = a.pet?.name;
      let petBreed = a.pet?.breed;
      let notes = a.notes;
      let contactDetails = a.buyer ? `Phone: ${a.buyer.phone || 'N/A'}, Email: ${a.buyer.email || 'N/A'}` : 'N/A';
      let adoptionStatus = null;

      if (a.adoptionRequestId) {
        processedAdoptionRequestIds.add(a.adoptionRequestId);
        const matchingRequest = adoptionRequests.find(r => r.id === a.adoptionRequestId);
        if (matchingRequest) {
          petName = matchingRequest.pet?.name;
          petBreed = matchingRequest.pet?.breed;
          notes = matchingRequest.notes || matchingRequest.reason;
          contactDetails = `Phone: ${matchingRequest.phone || 'N/A'}, Email: ${matchingRequest.email || 'N/A'}`;
          adoptionStatus = matchingRequest.status;
        }
      }

      combinedBookings.push({
        id: a.id,
        buyer: a.buyer,
        pet: a.pet || (a.adoptionRequestId ? { name: petName, breed: petBreed } : (a.dogName ? { name: a.dogName, breed: a.dogBreed || 'N/A' } : null)),
        service: a.service,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        adoptionStatus: adoptionStatus,
        contactDetails,
        notes: a.adoptionRequestId ? notes : `Age: ${a.dogAgeCategory || 'N/A'}. Allergies: ${a.dogAllergies || 'None'}. Medical: ${a.dogConditions || 'None'}. Vaccinated: ${a.dogVaccinated || 'N/A'}. Notes: ${notes || 'None'}`,
        type: a.adoptionRequestId ? 'ADOPTION' : 'SERVICE',
        adoptionRequestId: a.adoptionRequestId
      });
    });

    // Process legacy/desynced adoption requests
    adoptionRequests.forEach(r => {
      if (!processedAdoptionRequestIds.has(r.id)) {
        let bookingStatus = 'PENDING';
        if (r.status === 'MEETING_SCHEDULED') bookingStatus = 'CONFIRMED';
        else if (r.status === 'MEETING_COMPLETED' || r.status === 'COMPLETED' || r.status === 'APPROVED') bookingStatus = 'COMPLETED';
        else if (r.status === 'REJECTED') bookingStatus = 'REJECTED';
        else if (r.status === 'CANCELLED') bookingStatus = 'CANCELLED';

        combinedBookings.push({
          id: `legacy-${r.id}`,
          buyer: r.buyer,
          pet: r.pet,
          service: null,
          date: r.preferredDate,
          startTime: r.preferredTime,
          endTime: r.preferredTime,
          status: bookingStatus,
          adoptionStatus: r.status,
          contactDetails: `Phone: ${r.phone || 'N/A'}, Email: ${r.email || 'N/A'}`,
          notes: r.notes || r.reason,
          type: 'ADOPTION',
          adoptionRequestId: r.id
        });
      }
    });

    res.json({ status: 'success', data: combinedBookings });
  } catch (error) { next(error); }
}

export async function getProviderCustomers(req, res, next) {
  try {
    const providerId = req.user.id;

    // 1. Fetch appointments
    const appointments = await prisma.appointment.findMany({
      where: { providerId },
      include: { buyer: true, service: true }
    });

    // 2. Fetch all completed/active adoption requests for this provider
    const adoptionRequests = await prisma.adoptionRequest.findMany({
      where: { pet: { sellerId: providerId } },
      include: { buyer: true, pet: true }
    });

    // 3. Fetch pet sales for legacy/other support
    const petSales = await prisma.orderItem.findMany({
      where: { product: { sellerId: providerId, isPet: true } },
      include: { order: { include: { buyer: true } } }
    });

    const customersMap = {};

    const initCustomer = (buyer, fallbackDate) => {
      const id = buyer.id;
      if (!customersMap[id]) {
        customersMap[id] = {
          id,
          name: `${buyer.firstName} ${buyer.lastName}`,
          email: buyer.email,
          phone: buyer.phone || 'N/A',
          bookings: 0,
          pets: 0, // Completed Pet Adoptions count displayed in frontend
          revenue: 0,
          lastVisit: fallbackDate,
          createdAt: buyer.createdAt || fallbackDate
        };
      }
    };

    // Process appointments
    appointments.forEach(a => {
      if (a.buyer) {
        initCustomer(a.buyer, a.date);
        const id = a.buyer.id;
        customersMap[id].bookings += 1;
        if (a.status === 'COMPLETED' && a.service) {
          customersMap[id].revenue += a.service.price;
        }
        if (new Date(a.date) > new Date(customersMap[id].lastVisit)) {
          customersMap[id].lastVisit = a.date;
        }
        if (customersMap[id].createdAt && new Date(customersMap[id].createdAt) > new Date(a.buyer.createdAt || a.date)) {
          customersMap[id].createdAt = a.buyer.createdAt || a.date;
        }
      }
    });

    // Process adoptions
    adoptionRequests.forEach(ar => {
      if (ar.buyer) {
        initCustomer(ar.buyer, ar.createdAt);
        const id = ar.buyer.id;
        if (ar.status === 'COMPLETED') {
          customersMap[id].pets += 1;
        }
        if (new Date(ar.createdAt) > new Date(customersMap[id].lastVisit)) {
          customersMap[id].lastVisit = ar.createdAt;
        }
        if (customersMap[id].createdAt && new Date(customersMap[id].createdAt) > new Date(ar.buyer.createdAt || ar.createdAt)) {
          customersMap[id].createdAt = ar.buyer.createdAt || ar.createdAt;
        }
      }
    });

    // Process pet sales
    petSales.forEach(s => {
      if (s.order?.buyer) {
        initCustomer(s.order.buyer, s.order.createdAt);
        const id = s.order.buyer.id;
        // Keep legacy sales behavior if needed
        if (s.status !== 'CANCELLED') {
          customersMap[id].revenue += s.price * s.quantity;
        }
        if (new Date(s.order.createdAt) > new Date(customersMap[id].lastVisit)) {
          customersMap[id].lastVisit = s.order.createdAt;
        }
        if (customersMap[id].createdAt && new Date(customersMap[id].createdAt) > new Date(s.order.buyer.createdAt || s.order.createdAt)) {
          customersMap[id].createdAt = s.order.buyer.createdAt || s.order.createdAt;
        }
      }
    });

    res.json({ status: 'success', data: Object.values(customersMap) });
  } catch (error) { next(error); }
}

export async function getProviderReviews(req, res, next) {
  try {
    const providerId = req.user.id;
    const pets = await prisma.product.findMany({ where: { sellerId: providerId, isPet: true }, select: { id: true } });
    const services = await prisma.service.findMany({ where: { providerId }, select: { id: true } });

    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { productId: { in: pets.map(p => p.id) } },
          { serviceId: { in: services.map(s => s.id) } }
        ]
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        product: { select: { name: true } },
        service: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ status: 'success', data: reviews });
  } catch (error) { next(error); }
}

export async function getProviderProfile(req, res, next) {
  try {
    let profile = await prisma.providerStoreProfile.findUnique({
      where: { providerId: req.user.id }
    });
    if (!profile) {
      profile = await prisma.providerStoreProfile.create({
        data: { providerId: req.user.id, businessName: `${req.user.firstName}'s Care Clinic` }
      });
    }

    const unusedCreditCount = await prisma.providerListingPayment.count({
      where: {
        providerId: req.user.id,
        status: 'COMPLETED',
        listingCreditUsed: false
      }
    });

    res.json({ 
      status: 'success', 
      data: {
        ...profile,
        unusedCreditCount
      } 
    });
  } catch (error) { next(error); }
}

export async function updateProviderProfile(req, res, next) {
  try {
    const { firstName, lastName, phone, businessName, storeLogo, storeBanner, description, contactNumber, website, facebook, instagram, linkedin, clinicDetails, workingHours, businessAddress, gstNumber, certificates, experience, licenseNumber, bankDetails, emergencyContact } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update User
      await tx.user.update({
        where: { id: req.user.id },
        data: {
          firstName: firstName !== undefined ? firstName : undefined,
          lastName: lastName !== undefined ? lastName : undefined,
          phone: phone !== undefined ? phone : undefined,
        }
      });

      // 2. Update ProviderStoreProfile
      const updatedProfile = await tx.providerStoreProfile.upsert({
        where: { providerId: req.user.id },
        update: {
          businessName: businessName !== undefined ? businessName : undefined,
          storeLogo: storeLogo !== undefined ? storeLogo : undefined,
          storeBanner: storeBanner !== undefined ? storeBanner : undefined,
          description: description !== undefined ? description : undefined,
          contactNumber: contactNumber !== undefined ? contactNumber : undefined,
          website: website !== undefined ? website : undefined,
          facebook: facebook !== undefined ? facebook : undefined,
          instagram: instagram !== undefined ? instagram : undefined,
          linkedin: linkedin !== undefined ? linkedin : undefined,
          clinicDetails: clinicDetails !== undefined ? clinicDetails : undefined,
          workingHours: workingHours !== undefined ? workingHours : undefined,
          businessAddress: businessAddress !== undefined ? businessAddress : undefined,
          gstNumber: gstNumber !== undefined ? gstNumber : undefined,
          certificates: certificates !== undefined ? certificates : undefined,
          experience: experience !== undefined ? parseInt(experience, 10) : undefined,
          licenseNumber: licenseNumber !== undefined ? licenseNumber : undefined,
          bankDetails: bankDetails !== undefined ? bankDetails : undefined,
          emergencyContact: emergencyContact !== undefined ? emergencyContact : undefined,
        },
        create: {
          providerId: req.user.id,
          businessName: businessName || `${req.user.firstName}'s Care Clinic`,
          storeLogo, storeBanner, description, contactNumber, website, facebook, instagram, linkedin,
          clinicDetails, workingHours, businessAddress, gstNumber, certificates: certificates || [],
          experience: experience ? parseInt(experience, 10) : null,
          licenseNumber, bankDetails, emergencyContact
        }
      });

      return updatedProfile;
    });

    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
}

export async function uploadProviderStoreImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'fail', message: 'No image uploaded' });
    }

    const { type } = req.body;
    if (!['logo', 'banner'].includes(type)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid image type' });
    }

    const imagePath = `/uploads/profiles/${req.file.filename}`;
    res.json({ status: 'success', data: { imagePath } });
  } catch (error) { next(error); }
}

export async function getProviderNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: notifications });
  } catch (error) { next(error); }
}

export async function getProviderAdoptionRequests(req, res, next) {
  try {
    const providerId = req.user.id;
    const requests = await prisma.adoptionRequest.findMany({
      where: {
        pet: { sellerId: providerId }
      },
      include: {
        pet: true,
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ status: 'success', data: requests });
  } catch (error) { next(error); }
}

export async function updateAdoptionRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, preferredDate, preferredTime, rescheduleReason } = req.body;
    const providerId = req.user.id;

    const request = await prisma.adoptionRequest.findFirst({
      where: { id },
      include: {
        pet: {
          include: {
            seller: {
              include: {
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

    if (request.pet.sellerId !== providerId) {
      return res.status(403).json({ status: 'fail', message: 'Unauthorized modification' });
    }

    const updateData = { status };
    
    // Reschedule flow handler
    if (preferredDate) {
      updateData.preferredDate = new Date(preferredDate);
    }
    if (preferredTime) {
      updateData.preferredTime = preferredTime;
    }
    if (rescheduleReason !== undefined) {
      updateData.rescheduleReason = rescheduleReason;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. If status is COMPLETED, set pet availability to false and isSold to true
      if (status === 'COMPLETED') {
        await tx.product.update({
          where: { id: request.petId },
          data: {
            availability: false,
            isSold: true,
            status: 'OUT_OF_STOCK'
          }
        });
      }

      // 2. Update AdoptionRequest
      const reqUpdated = await tx.adoptionRequest.update({
        where: { id },
        data: updateData
      });

      // 3. Update Appointment
      const appointment = await tx.appointment.findUnique({
        where: { adoptionRequestId: id }
      });
      if (appointment) {
        let appStatus = 'PENDING';
        if (status === 'MEETING_SCHEDULED') appStatus = 'ACCEPTED';
        else if (status === 'MEETING_COMPLETED' || status === 'COMPLETED') appStatus = 'COMPLETED';
        else if (status === 'APPROVED') appStatus = 'CONFIRMED';
        else if (status === 'REJECTED') appStatus = 'REJECTED';
        else if (status === 'CANCELLED') appStatus = 'CANCELLED';
        else if (status === 'VISIT_CENTER') appStatus = 'CONFIRMED';

        const updateAppDate = {};
        if (preferredDate) updateAppDate.date = new Date(preferredDate);
        if (preferredTime) {
          updateAppDate.startTime = preferredTime;
          updateAppDate.endTime = preferredTime;
        }

        await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            status: appStatus,
            ...updateAppDate
          }
        });
      }

      return reqUpdated;
    });

    // Send notification to buyer
    let title = 'Adoption Application Status Update';
    let message = `Your application status for ${request.pet.name} has changed to ${status}.`;

    if (status === 'MEETING_SCHEDULED') {
      const formattedDate = preferredDate ? new Date(preferredDate).toLocaleDateString() : new Date(request.preferredDate).toLocaleDateString();
      const formattedTime = preferredTime || request.preferredTime;
      title = 'Meeting Scheduled';
      message = `Your meeting request for ${request.pet.name} has been scheduled for ${formattedDate} at ${formattedTime}.`;
    } else if (status === 'PENDING' && rescheduleReason) {
      // Rescheduled notification
      const formattedDate = preferredDate ? new Date(preferredDate).toLocaleDateString() : new Date(request.preferredDate).toLocaleDateString();
      const formattedTime = preferredTime || request.preferredTime;
      title = 'Meeting Rescheduled';
      message = `The provider has requested to reschedule your meeting for ${formattedDate} at ${formattedTime}. Reason: ${rescheduleReason}`;
    } else if (status === 'REJECTED') {
      title = 'Adoption Application Declined';
      message = `Unfortunately, your application for ${request.pet.name} was not approved.`;
    } else if (status === 'MEETING_COMPLETED') {
      title = 'Meeting Completed';
      message = `Your meeting for ${request.pet.name} was marked completed. We are reviewing your application.`;
    } else if (status === 'APPROVED') {
      title = 'Adoption Approved! 🎉';
      const address = request.pet.seller.providerProfile?.businessAddress || 'our clinic';
      message = `Congratulations! Your application for ${request.pet.name} has been approved. Please visit the adoption center at ${address} to complete the visit.`;
    } else if (status === 'VISIT_CENTER') {
      title = 'Visit Adoption Center';
      const address = request.pet.seller.providerProfile?.businessAddress || 'our clinic';
      message = `Please visit our adoption center at ${address} to finalize the adoption.`;
    } else if (status === 'COMPLETED') {
      title = 'Adoption Completed! 🐾';
      message = `${request.pet.name} is officially yours! Thank you for adopting and giving them a loving home.`;
    } else if (status === 'CANCELLED') {
      title = 'Adoption Meeting Cancelled';
      message = `Your adoption meeting for ${request.pet.name} has been cancelled.`;
    }

    await prisma.notification.create({
      data: {
        userId: request.buyerId,
        title,
        message
      }
    });

    res.json({ status: 'success', data: updated });
  } catch (error) { next(error); }
}

export async function createPremiumPayment(req, res, next) {
  try {
    const providerId = req.user.id;

    const settings = await getPlatformSettings();

    const payment = await prisma.providerListingPayment.create({
      data: {
        providerId,
        amount: settings.premiumListingFee,
        status: 'COMPLETED',
        paymentMethod: 'UPI',
        paymentGateway: 'Razorpay',
        razorpayOrderId: `order_mock_${Date.now()}`,
        razorpayPaymentId: `pay_mock_${Date.now()}`,
        transactionId: `txn_mock_${Date.now()}`,
        currency: 'INR',
        paymentDate: new Date(),
        listingCreditUsed: false
      }
    });

    res.status(201).json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    next(error);
  }
}
