#!/bin/bash

#
# Integration Test Runner
#
# This script orchestrates the full integration test lifecycle:
# 1. Start PostgreSQL test container
# 2. Wait for database to be ready
# 3. Run migrations
# 4. Execute integration tests
# 5. Cleanup (stop container)
#

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=================================================="
echo "Integration Test Runner"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start test database container
echo -e "${YELLOW}Step 1: Starting PostgreSQL test container...${NC}"
cd "$PROJECT_ROOT"

if docker ps | grep -q "reservo-test-db"; then
    echo "Test database container already running"
else
    docker-compose -f docker-compose.test.yml up -d
    echo -e "${GREEN}Container started${NC}"
fi

echo ""

# Step 2: Wait for PostgreSQL to be ready
echo -e "${YELLOW}Step 2: Waiting for PostgreSQL to be ready...${NC}"

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker exec reservo-test-db pg_isready -U reservo -d reservo_test > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready!${NC}"
        break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo -e "${RED}PostgreSQL failed to become ready in time${NC}"
        exit 1
    fi

    echo -n "."
    sleep 1
done

echo ""

# Step 3: Run migrations
echo -e "${YELLOW}Step 3: Running migrations...${NC}"

export DATABASE_URL="postgres://reservo:reservo@localhost:5433/reservo_test"

# Generate migrations (may have no changes)
npm run db:generate || echo "No new migrations to generate"

# Push schema to database
npm run db:push

echo -e "${GREEN}Migrations applied${NC}"
echo ""

# Step 4: Run integration tests
echo -e "${YELLOW}Step 4: Running integration tests...${NC}"
echo ""

npm run test:integration

TEST_EXIT_CODE=$?

echo ""

# Step 5: Cleanup (optional - controlled by flag)
CLEANUP=${CLEANUP:-"true"}

if [ "$CLEANUP" = "true" ]; then
    echo -e "${YELLOW}Step 5: Cleaning up (stopping container)...${NC}"
    docker-compose -f docker-compose.test.yml down
    echo -e "${GREEN}Cleanup complete${NC}"
else
    echo -e "${YELLOW}Step 5: Skipping cleanup (CLEANUP=false)${NC}"
    echo "Container is still running. Stop manually with:"
    echo "  docker-compose -f docker-compose.test.yml down"
fi

echo ""
echo "=================================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Integration tests PASSED ✓${NC}"
else
    echo -e "${RED}Integration tests FAILED ✗${NC}"
fi

echo "=================================================="

exit $TEST_EXIT_CODE
