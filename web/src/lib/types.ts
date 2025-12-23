// Resource types
export interface Resource {
  id: string;
  type: string;
  capacity: number;
  currentBookings: number;
  state: 'OPEN' | 'CLOSED';
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface ResourceAvailability {
  resourceId: string;
  capacity: number;
  currentBookings: number;
  remainingCapacity: number;
  isAvailable: boolean;
}

// Reservation types - normalized to lowercase for frontend consistency
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'rejected';

export interface Reservation {
  id: string;
  resourceId: string;
  clientId: string;
  quantity: number;
  status: ReservationStatus;
  rejectionReason?: string;
  serverTimestamp: number;
  createdAt: number;
}

export interface CreateReservationRequest {
  resourceId: string;
  clientId: string;
  quantity: number;
}

export interface ReservationResponse {
  status: 'CONFIRMED' | 'REJECTED';
  reservationId?: string;
  serverTimestamp: number;
  reason?: string;
  message?: string; // Optional message for rejected reservations (e.g., maintenance message)
}

export interface CreateResourceRequest {
  id: string;
  type: string;
  capacity: number;
}

// Stats
export interface DashboardStats {
  totalResources: number;
  activeReservations: number;
  capacityUtilization: number;
  rejectedToday: number;
}
