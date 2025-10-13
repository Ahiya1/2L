# Iteration 3: Polish & Real-time Enhancements

## Vision

Polish spectator experience with advanced threading visualization, strategic highlights, performance optimization, and production readiness. Make the game "fascinating to watch".

## Core Deliverables

### 1. Advanced Conversation Threading
- Visual thread connections (CSS indentation or subtle lines)
- Thread preview on hover
- Accusation highlighting (bold/red text)
- Defense highlighting (blue text when accused agent responds)
- Question highlighting (yellow text for directed questions)
- Alliance signals (green text for positive statements)

### 2. Strategic Pattern Visualization
- Vote history panel (collapsible sidebar)
- Voting pattern analysis (highlight consistent voting pairs)
- Accusation network (who accused whom)
- Suspicion indicators (visual cues for multiply-accused players)
- Activity tracker (message count per agent)

### 3. Enhanced Discussion Feed
- Agent avatars (identicon or color-based)
- Message timestamps (relative or absolute)
- Turn numbers ("Turn 5 of 40")
- Phase progress bar
- Smooth scrolling animations
- Scroll lock toggle

### 4. Real-time Polish
- Agent "is typing..." indicator
- Optimistic UI updates
- Connection status indicator
- Reconnection notifications
- Message delivery animations (fade-in)

### 5. Performance Optimization
- Lazy loading (virtualized list for discussion feed)
- Database query optimization (add missing indexes)
- Context pruning (summarize old rounds if cost exceeds $5/game)
- Response caching (cache repeated patterns)
- Memory profiling

### 6. Prompt Engineering Refinement
- Iterate on system prompts based on observations
- Enhance Mafia deception tactics
- Enhance Villager deduction strategies
- Expand personality types (8-10 types)
- Anti-repetition constraints
- Chain-of-thought reasoning prompts

### 7. Game Transcript Export
- Full transcript download (JSON or text)
- Shareable game URL (permalink)
- Replay mode (timeline scrubbing)
- Highlight reel (auto-detect key moments)

### 8. Error Handling & Edge Cases
- Agent timeout recovery (10s limit with fallback)
- API failure handling (retry with exponential backoff)
- SSE disconnection (seamless polling fallback)
- Database transaction rollbacks
- Game abandonment detection

### 9. Production Readiness
- Environment variables properly configured
- Structured logging with levels
- Monitoring (token usage, API latency, completion rate)
- Cost alerts (warn if game exceeds $10)
- Rate limiting
- Deployment configuration

### 10. Documentation
- README with setup instructions
- Architecture documentation
- Prompt library with rationale
- Troubleshooting guide

## Success Criteria

**All 7 original success criteria must pass:**
1. ✓ Multi-turn discussion with logical responses
2. ✓ Mafia coordination (private) + convincing lies (public)
3. ✓ Villager deduction detects patterns and builds cases
4. ✓ Natural conversation flow (not robotic)
5. ✓ Memory accuracy (agents reference past events correctly)
6. ✓ Complete playthrough (game reaches win condition reliably)
7. ✓ **Fascinating to watch** (spectators engaged, strategy visible)

**Performance Targets:**
- Cost per game: <$5 (with prompt caching >70% hit rate)
- Discussion phase: 3-5 minutes actual
- Full game: <45 minutes total
- SSE latency: <500ms
- Memory usage: <200MB

**Production Criteria:**
- No crashes in 10 consecutive games
- API error rate <2%
- All error scenarios handled gracefully
- Documentation complete
- Deployed and accessible

## Out of Scope

- Human players (Stage 2)
- Multiple concurrent games (Stage 2)
- Special roles (Detective, Doctor) (Stage 2)
- AI detection challenge (Stage 3)
- Voice/audio agents (Stage 3)
- Mobile app (Stage 3)

## Estimated Hours

12-16 hours
