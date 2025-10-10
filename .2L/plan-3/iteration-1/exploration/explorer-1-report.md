# Explorer 1 Report: Architecture & Structure

## Executive Summary

Iteration 1 focuses on building the **setup automation infrastructure** - the foundation that will enable 5-minute 2L onboarding. This exploration analyzed the current architecture, identified three main components (installation script, database setup command, MCP setup command), and mapped the file/folder structure needed. The architecture is straightforward bash-centric scripting with clear boundaries, but requires careful handling of cross-platform differences, sudo access security, and idempotent operations. Complexity is **MEDIUM** - well-scoped features with established patterns, but system-level integration introduces risk.

## Discoveries

### Current Architecture State

**Existing Structure:**
- **Agent/Command/Lib Storage:** Currently uses symlinks from `~/.claude/` to `/home/ahiya/2l-claude-config/`
  - `~/.claude/agents/` → `/home/ahiya/2l-claude-config/agents/` (10 agent files)
  - `~/.claude/commands/` → `/home/ahiya/2l-claude-config/commands/` (22 command files)
  - `~/.claude/lib/` → `/home/ahiya/2l-claude-config/lib/` (2 library files)
  - `~/.claude/schemas/` → `/home/ahiya/2l-claude-config/schemas/`

**Current Setup Pain Points (from vision):**
1. Supabase database access works on developer machine but isn't portable
2. MCP setup requires manual JSON editing with no guided workflow
3. Dashboard spawns unnecessary agent for 30-second HTML generation
4. No automated installation script exists
5. New machine setup requires significant manual work

**Installation Target Architecture:**
- 2L repository structure will remain source of truth
- Installation script will **copy** (not symlink) files to `~/.claude/`
- State tracking via `~/.claude/.2l-install.yaml` for idempotency
- Backup mechanism for existing files before overwrite
- Cross-platform support (Ubuntu/Debian + macOS)

### Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                  2L Repository (Source)                      │
│  /home/ahiya/Ahiya/2L/                                       │
│  ├── agents/          (10 .md files)                        │
│  ├── commands/        (22 .md files)                        │
│  ├── lib/             (2 files: template.html, logger.sh)  │
│  └── 2l.sh            [NEW] Installation orchestrator       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ ./2l.sh install
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              User's Claude Config (~/.claude/)               │
│  ├── agents/          (copied from repo)                    │
│  ├── commands/        (copied from repo)                    │
│  ├── lib/             (copied from repo)                    │
│  └── .2l-install.yaml [NEW] Installation state tracking     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User runs setup commands
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Project Directory (user's project)              │
│  ├── .sudo_access.txt [NEW] Sudo password for psql         │
│  ├── .gitignore       [MODIFIED] Auto-add .sudo_access.txt │
│  ├── .2L/                                                   │
│  │   ├── events.jsonl                                       │
│  │   └── dashboard/index.html                               │
│  └── supabase/        (if using Supabase local)            │
└─────────────────────────────────────────────────────────────┘
```

### Entry Points and Boundaries

**Entry Point 1: Installation (`2l.sh install`)**
- **Boundary:** Operates only on `~/.claude/` directory
- **Input:** Files from 2L repository (agents/, commands/, lib/)
- **Output:** Copied files, backup of existing files, state tracking YAML
- **Exit codes:** 0 = success, 1 = error, 2 = partial success

**Entry Point 2: Database Setup (`/2l-setup-db` command)**
- **Boundary:** Operates on project directory (creates `.sudo_access.txt`, modifies `.gitignore`)
- **Input:** User-provided sudo password (interactive prompt)
- **Output:** `.sudo_access.txt` (chmod 600), updated `.gitignore`, psql installation
- **Dependencies:** Requires `2l.sh install` to have run (command must exist in ~/.claude/)

**Entry Point 3: MCP Setup (`/2l-setup-mcps` command)**
- **Boundary:** Provides guidance only, user manually edits `claude_desktop_config.json`
- **Input:** None (detection-only)
- **Output:** Step-by-step instructions, config snippet, validation steps
- **Dependencies:** Requires `2l.sh install` to have run

**Boundary Isolation:**
- Installation script operates globally (`~/.claude/`)
- Setup commands operate per-project (`.sudo_access.txt` in project root)
- No cross-contamination between projects (each has own `.sudo_access.txt`)

### File/Folder Structure for Installation

**New Files to Create:**

```
2L/
└── 2l.sh                           [NEW] 400 lines - Main installation script
    ├── install subcommand          Copy agents/commands/lib to ~/.claude/
    ├── --update flag               Overwrite existing files with backup
    ├── --quiet flag                Silent mode
    └── State tracking              Write to ~/.claude/.2l-install.yaml

~/.claude/
└── .2l-install.yaml                [NEW] Installation state tracker
    ├── installed_at: "2025-10-10T12:00:00Z"
    ├── version: "1.0.0"
    ├── components: [agents, commands, lib]
    └── backups: [{timestamp, path}]

~/.claude/commands/
├── 2l-setup-db.md                  [NEW] 200 lines - Database setup command
└── 2l-setup-mcps.md                [NEW] 250 lines - MCP setup command

{project}/.sudo_access.txt          [NEW PER PROJECT] Sudo password (chmod 600)
{project}/.gitignore                [MODIFIED] Auto-append .sudo_access.txt
```

**Existing Files to Understand:**

```
~/.claude/lib/
├── 2l-event-logger.sh              [EXISTING] Event emission library
└── 2l-dashboard-template.html      [EXISTING] Dashboard HTML template

~/.claude/commands/
└── 2l-dashboard.md                 [EXISTING] Dashboard command (to be modified in Iteration 2)

~/.claude/agents/
├── 2l-builder.md                   [EXISTING] 10 agent files
├── 2l-explorer.md
├── 2l-planner.md
└── ...                             (7 more agent files)
```

## Patterns Identified

### Pattern 1: Bash Script Installation Pattern

**Description:** POSIX-compliant bash script with argument parsing, pre-flight checks, and rollback capability

**Use Case:** Installing files to `~/.claude/` with idempotency and safety guarantees

**Example Structure:**
```bash
#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Argument parsing
UPDATE_MODE=false
QUIET_MODE=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    install) COMMAND="install"; shift ;;
    --update) UPDATE_MODE=true; shift ;;
    --quiet) QUIET_MODE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Pre-flight checks
check_dependencies() {
  command -v git >/dev/null 2>&1 || { echo "Git not found"; exit 1; }
}

# Backup existing files
backup_existing() {
  local timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_dir="$HOME/.claude/.2l-backups/$timestamp"
  mkdir -p "$backup_dir"
  cp -r ~/.claude/agents "$backup_dir/" 2>/dev/null || true
}

# Main installation logic
install_2l() {
  check_dependencies
  backup_existing
  copy_files
  update_state_yaml
}

# Execute
if [[ "$COMMAND" == "install" ]]; then
  install_2l
fi
```

**Recommendation:** Use this pattern for `2l.sh install` - proven approach with built-in safety

### Pattern 2: Interactive Command with Secure Input

**Description:** Claude Code command that prompts for sensitive input and stores securely

**Use Case:** Database setup requiring sudo password storage

**Example Structure:**
```bash
# In /2l-setup-db command implementation

# Check if already configured
if [ -f ".sudo_access.txt" ]; then
  echo "Database access already configured."
  echo "Re-run to update password."
fi

# Interactive password prompt
echo "Enter your sudo password (for psql installation):"
read -s SUDO_PASSWORD  # -s flag hides input

# Create .sudo_access.txt with strict permissions
echo "$SUDO_PASSWORD" > .sudo_access.txt
chmod 600 .sudo_access.txt  # Owner read/write only

# Auto-add to .gitignore
if ! grep -q "^\.sudo_access\.txt$" .gitignore 2>/dev/null; then
  echo ".sudo_access.txt" >> .gitignore
fi

# Test sudo access
echo "$SUDO_PASSWORD" | sudo -S apt-get update >/dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Sudo access verified"
else
  echo "✗ Sudo password incorrect"
  exit 1
fi
```

**Recommendation:** Use this pattern for `/2l-setup-db` - balances security with usability

### Pattern 3: Guided Setup with OS Detection

**Description:** Command provides step-by-step instructions rather than automation, with OS-specific paths

**Use Case:** MCP setup where user must manually edit config files

**Example Structure:**
```bash
# In /2l-setup-mcps command implementation

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
else
  echo "Unsupported OS: $OSTYPE"
  exit 1
fi

# Check existing config
if [ -f "$CONFIG_PATH" ]; then
  echo "✓ Found existing config: $CONFIG_PATH"
  # Parse existing mcpServers
else
  echo "⚠ No config found. Will create after MCP installation."
fi

# Provide step-by-step instructions
cat <<EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Install Playwright MCP Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Clone repository:
   git clone https://github.com/executeautomation/playwright-mcp-server.git
   
2. Install dependencies:
   cd playwright-mcp-server
   npm install

3. Add to config file ($CONFIG_PATH):

{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["/absolute/path/to/playwright-mcp-server/index.js"]
    }
  }
}

4. Restart Claude Desktop

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
```

**Recommendation:** Use this pattern for `/2l-setup-mcps` - provides clarity without overstepping automation boundaries

### Pattern 4: State Tracking with YAML

**Description:** YAML file tracks installation metadata for idempotency and rollback

**Use Case:** Tracking what's installed, when, and where backups are

**Example Schema:**
```yaml
installed_at: "2025-10-10T12:34:56Z"
version: "1.0.0"
components:
  - agents
  - commands
  - lib
backups:
  - timestamp: "2025-10-10T12:00:00Z"
    path: "/home/user/.claude/.2l-backups/20251010-120000"
  - timestamp: "2025-10-09T14:30:00Z"
    path: "/home/user/.claude/.2l-backups/20251009-143000"
last_update: "2025-10-10T12:34:56Z"
source_repo: "/home/ahiya/Ahiya/2L"
```

**Recommendation:** Use this pattern for `~/.claude/.2l-install.yaml` - enables smart updates and rollbacks

## Complexity Assessment

### High Complexity Areas

**1. Installation Script (`2l.sh install`) - 4-5 hours**
- **Why complex:**
  - Must handle existing installations (update vs fresh install)
  - Backup and rollback mechanism required
  - Cross-platform file operations (macOS vs Linux path differences)
  - Idempotency checks (run 10 times without breaking)
  - State tracking YAML read/write
  - Permission handling (chmod, ownership)
- **Estimated builder splits:** Likely COMPLETE (well-scoped single-purpose script)
- **Risk mitigation:** Extensive pre-flight checks, dry-run mode for testing

**2. Database Setup Command (`/2l-setup-db`) - 3-4 hours**
- **Why complex:**
  - Interactive sudo password prompt (security-sensitive)
  - PostgreSQL client installation with package manager detection (apt vs brew)
  - Connection testing to localhost:54322 (Supabase local port)
  - .gitignore auto-append with deduplication
  - Troubleshooting guidance for multiple failure modes
  - Idempotent re-runs (detect existing setup, allow password updates)
- **Estimated builder splits:** Likely COMPLETE (single cohesive workflow)
- **Risk mitigation:** Comprehensive error messages, manual fallback instructions

### Medium Complexity Areas

**3. MCP Setup Command (`/2l-setup-mcps`) - 2-3 hours**
- **Why medium:**
  - OS detection for config file paths (macOS vs Linux)
  - MCP detection (parse existing `claude_desktop_config.json`)
  - Multi-step guidance (Playwright + Chrome DevTools)
  - JSON config snippet generation
- **Estimated builder splits:** COMPLETE (guidance-only, no automation)
- **Note:** Low risk - provides instructions only, doesn't modify system

### Low Complexity Areas

**4. Documentation Updates**
- Installation state YAML schema documentation
- Setup command usage examples
- Cross-platform installation notes
- **Estimated effort:** 1 hour (integrated into component development)

## Technology Recommendations

### Primary Stack

**Shell Scripting: Bash**
- **Rationale:**
  - Vision explicitly specifies `#!/bin/bash` in technical requirements
  - Zero external dependencies (bash available on all platforms)
  - Existing 2L commands use bash extensively
  - Cross-platform compatibility (Ubuntu, Debian, macOS)
  - Rich features: arrays, associative arrays, string manipulation
  - Mature ecosystem with extensive documentation
- **Alternative Considered:** Python (rejected - adds dependency, overkill for file operations)

**State Tracking: YAML**
- **Rationale:**
  - Vision specifies `~/.claude/.2l-install.yaml` in data model
  - Human-readable for debugging
  - Supports complex data structures (lists, nested objects)
  - Python/Ruby have built-in YAML parsing if needed for future automation
  - Consistent with 2L's existing use of YAML (master-plan.yaml, config.yaml)
- **Alternative Considered:** JSON (rejected - less readable for manual inspection)

**Database Client: PostgreSQL psql**
- **Rationale:**
  - Standard PostgreSQL client, widely available
  - Direct SQL execution (no abstraction layer)
  - Works with Supabase local (postgres://postgres:postgres@127.0.0.1:54322/postgres)
  - Already installed on developer machine
  - MCP integration provides alternative access method (redundancy)
- **Alternative Considered:** Supabase CLI only (rejected - psql more universal)

**Package Managers:**
- **Ubuntu/Debian:** apt-get (via sudo)
- **macOS:** Homebrew (brew)
- **Detection:** `uname -s` and `command -v` checks

### Supporting Libraries

**Event Logger (`~/.claude/lib/2l-event-logger.sh`)**
- **Purpose:** Event emission for dashboard observability
- **Already exists:** No new development needed
- **Usage:** Source at command start, call `log_2l_event` for agent_start/agent_complete

**Dashboard Template (`~/.claude/lib/2l-dashboard-template.html`)**
- **Purpose:** HTML template for dashboard generation
- **Already exists:** Will be used in Iteration 2 (dashboard fix)
- **Note:** Not modified in Iteration 1

## Integration Points

### External Dependencies

**1. PostgreSQL Client (psql)**
- **Integration:** Installed via `/2l-setup-db` command
- **Complexity:** MEDIUM (package manager detection, sudo access)
- **Considerations:**
  - Ubuntu/Debian: `sudo apt-get install -y postgresql-client`
  - macOS: `brew install postgresql@14` (or later version)
  - Test connection: `psql -h 127.0.0.1 -p 54322 -U postgres -c "SELECT version();"`
  - Error handling: Connection refused → Supabase local not running

**2. Supabase Local (Optional)**
- **Integration:** User must manually start: `supabase start --exclude studio,edge-runtime`
- **Complexity:** LOW (documentation only, no automation)
- **Considerations:**
  - Database runs on port 54322 (not default 5432)
  - Connection string: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
  - `/2l-setup-db` provides troubleshooting if connection fails

**3. MCPs (Playwright, Chrome DevTools) - Optional**
- **Integration:** User manually installs and configures via `/2l-setup-mcps` guidance
- **Complexity:** LOW (guidance only)
- **Considerations:**
  - Requires Node.js/npm for MCP server installation
  - Requires Claude Desktop restart after config changes
  - Graceful degradation if unavailable (agents detect and continue)

### Internal Integrations

**1. Installation Script → Setup Commands**
- **Flow:** User runs `2l.sh install` first, then `/2l-setup-db` and `/2l-setup-mcps`
- **Dependency:** Setup commands must exist in `~/.claude/commands/` before user can run them
- **Error handling:** If setup commands run before installation, show clear error with installation instructions

**2. Setup Commands → Project Configuration**
- **Flow:** User runs setup commands in project directory
- **State:** Creates `.sudo_access.txt`, modifies `.gitignore`
- **Isolation:** Each project has own `.sudo_access.txt` (no global state)

**3. Installation State → Future Updates**
- **Flow:** `~/.claude/.2l-install.yaml` enables smart updates
- **Use case:** User runs `2l.sh install --update` to overwrite with latest versions
- **Backup:** Previous installation backed up before overwrite

## Risks & Challenges

### Technical Risks

**Risk 1: Symlink Removal Breaks Developer Workflow**
- **Impact:** HIGH - Developer currently uses symlinks to `/home/ahiya/2l-claude-config/`
- **Mitigation:**
  - Installation script detects existing symlinks and warns user
  - Provide migration path: backup symlink targets, create copies, update workflow
  - Document transition process in installation output
  - Allow developer to maintain symlinks via `--skip-backup` flag (preserves dev setup)

**Risk 2: Sudo Password Storage Security**
- **Impact:** MEDIUM - Plain text password in `.sudo_access.txt` is security risk
- **Mitigation:**
  - Always chmod 600 (owner read/write only)
  - Always add to .gitignore (prevent accidental commits)
  - Provide revocation instructions in command output
  - Document alternative: passwordless sudo for psql only (`visudo` configuration)
  - Consider future enhancement: keyring integration (macOS Keychain, GNOME Keyring)

**Risk 3: Cross-Platform Package Manager Detection Failures**
- **Impact:** MEDIUM - Wrong package manager detected, installation fails
- **Mitigation:**
  - Robust OS detection: `uname -s` and fallback checks
  - Verify package manager availability: `command -v apt-get`, `command -v brew`
  - Provide manual installation instructions as fallback
  - Test on Ubuntu 24.04, Debian 12, macOS Sonoma/Ventura

**Risk 4: Idempotency Edge Cases**
- **Impact:** MEDIUM - Running installation 10 times could corrupt state
- **Mitigation:**
  - Atomic operations: write to temp files, then move
  - State file versioning: detect old YAML schema, migrate
  - Pre-flight checks: verify ~/.claude/ structure before modifications
  - Extensive testing: run installation script 10+ times in clean VM

### Complexity Risks

**Risk 5: Builder May Need to Split Database Setup**
- **Likelihood:** LOW-MEDIUM
- **Reasoning:** Database setup has multiple concerns (psql installation, password storage, connection testing, .gitignore management)
- **If SPLIT occurs:**
  - Sub-builder A: Core setup (password storage, .gitignore)
  - Sub-builder B: PostgreSQL client installation (cross-platform package management)
  - Sub-builder C: Connection testing and troubleshooting
- **Mitigation:** Provide clear task breakdown in planner report

**Risk 6: Installation Script Backup/Rollback Complexity**
- **Likelihood:** LOW
- **Reasoning:** Backup and rollback logic adds significant code complexity
- **If SPLIT occurs:**
  - Sub-builder A: Core installation (file copying, state tracking)
  - Sub-builder B: Backup/rollback mechanism
- **Mitigation:** Start with basic installation, add backup in refinement pass

## Recommendations for Planner

### 1. Build Components Sequentially in Dependency Order
**Rationale:** Installation script must exist before setup commands can be installed
**Order:**
1. Create `2l.sh install` script first (foundation)
2. Create `/2l-setup-db` and `/2l-setup-mcps` commands second
3. Test end-to-end: install → setup → verify

### 2. Assign Single Builder for All Three Components
**Rationale:** Strong interdependencies, shared patterns (bash scripting, OS detection)
**Alternative:** If builder SPLITs, keep installation script and setup commands together (don't split across builders)

### 3. Include Extensive Testing in Acceptance Criteria
**Rationale:** Idempotency and cross-platform support require thorough validation
**Testing Requirements:**
- Run `2l.sh install` 10 times without errors
- Test on Ubuntu 24.04 (primary platform)
- Test on macOS Sonoma (secondary platform)
- Verify `.sudo_access.txt` permissions (chmod 600)
- Verify `.gitignore` auto-append (no duplicates)
- Test database connection to localhost:54322

### 4. Provide Clear Error Messages with Actionable Guidance
**Rationale:** System-level operations will fail in unpredictable ways
**Examples:**
- "Error: Supabase local not running. Start with: supabase start"
- "Error: PostgreSQL client not found. Install with: sudo apt-get install postgresql-client"
- "Error: Claude config directory not found. Expected: ~/.claude/"

### 5. Make MCPs Fully Optional with Graceful Degradation
**Rationale:** Vision emphasizes "all MCPs are optional"
**Implementation:**
- `/2l-setup-mcps` provides guidance only (no forced installation)
- Clear messaging: "MCPs enhance agent capabilities but are not required"
- Builders detect MCP availability and continue without them
- Documentation shows examples with and without MCPs

### 6. Create Rollback Plan for Installation Failures
**Rationale:** Mid-installation failures could leave system in broken state
**Implementation:**
- Backup existing `~/.claude/` before any modifications
- If installation fails, restore from backup automatically
- Provide manual rollback instructions in error output
- State YAML tracks backup locations for manual recovery

## Resource Map

### Critical Files/Directories

**Installation Script:**
- `/home/ahiya/Ahiya/2L/2l.sh` - Main entry point (NEW)
- Estimated size: 400-500 lines
- Key functions: `backup_existing()`, `copy_files()`, `update_state_yaml()`, `check_dependencies()`

**Setup Commands:**
- `/home/ahiya/Ahiya/2L/commands/2l-setup-db.md` - Database setup (NEW)
- `/home/ahiya/Ahiya/2L/commands/2l-setup-mcps.md` - MCP setup (NEW)
- Estimated size: 200-250 lines each

**State Tracking:**
- `~/.claude/.2l-install.yaml` - Installation metadata (NEW)
- Schema: `{installed_at, version, components[], backups[], last_update, source_repo}`

**Project-Specific State:**
- `{project}/.sudo_access.txt` - Sudo password (NEW, chmod 600)
- `{project}/.gitignore` - Modified to include .sudo_access.txt

### Key Dependencies

**External Dependencies:**
- **Git:** Required for version detection, already installed
- **Bash:** POSIX-compliant shell, available on all platforms
- **Python 3:** Required for dashboard HTTP server (already required by 2L)
- **PostgreSQL Client (psql):** Installed by `/2l-setup-db` command
- **Package Managers:** apt-get (Ubuntu/Debian) or brew (macOS)

**Internal Dependencies:**
- **Event Logger:** `~/.claude/lib/2l-event-logger.sh` (already exists)
- **Agents:** 10 agent files in `/home/ahiya/2l-claude-config/agents/` (to be copied)
- **Commands:** 22 command files in `/home/ahiya/2l-claude-config/commands/` (to be copied)
- **Library Files:** 2 files in `/home/ahiya/2l-claude-config/lib/` (to be copied)

### Testing Infrastructure

**Manual Testing Approach:**
1. **Fresh VM Testing (Ubuntu 24.04)**
   - Clone 2L repository
   - Run `./2l.sh install`
   - Verify files copied to `~/.claude/`
   - Run `/2l-setup-db` with test sudo password
   - Verify `.sudo_access.txt` created with correct permissions
   - Test psql connection to localhost:54322

2. **Idempotency Testing**
   - Run `./2l.sh install` 10 times in a row
   - Verify no errors, no file corruption
   - Check state YAML updates correctly

3. **Cross-Platform Testing**
   - Test on Ubuntu 24.04 (primary)
   - Test on macOS Sonoma (secondary)
   - Verify OS-specific paths resolve correctly

4. **Security Testing**
   - Verify `.sudo_access.txt` has chmod 600
   - Verify `.sudo_access.txt` in `.gitignore`
   - Attempt to read `.sudo_access.txt` as different user (should fail)

**Automated Testing (Future Enhancement):**
- Bash unit tests using bats (Bash Automated Testing System)
- Docker-based CI/CD pipeline for cross-platform testing

## Questions for Planner

### 1. Should Installation Script Replace or Coexist with Existing Symlinks?

**Context:** Developer currently uses symlinks from `~/.claude/` to `/home/ahiya/2l-claude-config/`

**Options:**
- **A) Replace symlinks with copies** (vision suggests this approach)
- **B) Detect symlinks and preserve them** (maintain dev workflow)
- **C) Provide migration guide** (manual transition)

**Recommendation:** Option A (replace) for consistency, but provide migration notice

---

### 2. Should Database Setup Support Remote Supabase or Only Local?

**Context:** Vision mentions "localhost:54322" specifically, implying local-only

**Options:**
- **A) Local only (localhost:54322)** - Simpler, matches vision
- **B) Support both local and remote** - More flexible, but adds complexity

**Recommendation:** Option A (local only) for MVP, document remote setup as manual advanced use case

---

### 3. Should MCP Setup Attempt Automated Installation or Remain Guidance-Only?

**Context:** Current vision shows step-by-step instructions, not automation

**Options:**
- **A) Guidance only** (current approach) - Lower risk, respects user control
- **B) Automated installation via npx/git** - Better UX, higher risk of failures

**Recommendation:** Option A (guidance only) for Iteration 1, consider automation in future iteration

---

### 4. How to Handle Different Supabase Local Ports if Not Default 54322?

**Context:** Some users may have port conflicts, run Supabase on different port

**Options:**
- **A) Hardcode 54322, provide error if unreachable** - Simple, covers 95% of cases
- **B) Auto-detect port from `supabase status` output** - More robust, adds complexity

**Recommendation:** Option A (hardcode) for MVP, add port detection in future if needed

---

### 5. Should Installation State Support Rollbacks to Previous Versions?

**Context:** Vision mentions backups but doesn't specify rollback capability

**Options:**
- **A) Backup only (manual rollback)** - Simpler, user can manually restore
- **B) Automated rollback via `2l.sh rollback`** - Better UX, more code

**Recommendation:** Option A (backup only) for MVP, provide clear manual rollback instructions

---

## Final Notes

**Iteration 1 Scope is Well-Defined:**
- Three distinct components with clear boundaries
- Existing patterns to follow (bash commands in 2L)
- Moderate complexity, no complex dependencies
- Deliverable value: 5-minute setup on fresh machines

**Success Criteria:**
- Installation completes in <10 seconds on SSD
- Installation idempotent (run 10 times without errors)
- Database setup succeeds on fresh Ubuntu 24.04
- Database setup succeeds on macOS Sonoma
- MCP setup provides clear instructions for both servers
- All operations preserve user customizations
- Proper error messages for all failure modes

**Risk Mitigation Focus:**
- Extensive pre-flight checks before modifications
- Comprehensive error messages with actionable guidance
- Backup mechanism before overwriting files
- Cross-platform testing on Ubuntu and macOS
- Security: chmod 600 for .sudo_access.txt, always in .gitignore

**Builder Guidance:**
- Start with core installation script (highest complexity)
- Add setup commands after installation works
- Test idempotency early and often
- Provide verbose output by default (can silence with --quiet)
- Include manual fallback instructions for all automated steps
