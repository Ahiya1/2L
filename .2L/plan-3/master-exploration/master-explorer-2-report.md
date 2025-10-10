# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Transform 2L from a manually-configured orchestration system into a production-ready tool with one-command installation, automated setup of all dependencies (database, MCPs), and instant dashboard startup - reducing new user setup from 30+ minutes to under 5 minutes.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 6 must-have features
- **User stories/acceptance criteria:** 41 acceptance criteria across all features
- **Estimated total work:** 14-20 hours

**Feature breakdown:**
1. Automated Installation Script (`2l.sh install`) - 8 acceptance criteria
2. Database Setup Command (`/2l-setup-db`) - 8 acceptance criteria
3. MCP Setup Command (`/2l-setup-mcps`) - 8 acceptance criteria
4. Direct Dashboard Start (Fix `/2l-dashboard`) - 8 acceptance criteria
5. Active Agents Dashboard Fix - 8 acceptance criteria
6. Simplified README - 7 acceptance criteria

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **6 distinct features with interdependencies:** Installation script must complete before setup commands work; dashboard fix affects user onboarding flow
- **System-level operations required:** File copying, sudo access management, database client installation, configuration file manipulation
- **Cross-platform concerns:** Must work on Ubuntu/Debian and macOS with different file paths and package managers
- **Security-sensitive operations:** Handling sudo passwords, managing `.gitignore`, file permissions (chmod 600)
- **Idempotency requirements:** All scripts must run multiple times without breaking, requiring state tracking and backup mechanisms
- **Existing codebase integration:** Must work with current symlink structure (agents, commands, lib pointing to `/home/ahiya/2l-claude-config`)

---

## Architectural Analysis

### Major Components Identified

1. **Installation Script (`2l.sh`)**
   - **Purpose:** Orchestrates copying agents, commands, and lib files to `~/.claude/`
   - **Complexity:** MEDIUM
   - **Why critical:** Foundation for all other features; must handle existing symlinks, backups, and multiple platforms
   - **Current state:** Does NOT exist - greenfield development
   - **Dependencies:** Git (for version detection), Bash (POSIX-compliant shell)

2. **Database Access Layer**
   - **Purpose:** Enables Claude to execute SQL queries via psql for schema validation during orchestration
   - **Complexity:** HIGH
   - **Why critical:** Differentiates 2L's capabilities; required for database-driven projects
   - **Current state:** Partially implemented (Supabase MCP exists in `.mcp.json`, psql installed)
   - **Dependencies:** PostgreSQL client tools (psql), Supabase local running on port 54322, sudo access for installation

3. **MCP Configuration System**
   - **Purpose:** Guides users through setting up optional Playwright and Chrome DevTools MCPs
   - **Complexity:** MEDIUM
   - **Why critical:** Enhances agent capabilities but must remain optional (graceful degradation)
   - **Current state:** 4 MCPs already configured in `claude_desktop_config.json` (Playwright, Chrome DevTools, Supabase, Screenshot)
   - **Dependencies:** Node.js/npx for MCP servers, Claude Desktop restart required

4. **Dashboard Generation Pipeline**
   - **Purpose:** Instantly generates and serves real-time event dashboard
   - **Complexity:** MEDIUM
   - **Why critical:** Primary observability tool; current 30-second startup hurts user experience
   - **Current state:** Dashboard builder agent exists (`2l-dashboard-builder.md`), template exists (`2l-dashboard-template.html`)
   - **Dependencies:** Python 3 (http.server), template in `~/.claude/lib/`, events.jsonl file

5. **Active Agents Tracking System**
   - **Purpose:** Parses `agent_start` and `agent_complete` events to show real-time agent status
   - **Complexity:** LOW
   - **Why critical:** Core observability feature mentioned in vision's pain points
   - **Current state:** Dashboard template exists, event logger exists (`2l-event-logger.sh`)
   - **Dependencies:** Event emission in agents, JSONL parsing in JavaScript

6. **Documentation System**
   - **Purpose:** Provides clear, beginner-friendly onboarding path
   - **Complexity:** LOW
   - **Why critical:** First impression for new users; reduces support burden
   - **Current state:** Comprehensive README.md exists (1213 lines) but described as "overwhelming"
   - **Dependencies:** None (pure documentation)

### Technology Stack Implications

**Shell Scripting (Installation)**
- **Options:** POSIX sh (maximum portability), Bash (richer features), Zsh (modern shell)
- **Recommendation:** Bash (`#!/bin/bash`)
- **Rationale:**
  - Vision explicitly states "Use `#!/bin/bash`" in technical requirements
  - Bash installed by default on Ubuntu and macOS
  - Richer array handling for file lists than POSIX sh
  - Widespread documentation and community support

**Database Client**
- **Options:** psql (native PostgreSQL client), Supabase CLI (includes connection management), MCP only (no CLI needed)
- **Recommendation:** psql with MCP as fallback
- **Rationale:**
  - psql already installed on developer's machine
  - Direct SQL execution for validation (faster than MCP server calls)
  - MCP server already configured for Supabase local
  - Both approaches can coexist for redundancy

**Configuration Storage**
- **Options:** YAML (`.2l-install.yaml`), JSON (`.2l-install.json`), Plain text (`.2l-installed`)
- **Recommendation:** YAML for state tracking
- **Rationale:**
  - Vision specifies `~/.claude/.2l-install.yaml` in data model
  - Human-readable for debugging
  - Supports complex data structures (lists of components, backups)
  - Python has built-in YAML parsing if automation needed

**Password Storage**
- **Options:** Plain text (`.sudo_access.txt`), Encrypted (gpg), Keyring integration (OS keychain)
- **Recommendation:** Plain text with strict permissions (chmod 600)
- **Rationale:**
  - Vision specifies `.sudo_access.txt` in data model
  - Simplicity over security for local development environments
  - Always in `.gitignore` (safety net)
  - chmod 600 prevents other users from reading
  - Advanced users can use passwordless sudo instead

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (2 iterations)

**Rationale:**
- 6 features is moderate scope, but high system-integration complexity
- Natural separation: **Foundation (setup automation)** vs **Enhancement (UX polish)**
- Iteration 1 delivers immediate value (5-minute setup), Iteration 2 refines experience (instant dashboard, better docs)
- Each iteration is independently testable and deployable
- 14-20 hour total effort splits naturally: 10-12 hours (Iteration 1) + 4-8 hours (Iteration 2)

### Suggested Iteration Phases

**Iteration 1: Setup Automation (Foundation)**
- **Vision:** "One command to install 2L and configure all dependencies"
- **Scope:** Core installation and setup infrastructure
  - Feature 1: Automated Installation Script (`2l.sh install`)
  - Feature 2: Database Setup Command (`/2l-setup-db`)
  - Feature 3: MCP Setup Command (`/2l-setup-mcps`)
- **Why first:** Establishes foundation for new user onboarding; most critical pain point ("difficult to set up on new machines")
- **Estimated duration:** 10-12 hours
  - `2l.sh install`: 4-5 hours (file operations, backup logic, cross-platform testing)
  - `/2l-setup-db`: 3-4 hours (sudo password handling, psql installation, connection testing)
  - `/2l-setup-mcps`: 3 hours (guided instructions, config snippet generation, OS-specific paths)
- **Risk level:** HIGH
  - System-level file operations (potential for data loss if backup logic fails)
  - Sudo password storage (security concern)
  - Cross-platform compatibility (Ubuntu vs macOS differences)
  - Symlink handling (current setup uses symlinks to `/home/ahiya/2l-claude-config`)
- **Success criteria:**
  - New user can run `./2l.sh install` and have all agents/commands/lib available in `~/.claude/`
  - Running `./2l.sh install` twice produces identical result (idempotency)
  - `/2l-setup-db` successfully stores sudo password and validates psql connection
  - `/2l-setup-mcps` generates correct config snippets for both Ubuntu and macOS

**Iteration 2: UX Polish (Enhancements)**
- **Vision:** "Instant feedback and clear documentation for seamless onboarding"
- **Scope:** Performance optimizations and documentation
  - Feature 4: Direct Dashboard Start (Fix `/2l-dashboard`)
  - Feature 5: Active Agents Dashboard Fix
  - Feature 6: Simplified README
- **Dependencies:** Requires Iteration 1 complete
  - Dashboard command improvement assumes `~/.claude/lib/2l-dashboard-template.html` exists (installed by `2l.sh install`)
  - README references `/2l-setup-db` and `/2l-setup-mcps` commands from Iteration 1
  - Active agents fix requires event logger library (`~/.claude/lib/2l-event-logger.sh`) installed
- **Estimated duration:** 4-8 hours
  - Dashboard fix: 2-3 hours (remove agent spawn logic, add direct template processing)
  - Active agents fix: 2-3 hours (JavaScript event parsing, edge case handling)
  - README restructure: 2 hours (reorganization, not rewriting)
- **Risk level:** MEDIUM
  - Dashboard changes affect critical observability tool
  - JavaScript event parsing bugs could break real-time updates
  - README restructuring might remove important information
- **Success criteria:**
  - `/2l-dashboard` starts in under 2 seconds (vs current ~30 seconds)
  - Dashboard correctly shows active agents with live duration updates
  - New user can complete setup following README alone (90% success rate in user testing)
  - All existing dashboard functionality preserved (backward compatibility)

---

## Dependency Graph

```
Iteration 1: Setup Automation (Foundation)
├── 2l.sh install
│   ├── Creates ~/.claude/agents/ (copies from repo)
│   ├── Creates ~/.claude/commands/ (copies from repo)
│   ├── Creates ~/.claude/lib/ (copies templates + event logger)
│   ├── Creates ~/.claude/.2l-install.yaml (state tracking)
│   └── Handles existing symlinks (current setup)
│       ↓
├── /2l-setup-db
│   ├── Requires: psql available (installs if missing via sudo)
│   ├── Creates: .sudo_access.txt (project root)
│   ├── Modifies: .gitignore (adds .sudo_access.txt)
│   └── Tests: Connection to localhost:54322
│       ↓
└── /2l-setup-mcps
    ├── Detects: claude_desktop_config.json location (OS-specific)
    ├── Generates: Config snippets for Playwright + Chrome DevTools
    └── Provides: Validation instructions
        ↓
        ↓ (All setup infrastructure in place)
        ↓
Iteration 2: UX Polish (Enhancements)
├── Direct Dashboard Start
│   ├── Requires: ~/.claude/lib/2l-dashboard-template.html (from Iteration 1)
│   ├── Reads: Template directly (no agent spawn)
│   ├── Replaces: Placeholders inline
│   └── Writes: .2L/dashboard/index.html
│       ↓
├── Active Agents Fix
│   ├── Requires: Event logger installed (from Iteration 1)
│   ├── Reads: .2L/events.jsonl
│   ├── Parses: agent_start and agent_complete events
│   └── Updates: Dashboard UI in real-time
│       ↓
└── Simplified README
    ├── References: ./2l.sh install (from Iteration 1)
    ├── References: /2l-setup-db and /2l-setup-mcps (from Iteration 1)
    └── Demonstrates: /2l-dashboard (enhanced in Iteration 2)
```

**Critical Path Analysis:**
1. `2l.sh install` MUST complete before any other feature (provides foundation)
2. `/2l-setup-db` and `/2l-setup-mcps` are parallel (no interdependency)
3. Iteration 2 features are fully dependent on Iteration 1 infrastructure
4. Within Iteration 2, all features are parallel (independent implementation)

**Dependency Chain Summary:**
- **Blocking dependencies:** `2l.sh install` blocks everything else
- **Parallel work opportunities:** Database and MCP setup can be built simultaneously; all Iteration 2 features can be built simultaneously
- **Integration points:** README must be updated last (references all other features)

---

## Risk Assessment

### High Risks

#### Risk 1: Symlink Handling in Installation Script
- **Description:** Current setup uses symlinks from `~/.claude/agents` → `/home/ahiya/2l-claude-config/agents`. Installation script must detect and handle this gracefully.
- **Impact:**
  - If script blindly copies files, symlinks will be replaced with directories
  - User's workflow disrupted (symlinks provide centralized management)
  - Data loss if existing customizations in target directories
- **Mitigation:**
  1. Detect symlinks before copy: `if [ -L "$HOME/.claude/agents" ]; then`
  2. Prompt user for strategy: "Existing symlink detected. Replace with files (REPLACE) or update symlink target (UPDATE)?"
  3. Create backup before any destructive operation: `mv ~/.claude/agents ~/.claude/agents.backup-$(date +%s)`
  4. Log all operations to `~/.claude/.2l-install.log` for rollback
- **Recommendation:** Implement in Iteration 1, Phase 1 (first task in installation script development)

#### Risk 2: Sudo Password Storage Security
- **Description:** Storing plain text sudo password in `.sudo_access.txt` creates security vulnerability if file permissions misconfigured or `.gitignore` fails.
- **Impact:**
  - Password exposed in git history if `.sudo_access.txt` committed
  - Other users on system could read password if chmod not 600
  - Social engineering attack if user shares repo publicly
- **Mitigation:**
  1. Set chmod 600 immediately after creation: `chmod 600 .sudo_access.txt`
  2. Verify `.gitignore` before writing: `grep -q "\.sudo_access\.txt" .gitignore || echo ".sudo_access.txt" >> .gitignore`
  3. Warn user on creation: "⚠️  Sudo password stored in .sudo_access.txt - NEVER commit this file!"
  4. Provide revocation instructions: "To revoke access: rm .sudo_access.txt"
  5. Document alternative: "For passwordless sudo: visudo and add `user ALL=(ALL) NOPASSWD: ALL`"
- **Recommendation:** Implement comprehensive security checks in `/2l-setup-db` (Iteration 1)

#### Risk 3: Cross-Platform Installation Differences
- **Description:** Ubuntu and macOS have different package managers (apt vs brew), file paths (lib vs Library), and shell environments (bash versions).
- **Impact:**
  - Script fails on macOS if hardcoded apt commands
  - Config file paths wrong (claude_desktop_config.json location)
  - Bash version differences cause syntax errors (macOS ships old Bash 3.x)
- **Mitigation:**
  1. Detect OS early: `if [[ "$OSTYPE" == "darwin"* ]]; then OS="macos"; else OS="linux"; fi`
  2. Use OS-specific logic blocks:
     ```bash
     if [ "$OS" == "macos" ]; then
       CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
     else
       CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
     fi
     ```
  3. Abstract package manager: `install_pkg() { if [ "$OS" == "macos" ]; then brew install "$1"; else sudo apt install -y "$1"; fi }`
  4. Test on both platforms before release
  5. Use Bash 3.x compatible syntax (avoid Bash 4+ features like associative arrays)
- **Recommendation:** Build OS detection into `2l.sh install` foundation; test on both platforms in Iteration 1

#### Risk 4: Dashboard Template Parsing Complexity
- **Description:** Removing agent spawn from `/2l-dashboard` means implementing inline template processing with placeholder replacement. Complex regex/sed operations prone to edge cases.
- **Impact:**
  - Incorrect substitution breaks dashboard HTML
  - Special characters in project name break sed expressions
  - Multi-line placeholders not handled correctly
- **Mitigation:**
  1. Use simple, robust placeholder format: `{{PROJECT_NAME}}`, `{{TIMESTAMP}}`, `{{EVENTS_PATH}}`
  2. Escape special characters before substitution: `PROJECT_NAME=$(basename "$PWD" | sed 's/[\/&]/\\&/g')`
  3. Test with edge cases: project names with spaces, special chars, unicode
  4. Validate output HTML before serving: `grep -q "</html>" .2L/dashboard/index.html || echo "Error: Invalid HTML generated"`
  5. Keep fallback: If direct generation fails, fall back to agent spawn (temporary degradation)
- **Recommendation:** Implement robust placeholder replacement in Iteration 2; include comprehensive edge case testing

### Medium Risks

#### Risk 5: Idempotency Testing Coverage
- **Description:** All scripts must be idempotent (run multiple times safely), but testing all edge cases is complex.
- **Impact:**
  - Second run of `./2l.sh install` corrupts existing setup
  - Multiple `/2l-setup-db` runs create duplicate `.gitignore` entries
  - State file (`~/.claude/.2l-install.yaml`) out of sync with reality
- **Mitigation:**
  1. Design for idempotency from start: Check before create, update instead of append
  2. Automated test script:
     ```bash
     # test-idempotency.sh
     ./2l.sh install
     CHECKSUM1=$(find ~/.claude/agents ~/.claude/commands -type f -exec md5sum {} \; | md5sum)
     ./2l.sh install
     CHECKSUM2=$(find ~/.claude/agents ~/.claude/commands -type f -exec md5sum {} \; | md5sum)
     [ "$CHECKSUM1" == "$CHECKSUM2" ] && echo "PASS: Idempotent" || echo "FAIL: Files changed"
     ```
  3. State file versioning: Track installation version in `.2l-install.yaml` to handle upgrades gracefully
  4. Manual testing on clean VM (Ubuntu 24.04) and clean macOS machine
- **Recommendation:** Build idempotency tests alongside feature development in Iteration 1

#### Risk 6: MCP Configuration Conflicts
- **Description:** User may have existing MCPs configured. `/2l-setup-mcps` must merge, not replace.
- **Impact:**
  - Overwriting `claude_desktop_config.json` destroys user's existing MCP setup
  - User loses access to personal/work MCPs (e.g., company-specific tools)
- **Mitigation:**
  1. Read existing config: `EXISTING=$(cat "$CONFIG_PATH" 2>/dev/null || echo "{}")`
  2. Detect MCPs already configured: `echo "$EXISTING" | jq -e '.mcpServers.playwright' && echo "Playwright already configured"`
  3. Provide merge instructions, not automatic overwrite:
     ```
     Add this to your mcpServers section:
     "playwright": { "command": "npx", "args": [...] }
     ```
  4. Offer manual merge option: "Edit config file manually? Your editor: $EDITOR"
  5. Create backup before any modification: `cp "$CONFIG_PATH" "$CONFIG_PATH.backup-$(date +%s)"`
- **Recommendation:** Make `/2l-setup-mcps` informational-only (generate snippets, don't modify files) in Iteration 1

#### Risk 7: Event Parsing Edge Cases (Active Agents)
- **Description:** JSONL parsing in JavaScript must handle malformed events, orphaned starts (no complete), duplicate events.
- **Impact:**
  - Dashboard crashes on malformed JSON line
  - Active agents list shows "zombie" agents (started but never completed)
  - Duplicate start events cause incorrect duration calculation
- **Mitigation:**
  1. Wrap JSON parsing in try-catch:
     ```javascript
     lines.forEach(line => {
       try {
         const event = JSON.parse(line);
         processEvent(event);
       } catch (e) {
         console.warn("Skipping malformed event:", line);
       }
     });
     ```
  2. Handle orphaned starts with timeout: If agent_start > 1 hour ago and no complete, mark as "Stale (possibly crashed)"
  3. Deduplicate by (agent_id, event_type, timestamp): Use Set or Map keyed by unique identifier
  4. Test with intentionally corrupted events.jsonl
- **Recommendation:** Implement robust error handling in Iteration 2 dashboard JavaScript

### Low Risks

#### Risk 8: README Reorganization Information Loss
- **Description:** Simplifying README might remove valuable advanced information.
- **Impact:**
  - Experienced users lose reference material
  - Edge case documentation deleted
- **Mitigation:**
  1. Don't delete content, restructure: Move advanced topics to later sections with clear headings
  2. Add table of contents for navigation
  3. Link to detailed docs for deep dives
  4. Git tracks changes: Can recover any deleted content
  5. Review with another developer before finalizing
- **Recommendation:** Low priority; careful review during Iteration 2

#### Risk 9: Port Exhaustion (Dashboard)
- **Description:** All 20 ports (8080-8099) occupied if user runs many concurrent dashboards.
- **Impact:** Dashboard fails to start with "All ports in use" error
- **Mitigation:** Already handled by current dashboard design (error message + instructions to stop other dashboards)
- **Recommendation:** No additional work needed; existing design sufficient

#### Risk 10: Python 3 Missing
- **Description:** User might not have Python 3 installed (required for dashboard HTTP server).
- **Impact:** Dashboard fails to start
- **Mitigation:**
  1. Check in `/2l-dashboard` command: `command -v python3 >/dev/null 2>&1 || { echo "Error: Python 3 required"; exit 1; }`
  2. Provide installation instructions in error message
  3. Document in README prerequisites
- **Recommendation:** Add python3 check to `/2l-dashboard` in Iteration 2 (low effort, high value)

---

## Integration Considerations

### Cross-Phase Integration Points

#### Shared Component: ~/.claude/lib/ Directory
- **What it is:** Centralized location for shared templates and utilities
- **Why it spans iterations:**
  - Iteration 1: `2l.sh install` creates lib/ and populates with `2l-dashboard-template.html` and `2l-event-logger.sh`
  - Iteration 2: `/2l-dashboard` command reads template from lib/; active agents fix depends on event logger
- **Integration challenge:** Iteration 2 assumes specific file paths/formats from Iteration 1
- **Solution:** Define lib/ structure as contract in Iteration 1:
  ```
  ~/.claude/lib/
  ├── 2l-dashboard-template.html (HTML with {{PLACEHOLDERS}})
  ├── 2l-event-logger.sh (Bash library with log_2l_event function)
  └── README.md (Documents lib/ structure for future features)
  ```

#### Shared Pattern: Configuration File Detection
- **What it is:** Multiple features need to find OS-specific config paths
- **Why it spans iterations:**
  - Iteration 1: `/2l-setup-mcps` detects `claude_desktop_config.json` location
  - Future: Any new setup command might need same logic
- **Integration challenge:** Duplicated code across scripts
- **Solution:** Extract to shared library function in `~/.claude/lib/2l-helpers.sh`:
  ```bash
  # ~/.claude/lib/2l-helpers.sh
  get_claude_config_path() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
      echo "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    else
      echo "$HOME/.config/Claude/claude_desktop_config.json"
    fi
  }
  ```

#### Shared Pattern: Backup Before Modify
- **What it is:** Consistent backup strategy across all scripts
- **Why consistency matters:**
  - `2l.sh install` backs up existing agents/commands
  - `/2l-setup-db` backs up existing .sudo_access.txt (if exists)
  - `/2l-setup-mcps` backs up claude_desktop_config.json
- **Integration challenge:** Users expect consistent backup location and naming
- **Solution:** Standardize backup format:
  ```bash
  # Format: {original-name}.backup-{timestamp}
  # Location: Same directory as original
  # Example: ~/.claude/agents.backup-1728518400
  backup_file() {
    local FILE=$1
    [ -e "$FILE" ] && cp -r "$FILE" "${FILE}.backup-$(date +%s)"
  }
  ```

### Potential Integration Challenges

#### Challenge 1: Installation State Tracking
- **Description:** `~/.claude/.2l-install.yaml` tracks installed components. Must be accurate for updates to work.
- **Why it matters:**
  - `./2l.sh install --update` relies on state file to know what to update
  - Missing or corrupted state file breaks update mechanism
- **Solution:**
  1. Write state file atomically (write to .tmp, then mv)
  2. Validate state file on read (YAML parsing check)
  3. Rebuild state from filesystem if corrupted: `find ~/.claude/agents -type f | wc -l` to count installed agents
- **Testing:** Manually corrupt state file and verify graceful recovery

#### Challenge 2: Command Execution Environment
- **Description:** Commands run in different shells (user's interactive shell vs Claude-spawned subprocess). Environment variables and PATH might differ.
- **Why it matters:**
  - `/2l-setup-db` might find psql in user shell but not in Claude's subprocess
  - sudo password file location depends on $PWD
- **Solution:**
  1. Use absolute paths everywhere: `/usr/bin/psql` instead of `psql`
  2. Detect commands with `command -v`: `PSQL=$(command -v psql)` then use `$PSQL`
  3. Document PWD assumptions: "Run /2l-setup-db from project root"
- **Testing:** Run commands from different directories to verify behavior

#### Challenge 3: README Links to Other Features
- **Description:** Simplified README in Iteration 2 must reference commands from Iteration 1. If those commands change, links break.
- **Why it matters:**
  - User follows README, gets different behavior than documented
  - Outdated examples confuse new users
- **Solution:**
  1. Use standard command names as stable API: `/2l-setup-db` name locked in Iteration 1
  2. Document command behavior in comments: Keep command interface stable even if internals change
  3. Version README alongside features: Update README in same iteration as command changes
- **Testing:** Follow README step-by-step on fresh system

#### Challenge 4: Dashboard Template Placeholder Contract
- **Description:** Iteration 1 creates template, Iteration 2 consumes it. Placeholder names must match exactly.
- **Why it matters:**
  - Mismatched placeholder names result in broken dashboard (unreplaced `{{WRONG_NAME}}` visible in UI)
- **Solution:**
  1. Define placeholder contract upfront:
     - `{{PROJECT_NAME}}` - Basename of current directory
     - `{{TIMESTAMP}}` - ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
     - `{{EVENTS_PATH}}` - Relative path to events.jsonl (always `../events.jsonl`)
  2. Document in template file header comment
  3. Validate in `/2l-dashboard` before serving: Check all placeholders replaced
- **Testing:** Grep dashboard HTML for any remaining `{{` after generation

---

## Recommendations for Master Plan

1. **Start with Iteration 1 exclusively**
   - Do not attempt Iteration 2 work until Iteration 1 fully tested and validated
   - Rationale: Iteration 2 has hard dependencies on Iteration 1 infrastructure (lib/ directory, commands installed)
   - Success metric: Fresh Ubuntu 24.04 VM can complete `./2l.sh install && /2l-setup-db && /2l-setup-mcps` in under 5 minutes

2. **Prioritize idempotency testing in Iteration 1**
   - All scripts (2l.sh install, /2l-setup-db, /2l-setup-mcps) must be idempotent
   - Test strategy: Run each script 3 times consecutively, verify no errors and no state changes after first run
   - Critical for production readiness (vision emphasizes "works everywhere")

3. **Handle existing symlink setup gracefully**
   - Current setup uses symlinks: `~/.claude/agents -> /home/ahiya/2l-claude-config/agents`
   - Installation script must detect symlinks and prompt user for strategy (replace vs update)
   - Create comprehensive backup before any destructive operation

4. **Make Iteration 2 backward compatible**
   - Dashboard changes must not break existing users who already have dashboard working
   - Test plan: Verify `/2l-dashboard` works both with and without lib/ directory present (fall back to agent spawn if lib/ missing)
   - README restructure must preserve all information (move, don't delete)

5. **Document cross-platform testing requirements**
   - Iteration 1 must be tested on both Ubuntu/Debian and macOS before merging
   - Set up test VMs: Ubuntu 24.04 (primary) and macOS Sonoma (secondary)
   - Automated test script: `./test-setup.sh` that runs all setup commands and validates results

6. **Implement security best practices for sudo password**
   - Always set chmod 600 on .sudo_access.txt
   - Always verify .gitignore before writing password
   - Provide clear revocation instructions in command output
   - Document passwordless sudo alternative for security-conscious users

7. **Consider Iteration 3 (optional) for advanced features**
   - Post-MVP features (Health Check, Uninstall, Auto-update) are valuable but not blocking
   - Recommendation: Validate Iterations 1-2 with real users before committing to Iteration 3
   - User feedback might reveal different priorities than currently envisioned

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- Shell: Bash (commands and agents use .md files with embedded bash)
- Dashboard: HTML/CSS/JavaScript (static files, no framework)
- Event system: JSONL format (events.jsonl)
- HTTP server: Python 3 http.server module
- Version control: Git (for commits after each iteration)
- GitHub integration: gh CLI (for pushing to remote)
- MCPs: Node.js/npx-based MCP servers (Playwright, Chrome DevTools, Supabase, Screenshot)

**Patterns observed:**
- Commands stored in `~/.claude/commands/` as Markdown files (Claude interprets these)
- Agents stored in `~/.claude/agents/` as Markdown files with system prompts
- Libraries/utilities in `~/.claude/lib/` (2l-dashboard-template.html, 2l-event-logger.sh)
- Symlink structure for centralized management: `~/.claude/{agents,commands,lib} -> /home/ahiya/2l-claude-config/{agents,commands,lib}`
- Event emission via bash library: `. $HOME/.claude/lib/2l-event-logger.sh && log_2l_event`
- JSONL append-only format for concurrent writes without locking

**Opportunities:**
- Centralize OS detection logic (currently would be duplicated across scripts)
- Create shared backup utility (consistent backup naming across all scripts)
- Add validation script to verify installation state
- Version installation state file for future upgrade logic

**Constraints:**
- Must preserve existing symlink structure (or provide migration path)
- Must work with Claude Code CLI environment (command execution context)
- Must remain POSIX-compliant where possible (macOS bash 3.x compatibility)
- Cannot require additional dependencies beyond Python 3 and Git (vision constraint)

### Greenfield Recommendations

**New components to create:**

1. **2l.sh installation script**
   - Language: Bash 3.x compatible
   - Location: Project root (2L repository, not ~/.claude/)
   - Features: install, --update flag, --help
   - Exit codes: 0 (success), 1 (error), 2 (partial success)

2. **~/.claude/.2l-install.yaml state file**
   - Format: YAML
   - Schema:
     ```yaml
     installed_at: "2025-10-10T12:00:00Z"
     version: "1.0.0"
     components:
       - agents (42 files)
       - commands (18 files)
       - lib (2 files)
     backups:
       - /home/user/.claude/agents.backup-1728518400
       - /home/user/.claude/commands.backup-1728518400
     ```

3. **~/.claude/lib/2l-helpers.sh utility library**
   - Functions: get_claude_config_path(), detect_os(), backup_file(), install_pkg()
   - Sourced by all setup commands for consistency
   - Reduces code duplication

4. **test-setup.sh validation script**
   - Purpose: Automated testing of installation on clean system
   - Checks: All files copied, state file valid, commands executable
   - Use: CI/CD or manual validation

---

## Notes & Observations

### Observation 1: Current Setup Already Advanced
The developer's machine already has:
- 4 MCPs fully configured (Playwright, Chrome DevTools, Supabase, Screenshot)
- Supabase local setup with config.toml
- psql installed and working
- Comprehensive README (1213 lines, very detailed)
- Event system fully implemented (logger + template)
- Dashboard template already exists

**Implication:** This is less about building from scratch and more about **packaging existing functionality for portability**. The core challenge is making the current working setup reproducible on new machines.

### Observation 2: Symlink Structure Requires Careful Handling
Current setup uses symlinks for centralized management:
```
~/.claude/agents -> /home/ahiya/2l-claude-config/agents
~/.claude/commands -> /home/ahiya/2l-claude-config/commands
~/.claude/lib -> /home/ahiya/2l-claude-config/lib
```

**Implication:** Installation script must support two modes:
1. **Copy mode:** Copy files directly to ~/.claude/ (for new users)
2. **Symlink mode:** Update symlink targets (for power users with centralized config)

**Recommendation:** Default to copy mode (simpler), offer symlink mode via flag: `./2l.sh install --symlink /path/to/2l-claude-config`

### Observation 3: Dashboard Performance Critical
Vision emphasizes "30-second agent spawn overhead" as major pain point. Current dashboard command spawns `2l-dashboard-builder` agent just to replace 3 placeholders.

**Implication:** This is low-hanging fruit for immediate impact. Replacing 150 lines of orchestration logic with 10 lines of sed commands will dramatically improve UX.

**Recommendation:** Prioritize dashboard fix in Iteration 2 (quick win, high visibility).

### Observation 4: Security vs Simplicity Trade-off
Vision specifies plain text sudo password storage (`.sudo_access.txt`) with chmod 600. This prioritizes simplicity over security.

**Implication:** Target audience is individual developers on local machines, not production servers. Security model assumes single-user development environment.

**Recommendation:** Document security model clearly in README: "For local development only. Use passwordless sudo for shared/production environments."

### Observation 5: Cross-Platform Testing Essential
Vision lists Ubuntu/Debian as primary, macOS as secondary. Current development environment is Ubuntu 24.04.

**Implication:** macOS-specific bugs likely (file paths, brew vs apt, bash version differences). Testing on macOS required before release.

**Recommendation:** Set up macOS test environment (VM or physical) and include in acceptance criteria for Iteration 1.

### Observation 6: README Already Excellent (Just Overwhelming)
Current README.md is comprehensive (1213 lines), well-structured, and detailed. Vision describes it as "overwhelming for new users," not incorrect or incomplete.

**Implication:** Restructuring (not rewriting) is the task. Add quick start section at top, move advanced topics to bottom. Content is already high-quality.

**Recommendation:** Minimal work required (2 hours estimate accurate). Focus on structure: Add TOC, reorganize sections, create clear "5-minute setup" path at top.

### Observation 7: Events System Already Production-Ready
Event system fully implemented:
- 8 event types defined
- JSONL format working
- Event logger library exists
- Dashboard polling functional
- Graceful degradation if library missing

**Implication:** Active agents fix is likely small scope (JavaScript parsing edge cases, not architecture changes).

**Recommendation:** Focus Iteration 2 active agents work on edge case handling and testing, not core functionality.

---

*Exploration completed: 2025-10-10T05:30:00Z*
*This report informs master planning decisions*
