# Builder Task Breakdown

## Overview
3 primary builders will work in sequence with partial parallelization.
No builder splits anticipated (all tasks are MEDIUM or lower complexity).

**Execution Strategy:**
- Builder-1 creates foundation (event logger) → **MUST complete first**
- Builder-2 and Builder-3 can work in parallel after Builder-1 completes
- Total estimated time: 6-8 hours (wall clock: ~4-5 hours with parallelization)

---

## Builder-1: Event Logging Library

### Scope
Create the core event logging library that enables orchestration to stream events to JSONL file. This is the foundation for all dashboard functionality.

### Complexity Estimate
**MEDIUM**

Single file creation with straightforward Bash scripting, but must handle edge cases (special characters, concurrent writes, graceful failures).

### Success Criteria
- [ ] File created at `~/.claude/lib/2l-event-logger.sh`
- [ ] `log_2l_event()` function works with 4 parameters
- [ ] ISO 8601 timestamps generated correctly
- [ ] Special characters in data are escaped (double quotes)
- [ ] Events written to `.2L/events.jsonl` in valid JSONL format
- [ ] Function fails silently if write fails (`|| true` pattern)
- [ ] Function exported for use in sourcing scripts
- [ ] Concurrent writes tested (5 parallel processes, no corruption)
- [ ] 100 events logged in <200ms (performance validated)

### Files to Create
- `~/.claude/lib/2l-event-logger.sh` - Event logging library (~50 lines)

**Note:** Create `lib/` directory if it doesn't exist: `mkdir -p ~/.claude/lib`

### Dependencies
**Depends on:** None (foundation task)
**Blocks:** Builder-2 (dashboard needs events to display), Builder-3 (orchestration integration needs library)

### Implementation Notes
- Use `date -u +"%Y-%m-%dT%H:%M:%SZ"` for ISO 8601 timestamps
- Escape double quotes in all parameters: `${param//\"/\\\"}`
- Create `.2L` directory if needed: `mkdir -p .2L 2>/dev/null || true`
- Append with `>>` operator (atomic on POSIX filesystems)
- Suppress all errors: `2>/dev/null || true`
- Export function: `export -f log_2l_event` at end of file

### Patterns to Follow
Reference `patterns.md`:
- **Pattern 1: Event Logger Library** - Complete implementation provided
- Follow Bash standards: quote variables, use `||true`, 2-space indent

### Testing Requirements
- **Unit tests**: Source library, call function 100 times, verify JSONL output
- **Special character test**: Log message with quotes and apostrophes, verify JSON valid
- **Concurrent test**: 5 parallel processes writing 20 events each (100 total), verify no corruption
- **Performance test**: Measure time for 100 sequential writes (target: <200ms)

**Use Pattern 7 from patterns.md** for complete test script.

### Expected Output
After completion, provide:
- File path: `~/.claude/lib/2l-event-logger.sh`
- Test results: All tests passed
- Performance: Time for 100 events logged
- Example usage: `source ~/.claude/lib/2l-event-logger.sh && log_2l_event "test" "Hello" "test" "agent"`

---

## Builder-2: Dashboard Template & Builder Agent

### Scope
Create the complete dashboard HTML template with placeholders and the agent definition that customizes the template for each project. This includes all HTML structure, CSS styling, and JavaScript polling logic.

### Complexity Estimate
**MEDIUM-HIGH**

Two files to create: template (450 lines) and agent definition (150 lines). Template is substantial but straightforward HTML/CSS/JS. Agent definition follows existing patterns.

### Success Criteria
- [ ] Template created at `~/.claude/lib/2l-dashboard-template.html`
- [ ] Template is valid HTML5 (all tags closed, no syntax errors)
- [ ] Template under 500 lines total
- [ ] Template includes placeholders: `{PROJECT_NAME}`, `{EVENTS_PATH}`, `{TIMESTAMP}`
- [ ] Template has 5 sections: header, metrics, active agents, MCP status, event log
- [ ] Dark theme implemented (GitHub color palette)
- [ ] JavaScript polling logic works (fetch + setInterval)
- [ ] Mobile responsive (media query at 768px)
- [ ] Agent definition created at `~/.claude/agents/2l-dashboard-builder.md`
- [ ] Agent reads template, replaces placeholders, writes output
- [ ] Agent includes validation checklist
- [ ] Template tested in browser (displays correctly, polling works)

### Files to Create
- `~/.claude/lib/2l-dashboard-template.html` - Complete dashboard template (~450 lines)
- `~/.claude/agents/2l-dashboard-builder.md` - Agent definition (~150 lines)

### Dependencies
**Depends on:** Builder-1 (dashboard displays events from event logger)
**Blocks:** Builder-3 (orchestration spawns dashboard builder agent)
**Can run parallel with:** Builder-3 (after Builder-1 completes)

### Implementation Notes

#### Dashboard Template
- Use **Pattern 6** from `patterns.md` as complete working implementation
- Placeholders MUST be exact: `{PROJECT_NAME}`, `{EVENTS_PATH}`, `{TIMESTAMP}` (including braces)
- Events path is always relative: `../events.jsonl` (from `.2L/dashboard/index.html` to `.2L/events.jsonl`)
- Display last 50 events only: `lines.slice(-50)` in JavaScript
- Color-code event types with CSS classes: `.event-type-plan_start`, `.event-type-agent_spawn`, etc.
- Polling function runs every 2 seconds: `setInterval(pollEvents, 2000)`
- Update elapsed time every second: `setInterval(updateElapsedTime, 1000)`
- Calculate active agents by tracking `agent_spawn` and `agent_complete` events

#### Dashboard Builder Agent
- Use **Pattern 4** from `patterns.md` as template
- Agent must read template, replace placeholders, write output
- Include validation checklist in agent prompt
- Error handling: Report if template missing
- Success response: Print dashboard path and file:// URL

### Patterns to Follow
- **Pattern 4**: Dashboard Builder Agent Definition
- **Pattern 6**: Dashboard HTML Template Structure
- Follow HTML/CSS/JS standards: valid HTML5, BEM-like CSS naming, ES6+ JavaScript

### Testing Requirements

#### Template Validation
- **HTML validation**: All tags properly closed, valid HTML5 structure
- **CSS validation**: No syntax errors, all selectors valid
- **JavaScript validation**: No syntax errors, all functions defined
- **Line count**: Count lines, verify under 500
- **Placeholder check**: Search for `{PROJECT_NAME}`, `{EVENTS_PATH}`, `{TIMESTAMP}` - all present

#### Dashboard Browser Test
- **Manual test**: Use **Pattern 8** from `patterns.md`
- Generate sample events (plan_start, iteration_start, agent_spawn, agent_complete, etc.)
- Replace placeholders manually or spawn agent
- Open in browser (Chrome, Firefox, Safari)
- Verify sections display correctly
- Verify polling updates every 2 seconds
- Add new event while dashboard open, verify it appears within 2 seconds
- Test mobile view (resize browser to <768px)

#### Agent Test
- **Spawn test**: Run agent independently
- Provide project name and context
- Verify output file created at `.2L/dashboard/index.html`
- Verify all placeholders replaced
- Verify file is valid HTML

### Potential Split Strategy
If complexity proves too high, consider split:

**Foundation:** Create dashboard template with all HTML/CSS (Builder-2 primary task)

**Sub-builder 2A:** Dashboard HTML Structure & CSS Styling
- Create HTML structure (5 sections)
- Implement all CSS styling (dark theme, responsive)
- Estimate: MEDIUM (2-3 hours)

**Sub-builder 2B:** Dashboard JavaScript Logic & Agent
- Implement polling and rendering JavaScript
- Create dashboard builder agent definition
- Estimate: MEDIUM (2-3 hours)

**However:** Splitting not recommended. HTML/CSS/JS are tightly coupled in single-file dashboard. Template in `patterns.md` provides complete working code that can be copied. Splitting would require coordination overhead.

### Expected Output
After completion, provide:
- Template path: `~/.claude/lib/2l-dashboard-template.html`
- Agent path: `~/.claude/agents/2l-dashboard-builder.md`
- Validation results: HTML valid, line count within budget, browser test passed
- Screenshots (optional): Dashboard displayed in browser
- Test project: Location of test project with generated dashboard

---

## Builder-3: Orchestration Integration

### Scope
Integrate event logging and dashboard initialization into the main `2l-mvp.md` orchestration command. This includes sourcing the event logger library, adding dashboard initialization logic, and inserting 8 event logging hooks at critical orchestration checkpoints.

### Complexity Estimate
**MEDIUM-HIGH**

Modifying critical 1176-line orchestration file with multiple insertion points. High risk if not done carefully, but changes are straightforward and well-defined.

### Success Criteria
- [ ] Event logger sourced at top of `commands/2l-mvp.md`
- [ ] Backward compatibility check implemented (library existence check)
- [ ] `EVENT_LOGGING_ENABLED` flag set correctly
- [ ] Dashboard initialization logic added (after config loading)
- [ ] Dashboard existence check prevents regeneration
- [ ] Dashboard URL printed in orchestration output
- [ ] 8 event logging hooks added at correct orchestration checkpoints
- [ ] All log calls wrapped with `EVENT_LOGGING_ENABLED` check
- [ ] Orchestration works WITHOUT event logger (graceful degradation tested)
- [ ] Existing plans continue working (backward compatibility verified)
- [ ] Dashboard auto-creates on first run of new project
- [ ] Events stream correctly during full orchestration

### Files to Modify
- `~/.claude/commands/2l-mvp.md` - Main orchestration command
  - Add ~30 lines total across file
  - 8 insertion points for event logging hooks
  - 1 section for dashboard initialization
  - 1 section for library sourcing

### Dependencies
**Depends on:** Builder-1 (sources event logger library), Builder-2 (spawns dashboard builder agent)
**Blocks:** None (final integration task)
**Can run parallel with:** Builder-2 (both depend on Builder-1, but work on different files)

### Implementation Notes

#### Event Logger Sourcing (Top of File)
Add after header comments, before main orchestration logic:

```bash
# Source event logger library if available
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
  echo "[2L] Event logging enabled"
else
  echo "[2L] Event logging not available (continuing without dashboard)"
fi
```

#### Dashboard Initialization (After Config Loading)
Add after config loading, before orchestration begins:

Use **Pattern 5** from `patterns.md` for complete implementation.

Key points:
- Check if `.2L/dashboard/index.html` exists
- If not, spawn dashboard builder agent
- Print dashboard URL after creation
- Fail gracefully if dashboard creation fails (non-blocking)

#### Event Logging Hooks (8 Checkpoints)

**Hook 1: Plan Start** (after MODE detection)
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "plan_start" "Plan $PLAN_ID started in $MODE mode" "initialization" "orchestrator"
fi
```

**Hook 2: Iteration Start** (in execute_iteration function)
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "iteration_start" "Iteration $ITER_ID" "initialization" "orchestrator"
fi
```

**Hook 3: Phase Change - Exploration** (before spawning explorers)
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "phase_change" "Starting Exploration phase" "exploration" "orchestrator"
fi
```

**Hook 4: Agent Spawn** (before each spawn_task call)
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "agent_spawn" "Explorer-1: Architecture & Complexity" "exploration" "master-explorer-1"
fi
```

**Hook 5: Agent Complete** (after agent finishes)
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "agent_complete" "Explorer-1 completed" "exploration" "master-explorer-1"
fi
```

**Hook 6: Phase Change - Planning** (before planning phase)
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "phase_change" "Starting Planning phase" "planning" "orchestrator"
fi
```

**Hook 7: Validation Result** (after validation completes)
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "validation_result" "Validation: $STATUS" "validation" "validator-1"
fi
```

**Hook 8: Iteration Complete** (at end of iteration)
```bash
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "iteration_complete" "Iteration $ITER_ID completed" "complete" "orchestrator"
fi
```

**Additional hooks** for other phases (Building, Integration, Healing):
- Add `phase_change` events at start of each phase
- Add `agent_spawn` and `agent_complete` for all builders, validators, healers

### Patterns to Follow
- **Pattern 2**: Sourcing Event Logger in Orchestration
- **Pattern 3**: Logging Events at Orchestration Checkpoints
- **Pattern 5**: Dashboard Initialization in Orchestration
- Follow Bash standards: quote variables, check conditions, fail gracefully

### Testing Requirements

#### Backward Compatibility Test
1. Delete `~/.claude/lib/2l-event-logger.sh` temporarily
2. Run `/2l-mvp` on existing plan
3. Verify orchestration completes successfully
4. Verify "Event logging not available" message appears
5. Restore event logger library

#### Dashboard Initialization Test
1. Create new test project
2. Create simple `vision.md` file
3. Run `/2l-mvp` (first time)
4. Verify dashboard created at `.2L/dashboard/index.html`
5. Verify dashboard URL printed in output
6. Open dashboard in browser, verify it displays

#### Event Streaming Test
1. Create test project with event logger available
2. Run `/2l-mvp` with simple vision
3. Tail `.2L/events.jsonl` in separate terminal: `tail -f .2L/events.jsonl`
4. Verify events stream during orchestration:
   - plan_start
   - iteration_start
   - phase_change (multiple)
   - agent_spawn (multiple)
   - agent_complete (multiple)
   - validation_result
   - iteration_complete
5. Open dashboard while orchestration running
6. Verify dashboard updates in real-time (every 2 seconds)

#### Multi-Phase Test
1. Run orchestration through multiple phases (exploration, planning, building)
2. Verify phase_change events logged for each phase
3. Verify agent_spawn/agent_complete events for all agent types
4. Count events in `.2L/events.jsonl`, verify expected count

#### Resume Test
1. Start orchestration, interrupt mid-phase (Ctrl+C)
2. Verify `.2L/events.jsonl` exists with events logged so far
3. Resume orchestration
4. Verify new events append to existing file (no truncation)
5. Verify dashboard shows all events (old + new)

### Risk Mitigation
- **Mark insertion points clearly**: Add comments `# EVENT: event_type` before each hook
- **Version control**: Keep backup of original `2l-mvp.md` before modifications
- **Test incrementally**: Add hooks one phase at a time, test after each
- **Graceful degradation**: All event logging wrapped in conditionals, non-blocking
- **Error suppression**: All log calls can fail silently without breaking orchestration

### Expected Output
After completion, provide:
- Modified file: `~/.claude/commands/2l-mvp.md`
- Diff summary: ~30 lines added, 0 lines removed
- Test results: All 5 tests passed
- Event log sample: First 10 events from test run
- Dashboard screenshot (optional): Dashboard showing test orchestration

---

## Builder Execution Order

### Phase 1: Foundation (Sequential)
**Builder-1** must complete first
- Creates event logging library
- Duration: 1-2 hours
- Output: `~/.claude/lib/2l-event-logger.sh`

### Phase 2: Parallel Development (After Builder-1)
**Builder-2** and **Builder-3** can work in parallel
- Builder-2: Dashboard template & agent (3-4 hours)
  - Creates `lib/2l-dashboard-template.html`
  - Creates `agents/2l-dashboard-builder.md`
- Builder-3: Orchestration integration (2-3 hours)
  - Modifies `commands/2l-mvp.md`

**Why parallel is safe:**
- Different files, no conflicts
- Both depend on Builder-1 output, but not on each other
- Builder-2 creates files that Builder-3 references (but doesn't modify)

### Phase 3: Integration Testing (Sequential)
After all builders complete:
1. Verify all files in place
2. Run full orchestration test with simple vision
3. Verify event streaming works
4. Verify dashboard displays correctly
5. Test multi-browser compatibility
6. Test backward compatibility
7. Measure performance (1000+ events)

**Integration Duration:** 30 minutes

### Phase 4: Validation (Sequential)
Execute comprehensive test suite:
- Unit tests (Pattern 7)
- Browser tests (Pattern 8)
- Orchestration tests (described in Builder-3)
- Performance tests (large event files)
- Compatibility tests (old plans, missing library)

**Validation Duration:** 1-2 hours

## Integration Notes

### File Dependencies
```
lib/2l-event-logger.sh (Builder-1)
  ↓ sourced by
commands/2l-mvp.md (Builder-3)
  ↓ spawns
agents/2l-dashboard-builder.md (Builder-2)
  ↓ reads
lib/2l-dashboard-template.html (Builder-2)
  ↓ writes
.2L/dashboard/index.html (generated)
  ↓ polls
.2L/events.jsonl (generated by Builder-3 via Builder-1)
```

### Shared Concerns
**Event Schema:**
All builders must agree on event schema:
- `timestamp`: ISO 8601 string
- `event_type`: One of 8 defined types
- `phase`: Current orchestration phase
- `agent_id`: Agent identifier or "orchestrator"
- `data`: Event message/data

**File Paths:**
- Event logger library: `~/.claude/lib/2l-event-logger.sh`
- Dashboard template: `~/.claude/lib/2l-dashboard-template.html`
- Dashboard builder: `~/.claude/agents/2l-dashboard-builder.md`
- Orchestration: `~/.claude/commands/2l-mvp.md`
- Generated events: `.2L/events.jsonl` (per project)
- Generated dashboard: `.2L/dashboard/index.html` (per project)

**Placeholder Convention:**
Template uses: `{PROJECT_NAME}`, `{EVENTS_PATH}`, `{TIMESTAMP}`
Agent replaces these exact strings (case-sensitive, with braces)

### Conflict Prevention
- **No overlapping files**: Each builder works on different files
- **Clear interfaces**: Event schema defined in tech-stack.md
- **Graceful degradation**: Each component works independently if others missing
- **No race conditions**: Event logging uses atomic append, dashboard only reads

### Coordination Points
1. **Builder-1 → Builder-2**: Dashboard template uses events logged by Builder-1's library
2. **Builder-1 → Builder-3**: Orchestration sources Builder-1's library
3. **Builder-2 → Builder-3**: Orchestration spawns Builder-2's agent, references Builder-2's template

All coordination is file-based (no shared state, no concurrency issues).

## Final Checklist

Before declaring iteration complete, verify:

### Files Created (5 total)
- [ ] `~/.claude/lib/2l-event-logger.sh` (Builder-1)
- [ ] `~/.claude/lib/2l-dashboard-template.html` (Builder-2)
- [ ] `~/.claude/agents/2l-dashboard-builder.md` (Builder-2)
- [ ] `~/.claude/commands/2l-mvp.md` (Builder-3 - modified)
- [ ] Test project with `.2L/events.jsonl` and `.2L/dashboard/index.html` (generated)

### Functionality Verified
- [ ] Event logger logs events to JSONL correctly
- [ ] Dashboard template is valid HTML under 500 lines
- [ ] Dashboard builder agent generates working dashboard
- [ ] Orchestration sources event logger (if available)
- [ ] Dashboard auto-creates on first run
- [ ] Events stream during orchestration
- [ ] Dashboard displays events in real-time (2s polling)
- [ ] All 8 event types logged correctly
- [ ] Dashboard shows: header, metrics, active agents, MCP status, event log

### Testing Complete
- [ ] Event logger unit tests pass (Pattern 7)
- [ ] Dashboard browser test passes (Pattern 8)
- [ ] Orchestration integration tests pass (Builder-3)
- [ ] Backward compatibility verified (works without event logger)
- [ ] Multi-browser compatibility tested (Chrome, Firefox, Safari)
- [ ] Performance tested (1000+ events, no slowdown)
- [ ] Concurrent writes tested (5 parallel, no corruption)

### Documentation Complete
- [ ] All 4 plan files created (overview, tech-stack, patterns, builder-tasks)
- [ ] Dashboard URL printed in orchestration output
- [ ] Error messages provide troubleshooting guidance
- [ ] Success criteria checklist completed

### Deployment Ready
- [ ] All files in `~/.claude/` structure
- [ ] Test project demonstrates full functionality
- [ ] No breaking changes to existing plans
- [ ] Ready for production use

---

## Notes for Builders

### Priority Order
1. **Correctness**: All functionality works as specified
2. **Safety**: Graceful degradation, no breaking changes
3. **Testing**: Comprehensive tests pass
4. **Performance**: Meets performance targets (event logging <2ms, dashboard updates <2s)

### When to Ask for Help
- Template exceeds 500 lines and can't be reduced
- Dashboard builder agent generates invalid HTML repeatedly
- Event logging causes orchestration slowdown (>5% overhead)
- Browser compatibility issues can't be resolved
- Concurrent writes show corruption

### Time Management
- If any task exceeds estimated time by >50%, report and reassess
- Don't split tasks unless absolutely necessary (coordination overhead)
- Test incrementally (don't wait until end)
- Document issues and workarounds

### Communication
- Report completion of each file immediately
- Share test results as soon as available
- Flag any deviations from plan
- Suggest improvements for future iterations

**Remember:** This is Iteration 1 (MVP). Focus is proving the architecture works. Features and polish come in future iterations.
