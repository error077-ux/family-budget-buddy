/**
 * Format a number as Indian Rupee currency
 */
export const formatMoney = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '₹0.00';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format money with sign indicator
 */
export const formatMoneyWithSign = (amount: number): string => {
  const formatted = formatMoney(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted.replace('₹', '₹')}`;
  return formatted;
};

/**
 * Get CSS class for money display
 */
export const getMoneyClass = (amount: number): string => {
  if (amount > 0) return 'money-positive';
  if (amount < 0) return 'money-negative';
  return '';
};
