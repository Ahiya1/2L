# Production Deployment Guide

This guide covers deploying AI Mafia to Railway with PostgreSQL.

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- Anthropic API key
- Git repository pushed to GitHub/GitLab

## Railway Setup

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

Or use npm script:
```bash
npx @railway/cli
```

### 2. Create New Project

#### Option A: Via Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect Next.js and PostgreSQL

#### Option B: Via CLI

```bash
# Login to Railway
railway login

# Initialize project
railway init

# Link to your repository
railway link
```

### 3. Add PostgreSQL Database

1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will automatically:
   - Create PostgreSQL 14 instance
   - Set `DATABASE_URL` environment variable
   - Link database to your app

### 4. Configure Environment Variables

In Railway dashboard, go to your app → "Variables" → Add the following:

**Required Variables:**

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

**Optional Variables (with defaults):**

```env
LOG_LEVEL=info
COST_SOFT_LIMIT=5.0
COST_HARD_LIMIT=10.0
```

**Auto-configured by Railway:**

```env
DATABASE_URL=postgresql://...  # Automatically set when you add PostgreSQL
PORT=3000                       # Automatically set by Railway
```

### 5. Deploy

Railway will automatically deploy when you push to your main branch.

**Manual deployment:**

```bash
railway up
```

**Check deployment status:**

```bash
railway status
```

**View logs:**

```bash
railway logs
```

## Database Migration

### Automatic Migration (Production)

The Railway build command automatically runs:

```bash
npx prisma migrate deploy
```

This applies all pending migrations to your production database.

### Manual Migration (if needed)

```bash
# Connect to Railway environment
railway run npx prisma migrate deploy

# Open Prisma Studio (production database)
railway run npx prisma studio
```

### Migration Workflow

1. **Development:** Create migration locally
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

2. **Commit:** Add migration files to git
   ```bash
   git add prisma/migrations
   git commit -m "Add database migration"
   ```

3. **Deploy:** Push to trigger Railway deployment
   ```bash
   git push origin main
   ```

4. **Verify:** Check health endpoint
   ```bash
   curl https://your-app.railway.app/api/health
   ```

## Verification Checklist

### Post-Deployment Verification

1. **Health Check:** Visit `/api/health`
   ```bash
   curl https://your-app.railway.app/api/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-10-13T12:00:00.000Z",
     "checks": {
       "database": "connected",
       "apiKey": "configured"
     },
     "version": "0.1.0",
     "environment": "production"
   }
   ```

2. **Database Connection:** Check Railway logs
   ```bash
   railway logs | grep "database"
   ```

3. **Full Game Test:** Create and run a test game
   - Navigate to your Railway URL
   - Create game → Start game
   - Verify game completes without errors

4. **Monitoring:** Check Railway metrics
   - CPU usage (<50% normal)
   - Memory usage (<200MB normal)
   - Response time (<500ms normal)

### Common Issues

**Issue: Build fails with Prisma error**

Solution: Ensure `prisma` is in devDependencies and migrations are committed:
```bash
npm install --save-dev prisma
git add prisma/migrations
git commit -m "Add migrations"
git push
```

**Issue: Health check fails (database: disconnected)**

Solution: Verify DATABASE_URL is set:
```bash
railway variables
```

If missing, re-add PostgreSQL service in Railway dashboard.

**Issue: API key invalid**

Solution: Check ANTHROPIC_API_KEY format:
```bash
railway variables | grep ANTHROPIC
```

Must start with `sk-ant-api03-`.

**Issue: Application not starting**

Solution: Check Railway logs:
```bash
railway logs
```

Common causes:
- Missing environment variables
- Database migration failed
- Build command failed

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-api03-...` |
| `NODE_ENV` | Node environment | `production` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://your-app.railway.app` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `COST_SOFT_LIMIT` | Warning threshold per game ($) | `5.0` |
| `COST_HARD_LIMIT` | Abort threshold per game ($) | `10.0` |

### Auto-configured

| Variable | Description | Set By |
|----------|-------------|--------|
| `PORT` | Application port | Railway |
| `RAILWAY_ENVIRONMENT` | Environment name | Railway |
| `RAILWAY_PROJECT_ID` | Project identifier | Railway |

## Database Schema

### Current Schema (PostgreSQL)

The application uses PostgreSQL with the following tables:

- `Game` - Game state and metadata
- `Player` - Agent players (name, role, personality, status)
- `DiscussionMessage` - Public discussion messages
- `NightMessage` - Private Mafia coordination messages
- `Vote` - Voting records with justifications
- `GameEvent` - Phase transitions and eliminations
- `SharedGame` - Shareable game links (Iteration 3)

### Indexes (Production Optimized)

- `Game`: `(status, createdAt)` - Game listing queries
- `DiscussionMessage`: `(gameId, timestamp)` - Full game history
- `Player`: `(gameId, isAlive, role)` - Alive player queries (voting phase)

## Cost Monitoring

### Expected Costs

**Railway Costs:**
- Hobby Plan: $5/month (includes app + PostgreSQL + SSL + metrics)
- Autoscaling: $0.000231/GB-hour (memory), $0.000463/vCPU-hour

**Anthropic API Costs:**
- ~$1.25-$2 per game (with 70% cache hit rate)
- ~$5-$10 per game (without caching)

**Total Monthly (Light Usage):**
- Railway: $5/month
- API: ~$25/month (10 games/week)
- **Total: ~$30/month**

### Cost Circuit Breaker

The application automatically aborts games exceeding:
- **Soft limit:** $5/game (warning logged, game continues)
- **Hard limit:** $10/game (game aborted, error returned)

Configure via environment variables:
```env
COST_SOFT_LIMIT=5.0
COST_HARD_LIMIT=10.0
```

## Rollback Procedure

### Rollback to Previous Deployment

1. **Via Railway Dashboard:**
   - Go to Deployments tab
   - Click "Rollback" on previous deployment

2. **Via CLI:**
   ```bash
   railway rollback
   ```

### Rollback Database Migration

**Warning:** Database rollbacks can cause data loss. Test in staging first.

1. **Revert migration files:**
   ```bash
   git revert <commit-with-migration>
   git push
   ```

2. **Manual rollback (if needed):**
   ```bash
   # Connect to production database
   railway run npx prisma studio

   # Manually revert schema changes
   # Or restore from PostgreSQL backup
   ```

## Monitoring & Logs

### Railway Metrics Dashboard

Access via Railway dashboard → your app → "Metrics"

**Key Metrics:**
- CPU usage (target: <50%)
- Memory usage (target: <200MB)
- Request count (monitor spikes)
- Response time (target: <500ms p95)

### Structured Logs

View logs in Railway dashboard or via CLI:

```bash
# All logs
railway logs

# Follow logs (real-time)
railway logs -f

# Filter by level
railway logs | grep error
railway logs | grep warn

# Filter by gameId
railway logs | grep "gameId\":\"abc123"
```

### Log Structure (JSON)

```json
{
  "level": "info",
  "time": 1697123456789,
  "gameId": "clxyz123",
  "playerId": "player-1",
  "phase": "DISCUSSION",
  "roundNumber": 2,
  "msg": "Agent generated response"
}
```

## Scaling Considerations

### Current Limits (Single Instance)

- **Concurrent games:** 1 (sequential execution)
- **Players per game:** 8-12 agents
- **Memory:** ~150-200MB per game
- **Duration:** ~30-45 minutes per game

### Future Scaling (Stage 2)

When concurrent games are needed:

1. **Database:** Add connection pooling (PgBouncer)
2. **Redis:** Add for distributed caching (Upstash)
3. **Horizontal scaling:** Multiple Railway instances
4. **Rate limiting:** Add Upstash rate limiting

Not needed for Stage 1 (single game at a time).

## Troubleshooting

### Health Check Returns 500

1. Check database connection:
   ```bash
   railway run npx prisma studio
   ```

2. Verify environment variables:
   ```bash
   railway variables
   ```

3. Check logs for errors:
   ```bash
   railway logs | grep error
   ```

### Deployment Fails

1. Check build logs:
   ```bash
   railway logs --deployment <deployment-id>
   ```

2. Verify `railway.json` configuration:
   ```bash
   cat railway.json
   ```

3. Test build locally:
   ```bash
   npm install
   npx prisma migrate deploy
   npm run build
   ```

### Application Crashes

1. Check memory usage (Railway dashboard)
   - If >512MB: Upgrade Railway plan
   - If consistent: Investigate memory leak

2. Check for API errors:
   ```bash
   railway logs | grep "Anthropic API"
   ```

3. Verify cost limits not exceeded:
   ```bash
   railway logs | grep "cost limit"
   ```

## Next Steps

After successful deployment:

1. **Test game:** Run full game playthrough
2. **Monitor costs:** Check Anthropic API usage
3. **Set alerts:** Configure Railway alerts for crashes
4. **Backup:** Enable Railway database backups (Pro plan)
5. **Custom domain:** Add custom domain (optional)

## Support

**Railway Issues:**
- Documentation: [docs.railway.app](https://docs.railway.app)
- Discord: [railway.app/discord](https://railway.app/discord)

**Application Issues:**
- Check logs: `railway logs`
- Health check: `/api/health`
- Troubleshooting guide: `docs/troubleshooting.md`

**API Issues:**
- Anthropic status: [status.anthropic.com](https://status.anthropic.com)
- API docs: [docs.anthropic.com](https://docs.anthropic.com)
