# Explorer 1 Report: Architecture & Structure

## Executive Summary

Analysis of Features 2 (MCP Cleanup) and 4 (Honesty in Validation) from vision.md reveals a **structural cleanup and standardization effort** affecting 10 agent files across ~/.claude/agents/. The broken GitHub and Screenshot MCPs need complete removal (42 total references), while validation report templates require honesty-focused enhancements. This is a MEDIUM complexity iteration requiring systematic file modifications with a clear before/after architecture.

---

## Discoveries

### Current MCP Reference Architecture

**Files with MCP sections (6 agent files):**
- `2l-validator.md` - Lists 4 MCPs (Screenshot MCP broken on Linux)
- `2l-builder.md` - Lists 4 MCPs (Screenshot MCP broken on Linux)
- `2l-healer.md` - Lists 4 MCPs (Screenshot MCP broken on Linux)
- `2l-explorer.md` - Lists 2 MCPs (GitHub MCP auth broken)
- `2l-planner.md` - No MCP section (only file operations)
- `2l-master-explorer.md` - No MCP references

**Broken MCPs:**
- GitHub MCP: Referenced in `2l-explorer.md` (lines 44-50) - Authentication failure
- Screenshot MCP: Referenced in 3 files - Platform incompatible (Linux)
  - `2l-validator.md` (lines 39-43, 217-220)
  - `2l-builder.md` (lines 89-95)
  - `2l-healer.md` (lines 35-40)

**Working MCPs (to keep):**
- Playwright MCP - E2E testing, browser automation
- Chrome DevTools MCP - Performance profiling, debugging
- Supabase Local MCP - Database validation (PostgreSQL on port 5432)

### Validation Report Template Structure

**Current status options in reports:**
- `2l-validator.md`: PASS / FAIL (binary, line 254)
- `2l-ivalidator.md`: PASS / FAIL (binary, line 319)
- `2l-healer.md`: SUCCESS / PARTIAL / FAILED (has nuance, line 152)
- `2l-builder.md`: COMPLETE / SPLIT (different context, line 204)
- `2l-integrator.md`: SUCCESS / PARTIAL / FAILED (has nuance, line 164)

**Gap identified:** Validator agents use binary PASS/FAIL without uncertainty tracking, while healer/integrator agents already have PARTIAL status. Inconsistent honesty framework.

### File Modification Map

**Files requiring MCP cleanup (4 files):**
1. `/home/ahiya/.claude/agents/2l-validator.md` - Remove Screenshot MCP section
2. `/home/ahiya/.claude/agents/2l-builder.md` - Remove Screenshot MCP section
3. `/home/ahiya/.claude/agents/2l-healer.md` - Remove Screenshot MCP section
4. `/home/ahiya/.claude/agents/2l-explorer.md` - Remove GitHub MCP section

**Files requiring honesty enhancement (2 files):**
1. `/home/ahiya/.claude/agents/2l-validator.md` - Add UNCERTAIN/PARTIAL statuses, confidence levels
2. `/home/ahiya/.claude/agents/2l-ivalidator.md` - Add gray area guidance, uncertainty flags

**No changes needed (5 files):**
- `2l-planner.md` - No MCP references
- `2l-master-explorer.md` - No MCP references
- `2l-integrator.md` - Already has nuanced status system
- `2l-iplanner.md` - No validation output
- `2l-dashboard-builder.md` - Different context

---

## Patterns Identified

### Pattern 1: MCP Section Standardization

**Description:** All agent files with MCP access have a dedicated "Available MCP Servers" section near the top of the file (after mission statement, before process).

**Current structure:**
```markdown
# Available MCP Servers

## 1. {MCP Name} ({Purpose})
**Use for:** {Use cases}
**Capabilities:**
- Bullet list of capabilities
- Examples of usage

## 2. {Next MCP}
[Same structure]
```

**Use Case:** Builders, validators, healers, explorers need to know which MCPs are available for their work.

**Recommendation:** Standardize all agent files to exactly 3 MCPs with identical descriptions for consistency.

### Pattern 2: Validation Report Status Hierarchy

**Description:** Multi-tier status system that captures uncertainty.

**Current best practice (from healer/integrator):**
- SUCCESS - Complete with confidence
- PARTIAL - Some issues remain or uncertainty exists
- FAILED - Clear failure

**Use Case:** Validation reports that acknowledge limitations honestly.

**Recommendation:** Extend validator agents with:
- PASS - High confidence, all checks passed (80%+ confidence)
- UNCERTAIN - Medium confidence, some doubts (50-79% confidence)
- PARTIAL - Some checks passed, others incomplete (mixed results)
- INCOMPLETE - Cannot complete certain checks (blocked/insufficient info)
- FAIL - Clear failures identified

### Pattern 3: Optional MCP Guidance

**Description:** Instructions for graceful degradation when MCPs unavailable.

**Example from vision.md:**
> "Add 'optional, skip gracefully if unavailable' guidance"

**Use Case:** Validators shouldn't fail just because an MCP is temporarily unavailable.

**Recommendation:** Add guidance section in validator agents:
```markdown
## MCP Availability Notes

All MCP-based validations are **optional enhancements**. If an MCP is unavailable:
- Document in validation report under "Limitations"
- Mark affected checks as INCOMPLETE
- Do NOT fail validation solely due to MCP unavailability
- Continue with all non-MCP checks
```

---

## Complexity Assessment

### High Complexity Areas

**None identified** - This is a cleanup and enhancement effort, not new feature development.

### Medium Complexity Areas

**1. Validation Report Template Enhancement (2l-validator.md)**
- Complexity: MEDIUM
- Reason: Multiple template sections need status option expansion
- Lines affected: ~15-20 modifications across report template
- New sections to add:
  - "Reporting Standards: Honesty Over Optimism" section
  - "Confidence Level" field in each check
  - Updated status options (5 levels instead of 2)
  - Decision framework examples

**2. Ivalidation Report Enhancement (2l-ivalidator.md)**
- Complexity: MEDIUM
- Reason: Gray area handling guidance + uncertainty flags
- Lines affected: ~10-15 modifications
- New sections:
  - "Honesty in Cohesion Assessment" guidance
  - Evidence sufficiency thresholds
  - Examples of honest vs optimistic assessment

### Low Complexity Areas

**1. MCP Section Removal (4 files)**
- Complexity: LOW
- Reason: Straightforward deletion of specific sections
- `2l-explorer.md`: Remove lines 44-50 (GitHub MCP section)
- `2l-validator.md`: Remove lines 39-43, 217-220 (Screenshot MCP)
- `2l-builder.md`: Remove lines 89-95 (Screenshot MCP)
- `2l-healer.md`: Remove lines 35-40 (Screenshot MCP)

**2. MCP Section Standardization (4 files)**
- Complexity: LOW
- Reason: Ensure remaining 3 MCPs have identical descriptions
- Verify consistency across all 4 files
- Update any outdated capability descriptions

---

## Technology Recommendations

### Primary Stack

**No technology decisions needed** - This is a documentation/prompt engineering effort modifying Markdown files.

### Tools Required

- **File Editor** - Edit tool for precise line modifications
- **Grep/Search** - Verify all MCP references found
- **Version Control** - Git for tracking changes to ~/.claude/ files

---

## Integration Points

### Internal Integrations

**Agent File Consistency:**
- All 4 MCP-enabled agents must have identical MCP sections
- Validator agents must use same status hierarchy
- Report templates must follow same confidence framework

**Cross-File References:**
- No cross-references between agent files for this iteration
- Each agent operates independently with own prompt

**Shared Conventions:**
- MCP descriptions must match exactly
- Status terminology must align
- Confidence thresholds must be consistent (80% rule)

### External Dependencies

**None** - Changes are isolated to agent prompt files.

---

## Risks & Challenges

### Technical Risks

**Risk 1: Incomplete MCP Reference Removal**
- Impact: Users still see broken MCP references, causing confusion
- Mitigation: Use grep to find ALL occurrences, not just obvious sections
- Recommended search patterns:
  - `GitHub MCP`
  - `Screenshot MCP`
  - `github.com/` (in context of MCP)
  - `screenshot` (case insensitive in MCP context)

**Risk 2: Status Option Proliferation**
- Impact: Too many status options = validator confusion about which to use
- Mitigation: Clear decision tree in validator guidance
- Include examples of each status in context

### Complexity Risks

**Risk: Over-engineering Honesty Framework**
- Likelihood: LOW
- Impact: Validators spend too much time on confidence assessment
- Mitigation: Keep confidence levels simple (3 tiers: High 80%+, Medium 50-79%, Low <50%)

---

## Recommendations for Planner

1. **Approach this as 2 parallel tracks:**
   - Track A: MCP Cleanup (4 files, straightforward deletions)
   - Track B: Honesty Enhancement (2 files, template additions)
   - Both tracks can proceed simultaneously, no dependencies

2. **Use Edit tool, not Write:**
   - Files are 400-700 lines each
   - Surgical edits preserve existing content
   - Edit tool allows precise line-range modifications

3. **Create standardized MCP section template:**
   - Define ONCE in planner output
   - Builders copy exact template to all 4 files
   - Ensures consistency without divergence

4. **Include before/after validation:**
   - Builder verifies MCP section line counts match
   - Grep confirms zero broken MCP references
   - Report template includes all new status options

5. **Target completion in single builder:**
   - Total: 6 file modifications
   - Estimated time: 2-3 hours
   - No need for sub-builders (not complex enough)

---

## Resource Map

### Critical Files/Directories

**Input files (6 agent files to modify):**
- `/home/ahiya/.claude/agents/2l-validator.md` (602 lines)
- `/home/ahiya/.claude/agents/2l-ivalidator.md` (717 lines)
- `/home/ahiya/.claude/agents/2l-builder.md` (476 lines)
- `/home/ahiya/.claude/agents/2l-healer.md` (433 lines)
- `/home/ahiya/.claude/agents/2l-explorer.md` (221 lines)
- `/home/ahiya/.claude/agents/2l-planner.md` (484 lines, verify no changes needed)

**Reference file (vision):**
- `/home/ahiya/Ahiya/2L/.2L/plan-1/vision.md` (365 lines)

**Output location:**
- Same files (in-place edits)
- Backup recommended before changes

### Key Line Numbers for Modifications

**2l-explorer.md:**
- Remove lines 44-50: GitHub MCP section

**2l-validator.md:**
- Remove lines 39-43: Screenshot MCP declaration
- Remove lines 217-220: Screenshot MCP usage example
- Add after line 491: New "Reporting Standards" section (~50 lines)
- Update line 254: Add UNCERTAIN/PARTIAL/INCOMPLETE to status options
- Update lines 262-347: Add confidence level to each check template

**2l-builder.md:**
- Remove lines 89-95: Screenshot MCP section

**2l-healer.md:**
- Remove lines 35-40: Screenshot MCP section

**2l-ivalidator.md:**
- Add after line 653: New "Honesty in Cohesion Assessment" section (~40 lines)
- Update line 319: Add uncertainty flags to status options
- Add examples of gray area handling to various check sections

### Testing Infrastructure

**Validation approach:**
1. Grep all agent files for broken MCP references
2. Verify MCP sections are identical across 4 files
3. Check all report templates include new status options
4. Manually review each file for consistency

**Test commands:**
```bash
# Verify no broken MCP references
grep -r "GitHub MCP\|Screenshot MCP" ~/.claude/agents/

# Verify 3 working MCPs mentioned consistently
grep -c "Playwright MCP" ~/.claude/agents/*.md
grep -c "Chrome DevTools MCP" ~/.claude/agents/*.md
grep -c "Supabase Local MCP" ~/.claude/agents/*.md

# Verify new status options in validators
grep "UNCERTAIN\|PARTIAL\|INCOMPLETE" ~/.claude/agents/2l-validator.md
grep "UNCERTAIN\|PARTIAL\|INCOMPLETE" ~/.claude/agents/2l-ivalidator.md
```

---

## Questions for Planner

1. **MCP Section Placement:** Should standardized MCP section be exactly the same across all 4 files, or can we tailor examples to each agent's context while keeping capabilities identical?

2. **Status Option Ordering:** In report templates, should status options be ordered by severity (PASS → UNCERTAIN → PARTIAL → INCOMPLETE → FAIL) or by frequency of use?

3. **Confidence Threshold:** Vision suggests 80% confidence rule. Should this be a hard rule or guideline? What if validator is 79% confident - is that UNCERTAIN or can it be PASS with caveat?

4. **Backward Compatibility:** Should we maintain old PASS/FAIL binary status as an option, or force all validators to use new 5-tier system? (Old validation reports might expect binary.)

5. **Gray Area Examples:** How many examples should be included in honesty guidance? Vision doesn't specify - recommend 3-5 per agent sufficient?

---

## Architecture Summary

### Before State
- 6 agent files with varying MCP references
- 2 broken MCPs causing confusion (GitHub, Screenshot)
- Binary PASS/FAIL validation status
- No uncertainty tracking framework
- Inconsistent MCP section structure

### After State
- 4 agent files with standardized 3-MCP sections
- Only working MCPs documented (Playwright, Chrome DevTools, Supabase)
- 5-tier validation status (PASS/UNCERTAIN/PARTIAL/INCOMPLETE/FAIL)
- Confidence-based reporting framework (80% rule)
- Consistent MCP documentation across all agents
- Graceful degradation guidance when MCPs unavailable
- Gray area handling framework for ambiguous cases

### Affected Components
- **Agent Prompts (6 files):** Documentation changes only
- **MCP Integration:** No code changes, just documentation removal
- **Validation Reports:** Template structure enhanced
- **User Experience:** Clearer error messaging, honest status reporting

### File Change Summary
| File | MCP Cleanup | Honesty Enhancement | Total Lines Changed |
|------|-------------|---------------------|---------------------|
| 2l-validator.md | Remove 8 lines | Add ~100 lines | ~108 lines |
| 2l-ivalidator.md | None | Add ~80 lines | ~80 lines |
| 2l-builder.md | Remove 7 lines | None | ~7 lines |
| 2l-healer.md | Remove 6 lines | None | ~6 lines |
| 2l-explorer.md | Remove 7 lines | None | ~7 lines |
| 2l-planner.md | None | None | 0 lines |
| **TOTAL** | **28 lines removed** | **180 lines added** | **~208 lines** |

---

**Exploration completed:** 2025-10-03
**Recommendation:** Single builder can handle both tracks (MCP cleanup + honesty enhancement) in 2-3 hours.
