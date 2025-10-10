# 2L Iteration Plan - Dashboard Foundation

## Project Vision
Build a real-time observability system for 2L orchestration by creating an event-driven dashboard that streams orchestration progress, agent activity, and metrics. This is the foundation for monitoring 2L's autonomous development workflow, enabling developers to see what's happening during plan execution without blocking orchestration.

**Meta-Programming Context:** This iteration uses 2L to improve 2L itself - we're building observability tools for the 2L framework.

## Success Criteria
Specific, measurable criteria for MVP completion:

- [ ] **Event Logger Library Created** - `~/.claude/lib/2l-event-logger.sh` exists with working `log_2l_event()` function
- [ ] **Dashboard Builder Agent Defined** - `~/.claude/agents/2l-dashboard-builder.md` agent prompt created and tested
- [ ] **Dashboard Template Created** - `~/.claude/lib/2l-dashboard-template.html` template with placeholders
- [ ] **Dashboard Auto-Initializes** - First `/2l-mvp` run creates `.2L/dashboard/index.html` automatically
- [ ] **Events Stream in Real-Time** - Orchestration logs 8 event types to `.2L/events.jsonl` during execution
- [ ] **Dashboard Displays Live Data** - Dashboard polls events.jsonl every 2 seconds and renders updates
- [ ] **Dashboard Under 500 Lines** - Generated HTML is self-contained and within line budget
- [ ] **Multi-Browser Compatible** - Dashboard works in Chrome, Firefox, Safari (or documents limitations)
- [ ] **Backward Compatible** - Existing plans continue working; event logging gracefully degrades if missing
- [ ] **Dashboard URL Printed** - Orchestration output includes clickable dashboard link
- [ ] **Mobile Responsive** - Dashboard has basic mobile layout (single media query)
- [ ] **All Tests Pass** - 8 validation tests execute successfully

## MVP Scope

**In Scope:**
- Event logging library (`lib/2l-event-logger.sh`) with JSONL append-only format
- Dashboard builder agent (`agents/2l-dashboard-builder.md`) with template-based generation
- Dashboard template (`lib/2l-dashboard-template.html`) with placeholder system
- Dashboard initialization hook in `commands/2l-mvp.md`
- 8 event logging hooks in orchestration flow
- Dashboard HTML with 5 sections: header, metrics, active agents, MCP status, event log
- Dark theme (GitHub-inspired color palette)
- Polling mechanism (fetch API every 2 seconds)
- Basic error handling (graceful degradation)
- Mobile responsiveness (single media query at 768px)

**Out of Scope (Post-MVP):**
- Cost tracking integration (requires API response parsing)
- Event file rotation/archiving (manual cleanup for MVP)
- Dashboard auto-refresh on config changes (manual browser refresh)
- Advanced filtering/search in event log (show all events linearly)
- Real-time WebSocket streaming (polling is sufficient)
- Dashboard customization UI (static template for MVP)
- MCP status validation (hardcoded status display)
- Export/download event history (manual file access)

## Development Phases

1. **Exploration** ✅ Complete
   - Explorer 1: Architecture & Structure analysis
   - Explorer 2: Technology patterns & dependencies validation

2. **Planning** 🔄 Current
   - Creating comprehensive 4-file plan
   - Tech stack decisions finalized
   - Code patterns documented
   - Builder tasks defined

3. **Building** ⏳ Estimated 6-8 hours (parallel builders)
   - Builder-1: Event logger library (1-2 hours)
   - Builder-2: Dashboard template & builder agent (3-4 hours)
   - Builder-3: Orchestration integration (2-3 hours)
   - Builders can work in parallel with clear dependencies

4. **Integration** ⏳ Estimated 30 minutes
   - Verify all files in correct locations
   - Test event logging → dashboard flow
   - Validate dashboard generation

5. **Validation** ⏳ Estimated 1-2 hours
   - Execute 8 comprehensive tests
   - Multi-browser compatibility check
   - Backward compatibility verification
   - Performance testing (1000+ events)

6. **Deployment** ⏳ Final
   - Files deployed to `~/.claude/` directory
   - Integration verification on fresh project
   - Documentation complete

## Timeline Estimate

- Exploration: ✅ Complete
- Planning: ✅ Complete
- Building: 6-8 hours (3 parallel builders, longest path is Builder-2)
- Integration: 30 minutes
- Validation: 1-2 hours
- **Total: ~8-11 hours** (wall clock time: ~4-5 hours with parallelization)

## Risk Assessment

### High Risks

**Risk: Dashboard Builder Agent Generates Invalid HTML**
- **Impact:** Dashboard doesn't load or JavaScript fails
- **Probability:** Medium (450-line HTML/CSS/JS generation)
- **Mitigation:** Use template-with-placeholders approach (safer than generative). Provide complete working template that agent only customizes. Include validation checklist in agent prompt. Test independently before integration.

**Risk: 2l-mvp.md Integration Breaks Orchestration**
- **Impact:** Existing plans fail, orchestration stops working
- **Probability:** Medium (modifying 1176-line critical file)
- **Mitigation:** Make all event logging optional with graceful degradation. Wrap all log calls with `|| true` pattern. Add clear marker comments for all hook points. Test with both old and new plan structures. Use version control.

### Medium Risks

**Risk: Browser Fetch API Blocked on file:// Protocol**
- **Impact:** Dashboard can't load events.jsonl in some browsers (Safari restrictions)
- **Probability:** Low-Medium (tested in Chrome/Firefox, Safari has restrictions)
- **Mitigation:** Test in all major browsers during validation. Document compatibility issues. Provide fallback instructions: `python3 -m http.server 8000`. Display clear error message if fetch fails.

**Risk: Large Event File Slows Dashboard**
- **Impact:** Dashboard becomes unresponsive with 1000+ events
- **Probability:** Medium (long-running orchestrations)
- **Mitigation:** Dashboard only displays last 50 events by default. JavaScript slices array: `lines.slice(-50)`. Test with 1000+ events during validation. Consider rotation in future iteration.

**Risk: Concurrent Event Logging Corruption**
- **Impact:** Multiple agents writing simultaneously corrupt events.jsonl
- **Probability:** Low (append operations are atomic on POSIX filesystems)
- **Mitigation:** Tested with 5 parallel writers (no corruption). Keep event payloads small. Use simple append with `>>` operator. Add concurrent test to validation suite.

### Low Risks

**Risk: Event Logging Performance Overhead**
- **Impact:** Orchestration slows down
- **Probability:** Very Low (tested: 100 events in 177ms)
- **Mitigation:** Minimal overhead measured. Keep payloads under 200 bytes. Limit to 8 event types at critical checkpoints only.

## Integration Strategy

### Template-Based Dashboard Generation
Dashboard builder agent uses template-with-placeholders approach instead of generating from scratch:

1. **Template Creation** (Builder-2): Create `lib/2l-dashboard-template.html` with complete working HTML/CSS/JS
2. **Placeholders**: Template includes `{PROJECT_NAME}`, `{EVENTS_PATH}`, `{TIMESTAMP}` markers
3. **Agent Role**: Dashboard builder reads template, replaces placeholders, writes to `.2L/dashboard/index.html`
4. **Benefits**: Safer than generative approach, faster, more predictable, easier to test

### Event Flow Architecture
```
Orchestrator (2l-mvp.md)
  ├─ Sources: lib/2l-event-logger.sh
  ├─ Calls: log_2l_event() at 8 checkpoints
  └─ Writes: .2L/events.jsonl (append-only)
        ↓
Dashboard (index.html)
  ├─ Polls: ../events.jsonl every 2 seconds
  ├─ Parses: JSONL format (one JSON per line)
  └─ Renders: Last 50 events + derived metrics
```

### Builder Coordination
- **Builder-1** creates foundation (event logger) → **Builder-2** and **Builder-3** depend on this
- **Builder-2** creates dashboard artifacts (template + agent) → Independent, no blocking dependencies
- **Builder-3** integrates into orchestration → Depends on Builder-1, can run parallel with Builder-2

### File Locations
All new files target `~/.claude/` directory structure:
- `~/.claude/lib/2l-event-logger.sh` - Event logging library
- `~/.claude/lib/2l-dashboard-template.html` - Dashboard template
- `~/.claude/agents/2l-dashboard-builder.md` - Dashboard builder agent
- `~/.claude/commands/2l-mvp.md` - Modified orchestration (existing file)

Generated artifacts per project:
- `.2L/events.jsonl` - Append-only event stream
- `.2L/dashboard/index.html` - Project-specific dashboard

## Deployment Plan

### Phase 1: File Creation
1. Create `lib/` directory in `~/.claude/` if not exists
2. Write all 3 new files to `~/.claude/` structure
3. Modify `commands/2l-mvp.md` with marked insertion points

### Phase 2: Testing
1. Run isolated tests for each component
2. Execute full orchestration integration test
3. Verify multi-browser compatibility
4. Test backward compatibility with old plans

### Phase 3: Validation
1. Generate test project with simple vision
2. Run `/2l-mvp` and verify dashboard auto-creates
3. Monitor event stream during orchestration
4. Open dashboard in browser, verify polling works
5. Test all 8 event types appear correctly

### Phase 4: Documentation
1. Dashboard URL printed in orchestration output
2. Error messages guide troubleshooting (browser compatibility, file access)
3. Success criteria checklist verified

### Rollback Plan
If critical issues discovered:
- Event logging is optional - can be disabled without breaking orchestration
- Dashboard initialization can be commented out
- Template can be manually fixed and regenerated
- Version control enables quick revert of `2l-mvp.md` changes

## Notes

- **Target Environment**: `~/.claude/` is the 2L system location; this project in `~/Ahiya/2L/` is test/demo
- **Testing Strategy**: Test in `~/Ahiya/2L/` first, then deploy verified files to `~/.claude/`
- **Backward Compatibility Critical**: Existing plans must continue working without event logging
- **Simplicity Over Features**: Dashboard v1 proves architecture works; enhancements come later
- **Template Safety**: Using template approach reduces HTML generation risk significantly
- **JSONL Format**: Industry-standard for streaming logs, proven concurrent-safe
- **file:// Protocol**: Enables multi-project isolation (each dashboard in separate directory)
- **Polling Acceptable**: 2-second latency meets "real-time" requirement for monitoring use case

## Next Steps for Builders

1. Read `tech-stack.md` for detailed technology decisions and rationale
2. Read `patterns.md` for copy-pasteable code examples (CRITICAL for implementation)
3. Read `builder-tasks.md` for specific task assignments and dependencies
4. Execute tasks in order: Builder-1 → (Builder-2 || Builder-3) → Integration → Validation
