# 2L MCP Setup - Configure Testing Enhancements (Optional)

Guided setup for Model Context Protocol (MCP) servers that enhance 2L agent capabilities. This command provides step-by-step instructions for installing Playwright MCP (browser automation) and Chrome DevTools MCP (debugging), both fully optional with graceful degradation.

## Usage

```bash
/2l-setup-mcps
```

No arguments needed. The command will:
1. Detect your OS and show correct config file path
2. Check if Claude Code CLI MCP config exists
3. Display installation instructions for Playwright MCP
4. Display installation instructions for Chrome DevTools MCP
5. Generate JSON config snippet for copy-paste
6. Provide validation steps

---

## What This Does

- **OS Detection**: Automatically detects macOS or Linux and shows correct config paths
- **Guidance-Only**: Provides instructions without automated installation (respects user control)
- **Playwright MCP**: Browser automation and testing for agents
- **Chrome DevTools MCP**: Enhanced browser debugging and inspection
- **Config Snippet**: Generates ready-to-paste JSON configuration
- **Validation Steps**: Clear instructions to test MCP connections
- **Optional Messaging**: Explicitly states MCPs are not required for core 2L functionality

**IMPORTANT:** MCPs enhance agent capabilities but are **fully optional**. 2L works perfectly without them. Skip this command if you prefer to start building immediately.

---

## Prerequisites

- **Claude Code CLI**: Must be configured (MCPs integrate with Claude Code CLI)
- **Node.js + npm**: Required for MCP server installation
- **Git**: Required to clone MCP repositories
- **Terminal Access**: Comfortable running commands and editing config files

---

## Implementation

```bash
#!/bin/bash
set -euo pipefail

# Script: /2l-setup-mcps
# Purpose: Guide user through MCP setup for enhanced agent capabilities
# Exit codes:
#   0 - Success (guidance displayed)

# Global variables
OS=""
CONFIG_PATH=""

# Detect operating system
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    CONFIG_PATH="$(pwd)/.mcp.json"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    CONFIG_PATH="$(pwd)/.mcp.json"
  else
    echo "Error: Unsupported operating system: $OSTYPE"
    echo ""
    echo "Supported platforms:"
    echo "  - macOS (darwin)"
    echo "  - Linux (linux-gnu)"
    echo ""
    echo "Windows users: Use WSL (Windows Subsystem for Linux)"
    return 1
  fi

  return 0
}

# Check if Claude Code CLI config exists
check_config_exists() {
  if [ -f "$CONFIG_PATH" ]; then
    echo "✓ Claude Code CLI MCP config found: $CONFIG_PATH"
    return 0
  else
    echo "⚠ Claude Code CLI MCP config not found: $CONFIG_PATH"
    echo ""
    echo "This is normal if you haven't configured MCPs before."
    echo "You'll create this file during setup."
    return 0
  fi
}

# Display Playwright MCP instructions
show_playwright_instructions() {
  cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Install Playwright MCP Server (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Playwright MCP provides browser automation and testing capabilities
for 2L agents. This is OPTIONAL and can be skipped.

**What you gain:**
  - Automated browser testing during agent execution
  - User flow validation in real browsers
  - Screenshot capture for verification
  - Form interaction testing

**What you need:**
  - Node.js and npm installed
  - ~50MB disk space
  - 5-10 minutes to set up

**Installation steps:**

1. Clone the Playwright MCP repository:
   git clone https://github.com/executeautomation/playwright-mcp-server.git
   cd playwright-mcp-server

2. Install dependencies:
   npm install

3. Note the ABSOLUTE PATH to this directory:
   pwd

   Example output: /home/user/playwright-mcp-server
   Copy this path - you'll need it for configuration!

4. Test the server (optional but recommended):
   node index.js

   Should start without errors. Press Ctrl+C to stop.

5. Return to your project directory:
   cd -

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
}

# Display Chrome DevTools MCP instructions
show_chrome_devtools_instructions() {
  cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Install Chrome DevTools MCP Server (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chrome DevTools MCP provides enhanced browser debugging and
inspection capabilities. This is OPTIONAL and can be skipped.

**What you gain:**
  - Real-time console monitoring during tests
  - Network request inspection
  - Performance profiling
  - JavaScript execution in browser context

**What you need:**
  - Node.js and npm installed
  - Chrome or Chromium browser
  - ~20MB disk space
  - 2-3 minutes to set up

**Installation steps:**

1. Install via npm (global or local):
   npm install -g @voxel51/chrome-devtools-mcp

   Or for local project:
   npm install @voxel51/chrome-devtools-mcp

2. No additional configuration needed!
   The MCP is invoked via npx in the config.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
}

# Display configuration instructions
show_config_instructions() {
  local config_path="$1"

  cat <<EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: Configure Claude Code CLI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add MCP servers to your Claude Code CLI project configuration.

**Config file location:**
  $config_path

**Instructions:**

1. Open the config file in your editor:
   nano "$config_path"

   Or use VSCode:
   code "$config_path"

2. If the file doesn't exist, create it with this content:
   {
     "mcpServers": {}
   }

3. Add MCP server configurations (see snippet below)

4. Save and close the file

5. IMPORTANT: Reload Claude Code CLI session
   - Exit the current Claude Code session (type 'exit' or Ctrl+D)
   - Start a new session: claude code
   - MCPs should now be available

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
}

# Generate config snippet
show_config_snippet() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "CONFIGURATION SNIPPET"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Copy this JSON snippet into your Claude Code CLI .mcp.json file:"
  echo ""
  cat <<'EOF'
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/playwright-mcp-server/index.js"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@voxel51/chrome-devtools-mcp"]
    }
  }
}
EOF
  echo ""
  echo "IMPORTANT:"
  echo "  - Replace /ABSOLUTE/PATH/TO/ with the actual path from Step 1"
  echo "  - Example: /home/user/playwright-mcp-server/index.js"
  echo "  - Use the full path from 'pwd' command output"
  echo "  - If you skip Playwright or Chrome DevTools, remove that entry"
  echo ""
  echo "If you already have mcpServers configured:"
  echo "  - Add the new entries inside the existing mcpServers object"
  echo "  - Ensure valid JSON syntax (commas between entries)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Show validation steps
show_validation_steps() {
  cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: Validate MCP Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After configuring and reloading Claude Code CLI:

1. Start a new Claude Code CLI session:
   claude code

2. Test MCP access:
   Ask Claude: "Can you list available MCP servers?"

   Expected response: Claude should list the configured servers

3. Verify MCPs appear:
   - playwright
   - chrome-devtools (if installed)

4. Test functionality (optional):
   Ask: "Can you navigate to https://example.com using Playwright?"

   Expected: Claude should use the MCP to perform the action

**If MCPs don't appear:**

  - Verify JSON syntax is valid (use jsonlint.com)
  - Check absolute paths are correct (no typos)
  - Ensure you exited and restarted Claude Code CLI session
  - Check that .mcp.json is in your project directory
  - Verify Node.js is in PATH (run: which node)

**Still having issues?**

  - Try the /2l-check-mcps command for diagnostics
  - Check MCP server documentation on GitHub
  - MCPs are optional - you can skip and use 2L without them!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
}

# Show optional messaging
show_optional_message() {
  cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MCPs ARE FULLY OPTIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Model Context Protocol servers enhance 2L agent capabilities but
are NOT REQUIRED for core 2L functionality.

**Without MCPs, 2L agents can still:**
  - Execute bash commands
  - Read and write files
  - Search codebases with grep
  - Manage git operations
  - Run tests and builds
  - Orchestrate multi-agent workflows

**With MCPs, agents additionally gain:**
  - Browser automation (Playwright)
  - Enhanced debugging (Chrome DevTools)
  - Future: Database access via Supabase MCP

**Recommendation:**
  - Skip MCPs if you want to start building immediately
  - Add MCPs later when you need advanced testing capabilities
  - They can be configured at any time

**Graceful degradation:**
  - If MCP is unavailable, agents will work around it
  - No errors or failures if MCPs are missing
  - Agents document MCP availability in reports

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
}

# Main function
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "2L MCP Setup - Testing Enhancements (Optional)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Show optional messaging first
  show_optional_message

  # Detect OS
  if ! detect_os; then
    exit 1
  fi

  echo "Detected OS: $OS"
  echo "Config path: $CONFIG_PATH"
  echo ""

  # Check if config exists
  check_config_exists
  echo ""

  # Show installation instructions
  show_playwright_instructions
  show_chrome_devtools_instructions

  # Show configuration instructions
  show_config_instructions "$CONFIG_PATH"

  # Show config snippet
  show_config_snippet

  # Show validation steps
  show_validation_steps

  # Final message
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✓ MCP Setup Guidance Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Follow the steps above to install MCPs, or skip if not needed."
  echo ""
  echo "Next steps:"
  echo "  1. Install MCPs (optional, can skip)"
  echo "  2. Configure Claude Code CLI (if installing MCPs)"
  echo "  3. Start building: /2l-mvp"
  echo ""
  echo "Remember: MCPs are optional! You can start building without them."
  echo ""

  exit 0
}

# Execute main function
main
```

---

## Troubleshooting

### Issue: "Config file not found"
**Symptoms:** Claude Code CLI MCP config doesn't exist
**Solution:**
- This is normal if you haven't configured MCPs before
- Create the file manually in your project directory: `touch .mcp.json`
- Add initial content: `echo '{"mcpServers": {}}' > .mcp.json`
- Then add MCP configurations as shown above

### Issue: "MCPs don't appear in Claude Code CLI"
**Symptoms:** MCPs not listed after configuration
**Solution:**
1. Verify JSON syntax is valid: Copy content to jsonlint.com
2. Check absolute paths are correct (no typos, no relative paths)
3. Ensure .mcp.json is in your project directory (use: ls -la .mcp.json)
4. Exit and restart Claude Code CLI session COMPLETELY (exit → claude code)
5. Verify Node.js is in PATH: `which node`
6. Test MCP servers manually: `node /path/to/playwright-mcp-server/index.js`

### Issue: "Node.js not found"
**Symptoms:** Error about missing node command
**Solution:**
- Install Node.js:
  - Ubuntu/Debian: `sudo apt install nodejs npm`
  - macOS: `brew install node`
  - Or download from: https://nodejs.org/
- Verify installation: `node --version`
- Ensure Node.js is in PATH: `which node`
- Restart terminal after installation

### Issue: "npm install fails"
**Symptoms:** Errors during npm install step
**Solution:**
- Check internet connection
- Clear npm cache: `npm cache clean --force`
- Try with verbose logging: `npm install --verbose`
- Update npm: `npm install -g npm@latest`
- Check for permission issues: May need sudo on some systems
- Try alternative registry: `npm install --registry https://registry.npmjs.org/`

### Issue: "Playwright MCP server won't start"
**Symptoms:** Error when testing `node index.js`
**Solution:**
- Check Node.js version: `node --version` (needs v16+)
- Install missing dependencies: `cd playwright-mcp-server && npm install`
- Check for port conflicts: `lsof -i :3000`
- Read error messages carefully (usually indicate missing dependencies)
- Check GitHub issues: https://github.com/executeautomation/playwright-mcp-server/issues

### Issue: "Chrome DevTools MCP not working"
**Symptoms:** Chrome DevTools features don't work in Claude
**Solution:**
- Verify Chrome/Chromium installed: `which google-chrome`
- Install Chrome if missing:
  - Ubuntu: `sudo apt install chromium-browser`
  - macOS: `brew install --cask google-chrome`
- Check npm package installed: `npm list -g @voxel51/chrome-devtools-mcp`
- Test with npx: `npx -y @voxel51/chrome-devtools-mcp`
- Verify Chrome is in PATH

### Issue: "JSON syntax error in config"
**Symptoms:** Claude Code CLI fails to parse config
**Solution:**
- Validate JSON at jsonlint.com
- Common mistakes:
  - Missing comma between entries
  - Trailing comma after last entry
  - Unescaped backslashes in paths (use forward slashes on macOS/Linux)
  - Single quotes instead of double quotes
- Example valid JSON:
  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "node",
        "args": ["/path/to/index.js"]
      }
    }
  }
  ```

### Issue: "Can skip MCPs but want them later"
**Symptoms:** Skipped MCPs initially, now want to add them
**Solution:**
- Run `/2l-setup-mcps` again anytime
- Follow the same instructions
- MCPs can be added at any point
- No impact on existing 2L setup
- Exit and restart Claude Code CLI session after adding new MCPs

### Issue: "Want to remove MCPs"
**Symptoms:** MCPs installed but want to remove them
**Solution:**
1. Open Claude Code CLI config: `code .mcp.json`
2. Remove MCP entries from `mcpServers` object
3. Save file
4. Exit and restart Claude Code CLI session
5. Optionally uninstall npm packages:
   - Playwright: Remove cloned directory
   - Chrome DevTools: `npm uninstall -g @voxel51/chrome-devtools-mcp`
