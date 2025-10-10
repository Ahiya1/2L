# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Transform 2L from a developer-only tool into a production-ready system with automated installation, zero-config setup, and 5-minute onboarding experience. Eliminate manual configuration pain points across database access, MCP setup, and dashboard initialization.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 6 must-have features
  1. Automated Installation Script (`2l.sh install`)
  2. Database Setup Command (`/2l-setup-db`)
  3. MCP Setup Command (`/2l-setup-mcps`)
  4. Direct Dashboard Start (Fix `/2l-dashboard`)
  5. Active Agents Dashboard Fix
  6. Simplified README
- **User stories/acceptance criteria:** 42 acceptance criteria across 6 features
- **Files to create:** 4 new files (2l.sh, /2l-setup-db, /2l-setup-mcps, .2l-install.yaml)
- **Files to modify:** 3 existing files (/2l-dashboard, dashboard template, README.md)
- **Estimated total work:** 12-16 hours

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **6 distinct features with clear boundaries** - Each feature is well-scoped and independent
- **Bash scripting focus** - Primary language is bash/shell, reducing complexity (no build systems, frameworks, or complex dependencies)
- **Idempotency requirement** - Scripts must handle re-runs gracefully, adding state management complexity
- **Cross-platform concerns** - Must support Ubuntu/Debian (primary) and macOS (secondary), requiring OS detection and conditional logic
- **Existing codebase enhancement** - Extending existing 2L system (not greenfield), must understand current structure and maintain compatibility
- **Security considerations** - Handling sudo passwords (.sudo_access.txt) with proper chmod and .gitignore management
- **Multiple installation paths** - First-time install, update, and backup/restore scenarios

**Complexity is MEDIUM (not HIGH) because:**
- No external APIs or third-party integrations
- No database migrations or schema changes
- No frontend frameworks or complex UI components
- Dashboard fix is HTML template manipulation, not JavaScript engineering
- MCP setup is documentation/guidance, not automated installation
- Clear separation of concerns between features

---

## Architectural Analysis

### Major Components Identified

1. **Installation Orchestrator (`2l.sh install`)**
   - **Purpose:** Central installation script that copies agents, commands, and libraries to ~/.claude/ directory structure
   - **Complexity:** MEDIUM
   - **Why critical:** Foundation for entire 2L setup experience. Handles first-time install, updates, backups, and conflict resolution. Must be idempotent and preserve user customizations.
   - **Technical details:**
     - Bash script with CLI argument parsing (--update, --quiet flags)
     - File system operations (cp, mkdir, chmod, backup creation)
     - State tracking via ~/.claude/.2l-install.yaml
     - Pre-flight checks (existing files, permissions, directory structure)
     - Rollback capability if installation fails mid-process
     - Exit codes: 0=success, 1=error, 2=partial success

2. **Database Access Configuration (`/2l-setup-db` command)**
   - **Purpose:** Automated Supabase local database access setup with sudo password storage
   - **Complexity:** MEDIUM
   - **Why critical:** Enables Claude to execute SQL queries during orchestration for schema validation and data operations. Currently broken/manual, causing significant onboarding friction.
   - **Technical details:**
     - Claude Code command (markdown format with bash tools)
     - Interactive password prompt with secure input
     - PostgreSQL client installation (apt-get/brew with sudo)
     - Connection testing (psql to localhost:54322)
     - Security: .sudo_access.txt with chmod 600, auto-add to .gitignore
     - Troubleshooting guidance for connection failures
     - Idempotent (detects existing setup, allows re-configuration)

3. **MCP Configuration Guide (`/2l-setup-mcps` command)**
   - **Purpose:** Guided setup for Playwright and Chrome DevTools MCP servers with OS-specific instructions
   - **Complexity:** LOW
   - **Why critical:** Unlocks advanced testing capabilities (browser automation, DevTools protocol) for agent builders. Currently requires manual JSON editing, which is error-prone.
   - **Technical details:**
     - Claude Code command with guided workflow
     - OS detection (macOS vs Linux for config file paths)
     - MCP detection (check existing claude_desktop_config.json)
     - Step-by-step instructions (not automated installation)
     - JSON config snippet generation
     - Validation steps to test MCP connections
     - Optional/skippable with graceful degradation messaging
   - **Note:** This is guidance, not automation - user still manually edits config file

4. **Dashboard Direct Generation (Fix `/2l-dashboard`)**
   - **Purpose:** Remove unnecessary agent spawning from dashboard command, generate HTML directly inline
   - **Complexity:** LOW
   - **Why critical:** Current implementation wastes 30 seconds spawning an agent just to do template substitution. Direct generation achieves <2 second startup.
   - **Technical details:**
     - Modify existing /2l-dashboard command
     - Read template from ~/.claude/lib/2l-dashboard-template.html
     - Inline template substitution (project name, timestamp, events path)
     - Write to .2L/dashboard/index.html
     - Start Python HTTP server immediately
     - Preserve existing functionality (port allocation 8080-8099, PID tracking)
   - **Architectural impact:** Minimal - removes agent spawn logic, adds inline bash string manipulation

5. **Active Agents Tracking (Dashboard Fix)**
   - **Purpose:** Fix JavaScript parsing of agent_start/agent_complete events to correctly show active agents
   - **Complexity:** LOW
   - **Why critical:** Dashboard feature is currently broken - active agents never display correctly. Required for observability of concurrent agent execution.
   - **Technical details:**
     - JavaScript fix in dashboard template HTML
     - Parse events.jsonl for agent_start/agent_complete events
     - Match agent IDs between start and complete events
     - Track duration for in-progress agents
     - Handle edge cases (orphaned starts, duplicate events, out-of-order events)
     - Real-time updates via 2-second polling interval
   - **Architectural impact:** Frontend-only fix, no backend changes

6. **Documentation Restructuring (README Simplification)**
   - **Purpose:** Beginner-friendly README with quick start at top, advanced topics moved down
   - **Complexity:** LOW
   - **Why critical:** Current README is comprehensive but overwhelming (33KB). New users need "5-minute setup" path visible immediately.
   - **Technical details:**
     - Restructure existing README.md
     - New sections: Quick Start (top), Installation (./2l.sh install), Setup (/2l-setup-db, /2l-setup-mcps), First Example (/2l-mvp)
     - Move advanced topics (event system, architecture, agent details) to later sections
     - Add table of contents with clear navigation
     - Include "5-minute setup test" validation section
   - **Architectural impact:** None - documentation only

---

### Technology Stack Implications

**Scripting Language (Bash)**
- **Options:** Bash, Python, Node.js installer scripts
- **Recommendation:** Bash (POSIX-compliant sh/bash)
- **Rationale:**
  - Zero external dependencies (bash available on all target platforms)
  - Existing 2L system uses bash commands extensively
  - Simple file operations don't require Python/Node.js overhead
  - Cross-platform compatible (Ubuntu, Debian, macOS)
  - Follows 2L conventions (commands are markdown with bash tools)

**Installation State Tracking**
- **Options:** YAML, JSON, plain text
- **Recommendation:** YAML (~/.claude/.2l-install.yaml)
- **Rationale:**
  - Human-readable for debugging
  - Standard format for 2L config (vision.md uses YAML frontmatter)
  - Easy to parse in bash (no external dependencies needed for simple key-value reads)
  - Fields: installed_at, version, components[], backups[]

**Dashboard HTTP Server**
- **Options:** Python SimpleHTTPServer, Node.js, custom server
- **Recommendation:** Keep existing Python 3 SimpleHTTPServer
- **Rationale:**
  - Already implemented and working
  - Python 3 is assumed available (stated in Technical Requirements)
  - No reason to change working solution

**MCP Configuration Approach**
- **Options:** Automated JSON editing, manual guided setup, interactive CLI wizard
- **Recommendation:** Manual guided setup (provide instructions + config snippets)
- **Rationale:**
  - MCP servers require user to install npm packages (outside 2L control)
  - claude_desktop_config.json location varies by OS and installation
  - Safer to provide instructions than automate (avoid corrupting existing MCP configs)
  - Users may have custom MCP setups we shouldn't overwrite
  - Marked as optional/skippable feature

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (2 phases)

**Rationale:**
- 6 distinct features with clear natural grouping
- Foundation features (installation, setup commands) must be stable before documentation
- Dashboard fixes are independent and can be parallelized
- Two clear phases: (1) Core Setup Infrastructure, (2) User Experience Polish

---

### Suggested Iteration Phases

**Iteration 1: Setup Infrastructure**
- **Vision:** Build the core installation and configuration system that enables 5-minute setup
- **Scope:** Installation script + setup commands (3 features)
  1. **Automated Installation Script (`2l.sh install`)**
     - Copy agents, commands, lib to ~/.claude/
     - State tracking with .2l-install.yaml
     - Backup/restore logic
     - Idempotent with --update flag
  2. **Database Setup Command (`/2l-setup-db`)**
     - PostgreSQL client installation
     - .sudo_access.txt creation with chmod 600
     - Connection testing to Supabase local
     - .gitignore auto-update
  3. **MCP Setup Command (`/2l-setup-mcps`)**
     - OS detection and config path guidance
     - Playwright + Chrome DevTools instructions
     - JSON config snippet generation
     - Validation steps
- **Why first:** These are the foundation. Without working installation + setup, everything else is irrelevant. Must be rock-solid before polishing user experience.
- **Estimated duration:** 7-9 hours
- **Risk level:** MEDIUM
  - Cross-platform compatibility (Ubuntu vs macOS)
  - Sudo password handling security
  - Idempotency edge cases (partial installs, corrupted state)
- **Success criteria:**
  - User can run `./2l.sh install` and have all agents/commands installed
  - User can run `/2l-setup-db` and successfully query Supabase local
  - User can run `/2l-setup-mcps` and get clear setup instructions
  - All operations work correctly on Ubuntu 24.04 and macOS Sonoma

**Iteration 2: User Experience & Dashboard**
- **Vision:** Polish the onboarding experience and fix observability tools
- **Scope:** Dashboard improvements + documentation (3 features)
  1. **Direct Dashboard Start (Fix `/2l-dashboard`)**
     - Remove agent spawning logic
     - Inline template substitution
     - Direct HTML generation
     - Startup time <2 seconds
  2. **Active Agents Dashboard Fix**
     - JavaScript event parsing fix
     - agent_start/agent_complete matching
     - Duration tracking for active agents
     - Edge case handling
  3. **Simplified README**
     - Quick Start section at top
     - Installation flow with new commands
     - Table of contents
     - 5-minute setup test section
     - Advanced topics moved down
- **Dependencies:** Requires iteration 1 complete
  - README references `./2l.sh install` and setup commands
  - Dashboard fix can be tested with events from iteration 1 work
- **Estimated duration:** 5-7 hours
- **Risk level:** LOW
  - Dashboard fix is isolated JavaScript change
  - README is documentation (no code risk)
  - No cross-platform concerns (HTML/JS/markdown)
- **Success criteria:**
  - Dashboard starts in <2 seconds
  - Active agents section shows correct real-time data
  - New user can follow README Quick Start and complete setup in <5 minutes
  - All 42 acceptance criteria passing

---

## Dependency Graph

```
Iteration 1: Setup Infrastructure (Foundation)
├── 2l.sh install script
│   ├── File operations (copy agents, commands, lib)
│   ├── State tracking (.2l-install.yaml)
│   └── Backup/restore logic
├── /2l-setup-db command
│   ├── PostgreSQL client installation (requires sudo)
│   ├── .sudo_access.txt creation
│   └── Connection testing
└── /2l-setup-mcps command
    ├── OS detection
    ├── Config path guidance
    └── JSON snippet generation

    ↓ (All setup tools must exist and work before...)

Iteration 2: User Experience & Dashboard (Polish)
├── /2l-dashboard command fix
│   ├── Remove agent spawning
│   ├── Direct template substitution
│   └── (Uses existing dashboard template from iteration 1 install)
├── Dashboard JavaScript fix
│   ├── Event parsing logic
│   ├── Agent tracking
│   └── (Tested with events from iteration 1 testing)
└── README simplification
    ├── Quick Start section
    ├── Installation flow (uses 2l.sh install from iteration 1)
    ├── Setup flow (uses /2l-setup-db and /2l-setup-mcps from iteration 1)
    └── First example (/2l-mvp already exists)
```

**Critical Path:**
1. 2l.sh install → enables copying all components
2. /2l-setup-db → enables database access for agents
3. /2l-setup-mcps → enables testing capabilities
4. Then: Dashboard fixes and README can reference complete setup flow

**No parallel work between iterations** - Iteration 2 fully depends on iteration 1 completion.

---

## Risk Assessment

### Medium Risks

- **Cross-Platform Compatibility (Installation Script)**
  - **Impact:** Script may work on Ubuntu but fail on macOS due to different bash versions, command flags (cp, mkdir), or directory structures
  - **Mitigation:**
    - Use POSIX-compliant commands (avoid GNU-specific flags like cp --parents)
    - Test on both Ubuntu 24.04 and macOS Sonoma
    - OS detection with conditional logic for platform-specific commands
    - Fallback to manual instructions if automated setup fails
  - **Recommendation:** Handle in iteration 1 with explicit testing on both platforms

- **Sudo Password Security (Database Setup)**
  - **Impact:** .sudo_access.txt file contains plaintext password, could be exposed if .gitignore fails or user commits anyway
  - **Mitigation:**
    - Always chmod 600 (read/write for owner only)
    - Check for existing .gitignore and append if needed
    - Create .gitignore if doesn't exist
    - Clear warning message about security implications
    - Provide instructions for revoking access (remove file, change password)
  - **Recommendation:** Include prominent security warnings in command output and README

- **Idempotency Edge Cases (Installation)**
  - **Impact:** Running ./2l.sh install multiple times could corrupt state, lose user customizations, or create duplicate backups filling disk space
  - **Mitigation:**
    - State tracking in .2l-install.yaml to detect previous installs
    - Backup existing files before overwriting (timestamped backup directories)
    - --update flag to explicitly confirm overwriting
    - Preserve user customizations in separate config files (not overwritten)
    - Cleanup old backups (keep only last 5)
  - **Recommendation:** Extensive testing of re-run scenarios in iteration 1

### Low Risks

- **Python 3 Availability (Dashboard)**
  - **Impact:** Dashboard HTTP server requires Python 3, may not be installed on fresh systems
  - **Mitigation:**
    - Assumption document states "Python 3 already installed (or user can install it)"
    - Dashboard provides clear error message if Python 3 missing
    - Link to Python installation instructions
  - **Recommendation:** Accept this risk - out of scope to automate Python installation

- **MCP Configuration Errors (Setup Command)**
  - **Impact:** User may incorrectly edit claude_desktop_config.json, breaking existing MCP setup or Claude Code configuration
  - **Mitigation:**
    - Provide exact JSON snippet to copy/paste
    - Include validation steps to test MCP connections
    - Mark as optional feature (can skip)
    - Troubleshooting section in command output
  - **Recommendation:** Emphasize "backup your config first" in instructions

- **Port Conflicts (Dashboard)**
  - **Impact:** Ports 8080-8099 may be occupied by other services
  - **Mitigation:** Already handled by existing dashboard code (tries next port in range)
  - **Recommendation:** No changes needed, existing logic is sufficient

- **Git Not Available (Installation State)**
  - **Impact:** Installation state tracking uses git for versioning, may fail if git not installed
  - **Mitigation:**
    - Git is listed as required dependency in Technical Requirements
    - Installation script can detect git availability and warn user
    - Fallback to manual version tracking if git unavailable
  - **Recommendation:** Validate git is installed during pre-flight checks

---

## Integration Considerations

### Cross-Phase Integration Points

**Installation State File (~/.claude/.2l-install.yaml)**
- **Spans both iterations:** Created in iteration 1, referenced in README in iteration 2
- **Format:** YAML with fields: installed_at, version, components, backups
- **Why it matters:** Future update commands will read this file to determine what's already installed
- **Consistency needed:** Must be created with same structure every time (idempotent writes)

**Dashboard Template (~/.claude/lib/2l-dashboard-template.html)**
- **Spans both iterations:** Installed in iteration 1, modified in iteration 2 for active agents fix
- **Why it matters:** JavaScript changes in iteration 2 must work with template structure from iteration 1
- **Consistency needed:** Keep template placeholder format consistent ({{PROJECT_NAME}}, {{TIMESTAMP}}, etc.)

**README.md References**
- **Spans both iterations:** Installation commands created in iteration 1, documented in iteration 2
- **Why it matters:** README examples must exactly match command behavior (flags, output format)
- **Consistency needed:** Command interface (flags, output messages) must be finalized in iteration 1

### Potential Integration Challenges

**Installation Script vs Manual Setup**
- **Challenge:** Existing 2L users may have manually configured ~/.claude/ directory. Installation script must detect and preserve custom configurations.
- **Resolution:**
  - Pre-flight check for existing files
  - Interactive prompt "Backup and overwrite? [y/N]"
  - Never overwrite user's custom agent definitions
  - Use separate config files for user customizations

**Dashboard Template Updates**
- **Challenge:** Iteration 2 modifies dashboard template installed in iteration 1. If user updates 2L between iterations, template may become inconsistent.
- **Resolution:**
  - Version tracking in .2l-install.yaml
  - Dashboard template includes version comment
  - Update command checks template version and warns if mismatch

**Cross-Platform Path Differences**
- **Challenge:** Ubuntu uses ~/.claude/, macOS uses ~/Library/Application Support/Claude/ for some configs (particularly MCP config)
- **Resolution:**
  - OS detection helper function used consistently across all scripts
  - MCP setup command provides platform-specific paths
  - Test on both platforms before completion

---

## Recommendations for Master Plan

1. **Start with Iteration 1 as Foundation**
   - Installation and setup infrastructure must be rock-solid before polishing UX
   - These scripts will be run by every 2L user on fresh machines - reliability is critical
   - Budget extra time for cross-platform testing and edge case handling

2. **Keep Iterations Short and Focused**
   - Iteration 1: 7-9 hours (core infrastructure)
   - Iteration 2: 5-7 hours (UX polish)
   - Total: 12-16 hours (matches scope assessment)
   - This allows for validation checkpoints between phases

3. **Prioritize Testing on Fresh Machines**
   - The entire vision is about "works on new machines"
   - Test iteration 1 completion on fresh Ubuntu 24.04 VM before starting iteration 2
   - Test complete system on fresh macOS Sonoma before marking done
   - Success metric: 5-minute setup on fresh VM with zero manual intervention

4. **Consider Iteration 2 Optional for Core MVP**
   - If timeline is tight, iteration 1 alone delivers core value (installation + setup)
   - Dashboard fix and README simplification are quality-of-life improvements
   - Could defer iteration 2 to post-MVP if needed
   - However, README is important for adoption - recommend including it

5. **Handle Security with Care**
   - .sudo_access.txt plaintext password storage is inherently risky
   - Provide very clear warnings in command output and README
   - Consider alternative approaches (e.g., SSH key-based auth, environment variables)
   - Document security model clearly for users

6. **Plan for Future Extensibility**
   - Installation state tracking enables future update/uninstall commands
   - Design .2l-install.yaml schema to support versioning and migrations
   - Keep installation script modular to allow per-component updates
   - This enables "should-have" features (2l.sh update, 2l.sh uninstall)

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- Bash scripts for Claude Code commands (markdown files with bash code blocks)
- Python 3 for dashboard HTTP server (SimpleHTTPServer)
- HTML/CSS/JavaScript for dashboard frontend (single-file, no frameworks)
- YAML for configuration (vision documents, master plans)
- Markdown for documentation and agent prompts

**Patterns observed:**
- Commands are markdown files in ~/.claude/commands/
- Agents are markdown files in ~/.claude/agents/
- Library helpers in ~/.claude/lib/ (currently: dashboard template, event logger)
- Project state in .2L/ directory (events.jsonl, dashboard/, plans/)
- Symlink pattern in ~/.claude/ (agents, commands, lib symlinked to external repo)

**Opportunities:**
- Installation script can follow existing directory structure
- Event logger library pattern is good (source via `. $HOME/.claude/lib/2l-event-logger.sh`)
- Dashboard template substitution is simple (bash string replacement)
- YAML state tracking fits existing configuration style

**Constraints:**
- Must not break existing symlink pattern (some users may have agents/commands symlinked)
- Installation script must detect symlinks and warn user (can't overwrite symlinked directories)
- Must preserve existing .2L/ project directories (don't delete events.jsonl or plans)
- Bash version compatibility (macOS uses older bash 3.2, Ubuntu has bash 5.x)

---

## Notes & Observations

**Brownfield vs Greenfield:**
- This is brownfield work - extending existing 2L system
- Must maintain backward compatibility with existing plans (can resume plan-1, plan-2, etc.)
- Cannot change existing agent interfaces or command behaviors
- Installation script must work alongside current manual setup

**User Persona Insights:**
- Primary users are developers (comfortable with terminal, git, sudo)
- Expect zero config but understand command-line workflows
- Value reliability over feature richness (production-ready focus)
- Want observability into what AI agents are doing (dashboard critical)

**Success Metric Focus:**
- "5-minute setup" is the north star metric
- Dashboard startup "<2 seconds" is secondary but important for UX
- "95% success rate on fresh installs" means robust error handling and clear error messages
- "90% README comprehension" means documentation quality is equal priority to code quality

**Out of Scope Reminders:**
- Windows native support (WSL only)
- GUI installer
- Automatic dependency installation (Docker, Node.js - user must install)
- Cloud-hosted dashboard
- Multi-user/team features

**Open Questions from Vision:**
1. Should `2l.sh install` require confirmation before overwriting?
   - **Recommendation:** Yes for safety. Add --force flag to skip confirmation.
2. Should database setup support remote Supabase?
   - **Recommendation:** No for MVP. Focus on local development workflow. Can add in post-MVP.
3. Should MCP setup attempt automatic installation?
   - **Recommendation:** No. Too risky to automate npm global installs. Provide clear instructions instead.
4. How to handle different Supabase local ports?
   - **Recommendation:** Add --port flag to /2l-setup-db command with default 54322.
5. Should we version the installation state for rollbacks?
   - **Recommendation:** Yes. Include version field in .2l-install.yaml. Enables future update/rollback features.

---

*Exploration completed: 2025-10-10*
*This report informs master planning decisions*
