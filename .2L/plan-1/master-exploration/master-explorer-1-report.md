# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Enhance the 2L autonomous development framework with real-time observability dashboard, clean MCP integrations, intelligent healing exploration, honest validation reporting, and adaptive master explorer scaling (2-4 explorers based on complexity).

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 5 major features
  1. Real-Time Dashboard (event logging + HTML dashboard)
  2. MCP Integration Cleanup (remove broken MCPs, standardize)
  3. Healing Exploration Phase (add explore step before healing)
  4. Honesty in Validation (uncertainty reporting)
  5. Master Explorer Expansion (adaptive 2-4 explorer spawning)
- **User stories/acceptance criteria:** 24 success criteria across 5 feature areas
- **Files to create:** 3 new files
- **Files to modify:** 10 existing files
- **Estimated total work:** 18-24 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **Meta-programming nature:** This is self-improvement of the 2L system itself, requiring deep understanding of orchestration flow and inter-agent dependencies
- **13 files affected:** 3 new files + 10 modified files across multiple subsystems (commands, agents, lib)
- **Multiple subsystem integration:** Dashboard + event logging + command orchestration + agent prompt engineering + healing flow redesign
- **Tight coupling with existing system:** Must maintain backward compatibility with existing plans and resume functionality
- **Cross-cutting concerns:** Changes span all phases of 2L execution (planning, exploration, building, validation, healing)
- **Cascading dependencies:** Dashboard requires event logger; healing exploration requires command flow changes; MCP cleanup touches 6 agents

---

## Architectural Analysis

### Major Components Identified

1. **Real-Time Dashboard System**
   - **Purpose:** Provide live visibility into orchestration progress via single-file HTML dashboard polling event stream
   - **Complexity:** HIGH
   - **Why critical:** First observability layer for 2L - enables monitoring of multi-agent orchestration. Pure frontend with no dependencies (file:// protocol). Event stream architecture enables multi-project support.
   - **Sub-components:**
     - `lib/2l-event-logger.sh` - Bash helper library with `log_2l_event()` function
     - `agents/2l-dashboard-builder.md` - Agent that generates dashboard HTML
     - `.2L/events.jsonl` - Append-only event log per project
     - Dashboard initialization in `2l-mvp.md` - Auto-create on first run
     - Event logging hooks at all orchestration checkpoints

2. **MCP Integration Layer**
   - **Purpose:** Standardize MCP references across all agents, remove broken integrations, add graceful fallback
   - **Complexity:** MEDIUM
   - **Why critical:** Currently causes validation confusion with 2 broken MCPs (GitHub auth, Screenshot platform). Clean slate of 3 working MCPs (Playwright, Chrome DevTools, Supabase) eliminates false failures.
   - **Impact scope:** 6 agent files + 4 command files need MCP section updates

3. **Healing Orchestration Flow**
   - **Purpose:** Add exploration phase before healing to analyze root causes (not just symptoms)
   - **Complexity:** HIGH
   - **Why critical:** Current healing lacks root cause analysis, leading to symptom-only fixes. New flow: explore → heal → validate. Requires significant changes to Phase 6 in `2l-mvp.md`.
   - **New structure:**
     - Spawn 1-2 healing explorers before healers
     - Explorer 1: Root cause analysis (always)
     - Explorer 2: Dependency analysis (if >3 failure categories)
     - Healers read both validation + exploration reports

4. **Validation Reporting Standards**
   - **Purpose:** Add honesty/confidence levels to validation reports to avoid false positives
   - **Complexity:** MEDIUM
   - **Why critical:** Prevents false completion reports. Introduces new statuses (PASS, UNCERTAIN, PARTIAL, INCOMPLETE, FAIL) with confidence thresholds (80% rule).
   - **Impact:** Primarily prompt engineering in `2l-validator.md` and `2l-ivalidator.md`

5. **Master Explorer Scaling System**
   - **Purpose:** Adaptively spawn 2-4 master explorers based on project complexity instead of fixed 2
   - **Complexity:** MEDIUM
   - **Why critical:** Complex projects need more strategic perspectives. Adds Explorer 3 (UX/Integration) and Explorer 4 (Scalability/Performance) with adaptive logic based on feature count and integration count.
   - **Impact:** Changes to `2l-master-explorer.md`, `2l-mvp.md`, `2l-plan.md`, `2l-continue.md`

### Technology Stack Implications

**Codebase Type**
- **Brownfield:** Extending existing 2L system in `~/.claude/`
- **Stack detected:** Bash orchestration + Markdown agent prompts
- **Patterns to follow:** Existing file structure (commands/, agents/, lib/), YAML config format, .2L project structure

**Dashboard Technology**
- **Options:** React SPA, Vue.js, vanilla HTML/CSS/JS
- **Recommendation:** Pure vanilla HTML/CSS/JS in single file (<500 lines)
- **Rationale:**
  - Zero dependencies (works offline via file://)
  - No build step needed
  - Fast generation by dashboard builder agent
  - Polling architecture (2-second intervals) trivial with vanilla JS

**Event Logging**
- **Options:** Node.js logging library, Python logger, Bash append
- **Recommendation:** Pure Bash with `>>` append to JSONL
- **Rationale:**
  - No new dependencies
  - Append-only JSONL safe for concurrent writes
  - Simple `log_2l_event()` function wrapper
  - Sourced by `2l-mvp.md` at runtime

**Orchestration Integration**
- **Approach:** Minimal intrusion into existing command flow
- **Event hooks:** Insert `log_2l_event` calls at:
  - Plan start
  - Iteration start/complete
  - Phase changes
  - Agent spawn/complete
  - Validation results
  - Cost updates

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale:**
- 5 distinct features with varying dependencies
- Dashboard + event logging form natural foundation
- MCP cleanup + honesty are parallel independent improvements
- Healing exploration + master explorers are advanced orchestration changes
- Enables incremental testing and validation of each subsystem
- Total 18-24 hours work: 6-8 hours per iteration

---

### Suggested Iteration Phases

**Iteration 1: Observability Foundation (Dashboard + Event Logging)**
- **Vision:** Establish real-time visibility into 2L orchestration
- **Scope:** Dashboard system end-to-end
  - Create `lib/2l-event-logger.sh` with `log_2l_event()` function
  - Create `agents/2l-dashboard-builder.md` agent definition
  - Update `commands/2l-mvp.md` to initialize dashboard on first run
  - Add event logging calls at all orchestration checkpoints
  - Generate `.2L/dashboard/index.html` with polling logic
  - Test dashboard creation, event streaming, and display
- **Why first:** Foundation for monitoring all future work. No dependencies on other features. Dashboard builder agent can be tested independently.
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM
  - Risk: Dashboard HTML generation complexity
  - Risk: Event logging performance impact (mitigation: simple append-only writes)
  - Risk: Multi-project isolation (mitigation: each project has own .2L/events.jsonl)
- **Success criteria:**
  - Dashboard auto-creates on `/2l-mvp` run
  - Events stream in real-time
  - Dashboard updates every 2 seconds
  - Shows active agents, cost, events, MCP status

**Iteration 2: Reliability & Standards (MCP Cleanup + Validation Honesty)**
- **Vision:** Eliminate false failures and false positives from validation
- **Scope:** Clean up MCP integrations + add honest reporting
  - Remove all GitHub MCP and Screenshot MCP references (search/replace)
  - Standardize MCP sections in 6 agents (Playwright, Chrome DevTools, Supabase only)
  - Add "optional, skip gracefully" guidance to validators
  - Update `2l-validator.md` with honesty section + 80% confidence rule
  - Update `2l-ivalidator.md` with uncertainty handling
  - Update validation report templates with confidence levels
  - Add new statuses: UNCERTAIN, PARTIAL, INCOMPLETE
  - Update `2l-planner.md` to generate MCP patterns in patterns.md
- **Dependencies:** None (parallel to iteration 1, but logically second)
- **Estimated duration:** 5-7 hours
- **Risk level:** LOW
  - Risk: Missing some MCP references (mitigation: thorough grep search)
  - Risk: Validation reports format breaking existing flows (mitigation: additive changes only)
- **Success criteria:**
  - Zero GitHub/Screenshot MCP references
  - Exactly 3 MCPs consistently mentioned
  - Validators report confidence levels
  - No confusing MCP errors during validation

**Iteration 3: Advanced Orchestration (Healing Exploration + Master Explorer Scaling)**
- **Vision:** Intelligent healing with root cause analysis + adaptive exploration depth
- **Scope:** Redesign healing flow + expand master explorers
  - Add Phase 6.1 (Healing Exploration) to `2l-mvp.md`
  - Define healing explorer 1 (root cause) and 2 (dependencies)
  - Update `2l-healer.md` to consume exploration reports
  - Create `healing-{N}/exploration/` directory structure
  - Add Explorer 3 (UX/Integration) to `2l-master-explorer.md`
  - Add Explorer 4 (Scalability/Performance) to `2l-master-explorer.md`
  - Implement adaptive spawning logic (2-4 explorers) in `2l-mvp.md` and `2l-plan.md`
  - Update `2l-continue.md` resume detection for 2-4 explorers
  - Update config.yaml structure to track `num_explorers`
  - Test complete healing flow with exploration
  - Test master explorer spawning at different complexity levels
- **Dependencies:**
  - Requires: Understanding of existing orchestration flow (from iteration 1 work)
  - Imports: Event logging for healing exploration events (from iteration 1)
  - Benefits from: Dashboard visibility to monitor new flows (iteration 1)
- **Estimated duration:** 7-9 hours
- **Risk level:** HIGH
  - Risk: Breaking existing healing flow (mitigation: careful phase insertion, backward compat)
  - Risk: Resume detection complexity with variable explorer count (mitigation: config-driven)
  - Risk: Master explorer coordination (4 explorers writing reports simultaneously)
- **Success criteria:**
  - Healing spawns explorers before healers
  - Explorer reports guide healing strategies
  - Adaptive spawning works (2 for simple, 3 for medium, 4 for complex)
  - Resume detection handles 2-4 explorers
  - Config tracks `num_explorers`

---

## Dependency Graph

```
Iteration 1: Observability Foundation
├── lib/2l-event-logger.sh (new)
├── agents/2l-dashboard-builder.md (new)
├── commands/2l-mvp.md (modified: dashboard init + event hooks)
└── .2L/dashboard/index.html (generated)
    ↓
Iteration 2: Reliability & Standards (parallel, no hard dependency)
├── agents/2l-validator.md (MCP cleanup + honesty)
├── agents/2l-ivalidator.md (honesty)
├── agents/2l-builder.md (MCP cleanup)
├── agents/2l-healer.md (MCP cleanup)
├── agents/2l-planner.md (MCP patterns)
├── commands/2l-task.md (MCP references)
└── commands/2l-mvp.md (MCP comments)
    ↓
Iteration 3: Advanced Orchestration (uses insights from 1 & 2)
├── commands/2l-mvp.md (healing exploration phase)
│   ├── Healing Explorer 1 (root cause)
│   └── Healing Explorer 2 (dependencies, conditional)
├── agents/2l-healer.md (read exploration reports)
├── agents/2l-master-explorer.md (add Explorer 3 & 4)
├── commands/2l-plan.md (adaptive spawning)
├── commands/2l-continue.md (resume 2-4 explorers)
└── Event logging for healing phases (uses iteration 1 infrastructure)
```

**Key Integration Points:**
- Dashboard (iteration 1) provides visibility for testing iterations 2 & 3
- Event logging (iteration 1) tracks healing exploration events (iteration 3)
- MCP cleanup (iteration 2) benefits healers and validators in iteration 3
- All iterations touch `2l-mvp.md` (main orchestration file) - requires careful coordination

---

## Risk Assessment

### High Risks

- **Breaking existing orchestration flow**
  - **Impact:** Existing plans fail to resume or execute correctly
  - **Mitigation:**
    - Test with backward compatibility: old plans continue working
    - Add defensive checks before new code paths
    - Iteration 3 healing changes are highest risk (most invasive)
    - Use feature flags or conditional logic for new flows
  - **Recommendation:** Tackle in iteration 3 after foundation proven

- **Dashboard generation complexity**
  - **Impact:** Dashboard builder agent fails or creates non-functional HTML
  - **Mitigation:**
    - Keep dashboard simple (<500 lines total)
    - Use template-driven approach with clear sections
    - Test polling logic independently
    - Fallback: manual HTML template with placeholders
  - **Recommendation:** Iteration 1 focus; validate early

- **Multi-project event file isolation**
  - **Impact:** Events from different projects get mixed or overwritten
  - **Mitigation:**
    - Each project has own `.2L/events.jsonl`
    - Dashboard polls local project events only
    - file:// protocol ensures browser isolation
  - **Recommendation:** Test with 2+ projects running simultaneously

### Medium Risks

- **MCP reference cleanup thoroughness**
  - **Impact:** Some broken MCP references remain, causing confusing errors
  - **Mitigation:**
    - Thorough grep search: `grep -ri "github mcp\|screenshot mcp" ~/.claude/`
    - Search for variations: "GitHub MCP", "github-mcp", "gh MCP"
    - Test validation with all 3 MCPs unavailable (graceful skip)
  - **Recommendation:** Systematic search + replace in iteration 2

- **Healing explorer coordination**
  - **Impact:** Explorer 1 and Explorer 2 duplicate work or miss dependencies
  - **Mitigation:**
    - Clear separation: Explorer 1 = root causes, Explorer 2 = dependencies only
    - Explorer 2 only spawns if >3 failure categories
    - Both explorers read same validation report
  - **Recommendation:** Well-defined interfaces in iteration 3

- **Adaptive spawning logic edge cases**
  - **Impact:** Wrong number of explorers spawned for complexity level
  - **Mitigation:**
    - Clear thresholds: <5 features=2, <15 features + <3 integrations=3, else=4
    - Log spawning decision in events
    - Allow manual override in config
  - **Recommendation:** Test with projects of varying complexity

### Low Risks

- **Event logging performance overhead**
  - **Impact:** Orchestration slowdown from frequent event writes
  - **Mitigation:** Simple `>>` append is fast; JSONL is lightweight
  - **Likelihood:** Very low (append-only writes are near-instant)

- **Dashboard browser compatibility**
  - **Impact:** Dashboard doesn't work in some browsers
  - **Mitigation:** Use vanilla JS with no ES6+ features; test in Firefox/Chrome
  - **Likelihood:** Low (polling + DOM updates are universally supported)

- **Resume detection with variable explorers**
  - **Impact:** Can't resume after explorer count mismatch
  - **Mitigation:** Config stores `num_explorers`; resume reads this value
  - **Likelihood:** Low (config-driven approach is proven pattern)

---

## Integration Considerations

### Cross-Phase Integration Points

- **`commands/2l-mvp.md` (touched by all 3 iterations)**
  - Iteration 1: Dashboard init + event logging hooks
  - Iteration 2: MCP comment cleanup
  - Iteration 3: Healing exploration phase + adaptive explorer spawning
  - **Strategy:** Edit in sequence; use clear section markers; test after each iteration

- **Event logging infrastructure (iteration 1 enables iteration 3)**
  - Iteration 1: Establishes event format and logging function
  - Iteration 3: Adds new event types (healing_exploration_start, healing_explorer_complete)
  - **Strategy:** Design extensible event schema in iteration 1; add types in iteration 3

- **Agent prompt patterns (MCP sections)**
  - Iteration 2: Standardizes MCP section template
  - All future agent updates should use this template
  - **Strategy:** Create reusable MCP section snippet; apply consistently

### Potential Integration Challenges

- **Concurrent edits to `2l-mvp.md`**
  - Challenge: Main orchestration file modified in all 3 iterations
  - Solution: Use clear section boundaries; edit different phases
  - Iteration 1: Top of file (dashboard init) + event hooks throughout
  - Iteration 2: Comments only (minimal)
  - Iteration 3: Phase 6 (healing) + Phase 2 (master exploration)

- **Config format evolution**
  - Challenge: Adding new config fields (dashboard, num_explorers) without breaking existing
  - Solution: Make all new fields optional with sensible defaults
  - Backward compat: Old configs work without new fields

- **Dashboard event schema evolution**
  - Challenge: Adding new event types mid-flight
  - Solution: Dashboard gracefully handles unknown event types (display raw JSON)

---

## Recommendations for Master Plan

1. **Use 3-iteration approach for safety and testing**
   - Iteration 1 establishes critical observability foundation
   - Iteration 2 improves reliability (independent, lower risk)
   - Iteration 3 adds advanced features once foundation proven
   - Each iteration is testable independently

2. **Prioritize iteration 1 completion**
   - Dashboard provides visibility into iterations 2 & 3 work
   - Event logging infrastructure used by iteration 3
   - Low user-facing risk (pure observability addition)
   - Can validate rest of system with real-time monitoring

3. **Consider iteration 2 and 3 as flexible**
   - Iteration 2 (MCP + honesty) is valuable but optional
   - Could defer to future plan if time-constrained
   - Iteration 3 (healing + explorers) has highest ROI for complex projects
   - Could split iteration 3 into 3a (healing) + 3b (explorers) if needed

4. **Test backward compatibility rigorously**
   - After each iteration, test existing plans resume correctly
   - Verify old config formats still work
   - Check that new features degrade gracefully if config missing

5. **Use iteration 1 dashboard to monitor iterations 2 & 3**
   - Meta-observation: Watch 2L improve itself in real-time
   - Validate event logging works correctly
   - Identify any orchestration bottlenecks early

---

## Technology Recommendations

### Existing Codebase Findings

- **Stack detected:**
  - Bash scripts for orchestration (`commands/*.md` executed via Claude)
  - Markdown agent definitions (`agents/*.md`)
  - YAML config format (implied by vision)
  - File-based state management (`.2L/` directories)

- **Patterns observed:**
  - Agent prompts are self-contained markdown files with YAML frontmatter
  - Commands are also markdown with orchestration logic
  - State stored in `.2L/plan-N/` hierarchy
  - Resume detection via file presence checks

- **Opportunities:**
  - Add `lib/` directory for shared utilities (new in this plan)
  - Dashboard in `.2L/dashboard/` follows project isolation pattern
  - Event logging via JSONL aligns with append-only state philosophy

- **Constraints:**
  - Must work with Claude Code as execution environment
  - No external dependencies beyond verified MCPs
  - Backward compatibility with existing plans/configs
  - File-based orchestration (no daemon processes)

### Key Technology Decisions

**Dashboard:**
- Single HTML file, <500 lines
- Inline CSS (dark theme) + inline JS (polling + rendering)
- Polls `.2L/events.jsonl` via fetch every 2 seconds
- No build step, no npm, works via file://

**Event Logging:**
- Bash function in `lib/2l-event-logger.sh`
- JSONL format (one JSON object per line)
- Append-only with `>>` operator
- Fields: timestamp, event_type, phase, agent_id, data

**Orchestration Changes:**
- All in Markdown command files (existing pattern)
- Event hooks via `log_2l_event` calls
- Conditional logic for adaptive spawning
- Config-driven (YAML) for new fields

---

## Notes & Observations

- **Meta-programming insight:** This project uses 2L to improve 2L itself. The dashboard will monitor its own creation!

- **Observability first:** Iteration 1 (dashboard) provides the tooling to monitor iterations 2 & 3. This is strategic - build the visibility layer before making complex orchestration changes.

- **MCP cleanup is overdue:** The vision notes confusing errors from broken MCPs. Iteration 2 addresses technical debt that reduces trust in the system.

- **Healing exploration is sophisticated:** Moving from "categorize→heal→validate" to "explore→heal→validate" shows maturity in the 2L approach. Root cause analysis before fixing is software engineering best practice.

- **Adaptive explorers scale with complexity:** Current 2-explorer limit may under-serve very complex projects. New 2-4 adaptive approach is smart - simple projects don't pay overhead, complex ones get more strategic depth.

- **Backward compatibility is critical:** Since this modifies the 2L system itself, any breaking changes could brick the tool. All iterations must test existing plans continue working.

- **File structure is elegant:** Using `.2L/events.jsonl` per project and `file://` protocol enables multiple projects simultaneously without conflicts. This is distributed-systems thinking applied to local file orchestration.

- **Total scope is substantial:** 13 files touched, 24 success criteria, 5 major features. This justifies COMPLEX rating and 3-iteration breakdown. Attempting in single iteration risks integration issues.

- **Dashboard is the killer feature:** Real-time visibility transforms 2L from "black box orchestration" to observable, debuggable system. This alone justifies iteration 1.

---

*Exploration completed: 2025-10-03T02:35:00Z*
*This report informs master planning decisions*
