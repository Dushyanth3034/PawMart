/**
 * Formats a numeric value as Indian Rupees (INR).
 * @param {number|string} amount - The amount to format
 * @returns {string} - Formatted currency string (e.g. ₹1,299.00)
 */
export const formatCurrency = (amount) => {
  const numericAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numericAmount);
};
