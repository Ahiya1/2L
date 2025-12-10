# Explorer 2 Report: Agent Prompt Structure Analysis

## Executive Summary

All four agent prompts (builder, validator, planner, healer) follow a consistent structure with YAML frontmatter, mission statement, MCP server documentation, event emission, step-by-step process, and report templates. The key insight for adding test generation and security checks is that **each agent has dedicated sections that can be extended**: builders have "Step 3a: COMPLETE Path" with "Write tests" subsection, validators have "Step 2: Run All Checks" with numbered check sections, and the planner defines patterns.md which serves as the canonical template for all code patterns including testing.

## Builder Agent Structure

**File:** `/home/ahiya/Ahiya/2L/agents/2l-builder.md` (537 lines)

### Key Sections

1. **YAML Frontmatter** (lines 1-6)
   - name, model, description, tools

2. **Mission Statement** (lines 8-15)
   - Two outcomes: COMPLETE or SPLIT

3. **MCP Server Documentation** (lines 17-98)
   - Playwright MCP, Chrome DevTools MCP, Supabase Local MCP
   - Each with "When to use", "Capabilities", "Example usage"
   - MCP Availability Handling section

4. **Event Emission** (lines 99-159)
   - Agent Start Event and Agent Complete Event
   - Bash code snippets with placeholder replacement

5. **Process Steps** (lines 161-460)
   - Step 0: MCP Setup
   - Step 1: Read the Plan
   - Step 2: Assess Complexity
   - Step 3a: COMPLETE Path (with Implementation subsections)
   - Step 3b: SPLIT Path (with Foundation and Subtasks)

6. **Decision Making Section** (lines 462-478)
   - COMPLETE vs SPLIT decision criteria

7. **Code Quality Standards** (lines 480-499)
   - Must Haves checklist
   - File Organization
   - Testing Requirements

8. **Common Pitfalls** (lines 515-523)
   - List of things to avoid

### Where to Add Test Generation

**Location:** Step 3a: COMPLETE Path > Implementation (lines 206-260)

Current testing guidance (lines 219-223):
```markdown
3. **Write tests**
   - Unit tests for utilities
   - Integration tests for features
   - Aim for >80% coverage
   - Tests should pass!
```

**Recommendation for adding test generation:**
Insert after line 223, before "Handle dependencies":

```markdown
4. **Generate comprehensive tests**
   - Use test generation patterns from patterns.md
   - Generate unit tests for all new functions
   - Generate integration tests for API endpoints
   - Include edge cases and error scenarios
   - Validate security-sensitive operations
   - Aim for minimum 80% coverage, 90%+ for critical paths
```

**Report Template Location:** lines 263-334
Add to "Tests Summary" section:

```markdown
## Test Generation Summary
- **Auto-generated tests:** {Number}
- **Manual tests added:** {Number}
- **Security tests:** {Number}
- **Edge case coverage:** {Percentage}%
```

## Validator Agent Structure

**File:** `/home/ahiya/Ahiya/2L/agents/2l-validator.md` (1303 lines)

### Key Sections

1. **YAML Frontmatter** (lines 1-6)

2. **Mission Statement** (lines 8-13)
   - 5-tier status system: PASS, UNCERTAIN, PARTIAL, INCOMPLETE, FAIL

3. **Event Emission** (lines 15-57)

4. **Reporting Standards** (lines 59-316)
   - 80% Confidence Rule
   - 5-Tier Status System
   - Status Selection Decision Tree
   - Confidence Calculation Guidance
   - Runtime Verification Hard Cap (75%)
   - Examples of Honest vs Optimistic Reporting

5. **MCP Server Documentation** (lines 318-419)

6. **Your Inputs** (lines 421-427)

7. **Your Process** (lines 429-885)
   - Step 1: Setup Validation Environment
   - Step 2: Run All Checks (9 numbered checks)
   - Step 3: Quality Assessment
   - Step 4: Create Validation Report
   - Step 5: Learning Capture

8. **Issue Categorization** (lines 929-948)

9. **Testing Tips** (lines 950-968)

10. **Quality Standards Reference** (lines 970-999)

### Where to Add Coverage Checks

**Location:** Step 2: Run All Checks, after "4. Unit Tests" (lines 473-485)

**Current coverage check:**
```markdown
**Pass criteria:**
- All tests passing
- Coverage >80%
```

**Recommendation - Insert new check after line 485:**

```markdown
### 4b. Test Coverage Analysis
```bash
npm run test -- --coverage --coverageReporters=json-summary
```

**Pass criteria:**
- Overall coverage >80%
- Critical path coverage >90%
- No uncovered security-sensitive code
- Branch coverage >70%

**Coverage categories to verify:**
- Statement coverage: {X}%
- Branch coverage: {X}%
- Function coverage: {X}%
- Line coverage: {X}%
```

### Where to Add Security Checks

**Location:** After Step 2, check 9 (Success Criteria Check), before MCP-Based Validation

**Recommendation - Insert new section as check 9.5 (around line 519):**

```markdown
### 9.5. Security Validation
```bash
# Dependency vulnerability scan
npm audit --audit-level=moderate

# Secret detection (if available)
# gitleaks detect --source . --no-git

# Environment variable validation
grep -r "process.env" src/ | grep -v ".test." | head -20
```

**Pass criteria:**
- No high/critical vulnerabilities in dependencies
- No hardcoded secrets detected
- All sensitive operations use environment variables
- Authentication/authorization properly implemented
- Input validation present on all user inputs

**Security checks performed:**
- [ ] Dependency vulnerabilities scanned
- [ ] No hardcoded API keys or secrets
- [ ] Environment variables properly typed
- [ ] CORS configuration reviewed
- [ ] Authentication middleware present
- [ ] Authorization checks on protected routes
- [ ] Input sanitization on user inputs
- [ ] SQL injection prevention verified
- [ ] XSS prevention measures in place
```

**Report Template Update (around line 859):**
Current section:
```markdown
## Security Checks
- No hardcoded secrets
- Environment variables used correctly
- No console.log with sensitive data
- Dependencies have no critical vulnerabilities
```

**Recommendation - Expand to:**
```markdown
## Security Validation

### Dependency Vulnerabilities
**Command:** `npm audit`
**Status:** {PASS/FAIL}
**High/Critical:** {Number}
**Details:** {List if any}

### Secret Detection
**Status:** {PASS/FAIL}
**Files scanned:** {Number}
**Issues found:** {List if any}

### Security Checklist
- [ ] No hardcoded secrets
- [ ] Environment variables properly typed
- [ ] CORS configured correctly
- [ ] Authentication implemented
- [ ] Authorization on protected routes
- [ ] Input validation present
- [ ] Output encoding for XSS prevention
- [ ] SQL/NoSQL injection prevention
- [ ] Rate limiting considered
- [ ] Logging excludes sensitive data
```

## Planner Agent Structure

**File:** `/home/ahiya/Ahiya/2L/agents/2l-planner.md` (529 lines)

### Key Sections

1. **YAML Frontmatter** (lines 1-6)

2. **Mission Statement** (lines 8-9)

3. **Your Inputs** (lines 11-19)

4. **Event Emission** (lines 21-65)

5. **Your Outputs** (lines 67-452)
   - overview.md template (lines 72-126)
   - tech-stack.md template (lines 128-225)
   - patterns.md template (lines 227-356)
   - builder-tasks.md template (lines 358-452)

6. **Planning Principles** (lines 454-488)

7. **Red Flags to Avoid** (lines 490-498)

8. **Quality Checklist** (lines 500-512)

### How patterns.md Template is Defined

The patterns.md template (lines 227-356) defines the structure for all code patterns. Key sections:

```markdown
# Code Patterns & Conventions

## File Structure
## Naming Conventions
## API Patterns
## Database Patterns
## Frontend Patterns
## Testing Patterns
## Error Handling
## Integration Patterns
## Utility Patterns
## Import Order Convention
## Code Quality Standards
## Performance Patterns
## Security Patterns
```

**Current Testing Patterns Section (lines 302-312):**
```markdown
## Testing Patterns

### Unit Test Example
\`\`\`typescript
{Full test example}
\`\`\`

### Integration Test Example
\`\`\`typescript
{Full test example}
\`\`\`
```

**Recommendation - Expand Testing Patterns:**

```markdown
## Testing Patterns

### Unit Test Example
\`\`\`typescript
{Full test example}
\`\`\`

### Integration Test Example
\`\`\`typescript
{Full test example}
\`\`\`

### Test Generation Pattern
\`\`\`typescript
// When creating tests, follow this structure:
describe('{ModuleName}', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, setup test data
  });

  // Happy path tests
  describe('when valid input', () => {
    it('should {expected behavior}', () => {
      // Arrange, Act, Assert
    });
  });

  // Edge case tests
  describe('edge cases', () => {
    it('should handle empty input', () => {});
    it('should handle null/undefined', () => {});
    it('should handle boundary values', () => {});
  });

  // Error case tests
  describe('error handling', () => {
    it('should throw on invalid input', () => {});
    it('should handle API failures gracefully', () => {});
  });

  // Security tests (when applicable)
  describe('security', () => {
    it('should sanitize user input', () => {});
    it('should validate authorization', () => {});
  });
});
\`\`\`

### Coverage Requirements Pattern
\`\`\`typescript
// Coverage targets by code type:
// - Utility functions: 90%+
// - API routes: 85%+
// - React components: 80%+
// - Configuration: 70%+
// - Security-sensitive: 95%+
\`\`\`
```

**Current Security Patterns Section (lines 353-356):**
```markdown
## Security Patterns
- {Pattern}: How to implement
- {Pattern}: How to implement
```

**Recommendation - Expand Security Patterns:**

```markdown
## Security Patterns

### Input Validation Pattern
\`\`\`typescript
import { z } from 'zod';

const userInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
\`\`\`

### Authentication Check Pattern
\`\`\`typescript
// Server-side auth check
export async function requireAuth(req: Request) {
  const session = await getSession(req);
  if (!session?.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return session.user;
}
\`\`\`

### Environment Variable Pattern
\`\`\`typescript
// Type-safe environment variables
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
\`\`\`

### SQL Injection Prevention Pattern
\`\`\`typescript
// Always use parameterized queries
const user = await prisma.user.findUnique({
  where: { id: userId }, // Never interpolate user input directly
});
\`\`\`
```

## Healer Agent Structure

**File:** `/home/ahiya/Ahiya/2L/agents/2l-healer.md` (716 lines)

### Key Sections

1. **YAML Frontmatter** (lines 1-6)

2. **Mission Statement** (lines 8-9)
   - Fixes specific categories of issues

3. **MCP Server Documentation** (lines 11-99)

4. **Event Emission** (lines 101-160)

5. **Your Inputs** (lines 162-185)
   - Three critical inputs with locations

6. **Your Process** (lines 187-300)
   - Step 1: Read Exploration Reports FIRST
   - Step 2: Understand Your Assignment
   - Step 3: Analyze Issues Using Exploration Insights
   - Step 4: Fix the Issues
   - Step 5: Verify Your Fixes
   - Step 6: Create Healing Report

7. **Healing Strategies by Category** (lines 557-652)
   - TypeScript Errors
   - Test Failures
   - Linting Issues
   - Build Errors
   - Logic Bugs
   - Integration Problems

8. **When You Can't Fix** (lines 654-663)

9. **Working with Other Healers** (lines 665-672)

10. **Quality Standards** (lines 674-685)

### How Healing Categories Are Organized

The healer receives a **specific category** assignment. Categories are defined in two places:

**1. Step 2: Understand Your Assignment (lines 207-218):**
```markdown
**Common categories:**
- TypeScript errors
- Test failures
- Linting issues
- Build errors
- Logic bugs
- Integration problems
- Performance issues
- Security concerns
```

**2. Healing Strategies by Category (lines 557-652):**
Each category has:
- **Common causes** - List of typical root causes
- **Fix approach** - Numbered steps to fix

**Example structure (TypeScript Errors, lines 559-576):**
```markdown
## TypeScript Errors

**Common causes:**
- Missing type imports
- Incorrect type annotations
- Null/undefined not handled
- Generic type issues
- Interface mismatches

**Fix approach:**
1. Import missing types
2. Add proper type annotations
3. Use optional chaining (?.) and nullish coalescing (??)
4. Fix generic constraints
5. Align interfaces
```

**Recommendation - Add Security Concerns Category:**

```markdown
## Security Concerns

**Common causes:**
- Hardcoded secrets
- Missing input validation
- Insufficient authorization checks
- Vulnerable dependencies
- Improper error exposure
- Missing rate limiting

**Fix approach:**
1. Move secrets to environment variables
2. Add Zod validation schemas
3. Add authorization middleware
4. Update vulnerable dependencies
5. Sanitize error messages
6. Add rate limiting if needed
```

## Common Patterns Across Agents

### 1. YAML Frontmatter Structure
All agents use identical frontmatter:
```yaml
---
name: 2l-{agent-name}
model: opus
description: {One-line description}
tools: {Comma-separated tool list}
---
```

### 2. Mission Statement Format
Single paragraph under "# Your Mission" header explaining primary purpose.

### 3. MCP Server Documentation Pattern
Three-part structure for each MCP:
- **Use for:** Bullet list of use cases
- **Capabilities:** Bullet list of features
- **Example usage:** Code block

Plus "MCP Availability Handling" section with checkmarks/X marks.

### 4. Event Emission Pattern
Identical structure across all agents:
```markdown
# Event Emission

You MUST emit exactly 2 events...

## 1. Agent Start Event
**When:** {timing}
**Purpose:** {why}
**Code:** {bash snippet}
**Example:** {specific example}

## 2. Agent Complete Event
**When:** {timing}
**Purpose:** {why}
**Code:** {bash snippet}

## Important Notes
- Event emission is OPTIONAL...
```

### 5. Process Step Numbering
All agents use "## Step N:" format with descriptive names.

### 6. Report Template Pattern
All agents provide detailed markdown templates with:
- Section headers using ##/###
- Status fields with options listed
- Placeholder syntax: `{Placeholder}`
- Checkboxes: `- [ ]`
- Status indicators: checkmark/X

### 7. Common Pitfalls Section
All agents have section listing mistakes to avoid, prefixed with X symbols.

### 8. Quality Standards Section
All agents have standards with checkmark prefixes.

### 9. Tone Guidance
All agents include "# Your Tone" section with brief guidance.

### 10. Remember Section
All agents end with "# Remember" containing bullet points and emoji.

## Recommendations for Planner

### 1. Add Test Generation Mode to Builder

In builder-tasks.md template, add testing requirements field:
```markdown
### Testing Requirements
- Unit tests for {Components}
- Integration tests for {Flows}
- Security tests for {Sensitive operations}
- Coverage target: {Percentage}%
- Test generation mode: {AUTO|MANUAL|HYBRID}
```

### 2. Add Security Check Category to Validator

Create new numbered check in validator process (around line 519):
```markdown
### 9.5. Security Validation
{Full security validation section as detailed above}
```

### 3. Expand patterns.md Security Patterns

The current placeholder:
```markdown
## Security Patterns
- {Pattern}: How to implement
```

Should be expanded to include concrete patterns for:
- Input validation (Zod schema)
- Authentication checks
- Authorization middleware
- Environment variable handling
- SQL injection prevention
- XSS prevention

### 4. Add Security Concerns to Healer Categories

Add full category definition between "Performance issues" and end of list with:
- Common causes
- Fix approach steps
- Verification commands

## Questions for Planner

1. Should test generation be automatic (builder always generates tests) or optional (configurable per task)?

2. Should security validation be a blocking check (FAIL if issues found) or advisory (UNCERTAIN/PARTIAL)?

3. For coverage thresholds, should there be different targets per code type (utilities vs components vs configs)?

4. Should the healer have a dedicated "Security Healer" specialization, or handle security as a subcategory?

5. How should explorers assess existing test coverage and security posture before building begins?
