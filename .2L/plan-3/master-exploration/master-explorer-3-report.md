# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Create a seamless 5-minute setup experience for 2L by automating installation, database setup, MCP configuration, and dashboard access through a single installation script and three guided setup commands, eliminating manual configuration pain points.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 6 must-have features (MVP)
- **User stories/acceptance criteria:** 48 distinct acceptance criteria across 6 features
- **Estimated total work:** 16-22 hours

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **Multiple integration layers:** Installation script must integrate with filesystem, user permissions, git workflows, and existing 2L infrastructure
- **User-facing flows:** 3 distinct user journeys (first-time setup, new machine setup, updates) with multiple touchpoints
- **External dependencies:** Integration with Supabase (localhost:54322), MCP servers (Playwright, Chrome DevTools), Claude Code CLI environment
- **Error handling breadth:** Must gracefully handle 15+ edge cases (missing sudo, port conflicts, permission errors, existing installations)
- **Platform variance:** Linux/macOS differences in commands (apt vs brew, xdg-open vs open, psql installation paths)

**UX/Integration Focus:**
- **Real user flows** involving multiple commands in sequence (install → setup-db → setup-mcps → first orchestration → dashboard)
- **State management** across user sessions and multiple script invocations
- **Cross-command dependencies** (installation must complete before setup commands work)
- **Feedback loops** (users need clear progress indicators and actionable error messages)

---

## User Flow Dependencies & Integration Points

### 1. Primary User Flow: First-Time Setup (15 touchpoints)

**Flow Steps with Integration Complexity:**

1. **User clones 2L repository**
   - Integration: Git → local filesystem
   - Complexity: LOW (standard git operation)
   - Data: Repository downloaded to local directory

2. **User runs `./2l.sh install`**
   - Integration: Bash script → ~/.claude/ filesystem
   - Complexity: MEDIUM
   - Data flow:
     - Read from: `repo/agents/*.md`, `repo/commands/*.md`, `repo/lib/*`
     - Write to: `~/.claude/agents/`, `~/.claude/commands/`, `~/.claude/lib/`
     - Create: `~/.claude/.2l-install.yaml` (installation state)
     - Modify: Backup existing files to `~/.claude/backups/{timestamp}/`
   - Error conditions:
     - Permission denied (chmod 755 ~/.claude required)
     - Disk space insufficient
     - Existing symlinks (from previous installs)

3. **System installs all agents and commands**
   - Integration: File copy operations with validation
   - Complexity: MEDIUM
   - Validation checks:
     - File integrity (correct number of files copied)
     - No overwrites without backup
     - Symlinks vs actual files handling
   - UX considerations:
     - Progress output (10/25 files copied...)
     - Summary of changes (5 new agents, 3 updated commands)

4. **System reports success with next steps**
   - Integration: Terminal output → user comprehension
   - Complexity: LOW
   - UX requirement: Must include actionable next steps (not just "Success!")
   - Example output format:
     ```
     ✓ Installation complete!

     Installed:
       - 10 agents → ~/.claude/agents/
       - 19 commands → ~/.claude/commands/
       - 2 libraries → ~/.claude/lib/

     Next steps:
       1. Open Claude Code in your project directory
       2. Run: /2l-setup-db (configure database access)
       3. Run: /2l-setup-mcps (optional, for testing capabilities)
       4. Start building: /2l-mvp "your vision"
     ```

5. **User opens Claude Code in project directory**
   - Integration: User switches context from terminal to Claude Code
   - Complexity: LOW
   - Potential friction: User might forget to change directory

6. **User runs `/2l-setup-db`**
   - Integration: Claude Code command → Bash execution → System package manager → Supabase
   - Complexity: HIGH
   - Data flow:
     ```
     User input (sudo password)
       ↓
     Store in .sudo_access.txt (project root)
       ↓
     Add to .gitignore (automatic)
       ↓
     Check if psql installed
       ↓ (if not installed)
     Use sudo to install postgresql-client
       ↓
     Test connection: psql -h localhost -p 54322 -U postgres
       ↓
     Verify query execution
       ↓
     Report success/failure
     ```
   - Error conditions (9 possible failures):
     - Supabase not running (connection refused)
     - Wrong port (not 54322)
     - Sudo password incorrect
     - User lacks sudo access
     - Package installation fails (network issues)
     - psql already installed but different version
     - PostgreSQL service conflicts
     - .sudo_access.txt permission issues
     - .gitignore already exists with conflicting entries

7. **System prompts for sudo password**
   - Integration: Terminal input → file storage
   - Complexity: MEDIUM
   - Security considerations:
     - Plain text password (acceptable per vision requirements)
     - File permissions must be 600
     - Must never be committed to git
   - UX considerations:
     - Clear explanation of why password is needed
     - How to revoke access later
     - Alternative options if sudo unavailable

8. **System installs psql and tests connection**
   - Integration: Package manager → PostgreSQL client → Supabase local instance
   - Complexity: HIGH
   - Platform differences:
     - Ubuntu/Debian: `sudo apt-get install postgresql-client`
     - macOS: `brew install postgresql` (if Homebrew available)
   - Connection test sequence:
     ```bash
     # Test 1: Basic connection
     psql -h localhost -p 54322 -U postgres -c "SELECT 1"

     # Test 2: Verify database access
     psql -h localhost -p 54322 -U postgres -c "SELECT current_database()"

     # Test 3: Simulate agent query
     psql -h localhost -p 54322 -U postgres -c "SELECT table_name FROM information_schema.tables LIMIT 1"
     ```

9. **User optionally runs `/2l-setup-mcps`**
   - Integration: Command execution → User education (not automatic installation)
   - Complexity: MEDIUM
   - UX approach: **Guided instructions, not automatic installation**
   - Data flow:
     ```
     Detect OS (Linux/macOS)
       ↓
     Check if claude_desktop_config.json exists
       ↓
     Display installation instructions for Playwright MCP
       ↓
     Display installation instructions for Chrome DevTools MCP
       ↓
     Generate config snippet (JSON)
       ↓
     Show where to paste it (OS-specific path)
       ↓
     Provide validation steps
     ```
   - Platform-specific paths:
     - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
     - Linux: `~/.config/Claude/claude_desktop_config.json`

10. **System guides through MCP configuration**
    - Integration: Terminal output → User manual steps → Claude Desktop config
    - Complexity: MEDIUM
    - Not automated because:
      - Requires npm package installation (not in scope)
      - Claude Desktop restart needed
      - User may already have MCPs configured
    - UX output format:
      ```
      === Playwright MCP Setup ===

      1. Install the MCP server:
         npm install -g @playwright/mcp-server

      2. Add to your Claude Desktop config (~/.config/Claude/claude_desktop_config.json):

         {
           "mcpServers": {
             "playwright": {
               "command": "npx",
               "args": ["-y", "@playwright/mcp-server"]
             }
           }
         }

      3. Restart Claude Desktop

      4. Verify: You should see "playwright" in the MCP servers list

      === Chrome DevTools MCP Setup ===
      [Similar instructions...]

      === Skip MCPs? ===
      MCPs are optional. 2L will work without them, but you won't have:
      - Browser automation testing
      - Chrome DevTools debugging

      You can set up MCPs later at any time.
      ```

11. **User starts first orchestration: `/2l-mvp "build a todo app"`**
    - Integration: User vision → Orchestrator → Agents → File system → Git
    - Complexity: HIGH (core 2L orchestration)
    - Data flow (UX perspective):
      ```
      User vision text
        ↓
      Orchestrator creates .2L/plan-{N}/vision.md
        ↓
      Spawns master explorers (read vision)
        ↓
      Master planner synthesizes (reads explorer reports)
        ↓
      Iteration planner creates tasks (reads master plan)
        ↓
      Builders execute (read plan, write code)
        ↓
      Integrator merges (reads builder reports)
        ↓
      Validator tests (executes code, reads docs)
        ↓
      Commit to git (user sees confirmation)
      ```
   - User touchpoints during orchestration:
     - Initial confirmation prompt (vision looks correct?)
     - Progress events (emitted to .2L/events.jsonl)
     - Dashboard updates (if running in parallel)
     - Final commit message and results

12. **User opens dashboard in another terminal: `/2l-dashboard`**
    - Integration: Parallel terminal → HTTP server → Browser → events.jsonl polling
    - Complexity: MEDIUM
    - Data flow:
      ```
      User runs /2l-dashboard in terminal 2
        ↓
      Command checks if .2L/dashboard/index.html exists
        ↓ (if not exists)
      Prompt to run @2l-dashboard-builder agent
        ↓ (user spawns agent, agent completes)
      User re-runs /2l-dashboard
        ↓
      Find available port (8080-8099)
        ↓
      Start Python http.server on port
        ↓
      Store PID and port in .2L/dashboard/.server-{port,pid}
        ↓
      Open browser (xdg-open/open command)
        ↓
      Browser loads index.html
        ↓
      JavaScript polls ../events.jsonl every 2 seconds
        ↓
      Display events in real-time
      ```

13. **Dashboard starts instantly (<2s)**
    - Integration: Command execution → HTTP server → Browser
    - Complexity: LOW (if HTML pre-generated)
    - Performance requirement: **Current vision says <2s, but existing dashboard spawns agent (~30s)**
    - **Critical UX fix needed:** Feature #4 in vision addresses this
    - Before fix: `/2l-dashboard` spawns agent → 30s startup
    - After fix: `/2l-dashboard` reads template → generates HTML inline → <2s startup

14. **Dashboard shows real-time progress**
    - Integration: Browser JavaScript → HTTP GET requests → events.jsonl file
    - Complexity: MEDIUM
    - Polling mechanism:
      ```javascript
      // Every 2 seconds
      fetch('../events.jsonl')
        .then(response => response.text())
        .then(text => {
          const events = text.trim().split('\n').map(line => JSON.parse(line));
          updateDashboard(events);
        });
      ```
    - Active agents tracking (Feature #5 issue):
      - Problem: Currently not parsing agent_start/agent_complete correctly
      - Impact: "Active Agents" section shows 0 agents even when builders running
      - Root cause: Event parsing logic doesn't match actual event format
      - Fix needed: Update JavaScript to correctly pair start/complete events

15. **User sees orchestration complete**
    - Integration: Dashboard display + Terminal output → User understanding
    - Complexity: LOW
    - UX requirement: Clear completion signal in both interfaces
    - Dashboard: Shows "iteration_complete" event with green badge
    - Terminal: Shows git commit hash and summary

**Flow Duration Target:** 5 minutes (from git clone to first /2l-mvp execution)

**Critical Path Dependencies:**
```
git clone (30s)
  ↓
./2l.sh install (15s)
  ↓
Open Claude Code in project (10s)
  ↓
/2l-setup-db (90s - includes psql installation)
  ↓
/2l-setup-mcps (OPTIONAL - skip to save time)
  ↓
/2l-mvp "vision" (starts orchestration)
```

**Minimum viable time:** 2min 25s (excluding orchestration runtime)

---

### 2. Secondary User Flow: New Machine Setup (8 touchpoints)

**Simpler flow for users who already have the 2L repo:**

1. **User has 2L repo on new machine** (via git pull, USB transfer, etc.)
   - Integration: Filesystem → 2L installation
   - Complexity: LOW

2. **User runs `./2l.sh install` in 2L directory**
   - Integration: Same as primary flow step 2
   - Complexity: MEDIUM
   - Edge case: User might run from wrong directory
   - Error handling: Script should check if it's in 2L repo directory

3. **Installation completes with confirmation**
   - Integration: Same as primary flow step 4
   - Complexity: LOW

4. **User opens Claude Code in their project**
   - Integration: Context switch
   - Complexity: LOW

5. **User runs `/2l-setup-db`**
   - Integration: Same as primary flow step 6
   - Complexity: HIGH
   - Additional edge case: Supabase might not be installed yet

6. **User optionally runs `/2l-setup-mcps`**
   - Integration: Same as primary flow step 9
   - Complexity: MEDIUM

7. **User starts building: `/2l-mvp "feature X"`**
   - Integration: Same as primary flow step 11
   - Complexity: HIGH

8. **Success: Complete setup in under 5 minutes**
   - Target met if database setup works without manual intervention

**Flow Duration Target:** Under 5 minutes

---

### 3. Tertiary User Flow: Updating Existing Installation (6 touchpoints)

**For users who already have 2L installed and want to update:**

1. **User pulls latest 2L changes: `git pull`**
   - Integration: Git → local repository
   - Complexity: LOW
   - Potential conflicts: User might have local modifications

2. **User runs update: `./2l.sh install --update`**
   - Integration: Update script → ~/.claude/ (overwrite mode)
   - Complexity: MEDIUM
   - Data flow:
     ```
     Check ~/.claude/.2l-install.yaml (previous install state)
       ↓
     Backup current files to ~/.claude/backups/{timestamp}/
       ↓
     Overwrite agents, commands, lib with new versions
       ↓
     Update ~/.claude/.2l-install.yaml with new version
       ↓
     Report what changed
     ```

3. **System backs up current agents/commands**
   - Integration: File copy → backup directory
   - Complexity: MEDIUM
   - UX consideration: Show backup location in output
   - Example: `Backup created: ~/.claude/backups/2025-10-10-05-26-13/`

4. **System overwrites with new versions**
   - Integration: File replacement
   - Complexity: MEDIUM
   - Preserve user customizations: **Critical UX requirement from acceptance criteria**
   - Strategy:
     - User configs in separate files (not overwritten)
     - Agent/command files always overwritten (they're templates)
     - .2l-install.yaml tracks which files are user-modified

5. **System reports what changed**
   - Integration: Diff output → User comprehension
   - Complexity: MEDIUM
   - UX requirement: Show meaningful diff summary
   - Example output:
     ```
     ✓ Update complete!

     Changes:
       Updated:
         - agents/2l-builder.md (added event emission)
         - commands/2l-dashboard.md (fixed startup time)
       Added:
         - commands/2l-setup-db.md (new)
         - commands/2l-setup-mcps.md (new)
       Unchanged:
         - 8 agents, 15 commands (no changes)

     Backup location: ~/.claude/backups/2025-10-10-05-26-13/

     Your projects are unaffected. Continue using /2l-mvp as normal.
     ```

6. **User continues working without breaking existing projects**
   - Integration: Updated commands → existing .2L/ project directories
   - Complexity: LOW (if properly isolated)
   - UX requirement: Existing orchestrations should continue working
   - Verification: ~/.claude/.2l-install.yaml version tracking

**Flow Duration Target:** Under 1 minute

**Success Metric:** Update completes without breaking existing projects (no manual fixes needed)

---

## Frontend/Backend Integration Complexity

### Integration Layer 1: Installation Script ↔ Filesystem

**Components:**
- `2l.sh install` (bash script)
- `~/.claude/agents/*.md` (10 agent files)
- `~/.claude/commands/*.md` (19 command files)
- `~/.claude/lib/*.{html,sh}` (2 library files)
- `~/.claude/.2l-install.yaml` (installation state)

**Integration Points:**

1. **File Discovery** (repo → target)
   - Read from: Git repository structure
   - Write to: User's ~/.claude/ directory
   - Complexity: LOW
   - Implementation:
     ```bash
     # Discover all agents
     AGENT_FILES=$(find agents -name "*.md" -type f)

     # Copy with directory structure preserved
     for file in $AGENT_FILES; do
       cp "$file" "$HOME/.claude/$file"
     done
     ```

2. **Backup Management** (existing → backup)
   - Read from: `~/.claude/agents/*.md` (existing)
   - Write to: `~/.claude/backups/{timestamp}/agents/*.md`
   - Complexity: MEDIUM
   - Edge cases:
     - Backup directory already exists (append timestamp)
     - Disk space insufficient (warn user)
     - Symlinks vs actual files (preserve symlink targets)

3. **State Persistence** (installation metadata)
   - File: `~/.claude/.2l-install.yaml`
   - Format:
     ```yaml
     installed_at: "2025-10-10T05:26:13Z"
     version: "1.0.0"
     components:
       agents:
         - 2l-builder.md
         - 2l-dashboard-builder.md
         - [...]
       commands:
         - 2l-dashboard.md
         - 2l-setup-db.md
         - [...]
       lib:
         - 2l-dashboard-template.html
         - 2l-event-logger.sh
     backups:
       - timestamp: "2025-10-09T12:00:00Z"
         path: "~/.claude/backups/2025-10-09-12-00-00/"
     ```
   - Complexity: MEDIUM
   - Purpose: Enable updates, rollbacks, and uninstallation

**API Contract:**
- Input: 2L repository directory structure
- Output: Installed files in ~/.claude/, installation state in YAML
- Idempotency: Running twice produces same result (backup on second run)

---

### Integration Layer 2: Setup Commands ↔ External Services

**Components:**
- `/2l-setup-db` command (bash script in Claude Code)
- Supabase local instance (PostgreSQL on localhost:54322)
- System package manager (apt/brew)
- User's sudo privileges

**Integration Points:**

1. **Sudo Password Collection** (user → file)
   - Input: User types password in terminal
   - Storage: `.sudo_access.txt` in project root
   - Security:
     ```bash
     # Prompt user
     read -s -p "Enter sudo password: " SUDO_PASSWORD

     # Store securely
     echo "$SUDO_PASSWORD" > .sudo_access.txt
     chmod 600 .sudo_access.txt

     # Add to .gitignore
     echo ".sudo_access.txt" >> .gitignore
     ```
   - Complexity: MEDIUM

2. **Package Installation** (command → package manager)
   - Platform detection:
     ```bash
     if [ -f /etc/debian_version ]; then
       # Ubuntu/Debian
       echo "$SUDO_PASSWORD" | sudo -S apt-get install -y postgresql-client
     elif [ "$(uname)" = "Darwin" ]; then
       # macOS
       if command -v brew >/dev/null 2>&1; then
         brew install postgresql
       else
         echo "Error: Homebrew not found. Install manually: https://brew.sh"
         exit 1
       fi
     fi
     ```
   - Complexity: HIGH (platform variance)

3. **Database Connection Test** (psql → Supabase)
   - Connection string: `psql -h localhost -p 54322 -U postgres`
   - Test query sequence:
     ```bash
     # Test 1: Can we connect?
     PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -c "SELECT 1" >/dev/null 2>&1

     # Test 2: Can we query system tables?
     PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -c "SELECT current_database()" >/dev/null 2>&1

     # Test 3: Can we list tables (actual agent use case)?
     PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -c "SELECT table_name FROM information_schema.tables LIMIT 1" >/dev/null 2>&1
     ```
   - Complexity: MEDIUM

4. **Error Reporting** (test results → user)
   - Success output:
     ```
     ✓ Database setup complete!

     Connection details:
       Host: localhost
       Port: 54322
       User: postgres

     Claude can now execute SQL queries during orchestration.

     To revoke access later:
       1. Delete .sudo_access.txt
       2. Remove .sudo_access.txt from .gitignore
     ```
   - Failure output (with troubleshooting):
     ```
     ✗ Database connection failed

     Error: Connection refused (localhost:54322)

     Troubleshooting steps:
       1. Start Supabase: supabase start
       2. Check if running: supabase status
       3. Verify port: ps aux | grep postgres
       4. Try different port: /2l-setup-db --port 5432

     For more help: https://2l.docs/setup-db
     ```
   - Complexity: MEDIUM (clear error messages critical for UX)

**API Contract:**
- Input: User sudo password, Supabase connection parameters (host, port, user)
- Output: .sudo_access.txt file (if successful), .gitignore entry, connection test results
- Idempotency: Running twice produces same result (password overwritten safely)

---

### Integration Layer 3: Dashboard ↔ Events System

**Components:**
- `/2l-dashboard` command (bash script)
- `2l-dashboard-builder` agent (generates HTML)
- `2l-dashboard-template.html` (template file)
- `.2L/events.jsonl` (event log file)
- HTTP server (Python 3 http.server)
- Browser (user's default browser)

**Integration Points:**

1. **Dashboard HTML Generation** (template → HTML)
   - **CURRENT STATE (Problem):**
     ```bash
     # /2l-dashboard command (current)
     if [ ! -f ".2L/dashboard/index.html" ]; then
       echo "Spawning 2l-dashboard-builder agent..."
       # Spawn agent (takes ~30 seconds)
       # Agent reads template, replaces placeholders, writes HTML
     fi
     ```
   - **TARGET STATE (Feature #4 fix):**
     ```bash
     # /2l-dashboard command (proposed)
     if [ ! -f ".2L/dashboard/index.html" ]; then
       echo "Generating dashboard HTML..."
       # Read template directly (no agent spawn)
       TEMPLATE=$(cat ~/.claude/lib/2l-dashboard-template.html)

       # Replace placeholders inline
       TEMPLATE="${TEMPLATE//{PROJECT_NAME}/$(basename $(pwd))}"
       TEMPLATE="${TEMPLATE//{TIMESTAMP}/$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"
       TEMPLATE="${TEMPLATE//{EVENTS_PATH}/..\/events.jsonl}"

       # Write HTML
       mkdir -p .2L/dashboard
       echo "$TEMPLATE" > .2L/dashboard/index.html
     fi
     ```
   - Complexity reduction: HIGH → LOW
   - Startup time improvement: 30s → <2s

2. **Port Allocation** (command → available port)
   - Current implementation (already working):
     ```bash
     # Find available port in 8080-8099
     for port in {8080..8099}; do
       if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
         DASHBOARD_PORT=$port
         break
       fi
     done
     ```
   - Multi-project support: Each project gets unique port
   - Port reuse: Stored in `.2L/dashboard/.server-port`
   - Complexity: MEDIUM

3. **HTTP Server Lifecycle** (command → Python server → browser)
   - Start server:
     ```bash
     cd .2L
     python3 -m http.server "$DASHBOARD_PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
     SERVER_PID=$!
     echo "$SERVER_PID" > dashboard/.server-pid
     echo "$DASHBOARD_PORT" > dashboard/.server-port
     ```
   - Open browser:
     ```bash
     # Platform-specific
     if command -v xdg-open >/dev/null 2>&1; then
       xdg-open "http://localhost:$DASHBOARD_PORT/dashboard/index.html"
     elif command -v open >/dev/null 2>&1; then
       open "http://localhost:$DASHBOARD_PORT/dashboard/index.html"
     fi
     ```
   - Complexity: MEDIUM

4. **Event Polling** (JavaScript → events.jsonl)
   - **CURRENT STATE (Problem - Feature #5):**
     ```javascript
     // Dashboard JavaScript (current - broken)
     function parseActiveAgents(events) {
       // Incorrect parsing logic
       // Doesn't correctly match agent_start with agent_complete
       return []; // Always returns empty array
     }
     ```
   - **TARGET STATE (Feature #5 fix):**
     ```javascript
     // Dashboard JavaScript (proposed - working)
     function parseActiveAgents(events) {
       const agentStarts = new Map(); // agent_id → start_event
       const activeAgents = [];

       for (const event of events) {
         if (event.event_type === 'agent_start') {
           agentStarts.set(event.agent_id, event);
         } else if (event.event_type === 'agent_complete') {
           agentStarts.delete(event.agent_id); // Agent finished
         }
       }

       // Remaining entries are active agents
       for (const [agentId, startEvent] of agentStarts) {
         const duration = Date.now() - new Date(startEvent.timestamp);
         activeAgents.push({
           id: agentId,
           phase: startEvent.phase,
           duration: duration,
           data: startEvent.data
         });
       }

       return activeAgents;
     }
     ```
   - Complexity: MEDIUM
   - Impact: HIGH (core dashboard feature currently non-functional)

5. **Real-time Updates** (polling loop → UI refresh)
   - Polling mechanism:
     ```javascript
     // Poll every 2 seconds
     setInterval(async () => {
       const response = await fetch('../events.jsonl');
       const text = await response.text();
       const events = text.trim().split('\n')
         .filter(line => line.length > 0)
         .map(line => JSON.parse(line));

       updateDashboard(events);
     }, 2000);
     ```
   - Complexity: LOW
   - Performance: Acceptable (events.jsonl typically <100KB)

**API Contract:**
- Input: events.jsonl file (JSONL format with 8 event types)
- Output: HTML dashboard displaying events, active agents, metrics
- Data format:
  ```json
  {"timestamp":"2025-10-10T05:26:13Z","event_type":"agent_start","phase":"building","agent_id":"builder-1","data":"Starting feature implementation"}
  {"timestamp":"2025-10-10T05:28:45Z","event_type":"agent_complete","phase":"building","agent_id":"builder-1","data":"Builder-1: COMPLETE"}
  ```
- Idempotency: Polling events.jsonl multiple times produces correct active agents list

---

### Integration Layer 4: MCP Setup ↔ Claude Desktop

**Components:**
- `/2l-setup-mcps` command (bash script in Claude Code)
- Claude Desktop application (not controlled by script)
- `claude_desktop_config.json` (user must edit manually)
- MCP servers (Playwright, Chrome DevTools - not installed by script)

**Integration Points:**

1. **OS Detection** (script → config path)
   - Platform-specific paths:
     ```bash
     if [ "$(uname)" = "Darwin" ]; then
       CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
     elif [ "$(uname)" = "Linux" ]; then
       CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
     else
       echo "Unsupported OS: $(uname)"
       exit 1
     fi
     ```
   - Complexity: LOW

2. **Config Snippet Generation** (script → JSON output)
   - Generated snippet:
     ```json
     {
       "mcpServers": {
         "playwright": {
           "command": "npx",
           "args": ["-y", "@playwright/mcp-server"]
         },
         "chrome-devtools": {
           "command": "npx",
           "args": ["-y", "@modelcontextprotocol/server-chrome-devtools"]
         }
       }
     }
     ```
   - User must merge this into existing config (not automated)
   - Complexity: LOW

3. **User Manual Steps** (script instructions → user actions)
   - Script output (UX-critical):
     ```
     === MCP Setup Instructions ===

     MCPs enhance 2L with browser automation and debugging capabilities.
     This setup is OPTIONAL - 2L works fine without MCPs.

     --- Step 1: Install Playwright MCP ---

     Run this command:
       npm install -g @playwright/mcp-server

     --- Step 2: Install Chrome DevTools MCP ---

     Run this command:
       npm install -g @modelcontextprotocol/server-chrome-devtools

     --- Step 3: Update Claude Desktop Config ---

     Location: ~/Library/Application Support/Claude/claude_desktop_config.json

     Add this JSON (merge with existing mcpServers if present):

     {
       "mcpServers": {
         "playwright": {
           "command": "npx",
           "args": ["-y", "@playwright/mcp-server"]
         },
         "chrome-devtools": {
           "command": "npx",
           "args": ["-y", "@modelcontextprotocol/server-chrome-devtools"]
         }
       }
     }

     --- Step 4: Restart Claude Desktop ---

     Close and reopen Claude Desktop for changes to take effect.

     --- Step 5: Verify MCPs ---

     In Claude Desktop, check the MCP servers list.
     You should see "playwright" and "chrome-devtools" listed.

     --- Skip MCPs? ---

     If you skip MCP setup, 2L will still work but agents won't be able to:
       - Run Playwright browser tests
       - Debug with Chrome DevTools
       - Capture screenshots during validation

     You can run /2l-setup-mcps again later to set up MCPs.
     ```
   - Complexity: LOW (for script), MEDIUM (for user)

4. **Validation Guidance** (script → user verification steps)
   - No automatic validation possible (Claude Desktop is separate process)
   - User must verify manually by:
     - Opening Claude Desktop
     - Checking MCP servers list
     - Testing with a simple MCP command
   - Complexity: LOW

**API Contract:**
- Input: None (script is informational only)
- Output: Step-by-step instructions, JSON config snippet, validation steps
- No file modifications: User performs all actions manually
- Idempotency: Running multiple times shows same instructions

---

## Data Flow Patterns Across System Boundaries

### Pattern 1: Installation Script → User's Claude Environment

**Boundary:** Git repository → ~/.claude/ directory

**Data Flow:**
```
2L Repository
├── agents/
│   ├── 2l-builder.md
│   ├── 2l-dashboard-builder.md
│   └── [...10 agents total]
├── commands/
│   ├── 2l-dashboard.md
│   ├── 2l-setup-db.md
│   └── [...19 commands total]
└── lib/
    ├── 2l-dashboard-template.html
    └── 2l-event-logger.sh

    ↓ (./2l.sh install)

~/.claude/
├── agents/
│   ├── 2l-builder.md (copied)
│   ├── 2l-dashboard-builder.md (copied)
│   └── [...all agents]
├── commands/
│   ├── 2l-dashboard.md (copied)
│   ├── 2l-setup-db.md (copied)
│   └── [...all commands]
├── lib/
│   ├── 2l-dashboard-template.html (copied)
│   └── 2l-event-logger.sh (copied)
└── .2l-install.yaml (created, tracks installation state)
```

**Transformation:** File copy with metadata tracking

**Error Handling:**
- Source file missing → Skip with warning
- Destination permission denied → Exit with chmod instructions
- Existing file conflicts → Backup before overwrite

---

### Pattern 2: Claude Code Command → System Execution → File Storage

**Boundary:** Claude Code CLI → Bash execution → Project filesystem

**Data Flow (Database Setup Example):**
```
User types: /2l-setup-db
    ↓
Claude Code executes command from ~/.claude/commands/2l-setup-db.md
    ↓
Bash script prompts: "Enter sudo password:"
    ↓
User input (terminal) → Variable: SUDO_PASSWORD
    ↓
Write to file: .sudo_access.txt
    ↓
Modify: .gitignore (add .sudo_access.txt entry)
    ↓
Execute: sudo apt-get install postgresql-client
    ↓
Test connection: psql -h localhost -p 54322 -U postgres -c "SELECT 1"
    ↓
Report results (terminal output)
```

**Transformation:** User input → Secure file storage → Package installation → Connection validation

**Error Handling:**
- Sudo password incorrect → Retry prompt (3 attempts max)
- Supabase not running → Detailed troubleshooting output
- psql already installed → Skip installation, proceed to connection test

---

### Pattern 3: Orchestration Events → Dashboard Real-time Display

**Boundary:** Agent processes → events.jsonl file → HTTP server → Browser JavaScript → User display

**Data Flow:**
```
Agent executes:
  log_2l_event "agent_start" "Builder-1: Starting implementation" "building" "builder-1"
    ↓
Event logger library (2l-event-logger.sh):
  - Generate timestamp
  - Escape JSON special characters
  - Build JSON object
  - Append to .2L/events.jsonl
    ↓
.2L/events.jsonl file:
  {"timestamp":"2025-10-10T05:26:13Z","event_type":"agent_start","phase":"building","agent_id":"builder-1","data":"Builder-1: Starting implementation"}
    ↓
Python HTTP server (running on port 8080):
  - Serves .2L/events.jsonl at http://localhost:8080/events.jsonl
    ↓
Browser JavaScript (polling every 2 seconds):
  fetch('../events.jsonl')
    .then(response => response.text())
    .then(text => {
      const lines = text.trim().split('\n');
      const events = lines.map(line => JSON.parse(line));
      updateDashboard(events);
    })
    ↓
Dashboard UI (HTML):
  - Event timeline section: Display last 50 events with color coding
  - Active agents section: Show agents with agent_start but no agent_complete
  - Metrics section: Count total events, calculate elapsed time
    ↓
User sees:
  "Builder-1: Starting implementation" (in active agents list)
  Duration: 00:02:15 (updating in real-time)
```

**Transformation:** Agent action → Structured event → File append → HTTP response → JSON parsing → DOM update

**Error Handling:**
- events.jsonl doesn't exist → Show "No orchestration started yet"
- Malformed JSON line → Skip line, log warning to console
- Network error (polling fails) → Retry on next 2-second interval
- Agent orphaned (start without complete) → Show in active agents indefinitely (UX issue for Feature #5)

---

### Pattern 4: User Command Sequence → Cumulative System State

**Boundary:** Multiple command invocations → Persistent configuration state

**Data Flow (Full Setup Sequence):**
```
Step 1: ./2l.sh install
  ↓
  Creates: ~/.claude/.2l-install.yaml
  State: {installed: true, version: "1.0.0", components: [...]}

Step 2: /2l-setup-db
  ↓
  Creates: .sudo_access.txt (in project root)
  Modifies: .gitignore (add .sudo_access.txt)
  State: {db_configured: true, supabase_port: 54322}

Step 3: /2l-setup-mcps (optional)
  ↓
  Output: Instructions only (no state change)
  User action: Manually edit claude_desktop_config.json
  State: {mcps_configured: "user-managed"}

Step 4: /2l-mvp "vision"
  ↓
  Creates: .2L/plan-{N}/vision.md
  Creates: .2L/events.jsonl
  State: {orchestration_started: true, plan_id: N}

Step 5: /2l-dashboard
  ↓
  Creates: .2L/dashboard/index.html
  Creates: .2L/dashboard/.server-port
  Creates: .2L/dashboard/.server-pid
  State: {dashboard_running: true, port: 8080, pid: 12345}
```

**State Dependencies:**
- `/2l-setup-db` requires `./2l.sh install` to have run (needs psql command available)
- `/2l-dashboard` requires `/2l-mvp` to have run (needs events.jsonl to exist)
- Dashboard HTML generation requires `~/.claude/lib/2l-dashboard-template.html` (installed by `./2l.sh install`)

**Error Recovery:**
- Missing prerequisite state → Clear error message with required command
- Partial state (e.g., .server-pid but no .server-port) → Clean up and retry

---

## Authentication Flows & Session Management

**Note:** This vision has minimal authentication complexity. The only "auth" is sudo password management.

### Sudo Password Lifecycle

**Collection:**
```bash
# /2l-setup-db command
read -s -p "Enter your sudo password (will be stored in .sudo_access.txt): " SUDO_PASSWORD
echo ""
```

**Storage:**
```bash
echo "$SUDO_PASSWORD" > .sudo_access.txt
chmod 600 .sudo_access.txt  # Owner read/write only
```

**Usage:**
```bash
# When agents need sudo (database queries via psql)
if [ -f ".sudo_access.txt" ]; then
  SUDO_PASSWORD=$(cat .sudo_access.txt)
  echo "$SUDO_PASSWORD" | sudo -S psql -h localhost -p 54322 -U postgres -c "QUERY"
fi
```

**Revocation (User Instructions):**
```
To revoke Claude's sudo access:
  1. Delete .sudo_access.txt
  2. Remove .sudo_access.txt from .gitignore (optional)
  3. Run: sudo -k (clear sudo cache)
```

**Security Considerations:**
- Plain text password (acknowledged in vision as acceptable trade-off)
- File permissions prevent other users from reading (chmod 600)
- Automatically added to .gitignore (prevents accidental commit)
- Limited scope: Only used for database queries, not general sudo access
- User can revoke at any time by deleting file

**Session Management:** None required (each command execution is independent)

---

## Error Handling & Edge Case Flows

### Edge Case 1: Existing 2L Installation

**Scenario:** User runs `./2l.sh install` but already has 2L installed

**Current State Detection:**
```bash
if [ -f "$HOME/.claude/.2l-install.yaml" ]; then
  echo "2L is already installed (installed $(cat ~/.claude/.2l-install.yaml | grep installed_at))"
  echo ""
  echo "Options:"
  echo "  1. Update to latest version: ./2l.sh install --update"
  echo "  2. Cancel installation: Ctrl+C"
  echo ""
  read -p "Continue with update? (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    exit 0
  fi
fi
```

**User Flow:**
1. Script detects existing installation
2. Prompts user for confirmation
3. If confirmed: Backup existing files → Install new versions → Update state
4. If canceled: Exit gracefully

**Data Preservation:**
- Existing projects (.2L/ directories) are never touched
- User customizations in separate config files (preserved)
- Agents/commands are templates (safe to overwrite)

**Complexity:** MEDIUM

---

### Edge Case 2: Missing Sudo Access

**Scenario:** User runs `/2l-setup-db` but doesn't have sudo privileges

**Detection:**
```bash
# Test sudo access
echo "$SUDO_PASSWORD" | sudo -S -v 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Error: Sudo password incorrect or you don't have sudo access"
  echo ""
  echo "Database setup requires sudo to install postgresql-client."
  echo ""
  echo "Alternatives:"
  echo "  1. Ask your system administrator to install: sudo apt-get install postgresql-client"
  echo "  2. Use a machine where you have sudo access"
  echo "  3. Skip database setup (some 2L features won't work)"
  exit 1
fi
```

**User Flow:**
1. Command attempts to verify sudo access
2. If fails: Clear error message with 3 alternatives
3. User decides next action (manual install, different machine, or skip)

**Graceful Degradation:**
- 2L can still work without database access
- Agents that need DB will show warnings but continue
- User can set up database later when they have sudo

**Complexity:** MEDIUM

---

### Edge Case 3: Port Conflicts (All Dashboard Ports Occupied)

**Scenario:** User runs `/2l-dashboard` but all ports 8080-8099 are in use (20 concurrent dashboards)

**Detection:**
```bash
DASHBOARD_PORT=""
for port in {8080..8099}; do
  if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    DASHBOARD_PORT=$port
    break
  fi
done

if [ -z "$DASHBOARD_PORT" ]; then
  echo "Error: All dashboard ports (8080-8099) are in use"
  echo ""
  echo "You have 20 concurrent dashboard servers running!"
  echo ""
  echo "To free a port, navigate to another project and run:"
  echo "  /2l-dashboard-stop"
  echo ""
  echo "Or manually check ports:"
  echo "  lsof -i :8080-8099"
  exit 1
fi
```

**User Flow:**
1. Command checks all 20 ports
2. All occupied: Show error with actionable next steps
3. User navigates to old project and runs `/2l-dashboard-stop`
4. User returns and re-runs `/2l-dashboard` (now succeeds)

**Complexity:** LOW

---

### Edge Case 4: Network Failures (MCP Setup)

**Scenario:** User runs `/2l-setup-mcps` but has no internet connection

**Graceful Handling:**
```bash
echo "=== MCP Setup Instructions ==="
echo ""
echo "MCPs are OPTIONAL. 2L works fine without them."
echo ""
echo "If you have no internet connection:"
echo "  - Save these instructions for later"
echo "  - Run /2l-setup-mcps again when online"
echo "  - Or manually install MCPs using npm"
echo ""
echo "Continue viewing instructions? (y/n): "
read CONTINUE
if [ "$CONTINUE" != "y" ]; then
  exit 0
fi
```

**User Flow:**
1. Command shows instructions (doesn't require internet)
2. User can save instructions for later
3. No failure (instructions are informational only)

**Complexity:** LOW

---

### Edge Case 5: Orphaned Agents (Dashboard Active Agents Bug)

**Scenario:** Agent emits `agent_start` but crashes before `agent_complete`

**Current Behavior (BUG - Feature #5):**
- Dashboard shows agent as active forever
- No way to clear orphaned agents
- Confuses users about orchestration state

**Proposed Fix:**
```javascript
function parseActiveAgents(events) {
  const agentStarts = new Map();
  const activeAgents = [];
  const ORPHAN_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  for (const event of events) {
    if (event.event_type === 'agent_start') {
      agentStarts.set(event.agent_id, event);
    } else if (event.event_type === 'agent_complete') {
      agentStarts.delete(event.agent_id);
    }
  }

  const now = Date.now();
  for (const [agentId, startEvent] of agentStarts) {
    const duration = now - new Date(startEvent.timestamp);

    // Mark as orphaned if running > 30 minutes
    if (duration > ORPHAN_THRESHOLD) {
      activeAgents.push({
        id: agentId,
        phase: startEvent.phase,
        duration: duration,
        data: startEvent.data,
        orphaned: true  // Show warning badge
      });
    } else {
      activeAgents.push({
        id: agentId,
        phase: startEvent.phase,
        duration: duration,
        data: startEvent.data
      });
    }
  }

  return activeAgents;
}
```

**User Flow:**
1. Agent starts, emits `agent_start`
2. Agent crashes (no `agent_complete`)
3. Dashboard shows agent as active for 30 minutes
4. After 30 minutes: Dashboard marks agent as "orphaned" with warning badge
5. User can manually stop orchestration or investigate

**Complexity:** MEDIUM

---

### Edge Case 6: Missing Python 3 (Dashboard Requirement)

**Scenario:** User runs `/2l-dashboard` but Python 3 is not installed

**Detection:**
```bash
if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: Python 3 not found"
  echo ""
  echo "Dashboard requires Python 3 for HTTP server."
  echo ""
  echo "Install Python 3:"
  echo "  - Ubuntu/Debian: sudo apt install python3"
  echo "  - macOS: brew install python3"
  echo "  - Or download from: https://www.python.org/downloads/"
  exit 1
fi
```

**User Flow:**
1. Command checks for python3 binary
2. Not found: Show clear error with platform-specific install instructions
3. User installs Python 3
4. User re-runs `/2l-dashboard` (succeeds)

**Complexity:** LOW

---

## Accessibility Requirements

**Note:** This vision is primarily CLI/terminal-based, with one GUI component (dashboard in browser).

### Terminal Accessibility

**Requirements:**
- Clear, readable output (no excessive colors/formatting)
- Screen reader compatibility (plain text output)
- Keyboard-only navigation (no mouse required)

**Implementation:**
- Use standard bash output (echo, printf)
- Avoid ASCII art or box-drawing characters
- Include text descriptions for all actions

### Dashboard Accessibility (Browser)

**Requirements (not explicitly in vision, but good practice):**

1. **Semantic HTML:**
   - Use `<header>`, `<section>`, `<article>` tags
   - Proper heading hierarchy (h1 → h2 → h3)
   - ARIA labels for interactive elements

2. **Keyboard Navigation:**
   - All sections reachable via Tab key
   - Focus indicators visible
   - No keyboard traps

3. **Color Contrast:**
   - Event type colors must meet WCAG AA standards
   - Text on dark background (#c9d1d9 on #0d1117) has sufficient contrast

4. **Screen Reader Support:**
   - Event list has ARIA live region (announces new events)
   - Active agents section updates announced
   - Metrics have descriptive labels

**Current Dashboard Template (from existing code):**
- Uses semantic HTML (header, sections)
- Dark theme (#0d1117 background, #c9d1d9 text) - meets WCAG AA
- Color-coded events (plan_start: blue, agent_start: yellow, etc.)
- Auto-refresh every 2 seconds (could use ARIA live region)

**Accessibility Complexity:** LOW (mostly already handled by template)

---

## Responsive Design Requirements

**Note:** Dashboard is viewed on developer's local machine (desktop/laptop), not mobile devices.

### Desktop-Only Focus

**Rationale:**
- Target users are developers working on machines with 2L installed
- Dashboard served from localhost (not accessible from mobile)
- Primary use case is side-by-side terminal + browser on desktop

### Minimal Responsive Requirements

**Small laptop screens (1366x768):**
- Dashboard should fit without horizontal scrolling
- Metrics bar wraps to multiple rows (flex-wrap: wrap)
- Event timeline scrolls vertically (not horizontally)

**Current Template Implementation:**
```css
.metrics {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;  /* Wraps on small screens */
}

.metric {
  flex: 1;
  min-width: 200px;  /* Prevents metrics from being too narrow */
}
```

**No mobile breakpoints needed** (out of scope for this vision)

**Responsive Complexity:** LOW (basic flexbox wrapping sufficient)

---

## Real-time Features

### Feature 1: Dashboard Event Polling

**Implementation:** Client-side JavaScript polling (every 2 seconds)

**No WebSockets/SSE needed because:**
- Simple use case (read-only dashboard)
- Events written to file (not streamed from server)
- 2-second latency is acceptable
- Fewer dependencies (no WebSocket server)

**Polling Logic:**
```javascript
async function pollEvents() {
  try {
    const response = await fetch('../events.jsonl');
    const text = await response.text();
    const events = text.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line));

    updateDashboard(events);
  } catch (error) {
    console.error('Failed to poll events:', error);
    // Retry on next interval (don't show error to user)
  }
}

// Poll every 2 seconds
setInterval(pollEvents, 2000);
```

**Performance Considerations:**
- events.jsonl size: Typically <100KB (even for complex orchestrations)
- Network overhead: Minimal (localhost, no external requests)
- Parsing cost: ~5ms for 500 events (negligible)

**Complexity:** LOW

---

### Feature 2: Active Agents Duration Calculation

**Implementation:** Client-side JavaScript (real-time clock)

**Update Logic:**
```javascript
function updateActiveAgentsDuration() {
  const activeAgents = parseActiveAgents(allEvents);
  const now = Date.now();

  for (const agent of activeAgents) {
    const startTime = new Date(agent.timestamp);
    const duration = now - startTime;

    // Format as HH:MM:SS
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update DOM
    document.getElementById(`agent-${agent.id}-duration`).textContent = formatted;
  }
}

// Update every second (independent of event polling)
setInterval(updateActiveAgentsDuration, 1000);
```

**Complexity:** LOW

---

## Form Handling, Navigation & State Management

### Form Handling

**Only 2 user inputs in entire vision:**

1. **Sudo Password Input** (`/2l-setup-db`)
   - Type: Terminal prompt (bash `read -s`)
   - Validation: Test sudo access after input
   - Error handling: Retry up to 3 times
   - Storage: `.sudo_access.txt` (plain text)

2. **Update Confirmation** (`./2l.sh install` on existing installation)
   - Type: Terminal prompt (bash `read`)
   - Validation: Accept only "y" or "n"
   - Error handling: Reject invalid input, re-prompt

**No web forms** (dashboard is read-only)

**Complexity:** LOW

---

### Navigation

**Terminal-based navigation:**
- User switches between commands manually (`/2l-setup-db` → `/2l-setup-mcps` → `/2l-mvp`)
- No automated workflow (user controls sequence)
- Each command is independent (no session state)

**Dashboard navigation:**
- Single-page application (no routing)
- All sections visible on one scrollable page
- No interactive navigation (read-only dashboard)

**Complexity:** LOW

---

### State Management

**Installation State:**
- File: `~/.claude/.2l-install.yaml`
- Purpose: Track installed components, version, backups
- Updated by: `./2l.sh install` command
- Read by: `./2l.sh install --update` (to detect existing installation)

**Database Setup State:**
- File: `.sudo_access.txt` (in project root)
- Purpose: Store sudo password for agents
- Updated by: `/2l-setup-db` command
- Read by: Agents that need database access

**Dashboard Server State:**
- Files: `.2L/dashboard/.server-port`, `.2L/dashboard/.server-pid`
- Purpose: Track running HTTP server
- Updated by: `/2l-dashboard` command
- Read by: `/2l-dashboard` (reuse port), `/2l-dashboard-stop` (kill server)

**No centralized state management needed** (each component manages own state)

**Complexity:** LOW

---

## Recommendations for Master Plan

### 1. **Prioritize Feature #4 (Direct Dashboard Start) - HIGH IMPACT**

**Why:** This is the most visible UX improvement (30s → <2s startup time)

**Implementation Strategy:**
- Modify `/2l-dashboard` command to inline template processing
- Remove agent spawning logic
- Keep template placeholders minimal (PROJECT_NAME, TIMESTAMP, EVENTS_PATH)

**Estimated Complexity:** LOW (template replacement is simple string substitution)

**User Impact:** IMMEDIATE (every dashboard launch is 28s faster)

---

### 2. **Split Installation Script from Setup Commands - NATURAL ITERATION BOUNDARY**

**Iteration 1: Installation Infrastructure**
- `2l.sh install` script (copy files, backup, state tracking)
- `~/.claude/.2l-install.yaml` state file
- `./2l.sh install --update` update flow
- Idempotency testing (run 10 times)

**Iteration 2: Database & MCP Setup**
- `/2l-setup-db` command (sudo password, psql installation, connection test)
- `/2l-setup-mcps` command (instructional output only)
- `.sudo_access.txt` management
- Error handling for all edge cases

**Iteration 3: Dashboard Fixes & README**
- Fix `/2l-dashboard` direct start (Feature #4)
- Fix active agents tracking (Feature #5)
- Update README with new quick start flow
- 5-minute setup test validation

**Rationale:** Clear dependency chain (must install before setup, must setup before use)

---

### 3. **Focus on Error Messages - CRITICAL FOR UX**

**Every error must include:**
1. **What went wrong** (clear diagnosis)
2. **Why it happened** (helps user understand)
3. **How to fix it** (actionable next steps)

**Example (good error message):**
```
✗ Database connection failed

Error: Connection refused (localhost:54322)

Why: Supabase local instance is not running.

Fix:
  1. Start Supabase: supabase start
  2. Check status: supabase status
  3. Re-run setup: /2l-setup-db

For more help: https://2l.docs/setup-db-troubleshooting
```

**Example (bad error message):**
```
Error: psql failed
```

**Recommendation:** Allocate 20% of development time to error message quality

---

### 4. **Test with Real Users Early - VALIDATION REQUIREMENT**

**Success Criteria from Vision:**
- "90% success rate in user testing (5/5 test users successful)"
- "5-Minute Setup Metric: Under 5 minutes on fresh Ubuntu 24.04 VM"

**Testing Strategy:**
1. **Iteration 1 validation:** Test installation script on fresh VM (does it copy files correctly?)
2. **Iteration 2 validation:** Test database setup on 3 different environments (Ubuntu, macOS, existing Supabase)
3. **Iteration 3 validation:** Full end-to-end test (git clone → first orchestration) with 5 new users

**Recommendation:** Record actual user sessions (with permission) to identify friction points

---

### 5. **Dashboard Fixes are Quick Wins - PRIORITIZE ITERATION 3**

**Feature #4 (Direct Dashboard Start):**
- Estimated time: 1-2 hours
- Impact: Eliminates 30s delay on every dashboard launch
- User complaints: HIGH (current UX is frustrating)

**Feature #5 (Active Agents Tracking):**
- Estimated time: 2-3 hours
- Impact: Core dashboard feature becomes functional
- User complaints: MEDIUM (nice-to-have, not critical)

**Recommendation:** Both fixes can be in same iteration (total 4-5 hours)

---

### 6. **Make MCPs Truly Optional - UX CLARITY**

**Current ambiguity:** Users might think MCPs are required

**Clarification Strategy:**
- `/2l-setup-mcps` output starts with "MCPs are OPTIONAL"
- README shows MCP setup as "Step 3 (Optional)"
- First-time users can skip without penalty
- 2L gracefully degrades (no errors if MCPs unavailable)

**Recommendation:** Add "Skip MCPs" button/option in setup flow output

---

### 7. **Platform-Specific Testing - CRITICAL**

**Ubuntu/Debian:**
- `apt-get install postgresql-client` (requires sudo)
- `xdg-open` for browser launch
- Config path: `~/.config/Claude/`

**macOS:**
- `brew install postgresql` (requires Homebrew)
- `open` for browser launch
- Config path: `~/Library/Application Support/Claude/`

**Recommendation:** Test on both platforms for each iteration (not just at the end)

---

### 8. **Installation State Versioning - FUTURE-PROOFING**

**Current plan:** `~/.claude/.2l-install.yaml` tracks installation

**Recommendation:** Include version field from day 1
```yaml
installed_at: "2025-10-10T05:26:13Z"
version: "1.0.0"  # Semantic versioning
schema_version: "1"  # For .2l-install.yaml format itself
```

**Why:** Enables rollbacks, version-specific migrations, and update detection

---

## Technology Recommendations

### Existing Codebase Findings

**Stack Detected:**
- 2L orchestration system (10 agents, 19 commands)
- Bash scripts for all commands
- Python 3 for HTTP server (dashboard)
- HTML/CSS/JavaScript for dashboard UI
- Git for version control
- Supabase local (PostgreSQL) for database
- Claude Code CLI environment

**Patterns Observed:**
- Commands stored as Markdown files in `~/.claude/commands/`
- Agents stored as Markdown files in `~/.claude/agents/`
- Libraries stored in `~/.claude/lib/`
- Events logged to `.2L/events.jsonl` (JSONL format)
- Dashboard template uses placeholders (e.g., `{PROJECT_NAME}`)

**Opportunities:**
- Dashboard template already exists (`~/.claude/lib/2l-dashboard-template.html`) - just needs inline generation
- Event logger library already exists (`~/.claude/lib/2l-event-logger.sh`) - just needs to be used consistently
- Git integration already working (orchestrator commits results)

**Constraints:**
- Must work within Claude Code CLI environment
- Must not require external dependencies beyond Python 3 and Git
- Must be POSIX-compliant shell scripts (sh/bash)
- Must not break existing orchestrations

---

### Greenfield Recommendations (New Components)

**Installation Script (`2l.sh`):**
- Technology: Bash (POSIX-compliant)
- Why: Cross-platform (Linux/macOS), no dependencies, integrates with existing CLI environment
- Libraries needed: None (pure bash)

**State Tracking (`~/.claude/.2l-install.yaml`):**
- Technology: YAML format
- Why: Human-readable, easy to parse with standard tools, supports comments
- Parsing: Use `grep` and `awk` (avoid requiring yq/jq)

**Setup Commands (`/2l-setup-db`, `/2l-setup-mcps`):**
- Technology: Bash scripts (same as existing commands)
- Why: Consistency with existing commands, no new dependencies
- Pattern: Follow existing command structure (metadata header, implementation section)

**Dashboard HTML Generation:**
- Technology: Inline bash string replacement
- Why: Eliminates 30s agent spawn overhead, simpler than template engine
- Implementation:
  ```bash
  TEMPLATE=$(cat ~/.claude/lib/2l-dashboard-template.html)
  TEMPLATE="${TEMPLATE//{PROJECT_NAME}/$(basename $(pwd))}"
  echo "$TEMPLATE" > .2L/dashboard/index.html
  ```

---

## Notes & Observations

### Observation 1: Existing Dashboard is 90% Complete

**Current state:**
- Template exists: `~/.claude/lib/2l-dashboard-template.html` (12,233 bytes)
- Agent exists: `~/.claude/agents/2l-dashboard-builder.md`
- Command exists: `~/.claude/commands/2l-dashboard.md`
- HTTP server works (port allocation, browser launch)

**Only 2 fixes needed:**
1. Feature #4: Remove agent spawn, inline template processing (<2 hours)
2. Feature #5: Fix active agents parsing in JavaScript (<3 hours)

**Total work for full dashboard functionality: ~5 hours**

---

### Observation 2: Installation Script is the Biggest Unknowns

**Known complexities:**
- File copy operations (LOW complexity)
- Backup management (MEDIUM complexity)
- State tracking in YAML (MEDIUM complexity)
- Idempotency testing (HIGH complexity - must run 10 times without errors)

**Unknown complexities:**
- Symlink handling (if user has symlinked ~/.claude/agents to custom location)
- Cross-platform path differences (macOS vs Linux)
- Disk space checking (should we verify before copying?)
- Existing file conflict resolution (what if user customized an agent?)

**Recommendation:** Prototype installation script early in Iteration 1 to surface unknowns

---

### Observation 3: Database Setup is High-Risk

**Risks:**
1. **Sudo access requirement** - Many developers use machines without sudo (company laptops)
2. **Platform variance** - apt vs brew vs manual installation
3. **Supabase port assumption** - What if user runs Supabase on different port?
4. **Password security** - Plain text .sudo_access.txt might concern security-conscious users

**Mitigation strategies:**
- Provide manual installation instructions as fallback (if no sudo)
- Detect platform and show appropriate install command
- Support `--port` flag for custom Supabase ports
- Clearly document security implications in README

---

### Observation 4: MCP Setup is Low-Risk (Informational Only)

**Why low-risk:**
- No automated installation (just instructions)
- User can skip entirely (optional feature)
- No file modifications by script
- No dependencies on 2L internals

**Strategic advantage:**
- Teaches users about MCP configuration (valuable learning)
- Users appreciate guided instructions (better than "go read docs")
- Graceful degradation (2L works fine without MCPs)

---

### Observation 5: 5-Minute Setup Target is Achievable

**Breakdown:**
```
git clone: 30s
./2l.sh install: 15s
Open Claude Code: 10s
/2l-setup-db: 90s (includes psql installation)
/2l-mvp "vision": <5s (starts orchestration in background)
TOTAL: 2min 30s
```

**Buffer for user reading/typing: 2min 30s**

**Total: 5 minutes (ACHIEVABLE)**

**Critical path optimization:**
- Skip MCP setup (optional, saves 5+ minutes)
- Pre-install PostgreSQL client (if user already has it, saves 60s)
- Dashboard launch happens after orchestration starts (parallel, not sequential)

---

### Observation 6: README Simplification is UX Multiplier

**Current README (from existing code):**
- 800+ lines
- Comprehensive (covers everything)
- Overwhelming for new users (too much information)

**Proposed structure (from vision Feature #6):**
```markdown
# 2L - Quick Start (TOP OF README)

## Installation (3 steps)
1. git clone https://github.com/username/2L.git && cd 2L
2. ./2l.sh install
3. Open Claude Code in your project

## Setup (2 commands)
1. /2l-setup-db (configure database access)
2. /2l-setup-mcps (optional, for testing capabilities)

## First Orchestration
/2l-mvp "build a todo app"

## View Progress
/2l-dashboard

---

[Rest of detailed documentation below...]
```

**Impact:** New users can get started in 2 minutes of reading (vs. 10+ minutes currently)

---

### Observation 7: Installation State Enables Future Features

**Current vision:** `~/.claude/.2l-install.yaml` tracks installation

**Future possibilities:**
1. **Automatic updates** - Script checks version, prompts to update
2. **Rollback** - Restore previous version from backups
3. **Uninstall** - Remove all 2L components cleanly
4. **Health check** - `/2l-doctor` validates installation integrity
5. **Custom agent marketplace** - Track which agents are official vs community

**Recommendation:** Design state file with extensibility in mind

---

*Exploration completed: 2025-10-10T05:28:00Z*
*This report informs master planning decisions for plan-3*
