#!/bin/bash
# Pre-Migration Safety Check
# Run BEFORE any `prisma migrate` command to prevent VS Code crashes
# Usage: ./scripts/pre-migration-check.sh && npx prisma migrate dev --name your_migration

set -e

echo "🔍 Pre-Migration Safety Check"
echo "=============================="
echo ""

# Check 1: Kill any existing Prisma processes
echo "1️⃣  Checking for existing Prisma processes..."
PRISMA_COUNT=$(ps aux | grep -E '(prisma migrate|prisma studio|schema-engine)' | grep -v grep | wc -l | tr -d ' ')

if [ "$PRISMA_COUNT" -gt 0 ]; then
  echo "   ⚠️  Found $PRISMA_COUNT running Prisma processes"
  echo "   ⚙️  Terminating zombie processes..."
  pkill -9 -f 'prisma migrate' 2>/dev/null || true
  pkill -9 -f 'prisma studio' 2>/dev/null || true
  pkill -9 -f 'schema-engine' 2>/dev/null || true
  sleep 2
  echo "   ✅ Processes terminated"
else
  echo "   ✅ No zombie Prisma processes found"
fi

# Check 2: Verify Prisma schema is valid
echo ""
echo "2️⃣  Validating Prisma schema..."
cd "$(dirname "$0")/.."
if npx prisma validate 2>&1 | grep -q "is valid"; then
  echo "   ✅ Schema is valid"
else
  echo "   ❌ Schema validation failed"
  npx prisma validate
  exit 1
fi

# Check 3: Check database connection
echo ""
echo "3️⃣  Testing database connection..."
if npx prisma db execute --stdin <<< "SELECT 1" &>/dev/null; then
  echo "   ✅ Database connection successful"
else
  echo "   ❌ Database connection failed"
  echo "   Check your DATABASE_URL in .env"
  exit 1
fi

# Check 4: Check available memory (macOS)
echo ""
echo "4️⃣  Checking available system memory..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS memory check
  FREE_PAGES=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
  FREE_MB=$((FREE_PAGES * 4096 / 1024 / 1024))
  
  if [ "$FREE_MB" -lt 500 ]; then
    echo "   ⚠️  Low memory: ${FREE_MB}MB available"
    echo "   💡 Consider closing other apps before migration"
    read -p "   Continue anyway? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "   ❌ Migration cancelled"
      exit 1
    fi
  else
    echo "   ✅ Sufficient memory: ${FREE_MB}MB available"
  fi
else
  echo "   ⏭️  Skipping memory check (non-macOS system)"
fi

# Check 5: Verify no dev servers are interfering
echo ""
echo "5️⃣  Checking for heavy concurrent processes..."
HEAVY_COUNT=$(ps aux | grep -E '(tsx watch|vite|webpack)' | grep -v grep | wc -l | tr -d ' ')
if [ "$HEAVY_COUNT" -gt 2 ]; then
  echo "   ⚠️  Multiple dev servers running ($HEAVY_COUNT processes)"
  echo "   💡 Consider stopping dev servers during migration"
  read -p "   Continue anyway? (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "   ❌ Migration cancelled"
    exit 1
  fi
else
  echo "   ✅ No excessive concurrent processes"
fi

# Check 6: Verify migrations directory exists
echo ""
echo "6️⃣  Checking migrations directory..."
if [ -d "prisma/migrations" ]; then
  MIGRATION_COUNT=$(ls -1 prisma/migrations | grep -v migration_lock.toml | wc -l | tr -d ' ')
  echo "   ✅ Migrations directory exists ($MIGRATION_COUNT existing migrations)"
else
  echo "   ⚠️  Migrations directory doesn't exist (first migration?)"
fi

echo ""
echo "=============================="
echo "✅ All pre-flight checks passed"
echo "🚀 Safe to proceed with migration"
echo ""
echo "Next step:"
echo "  npx prisma migrate dev --name your_migration_name"
echo ""
