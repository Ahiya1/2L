# Builder Task Breakdown

## Overview

4 primary builders will work on loosely coupled subsystems.
Builder-2 has VERY HIGH complexity and should consider splitting into 2 sub-builders.

**Estimated total time:** 5-6 hours (wall time ~2-3 hours with parallel work)

---

## Builder Assignment Strategy

- **Builder-1:** Adaptive spawning logic across all command files (highest coordination)
- **Builder-2:** Explorer 3 & 4 agent definitions (largest code addition, may split)
- **Builder-3:** Resume detection and master plan synthesis updates (medium complexity)
- **Builder-4:** Healing exploration verification (smallest task, validation-focused)

**Dependencies:**
- Builder-1 and Builder-3 share config.yaml schema (coordinate on field names)
- All builders work on separate files (no merge conflicts expected)
- Integration happens after all builders complete

---

## Builder-1: Adaptive Master Explorer Spawning Logic

### Scope

Implement complexity analysis heuristic and adaptive spawning logic in 2l-mvp.md and 2l-plan.md. This builder modifies the orchestration commands to spawn 2-4 explorers based on vision analysis.

### Complexity Estimate

**MEDIUM-HIGH**

- Two files to modify (2l-mvp.md and 2l-plan.md)
- Heuristic logic requires careful threshold tuning
- Config.yaml writes must be precise for resume detection
- Critical path (orchestration errors break entire system)

### Success Criteria

- [ ] Vision analysis extracts feature_count and integration_count correctly
- [ ] Decision logic spawns correct num_explorers (2/3/4 based on thresholds)
- [ ] Config.yaml updated with num_explorers and complexity_level fields
- [ ] Explorer spawning loop iterates from 1 to num_explorers
- [ ] Focus area assignment logic covers all 4 explorers (case statement)
- [ ] Backward compatibility maintained (old visions still work)
- [ ] 2l-mvp.md and 2l-plan.md have identical spawning logic

### Files to Create/Modify

**Modify:**
- `~/.claude/commands/2l-mvp.md` (lines ~267-315: Master Exploration phase)
- `~/.claude/commands/2l-plan.md` (lines ~50-120: Master Exploration phase)

**No new files.**

### Implementation Notes

**Key sections in 2l-mvp.md to modify:**

1. **Phase 1 start (line ~267):** Add vision analysis before explorer spawning
2. **Complexity calculation:** Implement feature/integration counting
3. **Config write:** Add num_explorers and complexity_level fields
4. **Explorer loop:** Change from `for i in 1 2` to `for i in $(seq 1 $num_explorers)`
5. **Focus area assignment:** Add cases 3 and 4 to case statement

**Heuristic thresholds (from tech-stack.md):**
- `feature_count < 5`: num_explorers = 2 (SIMPLE)
- `feature_count >= 15 OR integration_count >= 3`: num_explorers = 4 (COMPLEX)
- Else: num_explorers = 3 (MEDIUM)

**Error handling:**
- If vision.md not found: exit with error
- If grep returns no matches: default to 0 (`|| echo 0`)
- If calculation fails: default to 2 explorers (safe fallback)

**Testing during build:**
- Create 3 test visions (3 features, 10 features, 20 features)
- Run adaptive logic, verify correct num_explorers
- Check config.yaml has correct fields

### Dependencies

**Depends on:** None (greenfield implementation)

**Blocks:** Builder-3 (resume detection needs config schema)

**Coordinates with:** Builder-2 (focus area names must match explorer definitions)

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Adaptive Explorer Spawning Pattern** (full code example)
- **Config.yaml Schema Pattern** (write operations)
- **Safe Grep Pattern** (error handling)

### Testing Requirements

- Unit test: Vision analysis with 0, 3, 10, 20 features
- Unit test: Integration counting with various keywords
- Integration test: Full spawning with 2, 3, 4 explorers
- Edge case: Empty vision.md (should default to 2 explorers)
- Edge case: Malformed vision (missing headers)
- Coverage target: 100% (critical orchestration logic)

### Potential Split Strategy

**NOT RECOMMENDED** - Logic is cohesive (~150 lines total across 2 files)

If builder determines split is needed:

**Foundation (Primary Builder-1):**
- Complexity analysis function
- Config schema definition
- 2l-mvp.md spawning logic

**Sub-builder 1A (if split):**
- 2l-plan.md spawning logic (duplicate of 2l-mvp.md)
- Testing with /2l-plan command

**Coordination:** Primary builder defines schema, sub-builder follows.

---

## Builder-2: Explorer 3 & 4 Agent Definitions

### Scope

Add Explorer 3 (User Experience & Integration Points) and Explorer 4 (Scalability & Performance Considerations) definitions to the 2l-master-explorer.md agent file. This involves writing comprehensive focus area descriptions, analysis frameworks, and report templates.

### Complexity Estimate

**VERY HIGH** - Consider splitting into 2 sub-builders

- Large code addition (~200+ lines)
- Two new explorer definitions with detailed guidance
- Clear boundaries needed to prevent overlap with Explorers 1 & 2
- Quality standards require examples and negative cases
- Report templates must be consistent yet specialized

**RECOMMENDATION: SPLIT into Sub-builder 2A (Explorer 3) and Sub-builder 2B (Explorer 4)**

### Success Criteria

- [ ] Explorer 3 focus area clearly defined with boundaries
- [ ] Explorer 4 focus area clearly defined with boundaries
- [ ] No overlap between Explorer 3 and Explorers 1/2
- [ ] No overlap between Explorer 4 and Explorers 1/2
- [ ] Report structure template works for all 4 explorers
- [ ] "What to analyze" and "What NOT to analyze" sections prevent duplication
- [ ] Examples provided for good vs bad findings
- [ ] Spawning conditions documented (3 = num_explorers >= 3, 4 = num_explorers == 4)

### Files to Create/Modify

**Modify:**
- `~/.claude/agents/2l-master-explorer.md` (add ~200 lines after Explorer 2 definition)

**No new files.**

### Implementation Notes

**Structure for each new explorer:**

1. **Focus Area Header:** `### Explorer 3: User Experience & Integration Points`
2. **Spawning Condition:** `(SPAWNED IF num_explorers >= 3)`
3. **What to Analyze:** Bullet list of 6-8 focus areas
4. **What NOT to Analyze:** Clear boundaries (reference other explorers)
5. **Report Focus:** 1-sentence summary of output
6. **Examples:** 2-3 examples of good findings in this focus area

**Explorer 3 Focus Areas (UX/Integration):**
- Frontend/backend integration complexity
- User flow dependencies and critical paths
- External API integrations and third-party services
- Data flow patterns across system boundaries
- Form handling, navigation, state management
- Real-time features (WebSockets, polling, SSE)
- Error handling and edge case flows
- Accessibility and responsive design

**Explorer 4 Focus Areas (Scalability/Performance):**
- Performance bottlenecks (database queries, API latency, rendering)
- Scalability concerns (concurrent users, data volume growth)
- Infrastructure requirements (database sizing, caching strategy, CDN)
- Deployment complexity (CI/CD, environments, rollback)
- Monitoring and observability needs
- Resource optimization (lazy loading, code splitting, image optimization)
- Load testing requirements

**Quality Standards to Document:**
- Specific over generic (quote actual numbers)
- Evidence-based (reference vision details)
- Actionable (provide concrete recommendations)
- Focused (stay in assigned focus area)

**Testing during build:**
- Read each new section aloud (clarity check)
- Verify no overlap with existing Explorers 1 & 2
- Check examples are specific and actionable

### Dependencies

**Depends on:** None (additive to existing agent file)

**Blocks:** None (explorers work independently)

**Coordinates with:** Builder-1 (focus area names must match spawning case statement)

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Explorer Agent Definition Pattern** (full template)
- Reuse existing Explorer 1 & 2 structure for consistency
- Follow report structure template from patterns.md

### Testing Requirements

- Manual review: Read each focus area definition
- Overlap check: Compare with Explorers 1 & 2, verify no duplication
- Example quality: Verify examples are specific and actionable
- Test spawn: Run with num_explorers=3 and num_explorers=4, check reports
- Coverage target: N/A (agent definition, not code)

### Potential Split Strategy (RECOMMENDED)

**Foundation (Primary Builder-2):**
- Update agent header to document 4 explorers
- Update "Your Focus Area" section introduction
- Update report structure template to support all 4 explorers

**Sub-builder 2A: Explorer 3 Definition**
- Explorer 3 focus area header
- "What to analyze" section (8-10 bullet points)
- "What NOT to analyze" section (clear boundaries)
- Report focus statement
- Examples (2-3 good findings)
- Quality guidance specific to UX/Integration
- Estimate: MEDIUM complexity (~100 lines)

**Sub-builder 2B: Explorer 4 Definition**
- Explorer 4 focus area header
- "What to analyze" section (8-10 bullet points)
- "What NOT to analyze" section (clear boundaries)
- Report focus statement
- Examples (2-3 good findings)
- Quality guidance specific to Scalability/Performance
- Estimate: MEDIUM complexity (~100 lines)

**Integration:**
- Both sub-builders follow same structure (parallel work)
- Primary builder reviews both for consistency
- No merge conflicts (different sections of same file)

---

## Builder-3: Resume Detection & Master Plan Synthesis Updates

### Scope

Update resume detection in 2l-continue.md to support 2-4 explorers (config-driven). Update master plan synthesis in 2l-mvp.md to read variable number of explorer reports (glob-based).

### Complexity Estimate

**MEDIUM**

- Two related tasks (resume detection + plan synthesis)
- Config-driven logic requires yq usage
- Backward compatibility critical (old configs must work)
- Straightforward implementation (clear patterns provided)

### Success Criteria

- [ ] Resume detection reads num_explorers from config.yaml
- [ ] Backward compatibility: defaults to 2 if field missing
- [ ] Missing explorers spawned correctly (ACTUAL+1 to EXPECTED)
- [ ] Master plan synthesis reads all explorer reports (glob pattern)
- [ ] Synthesis handles 2, 3, or 4 reports gracefully
- [ ] No hardcoded report-1, report-2 references
- [ ] Focus area assignment in resume matches spawning logic

### Files to Create/Modify

**Modify:**
- `~/.claude/commands/2l-continue.md` (lines ~95-125: Resume master exploration)
- `~/.claude/commands/2l-mvp.md` (lines ~320-380: Master plan synthesis)

**No new files.**

### Implementation Notes

**Resume Detection (2l-continue.md):**

1. **Read expected count from config:**
   ```bash
   EXPECTED=$(yq eval ".plans[] | select(.plan_id == \"plan-${PLAN_ID}\") | .master_exploration.num_explorers // 2" .2L/config.yaml)
   ```

2. **Count actual reports:**
   ```bash
   ACTUAL=$(ls .2L/plan-${PLAN_ID}/master-exploration/master-explorer-*-report.md 2>/dev/null | wc -l)
   ```

3. **Spawn missing explorers:**
   ```bash
   for explorer_id in $(seq $((ACTUAL + 1)) $EXPECTED); do
       # Spawn explorer with focus area from case statement
   done
   ```

**Master Plan Synthesis (2l-mvp.md):**

1. **Read all reports with glob:**
   ```bash
   for report in .2L/plan-${PLAN_ID}/master-exploration/master-explorer-*-report.md; do
       EXPLORER_REPORTS="$EXPLORER_REPORTS\n$(cat $report)"
   done
   ```

2. **Pass all reports to planner:**
   ```bash
   /agent-use 2l-planner <<EOF
   Synthesize insights from the following explorer reports:
   $EXPLORER_REPORTS
   EOF
   ```

**Focus Area Case Statement (reused in both files):**
```bash
case $explorer_id in
    1) FOCUS_AREA="Architecture & Complexity Analysis" ;;
    2) FOCUS_AREA="Dependencies & Risk Assessment" ;;
    3) FOCUS_AREA="User Experience & Integration Points" ;;
    4) FOCUS_AREA="Scalability & Performance Considerations" ;;
esac
```

**Testing during build:**
- Test resume with 2, 3, 4 explorers
- Test resume with old config (no num_explorers field)
- Test synthesis with 2, 3, 4 reports

### Dependencies

**Depends on:** Builder-1 (config schema must exist)

**Blocks:** None

**Coordinates with:** Builder-1 (field names: `num_explorers`, `complexity_level`)

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Config-Driven Resume Detection Pattern** (full code example)
- **Master Plan Synthesis Pattern** (full code example)
- **Safe Grep Pattern** (error handling)
- **Config Read with Default Pattern** (backward compatibility)

### Testing Requirements

- Unit test: Config read with num_explorers=2, 3, 4
- Unit test: Config read with old format (no field)
- Integration test: Resume with 2/4 explorers complete
- Integration test: Synthesis with 2, 3, 4 reports
- Edge case: No explorer reports (should fail gracefully)
- Coverage target: 95% (backward compatibility is critical)

### Potential Split Strategy

**NOT RECOMMENDED** - Tasks are related and share focus area logic

If builder determines split is needed:

**Foundation (Primary Builder-3):**
- Define shared focus area case statement
- Implement resume detection in 2l-continue.md
- Testing for resume scenarios

**Sub-builder 3A (if split):**
- Implement master plan synthesis in 2l-mvp.md
- Testing for synthesis with variable reports

**Coordination:** Both use same focus area names and logic.

---

## Builder-4: Healing Exploration Verification & Documentation

### Scope

Verify the existing healing exploration implementation (lines 878-972 in 2l-mvp.md) works correctly. Test end-to-end healing flow. Update 2l-healer.md agent to emphasize reading exploration reports. Document behavior for future reference.

### Complexity Estimate

**LOW** - Verification and documentation task, not greenfield implementation

- Healing exploration already exists (Iteration 1 deliverable)
- Task is to test and refine, not rebuild
- Healer agent updates are clarifications (add guidance, examples)
- ~1 hour of work (mostly testing)

### Success Criteria

- [ ] Healing exploration directory created (`healing-N/exploration/`)
- [ ] Healing explorer 1 spawns and creates root cause analysis report
- [ ] Healing explorer 2 spawns conditionally (>3 failure categories)
- [ ] Healers receive exploration report paths in prompts
- [ ] Healers read and reference exploration insights in their reports
- [ ] Healing flow completes successfully (validation passes after healing)
- [ ] Documentation added to 2l-healer.md emphasizing exploration usage
- [ ] Examples added showing exploration-informed vs symptom-only healing

### Files to Create/Modify

**Modify:**
- `~/.claude/agents/2l-healer.md` (add ~80 lines: inputs section, examples, quality standards)

**Verify (no changes unless issues found):**
- `~/.claude/commands/2l-mvp.md` (lines 878-972: Healing exploration phase)

**No new files.**

### Implementation Notes

**Verification Steps:**

1. **Create test scenario with intentional failures:**
   - TypeScript type errors (2-3 failures)
   - Failing unit tests (1-2 failures)
   - Lint errors (2-3 failures)
   - Total: 3+ failure categories (triggers explorer 2)

2. **Run healing phase:**
   - Trigger validation failure
   - Observe healing exploration spawn
   - Verify 2 explorer reports created

3. **Check healer integration:**
   - Verify healers receive exploration report paths
   - Read healer reports, check for exploration references
   - Verify fixes address root causes (not symptoms)

4. **Test edge cases:**
   - Single failure category (explorer 2 should NOT spawn)
   - Exploration report missing (healer should handle gracefully)

**Healer Agent Updates (2l-healer.md):**

1. **Update "Your Inputs" section:**
   - List 3 inputs: Validation Report, Exploration Report 1, Exploration Report 2
   - Emphasize: "Read ALL exploration reports before starting fixes"

2. **Add "Example: Exploration-Informed Healing" section:**
   - Bad example: Symptom-only fix
   - Good example: Root cause fix using exploration insights
   - Show before/after

3. **Update "Quality Standards" section:**
   - Require healers to reference exploration in reports
   - Quote specific exploration recommendations
   - Explain if deviating from exploration strategy

4. **Add troubleshooting guidance:**
   - What to do if exploration report is incomplete
   - How to prioritize when exploration suggests multiple strategies
   - When to request additional exploration

**Testing during build:**
- Run full healing flow with test failures
- Verify healers reference exploration (grep for "exploration" in healer reports)
- Check healing success rate (should be high with exploration)

### Dependencies

**Depends on:** None (testing existing implementation)

**Blocks:** None

**Coordinates with:** None (independent verification task)

### Patterns to Follow

Reference patterns from `patterns.md`:
- **Healing Exploration Verification Pattern** (full code example)
- **Healer Agent Updates Pattern** (documentation improvements)

### Testing Requirements

- Manual test: Create intentional failures, run healing, verify success
- Report analysis: Read healer reports, verify exploration references
- Edge case: Single failure (no explorer 2)
- Edge case: Missing exploration report (graceful handling)
- Coverage target: 100% (all healing paths tested)

### Potential Split Strategy

**NOT RECOMMENDED** - Single focused task (~1 hour)

Task is atomic: verify existing code, update documentation.

---

## Builder Execution Order

### Phase 1: Parallel Group (No dependencies)

**Start simultaneously:**
- Builder-2 (Explorer definitions) - Can work independently
- Builder-4 (Healing verification) - Can work independently

**Estimated time:** 1-2 hours (both builders working in parallel)

### Phase 2: Sequential (Depends on Builder-1)

**Builder-1 must complete first:**
- Builder-1 (Adaptive spawning + config schema) - 2-3 hours

**Then Builder-3 can start:**
- Builder-3 (Resume detection + synthesis) - 1-2 hours
  - Depends on: Builder-1's config schema

### Integration Notes

**Shared files:**
- None! All builders work on different files

**Shared variables:**
- `num_explorers` (consistent naming across all builders)
- `EXPECTED`, `ACTUAL` (resume detection)
- Focus area names (must match between Builder-1 and Builder-2)

**Coordination points:**

1. **Builder-1 ↔ Builder-2:** Focus area names
   - Builder-1 defines case statement with focus area strings
   - Builder-2 uses same strings in agent definition headers
   - **Action:** Agree on exact wording before implementation

2. **Builder-1 → Builder-3:** Config schema
   - Builder-1 defines `master_exploration.num_explorers` field
   - Builder-3 reads this field with default value
   - **Action:** Builder-1 completes config schema before Builder-3 starts

3. **All builders:** Variable naming
   - Use `num_explorers` (not `explorer_count` or `total_explorers`)
   - Use `EXPECTED` and `ACTUAL` for resume detection
   - **Action:** Follow naming conventions in patterns.md

**Integration testing (after all builders complete):**

1. **Test simple vision (2 explorers):**
   - Run /2l-plan, verify 2 explorers spawn
   - Check config.yaml has num_explorers=2
   - Verify resume detection works

2. **Test medium vision (3 explorers):**
   - Run /2l-plan, verify 3 explorers spawn
   - Check Explorer 3 report exists and has correct focus
   - Verify master plan synthesis includes all 3 reports

3. **Test complex vision (4 explorers):**
   - Run /2l-plan, verify 4 explorers spawn
   - Check Explorer 4 report exists and has correct focus
   - Verify no overlap between explorer reports

4. **Test healing exploration:**
   - Create intentional failures
   - Run healing, verify exploration phase executes
   - Check healers reference exploration in reports

5. **Test backward compatibility:**
   - Use old config.yaml (no num_explorers field)
   - Run /2l-continue, verify defaults to 2 explorers
   - Verify no errors

**Conflict resolution:**

If focus area names mismatch between Builder-1 and Builder-2:
- Use Builder-2's names (agent definition is source of truth)
- Builder-1 updates case statement to match

If config field names differ:
- Use Builder-1's names (orchestration is source of truth)
- Builder-3 updates reads to match

**Success criteria for integration:**

- [ ] All 12 builder success criteria checked
- [ ] Integration tests pass (5 scenarios above)
- [ ] No errors in any command file
- [ ] Focus area names consistent
- [ ] Config schema consistent
- [ ] Variable naming consistent
- [ ] Documentation updated
- [ ] Backward compatibility verified

---

## Post-Integration Validation

**Validator will check:**

1. **Functional correctness:**
   - Adaptive spawning works with 3 complexity levels
   - Resume detection handles 2-4 explorers
   - Master plan synthesis uses all reports
   - Healing exploration verified working

2. **Code quality:**
   - Variable quoting consistent
   - Error handling with `|| echo 0`
   - Config reads with default values
   - No hardcoded paths or values

3. **Documentation:**
   - Patterns.md examples accurate
   - Tech-stack.md decisions clear
   - Comments explain WHY not WHAT

4. **Backward compatibility:**
   - Old configs work (default to 2 explorers)
   - No breaking changes to existing plans
   - Resume detection graceful with old format

5. **Integration:**
   - Focus area names match across files
   - Config schema consistent
   - No merge conflicts or duplicated logic

**Validation artifacts:**

- Test run with simple vision (2 explorers)
- Test run with complex vision (4 explorers)
- Resume test with incomplete exploration
- Healing test with intentional failures
- Backward compatibility test with old config

---

## Deployment Checklist

After validation passes:

- [ ] Backup original files to `~/.claude/.backup-pre-iteration-3/`
- [ ] Copy updated files to `~/.claude/`
- [ ] Test with real vision (this project's vision.md)
- [ ] Verify dashboard shows correct explorer count (if iteration 1 deployed)
- [ ] Update 2L changelog with iteration 3 changes
- [ ] Mark iteration 3 as COMPLETE in config.yaml
