# AI Mafia - Setup Guide

Complete setup instructions for builders and developers.

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Anthropic API Key** (from https://console.anthropic.com/)

## Initial Setup

### 1. Install Dependencies

```bash
cd app
npm install
```

This installs all required dependencies:
- **Production:** Next.js, React, Anthropic SDK, Prisma Client, Zod, date-fns, nanoid
- **Development:** TypeScript, Prisma CLI, tsx, Tailwind CSS, Prettier, chalk, ora, string-similarity, csv-writer

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Create API key file (if not already in project root)
echo "sk-ant-your-actual-key-here" > .anthropic-key.txt
```

Edit `.env` and set `ANTHROPIC_API_KEY` if needed (or it will be loaded from `.anthropic-key.txt`).

### 3. Setup Database

```bash
# Run database migrations (creates dev.db)
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

This creates:
- `dev.db` - SQLite database file
- `dev.db-shm` - Shared memory file (WAL mode)
- `dev.db-wal` - Write-Ahead Log file (WAL mode)
- `node_modules/@prisma/client` - Generated Prisma client

### 4. Verify Setup

```bash
# Test database and seed function
npm run test:seed
```

Expected output:
```
=== Testing Database Setup ===

Clearing existing game data...
✓ All game data cleared

Creating test game...
✓ Test game created: [game-id]
✓ Players: 10 (3 Mafia, 7 Villagers)
✓ Roles assigned randomly

Player Roster:
  - Agent-A: VILLAGER (analytical)
  - Agent-B: MAFIA (aggressive)
  ...

✓ Database verification successful!
=== All Tests Passed! ===
```

## Development Workflow

### Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run db:studio

# Create new migration after schema changes
npm run db:migrate

# Regenerate Prisma client after schema changes
npm run db:generate
```

### TypeScript Compilation

```bash
# Check TypeScript errors without building
npx tsc --noEmit

# Build production bundle
npm run build
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"
```

## Project Structure

```
app/
├── prisma/
│   ├── schema.prisma              # Database schema (5 tables)
│   └── migrations/                # Auto-generated migration files
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts         # Prisma singleton
│   │   │   └── seed.ts           # Test game seeding
│   │   ├── types/
│   │   │   └── shared.ts         # Shared TypeScript types
│   │   ├── agent/                # Agent management (Builder-2)
│   │   ├── claude/               # Claude API integration (Builder-2)
│   │   ├── discussion/           # Discussion orchestrator (Builder-3)
│   │   ├── prompts/              # System prompts (Builder-2)
│   │   └── events/               # Event emitter (Builder-3)
│   ├── cli/
│   │   └── test-seed.ts          # Database test script
│   └── utils/                    # Shared utilities
├── app/                           # Next.js App Router pages
├── components/                    # React components (Builder-4)
├── logs/                          # Test transcripts (gitignored)
├── .env                           # Environment variables (gitignored)
├── .anthropic-key.txt            # API key (gitignored)
└── dev.db                         # SQLite database (gitignored)
```

## Database Schema Overview

### Tables

**games** - Game state and configuration
- id, status, currentPhase, phaseEndTime, roundNumber, winner, playerCount
- Indexes: [status], [createdAt]

**players** - Agent information and state
- id, gameId, name, role, personality, isAlive, position
- Indexes: [gameId, position], [gameId, isAlive], [gameId, role]

**discussion_messages** - All agent statements
- id, gameId, roundNumber, playerId, message, inReplyToId, timestamp, turn
- Indexes: [gameId, roundNumber, timestamp], [gameId, playerId], [inReplyToId]

**votes** - Voting records (Iteration 2)
- id, gameId, roundNumber, voterId, targetId, justification, timestamp
- Indexes: [gameId, roundNumber], [gameId, voterId], [gameId, targetId]

**game_events** - Phase transitions and events (Iteration 2)
- id, gameId, type, data (JSON), timestamp
- Indexes: [gameId, timestamp], [type, timestamp]

### Foreign Keys

All foreign keys use `onDelete: Cascade` - deleting a game deletes all related records.

## Common Tasks

### Create Test Game

```typescript
import { seedTestGame, getDefaultTestConfig } from '@/lib/db/seed';

// Create game with default config (10 players, 3 Mafia)
const gameId = await seedTestGame(getDefaultTestConfig());

// Create game with custom config
const gameId = await seedTestGame({
  playerCount: 8,
  mafiaCount: 2,
  personalities: ['analytical', 'aggressive', 'cautious'],
});
```

### Query Database

```typescript
import { prisma } from '@/lib/db/client';

// Get game with players
const game = await prisma.game.findUnique({
  where: { id: gameId },
  include: { players: true },
});

// Get all discussion messages
const messages = await prisma.discussionMessage.findMany({
  where: { gameId },
  include: { player: true },
  orderBy: { timestamp: 'asc' },
});
```

### Clear Database

```typescript
import { clearAllGames } from '@/lib/db/seed';

// Delete all game data
await clearAllGames();
```

## Troubleshooting

### "Cannot find module '@prisma/client'"

Run: `npm run db:generate`

### "Environment variable not found: DATABASE_URL"

Create `.env` file with `DATABASE_URL="file:./dev.db"`

### "SQLite database is locked"

Close all connections to database:
- Close Prisma Studio
- Stop dev server
- Kill any running Node processes

### TypeScript Errors After Schema Change

1. Run `npm run db:migrate`
2. Run `npm run db:generate`
3. Restart TypeScript server in your IDE

### Port Already in Use

Next.js will automatically try ports 3001, 3002, etc. Or specify port:
```bash
PORT=3005 npm run dev
```

## Next Steps

- **Builder-2:** Implement Claude API integration and agent orchestration
- **Builder-3:** Build Discussion phase orchestrator
- **Builder-4:** Create CLI test harness and basic web UI

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
