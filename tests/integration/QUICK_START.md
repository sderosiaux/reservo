# Integration Tests - Quick Start

## Run Tests

```bash
# Easiest way - runs everything
./scripts/run-integration-tests.sh

# Or use npm script
npm run test:integration
```

## What Gets Tested

### 🔥 The Critical Test

**100 concurrent requests for 1 slot = exactly 1 winner**

This proves the row-level locking prevents overbooking:

```typescript
const promises = Array.from({ length: 100 }, (_, i) =>
  commitService.commit({
    resourceId: resource.id,
    clientId: createClientId(`client-${i}`),
    quantity: createQuantity(1)
  })
);

const results = await Promise.all(promises);

expect(successes).toHaveLength(1);    // ✓ Exactly 1 winner
expect(failures).toHaveLength(99);     // ✓ 99 losers
```

### All Test Categories

- ✅ Basic commit flow (success, rejection, timestamps)
- ✅ **Concurrency (THE CRITICAL TESTS)**
- ✅ Ordering guarantees
- ✅ Repository operations
- ✅ Optimistic locking
- ✅ Transactions and rollbacks

## Writing New Tests

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase } from './setup.js';
import { createTestResource, testClientId } from './helpers.js';

describe('My New Feature', () => {
  let db, commitService, resourceRepo, reservationRepo;

  beforeAll(async () => {
    db = await setupTestDatabase();
    resourceRepo = new ResourceRepository();
    reservationRepo = new ReservationRepository();
    commitService = new ReservationCommitService(db, resourceRepo, reservationRepo);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('tests something', async () => {
    // Create test data
    const resource = await createTestResource({ capacity: 10 }, resourceRepo);

    // Test your feature
    const result = await commitService.commit({
      resourceId: resource.id,
      clientId: testClientId(),
      quantity: createQuantity(1)
    });

    // Assert
    expect(result.success).toBe(true);
  });
});
```

## Useful Commands

```bash
# Run specific test file
npm run test:integration -- reservation-commit

# Keep container running after tests (for debugging)
CLEANUP=false ./scripts/run-integration-tests.sh

# Connect to test database
docker exec -it reservo-test-db psql -U reservo -d reservo_test

# View test database tables
docker exec -it reservo-test-db psql -U reservo -d reservo_test -c "SELECT * FROM resources;"
docker exec -it reservo-test-db psql -U reservo -d reservo_test -c "SELECT * FROM reservations;"

# Check container logs
docker logs reservo-test-db

# Manually stop test database
docker-compose -f docker-compose.test.yml down
```

## Test Database

- **Host:** localhost
- **Port:** 5433
- **Database:** reservo_test
- **User:** reservo
- **Password:** reservo
- **URL:** postgres://reservo:reservo@localhost:5433/reservo_test

## Debugging Failed Tests

### 1. Check what actually happened in database

```bash
docker exec -it reservo-test-db psql -U reservo -d reservo_test

\dt                          # List tables
SELECT * FROM resources;     # View resources
SELECT * FROM reservations;  # View reservations
```

### 2. Run single test with verbose output

```bash
npm run test:integration -- -t "100 concurrent requests"
```

### 3. Keep container running

```bash
CLEANUP=false ./scripts/run-integration-tests.sh
# Now you can inspect database state after test failure
```

## Common Issues

### Container already running

```bash
docker-compose -f docker-compose.test.yml down
./scripts/run-integration-tests.sh
```

### Port 5433 already in use

Stop whatever is using port 5433, or change the port in docker-compose.test.yml

### Migrations fail

```bash
# Generate fresh migrations
export DATABASE_URL="postgres://reservo:reservo@localhost:5433/reservo_test"
npm run db:generate
npm run db:push
```

## Test Performance

- **Total runtime:** ~30-60 seconds
- **Container startup:** ~5 seconds
- **Migrations:** ~2 seconds
- **Tests:** ~20-50 seconds
  - Concurrency tests are slow (intentionally - they test real concurrent behavior)

## Why These Tests Matter

These tests **actually verify** that:

1. ✅ Row-level locking works (100 concurrent → 1 winner)
2. ✅ Capacity enforcement works (exactly N winners for capacity=N)
3. ✅ No overbooking EVER (database state verified)
4. ✅ Optimistic locking prevents lost updates
5. ✅ Transactions are atomic (all-or-nothing)

**No mocks. Real database. Real concurrency. Real proof.**

## Files Overview

```
tests/integration/
├── setup.ts                    # Database lifecycle
├── helpers.ts                  # Test utilities
├── reservation-commit.test.ts  # Critical concurrency tests
├── repositories.test.ts        # Repository tests
├── example.test.ts             # Template for new tests
├── README.md                   # Full documentation
└── QUICK_START.md             # This file

scripts/
└── run-integration-tests.sh    # Test orchestration

vitest.config.integration.ts    # Test configuration
```

## Next Steps

1. Run the tests: `./scripts/run-integration-tests.sh`
2. Read full docs: `tests/integration/README.md`
3. See examples: `tests/integration/example.test.ts`
4. Write your own tests using the helpers
