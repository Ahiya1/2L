# Explorer 3 Report: Complexity & Integration Points

## Executive Summary

Iteration 9 implements **Feature 2 (Automatic Reflection Creation)** and **Feature 5 (Reflection Aggregation System)** from the master plan. This iteration builds on iteration 8's foundation (Task spawning, pattern lifecycle) to enable continuous learning capture.

**Critical Discovery:** The reflection system requires creation of TWO new components:
1. **Reflection generator** (Python) - Creates REFLECTION.md after iterations
2. **Reflection aggregator** (Python) - Converts accumulated reflections to patterns

**Integration Complexity:** MEDIUM - Both components integrate into existing /2l-mvp orchestrator, with clear insertion points identified at lines 1199 and 1435.

**Recommendation:** Use 3 builders with sequential dependency (Reflection Generator → Aggregator → Integration).

---

## Discoveries

### Discovery Category 1: Reflection Generation Requirements

**Finding 1:** Reflection must distinguish 2L framework issues from project-specific issues
- Framework issues: Affect commands/, lib/, agents/, templates/
- Project issues: Affect application code in project directory
- Detection via file path heuristics + keyword matching

**Finding 2:** Reflection template needs priority categorization
- Priority 1: Functionality (breaks workflow)
- Priority 2: Completeness (missing features)
- Priority 3: Speed (performance issues)

**Finding 3:** Reflection data flows through two formats
- REFLECTION.md (human-readable markdown)
- global-learnings.jsonl (machine-readable for aggregation)

### Discovery Category 2: Aggregation Pipeline Architecture

**Finding 1:** Similarity detection uses Jaccard coefficient on keywords
- Threshold: 0.8 (80% keyword overlap) for grouping
- Proven effective for text similarity in research
- Configurable for tuning post-MVP

**Finding 2:** Incremental aggregation prevents O(n²) scaling
- Track processed timestamps to skip already-analyzed reflections
- Only process new reflections since last aggregation
- Critical for performance as reflection count grows

**Finding 3:** Pattern candidate creation follows existing schema
- Must match pattern structure from lib/2l-pattern-detector.py
- Required fields: pattern_id, name, occurrences, severity, root_cause, proposed_solution
- Integration with pattern lifecycle manager (iteration 8 deliverable)

---

## Patterns Identified

### Pattern Type: Reflection Integration Pattern

**Description:** Standard pattern for post-iteration reflection in orchestrator workflows

**Use Case:** After any successful iteration (first-pass PASS or after healing)

**Example:**
```bash
# After orchestrator_reflection() merges learnings
orchestrator_reflection(plan_id, global_iter, ITER_DIR)

# Generate iteration reflection
echo "   📝 Generating iteration reflection..."
reflection_path="$ITER_DIR/REFLECTION.md"

python3 ~/.claude/lib/2l-reflection-generator.py \
    --iteration-dir "$ITER_DIR" \
    --plan-id "$plan_id" \
    --iteration "$global_iter" \
    --output "$reflection_path" \
    --jsonl ".2L/global-learnings.jsonl"

# Emit event
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
    log_2l_event "reflection_created" \
                 "Iteration ${global_iter} reflection created" \
                 "reflection" \
                 "orchestrator"
fi
```

**Recommendation:** Use this pattern in two locations (lines 1199, 1435)

### Pattern Type: Incremental Aggregation Pattern

**Description:** Track processed items to prevent re-processing in accumulating datasets

**Use Case:** JSONL files that grow over time (reflections, events, learnings)

**Example:**
```python
class Aggregator:
    def __init__(self):
        self.processed_timestamps = set()
    
    def load_state(self):
        # Read existing patterns to get processed timestamps
        patterns = load_patterns()
        self.processed_timestamps = set(
            p['source_reflection_timestamp'] 
            for p in patterns
        )
    
    def process_new_only(self):
        for reflection in read_jsonl():
            if reflection['timestamp'] not in self.processed_timestamps:
                # Process new reflection
                self.processed_timestamps.add(reflection['timestamp'])
```

**Recommendation:** Implement in reflection aggregator to prevent O(n²) scaling

---

## Complexity Assessment

### High Complexity Areas

**lib/2l-reflection-aggregator.py**
- Why complex: Jaccard similarity calculation, incremental processing, pattern synthesis
- Estimated builder splits: 1 builder (no split needed, but ~3.5 hours)
- Mitigation: Clear algorithm (Jaccard well-documented), incremental testing

**Framework Issue Detection Heuristics**
- Why complex: Multi-heuristic approach (file paths + keywords + text analysis)
- Estimated builder splits: Part of reflection generator (no separate builder)
- Mitigation: Tunable keyword list, extensible design for future ML

### Medium Complexity Areas

**lib/2l-reflection-generator.py**
- Complexity: Template rendering, artifact parsing, priority categorization
- Why medium: Standard Python patterns, clear requirements
- Estimated effort: ~2.5 hours

**/2l-mvp Integration**
- Complexity: Two insertion points (lines 1199, 1435)
- Why medium: Duplicate logic, requires testing both code paths
- Estimated effort: ~1.5 hours

### Low Complexity Areas

**templates/reflection.md**
- Straightforward template design (~50 lines)
- Standard markdown structure
- Estimated effort: 30 minutes

**Event Emission**
- Follow existing pattern from iteration 8
- Single event type: reflection_created
- Estimated effort: 15 minutes

---

## Technology Recommendations

### Primary Stack

- **Language: Python 3.8+** - Rationale: Existing 2L utilities use Python, rich libraries for text processing
- **Data Format: JSONL (JSON Lines)** - Rationale: Append-friendly, streaming-compatible, human-readable
- **Similarity Algorithm: Jaccard Coefficient** - Rationale: Simple, effective for keyword-based text similarity, no ML dependencies
- **File Locking: fcntl (Python)** - Rationale: OS-level locking prevents corruption from concurrent writes

### Supporting Libraries

**Standard Library Only (No External Dependencies):**
- json - JSONL parsing
- yaml - Global learnings YAML read/write
- argparse - CLI argument parsing
- re - Regular expressions for keyword extraction
- pathlib - Path manipulation
- datetime - Timestamps
- fcntl - File locking (Unix systems)

**Why No External Dependencies:**
- 2L framework operates in constrained environments
- Avoid dependency hell
- Faster installation, fewer failure modes
- Standard library sufficient for MVP

---

## Integration Points

### External APIs

None - All components are local file operations

### Internal Integrations

**Integration A: /2l-mvp ↔ Reflection Generator**
- Connection: /2l-mvp spawns reflection generator after orchestrator_reflection()
- Data flow: Iteration artifacts → reflection generator → REFLECTION.md + JSONL append
- Coupling: Loose (Python script invoked via subprocess)

**Integration B: Reflection Generator ↔ Reflection Aggregator**
- Connection: Generator writes JSONL, aggregator reads JSONL
- Data flow: global-learnings.jsonl (JSONL format defined by generator schema)
- Coupling: Tight on schema, loose on timing (async processing)

**Integration C: Reflection Aggregator ↔ Pattern Lifecycle**
- Connection: Aggregator creates patterns with status='IDENTIFIED'
- Data flow: Pattern candidates → global-learnings.yaml → /2l-improve detection
- Coupling: Tight on YAML schema (must match existing pattern structure)

**Integration D: /2l-improve ↔ Reflection Aggregator (Optional)**
- Connection: /2l-improve optionally runs aggregator before pattern detection
- Data flow: Trigger aggregation → new patterns available → pattern selection
- Coupling: Loose (optional pre-flight check)

---

## Risks & Challenges

### Technical Risks

**Risk 1: Framework Issue Detection Accuracy**
- Impact: False positives/negatives in pattern creation
- Mitigation: Multi-heuristic approach, tunable keywords, manual review before /2l-improve

**Risk 2: Similarity Threshold Tuning**
- Impact: Too many/few patterns created
- Mitigation: Default 0.8 based on research, CLI override, dry-run mode

**Risk 3: JSONL Concurrent Writes**
- Impact: Data corruption if multiple processes append simultaneously
- Mitigation: File locking (fcntl), atomic appends, backup before aggregation

### Complexity Risks

**Risk 4: Reflection Generator Parsing Failures**
- Likelihood: MEDIUM (missing/malformed iteration artifacts)
- Mitigation: Try/except for all reads, graceful degradation, non-critical execution

**Risk 5: Aggregator Performance Degradation**
- Likelihood: LOW (MVP scale <100 reflections)
- Mitigation: O(n·m) incremental algorithm, post-MVP: LSH for O(n) scaling

---

## Recommendations for Planner

1. **Sequential Builder Execution**
   - Builder-1: Reflection generator (defines JSONL schema)
   - Builder-2: Reflection aggregator (consumes JSONL schema)
   - Builder-3: Integration (uses both components)
   - Rationale: Clear dependencies, easier integration testing

2. **Test with Iteration 8 Artifacts**
   - Use real learnings.yaml from .2L/plan-9/iteration-8/
   - Provides realistic test data for framework issue detection
   - Validates heuristics with actual 2L workflow issues

3. **Implement Dry-Run Mode First**
   - Aggregator --dry-run shows what would be created
   - Allows threshold tuning without modifying global-learnings.yaml
   - Safer for initial testing and validation

4. **Manual Aggregation Trigger (Not Automatic)**
   - Don't auto-run aggregator in /2l-mvp (performance overhead)
   - Manual: User runs python3 lib/2l-reflection-aggregator.py when ready
   - Alternative: Cron job for periodic aggregation (post-MVP)

5. **Create JSONL Repair Utility**
   - Part of Builder-2 deliverables
   - Detects malformed JSON lines, removes corrupted entries
   - Safety net for corruption risk

---

## Resource Map

### Critical Files/Directories

**New Files:**
- lib/2l-reflection-generator.py - Reflection creation (~250 lines)
- lib/2l-reflection-aggregator.py - Pattern aggregation (~350 lines)
- templates/reflection.md - Reflection template (~50 lines)

**Modified Files:**
- commands/2l-mvp.md (lines 1199, 1435) - Add reflection generation (~50 lines added)

**Data Files:**
- .2L/global-learnings.jsonl - Reflection accumulation (append-only)
- .2L/global-learnings.yaml - Pattern candidates (read/write)
- .2L/plan-N/iteration-M/REFLECTION.md - Per-iteration reflections (write-once)

### Key Dependencies

**From Iteration 8:**
- lib/2l-pattern-lifecycle.py - Pattern status management
- lib/2l-event-logger.sh - Event emission
- Global learnings schema - Pattern structure

**Standard Library:**
- json, yaml, argparse, re, pathlib, datetime, fcntl

### Testing Infrastructure

**Unit Tests:**
- Test reflection generator with iteration 8 artifacts
- Test aggregator with synthetic JSONL data
- Test Jaccard similarity calculation

**Integration Tests:**
- End-to-end: /2l-mvp → reflection → aggregation → /2l-improve
- Both code paths: first-pass PASS + after healing
- Concurrent JSONL writes (stress test)

---

## Questions for Planner

**Q1: Aggregation frequency**
- Option A: Manual trigger only (user runs when ready)
- Option B: Auto-run in /2l-improve pre-flight (seamless but may create noise)
- Recommendation: Option A for MVP (more control)

**Q2: Similarity threshold**
- Option A: Fixed 0.8 (80% keyword overlap)
- Option B: Configurable via CLI parameter
- Recommendation: Option A for MVP, Option B post-MVP

**Q3: Framework issue keywords**
- Option A: Hardcoded in reflection generator
- Option B: Load from config file (lib/2l-framework-keywords.yaml)
- Recommendation: Option A for MVP (simpler), Option B if extensibility needed

**Q4: Reflection template**
- Option A: Fixed sections (What Went Well, Framework Issues, Root Causes, Suggestions)
- Option B: Customizable per plan (different templates for different improvement types)
- Recommendation: Option A for MVP (2L framework focus consistent)

**Q5: Pattern ID generation**
- Option A: Sequential (PATTERN-001, PATTERN-002, ...)
- Option B: Hash-based (PATTERN-a3f2c1...)
- Recommendation: Option A (human-readable, requires tracking last ID)

---

## Precise Modification Details

### File: commands/2l-mvp.md (Line 1199)

**Context:** After first-pass validation PASS, before iteration_complete event

**Current Code (Line 1195-1205):**
```python
if validation_status == 'PASS':
    print(f"   ✅ Validation PASSED!")
    
    # Orchestrator Reflection: Merge learnings before iteration complete
    orchestrator_reflection(plan_id, global_iter, ITER_DIR)
    
    # EVENT: iteration_complete
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
      log_2l_event "iteration_complete" ...
    fi
```

**New Code (INSERT AFTER LINE 1199):**
```bash
# Orchestrator Reflection: Merge learnings before iteration complete
orchestrator_reflection(plan_id, global_iter, ITER_DIR)

# Generate iteration reflection
echo "   📝 Generating iteration reflection..."
reflection_path="$ITER_DIR/REFLECTION.md"
global_learnings_jsonl=".2L/global-learnings.jsonl"

python3 ~/.claude/lib/2l-reflection-generator.py \
    --iteration-dir "$ITER_DIR" \
    --plan-id "$plan_id" \
    --iteration "$global_iter" \
    --output "$reflection_path" \
    --jsonl "$global_learnings_jsonl" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "      ✅ Reflection created: $reflection_path"
    if [ "$EVENT_LOGGING_ENABLED" = true ]; then
        log_2l_event "reflection_created" \
                     "Iteration ${global_iter} reflection created" \
                     "reflection" \
                     "orchestrator"
    fi
else
    echo "      ⚠️  Reflection generation failed (non-critical, continuing)"
fi

# EVENT: iteration_complete
```

**Lines Added:** ~20

### File: commands/2l-mvp.md (Line 1435)

**Context:** After healing validation PASS, before iteration_complete event

**Modification:** IDENTICAL to line 1199 insertion (duplicate logic)

**Lines Added:** ~20

---

## Function Signatures for Reflection Aggregator

### Class: ReflectionGenerator

```python
class ReflectionGenerator:
    """Generate iteration reflection from execution artifacts."""
    
    def generate(self, iteration_dir: str, plan_id: str, 
                global_iter: int, output_path: str) -> Dict:
        """
        Create REFLECTION.md from iteration artifacts.
        
        Args:
            iteration_dir: Path to iteration directory
            plan_id: Plan ID (e.g., 'plan-9')
            global_iter: Global iteration number
            output_path: Where to write REFLECTION.md
            
        Returns:
            reflection_dict: Structured reflection data
        """
    
    def _extract_framework_issues(self, learnings: Dict, 
                                  validation: str) -> List[Dict]:
        """Filter for 2L framework issues vs project issues."""
    
    def _is_framework_issue(self, learning: Dict) -> bool:
        """Determine if learning is about 2L framework."""
    
    def _categorize_issues(self, issues: List[Dict]) -> Dict:
        """Categorize issues by priority."""
    
    def _determine_priority(self, issue: Dict) -> str:
        """Classify issue into priority category."""
```

### Class: ReflectionAggregator

```python
class ReflectionAggregator:
    """Aggregate reflections into pattern candidates."""
    
    SIMILARITY_THRESHOLD = 0.8
    MIN_OCCURRENCES = 2
    
    def __init__(self, jsonl_path: str, global_learnings_path: str):
        """Initialize aggregator with file paths."""
    
    def aggregate(self) -> List[Dict]:
        """
        Aggregate reflections into pattern candidates.
        
        Returns:
            patterns: List of new pattern candidates
        """
    
    def _group_similar_issues(self, issues: List[Dict]) -> List[List[Dict]]:
        """Group issues by keyword similarity using Jaccard index."""
    
    def _extract_keywords(self, issue: Dict) -> Set[str]:
        """Extract meaningful keywords from issue text."""
    
    def _jaccard_similarity(self, set1: Set[str], set2: Set[str]) -> float:
        """Calculate Jaccard similarity coefficient."""
    
    def _create_pattern(self, group: List[Dict]) -> Dict:
        """Create pattern candidate from issue group."""
    
    def _calculate_severity(self, group: List[Dict]) -> str:
        """Determine severity based on issue priority categories."""
    
    def _append_patterns(self, patterns: List[Dict]):
        """Append pattern candidates to global-learnings.yaml."""
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Iteration Completes                       │
│                     (Validation PASS)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  orchestrator_reflection()  │
         │  (Merge learnings.yaml)     │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  2l-reflection-generator.py │
         │                             │
         │  Reads:                     │
         │  - iteration/learnings.yaml │
         │  - iteration/validation     │
         │  - .2L/events.jsonl         │
         │                             │
         │  Extracts:                  │
         │  - Framework issues         │
         │  - Priority categories      │
         │                             │
         │  Writes:                    │
         │  - REFLECTION.md            │
         │  - global-learnings.jsonl   │
         │    (append)                 │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  global-learnings.jsonl     │
         │  (Accumulated reflections)  │
         └─────────────┬───────────────┘
                       │
                       │ (Later, manual trigger)
                       ▼
         ┌─────────────────────────────┐
         │ 2l-reflection-aggregator.py │
         │                             │
         │  Reads:                     │
         │  - global-learnings.jsonl   │
         │  - global-learnings.yaml    │
         │                             │
         │  Groups:                    │
         │  - Similar issues (Jaccard) │
         │  - Threshold: 0.8           │
         │                             │
         │  Creates:                   │
         │  - Pattern candidates       │
         │                             │
         │  Writes:                    │
         │  - global-learnings.yaml    │
         │    (append patterns)        │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   global-learnings.yaml     │
         │   (Pattern candidates)      │
         │                             │
         │   status: IDENTIFIED        │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │       /2l-improve           │
         │   (Detects new patterns)    │
         └─────────────────────────────┘
```

---

## Testing Approach Details

### Unit Testing: Reflection Generator

**Test 1: Framework Issue Detection**
```bash
# Create mock learnings with framework issue
cat > /tmp/test-learnings.yaml << 'EOF'
learnings:
- issue: "Explorer spawning timeout"
  root_cause: "Task tool synchronization missing"
  affected_files: ["commands/2l-improve.md"]
- issue: "Button color wrong"
  root_cause: "CSS not applied"
  affected_files: ["app/styles.css"]
