/**
 * ResourceId - Branded type for resource identifiers
 */

export type ResourceId = string & { readonly __brand: 'ResourceId' };

const MAX_RESOURCE_ID_LENGTH = 100;

/**
 * Factory function to create a ResourceId with validation
 */
export function createResourceId(value: string): ResourceId {
  if (!value || value.trim().length === 0) {
    throw new Error('ResourceId cannot be empty');
  }

  if (value.length > MAX_RESOURCE_ID_LENGTH) {
    throw new Error(`ResourceId cannot exceed ${MAX_RESOURCE_ID_LENGTH} characters`);
  }

  return value as ResourceId;
}

/**
 * Type guard to check if a value is a ResourceId
 */
export function isResourceId(value: unknown): value is ResourceId {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_RESOURCE_ID_LENGTH;
}
