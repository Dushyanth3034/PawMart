import { prisma } from '../services/prisma.service.js';

const DEFAULT_SETTINGS = {
  platformCommissionRate: 10.0, // 10% (will divide by 100 in math calculations)
  premiumListingFee: 99.0,      // ₹99
  escrowConfirmationPeriod: 72, // 72 hours
  minWithdrawalAmount: 100.0    // ₹100
};

let cachedSettings = null;

export async function getPlatformSettings() {
  try {
    let settings = await prisma.platformSettings.findFirst();
    if (!settings) {
      // Safely create the default settings record inside a transaction or catch collision
      try {
        settings = await prisma.platformSettings.create({
          data: DEFAULT_SETTINGS
        });
      } catch (createErr) {
        // If query race condition, findFirst again
        settings = await prisma.platformSettings.findFirst();
        if (!settings) throw createErr;
      }
    }
    cachedSettings = settings;
    return settings;
  } catch (error) {
    console.error('[Platform Settings] Error reading settings from database:', error);
    // Return defaults if db query fails (fail-safe)
    return { id: 'fallback', ...DEFAULT_SETTINGS };
  }
}

export async function updatePlatformSettings(newSettings) {
  try {
    const current = await getPlatformSettings();
    const dataToUpdate = {};

    if (typeof newSettings.platformCommissionRate === 'number') {
      dataToUpdate.platformCommissionRate = newSettings.platformCommissionRate;
    }
    if (typeof newSettings.premiumListingFee === 'number') {
      dataToUpdate.premiumListingFee = newSettings.premiumListingFee;
    }
    if (typeof newSettings.escrowConfirmationPeriod === 'number') {
      dataToUpdate.escrowConfirmationPeriod = Math.floor(newSettings.escrowConfirmationPeriod);
    }
    if (typeof newSettings.minWithdrawalAmount === 'number') {
      dataToUpdate.minWithdrawalAmount = newSettings.minWithdrawalAmount;
    }

    const updated = await prisma.platformSettings.update({
      where: { id: current.id },
      data: dataToUpdate
    });
    cachedSettings = updated;
    return updated;
  } catch (error) {
    console.error('[Platform Settings] Error updating settings in database:', error);
    throw error;
  }
}
