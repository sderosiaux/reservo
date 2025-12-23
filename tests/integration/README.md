# Integration Tests

This directory contains integration tests for the reservo reservation engine.

## Overview

These tests verify the system works correctly with a **real PostgreSQL database**. No mocks, no in-memory databases. This ensures we're testing the actual production behavior.

## What We Test

### 1. ReservationCommitService (reservation-commit.test.ts)

**THE MOST CRITICAL TESTS** - These prove the system prevents overbooking under concurrency.

**Concurrency Tests:**
- `100 concurrent requests for 1 slot = exactly 1 winner` - Proves row-level locking works
- `100 concurrent requests for 10 slots = exactly 10 winners` - Proves capacity enforcement
- Data integrity under race conditions
- Independent handling of multiple resources

**Basic Flow Tests:**
- Success when capacity available
- Rejection when resource is full
- Rejection when resource is closed
- Server timestamp correctness
- Database persistence

**Ordering Tests:**
- Monotonically increasing timestamps
- Correct reservation ordering

**Error Handling:**
- Resource not found errors
- Optimistic locking conflicts

### 2. Repositories (repositories.test.ts)

Tests the persistence layer with real database operations.

**ResourceRepository:**
- CRUD operations
- Row-level locking (FOR UPDATE)
- Optimistic locking (version conflicts)
- Transaction support

**ReservationRepository:**
- CRUD operations
- Query operations
- Foreign key constraints
- Transaction support

**Cross-Repository:**
- Atomic transactions
- Rollback on errors

## Running the Tests

### Quick Start

```bash
# Run all integration tests
./scripts/run-integration-tests.sh
```

This script:
1. Starts PostgreSQL test container
2. Waits for database to be ready
3. Runs migrations
4. Executes integration tests
5. Cleans up (stops container)

### Manual Execution

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Wait for PostgreSQL
while ! docker exec reservo-test-db pg_isready -U reservo -d reservo_test; do sleep 1; done

# Run migrations
export DATABASE_URL="postgres://reservo:reservo@localhost:5433/reservo_test"
npm run db:push

# Run tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

### Keep Container Running

```bash
# Don't cleanup after tests (useful for debugging)
CLEANUP=false ./scripts/run-integration-tests.sh
```

### Run Specific Test

```bash
npm run test:integration -- reservation-commit
```

## Test Database

- **Container:** reservo-test-db
- **Port:** 5433
- **Database:** reservo_test
- **User:** reservo
- **Password:** reservo
- **Connection String:** postgres://reservo:reservo@localhost:5433/reservo_test

The database uses tmpfs (in-memory filesystem) for fast I/O.

## Test Isolation

Each test file has:
- `beforeAll()` - Setup database connection
- `afterAll()` - Teardown database connection
- `beforeEach()` - Truncate all tables (clean slate)

This ensures tests don't interfere with each other.

## Why These Tests Matter

### The Concurrency Tests Are The Proof

The most important test is:

```typescript
it('with capacity=1 and 100 concurrent requests, exactly 1 succeeds')
```

This test **actually launches 100 concurrent promises** using `Promise.all()`. If the row-level locking wasn't working, multiple requests would succeed and cause overbooking.

**This is not a mock.** This is a real test with real concurrency hitting a real database.

### No False Positives

These tests are designed to **actually fail** if concurrency is broken:

- Real PostgreSQL database
- Real concurrent requests (Promise.all)
- Real row-level locks
- Real transactions
- Real foreign key constraints

If you break the locking mechanism, these tests WILL fail.

## Debugging Failed Tests

### Check Database State

```bash
# Connect to test database
docker exec -it reservo-test-db psql -U reservo -d reservo_test

# Check resources
SELECT * FROM resources;

# Check reservations
SELECT * FROM reservations;

# Check for orphaned data
SELECT COUNT(*) FROM reservations WHERE resource_id NOT IN (SELECT id FROM resources);
```

### Check Container Logs

```bash
docker logs reservo-test-db
```

### Inspect Failed Concurrency Test

If a concurrency test fails, check:
1. How many successes vs failures
2. Final resource.currentBookings
3. Count of reservations in database
4. Resource version number

These should all match. If they don't, there's a concurrency bug.

## Performance

The full test suite takes approximately 30-60 seconds:
- Container startup: ~5 seconds
- Migrations: ~2 seconds
- Tests: ~20-50 seconds (concurrency tests are slow)
- Cleanup: ~2 seconds

The concurrency tests are intentionally slow because they test real concurrent behavior.

## Continuous Integration

These tests should run on every PR and before every deployment.

Example CI configuration:

```yaml
integration-tests:
  runs-on: ubuntu-latest
  steps:
    - checkout
    - setup-node
    - npm install
    - ./scripts/run-integration-tests.sh
```

The script handles the entire lifecycle, making CI integration trivial.
