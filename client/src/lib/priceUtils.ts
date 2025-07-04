/**
 * Formats a price value to display with 2 decimal places
 * @param price - The price as a string or number
 * @returns Formatted price string with 2 decimal places
 */
export function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '0.00';
  return numPrice.toFixed(2);
}

/**
 * Formats a price value for display with currency symbol
 * @param price - The price as a string or number
 * @param currency - Currency symbol (default: '$')
 * @returns Formatted price string with currency and 2 decimal places
 */
export function formatCurrency(price: string | number, currency: string = '$'): string {
  return `${currency}${formatPrice(price)}`;
}
