# Implementation Patterns for Iteration 2

## Overview

This iteration focuses on documentation and verification tooling. All patterns emphasize accuracy, clarity, and technical correctness by referencing actual implementation files from Iteration 1.

---

## Pattern 1: Slash Command Creation

### Standard Command File Structure

All command files in `/home/ahiya/.claude/commands/` follow this structure:

```markdown
# [Command Name] - [Brief Description]

[Opening paragraph explaining what the command does]

## Usage

\`\`\`bash
/command-name [args]
\`\`\`

[Usage details]

---

## What This Does

[Detailed explanation of functionality]

### [Section Name]
- [Feature/behavior details]

---

## [Additional Sections as needed]

---

## Implementation

\`\`\`bash
#!/bin/bash

[Bash implementation code]
\`\`\`
```

### Example: MCP Verification Command Pattern

**File:** `/home/ahiya/.claude/commands/2l-check-mcps.md`

**Structure:**
1. **Title and Description** - Clear one-liner explaining command purpose
2. **Usage Section** - Shows how to invoke the command
3. **What This Does** - Lists the 4 MCPs and explains output format
4. **MCP Details** - For each MCP (Playwright, Chrome DevTools, Supabase Local, Screenshot):
   - Name and purpose
   - Status indicator format
   - Setup link to official documentation
   - What it enables (use cases)
5. **Important Notes** - Clarify ALL MCPs are optional
6. **Implementation** - Bash script that displays formatted information

**Key Principles:**
- Use emoji indicators for visual clarity (✓, ⚠️, 🔍)
- Use box-drawing characters for section separators (`━━━━━━`)
- Provide actionable next steps
- Clear messaging about optional vs required
- Fast execution (information display, no API calls)

**Output Format Convention:**
```
🔍 2L MCP Connection Status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MCP Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 All MCPs are OPTIONAL - 2L works without them!

[MCP details for each of 4 MCPs]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setup Instructions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Clear setup steps]
```

---

## Pattern 2: README Documentation Structure

### Section Template

All README sections follow this pattern:

```markdown
## [Section Title]

[Opening paragraph explaining the section]

### [Subsection Title]

[Content with examples, code blocks, and explanations]

**[Bold callouts for important information]**

\`\`\`[language]
[Code examples]
\`\`\`

[Additional explanatory text]
```

### Required Sections for Iteration 2 README

The README must have exactly these 8 sections in this order:

#### 1. Overview & Quick Start
**Purpose:** Introduce 2L and show immediate value

**Content:**
- What is 2L orchestration
- Core workflow: `/2l-vision` → `/2l-plan` → `/2l-mvp`
- Quick example showing input and output
- Target audience (who should use 2L)

**Code examples:** Basic command usage

#### 2. Event System Architecture
**Purpose:** Document iteration 1's event system implementation

**Content:**
- Why events? (observability, debugging, non-blocking)
- Event flow diagram (text-based: orchestrator → events.jsonl ← agents → dashboard)
- 8 event types (from validation report): plan_start, iteration_start, phase_change, complexity_decision, agent_start, agent_complete, validation_result, iteration_complete
- Event format schema: `{timestamp, event_type, phase, agent_id, data}`
- Event file location: `.2L/events.jsonl`
- JSONL format explanation (one JSON object per line)
- Orchestrator emission points: 28 documented calls
- Agent emissions: agent_start + agent_complete (all 10 agents)

**Source files to reference:**
- `/home/ahiya/Ahiya/2L/.2L/plan-2/iteration-1/validation/validation-report.md` (lines 232-273 for event format)
- `/home/ahiya/.claude/commands/2l-mvp.md` (orchestrator implementation)

**Code examples:**
```json
{
  "timestamp": "2025-10-08T18:00:00Z",
  "event_type": "plan_start",
  "phase": "initialization",
  "agent_id": "orchestrator",
  "data": "Plan test-plan started in MASTER mode"
}
```

#### 3. Dashboard Access
**Purpose:** Explain how to use the dashboard from iteration 1

**Content:**
- `/2l-dashboard` command usage
- Why HTTP server? (browser CORS restrictions prevent file:// polling)
- Port allocation logic (8080-8099 range, dynamic allocation)
- Port reuse (checks `.2L/dashboard/.server-port` and `.server-pid`)
- Multi-project support (20 concurrent dashboards, each on unique port)
- `/2l-dashboard-stop` command for cleanup
- Dashboard features: real-time timeline, active agents, metrics, phase visualization

**Source files to reference:**
- `/home/ahiya/.claude/commands/2l-dashboard.md` (full implementation)
- `/home/ahiya/.claude/commands/2l-dashboard-stop.md`

**Code examples:**
```bash
# Start dashboard
/2l-dashboard
# Output: Opens browser to http://localhost:8080/dashboard/index.html

# Stop dashboard
/2l-dashboard-stop
# Output: Kills server process, removes state files
```

#### 4. MCP Integration
**Purpose:** Document optional MCPs and their capabilities

**Content:**
- 4 MCPs available: Playwright, Chrome DevTools, Supabase Local, Screenshot
- What each MCP enables (specific use cases)
- ALL are optional (emphasize - 2L core works without them)
- Setup instructions (links to official repos)
- `/2l-check-mcps` command for verification
- How to configure in `claude_desktop_config.json`

**Source files to reference:**
- `/home/ahiya/.claude/agents/2l-builder.md` (lines 16-60 for MCP documentation patterns)
- `/home/ahiya/.claude/commands/2l-check-mcps.md` (created in this iteration)

**Code examples:**
```bash
# Check MCP status
/2l-check-mcps
# Shows status and setup links for all 4 MCPs
```

#### 5. GitHub Integration
**Purpose:** Explain gh CLI workflow (not GitHub MCP)

**Content:**
- Why `gh` CLI? (reliability, simplicity, graceful degradation)
- Setup steps: install + authenticate
  - Ubuntu/Debian: `sudo apt install gh`
  - macOS: `brew install gh`
  - Authenticate: `gh auth login`
- Verify: `gh auth status`
- What gets pushed automatically:
  - Repository creation (uses project directory name)
  - Commits after each iteration
  - Tags: `2l-plan-{X}-iter-{Y}`
- Graceful degradation (works without gh, shows warning)
- Commit format example

**Source files to reference:**
- `/home/ahiya/.claude/commands/2l-mvp.md` (lines 1512-1592 for `setup_github_repo()` and `push_to_github()` functions)

**Code examples:**
```bash
# Setup GitHub CLI
gh auth login

# Verify authentication
gh auth status
# Output: ✓ Logged in to github.com

# 2L automatically creates repo and pushes
/2l-mvp "Build my app"
# Creates repo named after project directory
# Pushes commits with tag: 2l-plan-1-iter-1
```

#### 6. Setup Verification
**Purpose:** Provide checklist for new developers

**Content:**
- Prerequisites:
  - Python 3 (for dashboard HTTP server)
  - Git (for version control)
  - gh CLI (optional, for GitHub integration)
- Verification steps:
  1. Run `/2l-check-mcps` to see MCP status
  2. Check `gh auth status` (optional)
  3. Test orchestration with simple task
  4. Open dashboard to verify event system
- Expected outcomes for each step

**Code examples:**
```bash
# 1. Check MCPs (optional)
/2l-check-mcps

# 2. Check GitHub CLI (optional)
gh auth status

# 3. Test orchestration
/2l-mvp "Create a simple hello world app"

# 4. Open dashboard
/2l-dashboard
# Should see events appearing in real-time
```

#### 7. Troubleshooting
**Purpose:** Help users resolve common issues

**Content:**
- **Dashboard shows no events**
  - Check: Does `.2L/events.jsonl` exist?
  - Solution: Run an orchestration to generate events

- **MCP connection issues**
  - Check: MCPs configured in `claude_desktop_config.json`
  - Solution: Restart Claude Desktop after config changes

- **GitHub push failures**
  - Check: `gh auth status` shows authenticated
  - Check: Network connection working
  - Solution: Re-authenticate with `gh auth login`

- **Port conflicts (dashboard)**
  - Check: All ports 8080-8099 in use
  - Solution: Run `/2l-dashboard-stop` in another project
  - Check: `lsof -i :8080-8099`

- **Agent doesn't emit events**
  - Check: Event logger library exists at `~/.claude/lib/2l-event-logger.sh`
  - Expected: Graceful degradation (works without events)

**Code examples:**
```bash
# Troubleshoot dashboard
ls -la .2L/events.jsonl
# If missing: No events have been generated yet

# Check dashboard ports
lsof -i :8080-8099
# Shows all dashboard servers running

# Stop a dashboard
cd /path/to/other/project
/2l-dashboard-stop
```

#### 8. Architecture Decisions
**Purpose:** Explain design rationale for technical decisions

**Content:**
- **Why JSONL for events?**
  - Append-only format (no file locking)
  - Streaming-friendly (parse line by line)
  - Human-readable and tool-friendly

- **Why `gh` CLI instead of GitHub MCP?**
  - Simpler dependency (standard tool)
  - More reliable (no MCP server process)
  - Graceful degradation
  - Consistent behavior across platforms

- **Why polling for dashboard?**
  - Simplicity (no WebSocket server needed)
  - Cross-platform (works everywhere)
  - Low overhead (2-second interval)

- **Why HTTP server for dashboard?**
  - Browser security (CORS blocks file:// protocol from fetching files)
  - Modern web standards require HTTP for fetch API
  - Localhost-only binding (secure)

**No code examples needed** - explanatory text only

### Cross-Referencing Pattern

When referencing other sections or commands:

```markdown
See the [Event System Architecture](#event-system-architecture) section for details.

Use the `/2l-check-mcps` command to verify MCP status.

For troubleshooting, refer to the [Troubleshooting](#troubleshooting) section below.
```

**Anchor format:** `#lowercase-with-hyphens`

### Code Block Conventions

```markdown
# Bash commands
\`\`\`bash
command --with-args
\`\`\`

# YAML configuration
\`\`\`yaml
key: value
nested:
  key: value
\`\`\`

# JSON data
\`\`\`json
{
  "key": "value"
}
\`\`\`

# Markdown examples
\`\`\`markdown
## Section Title
Content here
\`\`\`
```

---

## Pattern 3: Technical Accuracy Standards

### Verification Method

**Rule:** Never invent features or behavior. Always quote from actual implementation files.

**Process:**
1. **Read source files** - Use Read tool to access actual implementation
2. **Quote directly** - Copy exact function names, commands, file paths
3. **Test commands** - Verify bash commands work before documenting
4. **Reference line numbers** - Use `file:line` format for specificity

**Example - GOOD:**
```markdown
The orchestrator emits 28 `log_2l_event` calls (verified in `/home/ahiya/.claude/commands/2l-mvp.md`).

Event format (from validation report line 262):
{
  "timestamp": "2025-10-08T18:00:00Z",
  "event_type": "plan_start",
  ...
}
```

**Example - BAD:**
```markdown
The orchestrator emits many events throughout the workflow.

Events look something like: {timestamp, type, data, ...}
```

### Source Files to Reference

**For Event System documentation:**
- `/home/ahiya/Ahiya/2L/.2L/plan-2/iteration-1/validation/validation-report.md` (complete validation details)
- `/home/ahiya/.claude/commands/2l-mvp.md` (orchestrator implementation)
- `/home/ahiya/.claude/agents/2l-builder.md` (example agent with Event Emission section)

**For Dashboard documentation:**
- `/home/ahiya/.claude/commands/2l-dashboard.md` (dashboard command implementation)
- `/home/ahiya/.claude/commands/2l-dashboard-stop.md` (stop command)

**For GitHub integration:**
- `/home/ahiya/.claude/commands/2l-mvp.md` lines 1512-1592 (`setup_github_repo()` and `push_to_github()` functions)

**For MCP documentation:**
- `/home/ahiya/.claude/agents/2l-builder.md` lines 16-60 (MCP capability descriptions)

### Quoting Convention

When documenting actual code behavior:

```markdown
**Function:** `setup_github_repo(plan_id, plan_dir, project_name=None)`
**Location:** `/home/ahiya/.claude/commands/2l-mvp.md:1515`

**Behavior (verified):**
1. Checks `gh --version` (line 1520)
2. Checks `gh auth status` (line 1527)
3. Detects existing remote with `git remote get-url origin` (line 1534)
4. Creates repo: `gh repo create {repo_name} --public --source=. --remote=origin` (line 1560)
```

---

## Pattern 4: Setup Instructions Clarity

### Standards for Step-by-Step Instructions

**Format:**
```markdown
1. **[Action]:** [Clear command or step]
   ```bash
   command-to-run
   ```
   **Expected output:**
   ```
   [What user should see]
   ```

2. **[Next action]:** [Description]
   [Additional details]
```

**Example:**
```markdown
### GitHub CLI Setup

1. **Install GitHub CLI:**
   ```bash
   # Ubuntu/Debian
   sudo apt install gh

   # macOS
   brew install gh
   ```

2. **Authenticate:**
   ```bash
   gh auth login
   ```
   **Expected output:**
   ```
   ? What account do you want to log into? GitHub.com
   ? What is your preferred protocol for Git operations? HTTPS
   ? Authenticate Git with your GitHub credentials? Yes
   ? How would you like to authenticate GitHub CLI? Login with a web browser
   ```

3. **Verify authentication:**
   ```bash
   gh auth status
   ```
   **Expected output:**
   ```
   github.com
     ✓ Logged in to github.com as username
   ```
```

### Troubleshooting for Each Step

Every setup instruction should include troubleshooting:

```markdown
**If installation fails:**
- Ubuntu/Debian: Run `sudo apt update` first
- macOS: Ensure Homebrew installed: `brew --version`
- Alternative: Download from https://cli.github.com/

**If authentication fails:**
- Check network connection
- Try again with `gh auth login --web`
- Verify browser opens authentication page
```

---

## Pattern 5: MCP Documentation Pattern

### MCP Entry Template

For each MCP in `/2l-check-mcps` command and README:

```markdown
### [N]. [MCP Name] ([Primary Use Case])
**Purpose:** [What problem it solves]

**Capabilities:**
- [Capability 1]
- [Capability 2]
- [Capability 3]

**Setup:**
1. Configure in `claude_desktop_config.json`
2. Add MCP server configuration
3. Restart Claude Desktop

**Setup link:** [Official GitHub repository URL]

**What it enables:**
- [Use case 1]: [Example]
- [Use case 2]: [Example]
- [Use case 3]: [Example]

**Status:** ⚠️ Optional - 2L works without this MCP
```

### Four MCPs to Document

1. **Playwright MCP** (Browser Automation)
   - Purpose: E2E testing, user flow validation
   - Setup: https://github.com/executeautomation/playwright-mcp-server
   - Enables: Frontend testing, form automation, navigation checks

2. **Chrome DevTools MCP** (Performance Profiling)
   - Purpose: Performance analysis, debugging
   - Setup: https://github.com/MCP-Servers/chrome-devtools (verify actual URL)
   - Enables: Performance traces, network analysis, screenshots

3. **Supabase Local MCP** (Database Validation)
   - Purpose: PostgreSQL schema validation, SQL queries
   - Setup: https://github.com/MCP-Servers/supabase-local (verify actual URL)
   - Enables: Database testing, schema verification

4. **Screenshot MCP** (Visual Capture)
   - Purpose: Screenshot capture for documentation
   - Setup: [Research actual repository URL]
   - Enables: Visual documentation during orchestration

**Critical messaging:** All sections must emphasize "OPTIONAL - 2L core functionality works without MCPs"

---

## Code Style Conventions

### Bash Scripts

```bash
#!/bin/bash

# Clear comments for sections
# -------------------------

# Variable naming: SCREAMING_SNAKE_CASE for constants
DASHBOARD_PORT=8080
CONFIG_FILE=".2L/config.yaml"

# Variable naming: snake_case for variables
server_pid=$!
port_found=false

# Always quote variables
echo "$DASHBOARD_PORT"
echo "${server_pid}"

# File existence checks before operations
if [ -f "$CONFIG_FILE" ]; then
  # Safe to read
fi

# Process checks before kill operations
if ps -p "$server_pid" > /dev/null 2>&1; then
  # Process exists
fi
```

### Markdown

```markdown
# Top-level headings for major sections

## Second-level for subsections

### Third-level for details

**Bold for emphasis and important callouts**

*Italics for minor emphasis*

`inline code` for commands, filenames, variables

\`\`\`language
code blocks with language specified
\`\`\`

- Bullet lists for features
- Use consistent list formatting

1. Numbered lists for sequential steps
2. Clear action items
```

### JSON/JSONL

```json
{
  "timestamp": "2025-10-08T18:00:00Z",
  "event_type": "plan_start",
  "phase": "initialization",
  "agent_id": "orchestrator",
  "data": "Plan test-plan started in MASTER mode"
}
```

**JSONL format:** One JSON object per line, no comma separation

```jsonl
{"timestamp": "2025-10-08T18:00:00Z", "event_type": "plan_start", "phase": "initialization", "agent_id": "orchestrator", "data": "..."}
{"timestamp": "2025-10-08T18:00:15Z", "event_type": "phase_change", "phase": "exploration", "agent_id": "orchestrator", "data": "..."}
```

---

## Testing Standards

### Documentation Testing Checklist

Before marking documentation complete:

- [ ] All bash commands tested and verified working
- [ ] All file paths verified to exist
- [ ] All code examples are copy-pasteable and functional
- [ ] All cross-references point to correct sections
- [ ] All external links open successfully
- [ ] All event types match iteration 1 implementation
- [ ] All function names quoted correctly from source files

### Command Testing

For `/2l-check-mcps` command:

```bash
# Test file creation
ls -lh /home/ahiya/.claude/commands/2l-check-mcps.md

# Test file is readable
cat /home/ahiya/.claude/commands/2l-check-mcps.md | head -20

# Verify structure
grep "## " /home/ahiya/.claude/commands/2l-check-mcps.md
```

### README Testing

```bash
# Verify file created
ls -lh /home/ahiya/Ahiya/2L/README.md

# Verify all 8 sections present
grep "^## " /home/ahiya/Ahiya/2L/README.md

# Expected output:
# ## Overview & Quick Start
# ## Event System Architecture
# ## Dashboard Access
# ## MCP Integration
# ## GitHub Integration
# ## Setup Verification
# ## Troubleshooting
# ## Architecture Decisions
```

---

## Common Pitfalls to Avoid

### Don't Invent Event Types
❌ **Wrong:** "Events include: plan_start, task_begin, work_complete, ..."
✅ **Right:** "8 event types (from iteration 1): plan_start, iteration_start, phase_change, complexity_decision, agent_start, agent_complete, validation_result, iteration_complete"

### Don't Make MCPs Sound Required
❌ **Wrong:** "Install these MCPs to use 2L: ..."
✅ **Right:** "All MCPs are OPTIONAL. 2L core functionality works without them. MCPs enhance agent capabilities during orchestration."

### Don't Skip Command Testing
❌ **Wrong:** "Run `gh auth login` to authenticate"
✅ **Right:** Test the command yourself first, then document the exact output users will see

### Don't Use Generic Documentation
❌ **Wrong:** "The dashboard displays orchestration information"
✅ **Right:** "The dashboard displays: (1) real-time event timeline polling `.2L/events.jsonl` every 2 seconds, (2) active agent tracking with duration calculation, (3) orchestration metrics, (4) phase visualization"

### Don't Break Cross-References
❌ **Wrong:** `[See above](#events)` (anchor doesn't exist)
✅ **Right:** `[Event System Architecture](#event-system-architecture)` (matches actual heading)

---

## Definition of Done

Documentation is complete when:

- [ ] `/2l-check-mcps` command file created at correct path
- [ ] README.md created with all 8 required sections
- [ ] All commands tested and verified working
- [ ] All file paths verified to exist
- [ ] All code examples are accurate and functional
- [ ] All event types match iteration 1 implementation exactly
- [ ] All function references quote actual source code
- [ ] Cross-references between documents validated
- [ ] Technical accuracy spot-checked against source files
- [ ] No invented features or non-existent behavior documented
