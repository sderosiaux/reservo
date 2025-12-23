import { ResourceRepository } from '../../infrastructure/persistence/repositories/index.js';
import { ResourceId } from '../../domain/value-objects/index.js';
import { Resource, getRemainingCapacity } from '../../domain/entities/Resource.js';
import { ResourceNotFoundError } from '../../domain/errors.js';

export interface AvailabilityView {
  resourceId: string;
  type: string;
  state: 'OPEN' | 'CLOSED';
  capacity: number;
  currentBookings: number;
  remainingCapacity: number;
  isAvailable: boolean;
  cachedAt: number;
  isCached: boolean;
}

interface CacheEntry {
  view: AvailabilityView;
  expiresAt: number;
}

export interface AvailabilityViewServiceConfig {
  cacheTtlMs: number;      // Cache TTL in milliseconds
  maxCacheSize: number;    // Max entries in cache
}

const DEFAULT_CONFIG: AvailabilityViewServiceConfig = {
  cacheTtlMs: 2000,        // 2 seconds - reduced for multi-instance safety
  maxCacheSize: 10000      // 10k resources
};

/**
 * AvailabilityViewService
 *
 * Provides eventually-consistent availability views with LRU caching.
 *
 * IMPORTANT: This view may be stale. The commit endpoint is the
 * source of truth - availability here is just an approximation
 * for UI purposes.
 *
 * The spec says:
 * - Cache autorisé
 * - TTL configurable
 * - Vues approximatives acceptées
 *
 * LRU Implementation: Uses Map's insertion order preservation.
 * On access, we delete and re-insert to move entry to end (most recent).
 * Eviction removes from the front (least recent). Both operations are O(1).
 */
export class AvailabilityViewService {
  private cache: Map<string, CacheEntry> = new Map();
  private config: AvailabilityViewServiceConfig;

  // Cache metrics for monitoring
  private hits = 0;
  private misses = 0;

  constructor(
    private resourceRepo: ResourceRepository,
    config: Partial<AvailabilityViewServiceConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get availability view for a resource.
   * Returns cached view if available and not expired.
   */
  async getAvailability(resourceId: ResourceId): Promise<AvailabilityView> {
    const idStr = resourceId as string;
    const now = Date.now();

    // Check cache
    const cached = this.cache.get(idStr);
    if (cached && cached.expiresAt > now) {
      // O(1) LRU update: delete and re-insert to move to end (most recently used)
      this.cache.delete(idStr);
      this.cache.set(idStr, cached);
      this.hits++;
      return { ...cached.view, isCached: true };
    }

    // If entry exists but expired, delete it
    if (cached) {
      this.cache.delete(idStr);
    }

    this.misses++;

    // Fetch from database
    const resource = await this.resourceRepo.findById(resourceId);

    if (!resource) {
      throw new ResourceNotFoundError(idStr);
    }

    // Build view
    const view = this.buildView(resource);

    // Update cache with O(1) LRU eviction
    this.setCache(idStr, view);

    return { ...view, isCached: false };
  }

  /**
   * Get availability for multiple resources.
   * Useful for listing pages.
   */
  async getMultipleAvailability(resourceIds: ResourceId[]): Promise<AvailabilityView[]> {
    // Process in parallel
    const promises = resourceIds.map(id =>
      this.getAvailability(id).catch(() => null)
    );

    const views = await Promise.all(promises);

    return views.filter((v): v is AvailabilityView => v !== null);
  }

  /**
   * Invalidate cache for a resource.
   * Call this after a successful commit or cancellation.
   */
  invalidate(resourceId: ResourceId): void {
    this.cache.delete(resourceId as string);
  }

  /**
   * Invalidate all cache entries.
   */
  invalidateAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics including hit rate.
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      ttlMs: this.config.cacheTtlMs,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0,
    };
  }

  private buildView(resource: Resource): AvailabilityView {
    const remainingCapacity = getRemainingCapacity(resource);

    return {
      resourceId: resource.id as string,
      type: resource.type,
      state: resource.state,
      capacity: resource.capacity,
      currentBookings: resource.currentBookings,
      remainingCapacity,
      isAvailable: resource.state === 'OPEN' && remainingCapacity > 0,
      cachedAt: Date.now(),
      isCached: false
    };
  }

  private setCache(key: string, view: AvailabilityView): void {
    const now = Date.now();

    // O(1) LRU eviction: remove from front (least recently used)
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      view,
      expiresAt: now + this.config.cacheTtlMs,
    });
  }

  /**
   * O(1) eviction: removes the first (least recently used) entry from the Map.
   * Map.keys().next() returns the first key in O(1) time.
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }
}

export function createAvailabilityViewService(
  resourceRepo: ResourceRepository,
  config?: Partial<AvailabilityViewServiceConfig>
): AvailabilityViewService {
  return new AvailabilityViewService(resourceRepo, config);
}
