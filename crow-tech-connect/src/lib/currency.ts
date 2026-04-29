/**
 * Currency utility functions for Zambian Kwacha (ZMW)
 * All monetary values in the application should use these functions
 */

/**
 * Format a number as Zambian Kwacha currency
 * @param amount - The amount to format (number)
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "ZMW 1,250.00")
 */
export function formatCurrency(
  amount: number | null | undefined,
  options?: {
    showSymbol?: boolean;
    decimals?: number;
    locale?: string;
  }
): string {
  // Handle null, undefined, or NaN
  if (amount === null || amount === undefined || isNaN(amount)) {
    return options?.showSymbol !== false ? 'ZMW 0.00' : '0.00';
  }

  const showSymbol = options?.showSymbol !== false;
  const decimals = options?.decimals ?? 2;
  const locale = options?.locale ?? 'en-ZM'; // Zambian locale

  // Format the number with thousand separators and decimal places
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return showSymbol ? `ZMW ${formatted}` : formatted;
}

/**
 * Format currency for display in cards/components
 * Uses compact notation for large amounts
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrencyDisplay(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'ZMW 0.00';
  }

  // For amounts >= 1 million, use compact notation
  if (Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `ZMW ${millions.toFixed(2)}M`;
  }

  // For amounts >= 1 thousand, use compact notation
  if (Math.abs(amount) >= 1_000) {
    const thousands = amount / 1_000;
    return `ZMW ${thousands.toFixed(2)}K`;
  }

  return formatCurrency(amount);
}

/**
 * Parse a currency string back to a number
 * Handles ZMW prefix and various formats
 * @param currencyString - The currency string to parse
 * @returns The numeric value
 */
export function parseCurrency(currencyString: string): number {
  if (!currencyString) return 0;

  // Remove currency symbol and spaces
  const cleaned = currencyString
    .replace(/ZMW/gi, '')
    .replace(/K/gi, '')
    .replace(/M/gi, '')
    .replace(/,/g, '')
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert USD to ZMW (if needed)
 * Using approximate exchange rate: 1 USD = 18 ZMW (adjust as needed)
 */
export function usdToZmw(usdAmount: number): number {
  const exchangeRate = 18; // Update this with real-time rate if needed
  return usdAmount * exchangeRate;
}

