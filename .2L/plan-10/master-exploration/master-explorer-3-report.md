# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Complete the meta-circular learning loop by aggregating framework learnings from all Prod/* projects into the meditation space's /2l-improve workflow, enabling ecosystem-wide pattern detection and cross-project evidence for framework improvements.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 5 must-have features
- **User stories/acceptance criteria:** 21 acceptance criteria across 5 features
- **Estimated total work:** 6-10 hours (vision estimates 6-10h for SIMPLE-MEDIUM complexity)

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **User Flow Complexity:** Primary flow (/2l-improve in meditation space) has clear, linear progression with well-defined integration points
- **Data Integration Challenges:** Multi-source JSONL aggregation requires careful error handling but patterns are well-established (reflection generator and aggregator already exist)
- **Cross-Project Discovery:** File system globbing is straightforward but requires robust graceful degradation for missing/malformed files
- **State Management:** Source tracking adds new field to existing data model - additive change, low risk
- **No UI complexity:** All workflows are CLI-based, no frontend integration

---

## User Flow Analysis

### Flow 1: /2l-improve Ecosystem-Wide Aggregation (Primary Flow)

**User Journey:**
1. **Entry Point:** Framework maintainer in meditation space (`~/Ahiya/2L`) runs `/2l-improve`
2. **Context Detection:** System detects meditation space (not Prod/* project)
3. **Multi-Source Discovery:**
   - Primary source: `~/Ahiya/2L/.2L/global-learnings.jsonl`
   - Secondary sources: Glob `~/Ahiya/2L/Prod/*/.2L/global-learnings.jsonl`
   - Result: List of 1-10+ JSONL file paths
4. **Aggregation Phase:**
   - Read all discovered JSONL files sequentially
   - Parse each learning entry
   - Filter for framework-only issues (exclude app bugs)
   - Track source_project per entry
5. **Pattern Detection:**
   - Run similarity matching across all learnings
   - Group similar issues into patterns
   - Evidence aggregation: "Detected in StatViz, TaskManager" (cross-project confidence)
6. **Vision Generation:**
   - Auto-generate improvement vision from top pattern
   - Include cross-project evidence in vision context
7. **User Decision Point:**
   - Proceed (execute improvement)
   - Edit (manual review before execution)
   - Cancel (abort)
8. **Execution:** Run /2l-mvp to implement improvement

**Critical Integration Points:**

**IP-1: File System Discovery**
- **Component:** `/2l-improve` command (bash)
- **Integration:** Glob pattern `Prod/*/.2L/global-learnings.jsonl`
- **Data Contract:** Returns list of absolute file paths
- **Error Handling:**
  - Missing Prod/ directory: Skip gracefully (new meditation space)
  - Permission denied: Log warning, continue with accessible sources
  - Empty results: Continue with meditation space learnings only
- **Performance:** <100ms for 10 projects (file system scan)

**IP-2: Multi-Source JSONL Reader**
- **Component:** `lib/2l-reflection-aggregator.py` (Python)
- **Current State:** Accepts single `--jsonl` path
- **Proposed Enhancement:** Accept multiple `--jsonl` paths OR auto-discover
- **Integration Pattern:**
  ```bash
  # Option A: Pass multiple JSONL paths
  python3 lib/2l-reflection-aggregator.py \
    --jsonl .2L/global-learnings.jsonl \
    --jsonl Prod/StatViz/.2L/global-learnings.jsonl \
    --jsonl Prod/TaskManager/.2L/global-learnings.jsonl

  # Option B: Auto-discovery mode (meditation space only)
  python3 lib/2l-reflection-aggregator.py \
    --mode multi-source \
    --meditation-space ~/Ahiya/2L
  ```
- **Data Flow:**
  - Read each JSONL file sequentially
  - Parse JSON lines (skip malformed entries with warning)
  - Extract source_project from file path or config.yaml
  - Merge into unified learning list
- **Error Handling:**
  - Malformed JSON: Log error with file path + line number, skip entry
  - Missing file from glob: Already handled at discovery layer
  - Encoding issues: Try UTF-8, fallback to latin-1, skip on failure

**IP-3: Source Project Tracking**
- **Component:** Learning entry data model (JSONL)
- **Schema Change:** Add `source_project` field
- **Integration Points:**
  - **Reflection Generator** (creates entries): Add source_project field when appending to JSONL
  - **Aggregator** (reads entries): Parse source_project, preserve through pipeline
  - **Pattern YAML** (aggregated patterns): Add `source_projects` list field
- **Backward Compatibility:**
  - Existing learnings without source_project: Default to "meditation-space" or "unknown"
  - Schema version remains 1.0 (additive change)
- **Data Contract:**
  ```json
  {
    "learning_id": "plan-X-iter-Y-learning-001",
    "source_project": "StatViz",  // NEW FIELD
    "project": "StatViz",  // EXISTING (may differ in meditation space context)
    "category": "framework-performance",
    "priority": "P3",
    "root_cause": "...",
    // ... other fields
  }
  ```

**IP-4: Pattern Evidence Aggregation**
- **Component:** `lib/2l-reflection-aggregator.py` pattern merging logic
- **Current Behavior:** Merges learnings into patterns, tracks occurrences
- **Enhancement:** Track unique source_projects per pattern
- **Integration:**
  ```python
  # In merge_into_pattern() method
  source_project = learning.get("source_project", "unknown")
  if "source_projects" not in pattern:
      pattern["source_projects"] = []
  if source_project not in pattern["source_projects"]:
      pattern["source_projects"].append(source_project)

  # Also update evidence_count
  pattern["evidence_count"] = len(pattern["source_projects"])
  ```
- **User-Facing Impact:** Dashboard and vision generator show "Detected in: StatViz, TaskManager" (3 projects = high confidence)

**IP-5: Framework vs Project Issue Classification**
- **Component:** `lib/2l-reflection-generator.py` filtering logic
- **Current State:** Basic framework keyword matching
- **Enhancement Needed:** Refined heuristics to reduce false positives
- **Integration Points:**
  - **Validation Report Parsing:** Extract issues from validator output
  - **Keyword Matching:** Check for framework terms (orchestrator, builder, agent spawn, etc.)
  - **Path Filtering:** Include commands/, lib/, agents/ paths; exclude app/, src/, components/
  - **Conservative Bias:** When uncertain, default to NOT capturing (prefer false negatives)
- **User Experience Impact:**
  - **Before:** Reflection files cluttered with "slow database query" (app issue)
  - **After:** Only "integrator took 45s" (framework issue) captured
  - **Outcome:** Cleaner signal for /2l-improve pattern detection

**IP-6: Priority Classification Clarity**
- **Component:** `lib/2l-reflection-generator.py` categorize_by_priority() method
- **Current Confusion:** P3 captures both "app is slow" and "framework is slow"
- **Proposed Clarity:**
  - **P1 (Functionality):** 2L workflow broken (agent crashes, orchestrator fails)
  - **P2 (Completeness):** 2L missing features (no healing phase, can't spawn multiple builders)
  - **P3 (Speed):** 2L framework performance ONLY (agent spawn slow, integration phase slow)
    - **NOT app performance:** Database query slow, build time slow, API latency
- **Integration:** Update keyword matching to distinguish:
  - "integrator took 45s" → P3 (framework performance)
  - "database query took 3s" → NOT captured (app performance)
  - "agent spawn timeout" → P3 (framework performance)

**Edge Cases & Error Handling:**

1. **No Prod/* Projects Yet**
   - **Scenario:** Fresh meditation space, no production projects
   - **Handling:** Glob returns empty list, continue with meditation space learnings only
   - **User Feedback:** "Aggregated learnings from 1 source: meditation-space"

2. **Prod/* Project Without .2L Directory**
   - **Scenario:** New project not yet using 2L
   - **Handling:** Glob pattern doesn't match, skip silently
   - **No error logged:** Normal state for projects

3. **Prod/* Project With .2L But No Learnings**
   - **Scenario:** Project using 2L but no iterations completed yet
   - **Handling:** File doesn't exist, skip gracefully
   - **User Feedback:** Optional debug log "Skipped: Prod/NewProject (no learnings file)"

4. **Malformed JSONL Entry**
   - **Scenario:** Manual edit or corruption
   - **Handling:** JSON parse error, log to stderr with file path + line number
   - **Recovery:** Continue with other entries
   - **Example Error:** "WARNING: Malformed JSON at Prod/StatViz/.2L/global-learnings.jsonl:15: Expecting ',' delimiter"

5. **Permission Denied on Prod/* Directory**
   - **Scenario:** File system permissions issue
   - **Handling:** Glob raises exception, catch and log warning
   - **Recovery:** Continue with accessible sources
   - **User Feedback:** "WARNING: Cannot access Prod/RestrictedProject (permission denied)"

6. **Same Framework Issue Discovered in Multiple Projects**
   - **Scenario:** 3 projects all hit "integration phase slow"
   - **Handling:** 3 separate learning entries, aggregator merges into single pattern
   - **Result:** Pattern shows `source_projects: [StatViz, TaskManager, BlogEngine]`
   - **Confidence Signal:** High confidence (3 independent observations)

7. **Framework + App Issues in Same Validation Report**
   - **Scenario:** Validator finds both "integrator slow" and "API endpoint slow"
   - **Handling:** Reflection generator filters per issue:
     - "integrator slow" → Framework issue → CAPTURED
     - "API endpoint slow" → App issue → IGNORED
   - **Result:** Only framework issue in global-learnings.jsonl

8. **Reflection Generator Uncertain About Classification**
   - **Scenario:** Issue text ambiguous (e.g., "timeout during build")
   - **Conservative Approach:** Default to NOT capturing
   - **Rationale:** Prefer clean signal over noisy data
   - **User Impact:** May miss some framework issues, but avoids pollution

---

### Flow 2: Project Iteration Creates Reflection (Prod/* Project)

**User Journey:**
1. **Entry Point:** User in `~/Ahiya/2L/Prod/StatViz` runs `/2l-mvp`
2. **Iteration Execution:** Exploration → Planning → Building → Integration → Validation
3. **Validation Phase Completes:** Validation report generated at `.2L/plan-X/iteration-Y/validation/validation-report.md`
4. **Reflection Generation Triggered:**
   - **Component:** `lib/2l-reflection-generator.py`
   - **Input:** Validation report (markdown)
   - **Processing:**
     - Parse issues from validation report
     - Apply framework-only filtering
     - Classify by priority (P1/P2/P3)
     - Add source_project field
   - **Output:** Append to `Prod/StatViz/.2L/global-learnings.jsonl`
5. **Local Aggregation (Optional):**
   - Update `Prod/StatViz/.2L/global-learnings.yaml` with project-local patterns
   - **Note:** This is separate from meditation space aggregation
6. **No Automatic Sync:** Learnings stay in Prod/* project until next `/2l-improve` in meditation space

**Critical Integration Points:**

**IP-7: Source Project Detection**
- **Component:** `lib/2l-reflection-generator.py` at invocation time
- **Current Invocation:**
  ```bash
  python3 2l-reflection-generator.py \
    --iteration-dir .2L/plan-3/iteration-2 \
    --plan-id plan-3 \
    --iteration 2 \
    --output .2L/plan-3/iteration-2/REFLECTION.md \
    --jsonl .2L/global-learnings.jsonl
  ```
- **Proposed Enhancement:** Add `--source-project` argument
  ```bash
  python3 2l-reflection-generator.py \
    ... \
    --source-project "StatViz"  # NEW ARGUMENT
  ```
- **Source Project Derivation:**
  - **Option A:** Explicit CLI argument (caller determines from config.yaml)
  - **Option B:** Auto-detect from config.yaml in current directory
  - **Recommended:** Option B (less caller complexity)
  ```python
  # In reflection-generator.py
  def detect_source_project():
      config_path = Path(".2L/config.yaml")
      if config_path.exists():
          config = yaml.safe_load(config_path.read_text())
          return config.get("project_name", "unknown")
      return "meditation-space"  # Default for meditation space
  ```

**IP-8: Reflection Generator Integration Point**
- **Component:** `/2l-mvp` orchestrator calling reflection generator
- **Current Call:** After validation phase completes
- **Location:** Likely in `commands/2l-mvp.md` or orchestrator script
- **Enhancement:** Pass source_project context
- **Example:**
  ```bash
  # In /2l-mvp after validation completes
  python3 ~/.claude/lib/2l-reflection-generator.py \
    --iteration-dir ".2L/${PLAN_ID}/iteration-${ITER}" \
    --plan-id "${PLAN_ID}" \
    --iteration "${GLOBAL_ITER}" \
    --output ".2L/${PLAN_ID}/iteration-${ITER}/REFLECTION.md" \
    --jsonl ".2L/global-learnings.jsonl"
    # No need for explicit --source-project, auto-detected from config.yaml
  ```

**IP-9: Learning Entry Creation**
- **Component:** `lib/2l-reflection-generator.py` append_to_jsonl() function
- **Current Schema:**
  ```json
  {
    "learning_id": "plan-3-iter-2-learning-001",
    "project": "2L-self-improvement",
    "plan_id": "plan-3",
    "iteration": 2,
    "category": "functionality",
    "priority": "P2",
    "issue": "...",
    "root_cause": "...",
    "suggested_fix": "..."
  }
  ```
- **Enhanced Schema:**
  ```json
  {
    "learning_id": "plan-3-iter-2-learning-001",
    "source_project": "StatViz",  // NEW - project that discovered this
    "project": "StatViz",  // EXISTING - may be same or different
    "plan_id": "plan-3",
    "iteration": 2,
    "category": "framework-performance",
    "priority": "P3",
    "issue": "Integration phase slow",
    "root_cause": "Integrator took 45s for 4 builders",
    "suggested_fix": "Parallelize builder merging"
  }
  ```

**Edge Cases:**

1. **Project-Specific vs Framework Issue Ambiguity**
   - **Scenario:** "Builder generated code with syntax error"
   - **Question:** Framework issue (builder quality) or project issue (complex requirements)?
   - **Heuristic:** If mentions "builder", "agent", "orchestrator" → framework issue
   - **Conservative:** If unclear after heuristics → NOT captured

2. **Validation Passes Perfectly**
   - **Scenario:** No issues detected in validation report
   - **Handling:** Reflection generator finds no framework issues
   - **Output:** REFLECTION.md created with "No framework issues detected"
   - **JSONL:** No entries appended (nothing to learn)

3. **JSONL Append Failure**
   - **Scenario:** File system full, permission denied, or disk error
   - **Handling:** append_to_jsonl() raises IOError
   - **Recovery:** Log error, continue iteration (non-blocking)
   - **Rationale:** Iteration should complete even if reflection fails

---

## Data Flow Mapping

### Cross-Project Learning Flow (Ecosystem-Wide)

```
[Prod/StatViz Iteration] → [Validation Report] → [Reflection Generator]
                                                        ↓
                                                   (Framework filter)
                                                        ↓
                               Prod/StatViz/.2L/global-learnings.jsonl
                                        (source_project: "StatViz")

[Prod/TaskMgr Iteration] → [Validation Report] → [Reflection Generator]
                                                        ↓
                               Prod/TaskMgr/.2L/global-learnings.jsonl
                                        (source_project: "TaskManager")

[Meditation Space /2l-improve] → [Multi-Source Discovery]
                                            ↓
                    [Glob: Prod/*/.2L/global-learnings.jsonl]
                                            ↓
                    ┌───────────────────────┴────────────────────┐
                    ↓                                            ↓
    meditation-space learnings                    Prod/* project learnings
    .2L/global-learnings.jsonl              StatViz, TaskMgr, BlogEngine, etc.
                    │                                            │
                    └───────────────────┬────────────────────────┘
                                        ↓
                         [Reflection Aggregator - Multi-Source Mode]
                                        ↓
                         (Merge all learnings, track source_project)
                                        ↓
                         [Pattern Detection via Similarity Matching]
                                        ↓
                         [Pattern Aggregation with Source Evidence]
                                        ↓
                    .2L/global-learnings.yaml (Updated Patterns)
                    - pattern_id: PATTERN-002
                      source_projects: [StatViz, TaskManager]
                      evidence_count: 2
                      occurrences: 5
                                        ↓
                         [Vision Generator - Uses Cross-Project Context]
                                        ↓
                            .2L/plan-X/vision.md
                    (Includes: "Detected in 2 projects: StatViz, TaskManager")
                                        ↓
                         [User Confirmation & /2l-mvp Execution]
                                        ↓
                         [Framework Improvement Implemented]
```

### Key Data Transformations

**Transformation 1: Source Project Extraction**
- **Input:** File path `Prod/StatViz/.2L/global-learnings.jsonl`
- **Process:** Parse path, extract "StatViz" or read from config.yaml
- **Output:** `source_project = "StatViz"`

**Transformation 2: Multi-Source JSONL Merge**
- **Input:**
  ```
  [
    ".2L/global-learnings.jsonl",
    "Prod/StatViz/.2L/global-learnings.jsonl",
    "Prod/TaskManager/.2L/global-learnings.jsonl"
  ]
  ```
- **Process:**
  - Read each file sequentially
  - Parse JSON lines
  - Extract/infer source_project per entry
  - Append to unified list
- **Output:** Single list of learning dicts with source_project field

**Transformation 3: Pattern Source Aggregation**
- **Input:** Learning entries from different source_projects
  ```json
  [
    {"learning_id": "...", "source_project": "StatViz", "root_cause": "integration slow"},
    {"learning_id": "...", "source_project": "TaskManager", "root_cause": "integration phase slow"}
  ]
  ```
- **Process:** Similarity matching (0.8+ threshold) → merge into pattern
- **Output:**
  ```yaml
  pattern_id: PATTERN-002
  root_cause: "Integration phase slow"
  source_projects: [StatViz, TaskManager]
  evidence_count: 2
  occurrences: 2
  ```

---

## Integration Complexity Assessment

### High Complexity Integration Points (Require Careful Design)

**HC-1: Multi-Source Discovery & Graceful Degradation**
- **Complexity Driver:** File system operations across multiple projects
- **Challenges:**
  - Projects may not exist yet
  - Permissions may vary
  - File formats may differ slightly
  - Concurrent access (multiple developers)
- **Mitigation:**
  - Comprehensive error handling per source
  - Log warnings, not errors, for missing files
  - Continue processing on individual source failures
  - File locking for JSONL appends (already implemented)

**HC-2: Framework vs Project Issue Classification**
- **Complexity Driver:** Semantic understanding of issue text
- **Challenges:**
  - Ambiguous cases (is "builder timeout" framework or app complexity?)
  - Keyword matching has false positives/negatives
  - Path-based filtering may miss issues
- **Mitigation:**
  - Multi-heuristic approach (keywords + paths + context)
  - Conservative bias (prefer false negatives)
  - Document heuristics clearly
  - Plan for iteration (tune based on false positives observed)

**HC-3: Backward Compatibility with Existing Learnings**
- **Complexity Driver:** Existing JSONL files lack source_project field
- **Challenges:**
  - Old entries don't have source_project
  - Aggregator must handle mixed schema
  - Pattern YAML already exists with different structure
- **Mitigation:**
  - Default source_project to "meditation-space" or "unknown" if missing
  - Schema version remains 1.0 (additive change)
  - Update aggregator to handle optional field
  - No migration needed (graceful degradation)

### Medium Complexity Integration Points

**MC-1: Source Project Auto-Detection**
- **Complexity:** Reading config.yaml at runtime, handling variations
- **Challenges:**
  - config.yaml format may vary across projects
  - project_name field may not exist in older projects
  - Need fallback logic
- **Solution:**
  - Try config.yaml first
  - Fallback to directory name parsing
  - Default to "unknown" if all fail

**MC-2: Pattern Evidence Visualization**
- **Complexity:** Formatting cross-project evidence for user display
- **Challenges:**
  - Need to show "Detected in: Project1, Project2" in multiple places
  - Dashboard, vision generator, /2l-improve output must be consistent
- **Solution:**
  - Centralize formatting logic
  - Use simple comma-separated list
  - Sort alphabetically for consistency

### Low Complexity Integration Points

**LC-1: JSONL Schema Extension**
- **Complexity:** Adding one field to JSON structure
- **Solution:** Straightforward additive change

**LC-2: Glob Pattern for File Discovery**
- **Complexity:** Standard Python/bash globbing
- **Solution:** Well-understood pattern, minimal edge cases

**LC-3: Priority Classification Docstring Updates**
- **Complexity:** Documentation clarification
- **Solution:** Update comments and examples in code

---

## Real-Time vs Lazy Aggregation

**Decision: Lazy Aggregation (Recommended)**

**Rationale:**
- **Simpler Implementation:** No need for file watchers, triggers, or background processes
- **Lower Risk:** Avoid race conditions between concurrent project iterations
- **Clear User Model:** /2l-improve explicitly pulls latest data when needed
- **Good Enough Performance:** Discovery + aggregation < 5s even for 100+ learnings
- **Fits Mental Model:** Framework maintainer explicitly triggers improvement cycle

**Trade-offs:**
- **Latency:** Cross-project patterns not detected until /2l-improve runs
  - **Impact:** LOW - framework improvements are not time-critical
- **Potential Staleness:** Prod/* learnings may be hours/days old
  - **Impact:** LOW - framework issues don't change rapidly
- **No Real-Time Alerts:** Can't notify maintainer immediately when pattern threshold crossed
  - **Impact:** LOW - not a monitoring/alerting system

**Alternative Considered: Real-Time Federation**
- Push learnings to meditation space on append
- **Rejected because:**
  - Requires background process or hooks
  - Introduces coupling between projects
  - More failure modes (network, permissions, conflicts)
  - Not needed for MVP use case

---

## API & Data Contract Specifications

### Learning Entry Schema (JSONL)

```json
{
  "learning_id": "plan-3-iter-2-learning-001",
  "source_project": "StatViz",           // NEW - where was this discovered
  "project": "StatViz",                  // EXISTING - may differ in edge cases
  "plan_id": "plan-3",
  "iteration": 2,
  "timestamp": "2025-11-27T16:30:00Z",
  "category": "framework-performance",
  "priority": "P3",
  "issue": "Integration phase slow",
  "severity": "medium",
  "root_cause": "Integrator agent took 45s to merge 4 builder outputs",
  "suggested_fix": "Parallelize builder merging or optimize file I/O",
  "affected_files": ["lib/2l-integrator.py"],
  "pattern_id": null                     // Filled by aggregator
}
```

**Contract Guarantees:**
- `source_project`: MUST be present in new entries (Plan-10+)
- `source_project`: MAY be missing in old entries (backward compat)
- `source_project`: SHOULD be derived from config.yaml or directory name
- If missing, aggregator defaults to "meditation-space"

### Pattern Schema (YAML)

```yaml
pattern_id: PATTERN-002
name: "Integration phase slow"
occurrences: 5
source_projects:               # NEW - list of projects that hit this
  - StatViz
  - TaskManager
  - BlogEngine
evidence_count: 3              # NEW - number of unique source projects
projects:                      # EXISTING - may include duplicates
  - StatViz
  - StatViz
  - TaskManager
  - TaskManager
  - BlogEngine
severity: medium
category: framework-performance
root_cause: "Integrator agent takes 30-60s to merge builder outputs"
proposed_solution: "Parallelize builder merging or optimize file I/O"
status: IDENTIFIED
discovered_in: plan-2-iter-3
discovered_at: "2025-11-27T14:00:00Z"
source_learnings:
  - plan-2-iter-3-learning-001
  - plan-5-iter-2-learning-002
  - plan-7-iter-1-learning-003
  - plan-2-iter-5-learning-001
  - plan-5-iter-4-learning-001
affected_files:
  - lib/2l-integrator.py
  - commands/2l-mvp.md
```

**Contract Guarantees:**
- `source_projects`: List of unique source projects (no duplicates)
- `evidence_count`: Integer count of source_projects list length
- `projects`: May contain duplicates (historical, kept for backward compat)
- `source_learnings`: Preserves all learning IDs that contributed to pattern

### Multi-Source Aggregator CLI Interface

**Option A: Multiple --jsonl Arguments**
```bash
python3 lib/2l-reflection-aggregator.py \
  --mode incremental \
  --global-learnings .2L/global-learnings.yaml \
  --jsonl .2L/global-learnings.jsonl \
  --jsonl Prod/StatViz/.2L/global-learnings.jsonl \
  --jsonl Prod/TaskManager/.2L/global-learnings.jsonl
```

**Option B: Auto-Discovery Mode (Recommended for MVP)**
```bash
python3 lib/2l-reflection-aggregator.py \
  --mode incremental \
  --global-learnings .2L/global-learnings.yaml \
  --auto-discover-sources  # NEW FLAG
```

Auto-discovery behavior:
1. Check if in meditation space (has ~/Ahiya/2L/.2L/config.yaml)
2. If yes, glob Prod/*/.2L/global-learnings.jsonl
3. Always include .2L/global-learnings.jsonl (meditation space)
4. Pass all discovered paths to aggregator

**Recommended:** Option B for simplicity in /2l-improve integration

---

## Authentication & Authorization Flows

**N/A - No Authentication Required**

This feature operates entirely on local file system in meditation space. No external services, no authentication, no authorization complexity.

**Security Considerations:**
- File system permissions (user must have read access to Prod/* directories)
- No network calls
- No secret management
- No multi-user concerns (single developer meditation space)

---

## State Management Strategy

### Current State (Before Plan-10)

**Meditation Space:**
- `.2L/global-learnings.jsonl` - learnings from meditation space iterations
- `.2L/global-learnings.yaml` - aggregated patterns (meditation space only)

**Prod/* Projects:**
- No .2L directories OR
- `.2L/global-learnings.jsonl` exists but never read by meditation space

### Proposed State (After Plan-10)

**Meditation Space:**
- `.2L/global-learnings.jsonl` - meditation space learnings (unchanged)
- `.2L/global-learnings.yaml` - patterns aggregated from ALL sources
  - **Change:** Now includes learnings from Prod/* projects
  - **Field additions:** `source_projects`, `evidence_count`

**Prod/* Projects:**
- `.2L/global-learnings.jsonl` - project-local learnings
  - **Change:** Entries now include `source_project` field
- `.2L/global-learnings.yaml` - project-local patterns (optional, may not exist)
  - **Note:** Separate from meditation space patterns

### State Synchronization

**Direction:** One-way, pull-based, lazy
- **Source:** Prod/* projects (many)
- **Destination:** Meditation space (one)
- **Trigger:** `/2l-improve` runs in meditation space
- **Frequency:** On-demand (user-initiated)

**No Bidirectional Sync:**
- Pattern status updates in meditation space do NOT flow back to Prod/* projects
- Rationale: Projects don't need to know if framework issue was fixed
- Future enhancement: Could sync VERIFIED/REGRESSED status for visibility

### Conflict Resolution

**No Conflicts Possible:**
- Read-only access to Prod/* learnings
- Meditation space patterns are destination-only
- No concurrent writes to same file
- Each project writes to its own JSONL (isolated)

### State Consistency Guarantees

**Eventual Consistency:**
- Prod/* learnings eventually visible in meditation space on next /2l-improve
- Delay: Seconds to days (depends on when /2l-improve runs)
- Acceptable for this use case (not real-time monitoring)

**Idempotency:**
- Running /2l-improve multiple times with no new learnings → no changes
- Aggregator incremental mode skips already-processed learning IDs
- Safe to re-run without side effects

---

## Error Handling & Edge Cases

### Critical Errors (Must Halt Flow)

**None Identified**

All errors are non-blocking for this feature. /2l-improve should always complete, even if some Prod/* sources are unavailable.

### Non-Blocking Errors (Log & Continue)

**E-1: Malformed JSONL Entry**
- **Detection:** JSON parse error when reading line
- **Handling:**
  - Log error: "WARNING: Malformed JSON at Prod/StatViz/.2L/global-learnings.jsonl:15"
  - Skip entry, continue with next line
- **User Impact:** Pattern may miss one occurrence, not critical

**E-2: Missing source_project Field in Old Entry**
- **Detection:** Field absent when reading learning
- **Handling:**
  - Default to "meditation-space" or "unknown"
  - Log debug message (not warning - expected for backward compat)
- **User Impact:** Old entries grouped as "unknown" project, acceptable

**E-3: Permission Denied on Prod/* Directory**
- **Detection:** OS error when globbing or reading file
- **Handling:**
  - Log warning: "WARNING: Cannot access Prod/RestrictedProject (permission denied)"
  - Skip that project, continue with others
- **User Impact:** One project's learnings missing, others unaffected

**E-4: config.yaml Missing or Malformed**
- **Detection:** File not found or YAML parse error
- **Handling:**
  - Fallback to directory name: "Prod/StatViz" → "StatViz"
  - If that fails, default to "unknown"
  - Log debug message
- **User Impact:** Project name may be generic, not critical

**E-5: Duplicate learning_id Across Projects**
- **Scenario:** Two projects coincidentally generate same learning_id (unlikely but possible)
- **Detection:** Aggregator sees same learning_id from different sources
- **Handling:**
  - Keep both entries (they're from different contexts)
  - Aggregator tracks by (learning_id + source_project) composite key
- **User Impact:** Both learnings processed, pattern evidence accurate

### User-Facing Error Messages

**Good Error Messages:**

```
❌ ERROR: Cannot read Prod/StatViz/.2L/global-learnings.jsonl (permission denied)
   Skipping StatViz learnings. Check file permissions.

⚠️  WARNING: Malformed JSON in Prod/TaskManager/.2L/global-learnings.jsonl at line 42
   Skipping entry. File may need manual repair.

✅ Aggregated learnings from 3 sources:
   - meditation-space (15 learnings)
   - StatViz (8 learnings)
   - TaskManager (12 learnings)
   Total: 35 learnings, 8 patterns detected
```

**Bad Error Messages (Avoid These):**

```
Error reading file                    // What file? What error?
JSON error                            // Which file? Which line?
Skipping project                      // Which project? Why?
```

---

## Accessibility Requirements

**N/A - CLI Tool**

This is a command-line tool with no web UI. No WCAG compliance needed.

**Terminal Accessibility:**
- Use standard stdout/stderr (compatible with screen readers)
- Avoid ASCII art or complex formatting
- Support color-blind users: Don't rely solely on color (use ✅/❌ symbols)
- Respect terminal width: Wrap long lines, don't assume 80-column display

**Example: Color + Symbol for Clarity**
```bash
✅ Pattern detected                   # Green checkmark + text (accessible)
❌ File not found                     # Red X + text (accessible)
```

Not just:
```bash
Pattern detected                      # Color only (not accessible)
```

---

## Responsive Design Requirements

**N/A - CLI Tool**

No responsive design needed. Terminal output is inherently responsive to terminal width.

**Terminal Compatibility:**
- Should work in narrow terminals (80 columns)
- Should work in wide terminals (120+ columns)
- Use text wrapping, not fixed-width layouts
- Test on common terminal emulators (bash, zsh, fish)

---

## Form Handling & Validation

### Input Validation

**IV-1: source_project Field**
- **Type:** String
- **Validation:** Non-empty, alphanumeric + hyphens/underscores
- **Max Length:** 50 characters
- **Sanitization:** Strip leading/trailing whitespace
- **Default:** "meditation-space" if detection fails

**IV-2: File Paths from Glob**
- **Type:** List of absolute paths
- **Validation:**
  - Must exist (checked before reading)
  - Must be readable (checked on open)
  - Must end with .jsonl
- **Sanitization:** None needed (glob returns trusted paths)

**IV-3: JSONL Entry Schema**
- **Type:** JSON object
- **Required Fields:** learning_id, category, priority, root_cause
- **Optional Fields:** source_project, project, timestamp
- **Validation:**
  - JSON parse succeeds
  - Required fields present
  - Priority in [P1, P2, P3]
  - Category in [functionality, completeness, speed]

### No User Input Forms

This feature has no interactive forms. All inputs are:
- File paths (from glob)
- JSONL data (from files)
- CLI flags (--dry-run, --manual, etc.)

---

## Navigation & User Journey

### Entry Points

**Primary Entry Point:**
- Command: `/2l-improve` in meditation space

**Prerequisites:**
- User must be in meditation space directory (`~/Ahiya/2L`)
- `.2L/global-learnings.yaml` should exist (created by previous iterations)
- At least one Prod/* project with learnings (optional, gracefully degrades)

### User Journey Map

```
[Start: Meditation Space Terminal]
        ↓
[Run: /2l-improve]
        ↓
[System: Detect meditation space context] ← Automatic, no user action
        ↓
[System: Discover learning sources] ← Glob Prod/*/.2L/global-learnings.jsonl
        ↓
[System: Aggregate learnings] ← Multi-source JSONL merge
        ↓
[System: Detect patterns] ← Similarity matching
        ↓
[Display: Top patterns with cross-project evidence]
   "PATTERN-002: Integration slow
    Detected in: StatViz, TaskManager (2 projects)
    Occurrences: 5, Impact: 8.5"
        ↓
[Decision Point: User Confirmation]
   Options:
   - [P]roceed → Continue to vision generation
   - [E]dit → Save vision, manual /2l-mvp
   - [C]ancel → Abort
        ↓
[If Proceed: Vision Generation] ← Auto-generate from pattern
        ↓
[Display: Proposed improvement preview]
        ↓
[Decision Point: Final Confirmation]
   "This will modify 2L framework files. Proceed? (y/N)"
        ↓
[If Yes: Execute /2l-mvp]
        ↓
[End: Framework improved, pattern status updated]
```

### Navigation Patterns

**Linear Flow:**
- No branching navigation (CLI, not web app)
- Clear progression: Detect → Select → Confirm → Execute
- Back navigation: Ctrl+C to cancel at any decision point

**Exit Points:**
- Cancel at first confirmation → No changes
- Cancel at second confirmation → Vision saved, no execution
- Complete successfully → Pattern implemented
- Error during execution → Rollback available (git reset)

---

## Performance Considerations

### User-Perceived Latency Targets

**Discovery Phase (<100ms):**
- Glob `Prod/*/.2L/global-learnings.jsonl`
- Target: <100ms for 20 projects
- Typical: 10-50ms for 10 projects
- Acceptable: <500ms even with 100 projects

**Aggregation Phase (<5s):**
- Read all JSONL files
- Parse JSON entries
- Merge into unified list
- Target: <5s for 100+ learnings from 10 projects
- Typical: 1-2s for 50 learnings from 5 projects

**Pattern Detection (<10s):**
- Similarity matching across all learnings
- Complexity: O(n²) worst case (n = number of learnings)
- Mitigated by category filtering (only compare within same category)
- Target: <10s for 100 learnings
- Typical: 2-5s for 50 learnings

**Total /2l-improve Latency (<30s):**
- Discovery + Aggregation + Pattern Detection + Vision Generation
- Target: <30s for typical meditation space
- Acceptable: <60s for large meditation space (10+ projects, 200+ learnings)

### Optimization Strategies

**OS-1: Category-First Similarity Matching**
- Only compare learnings within same category
- Reduces O(n²) to O(k * (n/k)²) where k = number of categories
- Example: 100 learnings, 5 categories → 20 per category
  - Without: 100² = 10,000 comparisons
  - With: 5 * 20² = 2,000 comparisons (5x faster)

**OS-2: Lazy Pattern Aggregation**
- Don't aggregate on every /2l-improve run if no new learnings
- Check JSONL modification time vs YAML modification time
- If JSONL older → skip aggregation
- Implementation: Compare file mtimes

**OS-3: Incremental Aggregation Mode**
- Only process learnings not already in global-learnings.yaml
- Track processed learning_ids in patterns
- Skip already-aggregated entries
- Already implemented in current aggregator

**OS-4: Parallel File Reading (Future)**
- Read multiple JSONL files concurrently
- Python: Use ThreadPoolExecutor for I/O-bound work
- Benefit: <50% latency reduction for 10+ projects
- Complexity: Higher, defer to post-MVP

### Bottleneck Analysis

**Current Bottlenecks:**
1. **Similarity Matching:** O(n²) algorithm
   - **Mitigation:** Category filtering (already implemented)
   - **Future:** Use locality-sensitive hashing for large n

2. **Sequential JSONL Reading:** One file at a time
   - **Mitigation:** Fast enough for MVP (<5s for 10 projects)
   - **Future:** Parallelize if needed

3. **File System Globbing:** May be slow on network drives
   - **Mitigation:** None needed (meditation space is local)
   - **Future:** Cache glob results if running multiple times

**Not Bottlenecks:**
- JSON parsing (fast in Python)
- YAML writing (small files, <10KB)
- Git operations (already optimized in /2l-improve)

---

## Caching Strategy

**No Caching Needed for MVP**

**Rationale:**
- Aggregation runs infrequently (once per improvement cycle, not every iteration)
- Total latency <30s is acceptable for this use case
- Data freshness is important (want latest learnings)
- Complexity not justified for performance gain

**Future Enhancements (Post-MVP):**
- Cache glob results (invalidate on new project creation)
- Cache parsed JSONL data (invalidate on file modification)
- Cache similarity scores (invalidate on new learnings)

---

## Real-Time Features

**None Required**

This feature is inherently batch-oriented:
- Run on-demand by user
- Process accumulated learnings since last run
- No WebSocket, SSE, or polling needed

**Async Operations:**
- Pattern detection runs synchronously
- Vision generation runs synchronously
- /2l-mvp execution runs synchronously (may take minutes)

All blocking operations have clear progress indicators in CLI.

---

## Data Validation Strategy

### Input Validation (JSONL Entries)

**V-1: JSON Structure**
- **Validator:** `json.loads()` with try/except
- **On Failure:** Log warning with file path + line number, skip entry
- **Example:**
  ```python
  try:
      learning = json.loads(line)
  except json.JSONDecodeError as e:
      print(f"WARNING: Malformed JSON at {jsonl_path}:{line_num}: {e}")
      continue  # Skip this entry
  ```

**V-2: Required Fields**
- **Fields:** learning_id, category, priority, root_cause
- **Validator:** Check field presence in dict
- **On Failure:** Log warning, skip entry
- **Example:**
  ```python
  required = ['learning_id', 'category', 'priority', 'root_cause']
  if not all(field in learning for field in required):
      print(f"WARNING: Missing required field in {jsonl_path}:{line_num}")
      continue
  ```

**V-3: Field Value Constraints**
- **priority:** Must be in [P1, P2, P3]
- **category:** Must be in [functionality, completeness, speed]
- **Validator:** Membership check
- **On Failure:** Log warning, use default value
- **Example:**
  ```python
  if learning['priority'] not in ['P1', 'P2', 'P3']:
      print(f"WARNING: Invalid priority '{learning['priority']}', defaulting to P2")
      learning['priority'] = 'P2'
  ```

### Output Validation (Pattern YAML)

**V-4: Pattern Structure**
- **Validator:** YAML schema validation (optional, not critical)
- **On Failure:** N/A (we control output format)
- **Note:** Trust our own output, validate on read if needed

**V-5: Cross-Project Evidence**
- **Validator:** source_projects list is unique
- **Implementation:**
  ```python
  pattern['source_projects'] = list(set(pattern['source_projects']))
  pattern['evidence_count'] = len(pattern['source_projects'])
  ```

---

## Recommendations for Master Plan

### 1. Single Iteration Approach (Recommended)

**Rationale:**
- **Cohesive Feature Set:** All 5 features are tightly coupled
  - Discovery depends on filtering (need framework-only issues)
  - Aggregation depends on source tracking
  - Pattern evidence depends on multi-source aggregation
- **Clear Dependencies:** Linear dependency chain, not parallel work
- **Low Risk:** Extending existing tools, not building from scratch
- **Estimated Duration:** 6-10 hours (per vision document)

**Iteration Scope:**
1. Enhance reflection generator (framework filtering + source tracking) - 2-3h
2. Extend aggregator (multi-source support) - 2-3h
3. Update /2l-improve (discovery + invocation) - 1-2h
4. Testing & validation - 1-2h

**Success Criteria:**
- Run /2l-improve in meditation space
- See learnings from Prod/StatViz and Prod/TaskManager
- Patterns show cross-project evidence
- Priority classification is accurate (no app performance in P3)

### 2. Start with Framework Filtering Enhancement

**Why First:**
- Foundational improvement (affects all future learnings)
- Reduces noise before multi-source aggregation
- Can validate independently (run reflection generator on test data)
- Lowest risk, highest value

**What to Deliver:**
- Updated reflection generator with refined framework keyword detection
- Clear P1/P2/P3 classification (with examples in docstrings)
- Test cases demonstrating correct filtering

### 3. Defer Dashboard Visualization to Post-MVP

**Rationale:**
- Dashboard is "should-have", not "must-have"
- CLI output sufficient for MVP validation
- Can add later without changing core aggregation logic

**MVP Substitute:**
- Print cross-project evidence in /2l-improve CLI output
- Show in vision.md file (already planned)
- Dashboard enhancement in separate iteration

### 4. Consider One-Time Historical Import (Optional)

**Scenario:** Existing Prod/* projects have learnings from before Plan-10

**Options:**
- **Option A:** Only new learnings (post-Plan-10) include source_project
  - **Pro:** Simple, no migration needed
  - **Con:** Lose historical cross-project patterns
- **Option B:** One-time script to backfill source_project in old entries
  - **Pro:** Complete dataset, better patterns
  - **Con:** Extra work, potential for errors

**Recommendation:** Option A (defer to post-MVP if needed)

### 5. Prioritize Error Handling Over Features

**Why:**
- Multi-source aggregation has many failure modes
- Graceful degradation is critical (one broken project shouldn't break /2l-improve)
- Clear error messages improve maintainability

**What to Include:**
- Comprehensive try/except blocks in aggregator
- Detailed error messages with file paths + line numbers
- Continue-on-error behavior (never halt entire flow)
- Test error cases (malformed JSON, missing files, permission denied)

---

## Technology Stack Recommendations

**No Changes Needed**

Existing stack is appropriate:
- **Python 3:** For reflection generator and aggregator (already in use)
- **Bash:** For /2l-improve command and globbing (already in use)
- **YAML:** For pattern storage (already in use)
- **JSONL:** For learning entries (already in use)

**Libraries:**
- `yaml` (PyYAML): Already in use
- `json`: Standard library
- `pathlib`: Standard library, better than os.path
- `glob`: Standard library OR pathlib.glob()
- `difflib`: Already in use for similarity matching

**No External Dependencies Needed**

---

## Notes & Observations

### Key Insights

**I-1: Lazy Aggregation is Sufficient**
- No need for real-time federation
- Pull-based, on-demand aggregation fits user mental model
- Simpler implementation, lower risk

**I-2: Framework Filtering is Critical**
- Without good filtering, cross-project aggregation becomes noisy
- Must invest in clear heuristics and documentation
- Prefer false negatives over false positives

**I-3: Source Tracking Enables Confidence Scoring**
- Knowing which projects hit a pattern provides confidence signal
- 1 project = possible fluke, 3 projects = real framework issue
- Enables future prioritization (patterns with more evidence first)

**I-4: Backward Compatibility is Easy**
- Additive schema changes (new field, optional)
- Default values for missing fields
- No migration needed

**I-5: User Experience is Straightforward**
- /2l-improve already has clear UX (detect, select, confirm, execute)
- Cross-project aggregation fits naturally into existing flow
- Minimal UX changes needed (just show evidence count)

### Potential Future Enhancements

**FE-1: Bidirectional Pattern Status Sync**
- When pattern marked VERIFIED in meditation space, update status in Prod/* projects
- Use case: Projects can see that framework issue was fixed
- Complexity: Medium (requires writing to Prod/* directories)

**FE-2: Pattern Confidence Scoring**
- Calculate confidence based on evidence_count + occurrences
- Example: 3 projects, 10 occurrences → confidence 0.9
- Use case: Auto-select high-confidence patterns first

**FE-3: Project Health Dashboard**
- Show which projects hit most framework issues
- Use case: Identify projects that stress-test framework most
- Complexity: Low (just count learnings per source_project)

**FE-4: Selective Federation Config**
- Allow excluding certain Prod/* projects from aggregation
- Use case: Skip experimental/deprecated projects
- Implementation: Add exclude_projects list to config.yaml

**FE-5: Learning Deduplication Across Projects**
- If two projects discover identical learning, merge into one with multiple sources
- Current: Creates 2 separate learning entries
- Proposed: One entry with source_projects: [Project1, Project2]
- Trade-off: More complex aggregation logic vs cleaner data

### Questions for Builders

**Q-1: Source Project Field Name**
- Should it be `source_project` or `discovered_in_project`?
- Recommendation: `source_project` (shorter, clearer)

**Q-2: Aggregator CLI Interface**
- Multiple `--jsonl` args OR `--auto-discover-sources` flag?
- Recommendation: Auto-discover flag (simpler for /2l-improve)

**Q-3: Default Value for Missing source_project**
- "meditation-space", "unknown", or null?
- Recommendation: "meditation-space" (most likely source for old entries)

**Q-4: Pattern Evidence Display Format**
- "Detected in: StatViz, TaskManager" OR "Evidence: 2 projects (StatViz, TaskManager)"?
- Recommendation: First format (more concise)

**Q-5: Framework Filtering Strictness**
- Prefer false positives (capture everything) OR false negatives (only clear framework issues)?
- Recommendation: False negatives (clean signal > complete data)

---

*Exploration completed: 2025-11-27T16:45:00Z*
*This report informs master planning decisions for Plan-10*
