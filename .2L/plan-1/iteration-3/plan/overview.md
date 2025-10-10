# 2L Iteration Plan - Master Explorer Scaling & Healing Exploration Verification

## Project Vision

Enhance the 2L autonomous development framework with adaptive master explorer scaling (2 to 2-4 explorers based on complexity) and verify the existing healing exploration phase. This iteration focuses on intelligent resource allocation for strategic planning while ensuring the healing system is robust.

**What we're building:**
- Adaptive master explorer spawning logic that analyzes vision complexity
- Explorer 3 & 4 definitions for UX/Integration and Scalability/Performance analysis
- Config-driven resume detection supporting 2-4 explorers
- Verification and refinement of existing healing exploration phase

**Why it matters:**
- Simple projects get fast planning (2 explorers, ~10 minutes)
- Complex projects get thorough analysis (4 explorers, same time but deeper insights)
- Better strategic decisions lead to higher quality builds
- Robust healing prevents symptom-only fixes

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] Simple visions (<5 features) spawn exactly 2 master explorers
- [ ] Medium visions (5-14 features, <3 integrations) spawn exactly 3 master explorers
- [ ] Complex visions (15+ features OR 3+ integrations) spawn exactly 4 master explorers
- [ ] Config.yaml tracks `master_exploration.num_explorers` field
- [ ] Resume detection works correctly with 2, 3, or 4 explorers
- [ ] Master planner synthesizes insights from all available explorer reports
- [ ] Explorer 3 reports focus on UX/Integration without duplicating Explorer 1 findings
- [ ] Explorer 4 reports focus on Scalability/Performance without duplicating Explorer 2 findings
- [ ] Healing exploration phase executes (already implemented in Iteration 1)
- [ ] Healers read and reference exploration reports in their fixes
- [ ] Backward compatibility: old config.yaml files default to 2 explorers
- [ ] All 5 command files updated consistently

## MVP Scope

**In Scope:**

1. **Adaptive Master Explorer Spawning**
   - Feature/integration counting heuristic in vision.md
   - Decision logic (2/3/4 explorers based on thresholds)
   - Config.yaml writes num_explorers field
   - Parallel spawning of 2-4 explorers in 2l-mvp.md and 2l-plan.md

2. **Explorer 3 & 4 Definitions**
   - Explorer 3: User Experience & Integration Points
   - Explorer 4: Scalability & Performance Considerations
   - Clear focus area boundaries to avoid overlap
   - Consistent report structure with Explorers 1 & 2

3. **Resume Detection Updates**
   - Read num_explorers from config.yaml
   - Check for expected number of explorer reports
   - Spawn missing explorers only
   - Backward compatibility (default to 2 if field missing)

4. **Master Plan Synthesis Updates**
   - Read all available explorer reports (2-4) dynamically
   - Synthesize insights from variable number of reports
   - No hardcoded report-1, report-2 references

5. **Healing Exploration Verification**
   - Test existing implementation (lines 878-972 in 2l-mvp.md)
   - Verify healer integration with exploration reports
   - Refine prompts if needed (not restructure)
   - Document behavior for future reference

**Out of Scope (Post-MVP):**

- Dashboard integration showing explorer progress (Future iteration)
- Manual override of num_explorers in vision frontmatter (Nice-to-have)
- Advanced NLP for feature counting (Current regex heuristic sufficient)
- Healing explorer conditional spawning refinement (Working as-is)
- Quality validation for explorer reports (Trust-based for now)
- Event logging for adaptive spawning decisions (Optional, requires iteration 1 dashboard)

## Development Phases

1. **Exploration** ✅ Complete (2 explorers analyzed architecture and dependencies)
2. **Planning** 🔄 Current (Creating this comprehensive plan)
3. **Building** ⏳ Estimated 5-6 hours (3 primary builders, possibly 1 split)
4. **Integration** ⏳ Estimated 30 minutes (loose coupling, minimal conflicts)
5. **Validation** ⏳ Estimated 1 hour (test 3 complexity scenarios + resume detection)
6. **Deployment** ⏳ Final (update ~/.claude/ files, test with real vision)

## Timeline Estimate

- **Exploration:** Complete (2 hours)
- **Planning:** Complete (1 hour)
- **Building:** 5-6 hours total
  - Builder-1 (Adaptive Spawning Logic): 2-3 hours
  - Builder-2 (Explorer Definitions): 3-4 hours (might split into 2 sub-builders)
  - Builder-3 (Resume & Synthesis Updates): 1-2 hours
  - Builder-4 (Healing Verification): 1 hour
- **Integration:** 30 minutes (merge changes, resolve any conflicts)
- **Validation:** 1 hour (test scenarios, verify backward compatibility)
- **Total:** ~10-11 hours (wall time ~3-4 hours with parallel builders)

## Risk Assessment

### High Risks

**Risk: Complexity heuristic inaccuracy**
- **Impact:** Wrong number of explorers spawned (waste resources or miss insights)
- **Mitigation:** Conservative thresholds (default to 2, only scale up with clear signals), test with diverse visions, log decision reasoning for debugging, allow future manual override

**Risk: Explorer 3 & 4 focus area overlap**
- **Impact:** Redundant analysis, confused master plan synthesis
- **Mitigation:** Clear boundary definitions (Explorer 3 = user-facing, Explorer 4 = infrastructure), provide negative examples in agent definitions, test reports for overlap

**Risk: Backward compatibility broken**
- **Impact:** Old plans fail to resume after iteration 3
- **Mitigation:** Use `yq` default value operator (`.master_exploration.num_explorers // 2`), test with old config.yaml, document migration in code comments

### Medium Risks

**Risk: Multi-file coordination failure**
- **Impact:** Inconsistent updates across 5 command files
- **Mitigation:** Single builder responsible for all command file updates (Builder-1), consistent variable naming, cross-file review before integration

**Risk: Healing exploration reports not actionable**
- **Impact:** Healers ignore exploration, fix symptoms instead of root causes
- **Mitigation:** Enhance healing explorer prompts with specific guidance, add examples of good exploration reports, test healing flow end-to-end

**Risk: Builder-2 complexity exceeds estimates**
- **Impact:** Explorer definitions task splits mid-work, coordination overhead
- **Mitigation:** Clear templates provided, allow split by explorer (Sub-builder A: Explorer 3, Sub-builder B: Explorer 4), parallel work possible

### Low Risks

**Risk: Master plan synthesis fails with variable reports**
- **Impact:** Planner errors reading 2-4 reports
- **Mitigation:** Use glob pattern (`master-explorer-*-report.md`), test with 2/3/4 reports, verify planner prompt handles variable input

**Risk: Healing exploration adds orchestration latency**
- **Impact:** Longer time to healing completion
- **Mitigation:** Single explorer by default (Explorer 2 only if >3 categories), exploration runs in parallel, healers still function without exploration (degraded mode)

## Integration Strategy

**How builder outputs will be merged:**

1. **Command Files (Builder-1 primary):**
   - 2l-mvp.md, 2l-plan.md, 2l-continue.md updated by Builder-1
   - Sequential edits (no parallel writes to same file)
   - Shared functions: `calculate_num_explorers` defined once in 2l-mvp.md, referenced in 2l-plan.md

2. **Agent Files (Builder-2 primary):**
   - 2l-master-explorer.md updated by Builder-2 (or sub-builders)
   - 2l-healer.md updated by Builder-4
   - No conflicts (different files)

3. **Config Schema (Builder-1 and Builder-3):**
   - Builder-1 implements config writes
   - Builder-3 implements config reads
   - Integration point: config.yaml structure agreed upfront
   - Field: `master_exploration.num_explorers` (integer, 2-4)

4. **Shared Variable Naming:**
   - `num_explorers` (everywhere)
   - `EXPECTED` (resume detection expected count)
   - `ACTUAL` (resume detection actual count)
   - `feature_count`, `integration_count` (heuristic variables)

5. **Integration Testing:**
   - After all builders complete, run full orchestration:
     - Simple vision → 2 explorers → master plan
     - Medium vision → 3 explorers → master plan
     - Complex vision → 4 explorers → master plan
   - Test resume detection with incomplete exploration
   - Test healing exploration flow

## Deployment Plan

**How the MVP will be deployed:**

1. **Target Location:** `~/.claude/` (2L system installation directory)

2. **Files to Update:**
   - `commands/2l-mvp.md`
   - `commands/2l-plan.md`
   - `commands/2l-continue.md`
   - `agents/2l-master-explorer.md`
   - `agents/2l-healer.md`

3. **Deployment Steps:**
   - Validate all builder outputs in `.2L/plan-1/iteration-3/build/`
   - Run integration tests in test environment
   - Copy updated files to `~/.claude/`
   - Test with real vision (this project's vision.md)
   - Verify resume detection with old config (backward compatibility)

4. **Rollback Plan:**
   - Keep backups of original files in `~/.claude/.backup-pre-iteration-3/`
   - If critical failure, restore from backup
   - Resume detection must work with both old and new versions

5. **Validation:**
   - Run `/2l-plan` on 3 test visions (simple/medium/complex)
   - Verify correct num_explorers spawned
   - Check master plan quality (uses all explorer insights)
   - Test healing exploration with intentional failures

6. **Success Criteria for Deployment:**
   - All 12 success criteria checked (see above)
   - No errors in resume detection
   - Backward compatibility verified
   - Explorer reports show no significant overlap
