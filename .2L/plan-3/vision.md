# Project Vision: 2L Production Readiness

**Created:** 2025-10-10
**Plan:** plan-3

---

## Problem Statement

2L is a powerful AI agent orchestration system, but it's difficult to set up on new machines. The current setup process requires manual configuration of multiple components (Supabase database access, MCP servers, dashboard), leading to a fragmented onboarding experience that prevents broader adoption.

**Current pain points:**
- Supabase local database access works on developer's machine but isn't portable
- MCP setup (Playwright, Chrome DevTools) requires manual configuration with no guided setup
- Dashboard spawns unnecessary agent just to generate HTML (performance overhead)
- Active agents tracking in dashboard not functioning correctly
- README is comprehensive but overwhelming for new users
- No automated installation script to set up 2L commands and agents
- New machine setup requires significant manual work and troubleshooting

---

## Target Users

**Primary user:** Developers who want to use 2L for AI-driven development
- Need quick, hassle-free setup on new machines
- Want automated configuration of dependencies
- Expect clear documentation with step-by-step instructions
- Value reliability over feature complexity

**Secondary users:** Contributors and maintainers
- Need consistent setup across development environments
- Want to test 2L on clean machines
- Require idempotent installation scripts

---

## Core Value Proposition

**"Download, run one script, start building with AI agents - zero manual configuration required."**

**Key benefits:**
1. **5-minute setup** - From git clone to first /2l-mvp execution
2. **Zero manual config** - Automated setup of all dependencies
3. **Works everywhere** - Idempotent scripts that run on any fresh machine
4. **Production-ready** - Reliable, tested setup process

---

## Feature Breakdown

### Must-Have (MVP)

#### 1. **Automated Installation Script (`2l.sh install`)**
   - Description: One-command installation of all 2L components
   - User story: As a new user, I want to install 2L with a single command so that I can start using it immediately
   - Acceptance criteria:
     - [ ] Copies all agents from repo to `~/.claude/agents/`
     - [ ] Copies all commands from repo to `~/.claude/commands/`
     - [ ] Creates `~/.claude/lib/` directory with templates (dashboard, event logger)
     - [ ] Backs up existing configuration before overwriting
     - [ ] Reports installation success with summary of installed components
     - [ ] Idempotent (can run multiple times without breaking)
     - [ ] Supports `--update` flag to override existing files
     - [ ] Preserves user customizations in separate config files

#### 2. **Database Setup Command (`/2l-setup-db`)**
   - Description: Automated Supabase local database access configuration
   - User story: As a developer, I want Claude to have database access so that it can validate schemas and run queries during orchestration
   - Acceptance criteria:
     - [ ] Installs PostgreSQL client tools (psql) with sudo if not present
     - [ ] Creates `.sudo_access.txt` file with user-provided password
     - [ ] Adds `.sudo_access.txt` to `.gitignore` automatically
     - [ ] Tests connection to Supabase local (localhost:54322)
     - [ ] Verifies Claude can execute SQL queries via psql
     - [ ] Reports connection status (success/failure with troubleshooting steps)
     - [ ] Works idempotently (safe to run multiple times)
     - [ ] Provides clear instructions for revoking access later

#### 3. **MCP Setup Command (`/2l-setup-mcps`)**
   - Description: Guided setup for Playwright and Chrome DevTools MCP servers
   - User story: As a user, I want to configure MCPs easily so that agents have enhanced testing capabilities
   - Acceptance criteria:
     - [ ] Detects if MCPs are already configured
     - [ ] Provides step-by-step installation instructions for Playwright MCP
     - [ ] Provides step-by-step installation instructions for Chrome DevTools MCP
     - [ ] Generates correct `claude_desktop_config.json` configuration snippet
     - [ ] Guides user to the correct config file location (OS-specific)
     - [ ] Includes validation steps to test MCP connections
     - [ ] Offers troubleshooting tips for common MCP issues
     - [ ] Makes MCPs optional (skippable) with graceful degradation message

#### 4. **Direct Dashboard Start (Fix `/2l-dashboard`)**
   - Description: Dashboard command directly generates HTML without spawning agent
   - User story: As a user, I want /2l-dashboard to start instantly so that I don't waste time spawning unnecessary agents
   - Acceptance criteria:
     - [ ] Removes agent spawning logic from `/2l-dashboard` command
     - [ ] Reads template directly from `~/.claude/lib/2l-dashboard-template.html`
     - [ ] Replaces placeholders inline (project name, timestamp, events path)
     - [ ] Writes HTML to `.2L/dashboard/index.html` directly
     - [ ] Starts HTTP server immediately after HTML generation
     - [ ] Reduces dashboard startup time from ~30s to <2s
     - [ ] Maintains all existing dashboard functionality
     - [ ] Preserves multi-project port allocation (8080-8099)

#### 5. **Active Agents Dashboard Fix**
   - Description: Fix active agents session tracking in dashboard
   - User story: As a user, I want to see which agents are currently working so that I can monitor orchestration progress
   - Acceptance criteria:
     - [ ] Dashboard correctly parses `agent_start` events from events.jsonl
     - [ ] Dashboard correctly parses `agent_complete` events from events.jsonl
     - [ ] Active agents section shows agents between start and complete events
     - [ ] Duration calculation updates in real-time for active agents
     - [ ] Completed agents are removed from active list
     - [ ] Edge cases handled (orphaned starts, duplicate events)
     - [ ] Works with concurrent agents (multiple builders)
     - [ ] Tested with real orchestration event streams

#### 6. **Simplified README**
   - Description: Restructure README with beginner-friendly quick start
   - User story: As a new user, I want to understand how to get started in under 2 minutes so that I can begin using 2L immediately
   - Acceptance criteria:
     - [ ] Quick Start section appears at the top (5 steps or less)
     - [ ] Installation instructions use `./2l.sh install` command
     - [ ] Setup instructions use `/2l-setup-db` and `/2l-setup-mcps`
     - [ ] First example shows simplest possible usage (`/2l-mvp "build X"`)
     - [ ] Advanced topics moved to later sections
     - [ ] Table of contents provides clear navigation
     - [ ] Includes "5-minute setup test" section for validation
     - [ ] Links to detailed docs for advanced users

### Should-Have (Post-MVP)

1. **Automatic Updates** - `2l.sh update` command that pulls latest agents/commands from repo
2. **Health Check Command** - `/2l-doctor` that validates all dependencies and configuration
3. **Uninstall Script** - `2l.sh uninstall` to cleanly remove all 2L components
4. **Configuration Wizard** - Interactive setup that asks questions and configures everything
5. **Docker-based Setup** - Containerized 2L environment for ultimate portability

### Could-Have (Future)

1. **GUI Installer** - Visual installer for non-technical users
2. **Cloud Dashboard** - Web-based dashboard accessible from any device
3. **Marketplace** - Community-contributed agents and templates
4. **IDE Plugins** - VS Code, JetBrains integration for in-editor orchestration

---

## User Flows

### Flow 1: First-Time Setup (Primary Flow)

**Steps:**
1. User clones 2L repository: `git clone https://github.com/username/2L.git && cd 2L`
2. User runs installation script: `./2l.sh install`
3. System installs all agents and commands to `~/.claude/`
4. System reports success with next steps
5. User opens Claude Code in their project directory
6. User runs database setup: `/2l-setup-db`
7. System prompts for sudo password, installs psql, tests connection
8. User optionally runs MCP setup: `/2l-setup-mcps`
9. System guides through Playwright and Chrome DevTools configuration
10. User starts first orchestration: `/2l-mvp "build a todo app"`
11. User opens dashboard in another terminal: `/2l-dashboard`
12. Dashboard starts instantly (<2s) and shows real-time progress

**Edge cases:**
- Existing 2L installation: Script offers to backup and update
- Missing sudo access: Database setup provides fallback instructions
- MCPs unavailable: System continues with graceful degradation
- Port conflicts: Dashboard allocates next available port (8080-8099)

**Error handling:**
- Permission errors: Clear message with `sudo` or `chmod` instructions
- Network failures: MCP setup shows offline installation option
- Missing Python 3: Dashboard provides installation link

### Flow 2: Setting Up on New Machine

**Steps:**
1. Developer has 2L repo locally or downloads it
2. Runs `./2l.sh install` in 2L directory
3. Opens Claude Code in their project
4. Runs `/2l-setup-db` to configure database access
5. Optionally runs `/2l-setup-mcps` for testing capabilities
6. Starts building: `/2l-mvp "implement feature X"`

**Success metric:** Complete setup in under 5 minutes

### Flow 3: Updating Existing Installation

**Steps:**
1. User pulls latest 2L changes: `git pull`
2. User runs update: `./2l.sh install --update`
3. System backs up current agents/commands
4. System overwrites with new versions
5. System reports what changed

**Success metric:** Update completes without breaking existing projects

---

## Data Model Overview

**Key files:**

1. **Installation State**
   - Location: `~/.claude/.2l-install.yaml` (new file)
   - Fields: `installed_at`, `version`, `components` (list), `backups` (list)
   - Purpose: Track installation state for updates and uninstalls

2. **Database Access**
   - Location: `.sudo_access.txt` (in user's project root)
   - Contents: Plain text sudo password
   - Security: Always in `.gitignore`, chmod 600

3. **MCP Configuration**
   - Location: OS-specific `claude_desktop_config.json`
   - Schema: JSON with `mcpServers` object containing Playwright and Chrome DevTools configs

4. **Dashboard State** (existing)
   - Location: `.2L/dashboard/index.html`, `.server-port`, `.server-pid`
   - No changes to existing structure

---

## Technical Requirements

**Must support:**
- Ubuntu/Debian Linux (primary platform)
- macOS (secondary platform)
- Claude Code CLI environment
- Python 3 (for dashboard HTTP server)
- Git (for repository operations)

**Constraints:**
- No external dependencies beyond Python 3 and Git
- Scripts must be POSIX-compliant shell (sh/bash)
- All operations must be idempotent
- Must preserve user data and customizations

**Preferences:**
- Use `#!/bin/bash` for installation scripts
- Use clear, descriptive variable names
- Include comments for complex logic
- Provide verbose output by default (can be silenced with `-q` flag)
- Exit codes: 0 = success, 1 = error, 2 = partial success

---

## Success Criteria

**The MVP is successful when:**

1. **5-Minute Setup Metric**
   - Metric: Time from `git clone` to first successful `/2l-mvp` execution
   - Target: Under 5 minutes on fresh Ubuntu 24.04 VM

2. **Zero-Config Dashboard**
   - Metric: Dashboard startup time
   - Target: Under 2 seconds (vs. current ~30 seconds)

3. **Database Access Reliability**
   - Metric: Success rate of `/2l-setup-db` on fresh installs
   - Target: 95% success rate without manual intervention

4. **README Comprehension**
   - Metric: New user can complete setup following README only
   - Target: 90% success rate in user testing (5/5 test users successful)

5. **Installation Idempotency**
   - Metric: `./2l.sh install` can run 10 times without errors
   - Target: 100% success rate with no side effects

---

## Out of Scope

**Explicitly not included in MVP:**
- Windows native support (WSL only)
- GUI installer or configuration wizard
- Cloud-hosted dashboard
- Automatic dependency installation (Docker, Node.js, etc.)
- Configuration migration from other AI orchestration tools
- Multi-user or team collaboration features
- Telemetry or usage analytics

**Why:** Focus on core setup reliability and documentation quality before expanding to additional platforms or features.

---

## Assumptions

1. User has Claude Code installed and working
2. User has sudo access on their machine (for database setup)
3. User's Claude Code can execute bash commands
4. Internet connection available for MCP setup instructions
5. User has basic command-line familiarity
6. Python 3 already installed (or user can install it)

---

## Open Questions

1. Should `2l.sh install` require confirmation before overwriting existing files?
2. Should database setup support remote Supabase (not just local)?
3. Should MCP setup attempt automatic installation or just provide instructions?
4. How to handle different Supabase local ports (if not default 54322)?
5. Should we version the installation state to enable rollbacks?

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Create implementation plan with task breakdown
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** READY FOR PLANNING
**Complexity:** Medium (6 distinct features, some interdependent)
**Estimated Effort:** 2-3 iterations
