/**
 * Quantity - Branded type for positive integers
 */

export type Quantity = number & { readonly __brand: 'Quantity' };

/**
 * Factory function to create a Quantity with validation
 */
export function createQuantity(value: number): Quantity {
  if (!Number.isInteger(value)) {
    throw new Error('Quantity must be an integer');
  }

  if (value < 1) {
    throw new Error('Quantity must be at least 1');
  }

  return value as Quantity;
}

/**
 * Type guard to check if a value is a valid Quantity
 */
export function isQuantity(value: unknown): value is Quantity {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
