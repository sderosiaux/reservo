import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getResources,
  getResource,
  createResource,
  getResourceReservations,
} from '@/lib/api';
import type { CreateResourceRequest } from '@/lib/types';

// Query keys for cache management
export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: () => resourceKeys.lists(),
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
  reservations: (id: string) => [...resourceKeys.detail(id), 'reservations'] as const,
};

/**
 * Fetch all resources
 */
export function useResources() {
  return useQuery({
    queryKey: resourceKeys.list(),
    queryFn: getResources,
  });
}

/**
 * Fetch a single resource by ID
 */
export function useResource(id: string) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn: () => getResource(id),
    enabled: !!id,
  });
}

/**
 * Fetch reservations for a resource
 */
export function useResourceReservations(resourceId: string) {
  return useQuery({
    queryKey: resourceKeys.reservations(resourceId),
    queryFn: () => getResourceReservations(resourceId),
    enabled: !!resourceId,
  });
}

/**
 * Create a new resource
 */
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResourceRequest) => createResource(data),
    onSuccess: (newResource) => {
      // Invalidate and refetch resources list
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      // Optionally, add the new resource to the cache directly
      queryClient.setQueryData(resourceKeys.detail(newResource.id), newResource);
    },
  });
}
