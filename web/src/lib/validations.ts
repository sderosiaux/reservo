import { z } from 'zod';

/**
 * Validation schemas for frontend forms
 * Using Zod for type-safe runtime validation
 */

// Resource ID pattern: lowercase letters, numbers, and hyphens only
const RESOURCE_ID_PATTERN = /^[a-z0-9-]+$/;

// Valid resource types
export const RESOURCE_TYPES = ['room', 'seat', 'venue', 'desk', 'lab', 'studio'] as const;

/**
 * Create Resource form validation
 */
export const createResourceSchema = z.object({
  id: z
    .string()
    .min(3, 'ID doit contenir au moins 3 caractères')
    .max(50, 'ID ne doit pas dépasser 50 caractères')
    .regex(RESOURCE_ID_PATTERN, 'ID invalide (lettres minuscules, chiffres et tirets uniquement)'),
  type: z
    .string()
    .min(2, 'Type requis')
    .max(30, 'Type ne doit pas dépasser 30 caractères'),
  capacity: z
    .number({ error: 'Capacité doit être un nombre' })
    .int({ error: 'Capacité doit être un nombre entier' })
    .min(1, { error: 'Capacité minimum: 1' })
    .max(10000, { error: 'Capacité maximum: 10000' }),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;

/**
 * Create Reservation form validation
 */
export const createReservationSchema = z.object({
  resourceId: z
    .string()
    .min(1, 'Resource ID requis')
    .max(100, 'Resource ID trop long'),
  clientId: z
    .string()
    .min(1, 'Identifiant requis')
    .max(100, 'Identifiant trop long')
    .trim(),
  quantity: z
    .number({ error: 'Quantité doit être un nombre' })
    .int({ error: 'Quantité doit être un nombre entier' })
    .min(1, { error: 'Quantité minimum: 1' })
    .max(1000, { error: 'Quantité maximum: 1000' }),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

/**
 * Validation helper function
 * Returns either the validated data or an array of error messages
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => issue.message);
  return { success: false, errors };
}
