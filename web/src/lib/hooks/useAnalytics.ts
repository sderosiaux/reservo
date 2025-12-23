import { useQuery } from '@tanstack/react-query';
import { getAnalytics, getClients } from '@/lib/api';

// Query keys for cache management
export const analyticsKeys = {
  all: ['analytics'] as const,
  metrics: () => [...analyticsKeys.all, 'metrics'] as const,
};

export const clientKeys = {
  all: ['clients'] as const,
  list: () => [...clientKeys.all, 'list'] as const,
};

/**
 * Fetch analytics data
 */
export function useAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.metrics(),
    queryFn: getAnalytics,
    // Analytics can be slightly stale
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch clients list
 */
export function useClients() {
  return useQuery({
    queryKey: clientKeys.list(),
    queryFn: getClients,
  });
}
