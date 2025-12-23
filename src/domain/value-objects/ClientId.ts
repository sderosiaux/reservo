/**
 * ClientId - Branded type for client identifiers
 *
 * Includes input sanitization to prevent XSS and injection attacks
 */

export type ClientId = string & { readonly __brand: 'ClientId' };

const MAX_CLIENT_ID_LENGTH = 100;

// Allowed characters: alphanumeric, dots, underscores, hyphens, @ for emails
const CLIENT_ID_PATTERN = /^[a-zA-Z0-9._@-]+$/;

/**
 * Sanitize input by removing potentially dangerous characters
 */
function sanitizeInput(value: string): string {
  return value
    .trim()
    .replace(/[<>'"&\\]/g, '') // Remove HTML/SQL dangerous chars
    .slice(0, MAX_CLIENT_ID_LENGTH);
}

/**
 * Factory function to create a ClientId with validation and sanitization
 */
export function createClientId(value: string): ClientId {
  if (!value || value.trim().length === 0) {
    throw new Error('ClientId cannot be empty');
  }

  // Check length before sanitization to provide clear error message
  if (value.trim().length > MAX_CLIENT_ID_LENGTH) {
    throw new Error(`ClientId cannot exceed ${MAX_CLIENT_ID_LENGTH} characters`);
  }

  const sanitized = sanitizeInput(value);

  if (sanitized.length === 0) {
    throw new Error('ClientId contains only invalid characters');
  }

  if (!CLIENT_ID_PATTERN.test(sanitized)) {
    throw new Error('ClientId contains invalid characters. Only alphanumeric, dots, underscores, hyphens, and @ are allowed');
  }

  if (sanitized.length > MAX_CLIENT_ID_LENGTH) {
    throw new Error(`ClientId cannot exceed ${MAX_CLIENT_ID_LENGTH} characters`);
  }

  return sanitized as ClientId;
}

/**
 * Type guard to check if a value is a ClientId
 */
export function isClientId(value: unknown): value is ClientId {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_CLIENT_ID_LENGTH &&
    CLIENT_ID_PATTERN.test(value)
  );
}
