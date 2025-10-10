# Vision: 2L System Tightening & Enhancement

**Created:** 2025-10-03
**Target Files:** ~/.claude/* (agents, commands, lib)
**Output:** Enhanced 2L meta-system with observability, clean MCPs, and intelligent healing

---

## Overview

Improve the 2L autonomous development framework by adding critical missing pieces identified through hard-fought lessons:

1. **Real-time Dashboard** - Visibility into orchestration progress
2. **MCP Integration Cleanup** - Remove broken MCPs, keep only working ones
3. **Healing Exploration Phase** - Add explore step before healing (explore→heal→validate)
4. **Honesty in Validation** - Validators report uncertainty, not false confidence
5. **Master Explorer Expansion** - Scale from 2 to 2-4 explorers based on complexity

---

## Target Architecture

### Files to Work On (in ~/.claude/)

**New Files (3):**
1. `lib/2l-event-logger.sh` - Event logging helper for dashboard
2. `agents/2l-dashboard-builder.md` - Agent that builds the dashboard
3. `.2L/dashboard/index.html` (generated) - Self-contained dashboard

**Files to Modify (10):**
1. `commands/2l-mvp.md` - Add dashboard init, event logging, healing exploration
2. `commands/2l-plan.md` - Add adaptive master explorer spawning
3. `commands/2l-continue.md` - Update resume detection for 2-4 explorers
4. `commands/2l-task.md` - Update MCP references
5. `agents/2l-master-explorer.md` - Add Explorer 3 & 4 definitions
6. `agents/2l-validator.md` - Add honesty guidance, clean MCP list
7. `agents/2l-ivalidator.md` - Add honesty in cohesion assessment
8. `agents/2l-builder.md` - Clean MCP references
9. `agents/2l-healer.md` - Clean MCP references
10. `agents/2l-planner.md` - Add MCP patterns to patterns.md spec

---

## Feature 1: Real-Time Dashboard

### Requirements
- Single HTML file (< 500 lines, inline CSS/JS)
- No dependencies, works offline via file://
- Polls `.2L/events.jsonl` every 2 seconds
- Shows: active agents, cost tracking, event log, MCP status
- Multi-project support (each project isolated)
- Dark theme, mobile-friendly

### Dashboard Sections
1. **Header** - Project name, plan, iteration, phase, status
2. **Metrics Bar** - Cost ($), elapsed time, tokens
3. **Active Agents** - Currently running agents with duration
4. **MCP Status** - 3 working MCPs (Playwright, Chrome DevTools, Supabase)
5. **Event Log** - Last 20 events, newest first

### Event Stream Format
`.2L/events.jsonl` - append-only JSONL file

Event types:
- `plan_start` - Orchestration begins
- `iteration_start` - New iteration
- `phase_change` - Phase transitions
- `agent_spawn` - Agent spawned
- `agent_complete` - Agent finished
- `cost_update` - Token/cost tracking
- `validation_result` - Pass/fail
- `iteration_complete` - Iteration done

### Implementation
1. Create `lib/2l-event-logger.sh` with `log_2l_event()` function
2. Create `agents/2l-dashboard-builder.md` agent
3. Update `commands/2l-mvp.md`:
   - Initialize dashboard on first run
   - Source event logger
   - Log events at all orchestration points
4. Update `config.yaml` structure to include dashboard section

---

## Feature 2: MCP Integration Cleanup

### Problem
- Agent prompts mention 5 MCPs
- 2 are broken (GitHub auth failed, Screenshot platform incompatible)
- Causes confusing errors during validation

### Solution
**Keep only 3 verified working MCPs:**
- ✅ Playwright MCP - E2E testing, browser automation
- ✅ Chrome DevTools MCP - Performance profiling, debugging
- ✅ Supabase Local MCP - Database validation (PostgreSQL on port 5432)

**Remove all references to:**
- ❌ GitHub MCP - Authentication broken
- ❌ Screenshot MCP - Platform incompatible (Linux)

### Implementation
1. Standardize MCP section template (3 MCPs only)
2. Update all agent files:
   - `2l-validator.md` - Clean MCP list, add graceful skip guidance
   - `2l-builder.md` - Standardize MCP section
   - `2l-healer.md` - Standardize MCP section
   - `2l-planner.md` - Add MCP patterns generation
   - `2l-task.md` - Update MCP references
   - `2l-mvp.md` - Update MCP server availability comments
3. Search and remove all GitHub/Screenshot references
4. Add "optional, skip gracefully if unavailable" guidance

---

## Feature 3: Healing Exploration Phase

### Current Problem
Healing currently: categorize→heal→validate

Missing: Root cause analysis before fixing!

### New Healing Flow
**explore→heal→validate**

### Implementation in commands/2l-mvp.md (Phase 6: Healing)

#### Step 6.1: Healing Exploration
- Spawn 1-2 healing explorers to analyze validation failures
- Explorer 1: Root cause analysis
  - Categorize failures
  - Identify root causes (not symptoms)
  - Map affected files
  - Recommend fix strategies
  - Identify dependencies between failures
- Explorer 2 (if >3 failure categories): Integration & dependency analysis
  - Inter-category dependencies
  - Conflict risks
  - Recommended healing order

#### Step 6.2: Healing
- Categorize issues
- Spawn healers (one per category)
- Healers read BOTH:
  - Validation report (what failed)
  - Healing exploration report (root causes + strategies)
- Healers follow recommended strategies from exploration

#### Step 6.3: Validation
- Re-validate after healing
- Check if issues resolved

### File Structure
```
healing-{N}/
├── exploration/
│   ├── healing-explorer-1-report.md  (root cause analysis)
│   └── healing-explorer-2-report.md  (dependencies, optional)
├── healer-{id}-report.md  (fixes)
└── validation-report.md   (re-validation)
```

---

## Feature 4: Honesty in Validation Reports

### Principle
> "Better to report false incompletion than false completion."

### Implementation
Add new sections to validator agents:

**In `agents/2l-validator.md`:**
- Add "Reporting Standards: Honesty Over Optimism" section
- Decision framework for uncertain results
- Examples of honest vs optimistic reporting
- The 80% confidence rule:
  - If < 80% confident in PASS → report as UNCERTAIN or PARTIAL
  - Explain confidence level and what's missing
- Update validation report template with confidence levels

**In `agents/2l-ivalidator.md`:**
- Add "Honesty in Cohesion Assessment" section
- Gray area handling (e.g., possible duplication vs intentional separation)
- Evidence insufficient scenarios
- Update ivalidation report with uncertainty flags

### Report Statuses
- ✅ PASS - High confidence, all checks passed
- ⚠️ UNCERTAIN - Medium confidence, some doubts
- ⚠️ PARTIAL - Some checks passed, others incomplete
- ⚠️ INCOMPLETE - Cannot complete certain checks
- ❌ FAIL - Clear failures identified

---

## Feature 5: Master Explorer Expansion

### Current State
Limited to 2 master explorers:
- Explorer 1: Architecture & Complexity
- Explorer 2: Dependencies & Risk

### New State
**Adaptive spawning: 2-4 explorers based on complexity**

**Explorer 1:** Architecture & Complexity Analysis
- Major components, tech stack
- Overall complexity (SIMPLE/MEDIUM/COMPLEX/VERY COMPLEX)

**Explorer 2:** Dependencies & Risk Assessment
- Dependency chains, critical path
- Risk factors and timeline

**Explorer 3:** User Experience & Integration Points *(if 3-4 explorers)*
- Frontend/backend integration complexity
- User flow dependencies
- External API integrations
- Data flow patterns

**Explorer 4:** Scalability & Performance *(if 4 explorers)*
- Performance bottlenecks
- Scalability concerns
- Infrastructure requirements
- Deployment complexity

### Adaptive Logic
```python
feature_count = count_features(vision)
integration_count = count_external_integrations(vision)

if feature_count < 5:
    num_explorers = 2  # Simple
elif feature_count < 15 and integration_count < 3:
    num_explorers = 3  # Medium
else:
    num_explorers = 4  # Complex/Very Complex
```

### Implementation
1. Update `agents/2l-master-explorer.md`:
   - Add Explorer 3 & 4 focus area definitions
   - Add report structure for each focus area
2. Update `commands/2l-mvp.md` and `commands/2l-plan.md`:
   - Add adaptive spawning logic
   - Spawn 2-4 explorers in parallel
3. Update `commands/2l-continue.md`:
   - Resume detection checks for 2-4 explorers
   - Read from config: `master_exploration.num_explorers`
4. Update master plan synthesis to use all available reports

---

## Success Criteria

### Dashboard
- [ ] Dashboard auto-creates on first `/2l-mvp` run
- [ ] Events stream to `.2L/events.jsonl` in real-time
- [ ] Dashboard updates every 2 seconds
- [ ] Shows active agents, cost, events, MCP status
- [ ] Multiple projects can run simultaneously (file:// protocol)
- [ ] Browser tabs show "2L Dashboard - {project-name}"

### MCP Cleanup
- [ ] No GitHub MCP references anywhere
- [ ] No Screenshot MCP references anywhere
- [ ] Exactly 3 MCPs consistently mentioned
- [ ] All agents have standardized MCP sections
- [ ] Validators skip gracefully if MCP unavailable
- [ ] No confusing MCP errors during validation

### Healing Exploration
- [ ] Healing spawns explorers before healers
- [ ] Explorer 1 analyzes root causes
- [ ] Explorer 2 spawns if >3 failure categories
- [ ] Healers receive exploration reports as input
- [ ] Healing directory has `exploration/` subdirectory
- [ ] Exploration reports guide fix strategies

### Honesty in Validation
- [ ] Validators report uncertainty with confidence %
- [ ] UNCERTAIN status used for <80% confidence
- [ ] Examples added to validator agent prompts
- [ ] Ivalidators flag gray areas honestly
- [ ] Validation reports include confidence levels

### Master Explorer Expansion
- [ ] Simple projects spawn 2 explorers
- [ ] Medium projects spawn 3 explorers
- [ ] Complex projects spawn 4 explorers
- [ ] Config tracks `num_explorers`
- [ ] Resume detection works for 2-4 explorers
- [ ] Master plan synthesis uses all reports

---

## Technical Constraints

### File Locations
- **Target:** `~/.claude/` - Where 2L system lives
- **Test/Demo:** `~/Ahiya/2L/.2L/` - This project's .2L folder

### Tools Available
- Read, Write, Edit - File operations
- Bash - Command execution
- Glob, Grep - Search operations

### No Breaking Changes
- All changes must be backward compatible
- Existing plans must continue working
- Resume functionality must work with old and new structures

### Minimal Dependencies
- Dashboard: Pure HTML/CSS/JS, no npm packages
- Event logger: Pure Bash, no external tools
- MCP: Only use verified working servers

---

## Implementation Strategy

### Iteration Breakdown Recommendation
Given 5 major features with varying complexity:

**Iteration 1: Dashboard Foundation**
- Create event logger library
- Create dashboard builder agent
- Add dashboard initialization to /2l-mvp
- Add basic event logging (plan start, iteration start, phase changes)
- Test dashboard creation and display

**Iteration 2: MCP Cleanup + Honesty**
- Update all 6 agent files with clean MCP sections
- Remove GitHub/Screenshot references
- Add honesty guidance to validators
- Update validation report templates
- Test that no MCP errors occur

**Iteration 3: Healing Exploration + Master Explorers**
- Add healing exploration phase to /2l-mvp
- Update 2l-healer to use exploration reports
- Expand master explorers to 2-4 with adaptive logic
- Update resume detection
- Test complete healing flow

### OR Single Iteration (if assessed as MEDIUM complexity)
All features in one iteration if explorers determine they're tightly coupled.

---

## Notes

- This is meta-programming: Using 2L to improve 2L itself!
- Target files are in `~/.claude/` but we test in `~/Ahiya/2L/`
- Dashboard is project-specific (each project gets its own)
- Event logging is append-only (safe for concurrent access)
- MCP cleanup eliminates false failures
- Healing exploration prevents symptom-only fixes
- Honesty in reports builds trust and accuracy
- More explorers = better strategic planning

---

**Ready for 2L orchestration!** 🚀
