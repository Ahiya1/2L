# Iteration 3: Builder Task Definitions

## Builder Task Allocation

### Builder-1: Production Deployment (PostgreSQL + Railway)
**Estimated Time:** 4-6 hours
**Complexity:** MEDIUM-HIGH
**Split Potential:** LOW (cohesive task)
**Dependencies:** None

#### Deliverables

1. **PostgreSQL Migration**
   - Update `prisma/schema.prisma`: Change `provider = "postgresql"`
   - Add production-specific indexes:
     - `Game`: `@@index([status, createdAt])`
     - `DiscussionMessage`: `@@index([gameId, timestamp])`
     - `Player`: `@@index([gameId, isAlive, role])`
   - Run migration: `npx prisma migrate dev --name postgresql_production`
   - Test locally with PostgreSQL (not SQLite)

2. **Railway Configuration**
   - Create `/railway.json` (deployment config)
   - Create `/railway.toml` (build settings)
   - Create `/.env.production.example` (template for env vars)
   - Add health check endpoint: `/app/api/health/route.ts`
   - Document environment variables needed

3. **SharedGame Database Model**
   - Add `SharedGame` model to schema:
     ```prisma
     model SharedGame {
       id        String   @id
       gameId    String   @unique
       createdAt DateTime @default(now())
       
       game Game @relation(fields: [gameId], references: [id])
       @@index([gameId])
     }
     ```
   - Run migration

4. **Deployment Documentation**
   - Create `/docs/deployment.md`:
     - Railway setup instructions
     - Environment variable checklist
     - Database migration steps
     - Production verification steps
   - Update `README.md` with deployment section

#### Acceptance Criteria

- ✅ Local PostgreSQL test passes (full game playthrough)
- ✅ Railway config files created and documented
- ✅ Health check endpoint returns 200 with database status
- ✅ Deployment documentation allows fresh setup
- ✅ Database migrations work on PostgreSQL

#### File Changes

**Modified:**
- `prisma/schema.prisma` (provider + indexes + SharedGame model)
- `README.md` (add deployment section)
- `package.json` (add migrate:deploy script)

**Created:**
- `railway.json`
- `railway.toml`
- `.env.production.example`
- `app/api/health/route.ts`
- `docs/deployment.md`

---

### Builder-2: Structured Logging + Error Handling
**Estimated Time:** 3-4 hours
**Complexity:** MEDIUM
**Split Potential:** LOW (systematic replacement)
**Dependencies:** None

#### Deliverables

1. **Pino Logger Setup**
   - Install dependencies: `pino`, `pino-pretty`
   - Create `/src/lib/logger.ts` (Pino singleton)
   - Configure environment-aware logging (pretty dev, JSON prod)
   - Create child loggers for modules (discussion, game, claude)

2. **Replace Console.log Statements**
   - Replace 178 console.log/warn/error calls with structured logger
   - Add context fields: `{ gameId, playerId, phase, roundNumber }`
   - Use appropriate log levels:
     - `debug`: Cache hits, query times
     - `info`: Phase transitions, agent responses
     - `warn`: Agent timeouts, fallbacks
     - `error`: API failures, database errors

3. **Cost Circuit Breaker**
   - Add `checkCostLimitOrThrow()` to `cost-tracker.ts`
   - Call before each Claude API request in `turn-executor.ts`
   - Hard limit: $10/game (configurable via env)
   - Soft warning: $5/game (log warning)

4. **Error Handling Improvements**
   - Add SSE reconnection logic to `GameEventsContext.tsx`
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s
   - Fallback to polling after 5 failures
   - Display connection status indicator in UI

5. **Troubleshooting Documentation**
   - Create `/docs/troubleshooting.md`:
     - Common issue: API key not found
     - Common issue: Cache hit rate <70%
     - Common issue: Agent timeout/fallback
     - Common issue: SSE connection drops
     - Common issue: Database locked (SQLite WAL)

#### Acceptance Criteria

- ✅ Zero console.log statements remaining (use grep to verify)
- ✅ All logs include context (gameId, playerId)
- ✅ Cost circuit breaker aborts game at $10
- ✅ SSE reconnects automatically after network failure
- ✅ Troubleshooting guide covers observed errors

#### File Changes

**Modified:**
- All files in `/src/lib/` (178 logging replacements)
- `src/utils/cost-tracker.ts` (add circuit breaker)
- `app/contexts/GameEventsContext.tsx` (SSE reconnection)
- `src/lib/discussion/turn-executor.ts` (cost check before API call)

**Created:**
- `src/lib/logger.ts`
- `docs/troubleshooting.md`

---

### Builder-3: UI/UX Polish (Threading, Colors, Avatars)
**Estimated Time:** 6-9 hours
**Complexity:** MEDIUM-HIGH
**Split Potential:** HIGH (could split into 2 sub-builders if needed)
**Dependencies:** None

#### Deliverables

1. **Conversation Threading (CSS Indentation)**
   - Update `DiscussionFeed.tsx`:
     - Calculate thread depth from `inReplyToId`
     - Apply CSS margin-left (16px per level, max 3 levels)
     - Add vertical line border for visual thread connection
   - Update hover behavior: Preview parent message on hover

2. **Message Type Color-Coding**
   - Create `/src/utils/message-classification.ts`:
     - `classifyMessage()`: Detect accusations, defenses, questions, alliances
     - `getMessageStyle()`: Return Tailwind classes for each type
   - Update `DiscussionFeed.tsx`: Apply color-coding to messages
   - Color scheme:
     - Accusations: `text-red-600 font-semibold`
     - Defenses: `text-blue-600`
     - Questions: `text-yellow-600`
     - Alliances: `text-green-600`
     - Neutral: `text-gray-900`

3. **Deterministic Avatars**
   - Create `/src/utils/avatar-colors.ts`:
     - `hashString()`: Hash player name to number
     - `getAvatarColor()`: Map hash to color (10 colors available)
   - Update `PlayerGrid.tsx`: Add avatar circles with initials
   - Update `DiscussionFeed.tsx`: Show avatar next to each message

4. **Enhanced Phase Indicator**
   - Update `PhaseIndicator.tsx`:
     - Add progress bar for phases with durations
     - Show turn count: "Turn 5 of 40"
     - Add phase descriptions: "Night: Mafia coordinates", "Discussion: Public debate"

5. **Message Timestamps**
   - Update `DiscussionFeed.tsx`:
     - Add relative timestamps: "2 minutes ago", "just now"
     - Use `date-fns` for formatting
     - Make timestamps subtle (gray, small text)

6. **Smooth Animations (Optional - if using framer-motion)**
   - Install `framer-motion`
   - Add fade-in animation to new messages
   - Add slide-in animation to phase transitions
   - Add typing indicator (animated dots)

#### Acceptance Criteria

- ✅ Threading visible (indentation + border lines)
- ✅ Message types color-coded correctly
- ✅ Avatars consistent across sessions (deterministic hash)
- ✅ Phase indicator shows progress and turn count
- ✅ Timestamps display relative time
- ✅ Animations smooth (if implemented)

#### File Changes

**Modified:**
- `app/components/DiscussionFeed.tsx` (threading, colors, avatars, timestamps)
- `app/components/PlayerGrid.tsx` (avatars)
- `app/components/PhaseIndicator.tsx` (progress bar, turn count)

**Created:**
- `src/utils/message-classification.ts`
- `src/utils/avatar-colors.ts`

---

### Builder-4: Prompt Engineering Expansion
**Estimated Time:** 2-3 hours
**Complexity:** MEDIUM
**Split Potential:** LOW (cohesive task)
**Dependencies:** None

#### Deliverables

1. **Expand Personalities (5 → 10)**
   - Update `/src/lib/prompts/system-prompts.ts`:
     - Add 5 new personality types:
       - `sarcastic`: Witty, uses irony
       - `diplomatic`: Mediator, seeks consensus
       - `emotional`: Reacts strongly, gut-based
       - `logical`: Hyper-rational, demands proof
       - `impulsive`: Quick to judge, changes mind
   - Write detailed descriptions (3-4 sentences each)
   - Include unique phrases per personality

2. **Enhanced Deception Tactics (Mafia)**
   - Expand from 6 to 10 tactics in `system-prompts.ts`:
     - Add: "Falsely accuse non-Mafia early to build credibility"
     - Add: "Create fake voting patterns (vote differently from Mafia allies)"
     - Add: "Mirror Villager analysis techniques (appear analytical)"
     - Add: "Redirect suspicion to most vocal Villagers"

3. **Enhanced Deduction Strategies (Villagers)**
   - Expand from 6 to 10 strategies in `system-prompts.ts`:
     - Add: "Track who deflects accusations (Mafia tactic)"
     - Add: "Identify players who defend each other (potential Mafia alliance)"
     - Add: "Analyze message timing (Mafia may hesitate before lying)"
     - Add: "Compare voting patterns to accusations (inconsistencies reveal Mafia)"

4. **Anti-Repetition Tracking**
   - Create `/src/utils/repetition-tracker.ts`:
     - `extractPhrases()`: Extract 3-word phrases from message
     - `addAgentMessage()`: Track last 3 messages per agent
     - `getProhibitedPhrases()`: Return phrases to avoid
   - Update `context-builder.ts`:
     - Add prohibited phrases to system prompt
     - "Don't repeat these exact phrases: [phrases]"

5. **Prompt Testing Recommendations**
   - Create `/docs/prompt-testing.md`:
     - A/B testing methodology (5 games old vs 5 games new)
     - Evaluation metrics (use `evaluate-transcript.ts`)
     - Rollback criteria (if <5/7 metrics pass)

#### Acceptance Criteria

- ✅ 10 personalities defined with unique descriptions
- ✅ 10 Mafia deception tactics documented
- ✅ 10 Villager deduction strategies documented
- ✅ Anti-repetition tracking functional (tested)
- ✅ Personality diversity metric >50% (measured)

#### File Changes

**Modified:**
- `src/lib/prompts/system-prompts.ts` (expand personalities, tactics, strategies)
- `src/lib/claude/context-builder.ts` (add anti-repetition phrases)

**Created:**
- `src/utils/repetition-tracker.ts`
- `docs/prompt-testing.md`

---

### Builder-5: Shareable URLs + Cost Dashboard
**Estimated Time:** 4-6 hours
**Complexity:** MEDIUM
**Split Potential:** MEDIUM (could split into 2 builders if needed)
**Dependencies:** Builder-1 (needs SharedGame model migration)

#### Deliverables

1. **Shareable URL Generation**
   - Create `/app/api/game/[gameId]/share/route.ts`:
     - POST endpoint: Generate share link after game over
     - Check if share already exists (return existing URL)
     - Create SharedGame record with nanoid(12)
     - Return share URL: `${APP_URL}/share/${shareId}`
   - Update `/app/game/[gameId]/results/page.tsx`:
     - Add "Share Game" button
     - Call `/api/game/[gameId]/share` on click
     - Display shareable URL (copy to clipboard)

2. **Shareable Game Page**
   - Create `/app/share/[shareId]/page.tsx`:
     - Fetch game data via shareId lookup
     - Display full transcript (messages, votes, roles revealed)
     - No navigation to lobby (standalone view)
     - Add Open Graph meta tags for social sharing:
       - `og:title`: "AI Mafia Game - {winner} won!"
       - `og:description`: "Watch AI agents play Mafia. {playerCount} players, {roundCount} rounds."
       - `og:image`: Generated thumbnail (optional)

3. **Cost Dashboard**
   - Create `/app/admin/costs/page.tsx`:
     - Display cost summary across all games
     - Table: gameId, playerCount, totalCost, cacheHitRate, duration
     - Alerts: Highlight games with cost >$5 or cache <70%
     - Filters: Sort by cost, filter by date range
     - Total spend counter
   - Create `/app/api/admin/costs/route.ts`:
     - Aggregate cost-tracker data by game
     - Return JSON: `{ games: [...], totalSpend, avgCacheHitRate }`

4. **Cost Monitoring Integration**
   - Update `cost-tracker.ts`:
     - Add `getAllGameSummaries()` method
     - Add `getAverageCacheHitRate()` method
   - Add real-time cost display to `/app/game/[gameId]/page.tsx`:
     - Collapsible "Cost Metrics" panel
     - Show: current game cost, cache hit rate, estimated total
     - Update via SSE events

#### Acceptance Criteria

- ✅ Share link generated after game over
- ✅ `/share/[shareId]` page loads full transcript
- ✅ Share page includes social meta tags
- ✅ Cost dashboard displays accurate data
- ✅ Games exceeding $5 or cache <70% highlighted
- ✅ Real-time cost metrics visible during game

#### File Changes

**Modified:**
- `app/game/[gameId]/results/page.tsx` (add share button)
- `app/game/[gameId]/page.tsx` (add cost metrics panel)
- `src/utils/cost-tracker.ts` (add aggregation methods)

**Created:**
- `app/api/game/[gameId]/share/route.ts`
- `app/share/[shareId]/page.tsx`
- `app/admin/costs/page.tsx`
- `app/api/admin/costs/route.ts`

---

### Builder-6: Replay Mode + Highlights (OPTIONAL)
**Estimated Time:** 6-8 hours
**Complexity:** MEDIUM-HIGH
**Split Potential:** HIGH (should split into 2 sub-builders)
**Dependencies:** Builder-5 (needs `/share/[shareId]` page)

#### Deliverables

1. **Timeline Scrubber Component**
   - Create `/app/components/Timeline.tsx`:
     - Horizontal timeline with phase markers
     - Clickable timeline (seek to any message)
     - Visual indicators for key events (eliminations, votes)
     - Progress bar shows current position
     - Zoom controls (fit all vs detailed view)

2. **Playback Controls**
   - Create `/app/components/PlaybackControls.tsx`:
     - Play/Pause button
     - Speed control dropdown (1x, 2x, 5x, 10x)
     - Skip to next phase button
     - Skip to next elimination button
     - Replay state management (useState for currentIndex, isPlaying)

3. **Replay Mode Integration**
   - Update `/app/share/[shareId]/page.tsx`:
     - Add Timeline component above message feed
     - Add PlaybackControls component
     - Implement auto-advance: `useEffect` with interval (2000ms / speed)
     - Sync message feed scroll with timeline position
     - Highlight current message in feed

4. **Highlight Reel Detection**
   - Create `/src/utils/highlight-detection.ts`:
     - `generateHighlights()`: Analyze game data, return HighlightMoment[]
     - Detect dramatic accusations (regex: "I think X is Mafia")
     - Detect close votes (<2 vote difference between top 2)
     - Detect eliminations (always include)
     - Detect clever Mafia lies (Mafia defends Mafia, post-game analysis)
     - Detect Villager deduction success (correct accusation → elimination)
   - Create `/app/components/HighlightReel.tsx`:
     - Collapsible panel above timeline
     - List 5-10 key moments with timestamps
     - Click to jump timeline to moment
     - Filter by importance (high only vs all)

5. **Replay Performance Optimization**
   - Use `useMemo` for highlight generation (expensive regex)
   - Use `useCallback` for playback handlers (stable references)
   - Lazy load timeline component (code split)

#### Acceptance Criteria

- ✅ Timeline shows all messages with phase markers
- ✅ Play/pause controls work smoothly
- ✅ Speed control changes playback rate
- ✅ Seeking (clicking timeline) jumps to correct message
- ✅ Highlight reel detects 5-10 key moments
- ✅ Clicking highlight jumps timeline correctly
- ✅ Performance acceptable (no lag with 200+ messages)

#### Split Recommendation

**Sub-builder-6A: Replay Mode** (4-5 hours)
- Timeline component
- Playback controls
- Integration with share page
- Auto-advance logic

**Sub-builder-6B: Highlight Reel** (2-3 hours)
- Highlight detection algorithm
- HighlightReel component
- Integration with timeline (seek on click)

#### File Changes

**Created:**
- `app/components/Timeline.tsx`
- `app/components/PlaybackControls.tsx`
- `app/components/HighlightReel.tsx`
- `src/utils/highlight-detection.ts`

**Modified:**
- `app/share/[shareId]/page.tsx` (add replay mode)

---

## Builder Dependencies Graph

```
Builder-1 (PostgreSQL + Railway)
   ↓
Builder-5 (Shareable URLs + Cost Dashboard) ← depends on SharedGame model
   ↓
Builder-6 (Replay Mode + Highlights) ← depends on /share/[shareId] page

Builder-2 (Structured Logging) ← independent
Builder-3 (UI/UX Polish) ← independent
Builder-4 (Prompt Engineering) ← independent
```

## Recommended Execution Order

### Phase 1 (Can run in parallel)
1. Builder-1 (PostgreSQL + Railway) - **Start first** (blocks Builder-5)
2. Builder-2 (Structured Logging)
3. Builder-3 (UI/UX Polish)
4. Builder-4 (Prompt Engineering)

### Phase 2 (After Builder-1 completes)
5. Builder-5 (Shareable URLs + Cost Dashboard)

### Phase 3 (Optional, after Builder-5)
6. Builder-6 (Replay Mode + Highlights) - **Split recommended**

## Builder Split Criteria

**When to SPLIT a builder:**
- Estimated time >6 hours
- Two distinct feature sets (e.g., Replay + Highlights)
- One feature can be deferred if timeline tight

**When to COMPLETE a builder:**
- Task is cohesive (e.g., PostgreSQL migration)
- Dependencies are minimal
- Features are tightly coupled

**Builder-6 Split Decision:**
- **IF** Phases 1-2 complete ahead of schedule → Execute as single builder
- **IF** Phases 1-2 on schedule or behind → Split into 6A (Replay) + 6B (Highlights)
- **IF** timeline very tight → DEFER Builder-6 entirely to Iteration 4

## Success Metrics Per Builder

**Builder-1:**
- Deployment to Railway succeeds
- Full game playthrough on production PostgreSQL
- Health check endpoint returns 200

**Builder-2:**
- Zero `console.log` statements (verified with grep)
- All logs include context (gameId, playerId)
- Cost circuit breaker aborts at $10

**Builder-3:**
- Threading visible (3-level indentation)
- Message colors correctly classified (>90% accuracy)
- Avatars deterministic (same name = same color)

**Builder-4:**
- 10 personalities implemented
- Anti-repetition reduces phrase repetition <10%
- Personality diversity metric >50%

**Builder-5:**
- Share link generates and loads successfully
- Cost dashboard displays accurate totals
- Alerts trigger for games >$5

**Builder-6:**
- Timeline seek jumps to correct message
- Playback speed changes work
- Highlight reel detects 5-10 key moments

## Integration Zones (for iplanner)

**Zone 1: Database & Config**
- Builder-1 outputs: PostgreSQL schema, Railway config, SharedGame model
- Builder-5 inputs: SharedGame model (dependency)

**Zone 2: Logging Infrastructure**
- Builder-2 outputs: Pino logger, logging replacements
- All builders: Should use logger (not console.log)

**Zone 3: UI Components**
- Builder-3 outputs: Updated DiscussionFeed, PlayerGrid, PhaseIndicator
- Builder-6 inputs: Share page structure (dependency)

**Zone 4: Prompts & Context**
- Builder-4 outputs: Expanded personalities, anti-repetition tracker
- Integration: Context builder must use new prompts

**Zone 5: API Endpoints**
- Builder-5 outputs: Share generation, cost dashboard API
- Builder-1 outputs: Health check endpoint

**Zone 6: Documentation**
- Builder-1 outputs: Deployment docs
- Builder-2 outputs: Troubleshooting docs
- Builder-4 outputs: Prompt testing docs
- Integration: Merge into unified docs/ directory

## Validation Checklist (All Builders)

**Build Validation:**
- ✅ `npm run build` succeeds with 0 errors
- ✅ `npm run lint` passes (no ignoring errors)
- ✅ Database migrations apply successfully

**Functional Validation:**
- ✅ Full game playthrough (create → start → game over)
- ✅ All new features work as specified
- ✅ No regressions in existing features

**Quality Validation:**
- ✅ Cost per game <$5 (target <$2)
- ✅ Cache hit rate measured and logged
- ✅ 7 success criteria pass
- ✅ Memory usage <200MB (Railway metrics)

**Documentation Validation:**
- ✅ Deployment guide allows fresh Railway setup
- ✅ Troubleshooting guide covers observed errors
- ✅ Code comments explain complex logic
