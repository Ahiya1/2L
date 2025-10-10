# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Fixing the broken 2L event system to enable real-time orchestration observability through dashboard, clarifying MCP connectivity requirements, and validating GitHub CLI integration after migration from GitHub MCP.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 6 must-have features
- **User stories/acceptance criteria:** 30+ acceptance criteria across 6 features
- **Estimated total work:** 8-12 hours

### Complexity Rating
**Overall Complexity: MEDIUM-HIGH**

**Rationale:**
- **Documentation-heavy work:** 10 agent markdown files need updating with consistent event emission patterns
- **System-wide integration:** Event emission must work across orchestrator (bash) and agents (markdown instructions)
- **Testing challenges:** Requires end-to-end orchestration run to verify events flow correctly
- **Multiple external dependencies:** Python 3.12+, Git 2.43+, gh CLI 2.45+, bash/zsh shell environment
- **Backward compatibility requirement:** Must not break existing orchestrations without event logging
- **Validation complexity:** Need to test GitHub integration, MCP verification, and event system independently

---

## Architectural Analysis

### Major Components Identified

1. **Event System Infrastructure (2l-event-logger.sh)**
   - **Purpose:** Core library for event emission, already exists and functional
   - **Complexity:** LOW
   - **Why critical:** Foundation for all observability - orchestrator and agents depend on this
   - **Status:** IMPLEMENTED (verified at `/home/ahiya/2l-claude-config/lib/2l-event-logger.sh`)
   - **Risk:** LOW - already working, just needs integration

2. **Orchestrator Event Emission (2l-mvp.md)**
   - **Purpose:** Emit phase transitions, iteration lifecycle events from orchestrator
   - **Complexity:** MEDIUM
   - **Why critical:** Orchestrator provides high-level orchestration visibility - without this, dashboard shows only agent-level detail
   - **Status:** PARTIALLY IMPLEMENTED (event logging infrastructure present, needs documentation and systematic emission)
   - **Risk:** MEDIUM - pseudocode in 2l-mvp.md needs conversion to actual bash event calls

3. **Agent Event Emission Templates (10 agent .md files)**
   - **Purpose:** Standardized instructions for agents to emit agent_start and agent_complete events
   - **Complexity:** LOW (per agent) / MEDIUM (consistency across all 10)
   - **Why critical:** Without agent events, dashboard can't track individual agent progress
   - **Status:** NOT IMPLEMENTED - no agent files currently have event emission sections
   - **Risk:** LOW - straightforward template addition, but needs careful consistency

4. **MCP Verification System (new command: 2l-check-mcps)**
   - **Purpose:** Check which MCPs are connected, guide setup for missing ones
   - **Complexity:** MEDIUM
   - **Why critical:** New user onboarding experience - reduces setup confusion
   - **Status:** NOT IMPLEMENTED - needs new command creation
   - **Risk:** MEDIUM - requires understanding Claude desktop config structure and MCP detection logic

5. **GitHub CLI Integration Verification**
   - **Purpose:** Validate gh CLI workflow (detect, auth check, repo creation, push)
   - **Complexity:** LOW
   - **Why critical:** User confidence in automatic GitHub backup
   - **Status:** IMPLEMENTED (confirmed at lines 1245-1299 in 2l-mvp.md)
   - **Risk:** LOW - already working (`gh` CLI detected, authenticated on system)

6. **Dashboard Display System**
   - **Purpose:** Parse events.jsonl and display timeline/progress
   - **Complexity:** LOW
   - **Why critical:** User-facing observability interface
   - **Status:** PARTIALLY IMPLEMENTED (template exists at lib/2l-dashboard-template.html)
   - **Risk:** LOW - HTML template exists, just needs events to consume

---

## Dependency Graph

```
FOUNDATION LAYER (Must exist first)
├── 2l-event-logger.sh (lib/)
│   ├── Status: ✓ EXISTS
│   ├── Function: log_2l_event()
│   └── Blocks: All event emission downstream
│
├── events.jsonl file location
│   ├── Location: .2L/events.jsonl
│   ├── Status: ✗ DOES NOT EXIST (created on first event)
│   └── Blocks: Dashboard data source
│
└── Python 3.12+ (external dependency)
    ├── Status: ✓ INSTALLED (confirmed)
    ├── Purpose: Orchestrator execution
    └── Blocks: Orchestrator event emission

    ↓

ORCHESTRATOR LAYER (Emits high-level events)
├── 2l-mvp.md orchestrator event emission
│   ├── Status: ⚠ NEEDS IMPLEMENTATION
│   ├── Events needed:
│   │   - plan_start (initialization)
│   │   - phase_change (exploration/planning/building/integration/validation)
│   │   - iteration_start (before iteration begins)
│   │   - iteration_complete (after iteration ends)
│   │   - complexity_decision (simple vs multi-iteration)
│   └── Blocks: Dashboard high-level progress visibility
│
└── Git + gh CLI (external dependencies)
    ├── Git Status: ✓ INSTALLED (v2.43.0)
    ├── gh CLI Status: ✓ INSTALLED (v2.45.0) & AUTHENTICATED
    └── Blocks: GitHub integration verification

    ↓

AGENT LAYER (Emits agent-specific events)
├── All 10 agent markdown files
│   ├── Status: ⚠ NEEDS EVENT SECTIONS ADDED
│   ├── Required additions:
│   │   - "Event Emission" section in each agent
│   │   - agent_start event (after context read, before work)
│   │   - agent_complete event (after work, before report)
│   ├── Files requiring updates:
│   │   1. 2l-builder.md
│   │   2. 2l-explorer.md
│   │   3. 2l-planner.md
│   │   4. 2l-integrator.md
│   │   5. 2l-iplanner.md
│   │   6. 2l-ivalidator.md
│   │   7. 2l-validator.md
│   │   8. 2l-healer.md
│   │   9. 2l-master-explorer.md
│   │   10. 2l-dashboard-builder.md
│   └── Blocks: Dashboard agent-level progress tracking
│
└── MCP Verification (new command)
    ├── Status: ✗ NOT IMPLEMENTED
    ├── Purpose: Check Playwright, Chrome DevTools, Supabase, Screenshot MCPs
    ├── Command: /2l-check-mcps (suggested name)
    └── Blocks: New user setup confidence

    ↓

PRESENTATION LAYER (Consumes events)
├── Dashboard (lib/2l-dashboard-template.html)
│   ├── Status: ✓ TEMPLATE EXISTS
│   ├── Depends on: events.jsonl with valid JSON
│   ├── Purpose: Parse and display event timeline
│   └── Blocks: User visibility into orchestration
│
└── README.md documentation
    ├── Status: ⚠ NEEDS UPDATES
    ├── Sections to add:
    │   - Event system architecture
    │   - MCP requirements (optional vs required)
    │   - GitHub integration using gh CLI (not GitHub MCP)
    │   - Setup verification steps
    └── Blocks: User understanding of system
```

---

## Critical Path Analysis

### Phase 1 Blockers (Must complete first)
**These block everything else:**

1. **Orchestrator event emission in 2l-mvp.md**
   - **Why critical:** Without orchestrator events, dashboard shows nothing even if agents emit
   - **Estimated effort:** 2-3 hours
   - **Blocks:** Dashboard functionality, iteration tracking
   - **Risk if skipped:** HIGH - core observability broken

2. **Agent template standardization**
   - **Why critical:** Inconsistent or missing agent events = incomplete dashboard data
   - **Estimated effort:** 3-4 hours (30min per agent × 10 agents)
   - **Blocks:** Agent-level progress visibility
   - **Risk if skipped:** MEDIUM - orchestrator events show high-level progress, but agents invisible

### Phase 2 Dependencies (Build on Phase 1)
**Can proceed in parallel after Phase 1:**

3. **MCP verification command**
   - **Why critical:** Improves onboarding, but doesn't block core functionality
   - **Estimated effort:** 2-3 hours
   - **Blocks:** New user setup experience
   - **Risk if skipped:** LOW - users can manually verify MCP connections
   - **Dependencies:** None (independent feature)

4. **GitHub CLI verification testing**
   - **Why critical:** Confidence in GitHub integration, but already implemented
   - **Estimated effort:** 1-2 hours (testing + documentation)
   - **Blocks:** User confidence in auto-backup
   - **Risk if skipped:** VERY LOW - already working, just needs validation docs
   - **Dependencies:** None (already implemented)

### Phase 3 Polish (Final touches)
**Complete after core features work:**

5. **README updates**
   - **Why critical:** Documentation accuracy
   - **Estimated effort:** 1-2 hours
   - **Blocks:** User understanding
   - **Risk if skipped:** LOW - system works without docs, but reduces usability
   - **Dependencies:** Needs Phase 1 & 2 complete to document accurately

6. **Dashboard template refinement**
   - **Why critical:** User experience polish
   - **Estimated effort:** 1 hour
   - **Blocks:** None (template already functional)
   - **Risk if skipped:** VERY LOW - basic template sufficient for MVP
   - **Dependencies:** Needs events.jsonl with data to test against

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (2 iterations recommended)

**Rationale:**
- 6 distinct features with varying dependencies
- Event system (features 1-3) forms critical foundation
- MCP/GitHub features (4-6) are independent verification/documentation work
- Natural split: **Core Event System** vs **Verification & Documentation**
- Total 8-12 hours splits nicely into two 4-6 hour iterations

---

### Suggested Iteration Phases

**Iteration 1: Event System Foundation**
- **Vision:** Get events flowing from orchestrator and agents to dashboard
- **Scope:** Core event emission and dashboard functionality
  - Orchestrator event emission in 2l-mvp.md (all phase transitions, iteration lifecycle)
  - Agent template updates (10 agent files + event emission sections)
  - Dashboard template verification (ensure events.jsonl is parsed correctly)
  - Basic testing (run simple /2l-mvp and verify dashboard shows events)
- **Why first:** Foundation for all observability - nothing else works without this
- **Estimated duration:** 5-6 hours
- **Risk level:** MEDIUM
  - Risk: Event format mismatch between orchestrator/agents and dashboard expectations
  - Risk: Bash event emission from orchestrator might fail silently
  - Mitigation: Test early with simple event, verify .2L/events.jsonl format
- **Success criteria:**
  - [ ] `.2L/events.jsonl` created and contains events
  - [ ] Orchestrator emits plan_start, phase_change, iteration_start, iteration_complete
  - [ ] All 10 agents have "Event Emission" sections with agent_start/agent_complete
  - [ ] Dashboard HTML opens and displays event timeline
  - [ ] Test run of /2l-mvp shows progress in dashboard
- **Dependencies:**
  - Requires: 2l-event-logger.sh (already exists ✓)
  - Requires: Python 3.12+ (already installed ✓)
  - Imports: log_2l_event function from event logger library

**Iteration 2: Verification & Documentation**
- **Vision:** Complete MCP verification, GitHub validation, and accurate documentation
- **Scope:** User-facing verification tools and documentation polish
  - MCP verification command (/2l-check-mcps or similar)
  - GitHub CLI integration testing and validation docs
  - README updates (event system, MCP requirements, gh CLI docs)
  - Testing strategy documentation
- **Why second:** Builds on working event system, independent features that enhance UX
- **Estimated duration:** 3-4 hours
- **Risk level:** LOW
  - Risk: MCP detection logic might not work across different Claude desktop config formats
  - Risk: GitHub integration already works, minimal risk
  - Mitigation: Test MCP check on actual machine, document known limitations
- **Success criteria:**
  - [ ] /2l-check-mcps command exists and reports MCP status
  - [ ] MCP check shows: Playwright, Chrome DevTools, Supabase, Screenshot status
  - [ ] GitHub integration verified (gh CLI detected, authenticated, repo creation tested)
  - [ ] README documents event system architecture
  - [ ] README clarifies optional vs required MCPs
  - [ ] README documents gh CLI usage (not GitHub MCP)
- **Dependencies:**
  - Requires: Iteration 1 complete (for accurate event system docs)
  - Imports: Event format examples from iteration 1 for documentation
  - Independent: MCP verification and GitHub validation are standalone features

---

## Risk Assessment

### High Risks

- **Event Format Mismatch Between Components**
  - **Impact:** Dashboard can't parse events, shows blank or errors
  - **Mitigation:**
    - Define event schema early (already defined in vision: `{"timestamp":"","event_type":"","phase":"","agent_id":"","data":""}`)
    - Test with single event before implementing everywhere
    - Add validation function to log_2l_event to catch format errors
  - **Recommendation:** Address in iteration 1, first task

- **Orchestrator Event Emission Fails Silently**
  - **Impact:** No high-level events logged, dashboard shows incomplete picture
  - **Mitigation:**
    - Test event logging early in orchestrator execution
    - Add defensive checks (if EVENT_LOGGING_ENABLED; then log_2l_event)
    - Log fallback message if event writing fails
  - **Recommendation:** Add debugging mode for event emission in iteration 1

### Medium Risks

- **Agent Event Emission Inconsistency**
  - **Impact:** Some agents emit events, others don't - incomplete tracking
  - **Mitigation:**
    - Create single template for "Event Emission" section
    - Copy-paste to all 10 agents with minimal customization
    - Validation checklist during implementation
  - **Recommendation:** Use standardized template approach in iteration 1

- **MCP Detection Logic Complexity**
  - **Impact:** /2l-check-mcps doesn't work reliably across different machines
  - **Mitigation:**
    - Start with simple checks (look for MCP in Claude desktop config)
    - Document known limitations (e.g., only checks config, not actual connectivity)
    - Provide manual verification fallback
  - **Recommendation:** Implement basic detection in iteration 2, document limitations

- **Dashboard Polling Performance**
  - **Impact:** Dashboard reads events.jsonl frequently, might be slow with large event files
  - **Mitigation:**
    - Acceptable for MVP (vision explicitly states "use polling for now")
    - Future optimization: WebSocket streaming (marked as should-have/could-have)
    - Document limitation in README
  - **Recommendation:** Accept limitation for MVP, document in iteration 2

### Low Risks

- **Backward Compatibility Concern**
  - **Impact:** Old orchestrations without event logging might fail
  - **Mitigation:** Already handled - 2l-mvp.md has EVENT_LOGGING_ENABLED flag and graceful fallback
  - **Resolution:** Risk already mitigated in current implementation

- **GitHub CLI Not Installed**
  - **Impact:** GitHub integration doesn't work
  - **Mitigation:** Already handled - setup_github_repo() checks for gh CLI and auth, gracefully degrades to local git only
  - **Resolution:** Risk already mitigated, just needs documentation in iteration 2

- **Dashboard Not Auto-Refreshing**
  - **Impact:** User must manually refresh browser to see new events
  - **Mitigation:** Acceptable for MVP (marked as should-have in vision)
  - **Resolution:** Document manual refresh requirement in iteration 2

---

## Integration Considerations

### Cross-Phase Integration Points

- **Event Schema Consistency**
  - **What:** JSON schema for events must match between orchestrator, agents, and dashboard
  - **Why spans iterations:** Defined in iteration 1, documented in iteration 2
  - **Integration challenge:** Dashboard JavaScript must parse exact format emitted by orchestrator/agents
  - **Solution:** Define schema first, validate with test event before implementing everywhere

- **Event Logger Library Sourcing**
  - **What:** Both orchestrator (bash) and agent instructions (markdown) reference log_2l_event function
  - **Why spans iterations:** Orchestrator sources in bash, agents instruct via markdown
  - **Integration challenge:** Agents can't directly source bash library - must rely on orchestrator environment
  - **Solution:** Ensure orchestrator sources library before spawning agents, agents inherit environment

- **Documentation Cross-References**
  - **What:** README must accurately describe event system implemented in iteration 1
  - **Why spans iterations:** Implementation (iter 1) → Documentation (iter 2)
  - **Integration challenge:** Docs might drift from implementation if not verified
  - **Solution:** Test examples in README against actual event output

### Potential Integration Challenges

- **Orchestrator Event Emission Timing**
  - **Challenge:** Events must be emitted at exact right moments in orchestrator flow
  - **Why tricky:** 2l-mvp.md is pseudocode, needs conversion to actual bash calls
  - **Solution:** Map each pseudocode comment "# EVENT: event_type" to actual log_2l_event call

- **Agent Environment Variable Access**
  - **Challenge:** Agents need access to phase, plan_id, agent_id for event context
  - **Why tricky:** Agents are spawned via Task tool, environment might not pass through
  - **Solution:** Orchestrator must export necessary env vars before spawning agents

- **Dashboard Static File Reading**
  - **Challenge:** Dashboard HTML must read .2L/events.jsonl from filesystem
  - **Why tricky:** Browser security (CORS) might block local file reading
  - **Solution:** Dashboard must be opened from file:// protocol, document this requirement

---

## Recommendations for Master Plan

1. **Split into 2 iterations (NOT 1)**
   - Iteration 1 focuses purely on event system foundation (orchestrator + agents + dashboard)
   - Iteration 2 handles verification tools and documentation
   - Reasoning: Event system must be solid before documenting it

2. **Prioritize orchestrator event emission first**
   - Within iteration 1, start with orchestrator events before agent templates
   - Reasoning: Orchestrator events provide immediate dashboard value, agent events add detail

3. **Use standardized template for agent updates**
   - Create single "Event Emission" section template
   - Copy to all 10 agents with minimal customization
   - Reasoning: Ensures consistency, reduces risk of divergent implementations

4. **Test early and often in iteration 1**
   - After orchestrator events: run simple /2l-mvp and check .2L/events.jsonl
   - After first agent template: verify agent_start/agent_complete events appear
   - After dashboard: open HTML and verify timeline displays
   - Reasoning: Catch integration issues early when cheap to fix

5. **Accept MVP limitations, document clearly**
   - Manual dashboard refresh (no auto-polling)
   - Basic MCP detection (config check only, not connectivity test)
   - Static dashboard (no WebSocket streaming)
   - Reasoning: Vision explicitly scopes these as should-have/could-have, not must-have

6. **Leverage existing implementations**
   - 2l-event-logger.sh already works (don't rewrite)
   - GitHub integration already implemented (just test and document)
   - Dashboard template exists (just verify event parsing)
   - Reasoning: Reduces risk, focuses effort on integration gaps

---

## Technology Recommendations

### Existing Codebase Findings

- **Stack detected:**
  - Bash orchestration with Python helper functions
  - Markdown-based agent definitions (Claude Code custom agents)
  - JSONL event format (newline-delimited JSON)
  - Static HTML dashboard with vanilla JavaScript
  - Git + gh CLI for version control and GitHub integration

- **Patterns observed:**
  - Event logging library pattern (source, then call function)
  - Graceful degradation (EVENT_LOGGING_ENABLED flag, gh CLI checks)
  - Convention: .2L/ directory for plan metadata
  - Convention: events.jsonl in project root .2L/
  - Agent spawning via Task tool with context passing

- **Opportunities:**
  - Event validation could be added to log_2l_event function
  - Dashboard could add filtering/search in future (vision: should-have)
  - MCP verification could be more robust (actual connectivity test)

- **Constraints:**
  - Must maintain backward compatibility (old orchestrations without events)
  - Must work across Linux (primary) and macOS (secondary)
  - Bash/zsh shell requirement (can't use fish, other shells)
  - Static dashboard only (no server-side processing for MVP)

### External Dependencies Status

| Dependency | Version Required | Status | Risk |
|------------|------------------|--------|------|
| Python | 3.12+ | ✓ INSTALLED (3.12.3) | NONE |
| Git | 2.43+ | ✓ INSTALLED (2.43.0) | NONE |
| gh CLI | 2.45+ | ✓ INSTALLED (2.45.0) | NONE |
| Bash/Zsh | 4.0+ | ✓ INSTALLED (system shell) | NONE |
| 2l-event-logger.sh | latest | ✓ EXISTS (/home/ahiya/2l-claude-config/lib/) | NONE |

**All external dependencies satisfied. Zero dependency installation required.**

---

## Testing Strategy

### Iteration 1 Testing (Event System)

**Test 1: Event Logger Function**
```bash
# Verify log_2l_event function works
source ~/.claude/lib/2l-event-logger.sh
log_2l_event "test_event" "Test data" "testing" "test-agent"
cat .2L/events.jsonl
# Expected: Valid JSON line with timestamp, event_type, phase, agent_id, data
```

**Test 2: Orchestrator Event Emission**
```bash
# Run simple /2l-mvp execution
/2l-mvp "Create a simple hello world script"
# Expected: .2L/events.jsonl created with plan_start, phase_change events
cat .2L/events.jsonl | grep -E "(plan_start|phase_change|iteration_start)"
```

**Test 3: Agent Event Emission**
```bash
# Check agent events after orchestration
cat .2L/events.jsonl | grep -E "(agent_start|agent_complete)"
# Expected: agent_start and agent_complete for each spawned agent
```

**Test 4: Dashboard Display**
```bash
# Open dashboard in browser
firefox .2L/dashboard.html  # or chrome, safari
# Expected: Event timeline visible, phases shown, agents tracked
```

### Iteration 2 Testing (Verification & Docs)

**Test 5: MCP Verification Command**
```bash
# Run MCP check
/2l-check-mcps
# Expected: Status report for Playwright, Chrome DevTools, Supabase, Screenshot
```

**Test 6: GitHub Integration**
```bash
# Verify gh CLI workflow
gh --version  # Should show 2.45+
gh auth status  # Should show authenticated
# Run /2l-mvp on new project, verify GitHub repo created
```

**Test 7: Documentation Accuracy**
```bash
# Follow README setup instructions on fresh clone
# Verify each step works as documented
# Check event system docs match actual implementation
```

---

## Notes & Observations

### Key Insights

1. **Foundation Already Exists:** 2l-event-logger.sh is fully implemented and functional - this significantly reduces risk and effort for iteration 1.

2. **GitHub Integration Already Works:** setup_github_repo() function confirmed in 2l-mvp.md (lines 1245-1299), gh CLI installed and authenticated on system - iteration 2 is mostly validation and documentation.

3. **Backward Compatibility Already Handled:** EVENT_LOGGING_ENABLED flag pattern already present in 2l-mvp.md - new event emissions won't break old orchestrations.

4. **Dashboard Template Exists:** HTML template confirmed at lib/2l-dashboard-template.html - just needs events to consume.

5. **Scope is Well-Contained:** All work is documentation and integration, no new infrastructure needed. This is "plumbing" work - connecting existing pieces.

### Strategic Considerations

- **This is a "polish and connect" plan, not "build from scratch"** - reduces risk significantly
- **Documentation-heavy** - 10 agent files need updates, but pattern is repetitive
- **High testing value** - end-to-end orchestration test validates entire system
- **User-facing impact** - working dashboard dramatically improves developer experience
- **Low external risk** - all dependencies already satisfied, no installation needed

### Complexity Drivers

The MEDIUM-HIGH complexity rating comes from:
- **Coordination:** 10+ files need consistent updates
- **Integration testing:** Requires full orchestration run to validate
- **System-wide change:** Touches orchestrator, agents, dashboard, docs
- **Quality bar:** Events must be reliable for dashboard to be useful

NOT from:
- Technical difficulty (event emission is straightforward)
- External dependencies (all satisfied)
- Architecture decisions (patterns already established)

---

*Exploration completed: 2025-10-08T15:30:00Z*
*This report informs master planning decisions*
