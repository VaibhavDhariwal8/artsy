/**
 * Formats a decimal value to have exactly 2 decimal places
 * @param value - The decimal value as a string
 * @returns Formatted decimal string with 2 decimal places
 */
export function formatDecimal(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}
