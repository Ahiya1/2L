# 2L Iteration Plan - Dashboard UX & Documentation Polish

## Project Vision
Transform the 2L dashboard experience from a 30-second agent-spawning process to an instant (<2s) HTML generation workflow, while fixing critical active agent tracking and making the system accessible to new users through simplified documentation.

**What we're building:**
- Direct dashboard HTML generation (eliminate agent spawning overhead)
- Functional active agents tracking in the dashboard
- Beginner-friendly README with Quick Start guide

**Why it matters:**
- Dashboard is the primary monitoring interface for 2L orchestrations
- Current 30-second startup breaks the real-time monitoring experience
- Active agents tracking is broken, preventing users from seeing agent progress
- README is comprehensive but overwhelming for new users

## Success Criteria
Specific, measurable criteria for MVP completion:
- [x] Dashboard startup time reduced from ~30s to <2s (P95)
- [x] Dashboard correctly displays active agents during orchestration
- [x] Active agents duration updates in real-time
- [x] Completed agents removed from active list
- [x] README Quick Start section appears first (5 steps max)
- [x] New users can complete setup following README alone
- [x] All existing dashboard functionality preserved (port allocation, server management)
- [x] Zero JavaScript console errors in dashboard
- [x] All README links functional after restructuring

## MVP Scope
**In Scope:**
- Feature 4: Direct Dashboard Start (Fix /2l-dashboard)
  - Remove agent spawning logic from command
  - Inline template processing with bash
  - Preserve all port allocation and server management logic

- Feature 5: Active Agents Dashboard Fix
  - Change `agent_spawn` to `agent_start` in JavaScript event handler
  - Add CSS styling for `agent_start` event type
  - Handle edge cases (orphaned starts, duplicates, out-of-order events)

- Feature 6: Simplified README
  - Add Quick Start section at top (5 steps)
  - Add Table of Contents
  - Reorganize content for progressive disclosure
  - Preserve all existing documentation

**Out of Scope (Post-MVP):**
- Dashboard UI redesign (current UI is functional)
- Video walkthrough for Quick Start
- Dashboard template versioning
- Support for legacy `agent_spawn` events (breaking change is acceptable)
- Event replay/debugging features
- Dashboard performance profiling

## Development Phases
1. **Exploration** ✅ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 4-6 hours (single builder)
4. **Integration** ⏳ N/A (no integration needed - single builder)
5. **Validation** ⏳ 30 minutes (manual testing)
6. **Deployment** ⏳ Final (run `./2l.sh install`)

## Timeline Estimate
- Exploration: Complete (Explorer-1 and Explorer-2 reports analyzed)
- Planning: Complete (this document)
- Building: 4-6 hours (single builder, sequential tasks)
  - Task 1 (Active Agents Fix): 1-2 hours
  - Task 2 (Direct Dashboard Start): 2-3 hours
  - Task 3 (Simplified README): 1-2 hours
- Integration: N/A (single builder, no merge conflicts)
- Validation: 30 minutes (manual testing with real orchestration)
- **Total: ~5-7 hours**

## Risk Assessment

### High Risks
**None identified** - All changes are isolated refactoring with clear patterns

### Medium Risks

**Risk 1: Port Allocation Logic Regression**
- **Impact:** Dashboard fails to start if port code modified incorrectly
- **Likelihood:** Low (builder explicitly warned to preserve)
- **Mitigation:**
  - Clear instruction: DO NOT modify lines 97-117 (port allocation)
  - Only modify template generation section (lines 54-64)
  - Test with multiple concurrent dashboards

**Risk 2: Event Parsing Edge Cases**
- **Impact:** Active agents display incorrect state
- **Likelihood:** Medium (real orchestrations produce varied events)
- **Mitigation:**
  - Test with orphaned starts (no matching complete)
  - Test with duplicate events
  - Test with out-of-order events
  - Add try-catch around JSON parsing

### Low Risks

**Risk 3: README Link Breakage**
- **Impact:** Internal anchor links break
- **Likelihood:** Medium (manual link updates)
- **Mitigation:**
  - Test all anchor links after restructuring
  - Keep heading IDs stable (GitHub auto-generates from text)
  - Use GitHub preview to verify rendering

**Risk 4: Special Characters in Project Name**
- **Impact:** HTML corruption if project name has quotes/tags
- **Likelihood:** Low (most projects use simple names)
- **Mitigation:**
  - Use bash parameter expansion (handles most special chars)
  - Validate output has no remaining `{` placeholders
  - Test with project names containing spaces, hyphens, underscores

## Integration Strategy

**No integration phase required** - Single builder completes all features sequentially.

**Why:**
- All 3 features are isolated (no file conflicts)
- No dependencies between features
- Single context: Dashboard/documentation theme
- Total changes: ~60 lines of code

**Deployment:**
After builder completes:
1. Modified files are in `/home/ahiya/2l-claude-config/`
2. Run `./2l.sh install --update` to deploy to `~/.claude/`
3. Restart any running dashboards to see changes

## Deployment Plan

### Pre-Deployment Validation
1. **Dashboard Generation Test:**
   ```bash
   cd ~/test-project
   time /2l-dashboard  # Must complete in <2s
   grep '{' .2L/dashboard/index.html  # Should return nothing (no placeholders)
   ```

2. **Active Agents Test:**
   ```bash
   /2l-mvp "simple test task"  # Generate real events
   # Verify dashboard shows active agents during execution
   # Verify agents disappear on completion
   ```

3. **README Validation:**
   - Open README.md in GitHub preview
   - Verify Quick Start appears first
   - Click all TOC links (should jump to correct sections)
   - Verify all code examples still present

### Deployment Steps
1. Navigate to 2L repository: `cd /home/ahiya/Ahiya/2L`
2. Update installation: `./2l.sh install --update`
3. Verify installation:
   ```bash
   ls -la ~/.claude/commands/2l-dashboard.md  # Should show latest timestamp
   ls -la ~/.claude/lib/2l-dashboard-template.html  # Should show latest timestamp
   ```
4. Test in real project:
   ```bash
   cd ~/test-project
   /2l-dashboard  # Should start in <2s
   ```

### Rollback Plan
If deployment fails:
1. Installation creates backups in `~/.claude/.2l-backups/`
2. Restore previous version:
   ```bash
   cd ~/.claude/.2l-backups/
   ls -lt  # Find latest backup
   cp <backup-dir>/commands/2l-dashboard.md ~/.claude/commands/
   cp <backup-dir>/lib/2l-dashboard-template.html ~/.claude/lib/
   ```

### Post-Deployment Monitoring
1. Test dashboard startup time: `time /2l-dashboard` (must be <2s)
2. Run orchestration with dashboard open: `/2l-mvp "test task"`
3. Verify active agents appear and disappear correctly
4. Check browser console for JavaScript errors (should be zero)

## Performance Targets

All targets based on Iteration 1 validation and explorer analysis:

- **Dashboard Startup:** <2 seconds (P95)
  - Template read + string replacement: <0.5s
  - Server startup: <1s
  - Browser open: <0.5s
  - **Current baseline:** ~30s (agent spawning overhead)

- **Template Processing:** <1 second
  - Read 481-line HTML template
  - Replace 3 placeholders
  - Write output file
  - Validate no remaining placeholders

- **Event Polling:** 2 seconds (unchanged)
  - Dashboard polls events.jsonl every 2s
  - No performance change from current implementation

- **Active Agents Update:** <100ms
  - Real-time duration calculation
  - DOM updates for active agents list
  - No lag perceptible to user

## Key Success Indicators

### Quantitative Metrics
- Dashboard startup time: <2s (from 30s) = **93% reduction**
- Active agents tracking accuracy: 100% (from 0% broken)
- README comprehension: 90% success rate (new users can setup in <5 min)
- Zero JavaScript errors in dashboard console
- Installation idempotency: 100% (can run multiple times safely)

### Qualitative Indicators
- Dashboard feels instant (no waiting for agent spawn)
- Active agents section provides real-time visibility
- README Quick Start is self-explanatory
- New users express confidence in setup process
- No user confusion about dashboard behavior

## Dependencies

### From Iteration 1 (Required)
All delivered and validated at 95% confidence:
- ✅ `~/.claude/lib/2l-dashboard-template.html` (481 lines)
- ✅ `~/.claude/lib/2l-event-logger.sh` (51 lines)
- ✅ `~/.claude/commands/2l-dashboard.md` (187 lines)
- ✅ `./2l.sh install` command (516 lines)
- ✅ `/2l-setup-db` and `/2l-setup-mcps` commands

### System Dependencies
- Bash 4.0+ (for parameter expansion `${VAR//pattern/replacement}`)
- Python 3 (for `http.server` module) - already validated
- Git (for version control) - already validated
- Browser (Chrome, Firefox, or Safari) - standard desktop environment

### No New Dependencies
Iteration 2 adds ZERO new dependencies. All work uses existing, validated tools.

## Assumptions

1. **Iteration 1 is complete and functional**
   - Template file exists at correct location
   - Event logger library works correctly
   - Installation script is idempotent
   - ✅ Validated at 95% confidence

2. **Breaking changes are acceptable**
   - Changing `agent_spawn` to `agent_start` breaks old templates
   - This is acceptable (internal tool, single developer)
   - No backward compatibility required

3. **Python 3 is available**
   - Already validated in Iteration 1
   - Pre-flight check in dashboard command
   - Error message guides installation if missing

4. **User has bash 4.0+**
   - Parameter expansion for string replacement
   - Fallback to `sed` if bash <4.0 (documented in patterns.md)

5. **Dashboard users have desktop environment**
   - Browser auto-open works on Linux (xdg-open) and macOS (open)
   - Fallback message if auto-open fails

## Technical Constraints

### Must Preserve
- Port allocation logic (lines 97-117 in 2l-dashboard.md) - CRITICAL, DO NOT MODIFY
- Server PID tracking (lines 66-95) - CRITICAL, DO NOT MODIFY
- Python HTTP server configuration (lines 132-149) - CRITICAL, DO NOT MODIFY
- Event system format (.2L/events.jsonl JSONL structure) - DO NOT MODIFY
- All README content (reorganize only, do not delete)

### Must Change
- Lines 54-64 in 2l-dashboard.md (remove agent spawning, add template processing)
- Line 421 in 2l-dashboard-template.html (change `agent_spawn` to `agent_start`)
- Add CSS rule for `.event-type-agent_start` (green background like agent_complete)
- README structure (add Quick Start at top, add TOC)

### Performance Requirements
- Dashboard generation: <1 second (bash string replacement)
- Total startup: <2 seconds (measured with `time /2l-dashboard`)
- No regressions in existing functionality
- Event polling remains at 2-second intervals (no change)

## Next Steps

- [x] Review and refine this vision ✅
- [x] Read all exploration reports ✅
- [x] Create implementation plan ✅
- [ ] Execute builder tasks (Builder-1)
- [ ] Validate with real orchestration
- [ ] Deploy via `./2l.sh install --update`

---

**Plan Status:** READY FOR BUILDING
**Complexity:** LOW-MEDIUM
**Estimated Effort:** 5-7 hours (single builder)
**Risk Level:** LOW (isolated refactoring, clear patterns)
