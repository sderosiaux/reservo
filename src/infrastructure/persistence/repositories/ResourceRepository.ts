/**
 * ResourceRepository - Persistence layer for Resource entities
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { db } from '../db.js';
import { resources } from '../schema/index.js';
import { Resource } from '../../../domain/entities/Resource.js';
import { ResourceId } from '../../../domain/value-objects/index.js';
import { ResourceNotFoundError, ConcurrencyConflictError } from '../../../domain/errors.js';
import { resourceToDomain, resourceToDbInsert, resourceToDbUpdate } from './mappers.js';
import * as schema from '../schema/index.js';

export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  any
>;

export type ResourceState = 'OPEN' | 'CLOSED';

export interface FindAllResourcesOptions {
  limit?: number;
  offset?: number;
  state?: ResourceState;
  type?: string;
}

export interface FindAllResourcesResult {
  resources: Resource[];
  total: number;
}

export interface IResourceRepository {
  findById(id: ResourceId): Promise<Resource | null>;
  findByIdForUpdate(id: ResourceId, tx: Transaction): Promise<Resource | null>;
  findAll(options?: FindAllResourcesOptions): Promise<FindAllResourcesResult>;
  save(resource: Resource): Promise<Resource>;
  updateWithOptimisticLock(resource: Resource, tx: Transaction): Promise<Resource>;
}

export class ResourceRepository implements IResourceRepository {
  /**
   * Find a resource by ID without locking
   */
  async findById(id: ResourceId): Promise<Resource | null> {
    const result = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return resourceToDomain(result[0]);
  }

  /**
   * Find all resources with optional filtering and pagination
   */
  async findAll(options: FindAllResourcesOptions = {}): Promise<FindAllResourcesResult> {
    const { limit = 100, offset = 0, state, type } = options;

    const conditions = [];
    if (state) {
      conditions.push(eq(resources.state, state));
    }
    if (type) {
      conditions.push(eq(resources.type, type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(resources)
        .where(whereClause)
        .orderBy(desc(resources.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
        .from(resources)
        .where(whereClause),
    ]);

    return {
      resources: items.map(resourceToDomain),
      total: countResult[0]?.count ?? 0,
    };
  }

  /**
   * Find a resource by ID with row-level lock (FOR UPDATE)
   * CRITICAL: This prevents concurrent modifications during atomic commits
   */
  async findByIdForUpdate(id: ResourceId, tx: Transaction): Promise<Resource | null> {
    const result = await tx
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .for('update')
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return resourceToDomain(result[0]);
  }

  /**
   * Save a new resource or update an existing one
   * Note: Use updateWithOptimisticLock for concurrent updates
   */
  async save(resource: Resource): Promise<Resource> {
    const dbResource = resourceToDbInsert(resource);

    const result = await db
      .insert(resources)
      .values(dbResource)
      .onConflictDoUpdate({
        target: resources.id,
        set: resourceToDbUpdate(resource),
      })
      .returning();

    return resourceToDomain(result[0]);
  }

  /**
   * Update a resource with optimistic locking (version check)
   * Throws ConcurrencyConflictError if version has changed
   */
  async updateWithOptimisticLock(resource: Resource, tx: Transaction): Promise<Resource> {
    const expectedVersion = resource.version - 1; // Previous version
    const updateData = resourceToDbUpdate(resource);

    const result = await tx
      .update(resources)
      .set(updateData)
      .where(
        and(
          eq(resources.id, resource.id),
          eq(resources.version, expectedVersion)
        )
      )
      .returning();

    if (result.length === 0) {
      // Either resource doesn't exist or version conflict
      const exists = await tx
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.id, resource.id))
        .limit(1);

      if (exists.length === 0) {
        throw new ResourceNotFoundError(`Resource ${resource.id} not found`);
      }

      throw new ConcurrencyConflictError(
        `Version conflict for resource ${resource.id}. Expected version ${expectedVersion}, but resource was modified by another transaction.`
      );
    }

    return resourceToDomain(result[0]);
  }
}

/**
 * Factory function to create a ResourceRepository instance
 */
export function createResourceRepository(): IResourceRepository {
  return new ResourceRepository();
}
