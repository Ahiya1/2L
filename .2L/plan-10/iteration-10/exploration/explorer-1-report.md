# Explorer 1 Report: Architecture & Structure

## Executive Summary

The 2L framework implements a **meta-circular self-improvement system** with a three-tier architecture:

1. **Meditation Space** (`~/Ahiya/2L`) - The 2L framework's own codebase that improves itself
2. **Production Projects** (`~/Ahiya/2L/Prod/*`) - Real projects built using 2L where framework issues are discovered
3. **Cross-Project Learning Aggregation** (Plan-10 target) - Federation layer to learn from all projects

**Current Gap:** Learning aggregation is siloed. The `/2l-improve` command only reads `~/Ahiya/2L/.2L/global-learnings.jsonl` (meditation space), missing valuable framework issues discovered across `Prod/*` projects. Plan-10 will federate learnings from ALL sources to complete the meta-circular loop.

## Discoveries

### Discovery 1: Three-Layer Architecture

The 2L system operates at three distinct levels:

**Layer 1: Meditation Space** (`~/Ahiya/2L`)
- Purpose: 2L framework's own codebase
- Components: `agents/`, `commands/`, `lib/`, `templates/`
- Learning Storage: `.2L/global-learnings.{yaml,jsonl}`
- Self-improvement: Runs `/2l-improve` to fix itself

**Layer 2: Production Projects** (`~/Ahiya/2L/Prod/*`)
- Purpose: Real applications built using 2L
- Examples: StatViz, wealth, SplitEasy, mirror-of-dreams, ai-mafia, ShipLog, ghstats
- Learning Storage: Each has own `.2L/global-learnings.jsonl`
- Issue Detection: Framework issues discovered during real project iterations

**Layer 3: Cross-Project Aggregation** (Plan-10 Implementation)
- Purpose: Federate learnings from meditation space + all Prod/* projects
- Discovery Mechanism: Glob pattern `Prod/*/.2L/global-learnings.jsonl`
- Aggregation: Multi-source merging with source tracking
- Benefit: Ecosystem-wide pattern detection

### Discovery 2: Learning Pipeline Architecture

**Current Flow (Pre-Plan-10):**
```
Iteration Complete
    ↓
Reflection Generator (2l-reflection-generator.py)
    ↓
Filter Framework Issues (is_framework_issue() heuristic)
    ↓
Append to global-learnings.jsonl
    ↓
Reflection Aggregator (2l-reflection-aggregator.py)
    ↓
Pattern Detection (similarity matching, 0.8 threshold)
    ↓
Update global-learnings.yaml
    ↓
/2l-improve reads patterns → Vision Generator → /2l-mvp implements fix
    ↓
Pattern Lifecycle Manager (IDENTIFIED → IMPLEMENTED → VERIFIED/REGRESSED)
```

**Plan-10 Enhancement:**
```
/2l-improve invoked in meditation space
    ↓
Multi-Source Discovery
    ├─ Read ~/Ahiya/2L/.2L/global-learnings.jsonl
    └─ Glob ~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl
    ↓
Multi-Source Aggregation (combine all sources)
    ↓
Pattern Detection with cross-project evidence
    ↓
Vision Generation with ecosystem-wide context
```

### Discovery 3: File/Directory Architecture

**Meditation Space Structure:**
```
~/Ahiya/2L/
├── .2L/                          # Framework's own .2L workspace
│   ├── config.yaml               # Plan tracking, iteration counter
│   ├── events.jsonl              # Event log for dashboard
│   ├── global-learnings.yaml     # Aggregated patterns
│   ├── global-learnings.jsonl    # Raw learnings (meditation space only)
│   ├── plan-{N}/                 # Per-plan directories
│   │   ├── vision.md
│   │   ├── master-plan.yaml
│   │   └── iteration-{I}/
│   │       ├── exploration/
│   │       ├── plan/
│   │       ├── building/
│   │       ├── integration/
│   │       └── validation/
│   └── dashboard/                # Dashboard static files
├── agents/                       # Agent markdown prompts
│   ├── 2l-explorer.md
│   ├── 2l-planner.md
│   ├── 2l-builder.md
│   ├── 2l-integrator.md
│   ├── 2l-validator.md
│   └── 2l-healer.md
├── commands/                     # Slash commands (markdown)
│   ├── 2l-mvp.md                 # Main orchestrator
│   ├── 2l-improve.md             # Self-improvement command
│   ├── 2l-vision.md
│   ├── 2l-plan.md
│   └── ...
├── lib/                          # Python/bash utilities
│   ├── 2l-reflection-generator.py
│   ├── 2l-reflection-aggregator.py
│   ├── 2l-pattern-detector.py
│   ├── 2l-pattern-lifecycle.py
│   ├── 2l-vision-generator.py
│   ├── 2l-yaml-helpers.py
│   └── 2l-event-logger.sh
├── templates/                    # Vision/prompt templates
│   └── improvement-vision.md
└── Prod/                         # Production projects
    ├── StatViz/.2L/global-learnings.jsonl
    ├── wealth/.2L/global-learnings.jsonl
    ├── SplitEasy/.2L/global-learnings.jsonl
    ├── mirror-of-dreams/.2L/global-learnings.jsonl
    └── ...
```

**Key Insight:** Each `Prod/*` project has its own `.2L/` directory structure mirroring meditation space, but currently isolated.

### Discovery 4: Data Flow and Entry Points

**Entry Points:**

1. **User-Initiated Iteration** (Real projects in Prod/*)
   - Command: `/2l-mvp` (or `/2l-vision` + `/2l-plan` + `/2l-build` + `/2l-integrate` + `/2l-validate`)
   - Location: `Prod/StatViz/` (for example)
   - Learning Output: `Prod/StatViz/.2L/global-learnings.jsonl`
   - Reflection: Generated by `lib/2l-reflection-generator.py` at iteration end

2. **Framework Self-Improvement** (Meditation space)
   - Command: `/2l-improve`
   - Location: `~/Ahiya/2L`
   - Learning Input: `.2L/global-learnings.jsonl` (currently)
   - Pattern Detection: `lib/2l-pattern-detector.py`
   - Vision Generation: `lib/2l-vision-generator.py`
   - Execution: Invokes `/2l-mvp` on meditation space itself

**Data Boundaries:**

- **Current Isolation:** Meditation space learnings ≠ Prod/* learnings
- **Plan-10 Federation:** `/2l-improve` will read both meditation + all Prod/* sources
- **Write Locality:** Each project writes only to its own `global-learnings.jsonl`
- **No Real-Time Sync:** Aggregation happens lazily when `/2l-improve` runs

## Patterns Identified

### Pattern 1: Hub-and-Spoke Learning Architecture

**Description:** Meditation space acts as the hub, Prod/* projects are spokes, learnings flow one-way (spokes → hub) during `/2l-improve` invocation.

**Use Case:** 
- Framework maintainer runs `/2l-improve` in meditation space
- Discovers patterns from ALL Prod/* projects
- Implements fix in meditation space
- Symlinks propagate fix to all projects instantly

**Example:**
```python
# Current (isolated)
learnings = read_jsonl(".2L/global-learnings.jsonl")

# Plan-10 (federated)
sources = [
    ".2L/global-learnings.jsonl",  # Meditation space
    *glob("Prod/*/.2L/global-learnings.jsonl")  # All Prod projects
]
learnings = [read_jsonl(src) for src in sources]
learnings = flatten(learnings)
```

**Recommendation:** Implement in `commands/2l-improve.md` Step 1 (Pattern Detection), pass multiple sources to aggregator.

### Pattern 2: Source Tracking for Cross-Project Evidence

**Description:** Each learning entry tracks its source project to enable pattern confidence scoring.

**Use Case:**
- Pattern detected in 1 project: Possible fluke
- Pattern detected in 3+ projects: High-confidence real issue
- Pattern shows source breakdown: "Detected in: StatViz, TaskManager, BlogEngine"

**Example:**
```json
{
  "learning_id": "plan-2-iter-5-learning-003",
  "source_project": "StatViz",  // NEW FIELD
  "root_cause": "Integration phase slow - 45s for 4 builders",
  "category": "framework-performance",
  "priority": "P3"
}
```

**Recommendation:** 
- Add `source_project` field to learning schema (reflection generator)
- Derive from directory name: `Prod/StatViz → "StatViz"`, meditation space → "meditation-space"
- Pattern aggregator merges `source_projects: [StatViz, TaskManager]`

### Pattern 3: Framework vs Project Issue Filtering Heuristic

**Description:** Multi-signal heuristic determines if an issue is about the 2L framework or the project being built.

**Use Case:** Prevents noise in global learnings (app bugs don't belong there, only framework bugs).

**Implementation (Already Exists in `lib/2l-reflection-generator.py`):**
```python
def is_framework_issue(self, issue: Dict) -> bool:
    # Signal 1: File path matching
    for framework_path in FRAMEWORK_PATHS:  # ['commands/', 'lib/', 'agents/', '.2L/']
        if framework_path in issue.get('location', '').lower():
            return True
    
    # Signal 2: Exclude project paths
    for project_path in PROJECT_PATHS:  # ['app/', 'src/', 'components/']
        if project_path in issue.get('location', '').lower():
            return False
    
    # Signal 3: Keyword matching
    for keyword in FRAMEWORK_KEYWORDS:  # ['orchestrator', 'explorer', 'builder', ...]
        if keyword in issue_text.lower():
            return True
    
    # Conservative default: NOT framework issue
    return False
```

**Recommendation:** 
- Expand `FRAMEWORK_KEYWORDS` to include new Plan-10 terms: "aggregation", "multi-source", "cross-project"
- Document classification guidelines in reflection generator docstring
- Add test cases for edge cases (e.g., "builder took 2 minutes" - framework slow or complex code generation?)

### Pattern 4: Lazy Federation (No Real-Time Sync)

**Description:** Learnings are federated lazily when `/2l-improve` runs, not pushed in real-time from Prod/* to meditation space.

**Use Case:** 
- Keeps architecture simple (no background jobs, no daemons)
- Non-blocking for project iterations (if learnings append fails, iteration continues)
- Acceptable latency (framework improvements happen on-demand)

**Tradeoffs:**
- **Pro:** Simple, reliable, no concurrency issues
- **Con:** Pattern detection delayed until next `/2l-improve` invocation
- **Pro:** Matches meditation space philosophy (on-demand reflection, not continuous)

**Recommendation:** Keep lazy federation for MVP, consider bidirectional sync in future (pattern status updates flow back to Prod/*).

## Complexity Assessment

### High Complexity Areas

**1. Multi-Source Aggregation Logic** (Medium-High Complexity)
- **Challenge:** Combine learnings from N sources with deduplication
- **Implementation:** `lib/2l-reflection-aggregator.py` accepts multiple `--jsonl` paths
- **Edge Cases:** Missing files, malformed JSON, permission denied
- **Estimated Effort:** 2-3 hours (extend existing aggregator)
- **Builder Splits:** Likely single builder (focused scope)

**2. Source Project Derivation** (Low-Medium Complexity)
- **Challenge:** Extract project name from directory path
- **Implementation:** Python path manipulation
- **Edge Cases:** 
  - Nested projects: `Prod/clients/acme/dashboard` → use "dashboard" or "acme-dashboard"?
  - Meditation space: `~/Ahiya/2L` → "meditation-space"
- **Estimated Effort:** 1 hour (simple path parsing)
- **Builder Splits:** Include in aggregator builder

**3. Framework Issue Classification Refinement** (Medium Complexity)
- **Challenge:** Improve heuristic to reduce false positives/negatives
- **Implementation:** Enhance `is_framework_issue()` in reflection generator
- **Testing:** Need test suite with known framework vs project issues
- **Estimated Effort:** 2 hours (heuristic tuning + documentation)
- **Builder Splits:** Single builder (focused change)

### Medium Complexity Areas

**1. Discovery Phase in /2l-improve** (Low-Medium Complexity)
- **Challenge:** Glob `Prod/*/.2L/global-learnings.jsonl` and pass to aggregator
- **Implementation:** Shell globbing + loop
- **Edge Cases:** No Prod/* projects, permission issues, symlink handling
- **Estimated Effort:** 1-2 hours (bash scripting)
- **Builder Splits:** Part of /2l-improve enhancement builder

**2. Priority Classification Clarification** (Low Complexity)
- **Challenge:** Update P1/P2/P3 semantics (framework vs app performance)
- **Implementation:** Documentation + docstring updates
- **Affected Files:** `lib/2l-reflection-generator.py`, templates
- **Estimated Effort:** 1 hour (documentation)
- **Builder Splits:** Include in reflection generator builder

### Low Complexity Areas

**1. Schema Extension** (Low Complexity)
- **Challenge:** Add `source_project` field to learning entries
- **Implementation:** Additive change (backward compatible)
- **Migration:** Existing learnings without field handled gracefully
- **Estimated Effort:** 30 minutes (schema update)
- **Builder Splits:** Include in reflection generator builder

**2. Dashboard Visualization** (Post-MVP, Low-Medium Complexity)
- **Challenge:** Show cross-project pattern evidence breakdown
- **Implementation:** HTML template + JSONL parsing
- **Estimated Effort:** 2-3 hours (frontend work)
- **Builder Splits:** Separate builder (should-have, not must-have)

## Integration Points

### External APIs

None - Plan-10 is purely internal (filesystem I/O only).

### Internal Integrations

**1. `/2l-improve` ↔ Reflection Aggregator**
- **Current Interface:** 
  ```bash
  python3 2l-reflection-aggregator.py \
    --jsonl .2L/global-learnings.jsonl \
    --global-learnings .2L/global-learnings.yaml
  ```
- **Plan-10 Enhancement:**
  ```bash
  # Option A: Multiple --jsonl flags
  python3 2l-reflection-aggregator.py \
    --jsonl .2L/global-learnings.jsonl \
    --jsonl Prod/StatViz/.2L/global-learnings.jsonl \
    --jsonl Prod/wealth/.2L/global-learnings.jsonl \
    --global-learnings .2L/global-learnings.yaml
  
  # Option B: Auto-discovery via meditation space flag
  python3 2l-reflection-aggregator.py \
    --meditation-space \
    --global-learnings .2L/global-learnings.yaml
  ```
- **Recommendation:** Option B (cleaner, less CLI complexity)

**2. Reflection Generator ↔ Project Context**
- **Current:** Runs in project directory, no knowledge of meditation space vs Prod/*
- **Plan-10 Enhancement:** Detect project name from `$PWD`:
  ```python
  import os
  from pathlib import Path
  
  cwd = Path.cwd()
  if cwd == Path.home() / "Ahiya" / "2L":
      source_project = "meditation-space"
  elif "Prod" in cwd.parts:
      # Extract project name from path
      prod_index = cwd.parts.index("Prod")
      source_project = cwd.parts[prod_index + 1]
  else:
      source_project = "unknown"
  ```

**3. Pattern Lifecycle ↔ Aggregation**
- **Current:** Pattern lifecycle reads single `global-learnings.yaml`
- **Plan-10 Impact:** No change needed (patterns are stored in meditation space only)
- **Future Enhancement:** Sync pattern status back to Prod/* learnings

## Risks & Challenges

### Technical Risks

**Risk 1: Glob Pattern Brittleness**
- **Description:** `Prod/*/.2L/global-learnings.jsonl` assumes standard naming
- **Impact:** Miss learnings if project uses different path
- **Mitigation:** Document convention, add validation in setup
- **Likelihood:** Low (naming is consistent)

**Risk 2: Malformed JSONL from Prod/* Projects**
- **Description:** One corrupted JSONL file breaks entire aggregation
- **Impact:** `/2l-improve` fails, pattern detection blocked
- **Mitigation:** Graceful error handling (skip bad files, log warnings)
- **Likelihood:** Medium (file corruption possible)

**Risk 3: Performance Degradation**
- **Description:** Reading 100+ learnings from 10+ projects
- **Impact:** Slow `/2l-improve` startup
- **Success Criteria:** <5s aggregation time (per vision)
- **Mitigation:** Profile aggregator, optimize if needed
- **Likelihood:** Low (JSONL parsing is fast)

### Complexity Risks

**Risk 1: Source Project Naming Ambiguity**
- **Description:** Edge cases in path → project name mapping
- **Example:** `Prod/clients/acme/dashboard` → "dashboard", "acme", or "clients-acme-dashboard"?
- **Impact:** Inconsistent source tracking
- **Mitigation:** Use immediate parent directory, document convention
- **Likelihood:** Low (most projects are `Prod/{name}/`)

**Risk 2: Framework Issue Classification False Positives**
- **Description:** Heuristic incorrectly flags app issues as framework issues
- **Example:** "Builder took 2 minutes" - is framework slow or code complex?
- **Impact:** Noise in global learnings, wasted improvement cycles
- **Mitigation:** Conservative heuristic (prefer false negatives), manual review
- **Likelihood:** Medium (classification is inherently fuzzy)

## Recommendations for Planner

1. **Use Single-Iteration Plan** - Complexity is SIMPLE-MEDIUM, all features fit in one iteration with 3-4 builders:
   - Builder 1: Enhance `/2l-improve` with multi-source discovery
   - Builder 2: Extend reflection generator (source_project field, classification refinement)
   - Builder 3: Extend reflection aggregator (multi-source support, source tracking)
   - Builder 4: Documentation and testing (validation scripts, edge cases)

2. **Prioritize Graceful Degradation** - Missing Prod/* learnings should NOT block `/2l-improve`:
   ```python
   try:
       prod_learnings = glob_and_read("Prod/*/.2L/global-learnings.jsonl")
   except Exception as e:
       log_warning(f"Failed to read Prod/* learnings: {e}")
       prod_learnings = []  # Continue with meditation space only
   ```

3. **Use Conservative Framework Issue Heuristic** - Prefer false negatives (miss some framework issues) over false positives (capture app issues):
   - Default to NOT capturing if uncertain
   - Document "When in doubt, don't capture" principle
   - Add manual override for edge cases

4. **Implement Source Tracking Throughout Pipeline** - Ensure `source_project` field flows through entire pipeline:
   - Reflection Generator: Add field during learning creation
   - Aggregator: Preserve field during pattern merging
   - Pattern Lifecycle: Include in pattern metadata
   - Dashboard: Display source breakdown

5. **Test with Real Prod/* Projects** - Before marking iteration complete, validate with at least 2 real Prod/* projects:
   - StatViz (has active development)
   - wealth or SplitEasy (has learnings)
   - Verify cross-project pattern detection works

6. **Document Naming Conventions** - Add to `/2l-improve` help text and vision template:
   - Standard path: `~/Ahiya/2L/Prod/{project}/.2L/global-learnings.jsonl`
   - Project name derivation: Immediate parent of `.2L/`
   - Meditation space name: "meditation-space" (hardcoded)

## Resource Map

### Critical Files/Directories

**Primary Modification Targets:**
- `/home/ahiya/Ahiya/2L/commands/2l-improve.md` - Add multi-source discovery (Step 1)
- `/home/ahiya/Ahiya/2L/lib/2l-reflection-generator.py` - Add source_project field, refine heuristic
- `/home/ahiya/Ahiya/2L/lib/2l-reflection-aggregator.py` - Accept multiple JSONL sources
- `/home/ahiya/Ahiya/2L/lib/2l-pattern-detector.py` - No change needed (reads from YAML)
- `/home/ahiya/Ahiya/2L/lib/2l-vision-generator.py` - Include cross-project evidence in visions

**Data Files:**
- `/home/ahiya/Ahiya/2L/.2L/global-learnings.jsonl` - Meditation space learnings
- `/home/ahiya/Ahiya/2L/.2L/global-learnings.yaml` - Aggregated patterns
- `/home/ahiya/Ahiya/2L/Prod/*/. 2L/global-learnings.jsonl` - Production project learnings (9+ files found)

**Templates:**
- `/home/ahiya/.claude/templates/improvement-vision.md` - May need cross-project evidence section

### Key Dependencies

**Python Standard Library:**
- `glob` - Filesystem pattern matching
- `pathlib.Path` - Path manipulation for source_project derivation
- `json` - JSONL parsing
- `yaml` - Pattern storage

**Bash Utilities:**
- `find` or `ls` - Alternative to glob for discovery
- `wc -l` - Learnings file validation

**2L Internal:**
- `lib/2l-yaml-helpers.py` - Atomic YAML writes
- `lib/2l-event-logger.sh` - Event emission (optional)

### Testing Infrastructure

**Unit Tests (Recommended):**
```python
# test_multi_source_aggregation.py
def test_aggregator_handles_multiple_sources():
    sources = [
        "fixtures/meditation-space.jsonl",
        "fixtures/StatViz.jsonl",
        "fixtures/wealth.jsonl"
    ]
    patterns = aggregate_multi_source(sources)
    assert len(patterns) > 0
    assert "source_projects" in patterns[0]

def test_source_project_derivation():
    assert derive_project_name("/home/ahiya/Ahiya/2L") == "meditation-space"
    assert derive_project_name("/home/ahiya/Ahiya/2L/Prod/StatViz") == "StatViz"
    assert derive_project_name("/home/ahiya/Ahiya/2L/Prod/ai-mafia") == "ai-mafia"
```

**Integration Tests (Critical):**
```bash
# test_2l_improve_federation.sh
# 1. Create mock Prod/* projects with learnings
# 2. Run /2l-improve in meditation space
# 3. Verify patterns include cross-project evidence
# 4. Verify source_projects field populated
```

**Smoke Tests (Existing):**
- `lib/2l-smoke-tests.sh` - Framework health checks (should pass after Plan-10)

## Questions for Planner

1. **Deduplication Strategy:** If StatViz iteration-3 and TaskManager iteration-5 both discover "integration slow", do we:
   - Create 2 separate learning entries (keep provenance)?
   - Deduplicate and merge into 1 entry with multiple sources?
   - **Proposed Answer:** Keep separate entries, aggregator merges into single pattern with `source_projects: [StatViz, TaskManager]`

2. **Source Project Naming for Nested Projects:**
   - Current Prod/* structure has: `ai-mafia/2L-test/app/.2L/`
   - Should we use "app", "2L-test", or "ai-mafia-2L-test-app"?
   - **Proposed Answer:** Use immediate parent directory name ("app"), document limitation

3. **Backward Compatibility for Existing Learnings:**
   - Existing learnings lack `source_project` field
   - Should we backfill or handle as "unknown"?
   - **Proposed Answer:** Handle gracefully (default to "unknown" or "legacy"), no backfill needed

4. **Dashboard Integration Priority:**
   - Should Plan-10 include dashboard cross-project view?
   - Or defer to post-MVP "should-have"?
   - **Proposed Answer:** Defer dashboard to Plan-11 (focus on core aggregation first)

5. **Performance Threshold:**
   - Vision states "<5s aggregation for 100+ learnings from 10+ projects"
   - Should we add performance benchmarks?
   - **Proposed Answer:** Yes, add simple timing to aggregator (emit event with duration)

