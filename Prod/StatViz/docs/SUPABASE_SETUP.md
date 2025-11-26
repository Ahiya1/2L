# Supabase Setup Guide

StatViz uses Supabase for both local development and production database.

## Local Development Setup

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://deb.supabase.com/supabase-cli.gpg | sudo gpg --dearmor -o /usr/share/keyrings/supabase-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/supabase-archive-keyring.gpg] https://deb.supabase.com stable main" | sudo tee /etc/apt/sources.list.d/supabase.list
sudo apt update && sudo apt install supabase

# Windows (via npm)
npm install -g supabase
```

### 2. Initialize Supabase (Already Done)

```bash
# This creates the supabase/ directory
supabase init
```

### 3. Start Local Supabase

```bash
# Start all Supabase services (Postgres on port 54322)
supabase start

# This will output:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://localhost:54323
```

**Copy the DB URL to your `.env` file:**
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

### 4. Run Prisma Migrations

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase local
npm run db:push

# OR run migrations
npm run db:migrate
```

### 5. Seed Test Data

```bash
npm run db:seed
```

### 6. Access Supabase Studio

Open http://localhost:54323 to view your local database with a GUI.

## Production Setup (Supabase Cloud)

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization and name: `statviz-prod`
4. Select region: **Europe (Ireland)** or closest to Israel
5. Generate strong database password (save it securely)
6. Wait for project to provision (~2 minutes)

### 2. Get Connection String

1. Go to Project Settings → Database
2. Copy the "Connection Pooling" string (port 6543)
3. Replace `[YOUR-PASSWORD]` with your database password

**Example:**
```
postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### 3. Update Environment Variables

**For Vercel deployment:**
```bash
# Set DATABASE_URL in Vercel dashboard
vercel env add DATABASE_URL production
# Paste the Supabase connection string
```

**For local .env (production testing):**
```env
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

### 4. Run Migrations on Production

```bash
# Push schema to Supabase Cloud
npm run db:push

# OR run migrations
npm run db:migrate
```

### 5. Seed Production Data (Optional)

```bash
# Only if you want test data in production
npm run db:seed
```

## Supabase vs Direct Prisma Migrations

**Recommended approach: Use Prisma migrations directly**

Supabase has its own migration system, but since we're using Prisma:
- Keep `prisma/migrations/` as source of truth
- Run `npx prisma migrate deploy` for production
- Supabase just provides the PostgreSQL database

**Optional:** Link Prisma migrations to Supabase
```bash
# After creating Prisma migration
supabase db diff --schema public

# Apply Supabase migration
supabase db push
```

## Common Commands

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Reset local database (WARNING: deletes all data)
supabase db reset

# View logs
supabase logs

# Check status
supabase status

# Access Postgres directly
supabase db psql
```

## Troubleshooting

### Port 54322 already in use
```bash
# Stop Supabase
supabase stop

# Check what's using the port
lsof -i :54322

# Kill the process or change port
```

### Prisma schema out of sync
```bash
# Pull current schema from database
npx prisma db pull

# Push schema to database
npx prisma db push
```

### Connection refused
```bash
# Make sure Supabase is running
supabase status

# Restart Supabase
supabase stop && supabase start
```

## Supabase Features Used

- **PostgreSQL 14+**: Core database
- **Connection Pooling**: Port 6543 for production (PgBouncer)
- **Direct Connection**: Port 5432 for migrations
- **Studio**: Web UI for database management
- **Edge Functions**: (Future) Could replace some API routes

## Not Using (For Now)

- Supabase Auth (using custom JWT)
- Supabase Storage (using local filesystem → S3)
- Supabase Realtime (no real-time requirements)
- Supabase Edge Functions (using Next.js API routes)

We're using Supabase purely as a **managed PostgreSQL provider**.

## Cost Estimate

**Free Tier (Development/MVP):**
- 500 MB database storage
- Unlimited API requests
- Up to 50,000 monthly active users
- No credit card required

**Pro Tier (Production if needed):**
- $25/month
- 8 GB database storage
- Higher compute limits
- Point-in-time recovery (7 days)
- Daily backups

For StatViz MVP (~50 projects/month), **Free Tier is sufficient**.
