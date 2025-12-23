import type {
  Resource,
  ResourceAvailability,
  Reservation,
  CreateReservationRequest,
  ReservationResponse,
  CreateResourceRequest,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Normalize timestamps to numbers throughout an object
 */
function normalizeTimestamps<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(normalizeTimestamps) as T;
  }

  const result = { ...obj } as Record<string, unknown>;
  for (const key in result) {
    if (key === 'serverTimestamp' || key === 'createdAt' || key === 'updatedAt') {
      const value = result[key];
      if (typeof value === 'string') {
        result[key] = parseInt(value, 10);
      }
    } else if (typeof result[key] === 'object') {
      result[key] = normalizeTimestamps(result[key]);
    }
  }
  return result as T;
}

/**
 * Normalize reservation status to lowercase (recursively)
 */
function normalizeStatus<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(normalizeStatus) as T;
  }

  const result = { ...obj } as Record<string, unknown>;
  for (const key in result) {
    if (key === 'status' && typeof result[key] === 'string') {
      result[key] = (result[key] as string).toLowerCase();
    } else if (typeof result[key] === 'object') {
      result[key] = normalizeStatus(result[key]);
    }
  }
  return result as T;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      if (!response.ok) {
        throw new ApiError(
          response.status,
          `Server error: ${response.statusText || 'Invalid JSON response'}`
        );
      }
      throw new ApiError(500, 'Invalid JSON response from server');
    }

    if (!response.ok) {
      throw new ApiError(response.status, data.error || data.message || 'Request failed');
    }

    // Normalize timestamps and status for consistency
    return normalizeStatus(normalizeTimestamps(data)) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors, CORS, etc.
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
  }
}

// Pagination response wrapper
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Resources
export async function getResources(): Promise<Resource[]> {
  const response = await fetchApi<PaginatedResponse<Resource>>('/resources');
  return response.data;
}

export async function getResource(id: string): Promise<Resource> {
  return fetchApi<Resource>(`/resources/${id}`);
}

export async function createResource(data: CreateResourceRequest): Promise<Resource> {
  return fetchApi<Resource>('/resources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getResourceAvailability(id: string): Promise<ResourceAvailability> {
  return fetchApi<ResourceAvailability>(`/resources/${id}/availability`);
}

// Reservations
export async function createReservation(data: CreateReservationRequest): Promise<ReservationResponse> {
  return fetchApi<ReservationResponse>('/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReservation(id: string): Promise<Reservation> {
  return fetchApi<Reservation>(`/reservations/${id}`);
}

export async function cancelReservation(id: string): Promise<Reservation> {
  return fetchApi<Reservation>(`/reservations/${id}/cancel`, {
    method: 'POST',
  });
}

export interface ReservationsResult {
  data: Reservation[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export async function getReservations(filters?: { resourceId?: string; status?: string; limit?: number }): Promise<ReservationsResult> {
  const params = new URLSearchParams();
  if (filters?.resourceId) params.set('resourceId', filters.resourceId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.limit) params.set('limit', filters.limit.toString());
  const queryString = params.toString();
  return fetchApi<ReservationsResult>(`/reservations${queryString ? `?${queryString}` : ''}`);
}

export async function getResourceReservations(resourceId: string): Promise<Reservation[]> {
  const response = await fetchApi<PaginatedResponse<Reservation>>(`/reservations?resourceId=${resourceId}`);
  return response.data;
}

// Clients
export interface Client {
  id: string;
  email: string;
  totalReservations: number;
  activeReservations: number;
  cancelledReservations: number;
  totalQuantity: number;
  lastActivity: number;
  status: 'active' | 'inactive';
}

export async function getClients(): Promise<Client[]> {
  const response = await fetchApi<{ data: Client[]; total: number }>('/clients');
  return response.data;
}

// Analytics
export interface AnalyticsData {
  metrics: {
    totalReservations: number;
    confirmedReservations: number;
    cancelledReservations: number;
    totalQuantity: number;
    uniqueClients: number;
    totalResources: number;
    utilizationRate: number;
  };
  resourceUsage: Array<{
    name: string;
    type: string;
    capacity: number;
    currentBookings: number;
    usage: number;
    reservationCount: number;
  }>;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return fetchApi<AnalyticsData>('/analytics');
}

// Settings
export interface MaintenanceStatus {
  enabled: boolean;
  message: string | null;
  updatedAt: number | null;
}

export interface SystemStatus {
  operational: boolean;
  maintenance: {
    enabled: boolean;
    message: string | null;
  };
}

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  return fetchApi<MaintenanceStatus>('/settings/maintenance');
}

export async function setMaintenanceMode(enabled: boolean, message?: string): Promise<MaintenanceStatus> {
  return fetchApi<MaintenanceStatus>('/settings/maintenance', {
    method: 'PUT',
    body: JSON.stringify({ enabled, message }),
  });
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return fetchApi<SystemStatus>('/settings/status');
}

export { ApiError };
