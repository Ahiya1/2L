# 2L Database Setup - Configure PostgreSQL Access

Interactive command to install PostgreSQL client (psql) and configure secure database access for 2L orchestration. This command will prompt for your sudo password, store it securely, and test connection to Supabase local database.

## Usage

```bash
/2l-setup-db
```

No arguments needed. The command will guide you through:
1. Sudo password collection (stored in `.sudo_access.txt` with chmod 600)
2. PostgreSQL client installation (via apt-get or brew)
3. Database connection testing (localhost:54322)
4. Success confirmation with troubleshooting if needed

---

## What This Does

- **Secure Password Storage**: Prompts for sudo password with hidden input, stores in `.sudo_access.txt` with chmod 600
- **Auto .gitignore**: Automatically adds `.sudo_access.txt` to `.gitignore` to prevent commits
- **Cross-Platform**: Detects OS and uses appropriate package manager (apt-get for Ubuntu/Debian, brew for macOS)
- **PostgreSQL Installation**: Installs postgresql-client package with sudo access
- **Connection Testing**: Validates connection to Supabase local database on localhost:54322
- **Idempotent**: Safe to run multiple times, allows password updates
- **Revocation Instructions**: Provides clear steps to revoke sudo access later

---

## Prerequisites

- **Supabase Local**: Must be running on localhost:54322 (start with `supabase start`)
- **Package Manager**: apt-get (Ubuntu/Debian) or Homebrew (macOS)
- **Sudo Access**: You must have sudo privileges on your machine
- **Git Repository**: Running from a git repository (for .gitignore management)

---

## Implementation

```bash
#!/bin/bash
set -euo pipefail

# Script: /2l-setup-db
# Purpose: Install PostgreSQL client and configure secure database access
# Exit codes:
#   0 - Success (database access configured)
#   1 - Error (critical failure)

# Global variables
OS=""
PKG_MANAGER=""
SUDO_PASSWORD=""

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
      echo ""
      echo "Manual installation required:"
      echo "  - Download PostgreSQL from: https://www.postgresql.org/download/"
      echo "  - Or install via your distribution's package manager"
      return 1
    fi
  elif [ "$OS" = "macos" ]; then
    if command -v brew >/dev/null 2>&1; then
      PKG_MANAGER="brew"
    else
      echo "Error: Homebrew not found"
      echo ""
      echo "Install Homebrew:"
      echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
      echo ""
      echo "Then run /2l-setup-db again."
      return 1
    fi
  fi

  echo "Detected: $OS ($PKG_MANAGER)"
  return 0
}

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
  echo "SECURITY NOTES:"
  echo "  - Password stored in plain text (chmod 600 for owner-only access)"
  echo "  - Never committed to git (auto-added to .gitignore)"
  echo "  - Used only for PostgreSQL client installation"
  echo "  - Can be revoked by deleting .sudo_access.txt"
  echo ""

  # Check if .sudo_access.txt already exists
  if [ -f ".sudo_access.txt" ]; then
    echo "⚠ .sudo_access.txt already exists"
    echo ""
    read -p "Update sudo password? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Using existing password"
      echo ""
      return 0
    fi
  fi

  # Add to .gitignore BEFORE creating file (security)
  add_to_gitignore ".sudo_access.txt"
  echo ""

  # Prompt for password (hidden input)
  echo "Enter your sudo password:"
  read -s SUDO_PASSWORD
  echo ""

  # Test sudo access
  echo "Testing sudo access..."
  if echo "$SUDO_PASSWORD" | sudo -S echo "✓ Sudo access verified" >/dev/null 2>&1; then
    echo "✓ Sudo access verified"
  else
    echo "✗ Error: Incorrect sudo password"
    echo ""
    echo "Please try again or use manual installation:"
    if [ "$OS" = "linux" ]; then
      echo "  sudo apt-get install postgresql-client"
    else
      echo "  brew install postgresql@14"
    fi
    return 1
  fi

  # Create .sudo_access.txt with strict permissions
  echo "$SUDO_PASSWORD" > .sudo_access.txt
  chmod 600 .sudo_access.txt

  echo "✓ Password stored in .sudo_access.txt (chmod 600)"
  echo ""

  return 0
}

# Install PostgreSQL client (psql)
install_psql() {
  # Check if already installed
  if command -v psql >/dev/null 2>&1; then
    echo "✓ PostgreSQL client already installed"
    psql --version
    echo ""
    return 0
  fi

  echo "Installing PostgreSQL client..."
  echo ""

  # Read sudo password from .sudo_access.txt
  if [ ! -f ".sudo_access.txt" ]; then
    echo "Error: .sudo_access.txt not found"
    echo "This should not happen. Please run /2l-setup-db again."
    return 1
  fi

  SUDO_PASSWORD=$(cat .sudo_access.txt)

  # Install based on OS
  if [ "$OS" = "linux" ]; then
    if [ "$PKG_MANAGER" = "apt" ]; then
      # Update package lists
      echo "Updating package lists..."
      if echo "$SUDO_PASSWORD" | sudo -S apt-get update >/dev/null 2>&1; then
        echo "✓ Package lists updated"
      else
        echo "Error: Failed to update package lists"
        echo "Check sudo password in .sudo_access.txt"
        return 1
      fi

      # Install postgresql-client
      echo "Installing postgresql-client..."
      if echo "$SUDO_PASSWORD" | sudo -S apt-get install -y postgresql-client 2>&1 | grep -q "Setting up"; then
        echo "✓ PostgreSQL client installed"
      else
        echo "Error: Failed to install postgresql-client"
        echo ""
        echo "Try manual installation:"
        echo "  sudo apt-get install postgresql-client"
        return 1
      fi
    elif [ "$PKG_MANAGER" = "yum" ]; then
      echo "Installing postgresql..."
      if echo "$SUDO_PASSWORD" | sudo -S yum install -y postgresql 2>&1 | grep -q "Complete"; then
        echo "✓ PostgreSQL client installed"
      else
        echo "Error: Failed to install postgresql"
        return 1
      fi
    fi
  elif [ "$OS" = "macos" ]; then
    # Homebrew doesn't require sudo
    echo "Installing postgresql@14 via Homebrew..."
    if brew install postgresql@14 >/dev/null 2>&1; then
      echo "✓ PostgreSQL client installed"
    else
      echo "Error: Failed to install PostgreSQL via Homebrew"
      echo ""
      echo "Try manual installation:"
      echo "  brew install postgresql@14"
      return 1
    fi
  fi

  # Verify installation
  if command -v psql >/dev/null 2>&1; then
    echo ""
    echo "✓ PostgreSQL client installed successfully"
    psql --version
    echo ""
    return 0
  else
    echo ""
    echo "Error: Installation appeared to succeed but psql not found"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check PATH environment variable"
    echo "  - Restart terminal session"
    echo "  - Run: which psql"
    return 1
  fi
}

# Test connection to Supabase local database
test_database_connection() {
  local host="127.0.0.1"
  local port="54322"
  local user="postgres"
  local password="postgres"
  local database="postgres"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Testing Database Connection"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Connection details:"
  echo "  Host: $host:$port"
  echo "  Database: $database"
  echo "  User: $user"
  echo ""

  # Test connection with simple query
  if PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$database" -c "SELECT version();" >/dev/null 2>&1; then
    echo "✓ Database connection successful"
    echo ""

    # Show PostgreSQL version
    echo "PostgreSQL version:"
    PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$database" -t -c "SELECT version();" 2>/dev/null | head -n 1 | xargs
    echo ""

    return 0
  else
    echo "✗ Database connection failed"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TROUBLESHOOTING"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Verify Supabase local is running:"
    echo "   supabase status"
    echo ""
    echo "2. Start Supabase local if not running:"
    echo "   supabase start"
    echo ""
    echo "3. Check if port 54322 is available:"
    echo "   lsof -i :54322"
    echo ""
    echo "4. Verify PostgreSQL client installed:"
    echo "   psql --version"
    echo ""
    echo "5. Test manual connection:"
    echo "   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres"
    echo ""
    echo "6. Check Supabase logs for errors:"
    echo "   supabase status"
    echo ""
    return 1
  fi
}

# Show revocation instructions
show_revocation_instructions() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECURITY: How to Revoke Sudo Access"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "To revoke sudo access stored in .sudo_access.txt:"
  echo ""
  echo "1. Delete the file:"
  echo "   rm .sudo_access.txt"
  echo ""
  echo "2. Or change your system password:"
  echo "   passwd"
  echo ""
  echo "3. Or configure passwordless sudo for psql only (advanced):"
  echo "   sudo visudo"
  echo "   Add line: yourusername ALL=(ALL) NOPASSWD: /usr/bin/apt-get"
  echo ""
  echo "The .sudo_access.txt file is:"
  echo "  - Stored locally in this project only"
  echo "  - Protected with chmod 600 (owner-only access)"
  echo "  - Never committed to git (.gitignore)"
  echo "  - Used only for PostgreSQL client installation"
  echo ""
}

# Main function
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "2L Database Setup"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Detect platform
  if ! detect_platform; then
    exit 1
  fi
  echo ""

  # Setup sudo access
  if ! setup_sudo_access; then
    exit 1
  fi

  # Install PostgreSQL client
  if ! install_psql; then
    exit 1
  fi

  # Test database connection
  if ! test_database_connection; then
    echo "⚠ Warning: Database connection failed"
    echo ""
    echo "PostgreSQL client is installed, but connection to Supabase local failed."
    echo "Follow troubleshooting steps above to resolve the issue."
    echo ""
    exit 1
  fi

  # Show revocation instructions
  show_revocation_instructions

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✓ Database Setup Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Next steps:"
  echo "  1. Run /2l-setup-mcps to configure optional testing MCPs"
  echo "  2. Start building with /2l-mvp"
  echo ""

  exit 0
}

# Execute main function
main
```

---

## Troubleshooting

### Issue: "Incorrect sudo password"
**Symptoms:** Error message after entering password
**Solution:**
- Verify you're typing the correct sudo password
- Test manually: `sudo echo "test"`
- Check if sudo requires password on your system
- Try running the command again

### Issue: "Package manager not found"
**Symptoms:** Error on OS detection
**Solution:**
- Ubuntu/Debian: Install apt-get (should be pre-installed)
- macOS: Install Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Other Linux: Install via your distribution's package manager manually

### Issue: "Database connection failed"
**Symptoms:** Connection test fails even with psql installed
**Solution:**
1. Check if Supabase is running: `supabase status`
2. Start Supabase if not running: `supabase start`
3. Verify port 54322 is open: `lsof -i :54322`
4. Check Supabase configuration in `supabase/config.toml`
5. Test manual connection: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`

### Issue: ".sudo_access.txt committed to git"
**Symptoms:** File appears in git status
**Solution:**
- This should not happen (auto-added to .gitignore)
- If it does, remove from staging: `git rm --cached .sudo_access.txt`
- Verify .gitignore entry exists: `grep sudo_access .gitignore`
- Run command again to ensure .gitignore is updated

### Issue: "psql installed but not found"
**Symptoms:** Installation succeeds but psql command not available
**Solution:**
- Restart terminal session (PATH may not be updated)
- Check PATH: `echo $PATH`
- Find psql location: `find /usr -name psql 2>/dev/null`
- macOS Homebrew: Add to PATH: `export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"`
- Add to ~/.bashrc or ~/.zshrc for persistence

### Issue: "Permission denied on .sudo_access.txt"
**Symptoms:** Cannot read or write .sudo_access.txt
**Solution:**
- Check file permissions: `ls -la .sudo_access.txt`
- Should show: `-rw------- 1 user user` (chmod 600)
- Fix permissions: `chmod 600 .sudo_access.txt`
- Verify ownership: `chown $USER:$USER .sudo_access.txt`
