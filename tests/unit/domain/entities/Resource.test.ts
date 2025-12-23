/**
 * Unit tests for Resource entity
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createResource,
  canAccommodate,
  getRemainingCapacity,
  updateBookings,
  closeResource,
  openResource,
  type Resource,
  type CreateResourceParams
} from '../../../../src/domain/entities/Resource';
import { createResourceId } from '../../../../src/domain/value-objects/ResourceId';
import { createQuantity } from '../../../../src/domain/value-objects/Quantity';

describe('Entity: Resource', () => {
  let baseParams: CreateResourceParams;

  beforeEach(() => {
    baseParams = {
      id: createResourceId('room-101'),
      type: 'conference-room',
      capacity: 10
    };
  });

  describe('createResource', () => {
    it('creates valid resource with correct defaults', () => {
      const resource = createResource(baseParams);

      expect(resource.id).toBe(baseParams.id);
      expect(resource.type).toBe('conference-room');
      expect(resource.capacity).toBe(10);
      expect(resource.currentBookings).toBe(0);
      expect(resource.version).toBe(1);
      expect(resource.state).toBe('OPEN');
      expect(resource.createdAt).toBeTypeOf('number');
      expect(resource.updatedAt).toBeTypeOf('number');
      expect(resource.createdAt).toBe(resource.updatedAt);
    });

    it('creates resource with OPEN state when state not specified', () => {
      const resource = createResource(baseParams);
      expect(resource.state).toBe('OPEN');
    });

    it('creates resource with CLOSED state when specified', () => {
      const resource = createResource({ ...baseParams, state: 'CLOSED' });
      expect(resource.state).toBe('CLOSED');
    });

    it('creates resource with zero capacity', () => {
      const resource = createResource({ ...baseParams, capacity: 0 });
      expect(resource.capacity).toBe(0);
      expect(resource.currentBookings).toBe(0);
    });

    it('creates resource with large capacity', () => {
      const resource = createResource({ ...baseParams, capacity: 1000000 });
      expect(resource.capacity).toBe(1000000);
    });

    it('throws error for negative capacity', () => {
      expect(() =>
        createResource({ ...baseParams, capacity: -1 })
      ).toThrow('Resource capacity cannot be negative');
    });

    it('throws error for empty type', () => {
      expect(() =>
        createResource({ ...baseParams, type: '' })
      ).toThrow('Resource type cannot be empty');
    });

    it('throws error for whitespace-only type', () => {
      expect(() =>
        createResource({ ...baseParams, type: '   ' })
      ).toThrow('Resource type cannot be empty');
    });

    it('creates multiple resources with different timestamps', () => {
      const resource1 = createResource(baseParams);
      const resource2 = createResource({
        ...baseParams,
        id: createResourceId('room-102')
      });

      expect(resource1.createdAt).toBeLessThanOrEqual(resource2.createdAt);
    });
  });

  describe('canAccommodate', () => {
    let resource: Resource;

    beforeEach(() => {
      resource = createResource({ ...baseParams, capacity: 10 });
    });

    it('returns true when capacity is available', () => {
      const quantity = createQuantity(5);
      expect(canAccommodate(resource, quantity)).toBe(true);
    });

    it('returns true when requesting exactly remaining capacity', () => {
      const resourceWithBookings = updateBookings(resource, 7);
      const quantity = createQuantity(3);
      expect(canAccommodate(resourceWithBookings, quantity)).toBe(true);
    });

    it('returns true when resource has full capacity available', () => {
      const quantity = createQuantity(10);
      expect(canAccommodate(resource, quantity)).toBe(true);
    });

    it('returns true when requesting 1 with 1 slot remaining', () => {
      const resourceWithBookings = updateBookings(resource, 9);
      const quantity = createQuantity(1);
      expect(canAccommodate(resourceWithBookings, quantity)).toBe(true);
    });

    it('returns false when at full capacity', () => {
      const resourceFull = updateBookings(resource, 10);
      const quantity = createQuantity(1);
      expect(canAccommodate(resourceFull, quantity)).toBe(false);
    });

    it('returns false when quantity exceeds remaining capacity', () => {
      const resourceWithBookings = updateBookings(resource, 7);
      const quantity = createQuantity(4);
      expect(canAccommodate(resourceWithBookings, quantity)).toBe(false);
    });

    it('returns false when quantity exceeds total capacity', () => {
      const quantity = createQuantity(15);
      expect(canAccommodate(resource, quantity)).toBe(false);
    });

    it('returns false when resource is CLOSED', () => {
      const closedResource = closeResource(resource);
      const quantity = createQuantity(1);
      expect(canAccommodate(closedResource, quantity)).toBe(false);
    });

    it('returns false when resource is CLOSED even with full capacity available', () => {
      const closedResource = closeResource(resource);
      const quantity = createQuantity(10);
      expect(canAccommodate(closedResource, quantity)).toBe(false);
    });

    it('returns true when resource is reopened after being closed', () => {
      const closedResource = closeResource(resource);
      const reopenedResource = openResource(closedResource);
      const quantity = createQuantity(5);
      expect(canAccommodate(reopenedResource, quantity)).toBe(true);
    });
  });

  describe('getRemainingCapacity', () => {
    it('returns full capacity when no bookings', () => {
      const resource = createResource({ ...baseParams, capacity: 10 });
      expect(getRemainingCapacity(resource)).toBe(10);
    });

    it('calculates remaining capacity correctly with partial bookings', () => {
      const resource = createResource({ ...baseParams, capacity: 10 });
      const resourceWithBookings = updateBookings(resource, 3);
      expect(getRemainingCapacity(resourceWithBookings)).toBe(7);
    });

    it('returns zero when at full capacity', () => {
      const resource = createResource({ ...baseParams, capacity: 10 });
      const resourceFull = updateBookings(resource, 10);
      expect(getRemainingCapacity(resourceFull)).toBe(0);
    });

    it('returns zero for resource with zero capacity', () => {
      const resource = createResource({ ...baseParams, capacity: 0 });
      expect(getRemainingCapacity(resource)).toBe(0);
    });

    it('calculates correctly when only one slot remains', () => {
      const resource = createResource({ ...baseParams, capacity: 10 });
      const resourceWithBookings = updateBookings(resource, 9);
      expect(getRemainingCapacity(resourceWithBookings)).toBe(1);
    });

    it('returns remaining capacity regardless of resource state', () => {
      const resource = createResource({ ...baseParams, capacity: 10 });
      const closedResource = closeResource(resource);
      expect(getRemainingCapacity(closedResource)).toBe(10);
    });
  });

  describe('updateBookings', () => {
    let resource: Resource;
    let originalUpdatedAt: number;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      resource = createResource({ ...baseParams, capacity: 10 });
      originalUpdatedAt = resource.updatedAt;
      vi.setSystemTime(new Date('2024-01-01T01:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns new immutable instance with updated bookings', () => {
      const updated = updateBookings(resource, 5);

      expect(updated).not.toBe(resource);
      expect(updated.currentBookings).toBe(5);
      expect(resource.currentBookings).toBe(0);
    });

    it('increments version number', () => {
      const updated = updateBookings(resource, 5);
      expect(updated.version).toBe(resource.version + 1);
      expect(resource.version).toBe(1);
    });

    it('updates timestamp', () => {
      const updated = updateBookings(resource, 5);
      expect(updated.updatedAt).toBeGreaterThan(originalUpdatedAt);
      expect(resource.updatedAt).toBe(originalUpdatedAt);
    });

    it('preserves other properties', () => {
      const updated = updateBookings(resource, 5);
      expect(updated.id).toBe(resource.id);
      expect(updated.type).toBe(resource.type);
      expect(updated.capacity).toBe(resource.capacity);
      expect(updated.state).toBe(resource.state);
      expect(updated.createdAt).toBe(resource.createdAt);
    });

    it('allows updating to zero bookings', () => {
      const withBookings = updateBookings(resource, 5);
      const cleared = updateBookings(withBookings, 0);
      expect(cleared.currentBookings).toBe(0);
    });

    it('allows updating to full capacity', () => {
      const updated = updateBookings(resource, 10);
      expect(updated.currentBookings).toBe(10);
    });

    it('throws error for negative bookings', () => {
      expect(() => updateBookings(resource, -1)).toThrow(
        'Bookings cannot be negative'
      );
    });

    it('throws error when bookings exceed capacity', () => {
      expect(() => updateBookings(resource, 11)).toThrow(
        'Bookings cannot exceed capacity'
      );
    });

    it('increments version on multiple updates', () => {
      const update1 = updateBookings(resource, 3);
      const update2 = updateBookings(update1, 5);
      const update3 = updateBookings(update2, 7);

      expect(update1.version).toBe(2);
      expect(update2.version).toBe(3);
      expect(update3.version).toBe(4);
    });
  });

  describe('closeResource', () => {
    let resource: Resource;
    let originalUpdatedAt: number;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      resource = createResource(baseParams);
      originalUpdatedAt = resource.updatedAt;
      vi.setSystemTime(new Date('2024-01-01T01:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns new immutable instance with CLOSED state', () => {
      const closed = closeResource(resource);

      expect(closed).not.toBe(resource);
      expect(closed.state).toBe('CLOSED');
      expect(resource.state).toBe('OPEN');
    });

    it('increments version number', () => {
      const closed = closeResource(resource);
      expect(closed.version).toBe(resource.version + 1);
      expect(resource.version).toBe(1);
    });

    it('updates timestamp', () => {
      const closed = closeResource(resource);
      expect(closed.updatedAt).toBeGreaterThan(originalUpdatedAt);
      expect(resource.updatedAt).toBe(originalUpdatedAt);
    });

    it('preserves other properties', () => {
      const closed = closeResource(resource);
      expect(closed.id).toBe(resource.id);
      expect(closed.type).toBe(resource.type);
      expect(closed.capacity).toBe(resource.capacity);
      expect(closed.currentBookings).toBe(resource.currentBookings);
      expect(closed.createdAt).toBe(resource.createdAt);
    });

    it('can close resource with existing bookings', () => {
      const withBookings = updateBookings(resource, 5);
      const closed = closeResource(withBookings);

      expect(closed.state).toBe('CLOSED');
      expect(closed.currentBookings).toBe(5);
    });

    it('can close already closed resource', () => {
      const closed1 = closeResource(resource);
      const closed2 = closeResource(closed1);

      expect(closed2.state).toBe('CLOSED');
      expect(closed2.version).toBe(3);
    });
  });

  describe('openResource', () => {
    let resource: Resource;
    let closedResource: Resource;
    let originalUpdatedAt: number;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      resource = createResource(baseParams);
      closedResource = closeResource(resource);
      originalUpdatedAt = closedResource.updatedAt;
      vi.setSystemTime(new Date('2024-01-01T01:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns new immutable instance with OPEN state', () => {
      const opened = openResource(closedResource);

      expect(opened).not.toBe(closedResource);
      expect(opened.state).toBe('OPEN');
      expect(closedResource.state).toBe('CLOSED');
    });

    it('increments version number', () => {
      const opened = openResource(closedResource);
      expect(opened.version).toBe(closedResource.version + 1);
      expect(closedResource.version).toBe(2);
    });

    it('updates timestamp', () => {
      const opened = openResource(closedResource);
      expect(opened.updatedAt).toBeGreaterThan(originalUpdatedAt);
      expect(closedResource.updatedAt).toBe(originalUpdatedAt);
    });

    it('preserves other properties', () => {
      const opened = openResource(closedResource);
      expect(opened.id).toBe(closedResource.id);
      expect(opened.type).toBe(closedResource.type);
      expect(opened.capacity).toBe(closedResource.capacity);
      expect(opened.currentBookings).toBe(closedResource.currentBookings);
      expect(opened.createdAt).toBe(closedResource.createdAt);
    });

    it('can open already open resource', () => {
      const opened1 = openResource(closedResource);
      const opened2 = openResource(opened1);

      expect(opened2.state).toBe('OPEN');
      expect(opened2.version).toBe(4);
    });

    it('can reopen resource with existing bookings', () => {
      const withBookings = updateBookings(resource, 5);
      const closed = closeResource(withBookings);
      const opened = openResource(closed);

      expect(opened.state).toBe('OPEN');
      expect(opened.currentBookings).toBe(5);
    });
  });

  describe('immutability', () => {
    it('original resource remains unchanged after updateBookings', () => {
      const original = createResource(baseParams);
      const originalSnapshot = { ...original };

      updateBookings(original, 5);

      expect(original).toEqual(originalSnapshot);
    });

    it('original resource remains unchanged after closeResource', () => {
      const original = createResource(baseParams);
      const originalSnapshot = { ...original };

      closeResource(original);

      expect(original).toEqual(originalSnapshot);
    });

    it('original resource remains unchanged after openResource', () => {
      const original = createResource(baseParams);
      const originalSnapshot = { ...original };

      openResource(original);

      expect(original).toEqual(originalSnapshot);
    });

    it('chained operations do not affect original', () => {
      const original = createResource(baseParams);
      const originalSnapshot = { ...original };

      const step1 = updateBookings(original, 3);
      const step2 = closeResource(step1);
      const step3 = openResource(step2);
      const step4 = updateBookings(step3, 7);

      expect(original).toEqual(originalSnapshot);
      expect(step1.currentBookings).toBe(3);
      expect(step2.state).toBe('CLOSED');
      expect(step3.state).toBe('OPEN');
      expect(step4.currentBookings).toBe(7);
    });
  });
});
