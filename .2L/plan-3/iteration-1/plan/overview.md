# 2L Iteration Plan - Setup Automation Infrastructure

## Project Vision

**Transform 2L from a developer-only tool into a production-ready system with automated installation, zero-config setup, and 5-minute onboarding experience.**

This iteration builds the foundation for effortless 2L adoption by creating:
- One-command installation script that sets up all 2L components
- Interactive database setup that configures PostgreSQL access securely
- Guided MCP setup that walks users through optional testing enhancements

**The goal:** A developer can clone 2L, run `./2l.sh install`, complete setup commands, and execute their first `/2l-mvp` orchestration in under 5 minutes.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] **Installation Speed**: `./2l.sh install` completes in <10 seconds on SSD
- [ ] **Idempotency**: Installation runs 10 times consecutively without errors or side effects
- [ ] **Cross-Platform**: Works on fresh Ubuntu 24.04 and macOS Sonoma
- [ ] **Database Setup Success**: 95%+ success rate on fresh installations without manual intervention
- [ ] **Security**: `.sudo_access.txt` has chmod 600 permissions, always in `.gitignore`
- [ ] **Backup Safety**: Existing installations backed up before overwriting
- [ ] **Clear Errors**: Every failure mode provides actionable troubleshooting guidance
- [ ] **End-to-End Test**: Complete setup (git clone → install → db setup → first /2l-mvp) in <5 minutes

## MVP Scope

### In Scope

**Feature 1: Automated Installation Script (`2l.sh install`)**
- Copy agents, commands, lib directories from repo to `~/.claude/`
- Handle existing installations with backup mechanism
- Support `--update` flag to overwrite existing files
- Support `--quiet` flag for silent operation
- Track installation state in `~/.claude/.2l-install.yaml`
- Idempotent operation (safe to run multiple times)
- Cross-platform compatibility (Ubuntu/Debian + macOS)
- Exit codes: 0=success, 1=error, 2=partial success

**Feature 2: Database Setup Command (`/2l-setup-db`)**
- Interactive sudo password prompt with secure storage
- Automatic PostgreSQL client (psql) installation
- Create `.sudo_access.txt` with chmod 600 permissions
- Auto-append to `.gitignore` (no duplicates)
- Test connection to Supabase local (localhost:54322)
- Report success/failure with detailed troubleshooting
- Idempotent (safe to re-run, allows password updates)
- Provide instructions for revoking access later

**Feature 3: MCP Setup Command (`/2l-setup-mcps`)**
- OS detection (macOS vs Linux) for config file paths
- Detect existing `claude_desktop_config.json` configuration
- Step-by-step installation instructions for Playwright MCP
- Step-by-step installation instructions for Chrome DevTools MCP
- Generate correct JSON config snippets
- Guide user to OS-specific config file location
- Include validation steps to test MCP connections
- Make MCPs explicitly optional (skippable with graceful degradation)

### Out of Scope (Post-MVP)

**Not included in Iteration 1:**
- Automated update command (`2l.sh update`)
- Health check command (`/2l-doctor`)
- Uninstall script (`2l.sh uninstall`)
- Configuration wizard (interactive setup)
- Automated MCP installation (provide guidance only)
- Remote Supabase support (localhost only)
- Windows native support (WSL only)
- Rollback command (backup-only, manual restore)

**Why:** These features add complexity without delivering the core value of "5-minute setup." They can be added in future iterations once the foundation is solid.

## Development Phases

1. **Exploration** ✅ Complete (Explorer-1 analyzed architecture, patterns, risks)
2. **Planning** 🔄 Current (Creating comprehensive development plan)
3. **Building** ⏳ 8-10 hours (Single builder, may split if complexity warrants)
4. **Integration** ⏳ 15 minutes (No integration needed - single builder)
5. **Validation** ⏳ 30 minutes (Test idempotency, cross-platform, security)
6. **Deployment** ⏳ Complete (Files already in target directories)

## Timeline Estimate

- **Exploration**: Complete (1 explorer report)
- **Planning**: Complete (this document)
- **Building**: 8-10 hours
  - Installation script: 4-5 hours (highest complexity)
  - Database setup command: 3-4 hours (security-sensitive)
  - MCP setup command: 2-3 hours (guidance-only, lower risk)
- **Integration**: 15 minutes (single builder, no merge conflicts)
- **Validation**: 30 minutes (idempotency tests, cross-platform validation)
- **Total**: ~10 hours end-to-end

**Note:** If builder splits due to HIGH complexity:
- Primary builder: Installation script (foundation)
- Sub-builder 1A: Database setup command
- Sub-builder 1B: MCP setup command
- Integration: 30 minutes (merge command files)
- Total time remains ~10 hours (parallel work)

## Risk Assessment

### High Risks

**Risk: Symlink Removal Breaks Developer Workflow**
- **Impact**: Current developer setup uses symlinks from `~/.claude/` to `/home/ahiya/2l-claude-config/`
- **Mitigation**:
  - Installation script detects symlinks and warns user
  - Provide migration notice in output
  - Backup symlink targets before replacement
  - Document transition process clearly
  - Allow developer to skip backup with `--skip-backup` flag if needed

**Risk: Sudo Password Storage Security Vulnerability**
- **Impact**: Plain text password in `.sudo_access.txt` is a security risk if exposed
- **Mitigation**:
  - Always set chmod 600 (owner read/write only)
  - Always auto-append to `.gitignore`
  - Verify `.gitignore` entry before writing password
  - Provide revocation instructions in command output
  - Document alternative: passwordless sudo via `visudo`
  - Consider future enhancement: keyring integration (macOS Keychain, GNOME Keyring)

**Risk: Cross-Platform Package Manager Detection Failures**
- **Impact**: Wrong package manager detected, PostgreSQL client installation fails
- **Mitigation**:
  - Robust OS detection: `uname -s` with fallback checks
  - Verify package manager availability: `command -v apt-get`, `command -v brew`
  - Provide manual installation instructions as fallback
  - Test on both Ubuntu 24.04 and macOS Sonoma
  - Include troubleshooting steps for common failures

### Medium Risks

**Risk: Installation Idempotency Edge Cases**
- **Impact**: Running installation 10+ times could corrupt state or duplicate files
- **Mitigation**:
  - Atomic operations: write to temp files, then move
  - State file versioning in YAML
  - Pre-flight checks before modifications
  - Extensive testing: run 10+ times in clean VM
  - Clear error messages if pre-flight checks fail

**Risk: Builder May Need to Split Due to Complexity**
- **Impact**: All three features in one builder may be too much (VERY HIGH complexity)
- **Mitigation**:
  - Provide clear split strategy in builder-tasks.md
  - Foundation: Installation script (must complete first)
  - Sub-builders: Database and MCP commands (can be parallel)
  - Integration plan: merge command files into `/2l-setup-db.md` and `/2l-setup-mcps.md`

**Risk: Supabase Local Not Running on Port 54322**
- **Impact**: Database setup fails connection test even with correct psql installation
- **Mitigation**:
  - Clear error message: "Supabase local not detected on port 54322"
  - Provide troubleshooting: "Start with: supabase start --exclude studio,edge-runtime"
  - Verify Supabase status with: `supabase status`
  - Document alternative ports (future enhancement)

## Integration Strategy

**Single Builder Scenario (No Split):**
- Builder creates all three components
- Files go directly to target locations:
  - `/home/ahiya/Ahiya/2L/2l.sh` (installation script)
  - `/home/ahiya/2l-claude-config/commands/2l-setup-db.md` (database command)
  - `/home/ahiya/2l-claude-config/commands/2l-setup-mcps.md` (MCP command)
- No integration phase needed
- Validator tests end-to-end flow

**Split Builder Scenario (If Complexity Warrants):**
- Primary builder: Creates `2l.sh` installation script (foundation)
- Sub-builder 1A: Creates `/2l-setup-db` command
- Sub-builder 1B: Creates `/2l-setup-mcps` command
- Integration: Verify all files in correct locations, no conflicts expected
- Shared state: `~/.claude/.2l-install.yaml` schema defined in patterns.md (no conflicts)

**Integration Validation:**
1. Run `./2l.sh install` from 2L repository directory
2. Verify all files copied to `~/.claude/`
3. Run `/2l-setup-db` in test project
4. Verify `.sudo_access.txt` created with correct permissions
5. Run `/2l-setup-mcps` in test project
6. Verify guidance displayed correctly
7. End-to-end test: Complete setup on fresh VM in <5 minutes

## Deployment Plan

**Deployment is automatic** - files are created in their target locations:

### Phase 1: Installation Script Deployment
- **Target**: `/home/ahiya/Ahiya/2L/2l.sh`
- **Permissions**: chmod +x (executable)
- **Testing**: Run `./2l.sh install` 10 times consecutively
- **Validation**: Verify idempotency, check `~/.claude/.2l-install.yaml` correctness

### Phase 2: Command Deployment
- **Targets**:
  - `/home/ahiya/2l-claude-config/commands/2l-setup-db.md`
  - `/home/ahiya/2l-claude-config/commands/2l-setup-mcps.md`
- **Testing**: Run each command in fresh test project
- **Validation**:
  - Database setup creates `.sudo_access.txt` with chmod 600
  - MCP setup displays OS-specific instructions

### Phase 3: State File Template
- **Target**: `~/.claude/.2l-install.yaml` (created by installation script)
- **Schema**: Defined in tech-stack.md and patterns.md
- **Validation**: YAML parser can read without errors

### Phase 4: End-to-End Validation
1. **Fresh Ubuntu 24.04 VM:**
   - Clone 2L repository
   - Run `./2l.sh install`
   - Start Supabase local: `supabase start`
   - Run `/2l-setup-db` (provide test sudo password)
   - Verify connection to localhost:54322
   - Run `/2l-setup-mcps` (read instructions, skip actual MCP install)
   - Time total: Should be <5 minutes

2. **Fresh macOS Sonoma:**
   - Same steps as Ubuntu
   - Verify brew package manager detected correctly
   - Verify config paths: `~/Library/Application Support/Claude/`

3. **Developer Migration Test:**
   - Run `./2l.sh install` on developer machine (with existing symlinks)
   - Verify warning displayed
   - Verify backup created
   - Verify symlinks replaced with copies

### Rollback Plan

**If deployment fails:**
1. Installation script creates backups in `~/.claude/.2l-backups/YYYYMMDD-HHMMSS/`
2. Manual rollback: `cp -r ~/.claude/.2l-backups/LATEST/* ~/.claude/`
3. State file tracks backup locations for easy recovery
4. Developer can revert to symlinks manually if needed

**Success Criteria:**
- All 5 success metrics met (see Success Criteria section)
- No data loss during installation
- User can complete setup following README only (post-Iteration 2)
