# Technology Stack

## Core Framework

**Decision:** Bash 4.x+ (POSIX-compliant shell scripting)

**Rationale:**
- Vision explicitly specifies `#!/bin/bash` in technical requirements
- Zero external dependencies - bash is available on all target platforms (Ubuntu, Debian, macOS)
- Existing 2L commands extensively use bash, maintaining consistency
- Rich feature set: arrays, associative arrays, string manipulation, process management
- Mature ecosystem with extensive Stack Overflow documentation
- Native file operations ideal for installation/setup tasks
- Strong platform compatibility with minimal abstraction needed

**Alternatives Considered:**
- **Python**: Rejected - adds runtime dependency, overkill for file operations, less portable
- **Shell (sh)**: Rejected - too limited, lacks arrays and modern features needed for complex logic
- **Node.js**: Rejected - adds npm dependency, not suitable for system-level operations

**Version Requirements:**
- Ubuntu/Debian: Bash 4.4+ (default on Ubuntu 20.04+)
- macOS: Bash 3.2+ (default), recommend upgrading to 5.x via Homebrew for full compatibility
- No bashisms that break POSIX compatibility where avoidable

---

## Database

**Decision:** PostgreSQL 14+ via psql client

**Rationale:**
- Supabase local runs PostgreSQL under the hood (localhost:54322)
- psql is the standard PostgreSQL command-line client
- Direct SQL execution without abstraction layer overhead
- Available in all major package managers (apt, brew, yum)
- Already installed on developer machine, validated working
- MCP integration provides alternative access method (redundancy)
- Simple connection string: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**Installation Strategy:**
- Ubuntu/Debian: `sudo apt-get install -y postgresql-client`
- macOS: `brew install postgresql@14` (or latest stable)
- Package manager detection: `uname -s` and `command -v` checks
- Fallback: Provide manual installation instructions if auto-install fails

**Schema Strategy:**
- No schema changes in Iteration 1 (database access only)
- Future iterations: Schema migrations via Supabase CLI or Prisma
- Read-only access for agents during orchestration (validation queries)

---

## State Tracking

**Decision:** YAML 1.2 for installation state tracking

**Rationale:**
- Vision explicitly specifies `~/.claude/.2l-install.yaml` in data model
- Human-readable for debugging and manual inspection
- Supports complex data structures (lists, nested objects, timestamps)
- Consistent with 2L's existing use of YAML (master-plan.yaml, config.yaml)
- Python/Ruby have built-in YAML parsing if needed for future automation
- Easy to version and migrate (simple text-based format)

**Schema:** (stored in `~/.claude/.2l-install.yaml`)
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

**Alternatives Considered:**
- **JSON**: Rejected - less readable for manual inspection, no comments support
- **TOML**: Rejected - less common, smaller ecosystem, no significant advantages
- **Plain text**: Rejected - no structure, hard to parse reliably

---

## Security

**Decision:** File permissions + .gitignore for sudo password storage

**Rationale:**
- Simple, portable solution that works on all Unix-like systems
- chmod 600 restricts access to file owner only (industry standard for credentials)
- .gitignore prevents accidental commits to version control
- No external dependencies (keyring libraries, encryption tools)
- Matches patterns used in SSH key storage (~/.ssh/id_rsa)
- Easy to revoke: delete `.sudo_access.txt` or change sudo password

**Implementation:**
```bash
# Create .sudo_access.txt with strict permissions
echo "$SUDO_PASSWORD" > .sudo_access.txt
chmod 600 .sudo_access.txt

# Auto-append to .gitignore (no duplicates)
if ! grep -q "^\.sudo_access\.txt$" .gitignore 2>/dev/null; then
  echo ".sudo_access.txt" >> .gitignore
fi
```

**Future Enhancements:**
- macOS Keychain integration (`security add-generic-password`)
- GNOME Keyring integration (Linux)
- Passwordless sudo for psql only (via `visudo` configuration)

**Alternatives Considered:**
- **Keyring Integration**: Rejected for MVP - adds complexity, platform-specific, not all users have keyring
- **Encrypted Storage**: Rejected - requires encryption key management, overkill for local development
- **Prompt Every Time**: Rejected - poor UX, defeats purpose of automation

---

## Package Management

**Decision:** Native package managers with automatic detection

**Platform-Specific Choices:**

### Ubuntu/Debian
- **Package Manager**: apt-get (via sudo)
- **Detection**: `uname -s` returns "Linux" + `command -v apt-get` exists
- **Installation Command**: `sudo apt-get install -y postgresql-client`
- **Update Before Install**: `sudo apt-get update` to refresh package lists

### macOS
- **Package Manager**: Homebrew (brew)
- **Detection**: `uname -s` returns "Darwin" + `command -v brew` exists
- **Installation Command**: `brew install postgresql@14`
- **No sudo required**: Homebrew installs to user-writable directory

### Detection Logic
```bash
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt"
  elif command -v yum >/dev/null 2>&1; then
    PKG_MANAGER="yum"
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
  if command -v brew >/dev/null 2>&1; then
    PKG_MANAGER="brew"
  fi
fi
```

**Fallback Strategy:**
- If no package manager detected, provide manual installation instructions
- Link to official PostgreSQL downloads: https://www.postgresql.org/download/
- Document installation verification: `psql --version`

---

## MCP Integration

**Decision:** Guidance-only setup (no automated installation)

**Rationale:**
- Vision emphasizes "MCPs are fully optional with graceful degradation"
- MCP installation requires Node.js/npm (not assumed as dependency)
- Manual config file editing safer than automated JSON manipulation
- Respects user control over Claude Desktop configuration
- Lower risk of breaking existing MCP setups
- Easy to enhance with automation in future iteration if needed

**MCP Servers Supported:**

### 1. Playwright MCP Server
- **Purpose**: Browser automation and testing capabilities for agents
- **Repository**: https://github.com/executeautomation/playwright-mcp-server
- **Installation**: User manually clones repo, runs `npm install`
- **Configuration**: User manually adds to `claude_desktop_config.json`
- **Validation**: User tests with Claude Desktop restart

### 2. Chrome DevTools MCP Server
- **Purpose**: Enhanced browser debugging and inspection
- **Repository**: https://github.com/voxel51/chrome-devtools-mcp
- **Installation**: User manually installs via npm
- **Configuration**: User manually adds to `claude_desktop_config.json`
- **Validation**: User tests with Claude Desktop restart

**Config File Locations (OS-Specific):**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Detection Logic:**
```bash
if [[ "$OSTYPE" == "darwin"* ]]; then
  CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
fi
```

**Future Enhancement:**
- Automated installation via npx
- Automated config file editing with JSON merge
- MCP health check command (`/2l-check-mcps` already exists)

---

## File System Operations

**Decision:** Bash built-in file operations with atomic writes

**Rationale:**
- No external dependencies (cp, mv, mkdir are POSIX standard)
- Atomic operations prevent corruption during failures
- Backup mechanism simple to implement
- rsync not needed (small file sizes, no incremental updates)

**Key Patterns:**

### Atomic File Writing
```bash
# Write to temp file, then move (atomic operation)
echo "$CONTENT" > /tmp/.2l-install.tmp
mv /tmp/.2l-install.tmp ~/.claude/.2l-install.yaml
```

### Backup Creation
```bash
# Timestamped backup directory
BACKUP_DIR="$HOME/.claude/.2l-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r ~/.claude/agents "$BACKUP_DIR/" 2>/dev/null || true
cp -r ~/.claude/commands "$BACKUP_DIR/" 2>/dev/null || true
cp -r ~/.claude/lib "$BACKUP_DIR/" 2>/dev/null || true
```

### Directory Copying
```bash
# Copy with error handling
if [ -d "/home/ahiya/2l-claude-config/agents" ]; then
  cp -r /home/ahiya/2l-claude-config/agents/* ~/.claude/agents/ 2>/dev/null || {
    echo "Error: Failed to copy agents"
    exit 1
  }
fi
```

---

## Error Handling

**Decision:** Exit codes + detailed error messages

**Exit Code Standards:**
- **0**: Success (all operations completed)
- **1**: Error (critical failure, user intervention required)
- **2**: Partial success (some operations failed, system partially functional)

**Error Message Format:**
```bash
echo "Error: PostgreSQL client not found"
echo ""
echo "Install PostgreSQL client:"
echo "  - Ubuntu/Debian: sudo apt-get install postgresql-client"
echo "  - macOS: brew install postgresql"
echo "  - Or download from: https://www.postgresql.org/download/"
echo ""
echo "After installation, run /2l-setup-db again."
exit 1
```

**Key Principles:**
- Every error includes actionable next steps
- Platform-specific instructions when relevant
- Links to documentation for complex issues
- Exit immediately on critical errors (don't continue with broken state)

---

## Testing Infrastructure

**Decision:** Manual testing on target platforms (no automated testing in MVP)

**Rationale:**
- Bash testing frameworks (bats, shunit2) add complexity for MVP
- Manual testing sufficient for 3 scripts with clear acceptance criteria
- Focus effort on robust error handling and idempotency
- Automated testing can be added in future iteration

**Manual Testing Approach:**

### Test Environment 1: Ubuntu 24.04 Fresh VM
- Cloud VM or local VirtualBox
- No 2L installation
- No PostgreSQL client installed
- Test full setup flow

### Test Environment 2: macOS Sonoma
- Developer machine or clean user account
- No 2L installation
- Homebrew installed (standard for macOS developers)
- Test full setup flow

### Test Environment 3: Existing Installation
- Developer machine with current symlink setup
- Test migration and backup mechanism
- Verify no data loss

**Test Cases:**
1. Fresh installation (10 iterations in a row)
2. Update installation (--update flag)
3. Database setup (correct password)
4. Database setup (incorrect password)
5. MCP setup (macOS paths)
6. MCP setup (Linux paths)
7. Permission verification (chmod 600 on .sudo_access.txt)
8. .gitignore verification (no duplicates)
9. Symlink migration (existing → copy transition)
10. Cross-platform (Ubuntu → macOS portability)

---

## Development Tools

### Linting
- **Tool**: shellcheck (bash linter)
- **Usage**: `shellcheck 2l.sh` before committing
- **Rules**: Follow shellcheck recommendations for POSIX compatibility

### Formatting
- **Tool**: Manual (consistent 2-space indentation)
- **Style**: Follow Google Shell Style Guide
- **Line length**: Max 100 characters for readability

### Version Control
- **Tool**: Git (already required by 2L)
- **Branching**: Not applicable (direct file creation in iteration workflow)
- **Commit messages**: Descriptive (e.g., "Add installation script with idempotency")

---

## Environment Variables

No environment variables required for Iteration 1. All configuration is file-based or command-line flags.

**Future consideration:**
- `2L_INSTALL_DIR`: Override default `~/.claude/` installation directory
- `2L_BACKUP_ENABLED`: Disable backups with `false` (for clean testing)

---

## Dependencies Overview

### Required Dependencies (User Must Have)
- **Bash**: 4.x+ (3.2+ for basic compatibility)
- **Git**: Any recent version (for repository operations)
- **Python 3**: Any version (already required by 2L dashboard)

### Optional Dependencies (Installed by Commands)
- **PostgreSQL client (psql)**: Installed by `/2l-setup-db`
- **sudo access**: Required for psql installation on Ubuntu/Debian
- **Homebrew**: Required for macOS package installation

### MCP Dependencies (Fully Optional)
- **Node.js + npm**: Required for MCP server installation
- **Claude Desktop**: Required for MCP functionality

---

## Performance Targets

- **Installation Duration**: <10 seconds on SSD (file copying + YAML write)
- **Database Setup**: <30 seconds (including psql installation on Ubuntu)
- **MCP Setup**: <5 seconds (display instructions only, no installation)
- **Idempotency Test**: Run `./2l.sh install` 10 times in <60 seconds total
- **Backup Creation**: <2 seconds (copy 32 agent/command/lib files)

**Optimization Notes:**
- No network operations during installation (all files local)
- Minimal disk I/O (small text files, <1MB total)
- No CPU-intensive operations (simple file copying)
- Database setup may take longer on slow internet (apt-get package download)

---

## Security Considerations

### 1. Sudo Password Storage
- **Risk**: Plain text password in project directory
- **Mitigation**:
  - chmod 600 (owner read/write only)
  - Always in .gitignore (verified before writing)
  - Clear revocation instructions provided
  - Future: keyring integration

### 2. Installation Script Permissions
- **Risk**: Executable script could be modified by attacker
- **Mitigation**:
  - Downloaded from trusted repository (GitHub)
  - User reviews script before running
  - chmod +x only after user verification
  - Future: GPG signature verification

### 3. Backup Data Exposure
- **Risk**: Backups contain sensitive agent prompts
- **Mitigation**:
  - Backups stored in `~/.claude/.2l-backups/` (user-private directory)
  - No backups committed to git
  - Document backup cleanup instructions

### 4. MCP Config File Editing
- **Risk**: Malformed JSON breaks Claude Desktop
- **Mitigation**:
  - Guidance-only approach (no automated editing)
  - User validates JSON before saving
  - Provide JSON syntax checker recommendation
  - Future: Automated JSON merge with validation

---

## Cross-Platform Compatibility Matrix

| Feature | Ubuntu 24.04 | Debian 12 | macOS Sonoma | macOS Ventura |
|---------|--------------|-----------|--------------|---------------|
| Installation script | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Database setup | ✅ apt-get | ✅ apt-get | ✅ brew | ✅ brew |
| MCP setup | ✅ Linux paths | ✅ Linux paths | ✅ macOS paths | ✅ macOS paths |
| Backup mechanism | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| chmod 600 | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

**Not Supported:**
- Windows native (WSL only, treated as Linux)
- FreeBSD / other Unix variants (untested, may work)

---

## Future Enhancements

1. **Automated Testing**: bats framework for bash unit tests
2. **CI/CD Pipeline**: GitHub Actions to test on multiple platforms
3. **Docker Environment**: Containerized testing for reproducibility
4. **MCP Auto-Install**: Automated npm installation and config editing
5. **Keyring Integration**: Secure password storage via OS keychains
6. **Rollback Command**: `2l.sh rollback` to restore previous installation
7. **Update Command**: `2l.sh update` to pull latest from repository
8. **Health Check**: `/2l-doctor` to validate all dependencies
