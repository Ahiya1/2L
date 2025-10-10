# Builder Task Assignment - Iteration 2

## Decision: Single Builder

**Recommendation followed:** Explorer-1 recommended 1 builder (TRIVIAL-LOW complexity, 3-4 hours total)

**Rationale:**
- All three features are independent and sequential
- Total effort: 3-4 hours (well within single builder capacity)
- No complex logic or system integration required
- Documentation work benefits from consistent authorship (unified voice and style)
- No parallelization benefit - tasks are naturally sequential:
  1. Create `/2l-check-mcps` command (foundation for MCP section in README)
  2. Write comprehensive README (references the command created in step 1)
  3. Cross-reference and polish (ensures consistency between both files)
- Lower coordination overhead compared to splitting
- Precedent: Iteration 1 used 4 builders for actual implementation (13 files, event system logic, dashboard commands) - this iteration is pure documentation

**Builder assignment:** 1 builder owns all deliverables

---

## Builder 1: Documentation & Verification Specialist

### Responsibility
Complete owner of iteration 2 deliverables:
- MCP verification command creation
- Comprehensive README documentation
- Cross-referencing and accuracy validation

### Total Estimated Time: 3-4 hours

---

## Tasks (Sequential Order)

### Task 1: Create `/2l-check-mcps` Command
**File:** `/home/ahiya/.claude/commands/2l-check-mcps.md`
**Estimated:** 45-60 minutes
**Complexity:** TRIVIAL

#### Requirements

Create an informational command that lists all 4 MCPs with setup guidance. This is NOT a technical verification tool (Claude doesn't expose MCP connection status API), but an educational resource.

**Command purpose:**
- List 4 MCPs: Playwright, Chrome DevTools, Supabase Local, Screenshot
- For each MCP:
  - Name and primary use case
  - Purpose (what problem it solves)
  - Status: "⚠️ Optional - Not required for core 2L functionality"
  - Setup link to official documentation
  - What it enables (specific example use cases)
- Fast execution (<1 second - information display only)
- Clear messaging: ALL MCPs are OPTIONAL

**Structure (follow patterns.md):**
1. Title and description
2. Usage section (bash code block)
3. "What This Does" section
4. MCP details (all 4 MCPs)
5. Setup instructions section
6. Implementation section (bash script that displays formatted output)

**Output format:**
```
🔍 2L MCP Connection Status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MCP Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 All MCPs are OPTIONAL - 2L works without them!

MCPs enhance agent capabilities during orchestration:

1. Playwright MCP (Browser Automation)
   Purpose: E2E testing, user flow validation
   Status: ⚠️ Optional
   Setup: https://github.com/executeautomation/playwright-mcp-server
   Enables: Frontend testing, form automation, navigation checks

2. Chrome DevTools MCP (Performance Profiling)
   Purpose: Performance analysis, debugging
   Status: ⚠️ Optional
   Setup: [Link to official repo]
   Enables: Performance traces, network analysis, screenshots

3. Supabase Local MCP (Database Validation)
   Purpose: PostgreSQL schema validation, SQL queries
   Status: ⚠️ Optional
   Setup: [Link to official repo]
   Enables: Database testing, schema verification

4. Screenshot MCP (Visual Capture)
   Purpose: Screenshot capture for documentation
   Status: ⚠️ Optional
   Setup: [Link to official repo]
   Enables: Visual documentation during orchestration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setup Instructions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Configure MCPs in Claude Desktop settings
2. Edit claude_desktop_config.json
3. Add MCP server configurations
4. Restart Claude Desktop

For detailed setup: See README.md "MCP Integration" section
```

#### Acceptance Criteria (from master plan)

- [ ] New command `/2l-check-mcps` exists at correct path
- [ ] Lists all 4 MCPs: Playwright, Chrome DevTools, Supabase Local, Screenshot
- [ ] Each MCP shows: name, purpose, status (optional), setup link, what it enables
- [ ] Clear messaging: "All MCPs are OPTIONAL"
- [ ] Setup instructions provided
- [ ] Output format follows existing command patterns (emoji, box-drawing chars)
- [ ] Fast execution (<1 second)

#### Reference Files

**For MCP descriptions:**
- `/home/ahiya/.claude/agents/2l-builder.md` lines 16-60 (MCP documentation patterns)
- Master plan: `/home/ahiya/Ahiya/2L/.2L/plan-2/master-plan.yaml` lines 156-174

**For command structure patterns:**
- `/home/ahiya/.claude/commands/2l-status.md` (output format with emoji and box drawing)
- `/home/ahiya/.claude/commands/2l-dashboard.md` (command structure example)

#### Validation Steps

After creating the file:
```bash
# 1. Verify file exists
ls -lh /home/ahiya/.claude/commands/2l-check-mcps.md

# 2. Check structure
grep "^## " /home/ahiya/.claude/commands/2l-check-mcps.md
# Expected: Usage, What This Does, Implementation sections

# 3. Verify all 4 MCPs listed
grep -i "playwright\|devtools\|supabase\|screenshot" /home/ahiya/.claude/commands/2l-check-mcps.md | wc -l
# Expected: At least 4 matches

# 4. Test readability
cat /home/ahiya/.claude/commands/2l-check-mcps.md | head -50
```

---

### Task 2: Create Comprehensive README
**File:** `/home/ahiya/Ahiya/2L/README.md`
**Estimated:** 2-2.5 hours
**Complexity:** LOW

#### Requirements

Create a brand new README.md (does not currently exist) with 8 required sections documenting the complete 2L system.

**CRITICAL:** This is documentation work, not invention. Every technical detail must be verified against actual implementation files from iteration 1.

#### Section 1: Overview & Quick Start (15 minutes)

**Content:**
- **What is 2L?** - Brief explanation of orchestration system
- **Core workflow:** `/2l-vision` → `/2l-plan` → `/2l-mvp`
- **Quick example:** Show simple command and what happens
- **Target audience:** Developers building MVPs with AI agents

**Example structure:**
```markdown
# 2L - Two-Level Orchestration System

2L is an AI agent orchestration system that breaks down complex development tasks into manageable iterations executed by specialized agents.

## Quick Start

\`\`\`bash
# Start with a vision
/2l-vision

# Or go straight to implementation
/2l-mvp "Build a todo app with React and Supabase"
\`\`\`

2L will:
1. Break your vision into iterations
2. Spawn specialized agents (explorers, planners, builders)
3. Integrate their work
4. Validate results
5. Commit to git and push to GitHub

[Continue with more details...]
```

**No code references needed** - this is introductory content

#### Section 2: Event System Architecture (30-40 minutes)

**CRITICAL SECTION:** Document iteration 1's event system accurately.

**Content:**
- **Why events?** - Observability, debugging, real-time monitoring, non-blocking
- **Event flow diagram** (text-based):
  ```
  Orchestrator ──┬──> .2L/events.jsonl ←──┬── Agents
                 │                         │
                 └─> 28 emission points    └─> agent_start + agent_complete

  Dashboard polls events.jsonl every 2 seconds ──> Real-time display
  ```
- **8 event types:**
  1. `plan_start` - Orchestration begins
  2. `iteration_start` - New iteration starts
  3. `phase_change` - Phase transitions (exploration → planning → building → etc.)
  4. `complexity_decision` - Builder decides COMPLETE or SPLIT
  5. `agent_start` - Agent begins work
  6. `agent_complete` - Agent finishes work
  7. `validation_result` - Validation PASS/FAIL
  8. `iteration_complete` - Iteration finishes

- **Event format schema:**
  ```json
  {
    "timestamp": "2025-10-08T18:00:00Z",
    "event_type": "plan_start",
    "phase": "initialization",
    "agent_id": "orchestrator",
    "data": "Plan test-plan started in MASTER mode"
  }
  ```

- **Event file location:** `.2L/events.jsonl` (JSONL format - one JSON object per line)
- **Orchestrator emissions:** 28 documented `log_2l_event` calls
- **Agent emissions:** All 10 agents emit `agent_start` + `agent_complete`
- **Why JSONL format?** - Append-only, streaming-friendly, human-readable

**Source files to reference (MUST READ):**
- `/home/ahiya/Ahiya/2L/.2L/plan-2/iteration-1/validation/validation-report.md` lines 232-273 (event format validation)
- `/home/ahiya/.claude/commands/2l-mvp.md` (orchestrator with 28 emission points)
- `/home/ahiya/.claude/agents/2l-builder.md` lines 60-90 (example agent Event Emission section)

**Validation:** Cross-check event types against validation report line 192-201

#### Section 3: Dashboard Access (25-35 minutes)

**CRITICAL SECTION:** Document iteration 1's dashboard commands accurately.

**Content:**
- **`/2l-dashboard` command:** Start dashboard server
  - Usage: `/2l-dashboard` (no arguments)
  - What it does:
    1. Checks for dashboard HTML (spawns builder if missing)
    2. Reuses existing server if running
    3. Finds available port (8080-8099 range)
    4. Starts Python http.server
    5. Opens browser automatically

- **Why HTTP server?** - Browser CORS restrictions prevent `file://` protocol from fetching `.2L/events.jsonl`. Modern browsers require HTTP for fetch API.

- **Port allocation:**
  - Dynamic allocation (finds first available port in 8080-8099)
  - Stores port in `.2L/dashboard/.server-port`
  - Stores PID in `.2L/dashboard/.server-pid`
  - Reuses same port on subsequent runs if server still running

- **Multi-project support:**
  - Each project gets unique port
  - 20 concurrent dashboards supported (8080-8099 = 20 ports)
  - State files in `.2L/dashboard/` (project-specific)

- **`/2l-dashboard-stop` command:** Stop dashboard server
  - Kills server process (SIGTERM)
  - Removes state files (`.server-pid`, `.server-port`)
  - Validates process ownership before kill (security)

- **Dashboard features:**
  - Real-time event timeline (polls `.2L/events.jsonl` every 2 seconds)
  - Active agent tracking with duration calculation
  - Orchestration metrics (elapsed time, total events, active agents)
  - Phase visualization
  - Last 50 events displayed with color coding

**Source files to reference (MUST READ):**
- `/home/ahiya/.claude/commands/2l-dashboard.md` (complete implementation)
- `/home/ahiya/.claude/commands/2l-dashboard-stop.md` (stop command)
- Validation report lines 136-179 (dashboard command testing results)

**Code examples:**
```bash
# Start dashboard
/2l-dashboard
# Output: ✓ Dashboard server started
#         URL: http://localhost:8080/dashboard/index.html
#         Port: 8080
#         PID: 123456

# Stop dashboard
/2l-dashboard-stop
# Output: ✓ Dashboard server stopped (port 8080, PID 123456)
```

#### Section 4: MCP Integration (20-30 minutes)

**CRITICAL SECTION:** Document all 4 MCPs with accurate capabilities.

**Content:**
- **What are MCPs?** - Model Context Protocol servers that extend agent capabilities
- **ALL MCPs are OPTIONAL** - Emphasize multiple times
- **4 MCPs available:**

  1. **Playwright MCP (Browser Automation)**
     - Purpose: E2E testing, user flow validation
     - Capabilities: Navigate, fill forms, click elements, execute JavaScript, wait for elements
     - Setup: https://github.com/executeautomation/playwright-mcp-server
     - Enables: Frontend testing, form automation, navigation checks

  2. **Chrome DevTools MCP (Performance Profiling)**
     - Purpose: Performance analysis, debugging
     - Capabilities: Record traces, analyze network, capture console, CPU/network emulation, screenshots
     - Setup: [Link to official repo - research actual URL]
     - Enables: Performance traces, network analysis, console debugging

  3. **Supabase Local MCP (Database Validation)**
     - Purpose: PostgreSQL schema validation, SQL queries
     - Capabilities: Execute SQL, inspect schema, test database operations
     - Setup: [Link to official repo - research actual URL]
     - Enables: Database testing, schema verification, SQL validation

  4. **Screenshot MCP (Visual Capture)**
     - Purpose: Screenshot capture for documentation
     - Capabilities: Capture screen, save images
     - Setup: [Link to official repo - research actual URL]
     - Enables: Visual documentation during orchestration

- **Setup instructions:**
  1. Configure in Claude Desktop settings
  2. Edit `claude_desktop_config.json`
  3. Add MCP server configurations
  4. Restart Claude Desktop

- **Verification:** Use `/2l-check-mcps` command (created in Task 1)

**Source files to reference (MUST READ):**
- `/home/ahiya/.claude/agents/2l-builder.md` lines 16-60 (MCP descriptions with capabilities)
- `/home/ahiya/.claude/commands/2l-check-mcps.md` (created in Task 1 - cross-reference)

**Code examples:**
```bash
# Check MCP status
/2l-check-mcps
# Shows all 4 MCPs with setup links
```

#### Section 5: GitHub Integration (20-30 minutes)

**CRITICAL SECTION:** Document actual `gh` CLI behavior (no invention).

**Content:**
- **Why `gh` CLI?** (Not GitHub MCP)
  - **Reliability:** Direct CLI more stable than MCP server dependencies
  - **Simplicity:** Standard tool with consistent behavior
  - **Authentication:** Leverages existing `gh auth login` workflow
  - **Graceful degradation:** Works offline or without GitHub

- **Setup steps:**
  1. Install GitHub CLI:
     ```bash
     # Ubuntu/Debian
     sudo apt install gh

     # macOS
     brew install gh

     # Or download from: https://cli.github.com/
     ```

  2. Authenticate:
     ```bash
     gh auth login
     # Follow prompts to authenticate with GitHub account
     ```

  3. Verify:
     ```bash
     gh auth status
     # Expected: ✓ Logged in to github.com as username
     ```

- **What gets pushed automatically:**
  - **Repository creation:** Uses project directory name (e.g., `my-app`)
  - **Commits:** After each iteration
  - **Tags:** Format `2l-plan-{X}-iter-{Y}` (e.g., `2l-plan-1-iter-2`)
  - **Commit format:**
    ```
    feat: Iteration {N} - {feature description}

    {Detailed changes}

    🤖 Generated with 2L
    ```

- **Graceful degradation:**
  - If `gh` CLI not installed: Shows warning, continues with local git
  - If not authenticated: Shows warning, continues with local git
  - You can push manually later with `git push`

- **Troubleshooting:**
  - **"gh not found":** Install GitHub CLI (see setup above)
  - **"gh not authenticated":** Run `gh auth login`
  - **"Failed to create repo":** Check network, verify account has repo creation permissions
  - **"Push failed":** Check internet connection, verify remote exists with `git remote -v`

**Source files to reference (MUST READ):**
- `/home/ahiya/.claude/commands/2l-mvp.md` lines 1512-1592 (`setup_github_repo()` function implementation)
- Explorer report lines 69-167 (GitHub integration analysis)

**Validation:** Quote actual function behavior from source code

#### Section 6: Setup Verification (15-20 minutes)

**Content:**
- **Prerequisites checklist:**
  - [ ] Python 3 installed (for dashboard HTTP server)
  - [ ] Git installed (for version control)
  - [ ] gh CLI installed and authenticated (optional, for GitHub integration)
  - [ ] Claude Desktop with 2L commands configured

- **Verification steps:**

  **Step 1: Check MCP status (optional)**
  ```bash
  /2l-check-mcps
  # Shows which MCPs are available
  # All MCPs are optional - 2L works without them
  ```

  **Step 2: Check GitHub CLI (optional)**
  ```bash
  gh auth status
  # Expected: ✓ Logged in to github.com
  # If not installed: Install following "GitHub Integration" section
  ```

  **Step 3: Test orchestration**
  ```bash
  /2l-mvp "Create a simple hello world app"
  # Should generate .2L directory and events.jsonl
  ```

  **Step 4: Open dashboard**
  ```bash
  /2l-dashboard
  # Should open browser showing real-time events
  ```

- **Expected outcomes:**
  - Events appear in `.2L/events.jsonl` during orchestration
  - Dashboard displays events in real-time
  - GitHub repo created automatically (if gh CLI configured)

**No source files needed** - this is instructional content

#### Section 7: Troubleshooting (25-30 minutes)

**Content:**

**Issue 1: Dashboard shows no events**
- **Symptom:** Dashboard opens but timeline is empty
- **Check:** Does `.2L/events.jsonl` exist?
  ```bash
  ls -la .2L/events.jsonl
  ```
- **Solution:** Run an orchestration to generate events
  ```bash
  /2l-mvp "Simple test task"
  ```
- **Cause:** No events have been generated yet

**Issue 2: MCP connection issues**
- **Symptom:** Agent mentions MCP not available
- **Check:** MCPs configured in `claude_desktop_config.json`
- **Solution:**
  1. Verify MCP configuration in Claude Desktop settings
  2. Restart Claude Desktop after config changes
  3. Run `/2l-check-mcps` to see setup links
- **Remember:** All MCPs are optional - 2L works without them

**Issue 3: GitHub push failures**
- **Symptom:** "Failed to push to GitHub" error
- **Check:** `gh auth status` shows authenticated
  ```bash
  gh auth status
  # Should show: ✓ Logged in to github.com
  ```
- **Check:** Network connection working
- **Solution:**
  - Re-authenticate: `gh auth login`
  - Verify remote exists: `git remote -v`
  - Try manual push: `git push origin main`
- **Remember:** GitHub integration is optional - 2L works with local git only

**Issue 4: Port conflicts (dashboard)**
- **Symptom:** "All dashboard ports (8080-8099) are in use"
- **Check:** Which ports are occupied
  ```bash
  lsof -i :8080-8099
  ```
- **Solution:** Stop a dashboard in another project
  ```bash
  cd /path/to/other/project
  /2l-dashboard-stop
  ```
- **Cause:** 20 concurrent dashboards already running

**Issue 5: Agent doesn't emit events**
- **Symptom:** Some agents don't show in dashboard
- **Check:** Event logger library exists
  ```bash
  ls -la ~/.claude/lib/2l-event-logger.sh
  ```
- **Expected:** Graceful degradation - agents work without events
- **Solution:** Event emission is non-blocking - agents continue working

**Source files to reference:**
- Dashboard command testing results (validation report lines 136-179)
- GitHub integration analysis (explorer report lines 69-167)

#### Section 8: Architecture Decisions (15-20 minutes)

**Content:**

**Decision 1: Why JSONL for events?**
- **Reason 1:** Append-only format (no file locking required)
- **Reason 2:** Streaming-friendly (parse line by line without loading full file)
- **Reason 3:** Human-readable and tool-friendly
- **Alternative considered:** SQLite database
- **Why not SQLite:** More complexity, not needed for MVP, JSONL simpler for debugging

**Decision 2: Why `gh` CLI instead of GitHub MCP?**
- **Reason 1:** Simpler dependency (standard tool, widely installed)
- **Reason 2:** More reliable (no MCP server process to manage)
- **Reason 3:** Graceful degradation (clear error messages, works without GitHub)
- **Reason 4:** Consistent behavior across platforms
- **Alternative considered:** GitHub MCP
- **Why not GitHub MCP:** Additional complexity, less reliable, harder to debug

**Decision 3: Why polling for dashboard?**
- **Reason 1:** Simplicity (no WebSocket server needed)
- **Reason 2:** Cross-platform (works everywhere without additional dependencies)
- **Reason 3:** Low overhead (2-second interval, minimal load)
- **Reason 4:** Works with static file serving (no backend required)
- **Alternative considered:** WebSocket real-time streaming
- **Why not WebSocket:** Over-engineering for MVP, adds complexity, polling is sufficient

**Decision 4: Why HTTP server for dashboard?**
- **Reason 1:** Browser security (CORS blocks `file://` protocol from fetching files)
- **Reason 2:** Modern web standards (fetch API requires HTTP for local file access)
- **Reason 3:** Localhost-only binding (secure - no external access)
- **Reason 4:** Multi-project support (dynamic port allocation)
- **Alternative considered:** File watching and reload
- **Why not file watching:** Browser security prevents `file://` protocol from fetching `.2L/events.jsonl`

**Source files to reference:**
- Master plan strategic insights (lines 263-279)
- Explorer report architecture analysis

#### Acceptance Criteria (from master plan)

After completing all 8 sections:

- [ ] README.md created at `/home/ahiya/Ahiya/2L/README.md`
- [ ] All 8 sections present: Overview, Event System, Dashboard, MCPs, GitHub, Setup, Troubleshooting, Architecture
- [ ] Event system architecture documented accurately (8 event types, format schema, JSONL explanation)
- [ ] MCP requirements clarified (all 4 MCPs, all optional)
- [ ] GitHub integration using `gh` CLI documented (not GitHub MCP)
- [ ] Setup verification steps included (4-step checklist)
- [ ] Architecture decisions explained (4 major decisions with rationale)
- [ ] Troubleshooting section covers 5 common issues
- [ ] All technical details verified against source files
- [ ] No invented features or non-existent behavior

#### Validation Steps

After completing README:
```bash
# 1. Verify file exists
ls -lh /home/ahiya/Ahiya/2L/README.md

# 2. Verify all 8 sections present
grep "^## " /home/ahiya/Ahiya/2L/README.md
# Expected output (8 lines):
# ## Overview & Quick Start
# ## Event System Architecture
# ## Dashboard Access
# ## MCP Integration
# ## GitHub Integration
# ## Setup Verification
# ## Troubleshooting
# ## Architecture Decisions

# 3. Verify event types documented
grep "plan_start\|iteration_start\|phase_change\|complexity_decision\|agent_start\|agent_complete\|validation_result\|iteration_complete" /home/ahiya/Ahiya/2L/README.md
# Should find references to all 8 event types

# 4. Verify 4 MCPs documented
grep -i "playwright\|chrome.*devtools\|supabase\|screenshot" /home/ahiya/Ahiya/2L/README.md | wc -l
# Expected: At least 4 matches

# 5. Verify GitHub CLI documented
grep "gh auth\|gh repo create" /home/ahiya/Ahiya/2L/README.md
# Should find GitHub CLI commands

# 6. Check cross-references
grep "/2l-check-mcps\|/2l-dashboard" /home/ahiya/Ahiya/2L/README.md
# Should find references to commands
```

---

### Task 3: Cross-Reference and Polish
**Estimated:** 20-30 minutes
**Complexity:** TRIVIAL

#### Requirements

Ensure consistency between `/2l-check-mcps` command and README, validate all technical details, and polish documentation.

**Activities:**

1. **Cross-reference validation:**
   - README "MCP Integration" section references `/2l-check-mcps` command
   - Both documents describe same 4 MCPs with consistent information
   - Setup links match in both documents

2. **Technical accuracy check:**
   - All event types in README match validation report (8 types)
   - All command names match actual files in `/home/ahiya/.claude/commands/`
   - All event format examples match validated schema
   - All code examples are accurate and tested

3. **Link validation:**
   - All cross-references point to correct sections
   - All external links open successfully
   - All anchor links work (e.g., `#event-system-architecture`)

4. **Consistency check:**
   - Terminology consistent across both documents
   - Tone consistent (professional, clear, helpful)
   - Code style consistent (bash, JSON, YAML formatting)

5. **Proofreading:**
   - Fix typos and grammar errors
   - Ensure all code blocks have language specified
   - Check list formatting consistency
   - Verify all file paths use absolute paths

#### Validation Steps

```bash
# 1. Cross-reference check: README mentions /2l-check-mcps
grep "/2l-check-mcps" /home/ahiya/Ahiya/2L/README.md
# Expected: At least 1 reference

# 2. Consistency check: Both documents list same MCPs
grep -i "playwright\|devtools\|supabase\|screenshot" /home/ahiya/.claude/commands/2l-check-mcps.md > /tmp/mcps-command.txt
grep -i "playwright\|devtools\|supabase\|screenshot" /home/ahiya/Ahiya/2L/README.md > /tmp/mcps-readme.txt
# Manually compare: Should describe same 4 MCPs

# 3. Event type accuracy check
grep "plan_start\|iteration_start\|phase_change\|complexity_decision\|agent_start\|agent_complete\|validation_result\|iteration_complete" /home/ahiya/Ahiya/2L/README.md | wc -l
# Expected: Multiple references to all 8 types

# 4. Command name validation
ls /home/ahiya/.claude/commands/2l-dashboard.md
ls /home/ahiya/.claude/commands/2l-dashboard-stop.md
ls /home/ahiya/.claude/commands/2l-check-mcps.md
# All should exist

# 5. Anchor link test (manual)
# Open README in editor, check all [text](#anchor) links point to existing headers
```

#### Acceptance Criteria

- [ ] README references `/2l-check-mcps` command
- [ ] Both documents describe same 4 MCPs consistently
- [ ] All command names match actual files
- [ ] All event types match validation report
- [ ] All cross-references validated
- [ ] All code examples tested
- [ ] No typos or grammar errors
- [ ] Consistent terminology and tone

---

## Files to Create

### New Files (2 total)
1. `/home/ahiya/.claude/commands/2l-check-mcps.md` - MCP verification command
2. `/home/ahiya/Ahiya/2L/README.md` - Comprehensive README

### Files to Reference (Read-Only)

**For accuracy validation:**
1. `/home/ahiya/Ahiya/2L/.2L/plan-2/iteration-1/validation/validation-report.md` - Complete validation details, event format, success criteria
2. `/home/ahiya/.claude/commands/2l-mvp.md` - Orchestrator implementation (lines 1512-1592 for GitHub functions, full file for event emissions)
3. `/home/ahiya/.claude/commands/2l-dashboard.md` - Dashboard command behavior
4. `/home/ahiya/.claude/commands/2l-dashboard-stop.md` - Stop command behavior
5. `/home/ahiya/.claude/commands/2l-status.md` - Command structure example
6. `/home/ahiya/.claude/agents/2l-builder.md` - MCP documentation (lines 16-60), Event Emission section example (lines 60-90)
7. `/home/ahiya/Ahiya/2L/.2L/plan-2/master-plan.yaml` - Iteration 2 requirements (lines 144-240)
8. `/home/ahiya/Ahiya/2L/.2L/plan-2/iteration-2/exploration/explorer-1-report.md` - Detailed exploration findings

---

## Success Criteria (from master plan)

All 7 criteria must be met:

1. **`/2l-check-mcps` command reports accurate MCP status**
   - Verification: Run command, check output format
   - Expected: Lists 4 MCPs with setup instructions
   - Test: `cat /home/ahiya/.claude/commands/2l-check-mcps.md | grep -i "playwright\|devtools\|supabase\|screenshot"`

2. **MCP check shows status for all 4 MCPs with setup links**
   - Verification: Read command file, verify all 4 MCPs listed
   - Expected: Each MCP has setup link to official documentation
   - Test: `grep "Setup:\|setup:" /home/ahiya/.claude/commands/2l-check-mcps.md | wc -l` (expect 4+)

3. **GitHub CLI workflow verified in documentation**
   - Verification: README documents gh detection, auth check, repo creation, push, tags
   - Expected: Setup section, troubleshooting, graceful degradation explained
   - Test: `grep "gh auth\|gh repo create" /home/ahiya/Ahiya/2L/README.md`

4. **README documents: event system, dashboard access, MCPs, GitHub integration**
   - Verification: Check README has all 8 sections
   - Expected: Event System Architecture, Dashboard Access, MCP Integration, GitHub Integration, etc.
   - Test: `grep "^## " /home/ahiya/Ahiya/2L/README.md | wc -l` (expect 8)

5. **README includes setup verification steps**
   - Verification: README has "Setup Verification" section
   - Expected: 4-step checklist with `/2l-check-mcps`, `gh auth status`, test orchestration, open dashboard
   - Test: `grep -A 20 "Setup Verification" /home/ahiya/Ahiya/2L/README.md`

6. **README includes troubleshooting for common issues**
   - Verification: README has "Troubleshooting" section
   - Expected: 5 issues covered - dashboard no events, MCP issues, GitHub push fails, port conflicts, agent events
   - Test: `grep -A 50 "Troubleshooting" /home/ahiya/Ahiya/2L/README.md`

7. **New developer can follow README and verify setup successfully**
   - Verification: Manual walkthrough (validator will test)
   - Expected: Clear, step-by-step instructions work end-to-end
   - Test: Human validation during validation phase

---

## Builder Coordination

**N/A** - Single builder owns all tasks

---

## Validation Approach

After building, validator will:

1. **File existence check:**
   ```bash
   ls -lh /home/ahiya/.claude/commands/2l-check-mcps.md
   ls -lh /home/ahiya/Ahiya/2L/README.md
   ```

2. **Structure verification:**
   - `/2l-check-mcps` has required sections (Usage, What This Does, Implementation)
   - README has all 8 sections in correct order

3. **Content accuracy check:**
   - Event types match iteration 1 validation report (8 types)
   - MCP descriptions accurate (4 MCPs, all optional)
   - GitHub CLI workflow matches actual implementation
   - Dashboard behavior matches iteration 1 commands

4. **Cross-reference validation:**
   - README references `/2l-check-mcps` command
   - Both documents describe same MCPs
   - All command names match actual files

5. **Usability testing:**
   - Follow setup instructions step-by-step
   - Verify all commands work
   - Check all links open successfully
   - Test troubleshooting examples

6. **Success criteria verification:**
   - All 7 criteria from master plan met
   - No critical issues found
   - Documentation ready for new developers

---

## Risk Mitigation

### Risk 1: Documentation inaccuracy
**Risk:** README doesn't match actual implementation
**Likelihood:** LOW (all source files available and accessible)
**Mitigation:** Builder must read actual implementation files, quote directly, cross-check against validation report
**Impact:** MEDIUM (users get confused, try non-existent features)
**Validation:** Validator cross-checks every technical detail against source files

### Risk 2: MCP verification confusion
**Risk:** Users expect technical verification, get informational command
**Likelihood:** MEDIUM (master plan says "check MCP connectivity")
**Mitigation:** Clear messaging in command output: "Cannot auto-detect - verify by usage" and "All MCPs are OPTIONAL"
**Impact:** LOW (users understand limitations, still get value from setup links)
**Validation:** Validator confirms messaging clarity in command output

### Risk 3: README scope creep
**Risk:** Builder writes excessive documentation beyond 8 sections
**Likelihood:** LOW (clear section list provided, time-boxed)
**Mitigation:** Strict 8-section structure, patterns.md provides clear template, 2-2.5 hour time box
**Impact:** LOW (extra time spent, but not harmful to quality)
**Validation:** Validator checks section count matches requirement (exactly 8)

### Risk 4: GitHub CLI documentation assumptions
**Risk:** Document features that don't exist in `setup_github_repo()`
**Likelihood:** VERY LOW (function code is clear and validated)
**Mitigation:** Builder must read actual function implementation (lines 1512-1592), quote specific behavior
**Impact:** MEDIUM (users try non-existent features, get errors)
**Validation:** Validator compares README GitHub section against actual function code

### Risk 5: Event type mismatches
**Risk:** Document event types that don't exist in iteration 1 implementation
**Likelihood:** VERY LOW (validation report explicitly lists 8 types)
**Mitigation:** Builder must use exact event types from validation report lines 192-201
**Impact:** HIGH (incorrect event system documentation breaks observability understanding)
**Validation:** Validator verifies all 8 event types documented: plan_start, iteration_start, phase_change, complexity_decision, agent_start, agent_complete, validation_result, iteration_complete

---

## Timeline

### Hour 1: MCP Verification Command (Task 1)
- 0:00-0:15 - Read reference files (builder.md MCP sections, status.md patterns)
- 0:15-0:45 - Write command file with all 4 MCPs
- 0:45-1:00 - Test file structure, validate output format

### Hour 2-3: README Sections 1-4 (Task 2 Part 1)
- 1:00-1:15 - Section 1: Overview & Quick Start
- 1:15-1:55 - Section 2: Event System Architecture (read validation report, document 8 event types)
- 1:55-2:30 - Section 3: Dashboard Access (read dashboard commands)
- 2:30-3:00 - Section 4: MCP Integration (reference Task 1 command)

### Hour 3-4: README Sections 5-8 + Polish (Task 2 Part 2 + Task 3)
- 3:00-3:30 - Section 5: GitHub Integration (read setup_github_repo function)
- 3:30-3:50 - Section 6: Setup Verification
- 3:50-4:20 - Section 7: Troubleshooting (5 common issues)
- 4:20-4:40 - Section 8: Architecture Decisions
- 4:40-5:00 - Task 3: Cross-reference, validate links, proofread

**Total: 3-4 hours** (3 hours minimum for efficient execution, 4 hours with thorough validation)

---

## Definition of Done

Builder can mark COMPLETE when:

- [ ] `/2l-check-mcps` command file created at `/home/ahiya/.claude/commands/2l-check-mcps.md`
- [ ] README.md created at `/home/ahiya/Ahiya/2L/README.md`
- [ ] All 8 README sections present in correct order
- [ ] All 4 MCPs documented in both files consistently
- [ ] All 8 event types documented accurately
- [ ] All commands tested (file existence validated)
- [ ] All links validated (cross-references and external links)
- [ ] Cross-references between command and README verified
- [ ] Technical accuracy spot-checked against source files
- [ ] All 7 success criteria addressable (validator will verify)
- [ ] No invented features or non-existent behavior documented
- [ ] Ready for validation phase

---

## Notes for Builder

### Before Starting
- Read `patterns.md` completely - contains critical patterns and examples
- Read iteration 1 validation report - provides validated event system details
- Set up file references - bookmark key source files for quick access

### During Work
- **Don't invent** - Quote actual implementation, test commands before documenting
- **Don't rush** - 3-4 hours is realistic for quality documentation
- **Test everything** - Verify file paths exist, commands work, links open
- **Cross-check** - Compare your work against validation report and explorer report

### Key Success Factors
1. **Accuracy:** Every technical detail verified against source files
2. **Clarity:** New developer can follow instructions successfully
3. **Consistency:** Terminology and style consistent across both documents
4. **Completeness:** All 8 README sections present with required content
5. **Testability:** All code examples are copy-pasteable and functional

### Builder Report Template

After completing work, include in builder report:

```markdown
## Deliverables

1. `/home/ahiya/.claude/commands/2l-check-mcps.md` - 153 lines
2. `/home/ahiya/Ahiya/2L/README.md` - 847 lines

## Source Files Referenced

- Validation report (event types, format schema)
- 2l-mvp.md (GitHub functions, event emissions)
- 2l-dashboard.md (dashboard behavior)
- 2l-builder.md (MCP descriptions)
- [List other files read]

## Technical Accuracy Checks Performed

- Event types verified against validation report (8 types)
- GitHub CLI behavior verified against setup_github_repo() function
- Dashboard behavior verified against 2l-dashboard.md
- MCP descriptions verified against 2l-builder.md
- [List other checks]

## Testing Performed

- File existence: Both files created
- Structure: All sections present
- Cross-references: README → /2l-check-mcps verified
- Links: All external links tested
- [List other tests]

## Time Spent

- Task 1 (MCP command): 52 minutes
- Task 2 (README): 2 hours 18 minutes
- Task 3 (Cross-reference): 24 minutes
- Total: 3 hours 34 minutes
```
