# Code Patterns & Conventions

## File Structure

```
2L/                              # Repository root
├── 2l.sh                        # [NEW] Installation script
├── agents/                      # [FUTURE] Agent files to install
├── commands/                    # [FUTURE] Command files to install
├── lib/                         # [FUTURE] Library files to install
└── .2L/                         # Orchestration workspace

~/.claude/                       # Claude Code configuration directory
├── .2l-install.yaml            # [NEW] Installation state tracking
├── .2l-backups/                # [NEW] Backup directory
│   ├── 20251010-120000/        # Timestamped backup
│   ├── 20251010-140000/        # Another backup
│   └── ...
├── agents/                      # Installed agent files
│   ├── 2l-builder.md
│   ├── 2l-explorer.md
│   └── ... (10 files total)
├── commands/                    # Installed command files
│   ├── 2l-setup-db.md          # [NEW] Database setup command
│   ├── 2l-setup-mcps.md        # [NEW] MCP setup command
│   ├── 2l-mvp.md
│   └── ... (20 files total)
└── lib/                         # Installed library files
    ├── 2l-event-logger.sh
    └── 2l-dashboard-template.html

{project}/                       # User's project directory
├── .sudo_access.txt            # [NEW] Sudo password (chmod 600)
├── .gitignore                  # [MODIFIED] Includes .sudo_access.txt
└── .2L/                        # Orchestration workspace
    ├── events.jsonl
    └── dashboard/
```

## Naming Conventions

- **Scripts**: kebab-case with `.sh` extension (`2l.sh`, `install-deps.sh`)
- **Commands**: kebab-case with `.md` extension (`2l-setup-db.md`)
- **Functions**: snake_case (`backup_existing`, `install_component`)
- **Variables**: SCREAMING_SNAKE_CASE for globals, lowercase for locals
  - Global: `BACKUP_DIR`, `INSTALLATION_STATE`
  - Local: `component_name`, `target_path`
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_BACKUPS=10`, `DEFAULT_PORT=54322`)
- **YAML files**: kebab-case (`.2l-install.yaml`, `master-plan.yaml`)

## Bash Script Header Pattern

**When to use:** Every bash script file

**Template:**
```bash
#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Script: 2l.sh
# Purpose: Install 2L agents, commands, and libraries to ~/.claude/
# Usage: ./2l.sh install [--update] [--quiet]
#
# Exit codes:
#   0 - Success (all operations completed)
#   1 - Error (critical failure, user intervention required)
#   2 - Partial success (some operations failed)

# Version
VERSION="1.0.0"

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR=""
QUIET_MODE=false
UPDATE_MODE=false
```

**Key points:**
- `set -euo pipefail` catches errors early (exit on error, undefined variable, or pipe failure)
- Always include purpose and usage in header comment
- Document exit codes explicitly
- Set `SCRIPT_DIR` for reliable relative path resolution
- Declare all global variables at top of script

## Argument Parsing Pattern

**When to use:** Scripts with command-line arguments or flags

**Code example:**
```bash
# Parse command-line arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    install)
      COMMAND="install"
      shift
      ;;
    --update)
      UPDATE_MODE=true
      shift
      ;;
    --quiet)
      QUIET_MODE=true
      shift
      ;;
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Error: Unknown option: $1"
      echo ""
      echo "Usage: $0 install [--update] [--quiet] [--skip-backup]"
      exit 1
      ;;
  esac
done

# Validate required command
if [ -z "$COMMAND" ]; then
  echo "Error: Command required (install)"
  echo ""
  echo "Usage: $0 install [--update] [--quiet]"
  exit 1
fi
```

**Key points:**
- Use `while [[ $# -gt 0 ]]` loop to process all arguments
- `shift` after processing each argument
- Default option in `case` catches unknown flags
- Validate required arguments after parsing loop
- Always provide clear error messages with usage hints

## Pre-Flight Checks Pattern

**When to use:** Before making any system modifications

**Code example:**
```bash
# Pre-flight checks before installation
check_dependencies() {
  local missing_deps=()

  # Check for Git
  if ! command -v git >/dev/null 2>&1; then
    missing_deps+=("git")
  fi

  # Check for Python 3
  if ! command -v python3 >/dev/null 2>&1; then
    missing_deps+=("python3")
  fi

  # Report missing dependencies
  if [ ${#missing_deps[@]} -gt 0 ]; then
    echo "Error: Missing required dependencies:"
    for dep in "${missing_deps[@]}"; do
      echo "  - $dep"
    done
    echo ""
    echo "Install missing dependencies and try again."
    return 1
  fi

  return 0
}

# Check if target directory exists
check_claude_directory() {
  if [ ! -d "$CLAUDE_DIR" ]; then
    echo "Error: Claude config directory not found: $CLAUDE_DIR"
    echo ""
    echo "Expected directory structure:"
    echo "  ~/.claude/agents/"
    echo "  ~/.claude/commands/"
    echo "  ~/.claude/lib/"
    echo ""
    echo "Create directory: mkdir -p ~/.claude/{agents,commands,lib}"
    return 1
  fi
  return 0
}

# Check if source files exist
check_source_files() {
  if [ ! -d "$SCRIPT_DIR/../agents" ]; then
    echo "Error: Source directory not found: $SCRIPT_DIR/../agents"
    echo ""
    echo "Run this script from the 2L repository directory."
    return 1
  fi
  return 0
}

# Run all pre-flight checks
run_preflight_checks() {
  echo "Running pre-flight checks..."

  check_dependencies || return 1
  check_claude_directory || return 1
  check_source_files || return 1

  echo "✓ Pre-flight checks passed"
  echo ""
  return 0
}
```

**Key points:**
- Check all dependencies before making changes
- Return non-zero exit code on failure (bash convention)
- Provide actionable error messages with fix instructions
- Group related checks into functions
- Use array to accumulate missing dependencies (clean reporting)

## Backup Creation Pattern

**When to use:** Before overwriting existing files

**Code example:**
```bash
# Create timestamped backup of existing installation
backup_existing() {
  # Skip if flag set
  if [ "$SKIP_BACKUP" = true ]; then
    echo "Skipping backup (--skip-backup flag)"
    return 0
  fi

  # Check if anything exists to backup
  if [ ! -d "$CLAUDE_DIR/agents" ] && [ ! -d "$CLAUDE_DIR/commands" ] && [ ! -d "$CLAUDE_DIR/lib" ]; then
    echo "No existing installation found, skipping backup"
    return 0
  fi

  # Create timestamped backup directory
  local timestamp=$(date +%Y%m%d-%H%M%S)
  BACKUP_DIR="$CLAUDE_DIR/.2l-backups/$timestamp"

  echo "Creating backup: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"

  # Backup agents
  if [ -d "$CLAUDE_DIR/agents" ]; then
    cp -r "$CLAUDE_DIR/agents" "$BACKUP_DIR/" 2>/dev/null || {
      echo "Warning: Failed to backup agents directory"
    }
  fi

  # Backup commands
  if [ -d "$CLAUDE_DIR/commands" ]; then
    cp -r "$CLAUDE_DIR/commands" "$BACKUP_DIR/" 2>/dev/null || {
      echo "Warning: Failed to backup commands directory"
    }
  fi

  # Backup lib
  if [ -d "$CLAUDE_DIR/lib" ]; then
    cp -r "$CLAUDE_DIR/lib" "$BACKUP_DIR/" 2>/dev/null || {
      echo "Warning: Failed to backup lib directory"
    }
  fi

  # Backup state file if exists
  if [ -f "$CLAUDE_DIR/.2l-install.yaml" ]; then
    cp "$CLAUDE_DIR/.2l-install.yaml" "$BACKUP_DIR/" 2>/dev/null || {
      echo "Warning: Failed to backup state file"
    }
  fi

  echo "✓ Backup created successfully"
  echo ""
  return 0
}
```

**Key points:**
- Always timestamp backups (allows multiple backups)
- Check if source exists before copying (avoid errors)
- Set global `BACKUP_DIR` variable for state tracking
- Non-fatal errors (warn but continue)
- Use `|| {}` to catch errors without exiting (due to set -e)

## File Copying with Error Handling

**When to use:** Installing files from repository to ~/.claude/

**Code example:**
```bash
# Copy component directory to target
copy_component() {
  local component="$1"  # "agents", "commands", or "lib"
  local source_dir="$SCRIPT_DIR/$component"
  local target_dir="$CLAUDE_DIR/$component"

  # Validate source exists
  if [ ! -d "$source_dir" ]; then
    echo "Error: Source directory not found: $source_dir"
    return 1
  fi

  # Create target directory if needed
  mkdir -p "$target_dir" || {
    echo "Error: Failed to create directory: $target_dir"
    return 1
  }

  # Copy files
  echo "Installing $component..."
  cp -r "$source_dir"/* "$target_dir/" 2>/dev/null || {
    echo "Error: Failed to copy $component files"
    return 1
  }

  # Count installed files
  local file_count=$(find "$target_dir" -type f | wc -l)
  echo "✓ Installed $file_count $component files"

  return 0
}

# Install all components
install_components() {
  local components=("agents" "commands" "lib")
  local failed=()

  for component in "${components[@]}"; do
    if ! copy_component "$component"; then
      failed+=("$component")
    fi
  done

  # Report failures
  if [ ${#failed[@]} -gt 0 ]; then
    echo ""
    echo "Error: Failed to install components:"
    for component in "${failed[@]}"; do
      echo "  - $component"
    done
    return 1
  fi

  echo ""
  echo "✓ All components installed successfully"
  return 0
}
```

**Key points:**
- Validate source before copying
- Create target directory if missing
- Use `cp -r` for directory copying
- Count files for success confirmation
- Accumulate failures and report at end
- Return 0/1 for success/failure (bash convention)

## YAML State File Writing

**When to use:** Tracking installation state for idempotency

**Code example:**
```bash
# Write installation state to YAML file
update_state_yaml() {
  local state_file="$CLAUDE_DIR/.2l-install.yaml"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Create YAML content
  cat > "$state_file" <<EOF
installed_at: "$timestamp"
version: "$VERSION"
components:
  - agents
  - commands
  - lib
backups:
EOF

  # Append backup entries (if backups exist)
  if [ -d "$CLAUDE_DIR/.2l-backups" ]; then
    find "$CLAUDE_DIR/.2l-backups" -maxdepth 1 -type d -name "2*" | sort -r | head -n 5 | while read backup_path; do
      local backup_timestamp=$(basename "$backup_path")
      # Convert filename timestamp to ISO 8601
      local year=${backup_timestamp:0:4}
      local month=${backup_timestamp:4:2}
      local day=${backup_timestamp:6:2}
      local hour=${backup_timestamp:9:2}
      local minute=${backup_timestamp:11:2}
      local second=${backup_timestamp:13:2}
      local iso_timestamp="${year}-${month}-${day}T${hour}:${minute}:${second}Z"

      cat >> "$state_file" <<EOF
  - timestamp: "$iso_timestamp"
    path: "$backup_path"
EOF
    done
  else
    # Empty backups list
    echo "  []" >> "$state_file"
  fi

  # Append remaining fields
  cat >> "$state_file" <<EOF
last_update: "$timestamp"
source_repo: "$SCRIPT_DIR"
EOF

  echo "✓ State file updated: $state_file"
  return 0
}
```

**Key points:**
- Use heredoc (`<<EOF`) for clean multi-line YAML
- ISO 8601 timestamps for consistency
- Keep only 5 most recent backups in state file
- Sort backups reverse chronologically (`sort -r`)
- Atomic write (overwrites entire file at once)

## OS Detection Pattern

**When to use:** Cross-platform commands (database setup, MCP setup)

**Code example:**
```bash
# Detect operating system and package manager
detect_platform() {
  # Detect OS
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
  else
    echo "Error: Unsupported operating system: $OSTYPE"
    echo ""
    echo "Supported platforms:"
    echo "  - Ubuntu/Debian Linux"
    echo "  - macOS"
    return 1
  fi

  # Detect package manager (Linux only)
  if [ "$OS" = "linux" ]; then
    if command -v apt-get >/dev/null 2>&1; then
      PKG_MANAGER="apt"
    elif command -v yum >/dev/null 2>&1; then
      PKG_MANAGER="yum"
    else
      echo "Error: No supported package manager found (apt-get or yum)"
      return 1
    fi
  elif [ "$OS" = "macos" ]; then
    if command -v brew >/dev/null 2>&1; then
      PKG_MANAGER="brew"
    else
      echo "Error: Homebrew not found"
      echo ""
      echo "Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
      return 1
    fi
  fi

  echo "Detected: $OS ($PKG_MANAGER)"
  return 0
}
```

**Key points:**
- Use `$OSTYPE` for OS detection (built-in bash variable)
- Use `command -v` to check if package manager exists
- Provide installation instructions for missing tools (Homebrew)
- Return non-zero on unsupported platforms

## PostgreSQL Installation Pattern

**When to use:** Database setup command (`/2l-setup-db`)

**Code example:**
```bash
# Install PostgreSQL client (psql)
install_psql() {
  # Check if already installed
  if command -v psql >/dev/null 2>&1; then
    echo "✓ PostgreSQL client already installed"
    psql --version
    return 0
  fi

  echo "Installing PostgreSQL client..."

  # Read sudo password from .sudo_access.txt
  if [ ! -f ".sudo_access.txt" ]; then
    echo "Error: .sudo_access.txt not found"
    echo "Run this command to create it first (will prompt for password)"
    return 1
  fi

  SUDO_PASSWORD=$(cat .sudo_access.txt)

  # Install based on OS
  if [ "$OS" = "linux" ]; then
    if [ "$PKG_MANAGER" = "apt" ]; then
      # Update package lists
      echo "$SUDO_PASSWORD" | sudo -S apt-get update >/dev/null 2>&1 || {
        echo "Error: Failed to update package lists"
        echo "Check sudo password in .sudo_access.txt"
        return 1
      }

      # Install postgresql-client
      echo "$SUDO_PASSWORD" | sudo -S apt-get install -y postgresql-client >/dev/null 2>&1 || {
        echo "Error: Failed to install postgresql-client"
        return 1
      }
    fi
  elif [ "$OS" = "macos" ]; then
    # Homebrew doesn't require sudo
    brew install postgresql@14 || {
      echo "Error: Failed to install PostgreSQL via Homebrew"
      return 1
    }
  fi

  # Verify installation
  if command -v psql >/dev/null 2>&1; then
    echo "✓ PostgreSQL client installed successfully"
    psql --version
    return 0
  else
    echo "Error: Installation appeared to succeed but psql not found"
    return 1
  fi
}
```

**Key points:**
- Check if already installed first (idempotency)
- Read sudo password from `.sudo_access.txt` (secure storage)
- Use `echo "$PASSWORD" | sudo -S` to provide password non-interactively
- Suppress output with `>/dev/null 2>&1` for clean UX
- Verify installation succeeded with `command -v psql`
- Show version after successful install (confirmation)

## Interactive Password Prompt Pattern

**When to use:** First-time database setup

**Code example:**
```bash
# Prompt for sudo password and store securely
setup_sudo_access() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "DATABASE SETUP - Sudo Password Required"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "2L needs to install PostgreSQL client (psql) with sudo access."
  echo ""
  echo "Your password will be stored in .sudo_access.txt (chmod 600)"
  echo "and automatically added to .gitignore to prevent commits."
  echo ""

  # Check if .sudo_access.txt already exists
  if [ -f ".sudo_access.txt" ]; then
    echo "⚠ .sudo_access.txt already exists"
    echo ""
    read -p "Update sudo password? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Using existing password"
      return 0
    fi
  fi

  # Prompt for password (hidden input)
  echo "Enter your sudo password:"
  read -s SUDO_PASSWORD
  echo ""

  # Test sudo access
  echo "Testing sudo access..."
  echo "$SUDO_PASSWORD" | sudo -S echo "✓ Sudo access verified" >/dev/null 2>&1

  if [ $? -ne 0 ]; then
    echo "✗ Error: Incorrect sudo password"
    echo ""
    echo "Please try again or use manual installation:"
    echo "  sudo apt-get install postgresql-client"
    return 1
  fi

  # Create .sudo_access.txt with strict permissions
  echo "$SUDO_PASSWORD" > .sudo_access.txt
  chmod 600 .sudo_access.txt

  echo "✓ Password stored in .sudo_access.txt (chmod 600)"

  # Add to .gitignore
  add_to_gitignore ".sudo_access.txt"

  echo ""
  return 0
}
```

**Key points:**
- Use `read -s` to hide password input (security)
- Test sudo access before storing password (validate early)
- Always chmod 600 immediately after creating file
- Confirm before overwriting existing password
- Provide manual fallback if automated approach fails

## .gitignore Auto-Append Pattern

**When to use:** Adding entries to .gitignore without duplicates

**Code example:**
```bash
# Add entry to .gitignore (no duplicates)
add_to_gitignore() {
  local entry="$1"
  local gitignore_file=".gitignore"

  # Create .gitignore if it doesn't exist
  if [ ! -f "$gitignore_file" ]; then
    echo "Creating .gitignore..."
    touch "$gitignore_file"
  fi

  # Check if entry already exists (exact match)
  if grep -qF "$entry" "$gitignore_file" 2>/dev/null; then
    echo "✓ $entry already in .gitignore"
    return 0
  fi

  # Append entry
  echo "$entry" >> "$gitignore_file"
  echo "✓ Added $entry to .gitignore"

  return 0
}
```

**Key points:**
- Use `grep -qF` for exact match (not regex)
- `-q` for quiet (no output), `-F` for fixed string
- Create .gitignore if missing (don't assume it exists)
- Idempotent (safe to run multiple times)

## Database Connection Test Pattern

**When to use:** Validating PostgreSQL connection

**Code example:**
```bash
# Test connection to Supabase local database
test_database_connection() {
  local host="127.0.0.1"
  local port="54322"
  local user="postgres"
  local password="postgres"
  local database="postgres"

  echo "Testing database connection..."
  echo "  Host: $host:$port"
  echo "  Database: $database"
  echo ""

  # Test connection with simple query
  PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$database" -c "SELECT version();" >/dev/null 2>&1

  if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
    echo ""

    # Show PostgreSQL version
    PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$database" -c "SELECT version();" 2>/dev/null | grep PostgreSQL

    return 0
  else
    echo "✗ Database connection failed"
    echo ""
    echo "Troubleshooting steps:"
    echo ""
    echo "1. Verify Supabase local is running:"
    echo "   supabase status"
    echo ""
    echo "2. Start Supabase local if not running:"
    echo "   supabase start --exclude studio,edge-runtime"
    echo ""
    echo "3. Check if port 54322 is available:"
    echo "   lsof -i :54322"
    echo ""
    echo "4. Verify PostgreSQL client installed:"
    echo "   psql --version"
    echo ""
    return 1
  fi
}
```

**Key points:**
- Use `PGPASSWORD` environment variable for non-interactive auth
- Redirect output to /dev/null for quiet testing
- Check exit code (`$?`) for success/failure
- Provide comprehensive troubleshooting steps on failure
- Show PostgreSQL version on success (confirmation)

## MCP Configuration Guidance Pattern

**When to use:** MCP setup command (guidance-only approach)

**Code example:**
```bash
# Display Playwright MCP setup instructions
show_playwright_mcp_instructions() {
  cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Install Playwright MCP Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Playwright MCP provides browser automation and testing capabilities
for 2L agents.

1. Clone repository:
   git clone https://github.com/executeautomation/playwright-mcp-server.git
   cd playwright-mcp-server

2. Install dependencies:
   npm install

3. Note the absolute path:
   pwd
   # Example: /home/user/playwright-mcp-server

4. Test the server:
   node index.js
   # Should start without errors (Ctrl+C to stop)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
}

# Display configuration snippet
show_mcp_config_snippet() {
  local playwright_path="$1"
  local chrome_devtools_path="$2"

  cat <<EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Configuration Snippet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add this to your $CONFIG_PATH:

{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["$playwright_path/index.js"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@voxel51/chrome-devtools-mcp"]
    }
  }
}

Note: Replace $playwright_path with the absolute path from Step 1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
}

# Guide user through MCP validation
show_mcp_validation_steps() {
  cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Validation Steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Restart Claude Desktop completely (Quit → Reopen)

2. Open Claude Desktop settings to verify MCPs loaded

3. Test MCP access with Claude:
   "Can you list available MCP servers?"

4. If MCPs don't appear:
   - Check JSON syntax (validate at jsonlint.com)
   - Verify absolute paths are correct
   - Check Claude Desktop logs for errors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
}
```

**Key points:**
- Use heredoc with `<<'EOF'` to prevent variable expansion (literal output)
- Use box drawing characters for visual clarity (━)
- Provide step-by-step instructions with exact commands
- Include validation steps at the end
- Show config snippet with placeholder for user customization
- Keep instructions concise but comprehensive

## Logging Pattern (Quiet Mode Support)

**When to use:** All user-facing output in scripts

**Code example:**
```bash
# Logging functions with quiet mode support
log_info() {
  if [ "$QUIET_MODE" = false ]; then
    echo "$@"
  fi
}

log_success() {
  if [ "$QUIET_MODE" = false ]; then
    echo "✓ $@"
  fi
}

log_error() {
  # Always show errors (even in quiet mode)
  echo "✗ Error: $@" >&2
}

log_warning() {
  if [ "$QUIET_MODE" = false ]; then
    echo "⚠ Warning: $@"
  fi
}

# Usage examples
log_info "Installing components..."
log_success "Installation complete"
log_error "Failed to copy files"
log_warning "Backup directory not found"
```

**Key points:**
- Check `$QUIET_MODE` before outputting informational messages
- Always show errors (redirect to stderr with `>&2`)
- Use Unicode symbols for visual clarity (✓ ✗ ⚠)
- Warnings respect quiet mode (skippable information)

## Exit Code Convention

**When to use:** Returning from functions and exiting scripts

**Code example:**
```bash
# Main installation function
main() {
  # Run pre-flight checks
  if ! run_preflight_checks; then
    exit 1  # Critical failure
  fi

  # Create backup
  if ! backup_existing; then
    log_error "Backup failed"
    exit 1  # Critical failure
  fi

  # Install components
  local failed_components=()

  if ! copy_component "agents"; then
    failed_components+=("agents")
  fi

  if ! copy_component "commands"; then
    failed_components+=("commands")
  fi

  if ! copy_component "lib"; then
    failed_components+=("lib")
  fi

  # Check for partial failure
  if [ ${#failed_components[@]} -gt 0 ]; then
    log_error "Some components failed to install: ${failed_components[*]}"
    exit 2  # Partial success
  fi

  # Update state file
  if ! update_state_yaml; then
    log_warning "Failed to update state file"
    exit 2  # Partial success
  fi

  log_success "Installation completed successfully"
  exit 0  # Full success
}

# Execute main function
main "$@"
```

**Key points:**
- Exit 0 = full success (all operations completed)
- Exit 1 = critical failure (user intervention required)
- Exit 2 = partial success (some operations failed, system partially functional)
- Always exit with status code (never implicit exit)
- Use `exit` only in main function (functions return 0/1)

## Command Implementation Template (Claude Code)

**When to use:** Creating new 2L commands (`/2l-setup-db`, `/2l-setup-mcps`)

**Template structure:**
```markdown
# Command Name - Brief Description

Longer description of what the command does and when to use it.

## Usage

```bash
/command-name [arguments]
```

Description of arguments and options.

---

## What This Does

- Feature 1
- Feature 2
- Feature 3

---

## Prerequisites

- Prerequisite 1
- Prerequisite 2

---

## Implementation

```bash
#!/bin/bash
set -euo pipefail

# [Full bash implementation here]
# - Include all error handling
# - Include all user prompts
# - Include all validation
# - Include all output formatting
```

---

## Troubleshooting

### Issue 1
**Symptoms:** Description
**Solution:** Steps to fix

### Issue 2
**Symptoms:** Description
**Solution:** Steps to fix
```

**Key points:**
- Follow existing command format (see `/2l-dashboard.md` for reference)
- Include complete bash implementation in markdown code block
- Provide troubleshooting section for common issues
- Document prerequisites clearly
- Keep description concise but comprehensive

## Import/Source Pattern

**When to use:** Using event logger library in commands

**Code example:**
```bash
# Source event logger library if available (optional, backward compatible)
EVENT_LOGGING_ENABLED=false
if [ -f "$HOME/.claude/lib/2l-event-logger.sh" ]; then
  . "$HOME/.claude/lib/2l-event-logger.sh"
  EVENT_LOGGING_ENABLED=true
fi

# Emit event (conditional on library availability)
if [ "$EVENT_LOGGING_ENABLED" = true ]; then
  log_2l_event "setup_start" "Database setup initiated" "setup" "setup-db"
fi
```

**Key points:**
- Always check if library exists before sourcing
- Set flag to track availability (avoid repeated checks)
- Gracefully degrade if library missing (backward compatible)
- Use `.` (dot) for sourcing, not `source` (POSIX compatible)

---

## Summary of Key Patterns

1. **Bash Script Header**: `set -euo pipefail`, version, global vars
2. **Argument Parsing**: `while [[ $# -gt 0 ]]` with `case` statement
3. **Pre-Flight Checks**: Validate before modifying system
4. **Backup Creation**: Timestamped backups before overwriting
5. **File Copying**: Error handling with `|| {}` blocks
6. **YAML Writing**: Heredoc for multi-line content
7. **OS Detection**: `$OSTYPE` and `command -v` checks
8. **PostgreSQL Install**: sudo password from file, cross-platform
9. **Password Prompt**: `read -s`, test before storing
10. **Gitignore Append**: `grep -qF` for duplicate detection
11. **DB Connection Test**: `PGPASSWORD` env var, comprehensive errors
12. **MCP Guidance**: Heredoc with literal quotes (`<<'EOF'`)
13. **Logging**: Quiet mode support, Unicode symbols
14. **Exit Codes**: 0=success, 1=error, 2=partial
15. **Command Template**: Markdown with embedded bash

**Builders:** Follow these patterns exactly for consistency across all scripts and commands. Copy and adapt code examples rather than rewriting from scratch.
