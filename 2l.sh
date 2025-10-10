#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Script: 2l.sh
# Purpose: Install 2L agents, commands, and libraries to ~/.claude/
# Usage: ./2l.sh install [--update] [--quiet] [--skip-backup]
#
# Exit codes:
#   0 - Success (all operations completed)
#   1 - Error (critical failure, user intervention required)
#   2 - Partial success (some operations failed)

# Version
VERSION="1.0.0"

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="/home/ahiya/2l-claude-config"
CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR=""
QUIET_MODE=false
UPDATE_MODE=false
SKIP_BACKUP=false

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

# Show help message
show_help() {
  cat <<'EOF'
2L Installation Script

USAGE:
  ./2l.sh install [OPTIONS]

OPTIONS:
  --update        Force overwrite of existing files
  --quiet         Silent operation (errors only)
  --skip-backup   Skip backup creation
  -h, --help      Show this help message

DESCRIPTION:
  Installs 2L agents, commands, and libraries to ~/.claude/

  The installation script will:
  - Copy all files from /home/ahiya/2l-claude-config/ to ~/.claude/
  - Create timestamped backup before overwriting (unless --skip-backup)
  - Track installation state in ~/.claude/.2l-install.yaml
  - Support idempotent operation (safe to run multiple times)

EXAMPLES:
  ./2l.sh install              # First-time installation
  ./2l.sh install --update     # Update existing installation
  ./2l.sh install --quiet      # Silent operation

EXIT CODES:
  0 - Success (all operations completed)
  1 - Error (critical failure, user intervention required)
  2 - Partial success (some operations failed)

EOF
}

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
      echo "Run '$0 --help' for more information"
      exit 1
      ;;
  esac
done

# Validate required command
if [ -z "$COMMAND" ]; then
  echo "Error: Command required"
  echo ""
  echo "Usage: $0 install [--update] [--quiet] [--skip-backup]"
  echo "Run '$0 --help' for more information"
  exit 1
fi

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
    log_error "Missing required dependencies:"
    for dep in "${missing_deps[@]}"; do
      echo "  - $dep" >&2
    done
    echo "" >&2
    echo "Install missing dependencies and try again." >&2
    return 1
  fi

  return 0
}

# Check if target directory exists
check_claude_directory() {
  if [ ! -d "$CLAUDE_DIR" ]; then
    log_error "Claude config directory not found: $CLAUDE_DIR"
    echo "" >&2
    echo "Expected directory structure:" >&2
    echo "  ~/.claude/agents/" >&2
    echo "  ~/.claude/commands/" >&2
    echo "  ~/.claude/lib/" >&2
    echo "" >&2
    echo "Create directories: mkdir -p ~/.claude/{agents,commands,lib}" >&2
    return 1
  fi
  return 0
}

# Check if source files exist
check_source_files() {
  if [ ! -d "$SOURCE_DIR" ]; then
    log_error "Source directory not found: $SOURCE_DIR"
    echo "" >&2
    echo "Expected source directory with agents, commands, and lib subdirectories." >&2
    return 1
  fi

  # Check for required subdirectories
  local missing_dirs=()
  for dir in agents commands lib; do
    if [ ! -d "$SOURCE_DIR/$dir" ]; then
      missing_dirs+=("$dir")
    fi
  done

  if [ ${#missing_dirs[@]} -gt 0 ]; then
    log_error "Missing source directories in $SOURCE_DIR:"
    for dir in "${missing_dirs[@]}"; do
      echo "  - $dir" >&2
    done
    return 1
  fi

  return 0
}

# Detect symlinks and warn user
check_symlinks() {
  local has_symlinks=false
  local symlink_targets=()

  for component in agents commands lib; do
    if [ -L "$CLAUDE_DIR/$component" ]; then
      has_symlinks=true
      local target=$(readlink "$CLAUDE_DIR/$component")
      symlink_targets+=("$component -> $target")
    fi
  done

  if [ "$has_symlinks" = true ]; then
    log_warning "Symlinks detected in $CLAUDE_DIR:"
    for link in "${symlink_targets[@]}"; do
      log_info "  $link"
    done
    log_info ""
    log_info "Installation will replace symlinks with file copies."
    log_info "Symlink targets will be backed up before replacement."
    log_info ""
  fi

  return 0
}

# Run all pre-flight checks
run_preflight_checks() {
  log_info "Running pre-flight checks..."
  log_info ""

  check_dependencies || return 1
  check_claude_directory || return 1
  check_source_files || return 1
  check_symlinks || return 1

  log_success "Pre-flight checks passed"
  log_info ""
  return 0
}

# Create timestamped backup of existing installation
backup_existing() {
  # Skip if flag set
  if [ "$SKIP_BACKUP" = true ]; then
    log_info "Skipping backup (--skip-backup flag)"
    log_info ""
    return 0
  fi

  # Check if anything exists to backup
  local needs_backup=false
  for component in agents commands lib; do
    if [ -e "$CLAUDE_DIR/$component" ]; then
      needs_backup=true
      break
    fi
  done

  if [ "$needs_backup" = false ]; then
    log_info "No existing installation found, skipping backup"
    log_info ""
    return 0
  fi

  # Create timestamped backup directory
  local timestamp=$(date +%Y%m%d-%H%M%S)
  BACKUP_DIR="$CLAUDE_DIR/.2l-backups/$timestamp"

  log_info "Creating backup: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"

  # Backup agents (handle both symlinks and directories)
  if [ -e "$CLAUDE_DIR/agents" ]; then
    if [ -L "$CLAUDE_DIR/agents" ]; then
      # Follow symlink and backup target
      cp -r "$CLAUDE_DIR/agents/" "$BACKUP_DIR/agents" 2>/dev/null || {
        log_warning "Failed to backup agents directory"
      }
    else
      cp -r "$CLAUDE_DIR/agents" "$BACKUP_DIR/" 2>/dev/null || {
        log_warning "Failed to backup agents directory"
      }
    fi
  fi

  # Backup commands
  if [ -e "$CLAUDE_DIR/commands" ]; then
    if [ -L "$CLAUDE_DIR/commands" ]; then
      cp -r "$CLAUDE_DIR/commands/" "$BACKUP_DIR/commands" 2>/dev/null || {
        log_warning "Failed to backup commands directory"
      }
    else
      cp -r "$CLAUDE_DIR/commands" "$BACKUP_DIR/" 2>/dev/null || {
        log_warning "Failed to backup commands directory"
      }
    fi
  fi

  # Backup lib
  if [ -e "$CLAUDE_DIR/lib" ]; then
    if [ -L "$CLAUDE_DIR/lib" ]; then
      cp -r "$CLAUDE_DIR/lib/" "$BACKUP_DIR/lib" 2>/dev/null || {
        log_warning "Failed to backup lib directory"
      }
    else
      cp -r "$CLAUDE_DIR/lib" "$BACKUP_DIR/" 2>/dev/null || {
        log_warning "Failed to backup lib directory"
      }
    fi
  fi

  # Backup state file if exists
  if [ -f "$CLAUDE_DIR/.2l-install.yaml" ]; then
    cp "$CLAUDE_DIR/.2l-install.yaml" "$BACKUP_DIR/" 2>/dev/null || {
      log_warning "Failed to backup state file"
    }
  fi

  log_success "Backup created successfully"
  log_info ""
  return 0
}

# Remove symlinks before copying
remove_symlinks() {
  for component in agents commands lib; do
    if [ -L "$CLAUDE_DIR/$component" ]; then
      log_info "Removing symlink: $CLAUDE_DIR/$component"
      rm "$CLAUDE_DIR/$component" || {
        log_error "Failed to remove symlink: $CLAUDE_DIR/$component"
        return 1
      }
    fi
  done
  return 0
}

# Copy component directory to target
copy_component() {
  local component="$1"  # "agents", "commands", or "lib"
  local source_dir="$SOURCE_DIR/$component"
  local target_dir="$CLAUDE_DIR/$component"

  # Validate source exists
  if [ ! -d "$source_dir" ]; then
    log_error "Source directory not found: $source_dir"
    return 1
  fi

  # Create target directory if needed
  mkdir -p "$target_dir" || {
    log_error "Failed to create directory: $target_dir"
    return 1
  }

  # Copy files
  log_info "Installing $component..."
  cp -r "$source_dir"/* "$target_dir/" 2>/dev/null || {
    log_error "Failed to copy $component files"
    return 1
  }

  # Count installed files
  local file_count=$(find "$target_dir" -type f 2>/dev/null | wc -l)
  log_success "Installed $file_count $component files"

  return 0
}

# Install all components
install_components() {
  local components=("agents" "commands" "lib")
  local failed=()

  log_info ""
  for component in "${components[@]}"; do
    if ! copy_component "$component"; then
      failed+=("$component")
    fi
  done

  # Report failures
  if [ ${#failed[@]} -gt 0 ]; then
    echo "" >&2
    log_error "Failed to install components:"
    for component in "${failed[@]}"; do
      echo "  - $component" >&2
    done
    return 1
  fi

  log_info ""
  log_success "All components installed successfully"
  return 0
}

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
    local backups=$(find "$CLAUDE_DIR/.2l-backups" -maxdepth 1 -type d -name "2*" 2>/dev/null | sort -r | head -n 5)

    if [ -z "$backups" ]; then
      # No backups found, add empty list
      echo "  []" >> "$state_file"
    else
      # Process each backup
      while IFS= read -r backup_path; do
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
      done <<< "$backups"
    fi
  else
    # Empty backups list
    echo "  []" >> "$state_file"
  fi

  # Append remaining fields
  cat >> "$state_file" <<EOF
last_update: "$timestamp"
source_repo: "$SOURCE_DIR"
EOF

  log_info ""
  log_success "State file updated: $state_file"
  return 0
}

# Main installation function
install() {
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "2L Installation Script v$VERSION"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info ""

  # Run pre-flight checks
  if ! run_preflight_checks; then
    exit 1
  fi

  # Create backup
  if ! backup_existing; then
    log_error "Backup failed"
    exit 1
  fi

  # Remove symlinks if present
  if ! remove_symlinks; then
    log_error "Failed to remove symlinks"
    exit 1
  fi

  # Install components
  if ! install_components; then
    log_error "Installation failed"
    exit 2
  fi

  # Update state file
  if ! update_state_yaml; then
    log_warning "Failed to update state file"
    exit 2
  fi

  log_info ""
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_success "Installation completed successfully"
  log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info ""
  log_info "Installed to: $CLAUDE_DIR"
  log_info "State file: $CLAUDE_DIR/.2l-install.yaml"
  if [ -n "$BACKUP_DIR" ]; then
    log_info "Backup: $BACKUP_DIR"
  fi
  log_info ""
  log_info "Next steps:"
  log_info "  1. Run /2l-setup-db to configure database access"
  log_info "  2. Run /2l-setup-mcps to configure optional testing MCPs"
  log_info "  3. Start building with /2l-mvp"
  log_info ""

  exit 0
}

# Execute main function
if [ "$COMMAND" = "install" ]; then
  install
fi
