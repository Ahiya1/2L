# Builder Task Breakdown

## Overview

**1 primary builder** will implement all three features for Iteration 1.

**Estimated complexity:** MEDIUM-HIGH
- All features are bash scripting (consistent technology)
- Strong interdependencies (installation script must exist before commands work)
- Security-sensitive operations (sudo password storage)
- Cross-platform support (Ubuntu + macOS)

**Split recommendation:** If builder encounters VERY HIGH complexity, split into:
- Primary builder: Installation script (foundation, highest complexity)
- Sub-builder 1A: Database setup command
- Sub-builder 1B: MCP setup command

**Total estimated time:** 8-10 hours (single builder) or 9-11 hours (split scenario with integration)

---

## Builder-1: Setup Automation Infrastructure

### Scope

Implement complete setup automation infrastructure for 2L:

1. **Installation Script (`2l.sh install`)**: One-command installation of all 2L components to `~/.claude/`
2. **Database Setup Command (`/2l-setup-db`)**: Interactive PostgreSQL client installation and configuration
3. **MCP Setup Command (`/2l-setup-mcps`)**: Guided setup for optional testing enhancements

This builder is responsible for the entire "5-minute onboarding" experience from git clone to first /2l-mvp execution.

### Complexity Estimate

**MEDIUM-HIGH**

**Breakdown:**
- Installation script: HIGH (4-5 hours)
  - Idempotency logic (run 10+ times without errors)
  - Backup/rollback mechanism
  - Cross-platform compatibility
  - State tracking with YAML
  - Symlink detection and migration

- Database setup: MEDIUM-HIGH (3-4 hours)
  - Interactive sudo password prompt
  - Secure password storage (chmod 600)
  - Cross-platform package manager detection
  - PostgreSQL client installation
  - Connection testing and troubleshooting

- MCP setup: MEDIUM (2-3 hours)
  - OS detection for config paths
  - Multi-step guidance formatting
  - JSON snippet generation
  - Validation instructions

**Split threshold:** If total implementation time exceeds 12 hours or any single component becomes overwhelming, consider splitting (see "Potential Split Strategy" below).

### Success Criteria

**Installation Script:**
- [ ] Copies all files from `/home/ahiya/2l-claude-config/` to `~/.claude/`
- [ ] Creates timestamped backup before overwriting existing files
- [ ] Supports `--update` flag to force overwrite
- [ ] Supports `--quiet` flag for silent operation
- [ ] Supports `--skip-backup` flag to skip backup creation
- [ ] Writes installation state to `~/.claude/.2l-install.yaml`
- [ ] Runs successfully 10 times in a row without errors (idempotency)
- [ ] Completes in <10 seconds on SSD
- [ ] Works on Ubuntu 24.04
- [ ] Works on macOS Sonoma
- [ ] Detects and warns about existing symlinks
- [ ] Exit code 0 on success, 1 on error, 2 on partial success
- [ ] Clear error messages for all failure modes

**Database Setup Command:**
- [ ] Prompts for sudo password with hidden input (`read -s`)
- [ ] Stores password in `.sudo_access.txt` with chmod 600
- [ ] Auto-appends `.sudo_access.txt` to `.gitignore` (no duplicates)
- [ ] Detects OS (Ubuntu/macOS) and selects correct package manager
- [ ] Installs PostgreSQL client via apt-get (Ubuntu) or brew (macOS)
- [ ] Tests connection to localhost:54322 (Supabase local)
- [ ] Reports success with PostgreSQL version display
- [ ] Reports failure with comprehensive troubleshooting steps
- [ ] Idempotent (safe to run multiple times, allows password updates)
- [ ] Works without existing .sudo_access.txt (first-time setup)
- [ ] Works with existing .sudo_access.txt (password update)
- [ ] Provides revocation instructions

**MCP Setup Command:**
- [ ] Detects OS and shows correct config file path
- [ ] Checks if `claude_desktop_config.json` exists
- [ ] Displays step-by-step Playwright MCP installation instructions
- [ ] Displays step-by-step Chrome DevTools MCP installation instructions
- [ ] Generates correct JSON config snippet
- [ ] Shows validation steps (restart Claude Desktop, test access)
- [ ] Makes MCPs explicitly optional (clear "skippable" messaging)
- [ ] Provides troubleshooting for common MCP issues

### Files to Create

**Primary files:**
1. `/home/ahiya/Ahiya/2L/2l.sh` (400-500 lines)
   - Installation orchestrator script
   - Executable (chmod +x)
   - Full bash implementation with all error handling

2. `/home/ahiya/2l-claude-config/commands/2l-setup-db.md` (200-250 lines)
   - Database setup command (Claude Code format)
   - Markdown with embedded bash implementation
   - Follows existing command structure (see `/2l-dashboard.md`)

3. `/home/ahiya/2l-claude-config/commands/2l-setup-mcps.md` (250-300 lines)
   - MCP setup command (Claude Code format)
   - Markdown with embedded bash implementation
   - Includes guidance for both Playwright and Chrome DevTools

**State file (created by installation script):**
4. `~/.claude/.2l-install.yaml` (auto-generated)
   - Installation state tracking
   - YAML format with schema defined in patterns.md
   - Created/updated by `2l.sh install`

**Per-project files (created by database setup):**
5. `{project}/.sudo_access.txt` (auto-generated per project)
   - Sudo password storage (chmod 600)
   - Created by `/2l-setup-db` command
   - Never committed to git (auto-added to .gitignore)

### Dependencies

**Depends on:**
- Existing 2L repository structure at `/home/ahiya/Ahiya/2L/`
- Existing agent/command/lib files at `/home/ahiya/2l-claude-config/`
- User has `~/.claude/` directory (standard Claude Code setup)
- User has Git installed (already required by 2L)
- User has Python 3 installed (already required by 2L dashboard)

**Blocks:**
- Iteration 2 (Dashboard UX & Documentation)
  - Simplified README references installation commands created here
  - Dashboard fix uses template from `~/.claude/lib/` created here
- Future iterations (all depend on installation infrastructure)

**No cross-builder dependencies** (single builder for entire iteration)

### Implementation Notes

**Critical considerations:**

1. **Symlink Migration Path**
   - Current developer setup uses symlinks: `~/.claude/agents -> /home/ahiya/2l-claude-config/agents`
   - Installation script must detect symlinks and warn user
   - Provide clear migration notice: "Symlinks will be replaced with file copies"
   - Create backup of symlink targets before replacement
   - Consider `--preserve-symlinks` flag for developer workflow (future enhancement)

2. **Sudo Password Security**
   - Always set chmod 600 immediately after creating `.sudo_access.txt`
   - Always verify `.gitignore` entry before writing password
   - Test sudo access before storing password (fail fast)
   - Provide clear revocation instructions in command output
   - Document alternative: passwordless sudo via `visudo`

3. **Idempotency Testing**
   - Test installation script by running 10+ times consecutively
   - Verify state file updates correctly each time
   - Verify backups accumulate properly (limit to 5 most recent)
   - Verify no file corruption or permission issues

4. **Cross-Platform Testing**
   - Test on Ubuntu 24.04 (primary platform)
   - Test on macOS Sonoma (secondary platform)
   - Verify package manager detection logic
   - Verify config file path detection (OS-specific)

5. **Error Message Quality**
   - Every error must include actionable next steps
   - Platform-specific guidance when relevant
   - Links to documentation for complex issues
   - Troubleshooting sections for common failures

6. **MCP Optional Messaging**
   - Vision emphasizes "MCPs are fully optional"
   - Make this clear in command output
   - Provide graceful degradation message if skipped
   - Example: "MCPs enhance agent capabilities but are not required for core 2L functionality"

### Patterns to Follow

Reference all patterns from `patterns.md`:

**Must use:**
- **Bash Script Header Pattern**: For `2l.sh` with `set -euo pipefail`
- **Argument Parsing Pattern**: For `--update`, `--quiet`, `--skip-backup` flags
- **Pre-Flight Checks Pattern**: Before any system modifications
- **Backup Creation Pattern**: Timestamped backups before overwriting
- **File Copying with Error Handling**: For installing components
- **YAML State File Writing**: For `~/.claude/.2l-install.yaml`
- **OS Detection Pattern**: For cross-platform support
- **PostgreSQL Installation Pattern**: For `/2l-setup-db`
- **Interactive Password Prompt Pattern**: For sudo password collection
- **`.gitignore` Auto-Append Pattern**: For `.sudo_access.txt`
- **Database Connection Test Pattern**: For Supabase local validation
- **MCP Configuration Guidance Pattern**: For `/2l-setup-mcps`
- **Logging Pattern**: For quiet mode support
- **Exit Code Convention**: 0=success, 1=error, 2=partial
- **Command Implementation Template**: For Claude Code commands

**Key principle:** Copy and adapt code examples from patterns.md rather than rewriting from scratch. This ensures consistency and reduces bugs.

### Testing Requirements

**Unit-level testing (per component):**

1. **Installation Script (`2l.sh install`)**
   - Run 10 times consecutively without errors
   - Test `--update` flag (overwrites existing)
   - Test `--quiet` flag (minimal output)
   - Test `--skip-backup` flag (no backup created)
   - Test with existing symlinks (migration path)
   - Test with missing source directories (error handling)
   - Test with missing `~/.claude/` directory (error handling)
   - Verify state file correctness after each run
   - Verify backups accumulate correctly (max 5 shown in state)

2. **Database Setup (`/2l-setup-db`)**
   - Test with correct sudo password (success path)
   - Test with incorrect sudo password (error handling)
   - Test on Ubuntu 24.04 (apt-get package manager)
   - Test on macOS Sonoma (brew package manager)
   - Test with existing `.sudo_access.txt` (password update)
   - Test without `.sudo_access.txt` (first-time setup)
   - Test with Supabase local running (connection success)
   - Test with Supabase local not running (connection failure)
   - Verify `.sudo_access.txt` has chmod 600
   - Verify `.sudo_access.txt` in `.gitignore`
   - Verify `.gitignore` has no duplicates after multiple runs

3. **MCP Setup (`/2l-setup-mcps`)**
   - Test on macOS (verify config path: `~/Library/Application Support/Claude/`)
   - Test on Linux (verify config path: `~/.config/Claude/`)
   - Test with existing `claude_desktop_config.json`
   - Test without existing config file
   - Verify all instructions displayed correctly
   - Verify JSON snippet is valid (jsonlint.com)
   - Manual validation: user can follow instructions successfully

**Integration testing (end-to-end):**

1. **Fresh Ubuntu 24.04 VM**
   - Clone 2L repository: `git clone <repo> && cd 2L`
   - Run installation: `./2l.sh install`
   - Verify files in `~/.claude/agents/`, `~/.claude/commands/`, `~/.claude/lib/`
   - Start Supabase: `supabase start`
   - Run database setup: `/2l-setup-db` (provide test password)
   - Verify psql installed: `psql --version`
   - Verify connection works: connection test should succeed
   - Run MCP setup: `/2l-setup-mcps`
   - Read instructions, verify paths correct
   - **Total time:** <5 minutes (target: 5-minute setup)

2. **Fresh macOS Sonoma**
   - Same steps as Ubuntu
   - Verify Homebrew package manager detected
   - Verify config paths: `~/Library/Application Support/Claude/`
   - **Total time:** <5 minutes

3. **Developer Migration (Existing Symlinks)**
   - Run installation on developer machine
   - Verify symlink detection warning displayed
   - Verify backup created before replacement
   - Verify files copied correctly (no longer symlinks)
   - Verify no data loss

**Coverage target:** 100% of success criteria met

### Potential Split Strategy

**If complexity proves too high** (implementation exceeds 12 hours or builder requests split):

#### Foundation (Primary Builder Creates Before Splitting)

**Files to complete first:**
- `/home/ahiya/Ahiya/2L/2l.sh` (installation script)
- `~/.claude/.2l-install.yaml` (state file schema and writing logic)

**Rationale:** Database and MCP setup commands depend on installation script existing, so this must be completed first.

**Time estimate:** 5-6 hours

---

#### Sub-builder 1A: Database Setup Command

**Scope:**
- Create `/home/ahiya/2l-claude-config/commands/2l-setup-db.md`
- Implement interactive sudo password prompt
- Implement PostgreSQL client installation (apt-get/brew)
- Implement connection testing to localhost:54322
- Implement `.sudo_access.txt` creation and `.gitignore` management

**Files to create:**
- `/home/ahiya/2l-claude-config/commands/2l-setup-db.md` (200-250 lines)

**Dependencies:**
- Installation script must exist (created by primary builder)
- Follows patterns from `patterns.md` (PostgreSQL Installation, Password Prompt, DB Connection Test)

**Success criteria:** All database setup success criteria from main task

**Time estimate:** 3-4 hours

**Complexity:** MEDIUM-HIGH
- Security-sensitive (sudo password storage)
- Cross-platform (apt-get vs brew)
- Error handling (connection failures, wrong password)

---

#### Sub-builder 1B: MCP Setup Command

**Scope:**
- Create `/home/ahiya/2l-claude-config/commands/2l-setup-mcps.md`
- Implement OS detection for config file paths
- Implement Playwright MCP guidance
- Implement Chrome DevTools MCP guidance
- Implement JSON config snippet generation
- Implement validation instructions

**Files to create:**
- `/home/ahiya/2l-claude-config/commands/2l-setup-mcps.md` (250-300 lines)

**Dependencies:**
- Installation script must exist (created by primary builder)
- Follows patterns from `patterns.md` (OS Detection, MCP Configuration Guidance)

**Success criteria:** All MCP setup success criteria from main task

**Time estimate:** 2-3 hours

**Complexity:** MEDIUM
- Guidance-only (no system modifications)
- Clear requirements (step-by-step instructions)
- Lower risk (no sudo access required)

---

### Integration Plan (If Split Occurs)

**Integration steps:**

1. **Verify file locations:**
   - `/home/ahiya/Ahiya/2L/2l.sh` exists (executable)
   - `/home/ahiya/2l-claude-config/commands/2l-setup-db.md` exists
   - `/home/ahiya/2l-claude-config/commands/2l-setup-mcps.md` exists

2. **Test installation flow:**
   - Run `./2l.sh install` from 2L repository
   - Verify commands copied to `~/.claude/commands/`
   - Run `/2l-setup-db` in test project
   - Run `/2l-setup-mcps` in test project

3. **End-to-end validation:**
   - Complete fresh Ubuntu 24.04 VM test
   - Complete fresh macOS Sonoma test
   - Verify 5-minute setup target met

**No merge conflicts expected:**
- All files are independent (different file paths)
- No shared code between components
- State file schema defined in patterns.md (no ambiguity)

**Integration time estimate:** 30 minutes (if split), 15 minutes (if no split)

---

## Builder Execution Order

**Single Builder Scenario (Recommended):**
1. Builder-1 creates all three components sequentially
2. Validator tests end-to-end flow
3. Deploy (files already in target locations)

**Split Builder Scenario (If Needed):**

### Parallel Group 1 (No dependencies within group)
- **Primary Builder**: Installation script (`2l.sh`) - Must complete first

### Parallel Group 2 (Depends on Group 1)
- **Sub-builder 1A**: Database setup command - Can run in parallel with 1B
- **Sub-builder 1B**: MCP setup command - Can run in parallel with 1A

### Integration
- Integrator verifies all files in place, runs end-to-end tests

---

## Integration Notes

**File conflict potential:** NONE
- All components create different files
- No shared files between components
- No overlapping code

**Shared resources:**
- `~/.claude/.2l-install.yaml` schema defined in patterns.md
- Event logging library sourced optionally (backward compatible)
- All use same bash patterns (consistent style)

**Coordination points:**
- Installation script must be tested before commands (dependency)
- Database setup and MCP setup can be developed in parallel (no dependencies)
- All components must follow patterns.md exactly (consistency)

**Testing coordination:**
- End-to-end test requires all three components complete
- Each component has independent unit tests
- Integration test verifies complete flow

---

## Validation Checklist

**Before marking iteration complete:**

- [ ] All success criteria met (installation, database, MCP)
- [ ] Idempotency verified (10+ runs without errors)
- [ ] Cross-platform tested (Ubuntu 24.04 + macOS Sonoma)
- [ ] Security validated (chmod 600, .gitignore entries)
- [ ] 5-minute setup achieved on fresh VM
- [ ] All error messages actionable
- [ ] All patterns followed from patterns.md
- [ ] Code reviewed for consistency
- [ ] Documentation complete (comments, usage instructions)
- [ ] No data loss during migration (symlinks → copies)

---

## Post-Implementation Notes

**Document in iteration report:**
- Actual time taken (compare to estimate)
- Whether split occurred (if yes, why and how)
- Challenges encountered (symlink migration, sudo security, etc.)
- Platform-specific issues (Ubuntu vs macOS differences)
- Recommendations for future iterations

**Lessons learned:**
- Which patterns worked well
- Which patterns need improvement
- Testing strategy effectiveness
- Cross-platform development tips

---

## Quick Reference for Builder

**Order of implementation (recommended):**
1. Create `2l.sh install` script (foundation)
2. Test idempotency (run 10 times)
3. Create `/2l-setup-db` command
4. Test database setup on Ubuntu and macOS
5. Create `/2l-setup-mcps` command
6. Test MCP setup on Ubuntu and macOS
7. End-to-end validation on fresh VMs
8. Deploy and document

**Key files to reference:**
- `patterns.md`: All code patterns with examples
- `tech-stack.md`: Technology decisions and rationale
- `overview.md`: Success criteria and timeline
- `/home/ahiya/2l-claude-config/commands/2l-dashboard.md`: Example command structure
- `/home/ahiya/2l-claude-config/lib/2l-event-logger.sh`: Event logging reference

**When in doubt:**
- Follow patterns.md exactly (copy and adapt, don't rewrite)
- Test idempotency early and often
- Provide comprehensive error messages
- Ask for split if complexity exceeds 12 hours
