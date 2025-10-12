# 2L Iteration Plan - GitHub Stats CLI Tool

## Project Vision

Build a focused, professional CLI tool that fetches and displays GitHub repository statistics with robust error handling and clean terminal output. The tool empowers developers to quickly check repository metrics (stars, forks, issues, watchers) from the command line without leaving their terminal workflow.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] User can run `node ghstats.js owner/repo` and see repository statistics
- [ ] Tool fetches and displays all 4 metrics: stars, forks, open issues, watchers
- [ ] Repository not found (404) errors display helpful "repository not found" message
- [ ] Rate limit errors are caught and displayed with reset time information
- [ ] Network errors are handled gracefully with clear user-facing messages
- [ ] Output is formatted with thousand separators and clear labels
- [ ] Invalid input format displays usage example (owner/repo)
- [ ] Help text accessible via --help flag
- [ ] Exit code 0 on success, 1 on errors (enables shell scripting)
- [ ] README includes installation, usage, examples, and Node.js requirement

## MVP Scope

**In Scope:**

- CLI interface with commander.js for argument parsing
- GitHub REST API v3 integration (unauthenticated, public repos only)
- Input validation with regex (fail fast before API calls)
- Comprehensive error handling:
  - Invalid input format (malformed owner/repo)
  - Repository not found (404)
  - Rate limit exceeded (403 with reset time)
  - Network timeout (10 second limit)
  - Connection failures (DNS, network down)
- Output formatting:
  - Repository name header
  - Four metrics with labels
  - Thousand separators for numbers (1,234 not 1234)
  - Clean terminal layout
- Loading indicator ("Fetching repository statistics...")
- Project setup:
  - package.json with Node.js 18+ engine requirement
  - ES modules (type: "module")
  - Single dependency: commander.js
  - .gitignore for node_modules
- Documentation:
  - README with usage instructions
  - Usage examples
  - Error scenario documentation
  - Node.js version requirement

**Out of Scope (Post-MVP):**

- GitHub authentication (use unauthenticated API only)
- Multiple repository comparison
- Historical data or trends
- Colored output with chalk (defer to future iteration)
- Caching of results
- JSON/CSV export formats
- Publishing to npm registry
- Automated test suite (manual testing sufficient for MVP)
- Configuration files
- Interactive prompts

## Development Phases

1. **Exploration** ✅ Complete
   - Master exploration: Architecture, dependencies, UX, performance
   - Iteration exploration: Structure, technology patterns

2. **Planning** 🔄 Current
   - Creating comprehensive development plan
   - Defining patterns and builder tasks

3. **Building** ⏳ 5-6 hours
   - Single builder implements all features
   - Modular structure with lib/ directory

4. **Integration** ⏳ N/A
   - No separate integration phase (single builder)
   - Testing happens during building

5. **Validation** ⏳ 30 minutes
   - Manual testing with real GitHub repositories
   - Error scenario verification

6. **Deployment** ⏳ N/A
   - Local execution only (no deployment)
   - Optional: npm link for global installation

## Timeline Estimate

- Exploration: ✅ Complete
- Planning: ✅ Complete
- Building: 5-6 hours (single builder, no parallel work)
  - Project setup: 20 minutes
  - CLI parsing: 30 minutes
  - Input validation: 20 minutes
  - API client: 1 hour
  - Error handling: 1.5 hours (30-35% of effort)
  - Output formatting: 30 minutes
  - Testing & polish: 1 hour
  - Documentation: 30 minutes
- Total: ~6 hours

## Risk Assessment

### High Risks

**None identified.** This is a simple, well-scoped project with mature technologies.

### Medium Risks

**1. Rate Limit Exhaustion During Development**
- **Risk:** Developer hits 60 requests/hour limit during testing
- **Impact:** Slows development, blocks testing
- **Mitigation strategy:**
  - Test with stable, known repositories (facebook/react, microsoft/vscode)
  - Space out API calls during testing
  - Implement rate limit error handling with reset time display
  - Consider using personal access token for development (5,000 req/hour)
  - Current status: 57/60 remaining (verified accessible)

**2. Node.js Version Compatibility**
- **Risk:** Users with Node.js < 18 cannot run tool
- **Impact:** Tool crashes with "fetch is not defined" error
- **Mitigation strategy:**
  - Specify engines field in package.json: `"node": ">=18.0.0"`
  - npm warns users with older versions at install time
  - Document Node.js 18+ requirement prominently in README
  - Add version check at startup (optional enhancement)

**3. Error Handling Scope Creep**
- **Risk:** Over-engineering error handling beyond 5 core scenarios
- **Impact:** Development time exceeds 1.5 hour estimate
- **Mitigation strategy:**
  - Focus on 5 primary error types (validation, 404, 403, timeout, network)
  - Use catch-all generic error for unexpected scenarios
  - Don't implement retry logic (out of scope)
  - Timebox error handling to 1.5 hours maximum

### Low Risks

**1. GitHub API Availability**
- **Risk:** GitHub API outage
- **Impact:** Tool cannot function
- **Likelihood:** Very low (99.9% uptime)
- **Mitigation:** Clear error message pointing to GitHub status page

**2. Terminal Output Rendering**
- **Risk:** Different terminals render output differently
- **Impact:** Formatting looks incorrect
- **Likelihood:** Very low (using simple console.log)
- **Mitigation:** Use universally supported plain text, test on major platforms

## Integration Strategy

**No integration phase required** - This is a single-builder project with no parallel work. The builder creates all components in a natural development order:

1. Set up project structure (package.json, directories)
2. Install commander.js dependency
3. Create CLI skeleton with argument parsing
4. Implement input validation
5. Build GitHub API client with error handling
6. Create output formatter
7. Test end-to-end with real repositories
8. Write README documentation

All modules (ghstats.js, lib/api-client.js, lib/formatter.js) are built by the same builder and integrate naturally through ES module imports.

## Deployment Plan

**Local Execution Only** - This tool runs directly on the user's machine:

1. User clones/downloads project
2. User runs `npm install` to install commander.js
3. User runs `node ghstats.js owner/repo` to fetch statistics
4. **Optional:** User runs `npm link` for global installation
   - Enables running `ghstats owner/repo` without `node` prefix
   - Uses bin field in package.json

**No deployment infrastructure** - No servers, no hosting, no CI/CD. The tool is distributed as source code that users run locally.

**Future consideration:** Publish to npm registry (explicitly out of scope for MVP per vision document).

---

*Created: 2025-10-12*
*Iteration: 1 of 1*
*Complexity: SIMPLE*
*Builder Count: 1*
