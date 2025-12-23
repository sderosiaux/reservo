/**
 * Resource - Domain entity representing a bookable resource
 */

import { ResourceId } from '../value-objects/ResourceId.js';
import { Quantity } from '../value-objects/Quantity.js';

export type ResourceState = 'OPEN' | 'CLOSED';

export interface Resource {
  readonly id: ResourceId;
  readonly type: string;
  readonly capacity: number;
  readonly currentBookings: number;
  readonly version: number;
  readonly state: ResourceState;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface CreateResourceParams {
  id: ResourceId;
  type: string;
  capacity: number;
  state?: ResourceState;
}

/**
 * Factory function to create a new Resource
 */
export function createResource(params: CreateResourceParams): Resource {
  const now = Date.now();

  if (params.capacity < 0) {
    throw new Error('Resource capacity cannot be negative');
  }

  if (!params.type || params.type.trim().length === 0) {
    throw new Error('Resource type cannot be empty');
  }

  return {
    id: params.id,
    type: params.type,
    capacity: params.capacity,
    currentBookings: 0,
    version: 1,
    state: params.state ?? 'OPEN',
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Check if the resource can accommodate the requested quantity
 */
export function canAccommodate(resource: Resource, quantity: Quantity): boolean {
  if (resource.state !== 'OPEN') {
    return false;
  }

  const remainingCapacity = resource.capacity - resource.currentBookings;
  // Quantity is a branded number, so we can compare directly
  return remainingCapacity >= (quantity as number);
}

/**
 * Get the remaining capacity of the resource
 */
export function getRemainingCapacity(resource: Resource): number {
  return Math.max(0, resource.capacity - resource.currentBookings);
}

/**
 * Update resource bookings (returns a new Resource instance)
 */
export function updateBookings(resource: Resource, newBookings: number): Resource {
  if (newBookings < 0) {
    throw new Error('Bookings cannot be negative');
  }

  if (newBookings > resource.capacity) {
    throw new Error('Bookings cannot exceed capacity');
  }

  return {
    ...resource,
    currentBookings: newBookings,
    version: resource.version + 1,
    updatedAt: Date.now()
  };
}

/**
 * Close a resource (returns a new Resource instance)
 */
export function closeResource(resource: Resource): Resource {
  return {
    ...resource,
    state: 'CLOSED',
    version: resource.version + 1,
    updatedAt: Date.now()
  };
}

/**
 * Open a resource (returns a new Resource instance)
 */
export function openResource(resource: Resource): Resource {
  return {
    ...resource,
    state: 'OPEN',
    version: resource.version + 1,
    updatedAt: Date.now()
  };
}
