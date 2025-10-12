# Technology Stack

## Core Framework

**Decision:** Node.js 20.19.5 (minimum 18.0.0) with native fetch API

**Rationale:**
- Built-in fetch API eliminates need for external HTTP client dependencies (axios, node-fetch)
- ES modules support enables modern import/export syntax
- AbortController available for timeout handling
- Stable LTS version with long-term support until April 2026
- Zero HTTP dependencies reduces attack surface and installation time
- Verified available in development environment (20.19.5 detected)

**Alternatives Considered:**
- **Node.js 16**: Rejected - no built-in fetch, would require axios dependency
- **Bun/Deno**: Rejected - Node.js is explicitly specified in vision, wider adoption

**Implementation Notes:**
- Set `"engines": { "node": ">=18.0.0" }` in package.json
- Document Node.js 18+ requirement prominently in README
- Use `#!/usr/bin/env node` shebang in ghstats.js for direct execution
- Optional: Add version check at startup if compatibility is critical

---

## CLI Framework

**Decision:** commander.js ^12.0.0

**Rationale:**
- Explicitly specified in vision document as required CLI framework
- Mature, stable library (10+ years, millions of downloads/week)
- Lightweight (96KB, zero transitive dependencies)
- Automatic help text generation (--help, -h)
- Version flag support (--version, -V)
- Excellent documentation and examples
- Simple API for single-argument command

**Alternatives Considered:**
- **yargs**: Rejected - heavier (300KB+), more complex API, unnecessary features
- **minimist**: Rejected - too basic, no help generation, manual parsing required
- **oclif**: Rejected - enterprise framework, massive overkill for single-command tool

**Implementation Notes:**
- Install: `npm install commander`
- Import: `import { Command } from 'commander';`
- Use `.argument('<repository>', ...)` for single required argument
- Commander automatically handles missing arguments and --help flag

**Version Selection:**
- Latest stable: 14.0.1
- Recommended: ^12.0.0 (proven stability, master plan recommendation)
- Alternative: ^14.0.0 if latest features needed
- No breaking changes between 12.x and 14.x for our use case

---

## HTTP Client

**Decision:** Built-in fetch API (Node.js 18+)

**Rationale:**
- Zero dependencies - native to Node.js runtime
- Standard Web API - same as browser fetch
- Adequate for simple GET requests to GitHub API
- Promise-based with async/await support
- HTTP/2 support built-in
- AbortController integration for timeout handling
- Reduces npm install time and package size

**Alternatives Considered:**
- **axios**: Rejected - adds 500KB dependency, better defaults but unnecessary for single API endpoint
- **node-fetch**: Rejected - polyfill no longer needed with Node.js 18+
- **got**: Rejected - heavier alternative with advanced features we don't need

**Implementation Pattern:**
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ghstats-cli'
    }
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    // Handle HTTP errors
  }

  const data = await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle timeout
  }
}
```

---

## Module System

**Decision:** ES Modules (ESM)

**Rationale:**
- Modern JavaScript standard
- Cleaner import/export syntax vs CommonJS require()
- Top-level await support
- Required for some modern packages (chalk v5+ is ESM-only)
- Future-proof - Node.js moving toward ESM as default
- Better static analysis and tree-shaking potential

**Configuration:**
- Add `"type": "module"` to package.json
- Use `.js` file extensions (not `.mjs`)
- Include `.js` extension in all local imports: `import { x } from './lib/api-client.js';`

**Alternatives Considered:**
- **CommonJS**: Rejected - legacy module system, not future-proof

---

## GitHub API

**Decision:** GitHub REST API v3 (unauthenticated)

**Endpoint:** `GET https://api.github.com/repos/{owner}/{repo}`

**Authentication:** None (public API only, 60 requests/hour)

**Rationale:**
- Well-documented, stable API with backward compatibility
- No authentication required for public repository statistics
- Single endpoint provides all required metrics
- Rate limit adequate for casual use (60/hour)
- v3 is mature and widely used

**Response Fields:**
- `stargazers_count` → stars
- `forks_count` → forks
- `open_issues_count` → issues
- `subscribers_count` → watchers (NOT watchers_count - see critical note below)

**Critical Discovery: watchers_count vs subscribers_count**
- GitHub API has both `watchers_count` AND `subscribers_count` fields
- `watchers_count` returns **same value as stargazers_count** (legacy behavior)
- `subscribers_count` contains **actual repository watchers** (different value)
- **Use subscribers_count for watchers metric to avoid duplicate values**

**Rate Limiting:**
- Limit: 60 requests/hour per IP (unauthenticated)
- Detection: HTTP 403 with `x-ratelimit-remaining: 0` header
- Reset time: Parse `x-ratelimit-reset` header (Unix timestamp)
- Error message: Display reset time and suggest authentication

**Required Headers:**
- `Accept: application/vnd.github.v3+json` - API version specification
- `User-Agent: ghstats-cli` - GitHub requires User-Agent (best practice)

**Error Responses:**
- 200: Success
- 404: Repository not found (or private)
- 403: Rate limit exceeded
- 500/502/503: GitHub server error (rare)

---

## Output Formatting

**Decision:** Plain console.log() with template literals

**Number Formatting:** `toLocaleString('en-US')` for thousand separators

**Rationale:**
- No dependencies required
- Universal terminal compatibility
- Simple, clean output sufficient for MVP
- Number formatting dramatically improves readability (1,234 vs 1234)
- Aligns with master plan UX priorities

**Output Format:**
```
Repository: facebook/react
────────────────────────────────────────
Stars:           239,697
Forks:            49,565
Open Issues:       1,060
Watchers:          6,500
────────────────────────────────────────
```

**Optional Enhancement (Future):**
- **chalk ^5.3.0**: Terminal color support (green success, red errors)
- **Recommendation:** Defer to post-MVP iteration
- **Rationale:** Adds dependency, requires ESM import handling, not critical for success criteria

---

## External Integrations

### GitHub REST API v3

**Purpose:** Fetch repository statistics

**Library/SDK:** None - use built-in fetch directly

**Implementation:**
```javascript
async function fetchRepoStats(owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ghstats-cli'
      }
    }
  );

  // Handle response...
}
```

**Key Points:**
- No SDK needed - REST API is simple enough for direct fetch calls
- Timeout handling with AbortController (10 second limit)
- Status code checking before JSON parsing
- Rate limit header extraction for 403 errors

---

## Development Tools

### Testing

**Framework:** Manual testing only (no jest/mocha)

**Coverage target:** N/A (manual validation of all success criteria)

**Strategy:**
- Test with real GitHub repositories (facebook/react, microsoft/vscode)
- Validate all 5 error scenarios (validation, 404, 403, timeout, network)
- Cross-platform terminal testing (Linux primary, macOS/Windows optional)

**Rationale:**
- Project scope is simple (5-6 hours)
- Manual testing adequate for CLI tool with external API
- Real API testing more valuable than mocks
- Automated tests can be added in future iterations

### Code Quality

**Linter:** None required for MVP

**Formatter:** None required for MVP

**Type Checking:** None required (plain JavaScript, not TypeScript)

**Rationale:**
- MVP focus is on functionality, not tooling infrastructure
- Single builder doesn't need enforced style consistency
- Can add ESLint/Prettier in future if project grows

### Build & Deploy

**Build tool:** None required (no transpilation, no bundling)

**Deployment target:** Local execution (node ghstats.js owner/repo)

**CI/CD:** None required

**Rationale:**
- ES modules run directly in Node.js 18+
- No build step needed
- No deployment infrastructure (local CLI tool)

---

## Environment Variables

**None required for MVP.**

The tool uses unauthenticated GitHub API, so no secrets or configuration needed.

**Future Enhancement:**
- `GITHUB_TOKEN`: Personal access token for higher rate limits (5,000/hour)
- Implementation: Check for token, add `Authorization: token ${GITHUB_TOKEN}` header
- Defer to post-MVP iteration

---

## Dependencies Overview

### Production Dependencies

**commander@^12.0.0** - CLI argument parsing
- Size: ~96KB
- Transitive dependencies: 0
- License: MIT
- Purpose: Parse command-line arguments, generate help text

### Development Dependencies

**None required for MVP.**

### Built-in Dependencies (Node.js 18+)

**fetch API** - HTTP requests
- Built-in to Node.js 18+
- No installation needed

**AbortController** - Request timeout handling
- Built-in to Node.js 15+
- No installation needed

---

## Performance Targets

**Total Execution Time:** < 2 seconds (p95)

**Breakdown:**
- CLI startup + parsing: < 100ms
- Network request to GitHub: 100-500ms typical (varies by location)
- Response parsing: < 50ms
- Output formatting: < 50ms

**GitHub API Latency:**
- Typical: 100-500ms
- Slow network: 1-3 seconds
- Timeout threshold: 10 seconds (prevent indefinite hangs)

**Memory Usage:**
- Expected: 20-40MB (Node.js runtime + dependencies)
- Peak: < 50MB (single API response is ~2KB)

**Bundle Size:**
- Total npm install: < 1MB (commander + Node.js built-ins)
- No compilation or bundling needed

**Performance Notes:**
- No optimization needed for MVP (single synchronous operation)
- GitHub API latency is primary bottleneck (300-800ms)
- Local processing overhead minimal (< 100ms total)

---

## Security Considerations

**1. Input Validation**
- **Concern:** Malicious repository identifiers could cause injection attacks
- **Mitigation:** Regex validation before API call (`/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`)
- **Implementation:** Fail fast with clear error message for invalid input

**2. Dependency Security**
- **Concern:** Vulnerable dependencies in supply chain
- **Mitigation:** Only one production dependency (commander), zero transitive dependencies
- **Monitoring:** npm audit can check for vulnerabilities

**3. API Rate Limiting**
- **Concern:** Excessive API usage could be considered abuse
- **Mitigation:**
  - 10 second timeout prevents indefinite requests
  - No automatic retry logic (prevents API spam)
  - Clear rate limit error messages discourage rapid-fire usage

**4. Error Information Leakage**
- **Concern:** Error messages might expose sensitive information
- **Mitigation:** Error messages only contain user input (repository name) and public API responses
- **Implementation:** No stack traces or internal paths in user-facing errors

**5. User-Agent Header**
- **Concern:** GitHub requires User-Agent header to prevent anonymous scraping
- **Mitigation:** Always send `User-Agent: ghstats-cli` header
- **Implementation:** Include in all fetch requests

---

## Package.json Template

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

**Key Fields Explained:**
- `"type": "module"` - Enables ES modules (required)
- `"engines"` - Enforces Node.js 18+ requirement
- `"bin"` - Enables global installation (npm link or npm install -g)
- `"main"` - Entry point for imports (if needed later)
- Single dependency minimizes supply chain risk

---

*Technology stack designed for simplicity, zero HTTP dependencies, and modern JavaScript practices.*
*All decisions aligned with SIMPLE complexity rating and 5-6 hour implementation timeline.*
