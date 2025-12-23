#!/bin/bash

# Functional Test Runner
# Runs API-level tests against a real PostgreSQL database

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo "Functional API Test Runner"
echo "=================================================="

# Step 1: Start PostgreSQL container
echo -e "\n${YELLOW}Step 1: Starting PostgreSQL test container...${NC}"
docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" up -d

# Wait for container
sleep 1
echo -e "${GREEN}Container started${NC}"

# Step 2: Wait for PostgreSQL to be ready
echo -e "\n${YELLOW}Step 2: Waiting for PostgreSQL to be ready...${NC}"
until docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" exec -T postgres-test pg_isready -U reservo -d reservo_test > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Step 3: Run migrations
echo -e "\n${YELLOW}Step 3: Running migrations...${NC}"
export DATABASE_URL="postgresql://reservo:reservo@localhost:5433/reservo_test"
npm run db:generate
npm run db:push
echo -e "${GREEN}Migrations applied${NC}"

# Step 4: Run functional tests
echo -e "\n${YELLOW}Step 4: Running functional tests...${NC}"
export TEST_DATABASE_URL="postgresql://reservo:reservo@localhost:5433/reservo_test"
npm run test:functional
TEST_EXIT_CODE=$?

# Step 5: Cleanup
echo -e "\n${YELLOW}Step 5: Cleaning up (stopping container)...${NC}"
docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" down -v
echo -e "${GREEN}Cleanup complete${NC}"

echo ""
echo "=================================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}Functional tests PASSED ✓${NC}"
else
  echo -e "${RED}Functional tests FAILED ✗${NC}"
fi
echo "=================================================="

exit $TEST_EXIT_CODE
