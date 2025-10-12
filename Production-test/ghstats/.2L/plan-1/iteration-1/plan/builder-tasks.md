# Builder Task Breakdown

## Overview

**1 primary builder** will complete the entire project. The work is straightforward and tightly coupled - all features integrate naturally through a linear flow (CLI → API → Format → Display). Total estimated time: **5-6 hours**.

**No sub-builders needed.** The complexity is SIMPLE, and splitting work would add coordination overhead without benefits.

---

## Builder-1: Complete GitHub Stats CLI Tool

### Scope

Build a complete CLI tool that fetches and displays GitHub repository statistics with comprehensive error handling. This includes:
- Project setup (package.json, directory structure, dependencies)
- CLI interface with commander.js
- Input validation with regex
- GitHub API client with fetch
- Error handling for 5 distinct scenarios
- Output formatting with thousand separators
- Loading indicator
- README documentation

### Complexity Estimate

**SIMPLE** (but with significant error handling component)

**Rationale:**
- Single purpose: fetch and display 4 statistics
- Linear execution flow: CLI → API → Format → Display
- No complex state management, database, or authentication
- Well-defined error scenarios (5 types)
- Mature, stable dependencies (commander.js only)
- Error handling is 30-35% of effort but straightforward to implement

**No split recommended** - all components are tightly coupled and should be built together. Error handling is integral to the API client, not a separate concern.

### Success Criteria

- [ ] User can run `node ghstats.js owner/repo` successfully
- [ ] All 4 metrics display correctly: stars, forks, open issues, watchers
- [ ] Numbers formatted with thousand separators (1,234 not 1234)
- [ ] Invalid input format shows usage example
- [ ] Repository not found (404) displays helpful error message with suggestions
- [ ] Rate limit errors (403) show reset time and suggest authentication
- [ ] Network timeout (10s) displays clear error message
- [ ] Connection failures display "check internet connection" message
- [ ] Loading indicator displays during API call ("Fetching repository statistics...")
- [ ] Help text accessible via --help flag
- [ ] Version accessible via --version flag
- [ ] Exit code 0 on success, 1 on errors
- [ ] README includes prerequisites (Node.js 18+), installation, usage, examples
- [ ] Manual testing completed with 3+ real repositories
- [ ] All 5 error scenarios tested and verified

### Files to Create

**Root Directory:**
- `package.json` - Project configuration, dependencies, engines, bin field
- `.gitignore` - Exclude node_modules, .DS_Store, .env
- `ghstats.js` - Main entry point, CLI setup, orchestration, error handling
- `README.md` - Usage documentation, prerequisites, examples

**lib/ Directory:**
- `lib/api-client.js` - GitHub API interaction, fetch calls, timeout handling, error detection
- `lib/formatter.js` - Number formatting (toLocaleString), output display function

**Generated (by npm install):**
- `package-lock.json` - Dependency lock file

**Total:** 6 files to create, 1 generated

### Dependencies

**Depends on:** None (this is iteration 1 of 1, no prior work)

**Blocks:** Nothing (final iteration)

**External Dependencies:**
- GitHub REST API v3 (public endpoint, no authentication)
- Node.js 18+ runtime (built-in fetch API)
- npm for package management

### Implementation Notes

**Critical Technical Decisions:**

1. **Use `subscribers_count` for watchers, NOT `watchers_count`**
   - GitHub API quirk: `watchers_count` duplicates `stargazers_count`
   - `subscribers_count` contains actual watchers (different value)
   - This prevents showing identical stars and watchers

2. **Set 10 second timeout with AbortController**
   - Prevents indefinite hanging on slow/failed connections
   - Always clear timeout in finally block to prevent memory leak

3. **Validate input BEFORE API call**
   - Saves rate limit quota
   - Fails fast with clear error message
   - Regex: `/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`

4. **Use ES modules throughout**
   - Set `"type": "module"` in package.json
   - Include `.js` extension in all imports: `./lib/api-client.js`
   - Use import/export syntax (not require/module.exports)

5. **Error handling is 30-35% of development effort**
   - Build error handling alongside API client from start
   - Don't build "happy path only" then add errors later
   - Test each error scenario individually

6. **Keep it simple**
   - Plain console.log for output (no chalk, no colors)
   - Simple "Fetching..." message (no spinner library)
   - Manual testing only (no jest/mocha)
   - Defer enhancements to future iterations

**Common Pitfalls:**
- Forgetting `.js` extension in ES module imports (will cause module not found errors)
- Using `watchers_count` instead of `subscribers_count` (will show duplicate stars)
- Not checking `response.ok` before parsing JSON (fetch doesn't throw on 4xx/5xx)
- Forgetting to clear timeout (memory leak)
- Missing `"type": "module"` in package.json (import statements will fail)

**Performance Targets:**
- Total execution time: < 2 seconds (p95)
- API latency: 100-500ms typical
- Local processing: < 100ms
- No optimization needed (single synchronous operation)

### Patterns to Follow

**Reference patterns.md for complete code examples.** Key patterns:

1. **Project Setup Pattern**
   - package.json with `"type": "module"`, engines field, bin field
   - Single dependency: commander ^12.0.0

2. **CLI Entry Point Pattern (ghstats.js)**
   - `#!/usr/bin/env node` shebang
   - Commander setup with single argument
   - Input validation before API call
   - Loading indicator
   - Centralized error handler

3. **API Client Pattern (lib/api-client.js)**
   - AbortController for timeout
   - Fetch with headers: Accept, User-Agent
   - Check response.ok before JSON parsing
   - Handle 404, 403, timeout, generic errors
   - Extract 4 fields: stargazers_count, forks_count, open_issues_count, subscribers_count

4. **Output Formatter Pattern (lib/formatter.js)**
   - toLocaleString('en-US') for thousand separators
   - padStart() for right-aligned numbers
   - Separator line (40 dashes)
   - Extra newlines for spacing

5. **Error Handling Pattern**
   - Consistent error prefix: "✗ Error:"
   - Actionable suggestions for each error type
   - Exit code 1 for all errors
   - Use console.error (not console.log)

6. **Testing Pattern**
   - Manual testing with real repositories (facebook/react, microsoft/vscode)
   - Test all 5 error scenarios
   - Verify exit codes
   - Test --help and --version flags

### Testing Requirements

**Manual Testing (No Automated Tests)**

**Happy Path Tests:**
```bash
node ghstats.js facebook/react
node ghstats.js microsoft/vscode
node ghstats.js torvalds/linux
```
Expected: Statistics display with thousand separators, exit code 0

**Error Scenario Tests:**
```bash
# Invalid format
node ghstats.js invalid-format
node ghstats.js owner/repo/extra

# 404 Not Found
node ghstats.js nonexistent/fake
node ghstats.js invaliduser/invalidrepo

# Rate limit (hard to test, requires 60+ requests)
# Verify code logic manually

# Network timeout
# Temporarily disconnect internet and run command

# Help/Version
node ghstats.js --help
node ghstats.js --version
```

**Exit Code Testing:**
```bash
node ghstats.js facebook/react && echo "Success"
node ghstats.js invalid || echo "Failed as expected"
```

**Coverage Target:** All 6 success criteria validated, all 5 error scenarios tested

**No Unit Tests Required:** Manual testing is sufficient for this simple CLI tool with external API dependency. Can add jest/mocha in future iterations if project grows.

### Development Order

**Phase 1: Project Foundation (20 minutes)**
1. Create package.json with correct configuration
   - `"type": "module"` for ES modules
   - `"engines": { "node": ">=18.0.0" }`
   - `"bin"` field for global installation
   - commander dependency: `^12.0.0`
2. Create .gitignore (node_modules, .DS_Store, .env)
3. Create lib/ directory
4. Run `npm install` to install commander
5. Test that imports work (create skeleton files)

**Phase 2: CLI Skeleton (30 minutes)**
1. Create ghstats.js with shebang and commander setup
2. Implement single argument parsing
3. Add input validation with regex
4. Add --help and --version flags (automatic with commander)
5. Test: `node ghstats.js --help` should display usage
6. Test: `node ghstats.js invalid` should show validation error

**Phase 3: API Client (1 hour)**
1. Create lib/api-client.js
2. Implement fetchRepoStats function with fetch
3. Add AbortController for timeout (10 seconds)
4. Add required headers (Accept, User-Agent)
5. Check response.ok and handle HTTP errors
6. Parse JSON and extract 4 fields (use subscribers_count!)
7. Test with real repository: `node ghstats.js facebook/react`
8. Should fetch successfully (may not display nicely yet)

**Phase 4: Error Handling (1.5 hours)**
1. Implement 404 error handling in API client
2. Implement 403 rate limit handling with header parsing
3. Implement timeout handling (AbortError)
4. Implement centralized error handler in ghstats.js
5. Add specific error messages for each scenario
6. Add actionable suggestions to error messages
7. Test each error scenario individually
8. Verify exit codes (0 on success, 1 on errors)

**Phase 5: Output Formatter (30 minutes)**
1. Create lib/formatter.js
2. Implement formatStats with toLocaleString
3. Implement displayStats with proper layout
4. Add loading indicator before API call
5. Test output formatting with real repositories
6. Verify numbers have thousand separators

**Phase 6: Testing & Polish (1 hour)**
1. Test with multiple repositories (popular, small, edge cases)
2. Test all error scenarios (validation, 404, timeout, etc.)
3. Test help and version flags
4. Verify exit codes work correctly
5. Test on Linux (primary), optionally macOS/Windows
6. Make chmod +x ghstats.js for direct execution
7. Test global installation: `npm link` then `ghstats facebook/react`
8. Fix any issues discovered during testing

**Phase 7: Documentation (30 minutes)**
1. Create README.md
2. Add prerequisites section (Node.js 18+ requirement)
3. Add installation instructions
4. Add usage section with examples (facebook/react, microsoft/vscode)
5. Add options section (--help, --version)
6. Add error handling section
7. Add "How It Works" section
8. Review documentation for clarity

**Total Time: 5-6 hours**

### Potential Split Strategy

**NOT RECOMMENDED** - This is a simple, tightly coupled project that should be built by a single builder.

**Why no split:**
- All components integrate through linear flow (CLI → API → Format → Display)
- Error handling is integral to API client, can't be separated
- Total work is only 5-6 hours (well within single builder capacity)
- Communication overhead would exceed benefits
- Testing is easier with single builder who understands entire codebase

**If complexity unexpectedly increases (unlikely):**

**Warning signs that might suggest split:**
- Builder estimates error handling will take > 2 hours
- API integration reveals unexpected complexity
- Multiple retry strategies needed for reliability
- Additional GitHub API endpoints required

**Split strategy (only if absolutely necessary):**

**Foundation Builder (Builder-1):**
- Project setup (package.json, structure)
- CLI skeleton with commander
- Input validation
- README stub
- Estimated: 1 hour

**API Sub-builder (Builder-1A):**
- GitHub API client
- All error handling
- Timeout logic
- Estimated: 2.5 hours

**Display Sub-builder (Builder-1B):**
- Output formatter
- Number formatting
- Loading indicator
- README completion
- Estimated: 1 hour

**Integration & Testing (Builder-1):**
- Connect all pieces
- End-to-end testing
- Final polish
- Estimated: 1 hour

**Total with split: 5.5 hours + coordination overhead**

**Recommendation:** Do NOT split unless builder explicitly requests it after starting work.

---

## Builder Execution Order

**Single Sequential Execution:**

This is a one-builder project with no parallelization. The builder works through phases 1-7 in order.

**No dependencies between builders** (only one builder).

**No integration phase** (builder integrates as they build).

---

## Integration Notes

**Not applicable** - Single builder project, no separate integration phase.

**Integration happens naturally:**
- ghstats.js imports from lib/api-client.js and lib/formatter.js
- All imports use ES modules with `.js` extensions
- Testing happens incrementally during development
- Final end-to-end testing in Phase 6

**Shared patterns:**
- Error messages follow consistent format ("✗ Error:" prefix)
- Exit codes follow convention (0 success, 1 error)
- All functions documented with JSDoc comments
- Async/await used throughout (no callbacks or raw promises)

**No potential conflicts** - Single builder controls all files.

---

## Questions for Builder

### Q1: Should I implement colored output with chalk?

**Answer: NO - Defer to post-MVP iteration**

**Rationale:**
- Master plan explicitly says "optional chalk enhancement"
- Plain text output is sufficient for all success criteria
- Minimizes dependencies (only commander required)
- Can add chalk in future iteration if desired

### Q2: Should I implement a spinner for loading indicator?

**Answer: START with simple text, OPTIONALLY add spinner if time permits**

**Recommended approach:**
```javascript
// Simple text (2 minutes)
console.log('Fetching repository statistics...\n');

// Or basic spinner if time allows (10-15 minutes)
// See patterns.md for spinner implementation
```

**Rationale:**
- Simple text meets success criteria
- Spinner is nice-to-have but not required
- Prioritize core functionality first

### Q3: Should I create a separate validator.js module?

**Answer: NO - Keep validation inline in ghstats.js**

**Rationale:**
- Validation is only 10-15 lines of code (regex check)
- Separate module adds overhead without benefit
- Can extract to separate file later if validation logic grows

### Q4: Should I handle GitHub API server errors (500/502/503) separately?

**Answer: NO - Treat as generic error**

**Rationale:**
- Server errors are rare (99.9% API uptime)
- Generic error message is sufficient: "GitHub API error: 500"
- Special handling not worth the complexity

### Q5: How should I test rate limiting without making 60+ requests?

**Answer: Implement the handling logic and test manually if possible**

**Approaches:**
1. Trust the implementation (check headers, parse reset time)
2. Make 60+ requests if you have time (takes ~1 minute of rapid requests)
3. Manually mock a 403 response in code temporarily

**Rationale:**
- Rate limit handling is straightforward (check status, parse headers)
- Real testing would consume rate limit quota
- Code review of implementation is sufficient

### Q6: Should I add version check at startup?

**Answer: NO - Not required**

**Rationale:**
- package.json engines field already enforces Node.js 18+
- npm warns users on install if version mismatch
- README documents requirement
- Additional check is redundant

### Q7: Should I enable global installation (npm link)?

**Answer: YES - Include bin field in package.json**

**Implementation:**
```json
{
  "bin": {
    "ghstats": "./ghstats.js"
  }
}
```

**Rationale:**
- Enables `ghstats owner/repo` instead of `node ghstats.js owner/repo`
- Better UX, no code changes required
- Just a package.json configuration

### Q8: What should I do if I discover a complexity issue?

**Answer: Continue as single builder, report in completion notes**

**Process:**
1. Document the complexity issue
2. Implement a working solution
3. Note the issue in your completion report
4. Suggest improvements for future iterations

**Do NOT split into sub-builders** unless complexity truly exceeds 8-10 hours.

---

## Summary

**One builder, five phases, six hours.**

This is a straightforward CLI tool with well-defined scope. The builder has complete autonomy to implement all features using the patterns provided. The key to success is comprehensive error handling (30-35% of effort) and testing with real repositories.

**Success = All 15 success criteria met + manual testing complete + README written**

Good luck, Builder-1!

---

*Task breakdown designed for single builder execution with clear guidance and realistic time estimates.*
*No splits, no coordination overhead, just focused development.*
