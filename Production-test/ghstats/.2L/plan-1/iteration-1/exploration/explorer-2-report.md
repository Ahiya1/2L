# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

This iteration requires building a complete CLI tool from scratch using Node.js 20+ with built-in fetch API, commander.js 12+ for CLI parsing, and direct GitHub REST API v3 integration. The technology stack is minimal (only one production dependency: commander), modern (ES modules, async/await, native fetch), and follows established CLI tool patterns. Key technical focus areas: comprehensive error handling for 5 distinct failure scenarios, number formatting with locale support, and proper exit code handling for shell scripting compatibility.

---

## Discoveries

### Environment Verification

**Node.js Runtime Available:**
- Version: 20.19.5 (exceeds minimum requirement of 18.0.0)
- Built-in fetch API: CONFIRMED available
- ES Modules support: CONFIRMED (type: "module" supported)
- npm version: 10.8.2 (modern package management)

**GitHub API Accessibility:**
- Base URL: https://api.github.com (tested, accessible)
- Rate limit: 60 requests/hour (unauthenticated)
- Current remaining: 57/60 (verified via x-ratelimit-remaining header)
- Reset time: Available in x-ratelimit-reset header (Unix timestamp)

### Package Registry Research

**Commander.js:**
- Latest stable version: 14.0.1 (released recently)
- Recommended version: ^12.0.0 (stable, widely adopted)
- Breaking changes between versions: None that affect our use case
- Package size: ~96KB (minimal overhead)
- Zero dependencies: Yes (no transitive dependency bloat)

**Alternative CLI frameworks considered:**
- yargs: More complex API, heavier (300KB+), unnecessary features
- minimist: Too basic, no help text generation, manual parsing
- oclif: Enterprise framework, massive overkill for single-command tool
- **Decision: commander.js is optimal for this use case**

### GitHub API Response Structure

**Live API Testing Results:**
```json
{
  "stargazers_count": 239697,
  "watchers_count": 239697,
  "forks_count": 49565,
  "open_issues_count": 1060
}
```

**Critical Discovery: watchers_count vs subscribers_count**
- `watchers_count`: Returns same value as `stargazers_count` (legacy behavior)
- `subscribers_count`: Actual repository watchers (different value)
- **Recommendation:** Use `stargazers_count` for stars, `subscribers_count` for watchers (per GitHub API docs)

**Rate Limit Headers:**
```
x-ratelimit-limit: 60
x-ratelimit-remaining: 57
x-ratelimit-reset: 1760229429 (Unix timestamp)
x-ratelimit-resource: core
x-ratelimit-used: 3
```

**404 Error Response:**
```json
{
  "message": "Not Found",
  "documentation_url": "https://docs.github.com/rest/repos/repos#get-a-repository",
  "status": "404"
}
```

---

## Patterns Identified

### Pattern 1: Modern CLI Tool with Commander.js

**Description:** Use commander.js with ES modules for clean, maintainable CLI structure

**Implementation Pattern:**
```javascript
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('ghstats')
  .description('Fetch GitHub repository statistics')
  .version('1.0.0')
  .argument('<repository>', 'Repository in format owner/repo')
  .action(async (repository) => {
    // Core logic here
  })
  .parse();
```

**Use Case:** Entry point for CLI tool (ghstats.js)

**Recommendation:** STRONGLY RECOMMENDED - This is the standard pattern for Node.js CLI tools in 2025

---

### Pattern 2: Fetch API with Comprehensive Error Handling

**Description:** Use native fetch with try-catch and status code checking for robust API calls

**Implementation Pattern:**
```javascript
async function fetchRepoStats(owner, repo) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ghstats-cli'
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    // Check status before parsing JSON
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository '${owner}/${repo}' not found`);
      }
      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const resetDate = new Date(resetTime * 1000);
        throw new Error(
          `Rate limit exceeded. Resets at ${resetDate.toLocaleString()}`
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      issues: data.open_issues_count,
      watchers: data.subscribers_count // Use subscribers_count, not watchers_count
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - GitHub API is not responding');
    }
    throw error; // Re-throw for centralized handling
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Use Case:** lib/api-client.js module

**Key Features:**
- Timeout handling with AbortController (10 second timeout)
- Specific error messages for 404, 403, timeout
- Rate limit reset time extraction from headers
- User-Agent header (GitHub API best practice)
- Accept header for API v3 JSON format

**Recommendation:** REQUIRED - This pattern handles all 5 critical error scenarios

---

### Pattern 3: Input Validation with Regex

**Description:** Validate owner/repo format before making API calls to fail fast

**Implementation Pattern:**
```javascript
function validateRepository(input) {
  // GitHub allows: alphanumeric, hyphens, underscores, dots
  const pattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  
  if (!pattern.test(input)) {
    throw new Error(
      `Invalid repository format: "${input}"\n` +
      `Expected format: owner/repo\n` +
      `Example: facebook/react`
    );
  }
  
  const [owner, repo] = input.split('/');
  return { owner, repo };
}
```

**Use Case:** Input validation before API call

**Benefits:**
- Prevents unnecessary API calls with malformed input
- Saves rate limit quota
- Provides immediate feedback to user
- Returns parsed owner/repo for API call

**Recommendation:** REQUIRED - Implement in main action handler or separate validator module

---

### Pattern 4: Number Formatting with Locale Support

**Description:** Format large numbers with thousand separators for readability

**Implementation Pattern:**
```javascript
function formatStats(stats) {
  return {
    stars: stats.stars.toLocaleString('en-US'),
    forks: stats.forks.toLocaleString('en-US'),
    issues: stats.issues.toLocaleString('en-US'),
    watchers: stats.watchers.toLocaleString('en-US')
  };
}

// Usage in output
console.log(`Stars:        ${formatStats(stats).stars}`);
// Output: "Stars:        239,697" instead of "Stars:        239697"
```

**Use Case:** lib/formatter.js module

**Benefits:**
- Dramatically improves readability for large numbers (1,234,567 vs 1234567)
- Built-in JavaScript method (no dependencies)
- Locale-aware (respects user's system settings)

**Recommendation:** STRONGLY RECOMMENDED - Mentioned in master plan UX priorities

---

### Pattern 5: Centralized Error Handler

**Description:** Single error handler that classifies errors and provides consistent messaging

**Implementation Pattern:**
```javascript
function handleError(error, repository) {
  const errorPrefix = '\n✗ Error:';
  
  // Check for known error patterns
  if (error.message.includes('not found')) {
    console.error(`${errorPrefix} Repository '${repository}' not found`);
    console.error('\nPlease check:');
    console.error('  • Repository name spelling');
    console.error('  • Repository visibility (must be public)');
    console.error('  • Owner username\n');
    process.exit(1);
  }
  
  if (error.message.includes('Rate limit exceeded')) {
    console.error(`${errorPrefix} ${error.message}`);
    console.error('\nUnauthenticated requests are limited to 60 per hour.');
    console.error('Wait for the reset time or consider authentication.\n');
    process.exit(1);
  }
  
  if (error.message.includes('timeout')) {
    console.error(`${errorPrefix} ${error.message}`);
    console.error('\nPlease check your internet connection and try again.\n');
    process.exit(1);
  }
  
  if (error.message.includes('Invalid repository format')) {
    console.error(`${errorPrefix} ${error.message}\n`);
    process.exit(1);
  }
  
  // Generic network/unknown error
  console.error(`${errorPrefix} ${error.message}`);
  console.error('\nIf the problem persists, check GitHub API status.\n');
  process.exit(1);
}
```

**Use Case:** lib/error-handler.js or inline in main file

**Benefits:**
- Consistent error formatting across all error types
- Actionable suggestions for each error type
- Proper exit codes for shell scripting
- Single source of truth for error messages

**Recommendation:** REQUIRED - Error handling is 30-35% of development effort per master plan

---

### Pattern 6: Loading Indicator for UX

**Description:** Display "Fetching..." message during API call to prevent perceived hanging

**Implementation Pattern:**
```javascript
console.log('Fetching repository statistics...\n');
const stats = await fetchRepoStats(owner, repo);
// Clear line and show results
```

**Alternative (with spinner for enhanced UX):**
```javascript
// Simple spinning indicator (no dependencies)
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let i = 0;
const spinner = setInterval(() => {
  process.stdout.write(`\r${frames[i]} Fetching...`);
  i = (i + 1) % frames.length;
}, 80);

const stats = await fetchRepoStats(owner, repo);
clearInterval(spinner);
process.stdout.write('\r');
```

**Use Case:** Before API call in main action handler

**Benefits:**
- Improves perceived performance
- Prevents user confusion about tool hanging
- 5 minutes of implementation, high UX impact

**Recommendation:** STRONGLY RECOMMENDED - Called out in master plan UX priorities

---

## Complexity Assessment

### High Complexity Areas

**None identified.** This is a simple, focused CLI tool.

---

### Medium Complexity Areas

**1. Comprehensive Error Handling**
- **Complexity Score:** 6/10
- **Why Medium:** Must handle 5 distinct error scenarios with different detection logic
  1. Invalid input format (regex validation)
  2. Repository not found (404 status code)
  3. Rate limit exceeded (403 status code + header parsing)
  4. Network timeout (AbortController timeout)
  5. Connection failures (fetch errors)
- **Estimated Builder Effort:** 1-1.5 hours (30-35% of total project)
- **Recommendation:** Build error handling alongside API client, not as separate phase
- **Subdivision Needed:** NO - Error handling is integral to API client

---

### Low Complexity Areas

**1. CLI Argument Parsing (Commander.js)**
- **Complexity Score:** 2/10
- **Estimated Effort:** 20-30 minutes
- **Rationale:** Commander provides built-in parsing, help text generation
- **Implementation:** Straightforward configuration

**2. Input Validation**
- **Complexity Score:** 2/10
- **Estimated Effort:** 15-20 minutes
- **Rationale:** Simple regex pattern matching

**3. GitHub API Integration (Happy Path)**
- **Complexity Score:** 3/10
- **Estimated Effort:** 30 minutes (excluding error handling)
- **Rationale:** Single GET request, simple JSON parsing

**4. Output Formatting**
- **Complexity Score:** 2/10
- **Estimated Effort:** 20-30 minutes
- **Rationale:** Template literals + toLocaleString() for number formatting

**5. Project Setup**
- **Complexity Score:** 1/10
- **Estimated Effort:** 15 minutes
- **Rationale:** Basic package.json + directory structure

---

## Technology Recommendations

### Primary Stack

**Runtime: Node.js 20+**
- **Rationale:** Built-in fetch API (zero HTTP dependencies), ES modules support, stable LTS
- **Verified Available:** Yes (20.19.5 detected)
- **Minimum Version Required:** 18.0.0 (for fetch API)
- **Recommendation:** Specify in package.json engines field

**CLI Framework: commander.js ^12.0.0**
- **Rationale:** Explicitly specified in requirements, lightweight (96KB), zero dependencies
- **Latest Version:** 14.0.1 (can use ^12.0.0 for stability, or ^14.0.0 for latest)
- **Alternative Considered:** yargs (rejected: too heavy, unnecessary features)
- **Recommendation:** Use ^12.0.0 for proven stability or ^14.0.0 for latest

**HTTP Client: Built-in fetch**
- **Rationale:** Zero dependencies, native to Node.js 18+, sufficient for simple GET requests
- **Alternative Considered:** axios (rejected: unnecessary dependency for single API call)
- **Recommendation:** Use native fetch with AbortController for timeout handling

**Module System: ES Modules**
- **Rationale:** Modern JavaScript, clean import syntax, future-proof
- **Configuration:** `"type": "module"` in package.json
- **Benefits:** No require() syntax, top-level await support
- **Recommendation:** Use ES modules for clean, modern codebase

---

### Supporting Libraries

**NONE REQUIRED for core functionality.**

**Optional Enhancements (NOT required for MVP):**
- **chalk ^5.3.0:** Terminal color support (green success, red errors)
  - **Pros:** Improves visual appeal
  - **Cons:** Additional 50KB dependency
  - **Recommendation:** DEFER to future iteration (not critical for MVP)

- **ora ^8.0.0:** Advanced spinner/loading indicators
  - **Pros:** Professional loading animations
  - **Cons:** 200KB+ with dependencies
  - **Recommendation:** DEFER - Simple loading message is sufficient

---

### Package.json Structure

**Complete package.json Template:**
```json
{
  "name": "ghstats",
  "version": "1.0.0",
  "description": "CLI tool to fetch GitHub repository statistics",
  "type": "module",
  "main": "ghstats.js",
  "bin": {
    "ghstats": "./ghstats.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "github",
    "cli",
    "statistics",
    "repository"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "commander": "^12.0.0"
  },
  "scripts": {
    "start": "node ghstats.js"
  }
}
```

**Critical Fields:**
- `"type": "module"`: Enables ES modules
- `"engines"`: Enforces Node.js 18+ requirement
- `"bin"`: Enables global installation with `npm install -g`
- `"main"`: Entry point for imports (if needed later)

---

## Integration Points

### External APIs

**GitHub REST API v3**
- **Endpoint:** `GET https://api.github.com/repos/{owner}/{repo}`
- **Authentication:** None (unauthenticated, 60 req/hour)
- **Headers Required:**
  - `Accept: application/vnd.github.v3+json` (API version)
  - `User-Agent: ghstats-cli` (GitHub requires User-Agent)
- **Rate Limiting:**
  - Limit: 60 requests/hour per IP
  - Headers: x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset
  - Response when exceeded: 403 Forbidden
- **Error Codes:**
  - 200: Success
  - 404: Repository not found (or private)
  - 403: Rate limit exceeded
  - 500/502/503: GitHub server errors (rare)
- **Response Data Contract:**
  ```json
  {
    "stargazers_count": number,
    "forks_count": number,
    "open_issues_count": number,
    "subscribers_count": number  // NOT watchers_count
  }
  ```
- **Integration Complexity:** LOW
- **Estimated Integration Time:** 1 hour (including error handling)

**Critical Discovery: Field Name Inconsistency**
- GitHub API has `watchers_count` and `subscribers_count` fields
- `watchers_count` returns same value as `stargazers_count` (legacy behavior)
- `subscribers_count` contains actual repository watchers
- **Recommendation:** Use `subscribers_count` for watchers metric

---

### Internal Integrations

**CLI Parser → Input Validator**
- **Data Flow:** Raw string argument from commander → validated {owner, repo} object
- **Contract:** String must match `/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`
- **Error Handling:** Throw error with usage example if validation fails

**Input Validator → API Client**
- **Data Flow:** {owner, repo} object → API call
- **Contract:** Both owner and repo must be non-empty strings
- **Error Handling:** API client handles HTTP errors (404, 403, timeout)

**API Client → Output Formatter**
- **Data Flow:** Raw API response → formatted statistics object
- **Contract:** 
  ```javascript
  {
    stars: number,
    forks: number,
    issues: number,
    watchers: number
  }
  ```
- **Error Handling:** API client throws errors, main handler catches and displays

**Output Formatter → Terminal Display**
- **Data Flow:** Formatted stats object → console.log() output
- **Contract:** All numbers formatted with toLocaleString()
- **Display Format:**
  ```
  Repository: owner/repo
  ─────────────────────────
  Stars:        123,456
  Forks:         12,345
  Open Issues:      123
  Watchers:      98,765
  ```

---

## Risks & Challenges

### Technical Risks

**Risk 1: GitHub API Availability**
- **Likelihood:** LOW (99.9% uptime)
- **Impact:** HIGH (tool cannot function without API)
- **Mitigation:**
  - Implement timeout handling (10 second max)
  - Clear error message: "Unable to reach GitHub API"
  - Suggest checking GitHub status page
- **Detection:** Catch fetch errors (network failures)

**Risk 2: Node.js Version Incompatibility**
- **Likelihood:** MEDIUM (users may have older Node.js)
- **Impact:** HIGH (fetch undefined, tool crashes)
- **Mitigation:**
  - Specify `"engines": { "node": ">=18.0.0" }` in package.json
  - npm will warn users with older versions
  - README should clearly state Node.js 18+ requirement
- **Detection:** npm install will check engine requirement

**Risk 3: Rate Limiting During Development/Testing**
- **Likelihood:** HIGH (60 requests/hour is easy to exceed)
- **Impact:** MEDIUM (slows development, testing blocked)
- **Mitigation:**
  - Test with stable, known repositories (facebook/react, microsoft/vscode)
  - Avoid rapid-fire testing (space out API calls)
  - Implement rate limit error handling with reset time display
  - Consider using GitHub personal access token for development (5,000 req/hour)
- **Current Status:** 57/60 requests remaining (tested, working)

---

### Complexity Risks

**Risk: Over-engineering Output Formatting**
- **Likelihood:** MEDIUM (temptation to add colors, tables, graphs)
- **Impact:** LOW (scope creep, wasted time)
- **Mitigation:**
  - Stick to simple console.log() with template literals for MVP
  - Defer chalk/colors to future iteration
  - Focus on number formatting and clear labels only
- **Recommendation:** Keep it simple - plain text is sufficient for MVP

---

## Recommendations for Planner

1. **Use Minimal Dependency Strategy**
   - Only one production dependency: commander.js ^12.0.0
   - Use Node.js 20 built-in fetch (zero HTTP dependencies)
   - Defer optional enhancements (chalk, ora) to future iterations
   - **Rationale:** Simplicity, reduced attack surface, faster npm install, easier maintenance

2. **Implement Error Handling Alongside API Client**
   - Error handling is NOT a separate phase - build it into API client from start
   - Allocate 30-35% of development time to error handling (1-1.5 hours)
   - Test all 5 error scenarios: validation, 404, 403, timeout, network
   - **Rationale:** Error handling is integral to UX, not an afterthought

3. **Follow Modular Structure from Master Plan**
   - File structure (as specified in master-plan.yaml):
     ```
     ghstats/
     ├── package.json
     ├── ghstats.js (entry point, CLI setup)
     ├── lib/
     │   ├── api-client.js (GitHub API, error handling)
     │   ├── formatter.js (output formatting)
     │   └── validator.js (input validation) [OPTIONAL - can be inline]
     └── README.md
     ```
   - **Rationale:** Clear separation of concerns, easier testing, professional structure

4. **Use ES Modules Throughout**
   - Set `"type": "module"` in package.json
   - Use `import/export` syntax (not require/module.exports)
   - Add `#!/usr/bin/env node` shebang to ghstats.js
   - **Rationale:** Modern JavaScript, cleaner syntax, future-proof

5. **Implement Loading Indicator**
   - Simple "Fetching repository statistics..." message before API call
   - Or use basic spinner with no dependencies (as shown in Pattern 6)
   - **Rationale:** Prevents perceived hanging, 5 minutes of work for high UX impact

6. **Test with Real GitHub Repositories**
   - facebook/react (large numbers: 239K stars)
   - microsoft/vscode (large numbers)
   - nonexistent/fake (404 error)
   - Rate limit testing (requires 60+ requests or manual simulation)
   - **Rationale:** Real API testing validates assumptions, catches edge cases

7. **Use Specific Error Messages with Actionable Guidance**
   - Bad: "Error: API call failed"
   - Good: "Repository 'owner/repo' not found. Please check repository name spelling."
   - Include suggestions for each error type (as shown in Pattern 5)
   - **Rationale:** Error UX is 30% of total UX value per master explorer reports

8. **Format Numbers with Thousand Separators**
   - Use `toLocaleString('en-US')` for all numeric output
   - Example: "239,697" instead of "239697"
   - **Rationale:** Dramatically improves readability for large numbers

9. **Handle watchers_count vs subscribers_count Correctly**
   - GitHub API quirk: `watchers_count` equals `stargazers_count`
   - Use `subscribers_count` for actual watchers
   - **Rationale:** Avoid duplicate values in output (stars and watchers should differ)

10. **Specify Node.js Engine Requirement**
    - Add `"engines": { "node": ">=18.0.0" }` to package.json
    - Document in README: "Requires Node.js 18 or higher"
    - **Rationale:** Prevents confusing errors for users with old Node.js versions

---

## Resource Map

### Critical Files/Directories

**Package Configuration:**
- `/package.json` - Dependencies, scripts, engine requirements
- `/package-lock.json` - Exact dependency versions (will be generated by npm install)

**Source Code:**
- `/ghstats.js` - Entry point, CLI setup with commander, main action handler
- `/lib/api-client.js` - GitHub API interaction, error handling, fetch logic
- `/lib/formatter.js` - Number formatting, output template rendering
- `/lib/validator.js` (optional) - Input validation (can be inline in ghstats.js)

**Documentation:**
- `/README.md` - Usage instructions, examples, Node.js requirement
- `/.gitignore` - Exclude node_modules, .env (if added later)

**Not Required:**
- No database files
- No configuration files (.env not needed for unauthenticated API)
- No build/dist directories (no transpilation needed)
- No test directories (manual testing sufficient for MVP)

---

### Key Dependencies

**Production Dependencies:**
1. **commander ^12.0.0**
   - Purpose: CLI argument parsing, help text generation
   - Installation: `npm install commander`
   - Size: ~96KB
   - Transitive dependencies: 0
   - License: MIT
   - Why critical: Core CLI framework, specified in requirements

**Development Dependencies:**
- **NONE required for MVP**
- Optional for future: eslint, prettier (code quality)

**Runtime Dependencies (Built-in):**
1. **fetch API (Node.js 18+)**
   - Purpose: HTTP requests to GitHub API
   - No installation needed (native)
   - Requires: Node.js >= 18.0.0

2. **AbortController (Node.js 15+)**
   - Purpose: Request timeout handling
   - No installation needed (native)

---

### Testing Infrastructure

**Manual Testing Approach (Recommended for MVP):**

**Setup:**
```bash
npm install
chmod +x ghstats.js
```

**Test Cases:**
```bash
# Happy path
node ghstats.js facebook/react
node ghstats.js microsoft/vscode

# Error cases
node ghstats.js invalid-format        # Invalid input
node ghstats.js nonexistent/fake      # 404
# Rate limit: Make 61 requests rapidly (or mock headers)
# Timeout: Temporarily disconnect internet

# Help text
node ghstats.js --help
node ghstats.js --version

# Edge cases
node ghstats.js torvalds/linux        # Very large numbers
node ghstats.js new/repo-with-zeros   # Zero values
```

**Success Criteria:**
- [ ] Stars, forks, issues, watchers display correctly
- [ ] Numbers formatted with thousand separators
- [ ] All 5 error scenarios handled gracefully
- [ ] Help text displays usage examples
- [ ] Exit code 0 on success, 1 on error

**No Automated Tests Required:**
- Project scope is simple (single iteration, 5-6 hours)
- Manual testing is sufficient for MVP
- Could add jest/mocha in future iterations if project grows

---

## Questions for Planner

**Q1: Should we implement optional chalk dependency for colored output in iteration 1?**
- **Context:** Master plan says "optional chalk enhancement" and "plain text output"
- **Recommendation:** NO - Defer to future iteration. Plain text is sufficient for MVP.
- **Reasoning:** Minimizes dependencies, chalk adds complexity (ESM imports), focus on core functionality first

**Q2: Should validator.js be a separate file or inline in ghstats.js?**
- **Context:** Master plan shows lib/validator.js, but validation is just one regex check
- **Recommendation:** INLINE in ghstats.js for iteration 1 (20 lines of code)
- **Reasoning:** Validation logic is simple, separate file adds overhead, can extract later if it grows

**Q3: Should we handle GitHub API server errors (500/502/503) separately?**
- **Context:** Focus is on 404, 403, timeout, network errors
- **Recommendation:** NO - Treat as generic error with "GitHub API error" message
- **Reasoning:** Server errors are rare (99.9% uptime), not worth special handling in MVP

**Q4: Should README include installation instructions for global npm install?**
- **Context:** package.json has "bin" field for global installation
- **Recommendation:** YES - Include `npm install -g .` instructions
- **Reasoning:** Improves usability (users can run `ghstats owner/repo` instead of `node ghstats.js owner/repo`)

**Q5: Should we implement basic spinner or just "Fetching..." text for loading indicator?**
- **Context:** Master plan says "loading indicator during API fetch"
- **Recommendation:** START with simple text, OPTIONALLY add spinner if time permits
- **Reasoning:** Simple text takes 2 minutes, spinner takes 10-15 minutes, both provide UX benefit

---

## Code Patterns Reference

### Complete Main File Structure (ghstats.js)

```javascript
#!/usr/bin/env node
import { Command } from 'commander';
import { fetchRepoStats } from './lib/api-client.js';
import { formatStats, displayStats } from './lib/formatter.js';

const program = new Command();

program
  .name('ghstats')
  .description('Fetch GitHub repository statistics')
  .version('1.0.0')
  .argument('<repository>', 'Repository in format owner/repo')
  .action(async (repository) => {
    try {
      // Validate input format
      const pattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
      if (!pattern.test(repository)) {
        throw new Error(
          `Invalid repository format: "${repository}"\n` +
          `Expected format: owner/repo\n` +
          `Example: facebook/react`
        );
      }

      // Parse owner/repo
      const [owner, repo] = repository.split('/');

      // Show loading indicator
      console.log('Fetching repository statistics...\n');

      // Fetch stats from GitHub API
      const stats = await fetchRepoStats(owner, repo);

      // Format and display
      const formatted = formatStats(stats);
      displayStats(repository, formatted);

      process.exit(0);

    } catch (error) {
      handleError(error, repository);
    }
  })
  .parse();

function handleError(error, repository) {
  const errorPrefix = '\n✗ Error:';
  
  if (error.message.includes('not found')) {
    console.error(`${errorPrefix} Repository '${repository}' not found`);
    console.error('\nPlease check:');
    console.error('  • Repository name spelling');
    console.error('  • Repository visibility (must be public)');
    console.error('  • Owner username\n');
  } else if (error.message.includes('Rate limit exceeded')) {
    console.error(`${errorPrefix} ${error.message}`);
    console.error('\nUnauthenticated requests are limited to 60 per hour.\n');
  } else if (error.message.includes('timeout')) {
    console.error(`${errorPrefix} ${error.message}`);
    console.error('\nPlease check your internet connection.\n');
  } else {
    console.error(`${errorPrefix} ${error.message}\n`);
  }
  
  process.exit(1);
}
```

### API Client Pattern (lib/api-client.js)

```javascript
export async function fetchRepoStats(owner, repo) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ghstats-cli'
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository '${owner}/${repo}' not found`);
      }
      if (response.status === 403) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const resetDate = new Date(resetTime * 1000);
        throw new Error(
          `Rate limit exceeded. Resets at ${resetDate.toLocaleString()}`
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      issues: data.open_issues_count,
      watchers: data.subscribers_count
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - GitHub API is not responding');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Formatter Pattern (lib/formatter.js)

```javascript
export function formatStats(stats) {
  return {
    stars: stats.stars.toLocaleString('en-US'),
    forks: stats.forks.toLocaleString('en-US'),
    issues: stats.issues.toLocaleString('en-US'),
    watchers: stats.watchers.toLocaleString('en-US')
  };
}

export function displayStats(repository, formatted) {
  console.log(`Repository: ${repository}`);
  console.log('─'.repeat(40));
  console.log(`Stars:        ${formatted.stars.padStart(10)}`);
  console.log(`Forks:        ${formatted.forks.padStart(10)}`);
  console.log(`Open Issues:  ${formatted.issues.padStart(10)}`);
  console.log(`Watchers:     ${formatted.watchers.padStart(10)}`);
  console.log('─'.repeat(40));
}
```

---

## Notes & Observations

### Strengths of Technology Choices

1. **Zero HTTP Dependencies:** Built-in fetch eliminates axios/node-fetch dependency
2. **Modern JavaScript:** ES modules, async/await, native APIs throughout
3. **Minimal Attack Surface:** Only one production dependency (commander)
4. **Fast Installation:** npm install completes in ~2 seconds
5. **Future-Proof:** Node.js 20 LTS supported until 2026, ES modules are the future

### Potential Pitfalls to Avoid

1. **Don't use axios:** Built-in fetch is sufficient, adding axios is unnecessary
2. **Don't use watchers_count:** Use subscribers_count for actual watchers
3. **Don't skip timeout handling:** Network requests can hang indefinitely without timeout
4. **Don't use CommonJS:** Use ES modules (type: "module") for modern codebase
5. **Don't over-engineer output:** Plain text with number formatting is sufficient for MVP

### Development Time Estimates

**Breakdown by Component:**
- Project setup (package.json, directory structure): 15 minutes
- CLI skeleton with commander: 20 minutes
- Input validation: 15 minutes
- API client (fetch + error handling): 1 hour
- Output formatter: 20 minutes
- Testing and polish: 45 minutes
- README documentation: 20 minutes

**Total: 3.5-4 hours** (conservative estimate, master plan says 5-6 hours)

### Critical Success Factors

1. **Comprehensive error handling** - This is where 30% of effort goes
2. **Number formatting** - Improves UX dramatically with minimal effort
3. **Loading indicator** - Prevents perceived hanging during API calls
4. **Clear error messages** - Actionable suggestions for each error type
5. **Input validation** - Fail fast before making API calls

---

*Exploration completed: 2025-10-12*
*This report provides concrete implementation guidance for iteration 1 builder*
*Environment verified: Node.js 20.19.5, npm 10.8.2, GitHub API accessible*
*Live API testing completed with facebook/react repository*
