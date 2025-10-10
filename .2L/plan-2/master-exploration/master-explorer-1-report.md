# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Fix 2L's broken event system to enable real-time dashboard observability, clarify MCP connectivity for new machine setup, and verify/document GitHub CLI integration after switching from GitHub MCP.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 6 must-have features
  1. Event System Redesign (orchestrator + agent emission)
  2. Update Agent Templates (10 agent files)
  3. Update Orchestrator Documentation
  4. MCP Connection Verification
  5. GitHub CLI Verification
  6. README Updates

- **User stories/acceptance criteria:** 33 acceptance criteria across 6 features
- **Estimated total work:** 14-18 hours
  - Event system implementation: 3-4 hours
  - Agent template updates: 2-3 hours
  - Dashboard integration: 2 hours
  - MCP verification tool: 2-3 hours
  - GitHub CLI verification: 2 hours
  - README updates: 3-4 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **Multiple interconnected components:** Event system affects orchestrator, 10 agent files, dashboard HTML, and event logger library
- **Broad surface area:** Touches 15+ files across different architectural layers (orchestrator commands, agent definitions, library utilities, documentation)
- **System-wide consistency required:** All agents must emit events identically, orchestrator must coordinate, dashboard must parse correctly
- **Testing requirements:** Must verify event flow end-to-end across entire orchestration lifecycle
- **Documentation depth:** README needs comprehensive updates reflecting architectural decisions

---

## Architectural Analysis

### Major Components Identified

1. **Event Emission Infrastructure**
   - **Purpose:** Provides consistent, predictable event logging across orchestrator and all agents
   - **Complexity:** MEDIUM
   - **Why critical:** Foundation for observability - nothing else works without proper events
   - **Components:**
     - `lib/2l-event-logger.sh` (already exists, may need enhancements)
     - Orchestrator event emission points in `/2l-mvp.md`
     - Agent event emission sections in 10 agent markdown files
   - **Technical requirements:**
     - JSONL format (newline-delimited JSON)
     - Consistent schema: `{timestamp, event_type, phase, agent_id, data}`
     - Atomic append operations (no event loss)
     - Non-blocking (must not slow orchestration)

2. **Dashboard System**
   - **Purpose:** Real-time visualization of orchestration progress through event parsing
   - **Complexity:** LOW-MEDIUM
   - **Why critical:** Primary user interface for observability - demonstrates value of event system
   - **Components:**
     - `lib/2l-dashboard-template.html` (exists, needs verification)
     - Dashboard generation/serving mechanism
     - Event polling/parsing JavaScript
   - **Technical requirements:**
     - Reads `.2L/events.jsonl` file
     - Parses JSONL format tolerantly (skip malformed lines)
     - Updates UI based on event types
     - Polls every 2 seconds (configurable)

3. **Agent Template Updates (10 files)**
   - **Purpose:** Standardize event emission across all agent types
   - **Complexity:** LOW (repetitive work)
   - **Why critical:** Ensures all agents are observable during orchestration
   - **Files to update:**
     1. `agents/2l-builder.md`
     2. `agents/2l-explorer.md`
     3. `agents/2l-planner.md`
     4. `agents/2l-integrator.md`
     5. `agents/2l-iplanner.md`
     6. `agents/2l-ivalidator.md`
     7. `agents/2l-validator.md`
     8. `agents/2l-healer.md`
     9. `agents/2l-master-explorer.md`
     10. `agents/2l-dashboard-builder.md`
   - **Update pattern (consistent across all):**
     - Add "Event Emission" section after "Your Mission" or "What You Do"
     - Document 2 events: `agent_start` (after context read) and `agent_complete` (after work done)
     - Provide bash example: `log_2l_event "agent_start" "Starting {task}" "${PHASE}" "{agent-id}"`
     - Explain placement in workflow

4. **MCP Verification Tool**
   - **Purpose:** Help users verify MCP connectivity during setup
   - **Complexity:** MEDIUM
   - **Why critical:** Addresses major pain point - unclear MCP setup on new machines
   - **Components:**
     - New command: `/2l-check-mcps.md` or integrate into `/2l-status.md`
     - Detection logic for 4 MCPs:
       - Playwright (E2E testing)
       - Chrome DevTools (performance profiling)
       - Supabase (database operations)
       - Screenshot (image capture)
     - Status reporting: Connected/Missing/Error
     - Setup instructions for each MCP
   - **Technical requirements:**
     - Fast execution (<1 second total)
     - Graceful failure (missing MCP doesn't crash check)
     - Clear output format (visual indicators)
     - Documentation of optional vs required MCPs

5. **GitHub CLI Integration Verification**
   - **Purpose:** Verify and document `gh` CLI usage (replacing GitHub MCP)
   - **Complexity:** LOW-MEDIUM
   - **Why critical:** Recent architecture change needs validation and documentation
   - **Components:**
     - Test `setup_github_repo()` function in orchestrator
     - Verify `gh` CLI detection: `gh --version`
     - Verify `gh auth status` checking
     - Verify repo creation: `gh repo create`
     - Verify push operations
   - **Technical requirements:**
     - Graceful degradation when `gh` not installed
     - Clear error messages with resolution steps
     - Documentation in README (not GitHub MCP)

6. **Documentation Layer (README.md)**
   - **Purpose:** Provide accurate, comprehensive documentation of 2L architecture
   - **Complexity:** MEDIUM-HIGH
   - **Why critical:** Developers rely on README for understanding system architecture and setup
   - **Sections requiring updates:**
     - Event system architecture (new section)
     - MCP requirements (clarify optional vs required)
     - GitHub integration using `gh` CLI (update from GitHub MCP)
     - Setup verification steps (reference MCP check)
     - Architecture decisions (why gh CLI, why this event pattern)
     - Troubleshooting section for common issues
   - **Technical requirements:**
     - Maintain existing markdown style
     - Add diagrams if helpful (event flow, orchestration phases)
     - Keep concise but comprehensive

### Technology Stack Implications

**Event Storage: JSONL (Newline-Delimited JSON)**
- **Options:** JSONL, SQLite, in-memory stream
- **Recommendation:** JSONL (already implemented in `2l-event-logger.sh`)
- **Rationale:**
  - Simple append-only format (atomic operations)
  - Easy to parse line-by-line in JavaScript
  - Human-readable for debugging
  - No database dependencies
  - Works with static file serving

**Dashboard: Static HTML + JavaScript Polling**
- **Options:** Static HTML, WebSocket server, Server-Sent Events
- **Recommendation:** Static HTML with polling (already implemented)
- **Rationale:**
  - No server dependencies (just open HTML file)
  - 2-second polling sufficient for observability
  - Simple deployment (generate and open)
  - Existing template works well

**MCP Detection: Bash Script Probing**
- **Options:** Bash detection, Python script, dedicated tool
- **Recommendation:** Bash script in new `/2l-check-mcps.md` command
- **Rationale:**
  - Consistent with 2L command structure
  - Can probe MCP availability via Claude API introspection
  - Fast execution
  - No external dependencies

**GitHub Integration: `gh` CLI**
- **Options:** `gh` CLI, GitHub MCP, direct Git + API calls
- **Recommendation:** `gh` CLI (already implemented)
- **Rationale:**
  - More reliable than GitHub MCP
  - Standard tool for GitHub operations
  - Good error handling
  - Simple authentication flow

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 Iterations)

**Rationale:**
- **Too complex for single iteration:** 15+ files to touch, 6 distinct features, end-to-end testing required
- **Natural architectural phases:** Foundation (events) → Integration (agents/dashboard) → Documentation/Verification
- **Risk management:** Phase 1 is critical foundation - must get right before building on it
- **Parallel work opportunities:** After Phase 1, agent updates and verification tools can proceed independently
- **Testing checkpoints:** Each iteration provides natural validation point

### Suggested Iteration Phases

---

**Iteration 1: Event System Foundation**
- **Vision:** Establish robust, consistent event emission infrastructure across orchestrator and event logger
- **Scope:** Core event system implementation
  - Enhance `lib/2l-event-logger.sh` (add validation, helper functions if needed)
  - Document orchestrator event emission points in `commands/2l-mvp.md`
  - Implement orchestrator events in actual orchestration logic
  - Test event file creation and JSONL format
  - Verify dashboard can parse events (basic smoke test)
- **Why first:** Foundation for everything else - agents need working event infrastructure, dashboard needs valid events
- **Estimated duration:** 3-4 hours
- **Risk level:** HIGH
  - Critical foundation - errors here cascade to all other work
  - Event format must be correct (schema validation needed)
  - Orchestrator changes affect core system behavior
- **Success criteria:**
  - `.2L/events.jsonl` created during orchestration
  - All orchestrator lifecycle events logged (plan_start, phase_change, iteration_start, iteration_complete)
  - Events match schema: `{timestamp, event_type, phase, agent_id, data}`
  - Dashboard displays orchestrator events correctly
  - No performance degradation from event logging

**Dependencies:** None (foundation)

---

**Iteration 2: Agent Integration & Dashboard**
- **Vision:** Make all agents observable and verify dashboard displays complete orchestration timeline
- **Scope:** Agent updates and dashboard integration
  - Update all 10 agent markdown files with "Event Emission" sections
  - Test agent event emission during actual orchestration
  - Verify dashboard shows agent lifecycle (spawn, active, complete)
  - Fix any dashboard parsing issues
  - Test complete end-to-end event flow
- **Dependencies:**
  - **Requires from Iteration 1:**
    - Working `log_2l_event` function in `2l-event-logger.sh`
    - Proven event schema and JSONL format
    - Dashboard template that can parse orchestrator events
  - **Imports:**
    - Event emission patterns from orchestrator documentation
    - Schema validation approach
- **Why second:** Builds on proven event infrastructure, extends observability to agents
- **Estimated duration:** 4-5 hours
  - 10 agent files: ~2-3 hours (repetitive, can batch)
  - Dashboard integration testing: ~1 hour
  - End-to-end orchestration test: ~1 hour
- **Risk level:** MEDIUM
  - Agent updates are repetitive but must be consistent
  - Dashboard parsing may reveal edge cases
  - Full orchestration test may surface integration issues
- **Success criteria:**
  - All 10 agents have "Event Emission" section with correct instructions
  - Agent events appear in `.2L/events.jsonl` during test orchestration
  - Dashboard shows: orchestrator events, agent spawns, agent completions
  - Timeline accurately reflects orchestration progress
  - No missing or malformed events

---

**Iteration 3: Verification Tools & Documentation**
- **Vision:** Enable users to verify their 2L setup and understand the complete architecture through documentation
- **Scope:** Tooling and documentation polish
  - Create MCP verification command (`/2l-check-mcps.md`)
  - Test and document GitHub CLI integration
  - Update README.md comprehensively
  - Create troubleshooting guide
  - Test full setup flow on "fresh" configuration
- **Dependencies:**
  - **Requires from Iteration 1-2:**
    - Complete event system (for documenting architecture)
    - Working dashboard (for documenting observability)
    - Agent event emission (for documenting agent behavior)
  - **Imports:**
    - Event schema documentation
    - Orchestration phase understanding
- **Why third:** Polishing layer - adds value but doesn't block core functionality
- **Estimated duration:** 5-6 hours
  - MCP check command: ~2-3 hours (detection logic + formatting)
  - GitHub CLI verification: ~1 hour (test existing function)
  - README updates: ~2-3 hours (comprehensive documentation)
- **Risk level:** LOW
  - Independent of event system (can proceed even if minor event bugs exist)
  - Documentation doesn't break functionality
  - MCP check is standalone utility
- **Success criteria:**
  - `/2l-check-mcps` command reports accurate MCP status
  - GitHub CLI workflow documented and verified working
  - README reflects current architecture (events, MCPs, gh CLI)
  - Setup verification steps clear and tested
  - Troubleshooting section addresses common issues

---

## Dependency Graph

```
Foundation (Iteration 1)
├── 2l-event-logger.sh (enhance/validate)
├── commands/2l-mvp.md (document emission points)
└── Orchestrator implementation (emit events)
    ↓
    Event infrastructure proven, schema validated
    ↓
Agent Integration (Iteration 2)
├── 10 agent markdown files (add Event Emission sections)
│   Uses: log_2l_event function from Iteration 1
│   Uses: Event schema defined in Iteration 1
├── Dashboard testing and fixes
│   Reads: .2L/events.jsonl from Iteration 1
│   Parses: Event format validated in Iteration 1
└── End-to-end orchestration test
    Validates: Complete event flow from Iteration 1 + 2
    ↓
    All components observable, dashboard functional
    ↓
Verification & Documentation (Iteration 3)
├── /2l-check-mcps.md (new command)
│   Independent: Doesn't depend on events
├── GitHub CLI verification
│   Independent: Tests existing functionality
└── README.md updates
    Documents: Event system from Iteration 1-2
    Documents: MCP setup from Iteration 3
    Documents: GitHub workflow (existing)
```

**Critical Path:**
Iteration 1 (event foundation) → Iteration 2 (agent integration) → Iteration 3 (docs)

**Parallel Opportunities:**
- After Iteration 2 completes: MCP verification and README updates can proceed in parallel if multiple builders available
- GitHub CLI verification can happen anytime (independent testing)

---

## Risk Assessment

### High Risks

- **Event Schema Consistency**
  - **Impact:** If schema changes mid-project, dashboard breaks and agents emit incompatible events
  - **Mitigation:**
    - Validate schema in Iteration 1 before proceeding
    - Add schema validation to `log_2l_event` function
    - Test dashboard parsing thoroughly
    - Document schema explicitly in code comments
  - **Recommendation:** Must complete and validate in Iteration 1 before starting agent updates

- **Orchestrator Event Placement**
  - **Impact:** Missing or incorrectly placed events create observability gaps (phases not visible, agents not tracked)
  - **Mitigation:**
    - Document all emission points in `/2l-mvp.md` first
    - Test with actual orchestration run
    - Verify every phase transition logged
    - Check edge cases (early exit, errors)
  - **Recommendation:** Thorough testing in Iteration 1, potentially run 2-3 test orchestrations

### Medium Risks

- **Agent Event Emission Consistency**
  - **Impact:** Some agents emit events correctly, others don't - partial observability confuses users
  - **Mitigation:**
    - Use consistent template for all 10 agent updates
    - Test each agent type during Iteration 2
    - Batch similar agents together (all explorers, all validators)
  - **Recommendation:** Create standard "Event Emission" section template, copy/adapt for each agent

- **Dashboard Parsing Edge Cases**
  - **Impact:** Malformed events crash dashboard, user sees blank screen instead of partial data
  - **Mitigation:**
    - Dashboard already has try-catch for JSON parsing
    - Test with intentionally malformed events
    - Verify "skip and continue" behavior works
  - **Recommendation:** Add explicit test case for malformed JSONL in Iteration 2

- **MCP Detection Accuracy**
  - **Impact:** False positives/negatives mislead users about MCP availability
  - **Mitigation:**
    - Test on machines with various MCP configurations
    - Provide clear error messages when detection fails
    - Document limitations of detection approach
  - **Recommendation:** Test on at least 2 different machines (minimal vs full MCP setup)

### Low Risks

- **README Documentation Completeness**
  - **Impact:** Some architectural details missing or unclear
  - **Mitigation:**
    - Review with fresh eyes after writing
    - Consider having another developer review
    - Iterate on documentation post-launch
  - **Recommendation:** Low risk - can be improved iteratively after MVP

- **GitHub CLI Error Handling**
  - **Impact:** Poor error messages when `gh` not installed or not authenticated
  - **Mitigation:**
    - Already has graceful degradation
    - Test with `gh` not installed
    - Verify error messages are clear
  - **Recommendation:** Low priority - existing implementation likely sufficient

---

## Integration Considerations

### Cross-Phase Integration Points

- **Event Schema (spans all iterations)**
  - Must remain consistent throughout project
  - Any schema change requires updating: orchestrator, agents, dashboard
  - **Integration strategy:** Define schema explicitly in Iteration 1, freeze before Iteration 2

- **Agent Event Patterns (consistency across 10 files)**
  - All agents must emit events identically (same function calls, same parameters)
  - Pattern established in first agent update must apply to all
  - **Integration strategy:** Create template/example in Iteration 2 planning, reuse for all agents

- **Dashboard Configuration (connects events to UI)**
  - Dashboard event type styling must match emitted event types
  - Phase names in dashboard must match orchestrator phase names
  - **Integration strategy:** Document event types in Iteration 1, verify dashboard handles all types in Iteration 2

### Potential Integration Challenges

- **Event File Timing**
  - **Challenge:** Dashboard opens before first event written - shows "no events" briefly
  - **Why it matters:** User experience - looks broken initially
  - **Solution:** Dashboard already handles this ("Waiting for events..." message), verify it works

- **Event File Growth**
  - **Challenge:** Long orchestrations create large `events.jsonl` files, dashboard shows only last 50
  - **Why it matters:** User might miss early events in long orchestrations
  - **Solution:** Document in README (expected behavior), consider pagination in future

- **Agent Context Differences**
  - **Challenge:** Some agents have different workflow structures (master explorers vs builders)
  - **Why it matters:** Event emission placement might vary slightly per agent type
  - **Solution:** Provide flexibility in event placement documentation, focus on "before work" and "after work" anchors

---

## Recommendations for Master Plan

1. **Start with Iteration 1 as critical foundation**
   - Do not proceed to Iteration 2 until event system is proven working
   - Run at least 2 full orchestration tests to validate events flow correctly
   - Verify dashboard can parse and display events before declaring Iteration 1 complete

2. **Batch agent updates strategically in Iteration 2**
   - Group similar agents: explorers together, validators together, etc.
   - Test one agent from each group first, then apply pattern to rest
   - Consider parallel work: one builder updating agents, another testing dashboard

3. **Keep Iteration 3 flexible**
   - MCP verification and README updates are independent
   - Can proceed even if minor bugs exist in event system
   - Consider splitting if time constrained: MCP tool vs README could be separate builders

4. **Plan for testing time**
   - Each iteration needs end-to-end testing (not just unit testing)
   - Iteration 1: Test orchestrator events
   - Iteration 2: Test full orchestration with agent events + dashboard
   - Iteration 3: Test MCP check on multiple configurations

5. **Consider optional Phase 4 for polish**
   - Event analytics (post-MVP "Should-Have" features)
   - Dashboard auto-refresh improvements
   - Event validation strictness
   - Only pursue if Iterations 1-3 complete smoothly and time remains

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- Bash scripting for orchestration and utilities
- Markdown for agent definitions and commands
- HTML/CSS/JavaScript for dashboard (static, no build step)
- JSONL for event storage

**Patterns observed:**
- Command structure: Markdown files in `commands/` directory
- Agent structure: Markdown files in `agents/` directory
- Library pattern: Bash scripts in `lib/` directory
- Event logging pattern: Already established in `2l-event-logger.sh`

**Opportunities:**
- Event logger could add validation function (`validate_2l_event`)
- Dashboard could add event filtering (phase filter, agent filter)
- MCP check could be integrated into existing `/2l-status.md` command instead of new command

**Constraints:**
- Must maintain markdown-based agent/command structure
- Must preserve bash orchestration approach
- Must keep dashboard static (no server dependencies)
- Must remain compatible with existing `.2L/` directory structure

### File Organization Recommendations

**No restructuring needed** - existing organization is sound:
```
~/.claude/
├── agents/          # Agent definitions (10 files to update)
├── commands/        # Orchestrator commands (1-2 files to update)
├── lib/             # Utilities (event logger, dashboard template)
└── schemas/         # (Not touched in this project)

Project directory:
.2L/
├── events.jsonl     # Generated during orchestration (new)
├── config.yaml      # Existing
└── plan-{N}/        # Per-plan directories
```

**New files:**
- `commands/2l-check-mcps.md` (MCP verification command)
- `.2L/events.jsonl` (generated automatically by event logger)

**Modified files:**
- All 10 agent markdown files in `agents/`
- `commands/2l-mvp.md` (orchestrator documentation)
- `lib/2l-event-logger.sh` (potential enhancements)
- `lib/2l-dashboard-template.html` (potential fixes)
- `README.md` (comprehensive updates)

---

## Notes & Observations

### Architectural Decisions to Document

1. **Why JSONL over SQLite?**
   - Simpler, no dependencies, human-readable
   - Append-only provides natural ordering
   - Easy to parse in JavaScript without libraries

2. **Why `gh` CLI over GitHub MCP?**
   - More reliable (MCP was flaky)
   - Standard tool, better error handling
   - Simpler authentication flow
   - Should be explicitly documented in README

3. **Why polling over WebSockets?**
   - No server required (static HTML)
   - 2-second polling sufficient for observability use case
   - Simpler deployment (just open file)
   - Can upgrade to WebSockets later if needed

### Open Questions Noted in Vision

1. **Should `/2l-check-mcps` be new command or integrated into `/2l-status`?**
   - **Recommendation:** New command (`/2l-check-mcps`) for focused functionality
   - **Rationale:** MCP checking is distinct from plan status, deserves dedicated command
   - Provides clear entry point for setup verification

2. **Should `events.jsonl` be gitignored or committed?**
   - **Recommendation:** Add to `.gitignore`
   - **Rationale:** Events are runtime artifacts, not source code. Would bloat repository and create merge conflicts
   - Each developer's orchestration events are local to their machine

3. **Should event emission be silent or show confirmations?**
   - **Recommendation:** Silent (current behavior in `2l-event-logger.sh`)
   - **Rationale:** Events are for dashboard consumption, not human reading. Noisy logging would clutter orchestration output
   - Dashboard provides visualization - that's where users look for confirmation

### Testing Strategy Notes

Each iteration should include:
- **Unit testing:** Individual components work (event logger, MCP check)
- **Integration testing:** Components work together (events → dashboard)
- **End-to-end testing:** Full orchestration run with all pieces active

Specific tests needed:
- Iteration 1: Run `/2l-mvp` on simple project, verify events.jsonl created and correct
- Iteration 2: Run full orchestration, verify all agent events appear, dashboard shows complete timeline
- Iteration 3: Run `/2l-check-mcps` on different machines, verify accurate reporting

### Potential Future Enhancements (Out of Scope)

These are noted for future consideration but explicitly NOT part of this MVP:
- Event analytics dashboard (aggregated stats, trends)
- Real-time WebSocket streaming (instead of polling)
- Multi-project dashboard (view events across all plans)
- Event replay/debugging mode
- MCP auto-setup scripts
- Event filtering in dashboard
- Historical event database
- Performance metrics tracking

---

*Exploration completed: 2025-10-08T15:30:00Z*
*This report informs master planning decisions for plan-2*
