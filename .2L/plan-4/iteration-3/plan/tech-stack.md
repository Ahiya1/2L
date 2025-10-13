# Technology Stack

## Core Documentation Format
**Decision:** Markdown with YAML frontmatter metadata

**Rationale:**
- **Native 2L tool support:** Read tool natively supports markdown files, no parsing required
- **Grep-friendly:** Flat text structure enables fast keyword searching across all documentation
- **Human-readable:** Agents and developers can read raw files without special tooling
- **Syntax highlighting:** Code fences (```typescript, ```python) provide clear code blocks
- **Git-friendly:** Text format enables version control and diffing
- **No build step:** Files are directly consumable, no compilation or rendering needed
- **Cross-references:** Standard markdown links work for navigation between files

**Alternatives Considered:**
- **HTML:** Rejected - requires parsing, more tokens to process, harder for agents to extract information
- **JSON/YAML structured docs:** Rejected - less readable for code examples, requires schema definition
- **MDX (React-style):** Rejected - requires build step, unnecessary complexity for static docs
- **Plain text:** Rejected - no formatting, harder to distinguish code from prose

**Implementation Details:**
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
Brief description...

## Code Example
\`\`\`typescript
import { tool } from '@anthropic-ai/agent-sdk';
// ... complete working code
\`\`\`
```

## Web Documentation Harvesting
**Decision:** WebFetch tool for content extraction + manual synthesis

**Rationale:**
- **Already available:** WebFetch is built into 2L agent toolkit, no external dependencies
- **Sufficient for static content:** Official Agent SDK docs are static HTML pages, no JavaScript rendering required
- **Manual synthesis required:** Raw HTML must be reorganized into agent-friendly structure with cross-references
- **Quality control:** Manual organization ensures completeness and allows adding context

**Harvest Strategy:**
1. **Discovery phase:** Start at https://docs.claude.com/en/api/agent-sdk/, extract all navigation links
2. **Content extraction:** Fetch each discovered page, extract main content, code examples, warnings
3. **Categorization:** Organize content into TypeScript-specific, Python-specific, cross-language, and examples
4. **Synthesis:** Transform raw content into structured guides with cross-references

**Error Handling:**
- Network failures: Retry 3 times with exponential backoff
- 404 errors: Log missing page, continue with other pages
- Timeouts: 30-second limit per page
- HTML structure changes: Fail gracefully, provide manual fallback

**Alternatives Considered:**
- **Beautiful Soup (Python):** Rejected - requires external dependency, adds complexity
- **Puppeteer (headless browser):** Rejected - overkill for static docs, resource-heavy
- **Manual copy-paste:** Rejected - time-consuming, error-prone, not reproducible

## Documentation Storage
**Decision:** `~/.claude/docs/agent-sdk/` (global directory)

**Rationale:**
- **Vision requirement:** Explicitly specified in project requirements
- **Global accessibility:** All 2L agents across all projects can access documentation
- **Persistence:** Survives project deletion, serves as long-term reference
- **Standard location:** Follows existing `~/.claude/` pattern for agents, commands, lib

**Directory Structure:**
```
~/.claude/docs/agent-sdk/
├── overview.md                      # What Agent SDK is, when to use
├── quickstart.md                    # Installation, first agent
├── troubleshooting.md               # Common errors, solutions
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

**Access Pattern:**
- Agents use Read tool: `Read ~/.claude/docs/agent-sdk/typescript/custom-tools.md`
- Agents use Grep tool: `Grep "custom tool" ~/.claude/docs/agent-sdk/`
- No special permissions or authentication required

## TypeScript SDK Coverage
**Decision:** Complete TypeScript implementation documentation with 6 comprehensive guides

**SDK Version:** 1.2.0+ (latest stable at time of harvest)

**Package:** `@anthropic-ai/agent-sdk`

**Installation:**
```bash
npm install @anthropic-ai/agent-sdk zod
```

**TypeScript Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true
  }
}
```

**Coverage Areas:**

### 1. typescript/setup.md
- npm installation commands
- package.json dependencies (agent-sdk, zod, typescript, @types/node)
- tsconfig.json configuration
- Environment variable setup (ANTHROPIC_API_KEY)
- Import patterns and project structure

### 2. typescript/query-pattern.md
- Stateless query() function usage
- When to use query vs ClaudeSDKClient
- Query options and configuration
- Response structure and types
- Error handling patterns

### 3. typescript/client-pattern.md
- ClaudeSDKClient initialization
- Stateful conversation management
- Multi-turn interactions
- Session persistence
- Message history access
- Client lifecycle management

### 4. typescript/custom-tools.md
- Tool creation with Zod schemas
- Input schema definition and validation
- Handler async patterns
- Type safety with TypeScript
- Multiple tool registration
- Error handling in tools
- Best practices for tool naming and descriptions

### 5. typescript/options.md
- Complete Options interface documentation
- Required vs optional fields
- Permission configuration options
- Model selection
- Temperature and other parameters
- Hook configuration
- Default values and recommendations

### 6. typescript/streaming.md
- Async iterable pattern for streaming
- Chunk types and handling
- Backpressure management
- Error handling in streams
- When to use streaming vs single response

**Dependencies:**
- `@anthropic-ai/agent-sdk`: Core SDK
- `zod`: Schema validation (v3.22.0+)
- `typescript`: Type checking (v5.0.0+)
- `@types/node`: Node.js type definitions

## Conceptual Guides (Cross-Language)
**Decision:** 6 framework-agnostic conceptual guides

**Rationale:**
- Some concepts (permissions, MCP, hooks) transcend language choice
- Prevents content duplication between TypeScript and Python docs
- Helps agents understand WHEN to use features, not just HOW
- Provides decision-making framework for implementation

**Coverage:**

### 1. concepts/permissions.md
- All permission modes: read, write, execute, network, etc.
- When to use each mode
- Security implications and best practices
- Default permissions
- How to request minimal necessary permissions

### 2. concepts/mcp.md
- Model Context Protocol overview
- What MCP servers are and why use them
- Built-in MCP servers
- Custom MCP server integration
- Use cases: filesystem, database, API access

### 3. concepts/hooks.md
- Event handling in Agent SDK
- Pre-tool-use and post-tool-use hooks
- Interruption patterns
- Logging and monitoring via hooks
- Use cases: authentication, rate limiting, logging

### 4. concepts/tools.md
- Built-in tools overview (bash, filesystem, etc.)
- Custom tool patterns
- Tool naming conventions
- When to create custom vs use built-in
- Tool composition strategies

### 5. concepts/sessions.md
- State management in agents
- Conversation continuity across requests
- Session persistence strategies
- Memory vs stateless patterns
- Use cases for each approach

### 6. concepts/cost-tracking.md
- Token usage monitoring
- Cost calculation strategies
- Optimization techniques
- When to worry about costs
- Streaming vs single mode cost implications

## Working Examples Library
**Decision:** 5+ complete, copy-paste-ready example applications (TypeScript only for Iteration 1)

**Quality Standards:**
- Every example must be syntactically valid (can compile without errors)
- All imports and dependencies explicitly listed
- Includes package.json or dependency section
- Environment setup documented (API key handling)
- Expected output documented
- Comments explain key lines
- Error handling included

**Example Applications:**

### 1. examples/simple-cli-agent.md
- **Difficulty:** Beginner
- **Lines of code:** ~50
- **Features:** Basic CLI, 1-2 custom tools (e.g., file reading)
- **Use case:** Command-line tool that answers questions using custom capabilities
- **Dependencies:** @anthropic-ai/agent-sdk, zod

### 2. examples/web-api-agent.md
- **Difficulty:** Intermediate
- **Lines of code:** ~100
- **Features:** Express backend with agent endpoints
- **Use case:** REST API that exposes agent capabilities
- **Dependencies:** @anthropic-ai/agent-sdk, express, zod

### 3. examples/stateful-chatbot.md
- **Difficulty:** Intermediate
- **Lines of code:** ~150
- **Features:** ClaudeSDKClient with conversation memory
- **Use case:** Multi-turn chatbot with conversation continuity
- **Dependencies:** @anthropic-ai/agent-sdk, zod

### 4. examples/multi-tool-agent.md
- **Difficulty:** Advanced
- **Lines of code:** ~200
- **Features:** 5+ custom tools (file ops, API calls, calculations, etc.)
- **Use case:** Complex agent with diverse capabilities
- **Dependencies:** @anthropic-ai/agent-sdk, zod, axios

### 5. examples/mcp-server-agent.md
- **Difficulty:** Advanced
- **Lines of code:** ~250
- **Features:** Custom MCP server integration
- **Use case:** Agent with custom Model Context Protocol server
- **Dependencies:** @anthropic-ai/agent-sdk, @modelcontextprotocol/server, zod

## Code Validation Tools
**Decision:** TypeScript compiler (tsc) for syntax validation

**Validation Approach:**
```bash
# Extract code blocks from markdown
# Save to temporary .ts files
# Run TypeScript compiler in no-emit mode
tsc --noEmit example.ts

# Expected: Zero errors
```

**Validation Levels:**
- **Level 1 - Syntax validation (REQUIRED):** TypeScript compiler checks
- **Level 2 - Type checking (REQUIRED):** tsc --strict ensures type safety
- **Level 3 - Linting (OPTIONAL):** eslint for code style consistency
- **Level 4 - Execution testing (POST-MVP):** Actually run examples with API keys

**Why Syntax-Only for MVP:**
- Cannot execute examples without Agent SDK API keys during documentation phase
- Syntax validation catches 90% of errors (typos, import mistakes, missing brackets)
- Manual code review provides additional quality check
- Execution testing deferred to should-have features

**Alternatives Considered:**
- **Full execution testing:** Rejected for MVP - requires API keys, adds complexity
- **No validation:** Rejected - too risky, broken examples damage trust
- **Manual review only:** Rejected - insufficient, typos will slip through

## Agent System Integration
**Decision:** Minimal prompt updates (references only, <150 tokens total)

**2l-explorer.md Prompt Addition (<50 tokens):**
```
When vision mentions AI agents, assistants, or chatbots, note that Agent SDK
documentation is available at `~/.claude/docs/agent-sdk/overview.md` for
implementation guidance.
```

**Token Count:** ~35 tokens ✓

**Integration Method:**
- Add single paragraph to "Technical Requirements" or "When exploring" section
- No content duplication - just pointer to documentation location
- Strong directive language: "note that documentation is available"

**Why Minimal:**
- Token budget constraint (<150 total across all agent types)
- Trust agents to explore docs when needed
- Detailed guidance lives in documentation, not prompts
- Keeps agent prompts focused and lightweight

**Future Iterations:**
- Iteration 2: Update 2l-planner.md (<50 tokens)
- Iteration 3: Update 2l-builder.md (<50 tokens)
- Total final: <150 tokens across all 3 agent types

## Cross-Reference Format
**Decision:** Relative markdown links

**Pattern:**
```markdown
For permission configuration, see [Permissions Guide](../concepts/permissions.md).

Related topics:
- [Custom Tools](./custom-tools.md) - Creating custom tool functions
- [MCP Integration](../concepts/mcp.md) - Model Context Protocol servers
```

**Why Relative Paths:**
- Work in Git, filesystem, and markdown viewers
- Agents can follow links via Read tool
- Portable across systems (no hardcoded /home/user/ paths)
- Standard markdown convention

**Link Validation:**
- All links must resolve to existing files
- Validation required before iteration completion
- Simple script: check each referenced file exists

**Alternatives Considered:**
- **Absolute paths:** Rejected - not portable
- **Wiki-style [[links]]:** Rejected - non-standard, requires parser

## Performance Targets
- **File read time:** <50ms per file (local SSD access)
- **Grep search time:** <100ms across all 25 files
- **Documentation lookup (Read + Grep):** <30 seconds for agent to find relevant info
- **Code example syntax validation:** <5 seconds per example

## Security Considerations
- **API key handling:** Environment variables only (process.env.ANTHROPIC_API_KEY)
  - Never hardcode API keys in examples
  - Document export ANTHROPIC_API_KEY=your-key setup
- **Permission documentation:** Clear explanation of security implications for each mode
- **Tool execution:** Warning about arbitrary code execution in custom tools
- **MCP servers:** Note that custom MCP servers can access local filesystem

## Environment Variables
Required for Agent SDK examples:
- `ANTHROPIC_API_KEY`: API key for Claude access (get from Anthropic console)

Optional:
- `ANTHROPIC_BASE_URL`: Custom API endpoint (for proxy or enterprise setups)
- `ANTHROPIC_API_VERSION`: Specific API version (defaults to latest)

## Dependencies Overview
**Production Dependencies:**
- `@anthropic-ai/agent-sdk@^1.2.0` - Core Agent SDK
- `zod@^3.22.0` - Schema validation for custom tools

**Development Dependencies:**
- `typescript@^5.0.0` - TypeScript compiler
- `@types/node@^20.0.0` - Node.js type definitions
- `ts-node@^10.9.0` - TypeScript execution (for testing examples)

**Optional Dependencies (for examples):**
- `express@^4.18.0` - Web API example
- `axios@^1.6.0` - Multi-tool agent example
- `@modelcontextprotocol/server@^1.0.0` - MCP server example

## Version Management Strategy
**MVP Approach:** Single version with metadata

**Metadata in Each File:**
```yaml
---
agent_sdk_version: "1.2.0"
last_verified: "2025-10-13"
verified_with: "@anthropic-ai/agent-sdk@1.2.0"
---
```

**Update Process (Post-MVP):**
1. User runs `/2l-update-docs` command
2. Agent re-harvests from official docs
3. Compares against existing docs
4. Updates files with changes
5. Increments last_verified timestamp

**Multi-Version Support (Future):**
- Version subdirectories if needed: `v1/`, `v2/`
- Symlink `latest/` to current version
- Agents can specify version if needed

## Testing Strategy
**Validation Requirements:**
- ✅ All TypeScript code examples compile without errors
- ✅ All cross-references resolve to existing files
- ✅ All files are readable via Read tool
- ✅ Grep searches return relevant results
- ✅ No TODO or placeholder text in examples
- ✅ All imports and dependencies listed
- ✅ Environment setup documented

**Testing Tools:**
- TypeScript compiler (tsc --noEmit)
- Manual link checking (verify relative paths)
- Manual code review
- Test Read/Grep operations

**Post-MVP Testing:**
- Automated link validation script
- Execution testing for all examples
- CI/CD integration for continuous validation

---

**Technology Stack Status:** FINALIZED
**Ready for:** Builder Implementation
**Key Principle:** Simplicity over premature optimization - leverage existing tools, standard formats, minimal dependencies
