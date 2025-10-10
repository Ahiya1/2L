# Code Patterns & Conventions

## File Structure

```
~/.claude/
├── agents/
│   ├── 2l-explorer.md          # Modified: Remove GitHub MCP
│   ├── 2l-validator.md         # Modified: Remove Screenshot MCP + Add honesty
│   ├── 2l-builder.md           # Modified: Remove Screenshot MCP
│   ├── 2l-healer.md            # Modified: Remove Screenshot MCP
│   ├── 2l-ivalidator.md        # Modified: Add honesty framework
│   ├── 2l-planner.md           # No changes
│   ├── 2l-master-explorer.md   # No changes
│   ├── 2l-integrator.md        # No changes
│   └── 2l-iplanner.md          # No changes
├── commands/
│   └── [No changes this iteration]
└── lib/
    └── [No changes this iteration]
```

## Naming Conventions

- **Agent files:** `2l-{role}.md` (lowercase, hyphen-separated)
- **Section headers:** Title Case (## Your Mission)
- **Status values:** SCREAMING_SNAKE_CASE (PASS, UNCERTAIN, FAIL)
- **Confidence levels:** SCREAMING_SNAKE_CASE (HIGH, MEDIUM, LOW)
- **MCP names:** Title Case (Playwright MCP, Chrome DevTools MCP)

## MCP Section Pattern

### Standardized MCP Section Template

**When to use:** All agent files with MCP access (validator, builder, healer, explorer)

**Code example:**

```markdown
# Available MCP Servers

You have access to 3 MCP servers for enhanced validation capabilities. **All MCPs are optional** - if unavailable, skip gracefully and document in your report.

## 1. Playwright MCP (E2E Testing & Browser Automation)

**Use for:**
- Running end-to-end tests on web applications
- Browser automation and user flow validation
- Testing UI interactions and navigation
- Validating multi-step user workflows

**Capabilities:**
- Launch browsers (Chromium, Firefox, WebKit)
- Navigate to URLs and interact with pages
- Fill forms, click buttons, verify page content
- Take screenshots and generate trace files
- Run accessibility audits

**Example usage:**
```typescript
// Playwright test execution via MCP
await playwright.goto('http://localhost:3000');
await playwright.fill('#email', 'test@example.com');
await playwright.click('button[type="submit"]');
await playwright.expect('.success-message').toBeVisible();
```

## 2. Chrome DevTools MCP (Performance Profiling & Debugging)

**Use for:**
- Performance profiling and bottleneck detection
- Memory leak analysis
- Network request inspection
- JavaScript debugging and console analysis

**Capabilities:**
- Capture performance profiles
- Analyze network waterfalls
- Inspect memory heap snapshots
- Monitor console logs and errors
- Measure Core Web Vitals

**Example usage:**
```javascript
// Performance profiling via MCP
const profile = await devtools.capturePerformanceProfile();
const metrics = await devtools.getCoreWebVitals();
// Analyze profile.loadTime, metrics.FCP, metrics.LCP
```

## 3. Supabase Local MCP (Database Validation)

**Use for:**
- Validating database schema correctness
- Running SQL queries against PostgreSQL
- Verifying data integrity and constraints
- Testing database migrations

**Capabilities:**
- Connect to local PostgreSQL (port 5432)
- Execute SQL queries and schema introspection
- Validate foreign keys, indexes, constraints
- Test CRUD operations

**Example usage:**
```sql
-- Database validation via MCP
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public';

-- Verify constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users';
```

## MCP Availability Handling

**All MCP-based validations are optional enhancements.** If an MCP is unavailable:

- ✅ Document in validation report under "Limitations" or "What We Couldn't Verify"
- ✅ Mark affected checks as INCOMPLETE (not FAIL)
- ✅ Continue with all non-MCP checks
- ✅ Provide recommendations for manual validation
- ❌ Do NOT fail validation solely due to MCP unavailability
- ❌ Do NOT skip reporting the limitation

**Example unavailable MCP handling:**

```markdown
### E2E Testing
**Status:** ⚠️ SKIPPED
**Confidence:** N/A

**Result:** Playwright MCP not available. E2E tests cannot be executed.

**Impact:** User flows unverified. Recommend manual E2E testing before production deployment.

**This limitation affects overall status:** INCOMPLETE (not FAIL)
```
```

**Key points:**
- Identical across all 4 MCP-enabled agents
- Only 3 MCPs listed (Playwright, Chrome DevTools, Supabase)
- Graceful degradation guidance included
- Concrete examples for each MCP
- Clear "optional enhancement" messaging

---

## Validation Status Pattern

### 5-Tier Status System

**When to use:** All validation reports (2l-validator.md, 2l-ivalidator.md)

**Code example:**

```markdown
## Status

**PASS** | **UNCERTAIN** | **PARTIAL** | **INCOMPLETE** | **FAIL**

Select one status that best represents the validation outcome:

- ✅ **PASS** - High confidence (>80%), all critical checks passed, deployment-ready
- ⚠️ **UNCERTAIN** - Medium confidence (60-80%), checks passed but doubts about completeness
- ⚠️ **PARTIAL** - Some checks passed, others incomplete, progress made but not deployment-ready
- ⚠️ **INCOMPLETE** - Cannot complete validation due to missing dependencies/tools/information
- ❌ **FAIL** - Clear failures identified, definitive blocking issues
```

**Key points:**
- Use UNCERTAIN when checks pass but validator has doubts (<80% confidence)
- Use PARTIAL for incremental progress (e.g., 10 of 12 criteria met)
- Use INCOMPLETE when tools unavailable or information missing
- Reserve FAIL for definitive failures only
- Include emoji markers for visual clarity

---

## Confidence Assessment Pattern

### Overall Confidence Reporting

**When to use:** Every validation report

**Code example:**

```markdown
## Status
**UNCERTAIN**

**Confidence Level:** MEDIUM (70%)

**Confidence Rationale:**
TypeScript compilation passed with zero errors (high confidence). Unit tests
passed with 85% coverage, meeting quantitative threshold, but manual inspection
shows tests focus on happy paths with limited edge case coverage (medium confidence).
E2E tests not run due to Playwright MCP unavailability (low confidence - user flows
unverified).

Overall: Core code quality verified but user flow correctness uncertain. 70% overall
confidence is below 80% threshold for PASS status.
```

**Key points:**
- Always include confidence level (HIGH/MEDIUM/LOW) + percentage
- Provide 2-3 sentence rationale explaining the assessment
- Reference which checks contribute to confidence level
- Explain why threshold was or wasn't met

---

## Tripartite Confidence Pattern

### Separating Known vs Uncertain vs Unverifiable

**When to use:** All validation reports with mixed confidence levels

**Code example:**

```markdown
## Confidence Assessment

### What We Know (High Confidence)

- ✅ TypeScript compilation: Zero errors, strict mode enabled
- ✅ Linting: All files pass with zero warnings
- ✅ Unit tests: 42 of 42 tests pass
- ✅ Build process: Production build succeeds, bundle size within limits

### What We're Uncertain About (Medium Confidence)

- ⚠️ Test coverage: 85% quantitatively but edge cases appear under-tested
- ⚠️ Code quality: Meets standards but some complex functions lack comments
- ⚠️ Performance: Build succeeds but runtime performance not benchmarked

### What We Couldn't Verify (Low/No Confidence)

- ❌ E2E testing: Playwright MCP unavailable, user flows not verified
- ❌ Database migrations: Supabase MCP unavailable, schema changes not tested
- ❌ Integration points: External API mocks used, real integrations not validated
```

**Key points:**
- Separate validation results into three clear categories
- Use emoji markers (✅ ⚠️ ❌) for visual scanning
- Explain WHY each item is in its category
- Makes uncertainty explicit and actionable

---

## Per-Check Confidence Pattern

### Adding Confidence to Individual Checks

**When to use:** Validation checks where confidence varies

**Code example:**

```markdown
### Unit Tests
**Status:** ✅ PASS
**Confidence:** MEDIUM

**Tests run:** 42
**Tests passed:** 42
**Coverage:** 85% (meets 80% threshold)

**Confidence notes:**
Tests pass and coverage meets quantitative threshold (85% > 80%). However, manual
inspection shows tests focus on happy paths. Edge case and error condition coverage
appears limited (~40% of test lines). Quantitatively sufficient but qualitatively uncertain.

**Recommendation:** Consider adding edge case tests before production deployment.
```

**Key points:**
- Each check has its own confidence level (separate from overall)
- Explain why confidence is HIGH/MEDIUM/LOW for this specific check
- Provide actionable recommendations when confidence is not HIGH
- Distinguish between "check passed" and "check passed with high confidence"

---

## Honesty Decision Framework Pattern

### Status Selection Decision Tree

**When to use:** Validators selecting overall status

**Code example:**

```markdown
## Status Selection Decision Tree

Use this framework to determine the correct validation status:

1. **Can all required checks be executed?**
   - NO → **INCOMPLETE** (document which checks couldn't run and why)
   - YES → Continue to step 2

2. **Do all executed checks pass?**
   - NO → Are failures clear and blocking?
     - YES → **FAIL** (document specific failures)
     - NO → **PARTIAL** (some passed, some failed - document both)
   - YES → Continue to step 3

3. **What is your confidence level in the PASS assessment?**
   - >80% confidence → **PASS**
   - 60-80% confidence → **UNCERTAIN** (explain what reduces confidence)
   - <60% confidence → **INCOMPLETE** (insufficient information to validate)

**Confidence calculation guidance:**

- List all validation checks (required + optional)
- Assess per-check confidence (HIGH/MEDIUM/LOW)
- Weight by importance (critical checks weighted higher)
- Calculate weighted average confidence

**Example:**
- TypeScript compilation (critical, weight 3): HIGH confidence → 3 × 90% = 270
- Unit tests (critical, weight 3): MEDIUM confidence → 3 × 70% = 210
- E2E tests (important, weight 2): Skipped → 2 × 0% = 0
- Code review (optional, weight 1): HIGH confidence → 1 × 85% = 85
- **Total weighted:** 565 / 900 = 63% → **UNCERTAIN status**
```

**Key points:**
- Provides step-by-step decision process
- Distinguishes inability (INCOMPLETE) from failure (FAIL)
- 80% confidence threshold is explicit
- Shows example calculation for clarity

---

## Honest vs Optimistic Reporting Pattern

### Examples Teaching the Pattern

**When to use:** Include in validator agent prompts as training examples

**Code example:**

```markdown
## Examples of Honest vs Optimistic Reporting

### Example 1: Tests Pass But Coverage Uncertain

**Scenario:**
All unit tests pass. Coverage is 85%. Manual inspection shows tests focus on happy
paths with limited edge case coverage.

**Optimistic Report (AVOID):**
```
## Status: PASS

### Unit Tests
**Status:** ✅ PASS
**Tests run:** 42
**Tests passed:** 42
**Coverage:** 85%
```

**Why problematic:** Reports PASS despite uncertainty about test quality. User assumes
comprehensive testing when coverage is actually shallow.

**Honest Report (FOLLOW):**
```
## Status: UNCERTAIN
**Confidence Level:** MEDIUM (65%)

**Confidence Rationale:**
All 42 unit tests pass and coverage is 85%, meeting quantitative threshold. However,
tests appear to focus on happy paths. Edge cases and error conditions have limited
coverage. Cannot verify robustness with 80%+ confidence.

### Unit Tests
**Status:** ✅ PASS
**Confidence:** MEDIUM

**Tests run:** 42
**Tests passed:** 42
**Coverage:** 85% (quantitative goal met)

**Coverage concerns:**
- ✅ Happy path coverage: Excellent (90%+)
- ⚠️ Edge case coverage: Limited (~40%)
- ⚠️ Error condition coverage: Minimal (~20%)
- ⚠️ Integration point coverage: Uncertain

**Recommendation:** Tests pass but robustness uncertain. Consider adding edge case
and error condition tests before production deployment.
```

**Why better:** Communicates that tests pass while being honest about limitations.
User can make informed deployment decision.

---

### Example 2: MCP Server Unavailable

**Scenario:**
Playwright MCP not available. Cannot run E2E tests. All other checks pass.

**Optimistic Report (AVOID):**
```
## Status: PASS

### E2E Testing
**Status:** ✅ PASS
**Result:** Skipped E2E tests (Playwright not available). All other tests pass.
```

**Why problematic:** Reports PASS despite skipping critical E2E validation. Hides
significant validation gap.

**Honest Report (FOLLOW):**
```
## Status: INCOMPLETE
**Confidence Level:** MEDIUM (70%)

**Confidence Rationale:**
All executable checks passed (TypeScript, linting, unit tests, build). However, E2E
testing could not be performed due to Playwright MCP unavailability. Cannot verify
user flow correctness with 80%+ confidence.

### E2E Testing
**Status:** ⚠️ SKIPPED
**Confidence:** N/A

**Result:** Playwright MCP not available. E2E tests not run. User flows unverified.

**Impact:** Cannot confirm that user-facing workflows function correctly. Critical
user journeys (login, checkout, etc.) not validated.

**Recommendation:**
- If MCP becomes available: Re-run validation to verify E2E flows
- If MCP remains unavailable: Deploy with manual E2E testing
- Consider documenting E2E test suite for manual execution
```

**Why better:** Clearly communicates validation gap and provides actionable
recommendations. Prevents false confidence.

---

### Example 3: Partial Success Criteria

**Scenario:**
12 success criteria defined. 10 met, 2 not implemented (both are enhancement features).

**Optimistic Report (AVOID):**
```
## Status: FAIL

### Success Criteria Verification
10 of 12 criteria met

**Failed criteria:**
- Dashboard auto-refresh: Not implemented
- Cost tracking: Missing
```

**Why problematic:** Binary FAIL hides that 83% of criteria are met. Discards
partial progress information.

**Honest Report (FOLLOW):**
```
## Status: PARTIAL
**Confidence Level:** MEDIUM (75%)

**Confidence Rationale:**
Strong partial completion: 10 of 12 success criteria met (83%). Core functionality
verified and working. Two missing features are enhancements that don't block MVP usage.

### Success Criteria Verification
**Status:** ⚠️ PARTIAL (10 of 12 met)
**Confidence:** HIGH (for the 10 met criteria)

**Met criteria (10):**
- ✅ Dashboard renders and displays project info
- ✅ Event log updates in real-time
- ✅ MCP status indicators functional
- ✅ Dark theme implemented
- ✅ Mobile-responsive layout
- ✅ Supports multiple projects
- ✅ Polls events.jsonl every 2 seconds
- ✅ Shows active agents correctly
- ✅ Browser tab title dynamic
- ✅ No external dependencies

**Unmet criteria (2):**
- ❌ Dashboard auto-refresh: Not implemented (enhancement feature per vision.md)
- ❌ Cost tracking: Missing (optional feature, not in MVP scope per vision.md)

**Analysis:** Unmet criteria are both enhancements, not core functionality blockers.
Dashboard is functional for primary use cases (real-time monitoring, event viewing,
MCP status).

**Recommendation:** MVP is functional for core use cases. Missing features are
enhancements, not blockers. Consider deploying core functionality now, add enhancements
in future iteration.
```

**Why better:** Shows partial progress, enables informed deployment decision. User
understands what works and what doesn't.

---

### Example 4: High Confidence PASS

**Scenario:**
All checks pass comprehensively. No gaps in validation.

**Honest Report (APPROPRIATE USE OF PASS):**
```
## Status: PASS
**Confidence Level:** HIGH (92%)

**Confidence Rationale:**
All validation checks passed comprehensively. TypeScript compilation clean, all 142
tests pass with 94% coverage (including edge cases and error conditions), E2E tests
verify all user flows, build succeeds, performance benchmarks within targets, database
schema validated. No gaps in validation coverage.

## Confidence Assessment

### What We Know (High Confidence)
- ✅ TypeScript compilation: Zero errors, strict mode enabled
- ✅ Unit tests: 142 of 142 pass, 94% coverage (includes edge cases)
- ✅ Integration tests: All critical flows verified
- ✅ E2E tests: 18 user scenarios tested via Playwright
- ✅ Build process: Production build succeeds, bundle size optimal
- ✅ Database schema: All migrations applied, constraints verified
- ✅ Performance: All benchmarks within targets

### What We're Uncertain About (Medium Confidence)
- (None - comprehensive validation completed)

### What We Couldn't Verify (Low/No Confidence)
- (None - all checks executable and executed)

**Deployment recommendation:** High confidence validation. Ready for production deployment.
```

**When to use PASS:** When confidence genuinely exceeds 80% and all critical checks
passed comprehensively.
```

**Key points:**
- Include 5+ examples covering common scenarios
- Show both optimistic (wrong) and honest (right) approaches
- Explain WHY each approach is problematic or better
- Make examples concrete with realistic details
- Cover: test quality uncertainty, MCP unavailability, partial completion, legitimate PASS

---

## Ivalidator Honesty Pattern

### Gray Area Handling for Cohesion Validation

**When to use:** 2l-ivalidator.md when assessing integration cohesion

**Code example:**

```markdown
## Honesty in Cohesion Assessment

Integration validation often encounters **gray areas** where perfect vs problematic
isn't clear. Use the expanded status system to report these honestly.

### When in Doubt:

**Report UNCERTAIN if:**
- Potential duplication exists but intentional separation is plausible
  - Example: Two similar utility functions in different modules - could be DRY
    violation or intentional domain separation
- Import patterns inconsistent but both valid approaches are used
  - Example: Some files use absolute imports, others relative - mixed but functional
- Architecture quality good but some design choices questionable
  - Example: Service layer well-structured but one component has unclear responsibility
- Evidence suggests cohesion but some areas need investigation
  - Example: Type consistency excellent except one module with ambiguous types

**Report PARTIAL if:**
- Most cohesion checks pass but 1-2 have minor issues
  - Example: 4 of 5 builders followed patterns perfectly, 1 has minor deviations
- Type consistency good except one gray area
  - Example: Shared types well-defined but one type has optional fields that may
    indicate inconsistent usage
- Patterns followed except for edge cases with unclear guidance
  - Example: Error handling consistent except for one scenario not covered in patterns.md

**Report INCOMPLETE if:**
- Can't determine if duplication exists without more context
  - Example: Two similar functions but can't access one to compare implementations
- Missing information to assess architecture decisions
  - Example: Builder mentions "following existing pattern" but pattern not in patterns.md
- Type definitions present but relationships unclear
  - Example: Types defined but usage across builders not visible in integrated code

**Report FAIL only if:**
- Clear circular dependencies detected
  - Example: Module A imports B, B imports C, C imports A (definitive cycle)
- Obvious duplicate implementations (same function, different files)
  - Example: `formatCurrency()` implemented identically in 3 different files
- Type conflicts that will break compilation
  - Example: Two builders define `User` type with incompatible fields

### Gray Area Examples

**Example: Possible Duplication vs Domain Separation**

**Scenario:** Builder-1 creates `validateEmail()` in `utils/validation.ts`. Builder-2
creates `isValidEmail()` in `auth/validators.ts`. Functions may be similar.

**Optimistic Assessment (AVOID):**
```
## Duplication Check: PASS
No obvious duplication found.
```

**Honest Assessment (FOLLOW):**
```
## Duplication Check: UNCERTAIN
**Confidence:** MEDIUM (65%)

**Finding:** Two email validation functions exist:
- `utils/validation.ts::validateEmail()`
- `auth/validators.ts::isValidEmail()`

**Analysis:** Cannot determine without seeing implementations whether these are:
- Duplicates (DRY violation requiring consolidation)
- Intentionally separate (different validation rules for different contexts)

**Evidence for duplication:** Both named similarly, both in validation context
**Evidence for separation:** Different modules (generic utils vs auth-specific)

**Recommendation:** Integrator should compare implementations. If identical, consolidate
to utils. If different rules, keep separate but rename for clarity.
```

**Example: Inconsistent Patterns**

**Scenario:** 3 builders use named exports. 1 builder uses default exports. All work.

**Optimistic Assessment (AVOID):**
```
## Export Consistency: PASS
All builders export their components.
```

**Honest Assessment (FOLLOW):**
```
## Export Consistency: PARTIAL
**Confidence:** MEDIUM (70%)

**Finding:** Export pattern inconsistency detected:
- Builders 1, 2, 3: Named exports (`export const Component`)
- Builder 4: Default export (`export default Component`)

**Impact:** Functional (all exports work) but inconsistent with patterns.md guidance
(named exports preferred).

**Analysis:** Not a breaking issue but reduces codebase consistency. Import statements
will vary unnecessarily.

**Recommendation:** Request Builder 4 to convert to named exports for consistency.
Low-priority issue, doesn't block integration.
```
```

**Key points:**
- Provide vocabulary for gray areas instead of forcing binary PASS/FAIL
- Examples show real scenarios validators encounter
- Explain what evidence supports each interpretation
- Guide toward honest uncertainty vs false confidence

---

## Import Order Convention

```markdown
// 1. External dependencies (npm packages)
import { useState, useEffect } from 'react';
import { z } from 'zod';

// 2. Internal absolute imports (from src/)
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// 3. Relative imports (same directory or nearby)
import { validateInput } from './validators';
import type { FormData } from './types';

// 4. Type-only imports (if not already imported)
import type { User } from '@/types';

// 5. CSS/styles (last)
import './styles.css';
```

**Key points:**
- Group by dependency type
- Blank lines between groups
- External before internal before relative
- Type imports with their category or grouped separately
- Styles always last

---

## Grep Verification Patterns

### Verification Commands

**When to use:** Validation phase to confirm MCP cleanup

**Code examples:**

```bash
# Verify no broken MCP references
echo "Checking for GitHub MCP references..."
grep -ri "GitHub MCP" ~/.claude/agents/ && echo "❌ GitHub MCP found!" || echo "✅ No GitHub MCP"

echo "Checking for Screenshot MCP references..."
grep -ri "Screenshot MCP" ~/.claude/agents/ && echo "❌ Screenshot MCP found!" || echo "✅ No Screenshot MCP"

# Verify working MCPs present
echo "Checking for working MCP references..."
grep -c "Playwright MCP" ~/.claude/agents/*.md
grep -c "Chrome DevTools MCP" ~/.claude/agents/*.md
grep -c "Supabase Local MCP" ~/.claude/agents/*.md

# Verify new statuses in validators
echo "Checking for honesty framework..."
grep -q "UNCERTAIN" ~/.claude/agents/2l-validator.md && echo "✅ UNCERTAIN status added"
grep -q "Honesty Over Optimism" ~/.claude/agents/2l-validator.md && echo "✅ Honesty section added"
grep -q "80% confidence" ~/.claude/agents/2l-validator.md && echo "✅ 80% rule added"

# Count MCP sections for consistency
echo "Checking MCP section consistency..."
grep -A 50 "Available MCP Servers" ~/.claude/agents/2l-validator.md > /tmp/mcp1.txt
grep -A 50 "Available MCP Servers" ~/.claude/agents/2l-builder.md > /tmp/mcp2.txt
grep -A 50 "Available MCP Servers" ~/.claude/agents/2l-healer.md > /tmp/mcp3.txt
diff /tmp/mcp1.txt /tmp/mcp2.txt && echo "✅ Validator-Builder MCP sections identical"
diff /tmp/mcp2.txt /tmp/mcp3.txt && echo "✅ Builder-Healer MCP sections identical"
```

**Key points:**
- Use grep with `-i` (case insensitive) and `-r` (recursive)
- Pipe to echo for clear success/failure messages
- Count occurrences to verify consistency
- Diff command confirms identical sections
- Exit codes (&&/||) provide pass/fail logic

---

## File Modification Pattern

### Template-Based Edit Approach

**When to use:** Modifying agent files while preserving existing content

**Code example:**

```markdown
# MODIFICATION STRATEGY

## 1. Read Existing File
- Use Read tool to get complete current content
- Note line numbers for sections to modify
- Identify insertion points for new sections

## 2. Prepare Modifications
- Remove broken MCP sections (delete line ranges)
- Insert honesty framework sections (add at specific points)
- Update report templates (modify existing templates)

## 3. Make Surgical Edits
- Use Edit tool with precise line ranges
- Preserve all existing content not being modified
- Maintain formatting consistency

## 4. Verify Changes
- Read modified file to confirm changes
- Check line count matches expectations
- Verify no accidental deletions

# EXAMPLE: Removing Screenshot MCP from 2l-validator.md

**Step 1: Read file, identify section**
Lines 39-43 contain Screenshot MCP section

**Step 2: Prepare deletion**
Remove lines 39-43 (5 lines total)

**Step 3: Execute edit**
Edit tool: delete lines 39-43

**Step 4: Verify**
Read lines 35-45 to confirm Screenshot MCP gone, surrounding content intact
```

**Key points:**
- Always read before editing
- Make precise line-range edits
- Preserve surrounding content
- Verify each modification

---

**Patterns Complete** - All common operations have copy-pasteable examples with clear guidance.
