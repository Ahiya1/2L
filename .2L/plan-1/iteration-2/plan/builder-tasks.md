# Builder Task Breakdown

## Overview

1 primary builder will work on both MCP cleanup and honesty enhancement tracks in sequence or parallel (builder's choice). Both tracks are LOW-MEDIUM complexity with clear, surgical modifications to existing files.

Complexity is LOW-MEDIUM overall. Builder may choose to work sequentially or split into sub-builders if preferred for parallel execution.

---

## Builder-1: MCP Cleanup + Honesty Enhancement

### Scope

Modify 5 agent files in `~/.claude/agents/` to:
1. Remove all references to broken MCPs (GitHub MCP, Screenshot MCP)
2. Standardize MCP sections across all MCP-enabled agents with exactly 3 working MCPs
3. Add honesty framework to validator agents (5-tier status, confidence reporting, examples)
4. Update validation report templates with confidence fields
5. Add graceful MCP degradation guidance

### Complexity Estimate

**MEDIUM**

**Rationale:**
- 5 file modifications (not new files)
- Track A (MCP Cleanup): LOW complexity - straightforward deletions
- Track B (Honesty Enhancement): MEDIUM complexity - template additions, examples
- Total estimated time: 2-3 hours
- No complex logic or integration
- All changes are additive or deletion-only (no refactoring)

**Not HIGH because:** No new architecture, no code generation, no complex integrations
**Not LOW because:** 5 files, ~200 lines of changes, requires careful template design

### Success Criteria

- [ ] Zero references to "GitHub MCP" in any agent file (verified via grep)
- [ ] Zero references to "Screenshot MCP" in any agent file (verified via grep)
- [ ] Exactly 3 MCPs (Playwright, Chrome DevTools, Supabase) documented in all MCP sections
- [ ] MCP sections identical across 2l-validator.md, 2l-builder.md, 2l-healer.md, 2l-explorer.md
- [ ] 2l-validator.md includes "Reporting Standards: Honesty Over Optimism" section
- [ ] 2l-validator.md includes 5-tier status system in report template
- [ ] 2l-validator.md includes 80% confidence rule and decision tree
- [ ] 2l-validator.md includes 5+ examples of honest vs optimistic reporting
- [ ] 2l-ivalidator.md includes "Honesty in Cohesion Assessment" section
- [ ] 2l-ivalidator.md includes gray area handling with UNCERTAIN/PARTIAL/INCOMPLETE statuses
- [ ] Both validator report templates include confidence level fields
- [ ] Tripartite confidence assessment section in both validator templates
- [ ] All files maintain consistent Markdown formatting
- [ ] Grep verification confirms all success criteria

### Files to Create

**None.** All work is modifying existing files.

### Files to Modify

1. **~/.claude/agents/2l-explorer.md** (221 lines → ~214 lines)
   - Remove GitHub MCP section (lines 44-50, approximately)
   - Verify no other GitHub MCP references

2. **~/.claude/agents/2l-validator.md** (602 lines → ~694 lines)
   - Remove Screenshot MCP section (lines 39-43, 217-220, approximately)
   - Add standardized 3-MCP section (replace old MCP section)
   - Add "Reporting Standards: Honesty Over Optimism" section (~60 lines)
   - Add 80% confidence rule and decision tree (~40 lines)
   - Add 5 examples of honest vs optimistic reporting (~80 lines)
   - Update report template with 5-tier status system
   - Add confidence level fields to report template
   - Add tripartite confidence assessment section

3. **~/.claude/agents/2l-builder.md** (476 lines → ~469 lines)
   - Remove Screenshot MCP section (lines 89-95, approximately)
   - Add standardized 3-MCP section (replace old MCP section)

4. **~/.claude/agents/2l-healer.md** (433 lines → ~427 lines)
   - Remove Screenshot MCP section (lines 35-40, approximately)
   - Add standardized 3-MCP section (replace old MCP section)

5. **~/.claude/agents/2l-ivalidator.md** (717 lines → ~797 lines)
   - Add "Honesty in Cohesion Assessment" section (~30 lines)
   - Update "When in Doubt" section with UNCERTAIN/PARTIAL/INCOMPLETE guidance (~30 lines)
   - Add gray area examples (~40 lines)
   - Update report template with confidence fields
   - Add tripartite confidence assessment section to template

### Dependencies

**Depends on:** None - standalone modifications

**Blocks:** None - no downstream dependencies

**Shared conventions:**
- MCP section template (must be identical across 4 files)
- Status terminology (must align across both validators)
- Confidence framework (must be consistent)

### Implementation Notes

#### Track A: MCP Cleanup (Estimated 45 minutes)

**Priority 1 - Remove Broken MCPs:**

1. **2l-explorer.md:** Remove GitHub MCP section
   - Search for "GitHub MCP" (case insensitive)
   - Delete entire section (typically 6-8 lines)
   - Verify no other references with grep

2. **2l-validator.md:** Remove Screenshot MCP section
   - Search for "Screenshot MCP" (case insensitive)
   - Delete all occurrences (typically 2 sections: declaration + usage example)
   - Verify removal with grep

3. **2l-builder.md:** Remove Screenshot MCP section
   - Search for "Screenshot MCP" (case insensitive)
   - Delete section (typically 6-8 lines)
   - Verify removal with grep

4. **2l-healer.md:** Remove Screenshot MCP section
   - Search for "Screenshot MCP" (case insensitive)
   - Delete section (typically 6-8 lines)
   - Verify removal with grep

**Priority 2 - Standardize Working MCPs:**

5. Use the standardized MCP section from `patterns.md`
6. Replace existing MCP sections in all 4 files with identical template
7. Verify all 4 files have identical MCP sections (use diff command)

**Verification commands:**
```bash
# Must return nothing (zero broken MCP references)
grep -ri "GitHub MCP\|Screenshot MCP" ~/.claude/agents/

# Must return same count for all 4 files
grep -c "Playwright MCP" ~/.claude/agents/2l-*.md
grep -c "Chrome DevTools MCP" ~/.claude/agents/2l-*.md
grep -c "Supabase Local MCP" ~/.claude/agents/2l-*.md
```

#### Track B: Honesty Enhancement (Estimated 1.5-2 hours)

**Priority 1 - 2l-validator.md Enhancements:**

1. **Add "Reporting Standards: Honesty Over Optimism" section**
   - Insert after "Your Mission" section, before "Your Process"
   - Include 80% confidence rule prominently
   - Explain principle: "Better to report false incompletion than false completion"
   - ~60 lines total

2. **Add Decision Framework section**
   - 3-step decision tree for status selection
   - Confidence calculation guidance
   - Example calculation showing weighted approach
   - ~40 lines total

3. **Add Examples section**
   - Example 1: Tests pass but coverage uncertain → UNCERTAIN
   - Example 2: MCP unavailable → INCOMPLETE
   - Example 3: Partial success criteria → PARTIAL
   - Example 4: Clear failures → FAIL
   - Example 5: High confidence → PASS
   - Each example shows optimistic (wrong) and honest (right) report
   - ~80 lines total (5 examples × ~16 lines each)

4. **Update report template**
   - Change status line from "PASS / FAIL" to "PASS | UNCERTAIN | PARTIAL | INCOMPLETE | FAIL"
   - Add "Confidence Level: {HIGH|MEDIUM|LOW} ({percentage}%)" field
   - Add "Confidence Rationale:" field (2-3 sentences)
   - Add tripartite confidence assessment section:
     - "What We Know (High Confidence)"
     - "What We're Uncertain About (Medium Confidence)"
     - "What We Couldn't Verify (Low/No Confidence)"
   - Add confidence field to each check template
   - ~20 lines of template modifications

**Priority 2 - 2l-ivalidator.md Enhancements:**

1. **Add "Honesty in Cohesion Assessment" section**
   - Place after mission statement, before process
   - Explain gray areas in integration validation
   - ~30 lines total

2. **Update "When in Doubt" section**
   - Replace binary PASS/FAIL guidance with 5-tier status guidance
   - Add "Report UNCERTAIN if:" scenarios
   - Add "Report PARTIAL if:" scenarios
   - Add "Report INCOMPLETE if:" scenarios
   - Keep "Report FAIL only if:" scenarios
   - ~30 lines total

3. **Add Gray Area Examples**
   - Example 1: Possible duplication vs domain separation → UNCERTAIN
   - Example 2: Inconsistent patterns (functional but inconsistent) → PARTIAL
   - Show honest assessment vs optimistic assessment
   - ~40 lines total

4. **Update report template**
   - Add confidence level field
   - Add tripartite confidence assessment section
   - Add uncertainty flags to cohesion checks
   - ~15 lines of template modifications

**Content sources:**
- MCP section template: Copy from `patterns.md` "MCP Section Pattern"
- Decision tree: Copy from `patterns.md` "Honesty Decision Framework Pattern"
- Examples: Copy from `patterns.md` "Honest vs Optimistic Reporting Pattern"
- Gray area guidance: Copy from `patterns.md` "Ivalidator Honesty Pattern"

### Patterns to Follow

Reference patterns from `patterns.md`:

**For all files:**
- **MCP Section Pattern** - Standardized 3-MCP template
- **File Modification Pattern** - Template-based edit approach
- **Grep Verification Patterns** - Verification commands

**For 2l-validator.md:**
- **Validation Status Pattern** - 5-tier status system
- **Confidence Assessment Pattern** - Overall confidence reporting
- **Tripartite Confidence Pattern** - Known vs Uncertain vs Unverifiable
- **Per-Check Confidence Pattern** - Individual check confidence
- **Honesty Decision Framework Pattern** - Status selection decision tree
- **Honest vs Optimistic Reporting Pattern** - 5 examples

**For 2l-ivalidator.md:**
- **Ivalidator Honesty Pattern** - Gray area handling

**Formatting:**
- Maintain consistent Markdown formatting
- Use `##` for major sections, `###` for subsections
- Use emoji markers: ✅ ⚠️ ❌
- Code blocks with triple backticks and language specifiers
- Bold for emphasis: `**Important**`

### Testing Requirements

**Automated verification (via grep):**
- [ ] No "GitHub MCP" references (exit code 1 = success)
- [ ] No "Screenshot MCP" references (exit code 1 = success)
- [ ] "Playwright MCP" present in 4 files (same count in each)
- [ ] "Chrome DevTools MCP" present in 4 files (same count in each)
- [ ] "Supabase Local MCP" present in 4 files (same count in each)
- [ ] "UNCERTAIN" status in 2l-validator.md
- [ ] "PARTIAL" status in 2l-validator.md
- [ ] "INCOMPLETE" status in 2l-validator.md
- [ ] "Honesty Over Optimism" section in 2l-validator.md
- [ ] "80% confidence" rule in 2l-validator.md
- [ ] "Honesty in Cohesion Assessment" in 2l-ivalidator.md

**Manual verification:**
- [ ] MCP sections identical across 4 files (use diff)
- [ ] All examples include both optimistic and honest reports
- [ ] Decision tree is clear and actionable
- [ ] Report templates well-formatted
- [ ] No accidental content deletions
- [ ] Line counts match estimates (±10%)
- [ ] Markdown formatting consistent

**Integration test:**
- [ ] Run 2l validator on test project
- [ ] Verify validator uses appropriate status
- [ ] Confirm report includes confidence assessment
- [ ] Check orchestration can still parse status

**Coverage target:** 100% of success criteria met

### Potential Split Strategy

If complexity proves too high, consider splitting into:

**Foundation (Builder-1 does first):**
- Backup all agent files
- Create standardized MCP section template (verify once, use everywhere)
- Set up verification script with all grep commands

**Sub-builder 1A: MCP Cleanup Specialist**
- **Scope:** Track A only (MCP cleanup)
- **Files:** 2l-explorer.md, 2l-validator.md, 2l-builder.md, 2l-healer.md
- **Tasks:**
  - Remove broken MCP references
  - Insert standardized MCP section
  - Verify with grep
- **Estimate:** 45 minutes
- **Complexity:** LOW

**Sub-builder 1B: Validator Honesty Specialist**
- **Scope:** Track B only (honesty enhancement)
- **Files:** 2l-validator.md, 2l-ivalidator.md
- **Tasks:**
  - Add honesty framework sections
  - Add examples and decision trees
  - Update report templates
  - Verify with grep and manual review
- **Estimate:** 1.5-2 hours
- **Complexity:** MEDIUM

**Integration notes if split:**
- Both sub-builders modify 2l-validator.md - COORDINATE to avoid conflicts
- Sub-builder 1A does MCP section of 2l-validator.md first
- Sub-builder 1B does honesty sections of 2l-validator.md after
- Or: Sub-builder 1A skips 2l-validator.md MCP section, 1B does all validator changes
- Recommended: 1A does all 4 MCP files completely, 1B does both validator files completely (cleaner separation)

**When to split:**
- If builder estimates >3 hours total time
- If builder prefers parallel execution over sequential
- If builder wants to minimize risk by separating concerns

**When NOT to split:**
- If builder is comfortable with 2-3 hour sequential task
- To avoid coordination overhead on 2l-validator.md
- Single builder has clearer ownership and context

---

## Builder Execution Order

### Single Builder Approach (Recommended)

**Builder-1 executes both tracks sequentially:**

1. **Track A: MCP Cleanup** (45 minutes)
   - Modify all 4 files (explorer, validator, builder, healer)
   - Verify with grep

2. **Track B: Honesty Enhancement** (1.5-2 hours)
   - Modify both validator files
   - Verify with grep and manual review

3. **Final Verification** (15 minutes)
   - Run all verification commands
   - Manual review of all changes
   - Integration test with real validation

**Total time:** 2.5-3.5 hours

### Split Builder Approach (Alternative)

**Parallel execution if split:**

**Group 1 (No dependencies, can run in parallel):**
- Sub-builder 1A: MCP Cleanup (4 files)
- Sub-builder 1B: Honesty Enhancement (2 files)

**Coordination:** 2l-validator.md touched by both
- **Option 1:** 1A skips 2l-validator.md, 1B does all validator changes (RECOMMENDED)
- **Option 2:** 1A does MCP section only, 1B does honesty sections, integrate after
- **Option 3:** Sequential execution (1A finishes, then 1B starts)

**Integration Notes:**
- If parallel: Use separate branches, merge carefully
- If sequential: Cleaner, no merge conflicts
- Final verification covers both tracks together

### Verification Phase

**After all modifications complete:**

```bash
# Run comprehensive verification script
cd ~/.claude/agents/

# 1. Verify no broken MCPs
echo "=== Checking for broken MCP references ==="
grep -ri "GitHub MCP\|Screenshot MCP" . && echo "❌ FAIL: Broken MCPs found" || echo "✅ PASS: No broken MCPs"

# 2. Verify working MCPs present
echo "=== Checking for working MCP consistency ==="
PLAYWRIGHT_COUNT=$(grep -c "Playwright MCP" 2l-*.md | cut -d: -f2 | sort -u | wc -l)
DEVTOOLS_COUNT=$(grep -c "Chrome DevTools MCP" 2l-*.md | cut -d: -f2 | sort -u | wc -l)
SUPABASE_COUNT=$(grep -c "Supabase Local MCP" 2l-*.md | cut -d: -f2 | sort -u | wc -l)

if [ "$PLAYWRIGHT_COUNT" -eq 1 ] && [ "$DEVTOOLS_COUNT" -eq 1 ] && [ "$SUPABASE_COUNT" -eq 1 ]; then
  echo "✅ PASS: Working MCPs consistent across files"
else
  echo "❌ FAIL: Working MCP counts inconsistent"
fi

# 3. Verify MCP sections identical
echo "=== Checking MCP section consistency ==="
grep -A 100 "Available MCP Servers" 2l-validator.md > /tmp/mcp-validator.txt
grep -A 100 "Available MCP Servers" 2l-builder.md > /tmp/mcp-builder.txt
grep -A 100 "Available MCP Servers" 2l-healer.md > /tmp/mcp-healer.txt

diff /tmp/mcp-validator.txt /tmp/mcp-builder.txt && echo "✅ Validator-Builder identical"
diff /tmp/mcp-builder.txt /tmp/mcp-healer.txt && echo "✅ Builder-Healer identical"

# 4. Verify honesty framework added
echo "=== Checking honesty framework ==="
grep -q "Honesty Over Optimism" 2l-validator.md && echo "✅ Validator honesty section present"
grep -q "UNCERTAIN" 2l-validator.md && echo "✅ UNCERTAIN status added"
grep -q "80% confidence" 2l-validator.md && echo "✅ 80% rule present"
grep -q "Honesty in Cohesion Assessment" 2l-ivalidator.md && echo "✅ Ivalidator honesty section present"

# 5. Verify examples added
VALIDATOR_EXAMPLES=$(grep -c "Example [0-9]:" 2l-validator.md)
if [ "$VALIDATOR_EXAMPLES" -ge 5 ]; then
  echo "✅ PASS: At least 5 examples in validator ($VALIDATOR_EXAMPLES found)"
else
  echo "❌ FAIL: Less than 5 examples in validator ($VALIDATOR_EXAMPLES found)"
fi

echo "=== Verification complete ==="
```

**Manual review checklist:**
- [ ] Read each modified file completely
- [ ] Verify formatting is consistent
- [ ] Check examples are clear and realistic
- [ ] Confirm no accidental deletions
- [ ] Verify line counts within ±10% of estimates
- [ ] Test validation report template is well-structured

**Integration test:**
- [ ] Run `/2l-mvp` on test project (this 2L repo iteration)
- [ ] Observe validator using new prompts
- [ ] Verify validation report includes confidence fields
- [ ] Confirm no MCP errors occur
- [ ] Check orchestration continues to work

---

## Post-Completion Checklist

### Deployment Readiness

- [ ] All success criteria met
- [ ] Verification script passes 100%
- [ ] Manual review complete
- [ ] Integration test successful
- [ ] Backup of original files created
- [ ] Deployment script prepared

### Documentation

- [ ] Note any deviations from plan in builder report
- [ ] Document actual time spent vs estimates
- [ ] List any challenges encountered
- [ ] Provide recommendations for future iterations

### Handoff to Deployment

- [ ] Modified files in build directory ready for deployment
- [ ] Verification script included for post-deployment checks
- [ ] Rollback plan documented
- [ ] Success indicators clearly defined

---

**Builder Task Breakdown Complete** - Ready for building phase execution! 🎯
