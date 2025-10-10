# Technology Stack

## Core Approach

**Decision:** Template-based in-place file modification (not code generation)

**Rationale:**
- This is a documentation/prompt engineering effort, not software development
- Modifying existing Markdown files in `~/.claude/agents/` directory
- No programming languages, frameworks, or libraries involved
- Surgical edits preserve existing agent logic and validation processes
- Lowest-risk approach for enhancing critical system components

**Alternatives Considered:**
- **Complete agent rewrite:** Rejected - too risky, could break existing validation logic
- **External configuration files:** Rejected - agents need guidance in-prompt during execution
- **Automated prompt generation:** Rejected - manual curation ensures quality and consistency

## File Format

**Decision:** Markdown (.md) for all agent prompts

**Rationale:**
- Existing format used by all 2L agent files
- Human-readable and easy to edit
- Supports structured sections, code blocks, examples
- No parser dependencies (agents read as text)

**Schema Strategy:**
```markdown
# Agent Name

## Your Mission
[Core purpose]

## Available MCP Servers (if applicable)
[Standardized 3-MCP section]

## Reporting Standards: Honesty Over Optimism (validators only)
[New section for honest validation guidance]

## Your Process
[Step-by-step workflow]

## Report Template
[Structured output format with confidence fields]

## Examples (validators only)
[Concrete scenarios showing honest vs optimistic reporting]
```

## MCP Integration

**Decision:** Document only 3 verified working MCPs

**Working MCPs:**
1. **Playwright MCP** - E2E testing, browser automation
2. **Chrome DevTools MCP** - Performance profiling, debugging
3. **Supabase Local MCP** - Database validation (PostgreSQL on port 5432)

**Removed MCPs:**
- ❌ GitHub MCP - Authentication broken, causes validation failures
- ❌ Screenshot MCP - Platform incompatible (Linux), not functional

**Rationale:**
- Only document MCPs that validators can reliably use
- Broken MCPs cause confusing errors and force workarounds
- 3 working MCPs cover all critical validation needs (E2E, performance, database)
- Standardized MCP section across all agents prevents inconsistency

**Implementation Notes:**
- MCP sections must be identical across all 4 MCP-enabled agents
- Each MCP includes: name, purpose, use cases, capabilities
- Add graceful degradation guidance: "Skip gracefully if MCP unavailable"
- MCPs are optional enhancements, not hard requirements

## Validation Status Model

**Decision:** 5-tier status system for validation reports

**Status Types:**
- ✅ **PASS** - High confidence (>80%), all checks passed, deployment-ready
- ⚠️ **UNCERTAIN** - Medium confidence (60-80%), checks passed but doubts about completeness
- ⚠️ **PARTIAL** - Some checks passed, others incomplete, progress made but not deployment-ready
- ⚠️ **INCOMPLETE** - Cannot complete validation due to missing dependencies/tools/information
- ❌ **FAIL** - Clear failures identified, definitive blocking issues

**Rationale:**
- Binary PASS/FAIL forces validators into false confidence or false caution
- 5-tier system provides vocabulary for uncertainty and partial progress
- UNCERTAIN captures "tests pass but coverage unclear" scenarios
- PARTIAL shows incremental progress (10 of 12 criteria met)
- INCOMPLETE distinguishes inability from failure (MCP unavailable vs code broken)
- Aligns with existing PARTIAL status in healers/integrators (consistency)

**Alternatives Considered:**
- **Binary PASS/FAIL:** Rejected - current state, lacks nuance
- **3-tier (PASS/WARNING/FAIL):** Rejected - insufficient granularity (UNCERTAIN vs PARTIAL vs INCOMPLETE need distinction)
- **Continuous confidence score only:** Rejected - users need categorical labels, not just percentages

## Confidence Framework

**Decision:** 80% confidence rule with tripartite reporting

**80% Confidence Rule:**
```
If confidence in PASS assessment < 80% → report as UNCERTAIN or PARTIAL
```

**Confidence Levels:**
- **HIGH** (80-100%) - Comprehensive validation, no significant gaps
- **MEDIUM** (60-79%) - Validation complete but with caveats or limited coverage
- **LOW** (<60%) - Insufficient validation, significant uncertainty

**Tripartite Reporting Structure:**
```markdown
## Confidence Assessment

### What We Know (High Confidence)
- [Checks that were comprehensive and definitive]

### What We're Uncertain About (Medium Confidence)
- [Checks that passed but have caveats]

### What We Couldn't Verify (Low/No Confidence)
- [Checks that were skipped or blocked]
```

**Rationale:**
- 80% threshold is concrete, objective decision point
- Tripartite structure makes uncertainty explicit and actionable
- Separates verified (high conf) from uncertain (medium conf) from unknown (low conf)
- Users can make informed decisions based on what's verified vs uncertain

**Implementation:**
- Each validation report includes overall confidence level + percentage
- Each check includes per-check confidence (HIGH/MEDIUM/LOW)
- Confidence rationale explains why percentage/level was chosen
- Decision tree guides validators to correct status selection

## Development Tools

### File Editing
- **Tool:** Edit/Write functions (in-place modification)
- **Strategy:** Read existing file, modify specific sections, preserve rest
- **Target files:** 6 agent files in `~/.claude/agents/`

### Code Quality

**Verification Strategy:**
- **Grep search:** Confirm zero broken MCP references
  ```bash
  grep -ri "GitHub MCP\|Screenshot MCP" ~/.claude/agents/
  ```
- **MCP consistency:** Verify identical MCP sections across 4 files
  ```bash
  grep -A 20 "Available MCP Servers" ~/.claude/agents/2l-*.md | diff
  ```
- **Status presence:** Confirm new statuses in validator templates
  ```bash
  grep "UNCERTAIN\|PARTIAL\|INCOMPLETE" ~/.claude/agents/2l-validator.md
  ```
- **Manual review:** Check formatting, completeness, clarity

**Formatting Standards:**
- Markdown formatting consistent with existing agent files
- Code blocks use triple backticks with language specifiers
- Bullet lists use `-` (dash) for consistency
- Section headers use `##` for major sections, `###` for subsections
- Bold for emphasis: `**Important**`
- Emoji for visual clarity: ✅ ⚠️ ❌

### Testing

**Validation Approach:**
1. **Syntax validation:** Verify Markdown is well-formed
2. **Completeness check:** All required sections present
3. **Consistency check:** MCP sections identical across files
4. **Grep verification:** No broken MCP references remain
5. **Manual review:** Human review of examples and guidance
6. **Integration test:** Run validator on test project with new prompts

**Test Scenarios:**
- All checks pass, high confidence → Should report PASS
- Tests pass, MCP unavailable → Should report INCOMPLETE
- 10 of 12 criteria met → Should report PARTIAL
- Tests pass, coverage uncertain → Should report UNCERTAIN
- Clear failures detected → Should report FAIL

## Environment Variables

**None required.** This iteration modifies text files only, no runtime configuration needed.

## Dependencies Overview

**Zero external dependencies.**

**Existing dependencies (unchanged):**
- Bash 4.0+ - For orchestration scripts that read agent prompts
- Claude Code CLI - Executes agent prompts (no changes to execution environment)
- File system access - Read/write permissions to `~/.claude/` directory

**No new packages or libraries.**

## Performance Targets

Not applicable - this is a documentation update, not runtime code.

**Validation performance:**
- Grep verification: < 5 seconds
- Manual review: 15-20 minutes
- Integration test: 10-15 minutes (run full validation on test project)

## Security Considerations

**File integrity:**
- Backup existing agent files before modifications
- Use version control (git) to track changes
- Rollback plan available via timestamped backups

**No security risks identified:**
- Text-only file modifications
- No code execution changes
- No network access or external integrations
- No credentials or secrets involved

## File Modification Summary

| File | Current Lines | Changes | New Lines | Change Type |
|------|---------------|---------|-----------|-------------|
| 2l-explorer.md | 221 | Remove GitHub MCP | ~214 | Deletion |
| 2l-validator.md | 602 | Remove Screenshot + Add honesty | ~694 | Mixed |
| 2l-builder.md | 476 | Remove Screenshot | ~469 | Deletion |
| 2l-healer.md | 433 | Remove Screenshot | ~427 | Deletion |
| 2l-ivalidator.md | 717 | Add honesty | ~797 | Addition |
| 2l-planner.md | 484 | No changes | 484 | None |

**Total changes:** ~208 lines modified across 5 files (28 removed, 180 added)

## Deployment Target

**Environment:** Local development machine

**Target directory:** `~/.claude/agents/`

**Deployment method:** File copy with backup

**Verification:**
```bash
# Backup
cp -r ~/.claude/agents ~/.claude/agents.backup-$(date +%Y%m%d)

# Deploy
cp iteration-2/build/*.md ~/.claude/agents/

# Verify
grep -r "GitHub MCP\|Screenshot MCP" ~/.claude/agents/ || echo "MCP cleanup successful"
grep "UNCERTAIN" ~/.claude/agents/2l-validator.md && echo "Honesty framework added"
```

## Integration Architecture

**No runtime integration.** Modified files are read by existing orchestration:

```
Orchestration (2l-mvp.md)
    ↓ reads agent prompts
Agent Files (2l-validator.md, etc.)
    ↓ guides LLM behavior
Validator Execution
    ↓ generates
Validation Report (validation-report.md)
    ↓ parsed by
Orchestration (continues or heals)
```

**Changes impact agent behavior, not orchestration logic:**
- Orchestration reads enhanced prompts (no code changes needed)
- Validators use new guidance to generate reports
- Reports have new fields (backward compatible - old parsers ignore new fields)
- Orchestration may need updates in future iteration to fully leverage new statuses

## Backward Compatibility Strategy

**Approach:** Additive changes, no breaking modifications

**Compatibility guarantees:**
- Old validation reports still valid (new fields optional)
- Orchestration can still parse status line (PASS/FAIL still present in enum)
- UNCERTAIN/PARTIAL treated as "proceed with caution" (safe default)
- All existing validation checks preserved (no removals)
- MCP graceful degradation ensures validators don't fail on unavailable MCPs

**Migration path:** None needed - changes are in-place enhancements

---

**Technology Stack Complete** - Ready for pattern definition and task breakdown.
