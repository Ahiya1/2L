# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Enhance the 2L autonomous development framework by adding real-time observability dashboard, cleaning up broken MCP integrations, adding healing exploration phase, implementing honest validation reporting, and expanding master explorers from 2 to 2-4 based on complexity.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 5 major features (Dashboard, MCP Cleanup, Healing Exploration, Honest Validation, Master Explorer Expansion)
- **User stories/acceptance criteria:** 25+ distinct success criteria across all features
- **Estimated total work:** 16-24 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **Meta-programming challenge:** Modifying the 2L system itself requires deep understanding of orchestration flow, agent interactions, and state management
- **13 file modifications + 3 new files:** Requires careful coordination across commands, agents, and library code
- **Backward compatibility requirement:** All changes must work with existing plans and not break resume functionality
- **Multi-layered dependencies:** Dashboard depends on event logging; healing exploration must integrate into existing healing flow; MCP cleanup touches 6+ agent files
- **Real-time event system:** Dashboard requires new event logging infrastructure and JSONL streaming

---

## Architectural Analysis

### Major Components Identified

1. **Event Logging & Dashboard System**
   - **Purpose:** Provide real-time visibility into 2L orchestration progress
   - **Complexity:** HIGH
   - **Why critical:** Foundational infrastructure for observability; required by dashboard feature and will inform all orchestration decisions going forward

2. **MCP Integration Layer**
   - **Purpose:** Standardize Model Context Protocol usage across all agents
   - **Complexity:** MEDIUM
   - **Why critical:** Affects validation reliability and agent behavior; broken MCPs cause confusing errors that undermine trust in the system

3. **Healing Workflow Enhancement**
   - **Purpose:** Add exploration phase before healing to improve root cause analysis
   - **Complexity:** MEDIUM
   - **Why critical:** Improves healing success rate by understanding problems before fixing them; prevents symptom-only fixes

4. **Validation Reporting System**
   - **Purpose:** Implement honest uncertainty reporting in validation agents
   - **Complexity:** LOW
   - **Why critical:** Builds trust and accuracy by reporting confidence levels rather than false completion

5. **Master Exploration Orchestration**
   - **Purpose:** Dynamically spawn 2-4 master explorers based on project complexity
   - **Complexity:** MEDIUM
   - **Why critical:** Improves strategic planning quality for complex projects; scales exploration effort to match project needs

### Technology Stack Implications

**Event Logging Infrastructure**
- **Options:** Pure Bash with JSONL append-only file, SQLite database, Redis pubsub
- **Recommendation:** Pure Bash + JSONL (as specified in vision)
- **Rationale:** Zero external dependencies, safe for concurrent access, works across all platforms, simple implementation

**Dashboard Technology**
- **Options:** React SPA with build step, Vue.js, Pure HTML/CSS/JS
- **Recommendation:** Pure HTML/CSS/JS (as specified in vision)
- **Rationale:** Single file distribution, no build step, works offline via file://, zero dependencies, mobile-friendly

**State Management**
- **Options:** Extend config.yaml, separate state files, in-memory only
- **Recommendation:** Extend config.yaml + events.jsonl
- **Rationale:** Leverages existing config structure, events.jsonl provides audit trail, no additional state management complexity

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale for 3 iterations:**
- **Too complex for single iteration:** 13 file modifications + 3 new files with intricate dependencies
- **Natural architectural phases:** Infrastructure → Cleanup & Improvements → Advanced Features
- **Risk management:** Each iteration can be validated independently before moving forward
- **Feature independence:** Dashboard can work without MCP cleanup; healing exploration is independent of master explorer expansion
- **Iteration 1 unlocks value immediately:** Real-time dashboard provides value even if other features aren't complete

### Suggested Iteration Phases

**Iteration 1: Event Infrastructure & Dashboard Foundation**
- **Vision:** Add real-time observability to 2L orchestration with event logging and live dashboard
- **Scope:** Build the foundational event infrastructure and dashboard
  - Create `lib/2l-event-logger.sh` with event logging functions
  - Create `agents/2l-dashboard-builder.md` agent
  - Update `commands/2l-mvp.md` to initialize dashboard and log orchestration events
  - Generate working dashboard at `.2L/dashboard/index.html`
  - Add event logging at all orchestration checkpoints (phases, agents, validation)
  - Update `config.yaml` structure to support dashboard metadata
- **Why first:** Provides immediate value and visibility into 2L operations; foundational for future observability features; can be validated independently
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM
- **Success criteria:**
  - Dashboard auto-creates on first `/2l-mvp` run
  - Events stream to `.2L/events.jsonl` in real-time
  - Dashboard updates every 2 seconds showing active agents, cost, and event log
  - Multi-project support works correctly
  - No breaking changes to existing orchestration flow

**Iteration 2: MCP Cleanup + Honest Validation**
- **Vision:** Clean up broken MCP references and implement honest uncertainty reporting in validators
- **Scope:** Standardize MCP integration and improve validation honesty
  - Remove all GitHub MCP and Screenshot MCP references from 6 agent files
  - Standardize MCP section to 3 working MCPs (Playwright, Chrome DevTools, Supabase)
  - Add graceful skip guidance for unavailable MCPs
  - Update `agents/2l-validator.md` with honesty guidance and confidence level reporting
  - Update `agents/2l-ivalidator.md` with honest cohesion assessment
  - Update validation report templates with PASS/UNCERTAIN/PARTIAL/INCOMPLETE/FAIL statuses
  - Update `commands/2l-task.md` MCP references
  - Update `agents/2l-planner.md` to generate MCP patterns in patterns.md
- **Dependencies:** None (can run independently or after Iteration 1)
  - Benefits from: Dashboard events for tracking MCP usage patterns
  - Imports: None required from Iteration 1
- **Estimated duration:** 5-7 hours
- **Risk level:** LOW
- **Success criteria:**
  - Zero GitHub/Screenshot MCP references in codebase
  - All agent files have standardized 3-MCP sections
  - Validators report confidence levels and use UNCERTAIN status appropriately
  - No confusing MCP errors during validation
  - Backward compatible with existing plans

**Iteration 3: Healing Exploration + Master Explorer Expansion**
- **Vision:** Add exploration phase before healing and scale master explorers to 2-4 based on complexity
- **Scope:** Enhance healing workflow and master planning capabilities
  - Add healing exploration phase to `commands/2l-mvp.md` (Phase 6.1)
  - Create healing explorer spawning logic (1-2 explorers based on failure categories)
  - Update `agents/2l-healer.md` to read exploration reports
  - Add Explorer 3 & 4 definitions to `agents/2l-master-explorer.md`
  - Add adaptive spawning logic to `commands/2l-mvp.md` and `commands/2l-plan.md`
  - Update `commands/2l-continue.md` resume detection for 2-4 explorers
  - Update config.yaml to track `num_explorers`
  - Update master plan synthesis to use all available explorer reports
- **Dependencies:** Benefits from Iteration 1 (dashboard events for healing tracking)
  - Requires: None from previous iterations
  - Imports: Event logging patterns (if Iteration 1 complete)
- **Estimated duration:** 6-8 hours
- **Risk level:** MEDIUM
- **Success criteria:**
  - Healing spawns explorers before healers
  - Healers receive and use exploration reports
  - Simple projects spawn 2 explorers, medium 3, complex 4
  - Resume detection works for 2-4 explorers
  - Config tracks num_explorers correctly
  - No breaking changes to existing master exploration flow

---

## Dependency Graph

```
Iteration 1: Event Infrastructure & Dashboard Foundation
├── lib/2l-event-logger.sh (NEW)
├── agents/2l-dashboard-builder.md (NEW)
├── .2L/dashboard/index.html (GENERATED)
└── commands/2l-mvp.md (MODIFIED - add event logging)
    ↓ (provides observability for)

Iteration 2: MCP Cleanup + Honest Validation (PARALLEL to Iteration 1)
├── agents/2l-validator.md (MODIFIED - clean MCPs, add honesty)
├── agents/2l-ivalidator.md (MODIFIED - add honesty)
├── agents/2l-builder.md (MODIFIED - clean MCPs)
├── agents/2l-healer.md (MODIFIED - clean MCPs)
├── agents/2l-planner.md (MODIFIED - add MCP patterns)
└── commands/2l-task.md (MODIFIED - update MCP refs)
    ↓ (benefits from Iteration 1 events but not required)

Iteration 3: Healing Exploration + Master Explorer Expansion
├── commands/2l-mvp.md (MODIFIED - add healing exploration phase)
├── agents/2l-healer.md (MODIFIED - read exploration reports)
├── agents/2l-master-explorer.md (MODIFIED - add Explorer 3 & 4)
├── commands/2l-plan.md (MODIFIED - adaptive spawning)
└── commands/2l-continue.md (MODIFIED - resume detection)
    ↓ (uses event logging from Iteration 1 if available)
```

**Key Integration Points:**
- **Event Logging:** Created in Iteration 1, used by Iterations 2 & 3 (optional integration)
- **MCP Cleanup:** Independent, but healing exploration (Iteration 3) benefits from clean MCP references
- **agents/2l-healer.md:** Modified in both Iteration 2 (MCP cleanup) and Iteration 3 (read exploration reports)
- **commands/2l-mvp.md:** Modified in both Iteration 1 (event logging) and Iteration 3 (healing exploration)

---

## Risk Assessment

### High Risks

**Risk: Breaking Existing Orchestration Flow**
- **Impact:** Modifications to `commands/2l-mvp.md` could break the orchestration loop, causing in-progress plans to fail
- **Mitigation:**
  - Add event logging and healing exploration as additive features only
  - Test backward compatibility with existing plans
  - Ensure all modifications are behind conditional checks
  - Add extensive comments for future maintainability
- **Recommendation:** Address in Iteration 1 and 3 with careful testing; use feature flags if necessary

**Risk: Dashboard Generation Failure**
- **Impact:** If dashboard builder agent fails, orchestration could hang or error out
- **Mitigation:**
  - Make dashboard generation optional and non-blocking
  - Add error handling for dashboard creation failures
  - Provide fallback to continue orchestration without dashboard
  - Test dashboard builder agent independently before integration
- **Recommendation:** Build and validate dashboard builder thoroughly in Iteration 1

### Medium Risks

**Risk: Event Logging Performance Impact**
- **Impact:** Frequent JSONL appends could slow down orchestration, especially on slow filesystems
- **Mitigation:**
  - Keep event payloads minimal (< 1KB each)
  - Batch events where possible
  - Use append-only operations (no file rewrites)
  - Add performance tests with 100+ events
- **Recommendation:** Test with high event volume in Iteration 1

**Risk: MCP Reference Removal Could Break Existing Validators**
- **Impact:** Existing validation reports might reference GitHub or Screenshot MCPs, causing confusion
- **Mitigation:**
  - Make MCP usage optional with graceful degradation
  - Add clear messaging when MCPs are skipped
  - Update documentation to explain MCP availability
  - Test with MCP servers both available and unavailable
- **Recommendation:** Address in Iteration 2 with thorough testing

**Risk: Healing Exploration Adds Significant Time to Healing**
- **Impact:** Adding 1-2 explorers before healing increases healing duration by 10-30 minutes
- **Mitigation:**
  - Spawn healing explorers in parallel
  - Make second explorer conditional (only if >3 failure categories)
  - Keep exploration focused on actionable insights
  - Consider caching exploration results for repeated healing attempts
- **Recommendation:** Monitor healing duration in Iteration 3; optimize if needed

**Risk: Master Explorer Expansion Complexity**
- **Impact:** Supporting 2-4 explorers adds complexity to spawning logic, resume detection, and report synthesis
- **Mitigation:**
  - Use consistent explorer ID patterns (1, 2, 3, 4)
  - Store num_explorers in config.yaml for resume detection
  - Make Explorer 3 & 4 truly optional (system works with just 2)
  - Test all combinations (2, 3, 4 explorers)
- **Recommendation:** Build incrementally in Iteration 3; validate each expansion point

### Low Risks

**Risk: Dashboard Browser Compatibility**
- **Impact:** Dashboard might not work on all browsers or mobile devices
- **Mitigation:** Use widely supported HTML5/CSS3/ES6 features; test on multiple browsers
- **Recommendation:** Accept minor UI differences across browsers; focus on core functionality

**Risk: Config.yaml Schema Changes**
- **Impact:** Adding dashboard and num_explorers fields could affect existing plans
- **Mitigation:** Make new fields optional; provide defaults for missing values
- **Recommendation:** Add migration logic if needed in Iteration 1 and 3

**Risk: Honest Validation Status Proliferation**
- **Impact:** Too many status types (PASS/UNCERTAIN/PARTIAL/INCOMPLETE/FAIL) could confuse users
- **Mitigation:** Provide clear definitions and examples in validator prompts
- **Recommendation:** Document each status thoroughly in Iteration 2

---

## Integration Considerations

### Cross-Phase Integration Points

**commands/2l-mvp.md - Central Integration Hub**
- **What:** Modified in Iteration 1 (event logging) and Iteration 3 (healing exploration)
- **Why it spans iterations:** Core orchestration file that coordinates all phases
- **Integration strategy:**
  - Iteration 1 adds event logging at all orchestration checkpoints
  - Iteration 3 adds healing exploration phase (Phase 6.1)
  - Both modifications are additive and non-breaking
  - Use clear section comments to separate concerns

**agents/2l-healer.md - Dual Modification Point**
- **What:** Modified in Iteration 2 (MCP cleanup) and Iteration 3 (read exploration reports)
- **Why it spans iterations:** Both features affect healing behavior
- **Integration strategy:**
  - Iteration 2 cleans MCP section (lines 1-50 typically)
  - Iteration 3 adds exploration report reading (new section)
  - Modifications are in different sections of the file
  - Test healing with both modifications independently and together

**Event Logging System - Optional Dependency**
- **What:** Created in Iteration 1, used by Iterations 2 & 3
- **Why it spans iterations:** Provides observability for all features
- **Integration strategy:**
  - Make event logging optional in Iterations 2 & 3
  - Check if lib/2l-event-logger.sh exists before sourcing
  - Degrade gracefully if event logging unavailable
  - Test each iteration with and without event logging

### Potential Integration Challenges

**Challenge: Concurrent Modifications to 2l-mvp.md**
- **Description:** Iteration 1 and 3 both modify the same file in different areas
- **Why it matters:** Merge conflicts or logical conflicts could occur
- **Mitigation:**
  - Use clear section markers in the file
  - Iteration 1 modifies orchestration loop (event logging calls)
  - Iteration 3 modifies Phase 6 (healing) structure
  - Test the complete flow after both iterations

**Challenge: Healer Agent File Conflicts**
- **Description:** Iteration 2 (MCP cleanup) and Iteration 3 (exploration reports) both modify 2l-healer.md
- **Why it matters:** Could result in inconsistent agent behavior
- **Mitigation:**
  - Iteration 2 changes are in MCP section at top of file
  - Iteration 3 changes are in task execution instructions
  - Changes are in separate logical sections
  - Final integration test validates both features work together

**Challenge: Config.yaml Schema Evolution**
- **Description:** Multiple iterations add new fields (dashboard metadata, num_explorers)
- **Why it matters:** Must remain backward compatible with existing plans
- **Mitigation:**
  - All new fields are optional with sensible defaults
  - Add version field to config.yaml for future migrations
  - Test with old config structures
  - Document config schema changes

**Challenge: Dashboard Event Dependencies**
- **Description:** Iterations 2 & 3 could emit events, but dashboard isn't required
- **Why it matters:** Event logging should degrade gracefully without dashboard
- **Mitigation:**
  - Event logging is independent of dashboard
  - Dashboard reads events.jsonl but doesn't create it
  - Test event logging without dashboard present
  - Make event logging optional in later iterations

---

## Recommendations for Master Plan

1. **Start with Dashboard Infrastructure (Iteration 1)**
   - Provides immediate value with real-time visibility
   - Establishes event logging pattern for future features
   - Can be validated independently without affecting other features
   - Lower risk of breaking existing orchestration (additive changes only)

2. **Run Iteration 2 and 3 in sequence (not parallel)**
   - While Iteration 2 could run in parallel to Iteration 1, sequential execution is safer
   - Allows each iteration to be validated before proceeding
   - Reduces integration complexity
   - Easier to debug issues when they arise
   - Iteration 3 benefits from clean MCP references from Iteration 2

3. **Consider Iteration 3 as optional enhancement**
   - Healing exploration and master explorer expansion are valuable but not critical
   - Could stop after Iteration 2 if timeline constraints exist
   - Iteration 1+2 provide core improvements (observability + stability)
   - Iteration 3 adds advanced features that improve quality but aren't blocking

4. **Plan for Integration Testing After Each Iteration**
   - Test complete 2L flow after each iteration
   - Validate backward compatibility with existing plans
   - Run integration tests with `/2l-mvp` on a sample project
   - Check resume functionality with `/2l-continue`

5. **Use Feature Flags for Risky Changes**
   - Consider adding feature flags to config.yaml for dashboard, healing exploration
   - Allows gradual rollout and easy rollback
   - Can disable features if issues arise
   - Example: `enable_dashboard: true`, `enable_healing_exploration: true`

6. **Document Breaking Changes Clearly**
   - While backward compatibility is a goal, document any behavioral changes
   - Update version in config.yaml if schema changes
   - Provide migration guide for users with existing plans
   - Test with real-world 2L projects

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- **Language:** Bash orchestration + Markdown agent definitions
- **State management:** YAML config files + directory structure
- **Agent system:** Task tool spawning with subagent_type pattern
- **File operations:** Read, Write, Glob, Grep, Bash tools
- **No external dependencies:** Pure Bash and Claude tools

**Patterns observed:**
- **Agent spawning:** Use Task tool with subagent_type and detailed prompts
- **State checkpointing:** Every phase creates directory structure and reports
- **Resume detection:** Check for existence of phase directories and reports
- **Validation loops:** Multi-round integration, healing with max attempts
- **Config updates:** YAML modifications to track orchestration state

**Opportunities:**
- **Add event-driven architecture:** Enable real-time monitoring and debugging
- **Standardize error handling:** MCP cleanup reduces validation noise
- **Improve healing intelligence:** Exploration phase before fixing
- **Scale exploration effort:** Adaptive master explorer spawning

**Constraints:**
- **Must maintain backward compatibility:** Existing plans must continue working
- **Pure Bash requirement:** No npm, pip, or other package managers
- **File-based state:** All state in .2L/ directory structure
- **No breaking orchestration changes:** Must preserve existing phase flow

### Greenfield Recommendations
N/A - This is brownfield enhancement of existing 2L system

---

## Critical Dependency Chains

### Chain 1: Dashboard Feature
```
lib/2l-event-logger.sh (create event logging functions)
  ↓
agents/2l-dashboard-builder.md (agent that generates dashboard)
  ↓
commands/2l-mvp.md (initialize dashboard, source event logger)
  ↓
.2L/events.jsonl (event stream created during orchestration)
  ↓
.2L/dashboard/index.html (generated dashboard reads events)
```

**Critical path:** Event logger must be created first, then dashboard builder, then orchestration integration

### Chain 2: MCP Cleanup
```
Identify all MCP references (grep across agents/)
  ↓
Remove GitHub/Screenshot MCP references (6 agent files)
  ↓
Standardize to 3 MCPs (Playwright, Chrome DevTools, Supabase)
  ↓
Update validation logic to skip gracefully
  ↓
Test validation with MCPs available and unavailable
```

**Critical path:** Must complete all agent file updates before testing validation

### Chain 3: Healing Exploration
```
Add Phase 6.1 to commands/2l-mvp.md (exploration spawning)
  ↓
Spawn healing explorers (analyze failures, recommend strategies)
  ↓
Healers read exploration reports (modified agent prompt)
  ↓
Integration and re-validation
```

**Critical path:** Orchestration change → exploration → healing modification

### Chain 4: Master Explorer Expansion
```
Add Explorer 3 & 4 definitions to agents/2l-master-explorer.md
  ↓
Add adaptive spawning logic (2-4 explorers based on complexity)
  ↓
Update config.yaml to track num_explorers
  ↓
Update commands/2l-continue.md resume detection
  ↓
Update master plan synthesis to use all reports
```

**Critical path:** Agent definitions → spawning logic → config → resume → synthesis

---

## Timeline Estimates

### Iteration 1: Dashboard Foundation (6-8 hours)
- **Event logger library:** 1.5 hours
- **Dashboard builder agent:** 2 hours
- **Dashboard HTML/CSS/JS generation:** 2 hours
- **Orchestration integration:** 1.5 hours
- **Testing and validation:** 1 hour

### Iteration 2: MCP Cleanup + Honesty (5-7 hours)
- **MCP reference removal:** 2 hours (6 files)
- **Honest validation guidance:** 2 hours (2 validator files)
- **MCP patterns generation:** 1 hour (planner)
- **Testing and validation:** 1.5 hours

### Iteration 3: Healing + Explorers (6-8 hours)
- **Healing exploration phase:** 2.5 hours
- **Healer integration:** 1 hour
- **Master explorer expansion:** 2 hours
- **Resume detection updates:** 1 hour
- **Testing and validation:** 1.5 hours

**Total estimated time:** 17-23 hours

---

## Notes & Observations

### Meta-Programming Complexity
This project is unique in that it's using 2L to improve 2L itself. This creates interesting challenges:
- Must understand orchestration flow deeply to avoid breaking it
- Testing requires running complete 2L workflows
- Validation is more complex (system must validate itself)
- Debugging is harder (orchestrator bugs affect debugging capability)

### Observability is Key
The dashboard feature (Iteration 1) will be invaluable for:
- Understanding orchestration behavior during development
- Debugging issues in later iterations
- Demonstrating 2L capabilities to users
- Monitoring performance and cost

### Backward Compatibility is Non-Negotiable
Since this modifies ~/.claude/, breaking changes would affect all users:
- Existing plans must continue working
- Resume functionality must be preserved
- Old config.yaml structures must be supported
- Graceful degradation for missing features

### Consider Incremental Rollout
Given the complexity and risk:
- Could deploy Iteration 1 independently for user feedback
- Iteration 2 could be deployed as a patch/hotfix
- Iteration 3 could be a separate feature release
- Allows real-world validation between iterations

### Documentation is Critical
Since this modifies the 2L system itself:
- Update README files for each modified command
- Document new config.yaml fields
- Provide examples of event logging usage
- Explain MCP availability and graceful degradation

---

*Exploration completed: 2025-10-03*
*This report informs master planning decisions*
