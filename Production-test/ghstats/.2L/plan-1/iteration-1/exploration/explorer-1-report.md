# Explorer 1 Report: Architecture & Structure

## Executive Summary

This is a greenfield CLI project with zero existing code. The architecture is straightforward: a modular Node.js CLI tool with clear separation between CLI parsing, API interaction, output formatting, and error handling. Recommended structure uses a lib/ directory pattern with 3 core modules. Total project complexity: SIMPLE. Estimated 5-6 hours for complete implementation.

## Discoveries

### Codebase State
- **Current state:** Completely empty (greenfield)
- **Existing files:** None (only .2L directory with planning artifacts)
- **No legacy code:** No refactoring or migration needed
- **No existing dependencies:** Fresh package.json required
- **Git repository:** Initialized, ready for commits

### Master Plan Insights
- **Single iteration project:** All features built together in one cohesive unit
- **Modular architecture:** Explicitly recommended by master explorers
- **Node.js 18+ required:** For built-in fetch API support
- **Minimal dependencies:** Only commander.js needed
- **Linear execution flow:** CLI → API → Formatter → Output (no complex branching)

### File Structure Requirements
Based on master exploration analysis, the project needs:

1. **Root-level files:**
   - package.json (with Node.js 18+ engine requirement)
   - ghstats.js (main entry point)
   - README.md (usage documentation)
   - .gitignore (node_modules exclusion)

2. **lib/ directory modules:**
   - api-client.js (GitHub API interaction)
   - formatter.js (terminal output formatting)
   - errors.js (centralized error handling)

3. **No test directory:** Manual testing sufficient for MVP scope

### Component Relationships
Linear dependency chain with clear boundaries:

```
User Input
    ↓
ghstats.js (CLI Entry Point)
    ├── commander.js (argument parsing)
    ├── lib/errors.js (input validation)
    ↓
lib/api-client.js (GitHub API)
    ├── Built-in fetch (HTTP requests)
    ├── lib/errors.js (error classification)
    ↓
lib/formatter.js (Output)
    ├── Number formatting
    ├── Terminal display
    ↓
Console Output (stdout/stderr)
```

## Patterns Identified

### Pattern 1: Modular CLI Architecture

**Description:** Separation of concerns across focused modules: entry point, API client, formatter, error handler.

**Use Case:** Standard pattern for maintainable CLI tools that need clear boundaries between responsibilities.

**Example Structure:**
```
ghstats/
├── package.json
├── ghstats.js          # CLI setup, commander configuration
├── lib/
│   ├── api-client.js   # fetchRepoStats(owner, repo)
│   ├── formatter.js    # formatRepoStats(data)
│   └── errors.js       # handleError(error), validateInput(input)
└── README.md
```

**Recommendation:** STRONGLY RECOMMENDED
- Aligns with vision's explicit guidance: "clear separation between CLI logic, API client, and output formatting"
- Enables easier testing of individual components
- Professional structure for future maintenance
- Minimal complexity overhead (3 small modules vs 1 large file)

### Pattern 2: ES Modules with Async/Await

**Description:** Modern JavaScript using ES modules (import/export) and async/await for asynchronous operations.

**Use Case:** Node.js 18+ projects with native fetch support and modern syntax.

**Example:**
```javascript
// ghstats.js (entry point)
import { Command } from 'commander';
import { fetchRepoStats } from './lib/api-client.js';
import { formatRepoStats } from './lib/formatter.js';
import { handleError, validateInput } from './lib/errors.js';

const program = new Command();
program
  .argument('<repository>', 'Repository in format owner/repo')
  .action(async (repository) => {
    try {
      validateInput(repository);
      const stats = await fetchRepoStats(repository);
      console.log(formatRepoStats(stats));
    } catch (error) {
      handleError(error);
      process.exit(1);
    }
  });

program.parse();
```

**Recommendation:** MANDATORY
- Required for built-in fetch API usage
- Clean, modern syntax
- Better error handling with try-catch
- Future-proof

### Pattern 3: Centralized Error Handler

**Description:** Single module that classifies and formats all error types with consistent messaging.

**Use Case:** Applications with multiple error scenarios (404, rate limits, network failures, validation errors).

**Example:**
```javascript
// lib/errors.js
export function handleError(error) {
  if (error.status === 404) {
    console.error(`Repository '${error.repo}' not found.`);
    console.error('Check spelling and try again.');
  } else if (error.status === 403 && error.rateLimit) {
    const resetTime = new Date(error.resetTime * 1000).toLocaleString();
    console.error(`GitHub API rate limit exceeded.`);
    console.error(`Limit resets at: ${resetTime}`);
    console.error('Tip: Authenticate for higher limits (5,000/hour).');
  } else if (error.code === 'ETIMEDOUT') {
    console.error('Request timed out. Check your internet connection.');
  } else {
    console.error('An unexpected error occurred:', error.message);
  }
}

export function validateInput(repository) {
  const pattern = /^[\w.-]+\/[\w.-]+$/;
  if (!pattern.test(repository)) {
    const error = new Error('Invalid repository format');
    error.type = 'VALIDATION_ERROR';
    throw error;
  }
}
```

**Recommendation:** STRONGLY RECOMMENDED
- Error handling is 30-35% of project effort (per master plan)
- Consistent error messaging improves UX
- Single source of truth for error formats
- Easy to extend with new error types

### Pattern 4: Shebang for Direct Execution

**Description:** Add shebang line to make CLI directly executable without `node` prefix.

**Use Case:** CLI tools meant for global installation or direct execution.

**Example:**
```javascript
#!/usr/bin/env node
// ghstats.js
import { Command } from 'commander';
// ... rest of code
```

**Setup:**
```bash
chmod +x ghstats.js
./ghstats.js facebook/react  # Direct execution
```

**Recommendation:** OPTIONAL but NICE-TO-HAVE
- Improves UX for users
- Standard practice for CLI tools
- Requires chmod +x on Unix systems
- Still works with `node ghstats.js` if not executable

## Complexity Assessment

### High Complexity Areas
**NONE IDENTIFIED**

This project has no high-complexity components. All features are straightforward implementations.

### Medium Complexity Areas

**1. Error Handling Module (lib/errors.js)**
- **Complexity drivers:**
  - Must handle 5+ distinct error types (404, 403/rate limit, network timeout, connection refused, validation)
  - Each error needs specific detection logic and custom messaging
  - Rate limit errors require header parsing and timestamp formatting
  - Error context must be preserved (which repository failed)
- **Estimated effort:** 1.5 hours (30% of project)
- **Builder considerations:**
  - Test each error scenario individually
  - Parse GitHub API response headers for rate limit info
  - Provide actionable guidance in error messages
- **Split recommendation:** NO - error handling is integral to API client, should be built together

**2. GitHub API Client (lib/api-client.js)**
- **Complexity drivers:**
  - Built-in fetch API requires understanding of Response object
  - JSON parsing with error handling
  - HTTP status code interpretation
  - Header extraction for rate limit monitoring
  - Network timeout implementation (10 seconds)
- **Estimated effort:** 1 hour (20% of project)
- **Builder considerations:**
  - Use AbortController for timeout functionality
  - Check response.ok before parsing JSON
  - Extract specific fields from GitHub API response
  - Pass structured errors to error handler
- **Split recommendation:** NO - tightly coupled with error handling

### Low Complexity Areas

**1. CLI Entry Point (ghstats.js)**
- **Complexity:** Straightforward commander.js setup
- **Effort:** 30 minutes
- **Why simple:** Commander handles parsing, just define argument and action handler
- **No split needed**

**2. Output Formatter (lib/formatter.js)**
- **Complexity:** String formatting and number display
- **Effort:** 30 minutes
- **Why simple:** Takes JSON data, returns formatted string for console.log
- **No split needed**

**3. Project Setup (package.json, README, .gitignore)**
- **Complexity:** Boilerplate configuration
- **Effort:** 20 minutes
- **Why simple:** Standard npm project initialization
- **No split needed**

### Complexity Summary

Total estimated effort: 5-6 hours broken down as:
- Project setup: 20 minutes (LOW)
- CLI parsing: 30 minutes (LOW)
- Input validation: 20 minutes (LOW)
- API client: 1 hour (MEDIUM)
- Error handling: 1.5 hours (MEDIUM) ← Largest complexity area
- Output formatting: 30 minutes (LOW)
- Testing & polish: 1 hour (LOW)
- Documentation: 30 minutes (LOW)

**No builder splits recommended.** All components are manageable within single builder scope.

## Technology Recommendations

### Primary Stack

**Runtime: Node.js 18+ (LTS)**
- **Rationale:**
  - Built-in fetch API eliminates HTTP client dependency
  - ES modules support (type: "module" in package.json)
  - Stable LTS version (released April 2022)
  - AbortController for timeout handling
  - Wide adoption and strong ecosystem
- **Risk:** Users with older Node.js versions won't be able to run tool
- **Mitigation:** Specify in package.json engines field and document in README

**CLI Framework: commander.js v12.x**
- **Rationale:**
  - Explicitly specified in vision document
  - Mature, stable library (10+ years, millions of downloads)
  - Excellent documentation and examples
  - Automatic help generation
  - TypeScript support (if needed later)
- **Installation:** `npm install commander`
- **Alternatives considered:** yargs (too complex), minimist (too basic)

**HTTP Client: Built-in fetch**
- **Rationale:**
  - Zero dependencies (native to Node.js 18+)
  - Standard Web API (same as browser fetch)
  - Adequate for simple GET requests to GitHub API
  - Promise-based with async/await support
- **Trade-off:** Axios has better defaults and error handling, but adds 500KB dependency
- **Recommendation:** Start with fetch, only switch to axios if needed

**Module System: ES Modules**
- **Configuration:** Add `"type": "module"` to package.json
- **Rationale:**
  - Modern JavaScript standard
  - Cleaner import/export syntax
  - Required for some ESM-only packages (like chalk v5+)
  - Future-proof
- **File extensions:** Use .js with import/export (not .mjs)

### Supporting Libraries

**Optional Enhancement: chalk v5.x**
- **Purpose:** Add color to terminal output (green for success, red for errors)
- **Installation:** `npm install chalk`
- **Recommendation:** OPTIONAL for MVP
  - Nice-to-have for visual polish
  - Not required by success criteria
  - Can add in later if time permits
- **Usage example:**
  ```javascript
  import chalk from 'chalk';
  console.log(chalk.green('✓ Repository found'));
  console.error(chalk.red('✗ Repository not found'));
  ```

**No Testing Framework for MVP**
- **Rationale:**
  - Manual testing sufficient for 4-6 hour project
  - Real API testing more valuable than mocks for this tool
  - Can add jest/mocha later if project grows
- **Testing approach:**
  - Manual testing with real GitHub repositories
  - Test all error scenarios (404, rate limits, network failures)
  - Cross-platform terminal testing (Linux, macOS, Windows)

### package.json Configuration

```json
{
  "name": "ghstats",
  "version": "1.0.0",
  "description": "CLI tool to fetch and display GitHub repository statistics",
  "type": "module",
  "main": "ghstats.js",
  "bin": {
    "ghstats": "./ghstats.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "commander": "^12.0.0"
  },
  "keywords": ["cli", "github", "statistics", "repository"],
  "author": "",
  "license": "MIT"
}
```

**Key decisions:**
- `"type": "module"` enables ES modules
- `"engines"` enforces Node.js 18+ requirement
- `"bin"` enables global installation via npm link or npm install -g
- Single dependency (commander) minimizes supply chain risk

## Integration Points

### Internal Integrations

**1. ghstats.js ↔ lib/errors.js**
- **Direction:** Bidirectional
- **Data flow:**
  - ghstats.js calls `validateInput(repository)` before API call
  - ghstats.js calls `handleError(error)` in catch block
- **Contract:**
  - validateInput throws error if input invalid
  - handleError formats error to stderr and doesn't return value
- **Integration complexity:** LOW
- **Test scenario:** Pass invalid input "invalid" to validateInput

**2. ghstats.js ↔ lib/api-client.js**
- **Direction:** ghstats.js calls api-client.js
- **Data flow:**
  - Input: repository string "owner/repo"
  - Output: Promise<Object> with { stars, forks, issues, watchers }
  - Error: Throws with status, repo, and error context
- **Contract:**
  ```javascript
  // Success
  const stats = await fetchRepoStats('facebook/react');
  // Returns: { stars: 200000, forks: 40000, issues: 800, watchers: 6500 }
  
  // Failure
  throw {
    status: 404,
    repo: 'facebook/invalid',
    message: 'Not Found'
  }
  ```
- **Integration complexity:** LOW
- **Test scenario:** Call with valid repo, invalid repo, simulate network failure

**3. ghstats.js ↔ lib/formatter.js**
- **Direction:** ghstats.js calls formatter.js
- **Data flow:**
  - Input: Stats object from API client
  - Output: Formatted string for console.log
- **Contract:**
  ```javascript
  const output = formatRepoStats({
    name: 'facebook/react',
    stars: 200000,
    forks: 40000,
    issues: 800,
    watchers: 6500
  });
  // Returns multi-line string with formatted numbers
  ```
- **Integration complexity:** LOW
- **Test scenario:** Pass stats object, verify number formatting with commas

**4. lib/api-client.js ↔ lib/errors.js**
- **Direction:** API client throws errors that error handler catches
- **Data flow:**
  - API client creates structured error objects
  - Error handler in ghstats.js formats them
- **Contract:**
  - API client includes status, repo, resetTime (for rate limits), code (for network)
  - Error handler classifies and formats based on error properties
- **Integration complexity:** MEDIUM (most complex integration)
- **Test scenario:** Mock different error responses from GitHub API

### External Integrations

**1. GitHub REST API v3**
- **Endpoint:** `GET https://api.github.com/repos/{owner}/{repo}`
- **Authentication:** None (public API, unauthenticated)
- **Request headers:** None required (User-Agent optional but not required)
- **Response format:** JSON
- **Critical fields:**
  - `stargazers_count` → stars
  - `forks_count` → forks
  - `open_issues_count` → issues
  - `watchers_count` → watchers
  - `full_name` → repository name for display
- **Error responses:**
  - 404: Repository not found
  - 403: Rate limit exceeded (check X-RateLimit-* headers)
  - 500: GitHub server error
- **Rate limits:**
  - Unauthenticated: 60 requests/hour per IP
  - Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- **Integration complexity:** LOW (well-documented, stable API)
- **Documentation:** https://docs.github.com/en/rest/repos/repos#get-a-repository

**2. Commander.js Library**
- **Purpose:** Parse command-line arguments
- **Integration pattern:**
  ```javascript
  import { Command } from 'commander';
  
  const program = new Command();
  program
    .name('ghstats')
    .description('Fetch GitHub repository statistics')
    .version('1.0.0')
    .argument('<repository>', 'Repository in format owner/repo')
    .action(async (repository) => {
      // Main logic here
    });
  
  program.parse();
  ```
- **Automatic features:**
  - --help flag (auto-generated)
  - --version flag
  - Error handling for missing arguments
- **Integration complexity:** LOW (straightforward API)

**3. Node.js Built-in fetch**
- **Usage pattern:**
  ```javascript
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Handle HTTP errors
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      // Timeout
    }
    // Other network errors
  }
  ```
- **Integration complexity:** LOW (standard Web API)
- **Gotchas:**
  - Must check response.ok manually (doesn't throw on 404)
  - Timeout requires AbortController pattern
  - JSON parsing can throw separate error

## Risks & Challenges

### Technical Risks

**1. Node.js Version Compatibility**
- **Risk:** Users with Node.js <18 cannot run the tool
- **Impact:** Tool fails immediately with "fetch is not defined"
- **Likelihood:** MEDIUM (many users still on Node.js 16 or 14)
- **Mitigation strategy:**
  1. Add engines field to package.json: `"engines": { "node": ">=18.0.0" }`
  2. Document Node.js requirement prominently in README
  3. Add version check in ghstats.js (optional):
     ```javascript
     if (process.version < 'v18.0.0') {
       console.error('Error: Node.js 18 or higher is required');
       process.exit(1);
     }
     ```
  4. Consider axios as fallback (supports Node.js 14+) if compatibility is critical
- **Recommendation:** Accept Node.js 18+ requirement, document clearly

**2. GitHub API Stability**
- **Risk:** GitHub API changes response format or fields
- **Impact:** Tool breaks or displays incorrect/missing data
- **Likelihood:** LOW (GitHub REST API v3 is stable and versioned)
- **Mitigation strategy:**
  1. Use stable API version (v3, not beta endpoints)
  2. Validate all required fields exist before accessing
  3. Test with multiple repositories to ensure consistency
  4. Add fallback for missing optional fields
- **Recommendation:** Not a concern for MVP, monitor GitHub API changelog

**3. ES Modules Configuration**
- **Risk:** Module resolution errors if "type": "module" not set correctly
- **Impact:** Import statements fail with syntax errors
- **Likelihood:** LOW (common setup issue but easy to fix)
- **Mitigation strategy:**
  1. Add "type": "module" to package.json immediately
  2. Use .js extensions in all imports (not .mjs)
  3. Test imports before writing full implementation
- **Recommendation:** Set up correctly from start, include in builder instructions

### Complexity Risks

**1. Error Handling Scope Creep**
- **Risk:** Attempting to handle every possible edge case
- **Impact:** Development time exceeds 1.5 hour estimate
- **Likelihood:** MEDIUM (easy to over-engineer error handling)
- **Mitigation strategy:**
  1. Focus on 4 primary error types (404, 403/rate limit, network, validation)
  2. Use catch-all generic error for unexpected scenarios
  3. Don't implement retry logic (out of scope for MVP)
  4. Don't implement detailed network diagnostics (ping, DNS check, etc.)
- **Recommendation:** Builder should timebox error handling to 1.5 hours

**2. Output Formatting Over-Engineering**
- **Risk:** Spending excessive time on visual polish (boxes, colors, tables)
- **Impact:** Delays other features, exceeds 30-minute estimate
- **Likelihood:** LOW (success criteria don't require fancy formatting)
- **Mitigation strategy:**
  1. Start with plain text output (meets success criteria)
  2. Add basic number formatting with commas (1,234 not 1234)
  3. Optional: Add chalk colors only if time permits
  4. Avoid: cli-table3, boxen, figlet (overkill for 4 metrics)
- **Recommendation:** Keep formatting simple, focus on readability

**3. Testing Exhaustiveness**
- **Risk:** Attempting comprehensive automated testing
- **Impact:** Adds 2-3 hours to timeline (not in estimate)
- **Likelihood:** LOW (manual testing is acceptable for MVP)
- **Mitigation strategy:**
  1. No jest/mocha setup required
  2. Manual testing with real GitHub API
  3. Test 3-4 repositories (popular, small, nonexistent)
  4. Test error scenarios with real failures
- **Recommendation:** Manual testing only for iteration 1

## Recommendations for Planner

1. **Start with Project Structure Setup (20 minutes)**
   - Create package.json with "type": "module" and commander dependency
   - Create directory structure: lib/ folder
   - Create placeholder files: ghstats.js, lib/api-client.js, lib/formatter.js, lib/errors.js
   - Initialize .gitignore with node_modules
   - Run npm install
   - **Rationale:** Establishes foundation, enables incremental testing

2. **Build in Development Order (not logical order)**
   - **Phase 1:** CLI skeleton + input validation (50 minutes)
     - Set up commander.js in ghstats.js
     - Implement validateInput in lib/errors.js
     - Test with various inputs
   - **Phase 2:** API client + error handling (2.5 hours)
     - Implement fetchRepoStats in lib/api-client.js
     - Build comprehensive error handler in lib/errors.js
     - Test with real GitHub API
   - **Phase 3:** Output formatter (30 minutes)
     - Implement formatRepoStats in lib/formatter.js
     - Add number formatting
   - **Phase 4:** Integration + documentation (1.5 hours)
     - End-to-end testing
     - README with usage instructions
     - Final polish
   - **Rationale:** This order enables testing each component as it's built

3. **Prioritize Error Handling from the Start**
   - Don't build "happy path only" then add errors later
   - Build API client with error handling from day 1
   - Allocate 30-35% of effort (1.5 hours) to error scenarios
   - Test each error type individually
   - **Rationale:** Error handling is 3 of 6 success criteria, integral to UX

4. **Use Real GitHub API for Testing**
   - Test with known repositories: facebook/react, microsoft/vscode, torvalds/linux
   - Test 404 scenario: invaliduser/invalidrepo
   - Test rate limiting: make 60+ requests (or mock headers)
   - Test network failure: disconnect internet temporarily
   - **Rationale:** Real API testing catches integration issues early

5. **Keep Modules Small and Focused**
   - Each lib/ module should be <100 lines of code
   - Single responsibility per module
   - Pure functions where possible (formatter.js, errors.js validation)
   - Avoid classes (unnecessary abstraction for this scope)
   - **Rationale:** Simple modules are easier to test and maintain

6. **Document as You Build**
   - Add JSDoc comments to exported functions
   - Include example usage in comments
   - Write README usage section before final testing
   - **Rationale:** Documentation is 1 of 6 success criteria, easy to forget

7. **No Sub-Builders Needed**
   - This is a 5-6 hour project, single builder is sufficient
   - All features are tightly coupled (CLI → API → Format → Output)
   - No natural separation points for parallel work
   - **Rationale:** Communication overhead would exceed benefits

8. **Use Absolute Imports (ES Modules)**
   - Import from './lib/api-client.js' (include .js extension)
   - Don't use bare module specifiers for local files
   - Commander imports as: `import { Command } from 'commander';`
   - **Rationale:** ES modules require explicit file extensions

## Resource Map

### Critical Files/Directories

**Root Directory: /home/ahiya/Ahiya/2L/Production-test/ghstats/**
- **Purpose:** Project root, entry point location
- **Status:** Currently empty except .2L planning directory
- **Git:** Initialized repository

**package.json (TO BE CREATED)**
- **Purpose:** Project metadata, dependencies, Node.js version requirement
- **Location:** /home/ahiya/Ahiya/2L/Production-test/ghstats/package.json
- **Required fields:**
  - name: "ghstats"
  - type: "module" (CRITICAL for ES modules)
  - engines: { "node": ">=18.0.0" }
  - dependencies: { "commander": "^12.0.0" }
  - bin: { "ghstats": "./ghstats.js" }

**ghstats.js (TO BE CREATED)**
- **Purpose:** Main entry point, CLI setup, orchestration
- **Location:** /home/ahiya/Ahiya/2L/Production-test/ghstats/ghstats.js
- **Shebang:** #!/usr/bin/env node (first line)
- **Responsibilities:**
  - Import commander and lib modules
  - Set up CLI argument parsing
  - Orchestrate: validate → fetch → format → display
  - Handle top-level errors with try-catch
- **Estimated size:** 40-50 lines

**lib/ directory (TO BE CREATED)**
- **Purpose:** Core logic modules
- **Location:** /home/ahiya/Ahiya/2L/Production-test/ghstats/lib/
- **Contents:** 3 modules (api-client.js, formatter.js, errors.js)

**lib/api-client.js (TO BE CREATED)**
- **Purpose:** GitHub API interaction
- **Exports:** `async function fetchRepoStats(repository)`
- **Responsibilities:**
  - Parse repository string into owner/repo
  - Construct GitHub API URL
  - Make fetch request with 10s timeout
  - Parse JSON response
  - Extract required fields (stars, forks, issues, watchers)
  - Throw structured errors on failure
- **Estimated size:** 60-80 lines

**lib/formatter.js (TO BE CREATED)**
- **Purpose:** Terminal output formatting
- **Exports:** `function formatRepoStats(data)`
- **Responsibilities:**
  - Format numbers with thousand separators (1,234)
  - Create readable multi-line output
  - Return string for console.log
- **Estimated size:** 30-40 lines

**lib/errors.js (TO BE CREATED)**
- **Purpose:** Error handling and input validation
- **Exports:** 
  - `function handleError(error)`
  - `function validateInput(repository)`
- **Responsibilities:**
  - Classify error types (404, 403, network, validation)
  - Format user-friendly error messages
  - Write to stderr with console.error
  - Validate repository input format
- **Estimated size:** 80-100 lines (largest module due to many error types)

**README.md (TO BE CREATED)**
- **Purpose:** Usage documentation
- **Required sections:**
  - Description
  - Prerequisites (Node.js 18+)
  - Installation (npm install)
  - Usage examples (node ghstats.js owner/repo)
  - Example output
  - Error scenarios
- **Estimated size:** 50-100 lines

**.gitignore (TO BE CREATED)**
- **Purpose:** Exclude node_modules from git
- **Contents:**
  ```
  node_modules/
  npm-debug.log
  .DS_Store
  ```

### Key Dependencies

**Production Dependency: commander@^12.0.0**
- **Why needed:** CLI argument parsing (required by vision)
- **Installation:** `npm install commander`
- **Import pattern:** `import { Command } from 'commander';`
- **Documentation:** https://github.com/tj/commander.js
- **Size:** ~50KB (small)
- **Risk:** LOW (mature, stable library)

**Built-in Dependency: fetch (Node.js 18+)**
- **Why needed:** GitHub API HTTP requests
- **Installation:** None (built into Node.js 18+)
- **Import pattern:** Available globally, no import needed
- **Documentation:** https://nodejs.org/api/globals.html#fetch
- **Risk:** MEDIUM (requires Node.js 18+, potential compatibility issues)

**Built-in Dependency: AbortController**
- **Why needed:** Request timeout implementation
- **Installation:** None (built into Node.js)
- **Usage:** Create controller, pass signal to fetch, call controller.abort() on timeout
- **Risk:** LOW (standard Web API)

**Optional Dependency: chalk@^5.0.0**
- **Why needed:** Colored terminal output (visual enhancement)
- **Installation:** `npm install chalk` (only if time permits)
- **Import pattern:** `import chalk from 'chalk';`
- **Recommendation:** Skip for MVP, add later if desired
- **Risk:** LOW (purely aesthetic)

### Testing Infrastructure

**Manual Testing Approach (No Test Framework)**
- **Test repositories:**
  - facebook/react (popular, large numbers)
  - microsoft/vscode (popular, active)
  - torvalds/linux (very popular)
  - octocat/hello-world (small, simple)
- **Error scenarios:**
  - invaliduser/invalidrepo (404 test)
  - Make 60+ requests to same IP (rate limit test, hard to test)
  - Disconnect internet (network failure test)
  - Pass "invalid" as argument (validation test)
  - Pass "owner/repo/extra" (validation test)
- **Cross-platform testing:**
  - Test on Linux (primary development environment)
  - Optional: Test on macOS, Windows (if available)
- **No automated tests:** Manual testing sufficient for 4-6 hour MVP

**GitHub API Testing Endpoint**
- **Test connectivity:** `curl https://api.github.com/repos/facebook/react`
- **Verify response format:** Check for required fields (stargazers_count, forks_count, etc.)
- **Check rate limit:** `curl -I https://api.github.com/repos/facebook/react` (view X-RateLimit-* headers)

## Questions for Planner

1. **Chalk Color Library: Include or Skip?**
   - **Context:** chalk adds green/red colors to output (success/error)
   - **Pros:** Better UX, visually appealing, professional appearance
   - **Cons:** Additional dependency, adds 10-15 minutes to implementation
   - **Recommendation:** Skip for MVP (not in success criteria), add if time permits
   - **Question:** Should builder include chalk in initial implementation or defer to future enhancement?

2. **README Detail Level**
   - **Context:** README is 1 of 6 success criteria, but level of detail not specified
   - **Options:**
     - Minimal: Installation + basic usage (5 minutes)
     - Standard: Installation + usage + examples + error scenarios (15 minutes)
     - Comprehensive: Above + architecture + API details + troubleshooting (30 minutes)
   - **Recommendation:** Standard level (15 minutes)
   - **Question:** What level of README detail is expected for iteration completion?

3. **Number Formatting: Thousand Separators?**
   - **Context:** Success criteria say "formatted display" but don't specify number formatting
   - **Options:**
     - Plain numbers: 200000 (simpler, no locale handling)
     - Formatted numbers: 200,000 (better readability, requires toLocaleString())
   - **Recommendation:** Use toLocaleString() for thousand separators (adds 5 minutes, significant UX improvement)
   - **Question:** Should numbers include thousand separators or display as plain integers?

4. **Global Installation Support**
   - **Context:** bin field in package.json enables `npm install -g` or `npm link` for global ghstats command
   - **Options:**
     - Local only: User runs `node ghstats.js owner/repo`
     - Global enabled: User can run `ghstats owner/repo` after npm link
   - **Recommendation:** Enable global installation (adds bin field to package.json, no code changes)
   - **Question:** Should global installation be enabled or is local execution sufficient for MVP?

5. **Loading Indicator During API Call**
   - **Context:** API requests take 100-500ms, master plan mentions "loading indicator"
   - **Options:**
     - No indicator: Silent wait (simpler)
     - Simple indicator: "Fetching repository stats..." (better UX, 5 minutes to implement)
     - Spinner: Animated spinner with ora library (adds dependency)
   - **Recommendation:** Simple "Fetching..." message (good UX, minimal effort)
   - **Question:** Should builder implement loading indicator? If yes, simple message or spinner?

6. **Error Exit Codes**
   - **Context:** CLI tools typically exit with code 1 on error, 0 on success (enables scripting)
   - **Options:**
     - Always exit 0 (simpler, doesn't support scripting)
     - Exit 1 on error (better practice, enables `ghstats owner/repo && echo success`)
   - **Recommendation:** Exit 1 on error (standard CLI practice, trivial to implement)
   - **Question:** Should different errors have different exit codes (1 for all vs. 1, 2, 3 for different errors)?

---

*Exploration completed: 2025-10-12*
*Explorer: explorer-1 (Architecture & Structure)*
*Iteration: 1 (global iteration 1)*
*Project: ghstats (GitHub Repository Statistics CLI Tool)*
