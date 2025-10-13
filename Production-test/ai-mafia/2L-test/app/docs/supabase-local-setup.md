# Supabase Local Setup Guide

This guide explains how to set up and use Supabase Local for PostgreSQL development in the AI Mafia project.

## Overview

**Previous Setup:** SQLite for development, PostgreSQL for production
**Current Setup:** PostgreSQL (via Supabase Local) for both development and production

**Why the change?**
- Eliminates schema drift between dev and production
- SQLite migrations use PRAGMA statements incompatible with PostgreSQL
- Consistent database behavior across environments
- Better tooling with Supabase Studio

## Prerequisites

- **Docker** (v20.10+) - Required for Supabase containers
- **Supabase CLI** (v2.48.3+) - Install: https://supabase.com/docs/guides/cli/getting-started

Verify installation:
```bash
docker --version
supabase --version
```

## Quick Start

### 1. Start Supabase Local

```bash
cd app/
supabase start
```

This will start:
- PostgreSQL database (port 54322)
- Supabase Studio (port 54323)
- API services (port 54321)

**Important:** Keep this terminal running or use `tmux`/`screen` for persistent sessions.

### 2. Connection Details

After `supabase start`, you'll see:

```
Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

The `.env` file is already configured with these settings.

### 3. Run Migrations

If starting fresh:
```bash
npx prisma migrate dev
```

If migrations already exist (they do after setup):
```bash
npx prisma migrate deploy
```

### 4. Verify Setup

```bash
# Check database connection
npx prisma studio

# Or verify with code
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); async function check() { const games = await prisma.game.count(); console.log('Games:', games); await prisma.\$disconnect(); } check();"
```

## Daily Usage

### Starting Your Dev Session

```bash
# 1. Start Supabase (if not already running)
supabase start

# 2. Start your dev server
npm run dev
```

### Stopping Services

```bash
# Stop development server (Ctrl+C in terminal)

# Stop Supabase
supabase stop
```

**Note:** Data persists in Docker volumes even after stopping.

### Accessing Supabase Studio

Open http://localhost:54323 in your browser to:
- Browse tables and data
- Run SQL queries
- Manage database schema
- View logs

## Migration Workflow

### Creating New Migrations

```bash
# 1. Modify prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_name

# This will:
# - Generate SQL migration files
# - Apply migration to database
# - Regenerate Prisma Client
```

### Applying Existing Migrations

```bash
# Development (with prompts)
npx prisma migrate dev

# Production (no prompts)
npx prisma migrate deploy
```

### Resetting Database

```bash
# ⚠️ WARNING: This deletes ALL data
npx prisma migrate reset

# Or manually:
supabase db reset
```

## Data Management

### Exporting Data

```bash
npx tsx scripts/export-sqlite-data.ts
# Creates: data-backup.json
```

### Importing Data

```bash
npx tsx scripts/import-data.ts
# Reads: data-backup.json
```

### Manual Backup

```bash
# Backup using pg_dump
supabase db dump -f backup.sql

# Restore
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" < backup.sql
```

## Rollback to SQLite

If you need to revert to SQLite:

```bash
bash scripts/rollback-to-sqlite.sh
```

This will:
1. Stop Supabase
2. Restore SQLite migrations
3. Update schema.prisma to use SQLite
4. Update .env to point to dev.db
5. Regenerate Prisma Client

Your original SQLite database is backed up at:
- `prisma/dev.db` (original, untouched)
- `prisma/dev.db.sqlite.backup` (safety copy)

## Common Issues & Solutions

### Issue: Port Already in Use

**Error:**
```
Bind for 0.0.0.0:54322 failed: port is already allocated
```

**Solution:**
```bash
# Stop conflicting Supabase project
supabase stop --project-id <other-project>

# Or stop all Docker containers
docker stop $(docker ps -q)

# Then restart
supabase start
```

### Issue: Connection Refused

**Error:**
```
Can't reach database server at `127.0.0.1:54322`
```

**Solution:**
```bash
# Check if Supabase is running
supabase status

# If not running, start it
supabase start

# Check Docker containers
docker ps | grep supabase
```

### Issue: Migration Failed

**Error:**
```
Migration failed: <some error>
```

**Solution:**
```bash
# 1. Check migration file in prisma/migrations/
# 2. Fix SQL errors
# 3. Delete failed migration folder
rm -rf prisma/migrations/<failed-migration-name>

# 4. Recreate migration
npx prisma migrate dev --name fixed_migration
```

### Issue: Schema Drift Detected

**Error:**
```
Your database is not in sync with your migration files
```

**Solution:**
```bash
# Option 1: Reset and reapply
npx prisma migrate reset

# Option 2: Mark as applied
npx prisma migrate resolve --applied <migration-name>

# Option 3: Generate new baseline
npx prisma migrate dev --name sync_baseline
```

## Architecture

### Directory Structure

```
app/
├── supabase/
│   ├── config.toml          # Supabase configuration
│   └── migrations/          # Supabase migrations (auto-generated)
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Prisma migrations
│   └── dev.db*              # SQLite backups (legacy)
├── scripts/
│   ├── export-sqlite-data.ts
│   ├── import-data.ts
│   └── rollback-to-sqlite.sh
└── docs/
    └── supabase-local-setup.md
```

### Connection URLs

**Development (Supabase Local):**
```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**Production (Railway):**
```
postgresql://postgres:<password>@<host>:<port>/<database>
```

Set in Railway environment variables.

## Best Practices

### 1. Keep Supabase Running During Development

Start Supabase once at beginning of day:
```bash
supabase start
```

Leave it running. Docker manages resources efficiently.

### 2. Always Test Migrations

```bash
# Test in development first
npx prisma migrate dev --name test_feature

# Review generated SQL
cat prisma/migrations/<timestamp>_test_feature/migration.sql

# Only deploy to production after thorough testing
```

### 3. Backup Before Major Changes

```bash
# Before schema changes
npx tsx scripts/export-sqlite-data.ts

# Or use pg_dump
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### 4. Use Transactions for Data Scripts

When writing data import/export scripts:
```typescript
await prisma.$transaction(async (tx) => {
  // All operations here are atomic
  await tx.game.create({ ... });
  await tx.player.createMany({ ... });
});
```

### 5. Monitor Database Size

```bash
# Check database size
supabase db size

# Check table sizes
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "SELECT pg_size_pretty(pg_database_size('postgres'));"
```

## Performance Tips

### 1. Connection Pooling

Prisma handles connection pooling automatically. Default pool size: 10 connections.

To adjust (if needed):
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres?connection_limit=20"
```

### 2. Query Optimization

Use Prisma Studio to:
- Verify indexes are used
- Check slow queries
- Monitor table stats

### 3. Development vs Production

Development (Supabase Local):
- Smaller dataset
- Faster query times
- No connection limits

Production (Railway):
- Full dataset
- Connection pool limits
- Monitor costs

## Troubleshooting Commands

```bash
# Check Supabase status
supabase status

# View Supabase logs
supabase logs

# Restart Supabase
supabase stop && supabase start

# Clear all data (⚠️ destructive)
supabase db reset

# Check Prisma connection
npx prisma db pull

# Validate schema
npx prisma validate

# Format schema
npx prisma format
```

## Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase Studio Guide](https://supabase.com/docs/guides/platform/studio)

## Support

For issues or questions:
1. Check this documentation
2. Review error messages carefully
3. Check Supabase logs: `supabase logs`
4. Consult Supabase Discord or GitHub issues
5. Use rollback script if needed: `bash scripts/rollback-to-sqlite.sh`

---

**Last Updated:** October 2025 (Iteration 4)
**Migration Completed:** Successfully migrated 9 games, 86 players, 43 messages from SQLite
