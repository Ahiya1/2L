# 2L Iteration 3 Plan - AI Mafia Polish & Real-time Enhancements

## Project Vision
Transform AI Mafia from a functional prototype into a production-ready, "fascinating to watch" social deduction experience. This iteration focuses on three pillars: (1) Visual polish that makes strategic patterns immediately visible, (2) Prompt engineering to maximize agent personality diversity and reduce repetition, and (3) Production infrastructure for reliable hosting and cost management.

## Success Criteria
Specific, measurable criteria for iteration completion:

- [ ] **UI Polish**: All 5 core enhancements deployed (avatars, color-coding, threading, animations, activity tracker)
- [ ] **Production Deployment**: App successfully deployed to Railway with PostgreSQL backend
- [ ] **Structured Logging**: Console.log replaced with Pino structured logging (178 instances)
- [ ] **Cost Monitoring**: Dashboard showing API costs with circuit breaker at $50 threshold
- [ ] **Shareable URLs**: Users can share game links that include replay capability
- [ ] **Prompt Quality**: 10 distinct personalities with anti-repetition mechanisms
- [ ] **Performance Targets**: Bundle size <500KB gzipped, API response <2s, FCP <1.5s

## MVP Scope

**In Scope (Critical Path - 18-22 hours):**
- **UI/UX Polish (Builder-1)**: Deterministic avatars, message color-coding by intent, visual threading, Framer Motion animations, activity tracker badges
- **Prompt Engineering (Builder-2)**: Expand personalities from 5 to 10, implement anti-repetition logic, A/B testing framework for prompt quality
- **PostgreSQL Migration (Builder-3)**: Migrate from SQLite to PostgreSQL for Railway deployment, update Prisma schema
- **Structured Logging (Builder-4)**: Replace all console.log with Pino, implement log levels and contextual metadata
- **Shareable URLs + Replay (Builder-5)**: Generate shareable game URLs with nanoid, implement replay mode with timeline navigation
- **Cost Dashboard (Builder-6)**: API cost tracking UI, circuit breaker middleware, usage alerts

**Out of Scope (Post-Iteration):**
- Accusation network graphs (Recharts visualization) - Complex, 4-6h, defer to analytics iteration
- Voting bloc detection algorithm - High complexity, defer to analytics iteration
- Context summarization for long games - High risk, complex prompt engineering
- Vote history panel - Nice-to-have, defer to Phase 2
- Typing indicators - Requires WebSocket infrastructure changes
- Virtual scrolling / pagination - Premature optimization (games typically <200 messages)

## Development Phases

1. **Exploration** - Complete
2. **Planning** - Current
3. **Building** - 18-22 hours (6 parallel builders)
4. **Integration** - 2-3 hours (merge builder outputs, resolve conflicts)
5. **Validation** - 1-2 hours (test all success criteria)
6. **Deployment** - 1-2 hours (Railway deployment, DNS configuration)

## Timeline Estimate

- **Exploration**: Complete (3 explorers, 1-2h each)
- **Planning**: 1 hour (Planner agent)
- **Building**: 18-22 hours (parallel execution)
  - Builder-1 (UI Polish): 6-9h
  - Builder-2 (Prompts): 4-6h
  - Builder-3 (PostgreSQL): 3-4h
  - Builder-4 (Logging): 3-4h
  - Builder-5 (Shareable URLs): 4-6h
  - Builder-6 (Cost Dashboard): 2-3h
- **Integration**: 2-3 hours
- **Validation**: 1-2 hours
- **Deployment**: 1-2 hours
- **Total**: ~24-30 hours (exceeds 12-16h vision due to critical production requirements)

**Justification for Extended Timeline**: Production readiness (PostgreSQL migration, logging, cost monitoring) and shareable URLs are non-negotiable for launch. We prioritized high-impact features while deferring complex analytics.

## Risk Assessment

### High Risks

**Risk**: PostgreSQL migration breaks existing game logic or Prisma queries
- **Impact**: App fails to start, games cannot be created
- **Mitigation**: Builder-3 creates comprehensive migration guide, tests all queries locally with PostgreSQL before deployment, maintains SQLite compatibility in dev
- **Contingency**: Rollback to SQLite if migration fails, defer Railway deployment

**Risk**: Cost dashboard circuit breaker triggers during live games
- **Impact**: Games halt mid-session, poor user experience
- **Mitigation**: Set conservative threshold ($50), implement graceful degradation (show warning before hard stop), add manual override for admins
- **Contingency**: Disable circuit breaker in emergency, rely on Anthropic account limits

**Risk**: Framer Motion animations cause performance degradation on mobile
- **Impact**: Janky UI, poor mobile experience
- **Mitigation**: Use GPU-accelerated transforms, respect prefers-reduced-motion, lazy load animations only for new messages
- **Contingency**: Disable animations on mobile via responsive CSS

### Medium Risks

**Risk**: Prompt engineering changes reduce agent personality distinctiveness
- **Impact**: Agents feel same-y, game becomes boring
- **Mitigation**: Builder-2 implements A/B testing framework, validates with 5 test games before finalizing, maintains personality validation metrics
- **Contingency**: Revert to original 5 personalities if quality degrades

**Risk**: Shareable URL replay mode has race conditions with SSE events
- **Impact**: Replay shows incomplete/incorrect game state
- **Mitigation**: Builder-5 uses immutable event snapshots, validates event ordering, adds replay-specific event filters
- **Contingency**: Disable replay mode temporarily, show "replay unavailable" message

**Risk**: Message intent classification has low accuracy (<60%)
- **Impact**: Confusing color-coding, users ignore feature
- **Mitigation**: Builder-1 uses conservative regex patterns, adds visual legend explaining colors, implements feedback mechanism
- **Contingency**: Reduce to 2 intents (accusation/neutral) or disable color-coding

### Low Risks

**Risk**: Avatar color collisions (different players get similar hues)
- **Impact**: Minor visual confusion
- **Mitigation**: Use deterministic hash with wide hue distribution (360 degrees)
- **Contingency**: Add saturation/lightness variation as secondary differentiator

**Risk**: Pino logging increases bundle size significantly
- **Impact**: Slower page loads
- **Mitigation**: Use dynamic imports for Pino, tree-shake unused features
- **Contingency**: Revert to console.log if bundle size exceeds 50KB increase

## Integration Strategy

### Parallel Development Approach
Builders work on isolated feature sets with minimal file overlap:

- **Builder-1**: Modifies only UI components (`components/`, `lib/ui/`)
- **Builder-2**: Modifies only prompt files (`src/prompts/`, `src/lib/agents/`)
- **Builder-3**: Modifies only database layer (`prisma/`, database utilities)
- **Builder-4**: Modifies only logging infrastructure (`src/lib/logger/`, replaces console.log)
- **Builder-5**: Modifies only URL/replay logic (`app/game/[gameId]/`, new replay components)
- **Builder-6**: Modifies only cost tracking (`components/CostDashboard.tsx`, middleware)

### Integration Points

**Shared Dependencies**:
- `package.json`: Builder-1 adds framer-motion, Builder-4 adds pino, Builder-3 updates prisma - Integrator merges all dependencies
- `prisma/schema.prisma`: Builder-3 changes database provider, Builder-5 adds SharedGame model - Merge sequentially
- `app/game/[gameId]/page.tsx`: Builder-1 adds UI components, Builder-5 adds replay mode - Merge with careful JSX reconciliation

### Conflict Resolution
1. **package.json**: Integrator runs `npm install` after merging all builder branches
2. **Prisma schema**: Apply Builder-3 changes first (PostgreSQL), then Builder-5 (SharedGame model), run `prisma generate`
3. **Main game page**: Use feature flags to toggle Builder-1 UI enhancements and Builder-5 replay mode independently
4. **Logging**: Builder-4 changes are additive (replace console.log), no conflicts expected

### Testing During Integration
- Run `npm run build` to catch TypeScript errors
- Test game creation flow (validates Builder-3 PostgreSQL migration)
- Test UI rendering (validates Builder-1 components)
- Test replay mode (validates Builder-5 shareable URLs)
- Verify cost dashboard (validates Builder-6)
- Check logs (validates Builder-4 Pino integration)

## Deployment Plan

### Phase 1: Railway Setup (Builder-3)
1. Create Railway project
2. Add PostgreSQL addon
3. Configure environment variables:
   - `DATABASE_URL`: Railway PostgreSQL connection string
   - `ANTHROPIC_API_KEY`: Copy from existing .env
   - `NEXT_PUBLIC_BASE_URL`: Railway app URL
4. Run database migrations: `prisma migrate deploy`

### Phase 2: Application Deployment
1. Push main branch to GitHub
2. Connect Railway to GitHub repo
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Deploy automatically on push

### Phase 3: Post-Deployment Validation
1. Create test game to verify PostgreSQL connectivity
2. Check Pino logs in Railway dashboard
3. Test shareable URL generation and replay mode
4. Verify cost dashboard shows real API usage
5. Monitor circuit breaker threshold

### Rollback Strategy
- Keep SQLite in dev environment for local testing
- Maintain feature flags for new UI components
- Document rollback procedure: revert Prisma schema, redeploy previous Git commit

### DNS & Custom Domain (Optional)
- Configure custom domain in Railway settings
- Update `NEXT_PUBLIC_BASE_URL` environment variable
- Verify shareable URLs use new domain

## Performance Targets

### Bundle Size
- **Current baseline**: ~350KB gzipped (measured via `next build`)
- **Target**: <500KB gzipped after all enhancements
- **Budget breakdown**:
  - Framer Motion: ~30KB
  - Pino: ~20KB (browser bundle)
  - Recharts (deferred): ~90KB (not in this iteration)
  - Other utilities: ~100KB buffer

### Page Load Performance
- **First Contentful Paint (FCP)**: <1.5s
- **Time to Interactive (TTI)**: <3s
- **Largest Contentful Paint (LCP)**: <2.5s

### API Response Times
- **Game creation**: <2s
- **Turn processing**: <5s (depends on Claude API)
- **SSE event stream**: <200ms latency

### Database Performance
- **PostgreSQL query time**: <100ms for standard queries
- **Connection pool**: Min 5, Max 20 connections
- **Index optimization**: Add indexes for game_id, player_id lookups

## Monitoring & Observability

### Structured Logging (Builder-4)
- **Log levels**: ERROR, WARN, INFO, DEBUG
- **Contextual metadata**: game_id, player_id, turn_number, request_id
- **Log aggregation**: Railway logging dashboard
- **Retention**: 7 days (Railway free tier)

### Cost Tracking (Builder-6)
- **Dashboard metrics**:
  - Total API spend (lifetime)
  - Daily/weekly spend trend
  - Cost per game
  - Token usage breakdown (input/output)
- **Alerts**:
  - Warning at $40 (80% of threshold)
  - Circuit breaker triggers at $50
  - Email notification to admin

### Application Metrics
- **Game statistics**: Total games, active games, completion rate
- **Player statistics**: Total players, average game length
- **Error rates**: 4xx/5xx responses, failed API calls
- **Uptime**: Railway provides uptime monitoring

## Quality Gates

Before marking iteration complete, all builders must pass:

1. **Build Success**: `npm run build` completes without errors
2. **Type Safety**: No TypeScript errors in `next build` output
3. **Linting**: `npm run lint` passes with 0 errors
4. **Database Migrations**: `prisma migrate diff` shows no pending changes
5. **Bundle Size**: `next build` output shows <500KB gzipped
6. **Visual Regression**: Manual verification of UI enhancements
7. **Replay Mode**: Test with 3 different game types (Villager win, Mafia win, ongoing)
8. **Cost Dashboard**: Verify correct API cost calculation
9. **Logging**: Confirm Pino logs appear in Railway dashboard
10. **Production Deploy**: App accessible at Railway URL with all features working

## Post-Iteration Roadmap

### Immediate Next Steps (Iteration 4)
- **Analytics Dashboard**: Accusation network graphs, voting bloc detection
- **Vote History Panel**: Collapsible sidebar with historical votes
- **Typing Indicators**: Real-time "Agent X is thinking..." status
- **Performance Optimization**: Implement pagination for long games (>500 messages)

### Future Enhancements
- **Multi-game Support**: Run multiple games concurrently
- **Spectator Mode**: Allow users to watch games without participating
- **Personality Editor**: Admin UI to create/edit agent personalities
- **Game Variants**: Support for different game modes (Werewolf, Avalon)
- **AI vs Human**: Allow human players to join AI games

## Team Communication

### Builder Coordination
- All builders use feature branches: `iteration-3/builder-{N}-{feature-name}`
- Commit messages follow convention: `[Builder-N] Feature description`
- Builders communicate dependencies via plan documentation (this file)
- No direct communication needed - plan provides all context

### Integration Coordination
- Integrator creates `iteration-3/integration` branch
- Merges builder branches sequentially based on dependency graph
- Resolves conflicts according to "Integration Strategy" section
- Tests after each merge to isolate issues

### Deployment Coordination
- Only Integrator has Railway deployment access
- Builders tag successful builds: `git tag iteration-3-builder-{N}-complete`
- Integrator triggers deployment after full integration passes validation

---

**Plan Status**: READY FOR BUILDERS
**Plan Version**: 1.0
**Last Updated**: 2025-10-13
**Planner**: 2L Planner Agent
