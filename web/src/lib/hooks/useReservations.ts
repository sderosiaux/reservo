import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReservations,
  getReservation,
  createReservation,
  cancelReservation,
} from '@/lib/api';
import type { CreateReservationRequest } from '@/lib/types';
import { resourceKeys } from './useResources';

// Query keys for cache management
export const reservationKeys = {
  all: ['reservations'] as const,
  lists: () => [...reservationKeys.all, 'list'] as const,
  list: (filters?: { resourceId?: string; status?: string }) =>
    [...reservationKeys.lists(), filters] as const,
  details: () => [...reservationKeys.all, 'detail'] as const,
  detail: (id: string) => [...reservationKeys.details(), id] as const,
};

/**
 * Fetch reservations with optional filters
 */
export function useReservations(filters?: { resourceId?: string; status?: string }) {
  return useQuery({
    queryKey: reservationKeys.list(filters),
    queryFn: () => getReservations(filters),
  });
}

/**
 * Fetch a single reservation by ID
 */
export function useReservation(id: string) {
  return useQuery({
    queryKey: reservationKeys.detail(id),
    queryFn: () => getReservation(id),
    enabled: !!id,
  });
}

/**
 * Create a new reservation
 */
export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReservationRequest) => createReservation(data),
    onSuccess: (response, variables) => {
      // Invalidate reservations list
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
      // Invalidate the resource's reservations
      queryClient.invalidateQueries({
        queryKey: resourceKeys.reservations(variables.resourceId),
      });
      // Invalidate resource details (currentBookings changed)
      queryClient.invalidateQueries({
        queryKey: resourceKeys.detail(variables.resourceId),
      });
    },
  });
}

/**
 * Cancel a reservation
 */
export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: (cancelledReservation) => {
      // Invalidate reservations list
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
      // Invalidate the resource's reservations
      queryClient.invalidateQueries({
        queryKey: resourceKeys.reservations(cancelledReservation.resourceId),
      });
      // Update the single reservation in cache
      queryClient.setQueryData(
        reservationKeys.detail(cancelledReservation.id),
        cancelledReservation
      );
      // Invalidate resource details (currentBookings changed)
      queryClient.invalidateQueries({
        queryKey: resourceKeys.detail(cancelledReservation.resourceId),
      });
    },
  });
}
