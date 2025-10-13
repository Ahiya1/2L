# Code Patterns & Conventions

## File Organization Patterns

### Directory Structure
```
~/.claude/docs/agent-sdk/
├── overview.md                      # Entry point: What Agent SDK is
├── quickstart.md                    # Getting started guide
├── troubleshooting.md               # Common errors and solutions
├── typescript/                      # TypeScript-specific guides
│   ├── setup.md
│   ├── query-pattern.md
│   ├── client-pattern.md
│   ├── custom-tools.md
│   ├── options.md
│   └── streaming.md
├── concepts/                        # Cross-language concepts
│   ├── permissions.md
│   ├── mcp.md
│   ├── hooks.md
│   ├── tools.md
│   ├── sessions.md
│   └── cost-tracking.md
└── examples/                        # Working examples
    ├── simple-cli-agent.md
    ├── web-api-agent.md
    ├── stateful-chatbot.md
    ├── multi-tool-agent.md
    └── mcp-server-agent.md
```

### File Naming Conventions
- **Markdown files:** lowercase with hyphens (`query-pattern.md`, not `QueryPattern.md`)
- **Directories:** lowercase singular (`typescript/`, not `TypeScript/` or `typescripts/`)
- **Examples:** descriptive names matching use case (`simple-cli-agent.md`, not `example1.md`)
- **Concepts:** topic name without suffix (`permissions.md`, not `permissions-concept.md`)

---

## Markdown Structure Pattern

### Standard Document Template
**When to use:** Every documentation file in ~/.claude/docs/agent-sdk/

**Code example:**
```markdown
---
title: "Custom Tools in TypeScript"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
language: "typescript"
difficulty: "intermediate"
related_guides:
  - query-pattern.md
  - ../concepts/tools.md
---

# Custom Tools in TypeScript

## Overview
Brief 2-3 sentence summary of what this guide covers.

## When to Use
Decision criteria for when to apply this pattern vs alternatives.

## Prerequisites
- Link to [Setup Guide](./setup.md)
- Link to related concepts

## Installation
```bash
npm install @anthropic-ai/agent-sdk zod
```

## Basic Pattern
Minimal working example that demonstrates core concept:

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Minimal example here
```

## Complete Example
Full-featured realistic code with all imports, error handling, comments:

```typescript
/**
 * Complete working example with all dependencies
 */
import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Full implementation here
```

## Advanced Patterns
Complex scenarios, edge cases, optimization techniques.

## Common Pitfalls
Things to avoid, common mistakes, and how to fix them.

## Troubleshooting
Specific errors and solutions related to this pattern.

## Related Documentation
- [Related Guide 1](./related.md)
- [Related Guide 2](../concepts/related.md)
```

**Key points:**
- H1 only once (document title)
- H2 for major sections
- H3 for subsections within H2
- YAML frontmatter for metadata (required)
- Consistent section ordering

---

## Code Example Conventions

### Complete TypeScript Example Pattern
**When to use:** Every TypeScript code block in examples/ and typescript/ guides

**Code example:**
```typescript
/**
 * Example: Read file contents with custom tool
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - zod@^3.22.0
 *
 * Install: npm install @anthropic-ai/agent-sdk zod
 *
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import fs from 'fs/promises';

// Define custom tool with Zod schema
const readFile = tool({
  name: 'read_file',
  description: 'Read contents of a file from the filesystem',
  input_schema: z.object({
    path: z.string().describe('File path to read'),
  }),
  handler: async (input) => {
    try {
      const content = await fs.readFile(input.path, 'utf-8');
      return content;
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  },
});

// Initialize client with custom tool
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  tools: [readFile],
});

// Use the agent
async function main() {
  try {
    const response = await client.query({
      prompt: 'Read the contents of package.json and summarize it',
    });
    console.log(response.text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();

/**
 * Expected output:
 * The agent will use the read_file tool to access package.json,
 * then provide a summary of the project dependencies and metadata.
 */
```

**Key points:**
- **Header comment block:** Dependencies, installation, setup
- **All imports explicit:** Never assume implicit imports
- **Environment setup documented:** How to get API key
- **Error handling included:** try/catch for all async operations
- **Comments explain key lines:** Especially non-obvious patterns
- **Expected output documented:** Help users verify it works
- **Must compile without errors:** Validated with `tsc --noEmit`

### Minimal Example Pattern
**When to use:** "Basic Pattern" sections to show core concept quickly

**Code example:**
```typescript
import { query } from '@anthropic-ai/agent-sdk';

const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY,
  prompt: 'Hello, what can you help me with?',
});

console.log(response.text);
```

**Key points:**
- Focus on essential code only
- Still include required imports
- Assume environment setup already done
- No extensive error handling (show in complete examples)

### Syntax Validation Pattern
**When to use:** Before marking any code example as complete

**Implementation:**
```bash
# For TypeScript examples
# 1. Extract code block from markdown
# 2. Save to temporary file
cat > /tmp/example.ts << 'EOF'
[paste code here]
EOF

# 3. Validate syntax
npx tsc --noEmit --strict /tmp/example.ts

# Expected: No errors
# If errors found: Fix code before documenting
```

**Key points:**
- All TypeScript examples must pass `tsc --noEmit`
- Use `--strict` flag to catch type issues
- Fix errors in source, don't disable checks
- Document if example intentionally incomplete

---

## Cross-Reference Patterns

### Relative Path Format
**When to use:** All links between documentation files

**Pattern:**
```markdown
<!-- Within same directory -->
See [Query Pattern](./query-pattern.md) for stateless usage.

<!-- To parent directory then subdirectory -->
For more details, see [Permissions Concept](../concepts/permissions.md).

<!-- To sibling directory -->
Check out the [Simple CLI Example](../examples/simple-cli-agent.md).

<!-- To root-level file from subdirectory -->
Start with the [Quickstart Guide](../quickstart.md).
```

**Key points:**
- Always use relative paths (never absolute like `/home/user/...`)
- Use `.md` extension explicitly
- Link text should be descriptive (not "click here")
- Test all links during validation phase

### Cross-Reference List Format
**When to use:** "Related Documentation" section at end of every guide

**Pattern:**
```markdown
## Related Documentation

**Core Concepts:**
- [Tools Overview](../concepts/tools.md) - Understanding custom tools
- [Permissions](../concepts/permissions.md) - Security considerations

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Query Pattern](./query-pattern.md) - Stateless queries

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic usage
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Complex tools
```

**Key points:**
- Group by category (Concepts, Implementation, Examples)
- Include brief description after each link
- Maximum 6-8 links (most relevant only)
- Order by relevance/learning progression

---

## Agent Discovery Patterns

### Keyword Trigger Pattern
**When to use:** Agent needs to discover relevant documentation

**Implementation in documentation:**
```markdown
# Custom Tools in TypeScript

Build **custom tools** for your **AI agent** to extend capabilities.
Common use cases: file operations, API integrations, database queries.

Keywords agents should recognize:
- "custom tool" → This guide
- "agent capabilities" → Tools overview
- "extend agent" → Custom tools
```

**Key points:**
- Use keywords naturally in content
- First paragraph should include primary search terms
- Agent uses Grep to search: `grep -r "custom tool" ~/.claude/docs/agent-sdk/`
- Filenames should match common search terms

### 2l-explorer.md Prompt Directive
**When to use:** Updating agent prompt to reference Agent SDK docs

**Code example:**
```markdown
## When Exploring Technical Requirements

When the vision mentions **AI agents**, **chatbots**, **Claude integration**,
or **intelligent assistants**, consult Agent SDK documentation at
`~/.claude/docs/agent-sdk/overview.md` for implementation guidance.
```

**Token count:** ~35 tokens ✓ (under 50-token limit)

**Key points:**
- Strong directive language ("consult", not "you may want to consider")
- Specific file path for Read tool
- Keywords that trigger recognition
- Minimal token usage (under budget)
- Placed in "When exploring" or "Technical Requirements" section

---

## Documentation Completeness Patterns

### Feature Coverage Checklist
**When to use:** Validating that all SDK features are documented

**Implementation:**
```markdown
## Agent SDK Feature Coverage Checklist

### Core Features
- [x] Installation and setup
- [x] Basic query pattern (stateless)
- [x] Client pattern (stateful)
- [x] Custom tool creation
- [x] Built-in tools overview
- [x] Streaming responses
- [x] Configuration options

### Advanced Features
- [x] MCP server integration
- [x] Permission system
- [x] Hooks (pre/post tool use)
- [x] Session management
- [x] Cost tracking
- [ ] Beta feature X (not yet stable)

### Language Support
- [x] TypeScript - Complete (6 guides)
- [ ] Python - Iteration 2 (planned)

### Examples
- [x] Simple CLI agent
- [x] Web API agent
- [x] Stateful chatbot
- [x] Multi-tool agent
- [x] MCP server agent
```

**Key points:**
- Track what's documented vs what exists in SDK
- Mark explicitly if feature not covered
- Document gaps in troubleshooting.md
- Update checklist as SDK evolves

### Gap Documentation Pattern
**When to use:** When SDK feature exists but not fully documented in Iteration 1

**Pattern in troubleshooting.md:**
```markdown
## Known Documentation Gaps

### Python SDK (Iteration 2)
Python implementation guides are planned for Iteration 2. For now:
- Use official docs: https://docs.claude.com/en/api/agent-sdk/
- TypeScript patterns generally translate to Python async patterns

### Experimental Features
The following features are marked experimental in the SDK:
- **MCP server hooks:** API may change in future versions
- **Advanced streaming:** Backpressure handling still evolving

Consult official documentation for latest status.
```

**Key points:**
- Be explicit about what's missing
- Provide fallback (official docs, alternative approach)
- Give timeline if available (Iteration 2)
- Mark experimental features clearly

---

## Quality Validation Patterns

### Link Validation Script
**When to use:** Before completing integration phase

**Implementation:**
```bash
#!/bin/bash
# validate-links.sh - Check all markdown links resolve

DOCS_DIR="$HOME/.claude/docs/agent-sdk"
ERRORS=0

echo "Validating documentation links..."

# Find all markdown files
find "$DOCS_DIR" -name "*.md" | while read -r file; do
  echo "Checking: $file"

  # Extract markdown links: [text](path)
  grep -oP '\[.*?\]\(\K[^)]+' "$file" | while read -r link; do
    # Skip external URLs
    if [[ "$link" =~ ^https?:// ]]; then
      continue
    fi

    # Resolve relative path
    dir=$(dirname "$file")
    target="$dir/$link"

    # Check if target exists
    if [ ! -f "$target" ]; then
      echo "  ERROR: Broken link to $link"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

if [ $ERRORS -eq 0 ]; then
  echo "✓ All links valid"
  exit 0
else
  echo "✗ Found $ERRORS broken links"
  exit 1
fi
```

**Key points:**
- Run before marking iteration complete
- Fix all broken links before integration
- Re-run after any file moves/renames
- Include in validation checklist

### Code Syntax Validation
**When to use:** For every code example before documenting

**Pattern:**
```bash
# TypeScript validation
find ~/.claude/docs/agent-sdk -name "*.md" -exec bash -c '
  # Extract typescript code blocks
  sed -n "/\`\`\`typescript/,/\`\`\`/p" "$1" |
  sed "1d;\$d" > /tmp/example.ts

  # Validate if code block found
  if [ -s /tmp/example.ts ]; then
    echo "Validating: $1"
    npx tsc --noEmit --strict /tmp/example.ts
  fi
' _ {} \;
```

**Key points:**
- Extract each code block to temporary file
- Use `tsc --noEmit` (don't generate JS)
- Use `--strict` to catch type issues
- Must pass for all TypeScript examples

---

## Frontmatter Metadata Pattern

### Standard Metadata Schema
**When to use:** Every documentation file

**Pattern:**
```yaml
---
title: "Descriptive Title in Title Case"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
language: "typescript"           # or "python", "cross-language"
difficulty: "beginner"            # or "intermediate", "advanced"
related_guides:
  - query-pattern.md
  - ../concepts/tools.md
tags:
  - custom-tools
  - zod-schema
  - async-handler
---
```

**Key points:**
- `title`: Human-readable, matches H1
- `last_updated`: YYYY-MM-DD format (ISO 8601)
- `sdk_version`: SDK version content was verified against
- `language`: Helps agents filter language-specific docs
- `difficulty`: Guides builder task complexity
- `related_guides`: Relative paths (same as markdown links)
- `tags`: Searchable keywords for Grep

---

## Web Harvesting Patterns

### Systematic Page Discovery
**When to use:** Initial documentation harvest from official site

**Implementation:**
```bash
# 1. Start with root URL
ROOT="https://docs.claude.com/en/api/agent-sdk/"

# 2. Fetch page
curl -s "$ROOT" > /tmp/page.html

# 3. Extract all navigation links
grep -oP 'href="/en/api/agent-sdk/\K[^"]+' /tmp/page.html |
  sort -u > /tmp/pages.txt

# 4. Fetch each discovered page
while read -r path; do
  echo "Fetching: $path"
  curl -s "https://docs.claude.com/en/api/agent-sdk/$path" \
    > "/tmp/harvest/$path.html"
  sleep 2  # Polite delay
done < /tmp/pages.txt
```

**Key points:**
- Start with documentation root page
- Extract all navigation links (sidebar, breadcrumbs)
- Follow each link to discover subpages
- Add polite delays (1-2 seconds) between requests
- Save with source URL metadata for future updates

### Content Extraction Pattern
**When to use:** Converting harvested HTML to markdown content

**Implementation:**
```bash
# Extract main content from HTML (simplified)
# Actual implementation depends on site structure

cat /tmp/harvest/page.html |
  # Remove script/style tags
  sed 's/<script[^>]*>.*<\/script>//g' |
  sed 's/<style[^>]*>.*<\/style>//g' |
  # Extract main content area
  sed -n '/<main/,/<\/main>/p' |
  # Strip HTML tags (basic)
  sed 's/<[^>]*>//g' |
  # Clean whitespace
  sed 's/^[[:space:]]*//;s/[[:space:]]*$//' |
  # Remove empty lines
  sed '/^$/d'
```

**Key points:**
- Focus on extracting main content only (not navigation, footer)
- Preserve code blocks separately
- Extract code language from HTML class attributes
- Note source URL in frontmatter for updates
- Manual review required (automated extraction not perfect)

---

## Import and Dependency Documentation

### Complete Dependency Block
**When to use:** Start of every complete example

**Pattern:**
```typescript
/**
 * Dependencies required:
 * - @anthropic-ai/agent-sdk@^1.2.0 - Core Agent SDK
 * - zod@^3.22.0 - Schema validation
 * - typescript@^5.0.0 - TypeScript compiler (devDependency)
 * - @types/node@^20.0.0 - Node.js types (devDependency)
 *
 * Installation:
 * npm install @anthropic-ai/agent-sdk zod
 * npm install -D typescript @types/node
 *
 * Environment setup:
 * export ANTHROPIC_API_KEY=your-api-key-here
 *
 * Get API key from: https://console.anthropic.com/
 */
```

**Key points:**
- List exact versions with caret ranges (`^1.2.0`)
- Separate production and development dependencies
- Include installation command (copy-paste ready)
- Document environment variables required
- Link to where to get credentials

### Import Statement Pattern
**When to use:** Every TypeScript code block

**Pattern:**
```typescript
// Core SDK imports (always first)
import { ClaudeSDKClient, query, tool } from '@anthropic-ai/agent-sdk';

// Third-party library imports (alphabetical)
import { z } from 'zod';
import axios from 'axios';

// Node.js built-in imports (last)
import fs from 'fs/promises';
import path from 'path';
```

**Key points:**
- Group imports by category
- Agent SDK imports first
- External libraries alphabetical
- Built-in modules last
- Explicit named imports (not `import * as`)

---

## Error Handling Pattern

### Standard Try-Catch Pattern
**When to use:** All async operations in examples

**Pattern:**
```typescript
async function processAgentRequest(prompt: string) {
  try {
    const response = await client.query({ prompt });
    return response.text;
  } catch (error) {
    // Type-safe error handling
    if (error instanceof Error) {
      console.error('Agent error:', error.message);

      // Check for specific error types
      if (error.message.includes('API key')) {
        throw new Error('Invalid or missing API key. Set ANTHROPIC_API_KEY environment variable.');
      }

      if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Wait before retrying.');
      }
    }

    // Re-throw for caller to handle
    throw error;
  }
}
```

**Key points:**
- Always wrap async Agent SDK calls in try-catch
- Type-guard errors: `error instanceof Error`
- Provide helpful error messages
- Check for common error patterns (auth, rate limit, network)
- Re-throw if can't handle at this level

---

## Documentation Update Pattern

### Version Metadata Tracking
**When to use:** Every file, for future update detection

**Pattern in frontmatter:**
```yaml
---
title: "Custom Tools"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
verified_with: "@anthropic-ai/agent-sdk@1.2.0"
source_url: "https://docs.claude.com/en/api/agent-sdk/custom-tools"
---
```

**Update process (future):**
```bash
# Future: Update script compares versions
if [ "$CURRENT_SDK_VERSION" != "$DOCUMENTED_VERSION" ]; then
  echo "Documentation outdated for: $file"
  echo "  Documented: $DOCUMENTED_VERSION"
  echo "  Current: $CURRENT_SDK_VERSION"
  echo "  Source: $SOURCE_URL"
  # Re-harvest and update
fi
```

**Key points:**
- Track SDK version used for verification
- Save source URL for re-harvesting
- Update timestamp on any content change
- Defer automatic updates to post-MVP

---

## Performance Optimization Patterns

### Efficient Agent Search
**When to use:** Agent needs to find relevant documentation quickly

**Pattern:**
```bash
# Bad: Read every file sequentially
for file in ~/.claude/docs/agent-sdk/**/*.md; do
  Read "$file"  # Slow
done

# Good: Use Grep to filter first
grep -l "custom tool" ~/.claude/docs/agent-sdk/**/*.md | head -3 |
while read -r file; do
  Read "$file"  # Only read relevant files
done
```

**Key points:**
- Use Grep to filter before Read
- Limit results (`head -3`) to most relevant
- Search in relevant subdirectory first
- Use specific keywords, not generic terms

---

## Security Documentation Pattern

### API Key Handling
**When to use:** Every example that uses Agent SDK

**Pattern in examples:**
```typescript
// ✓ Correct: Environment variable
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable required');
}

// ✗ Wrong: Hardcoded (NEVER DO THIS)
const apiKey = 'sk-ant-api03-...'  // NEVER hardcode keys
```

**Documentation:**
```markdown
## Security Best Practices

**API Key Management:**
1. Store API key in environment variable: `export ANTHROPIC_API_KEY=your-key`
2. Add `.env` files to `.gitignore` (never commit keys)
3. Use key rotation (regenerate keys periodically)
4. Minimum permissions (use API keys with least privilege)

**Permission Configuration:**
- Request minimum necessary permissions
- See [Permissions Guide](../concepts/permissions.md) for details
```

**Key points:**
- Never show actual API keys in examples
- Always use environment variables
- Document security implications
- Link to permissions guide

---

## Testing and Validation Checklist

### Pre-Completion Validation
**When to use:** Before marking builder task complete

**Checklist:**
```markdown
- [ ] All files created in correct directory structure
- [ ] All markdown files have YAML frontmatter
- [ ] All TypeScript examples compile (tsc --noEmit)
- [ ] All cross-references resolve to existing files
- [ ] No TODO or placeholder text remains
- [ ] All code examples include complete imports
- [ ] All examples document dependencies and setup
- [ ] Error handling included in complete examples
- [ ] Related documentation links present
- [ ] Keywords for agent discovery included
- [ ] Token count under budget (if updating agent prompts)
```

**Validation commands:**
```bash
# Check frontmatter exists
grep -L "^---" ~/.claude/docs/agent-sdk/**/*.md

# Check for TODOs
grep -r "TODO\|FIXME\|XXX" ~/.claude/docs/agent-sdk/

# Validate TypeScript syntax
# (see Code Syntax Validation pattern above)

# Check links
# (see Link Validation Script pattern above)
```

**Key points:**
- Run all validations before declaring complete
- Fix issues immediately (don't defer)
- Document any intentional exceptions
- Update checklist as patterns evolve

---

**Patterns Status:** COMPLETE
**Ready for:** Builder Task Implementation
**Remember:** These patterns are prescriptive - follow exactly for consistency across all documentation
