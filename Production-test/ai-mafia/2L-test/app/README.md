# AI Mafia - Stage 1: Discussion Phase

An experimental AI game where 8-12 Claude 4.5 Sonnet agents autonomously play Mafia while spectators watch.

## Project Status

**Iteration 1 - Foundation & Discussion Core**

Building the Discussion phase in isolation to validate that Claude agents can engage in strategic, multi-turn Mafia conversation.

## Setup

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Add your Anthropic API key to .anthropic-key.txt
echo "sk-ant-your-key-here" > .anthropic-key.txt

# Start Supabase Local (PostgreSQL)
supabase start

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Database Setup

**⚠️ Updated in Iteration 4:** The project now uses **PostgreSQL** via **Supabase Local** for development (previously SQLite).

**Why the change?**
- Eliminates schema drift between dev (SQLite) and production (PostgreSQL)
- Consistent database behavior across environments
- Better tooling with Supabase Studio

**Database Schema:**
- **games** - Game state, status, phase timing
- **players** - Agent names, roles, personalities, alive status
- **discussion_messages** - All agent statements, threading, timestamps
- **votes** - Voting records with justifications
- **game_events** - Phase transitions, eliminations

**Detailed Setup Guide:** See [docs/supabase-local-setup.md](docs/supabase-local-setup.md) for:
- Prerequisites (Docker, Supabase CLI)
- Connection details
- Migration workflow
- Rollback procedures
- Troubleshooting

### Development

```bash
# Start Next.js dev server
npm run dev

# Open browser
open http://localhost:3000

# Run Prisma Studio (database GUI)
npx prisma studio
```

## Project Structure

```
ai-mafia/
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── lib/
│   │   ├── db/              # Database utilities
│   │   ├── agent/           # Agent management (Builder-2)
│   │   ├── claude/          # Claude API integration (Builder-2)
│   │   ├── discussion/      # Discussion orchestrator (Builder-3)
│   │   ├── prompts/         # System prompts (Builder-2)
│   │   ├── events/          # Event emitter (Builder-3)
│   │   └── types/           # Shared types
│   ├── cli/                 # CLI test harness (Builder-4)
│   └── utils/               # Utilities
├── app/                     # Next.js App Router pages
├── components/              # React components (Builder-4)
├── logs/                    # Test transcripts
└── docs/                    # Documentation
```

## Technology Stack

- **Framework:** Next.js 14.2.18 (App Router)
- **Language:** TypeScript 5.6.3 (strict mode)
- **Database:** PostgreSQL 15.x + Prisma 6.17.1 (via Supabase Local)
- **AI Model:** Claude 4.5 Sonnet (`claude-sonnet-4.5-20250929`)
- **SDK:** @anthropic-ai/sdk 0.65.0
- **Styling:** Tailwind CSS 3.4.17
- **Real-time:** Server-Sent Events (SSE)

## Builder Status

- [x] **Builder-1:** Project Setup & Database Schema (COMPLETE)
- [ ] **Builder-2:** AI Agent Orchestration & Claude Integration
- [ ] **Builder-3:** Discussion Phase Orchestrator
- [ ] **Builder-4:** CLI Test Harness & Basic UI

## Testing

Test game seeding:

```typescript
import { seedTestGame, getDefaultTestConfig } from '@/lib/db/seed';

// Create test game with 10 agents (3 Mafia, 7 Villagers)
const gameId = await seedTestGame(getDefaultTestConfig());
```

## Production Deployment

### Quick Start (Railway)

1. **Create Railway Project:**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Add PostgreSQL Database:**
   - In Railway dashboard: New → Database → PostgreSQL
   - `DATABASE_URL` is automatically configured

3. **Set Environment Variables:**
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-app.railway.app
   ```

4. **Deploy:**
   ```bash
   git push origin main
   # Railway auto-deploys on push
   ```

5. **Verify:**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

### Database Migration

The application automatically runs `prisma migrate deploy` during Railway builds.

**Manual migration:**
```bash
railway run npx prisma migrate deploy
```

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection (auto-set by Railway)
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `NODE_ENV` - Set to `production`
- `NEXT_PUBLIC_APP_URL` - Your Railway app URL

**Optional:**
- `LOG_LEVEL` - Logging verbosity (default: `info`)
- `COST_SOFT_LIMIT` - Warning threshold per game in $ (default: `5.0`)
- `COST_HARD_LIMIT` - Abort threshold per game in $ (default: `10.0`)

### Health Check

The `/api/health` endpoint monitors:
- Database connectivity
- API key configuration
- Application version

**Expected Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "connected",
    "apiKey": "configured"
  },
  "version": "0.1.0",
  "environment": "production"
}
```

### Monitoring

**Railway Dashboard provides:**
- CPU and memory usage
- Request counts and response times
- Structured logs (JSON format via Pino)
- Automatic alerting for crashes

**Cost Monitoring:**
- Railway: ~$5/month (Hobby plan)
- Anthropic API: ~$1.25-$2 per game (with caching)
- Cost circuit breaker aborts games exceeding $10

### Complete Documentation

See [docs/deployment.md](docs/deployment.md) for:
- Detailed setup instructions
- Environment variable reference
- Database migration workflow
- Troubleshooting guide
- Rollback procedures
- Scaling considerations

## License

MIT
