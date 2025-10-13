#!/bin/bash
###############################################################################
# Rollback to SQLite Script
#
# This script reverts the PostgreSQL migration and restores SQLite database.
#
# Usage:
#   bash scripts/rollback-to-sqlite.sh
###############################################################################

set -e  # Exit on error

echo "🔄 Rolling back to SQLite..."
echo ""

# Check if we're in the app directory
if [ ! -f "prisma/schema.prisma" ]; then
  echo "❌ Error: Must run from app directory"
  exit 1
fi

# 1. Stop Supabase Local
echo "⏸️  Stopping Supabase Local..."
if command -v supabase &> /dev/null; then
  supabase stop || true
  echo "   ✅ Supabase stopped"
else
  echo "   ⚠️  Supabase CLI not found, skipping"
fi
echo ""

# 2. Restore SQLite migrations
echo "📁 Restoring SQLite migrations..."
if [ -d "prisma/migrations.sqlite.backup" ]; then
  rm -rf prisma/migrations
  mv prisma/migrations.sqlite.backup prisma/migrations
  echo "   ✅ SQLite migrations restored"
else
  echo "   ⚠️  No backup found at prisma/migrations.sqlite.backup"
fi
echo ""

# 3. Update schema.prisma
echo "📝 Updating schema.prisma..."
sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
echo "   ✅ Provider changed to sqlite"
echo ""

# 4. Update .env
echo "📝 Updating .env..."
if [ -f ".env" ]; then
  sed -i 's|DATABASE_URL="postgresql://.*|DATABASE_URL="file:./dev.db"|' .env
  echo "   ✅ DATABASE_URL updated"
else
  echo "   ⚠️  .env file not found"
fi
echo ""

# 5. Verify SQLite backup exists
echo "🔍 Checking SQLite database backup..."
if [ -f "prisma/dev.db.sqlite.backup" ]; then
  echo "   ✅ Backup found: prisma/dev.db.sqlite.backup"
  echo "   ℹ️  Original SQLite database still intact at prisma/dev.db"
else
  echo "   ⚠️  No backup found, but original db might still exist"
fi
echo ""

# 6. Regenerate Prisma Client
echo "🔧 Regenerating Prisma Client for SQLite..."
npx prisma generate
echo ""

echo "✅ Rollback complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify database: npx prisma studio"
echo "   2. Test application: npm run dev"
echo "   3. If needed, you can still access PostgreSQL backup in data-backup.json"
echo ""
