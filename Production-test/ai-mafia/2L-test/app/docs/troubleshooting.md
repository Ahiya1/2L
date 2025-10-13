# Troubleshooting Guide

## Common Issues and Solutions

### 1. API Key Not Found

**Symptoms:**
- Error: `Anthropic API key not found`
- Application fails to start
- Agent responses fail

**Causes:**
- Missing `.anthropic-key.txt` file
- Empty or invalid API key
- Environment variable not set

**Solutions:**

1. **Create API key file:**
   ```bash
   echo "sk-ant-api03-YOUR-KEY-HERE" > .anthropic-key.txt
   ```

2. **Or set environment variable:**
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-api03-YOUR-KEY-HERE"
   ```

3. **Verify key format:**
   - Must start with `sk-ant-api03-`
   - Should be ~100 characters long
   - No whitespace or newlines

4. **Check file permissions:**
   ```bash
   chmod 600 .anthropic-key.txt  # Read/write for owner only
   ```

### 2. Cache Hit Rate Below 70%

**Symptoms:**
- Logs show cache hit rate <70%
- Higher costs than expected ($1.25+ per game)
- Warning in cost summary

**Causes:**
- System prompts changing between turns
- Cache TTL expired (5 minutes)
- Game state context too dynamic
- Turns spaced >5 minutes apart

**Solutions:**

1. **Check prompt stability:**
   ```typescript
   // Ensure system prompts are identical between turns
   // Cache only works if text is EXACTLY the same
   ```

2. **Reduce turn delays:**
   ```bash
   # Keep discussion phase under 5 minutes total
   # Default: 3 minutes is optimal
   ```

3. **Monitor with logs:**
   ```bash
   # Check logs for cache statistics
   grep "cacheHitRate" logs/production.log
   ```

4. **Expected rates by phase:**
   - First turn: 0% (cache creation)
   - Turns 2-5: 70-80% (cache hits)
   - Overall game: 60-75% average

### 3. Agent Timeout / Fallback

**Symptoms:**
- Message: "Agent carefully observes the others' reactions"
- Log: `Agent timed out, using fallback`
- Turn duration >10 seconds

**Causes:**
- Claude API slow response
- Network latency
- Rate limiting (429 errors)
- Server errors (500+)

**Solutions:**

1. **Check Claude API status:**
   - Visit: https://status.anthropic.com
   - Look for ongoing incidents

2. **Review rate limits:**
   ```bash
   # Check logs for 429 errors
   grep "Rate limited" logs/production.log
   ```

3. **Increase timeout (if needed):**
   ```typescript
   // In claude/client.ts
   timeoutMs: 15000  // Increase from 10s to 15s
   ```

4. **Monitor retry attempts:**
   ```bash
   # Check how many retries before fallback
   grep "Attempt" logs/production.log
   ```

### 4. SSE Connection Drops

**Symptoms:**
- "Connection lost" error in UI
- Messages stop appearing
- Logs: `SSE connection error`
- Falls back to polling

**Causes:**
- Server restart
- Network interruption
- Proxy/load balancer timeout
- Browser tab backgrounded

**Solutions:**

1. **Check server logs:**
   ```bash
   # Look for connection errors
   tail -f logs/production.log | grep SSE
   ```

2. **Verify endpoint accessibility:**
   ```bash
   curl -N http://localhost:3000/api/game/{gameId}/stream
   ```

3. **Increase SSE timeout (Railway/Vercel):**
   ```json
   // railway.json
   {
     "deploy": {
       "healthcheckTimeout": 300
     }
   }
   ```

4. **Exponential backoff reconnection:**
   - Automatically retries: 1s, 2s, 4s, 8s, 16s
   - Falls back to polling after 5 failures
   - Check UI for reconnection indicator

### 5. Database Locked (SQLite WAL)

**Symptoms:**
- Error: `SQLITE_BUSY: database is locked`
- Writes fail during concurrent access
- Development only (not production PostgreSQL)

**Causes:**
- Multiple processes accessing SQLite
- Long-running transactions
- WAL mode not enabled

**Solutions:**

1. **Enable WAL mode:**
   ```bash
   sqlite3 prisma/dev.db "PRAGMA journal_mode=WAL;"
   ```

2. **Check for zombie processes:**
   ```bash
   # Kill any lingering dev servers
   killall node
   npm run dev
   ```

3. **Prisma Studio running?**
   ```bash
   # Close Prisma Studio if open
   # It holds a connection to the database
   ```

4. **Use PostgreSQL for production:**
   ```bash
   # SQLite is for dev only
   # Deploy to Railway with PostgreSQL
   ```

### 6. Cost Limit Exceeded

**Symptoms:**
- Error: `Game {gameId} exceeded cost limit`
- Game aborts mid-discussion
- Logs: `Cost limit exceeded, aborting game`

**Causes:**
- Low cache hit rate (<50%)
- Too many turns (>40)
- Long discussion phase (>5 minutes)
- Hard limit set too low

**Solutions:**

1. **Check cost summary:**
   ```bash
   # Review cost breakdown
   grep "totalCost" logs/production.log
   ```

2. **Adjust hard limit:**
   ```bash
   # Set environment variable
   export COST_HARD_LIMIT=15.0  # Default: 10.0
   ```

3. **Optimize game settings:**
   ```typescript
   // Reduce discussion duration
   durationMinutes: 3  // Instead of 5
   totalRounds: 3      // Instead of 5
   ```

4. **Monitor soft limit warnings:**
   ```bash
   # Warnings at $5 (before abort at $10)
   grep "approaching limit" logs/production.log
   ```

### 7. Memory Usage High

**Symptoms:**
- Railway/Vercel OOM errors
- Process crashes after long games
- Logs: memory usage >200MB

**Causes:**
- Event accumulation
- Message history not paginated
- Cost tracker logs growing

**Solutions:**

1. **Check Railway metrics:**
   - Dashboard → Metrics → Memory
   - Look for spikes

2. **Paginate database queries:**
   ```typescript
   // Limit message history
   take: 50,  // Last 50 messages only
   ```

3. **Clear cost tracker per game:**
   ```typescript
   // After game over
   costTracker.clearGame(gameId);
   ```

4. **Monitor in production:**
   ```bash
   # Railway CLI
   railway logs --filter memory
   ```

### 8. Build Errors After Changes

**Symptoms:**
- `npm run build` fails
- TypeScript errors
- Import errors

**Causes:**
- Missing imports
- Type mismatches
- Circular dependencies

**Solutions:**

1. **Check TypeScript:**
   ```bash
   npx tsc --noEmit
   ```

2. **Regenerate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

4. **Check for logger imports:**
   ```bash
   # Ensure all files import from src/lib/logger
   grep -r "console\." src/
   ```

## Log Levels

### Development
```bash
LOG_LEVEL=debug npm run dev
```
- `debug`: Cache hits, query times, detailed tracing
- `info`: Normal operations, phase transitions
- `warn`: Recoverable issues, fallbacks
- `error`: Failures requiring attention

### Production
```bash
LOG_LEVEL=info  # Default
```
- Reduces noise
- Focuses on important events
- Better for Railway log aggregation

## Getting Help

### Check Logs First
```bash
# Development
tail -f logs/development.log

# Production (Railway)
railway logs --tail
```

### Structured Log Search
```bash
# Search by gameId
grep "gameId.*abc123" logs/production.log

# Search by error
grep "level.*error" logs/production.log

# Search by player
grep "playerId.*player-1" logs/production.log
```

### Common Log Patterns

**Successful turn:**
```json
{"level":"info","gameId":"abc","playerId":"p1","turn":5,"msg":"Executing turn"}
{"level":"info","gameId":"abc","playerId":"p1","cost":0.015,"msg":"Agent generated response"}
```

**Failed turn:**
```json
{"level":"error","gameId":"abc","playerId":"p1","error":"timeout","msg":"Agent timed out"}
{"level":"warn","gameId":"abc","playerId":"p1","msg":"Using fallback response"}
```

**Cost warning:**
```json
{"level":"warn","gameId":"abc","totalCost":5.2,"softLimit":5.0,"msg":"Game cost approaching limit"}
```

## Performance Benchmarks

### Expected Metrics
- **Turn duration:** 2-5 seconds (including Claude API call)
- **Discussion phase:** 3-5 minutes total
- **Full game:** 30-45 minutes (5 rounds)
- **Cost per game:** $1.25-2.00 (with 60-75% cache hit rate)
- **Memory usage:** 100-150MB average
- **SSE latency:** <500ms

### Red Flags
- Turn >10 seconds → API issues
- Cost >$5 → Cache problems
- Memory >200MB → Memory leak
- Cache hit rate <50% → Prompt instability

## Emergency Procedures

### Game Stuck?
```bash
# Check game status
curl http://localhost:3000/api/game/{gameId}/state

# Force complete
# (manually update database)
npx prisma studio
# Set game.status = 'GAME_OVER'
```

### API Key Compromised?
```bash
# 1. Revoke old key at console.anthropic.com
# 2. Generate new key
# 3. Update environment
export ANTHROPIC_API_KEY="new-key"
# 4. Restart server
```

### Database Corrupted (SQLite)?
```bash
# Reset development database
rm prisma/dev.db*
npx prisma migrate reset --force
npx prisma db push
```

### Production Down?
```bash
# Railway rollback
railway rollback

# Check health endpoint
curl https://your-app.railway.app/api/health
```
