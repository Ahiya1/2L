# Builder Task Breakdown

## Overview
**Total Builders:** 3 primary builders working in parallel (after foundation)
**Total Estimated Time:** 9-11 hours
**Approach:** Sequential foundation builder, then parallel specialized builders

**Builder Assignment Strategy:**
- Builder 1 establishes foundation (directory structure, core files) - MUST complete first
- Builders 2 and 3 work fully in parallel after Builder 1 completes
- Builder 3 has potential to split into Builder 3A (concepts) and 3B (examples) if complexity is too high

---

## Builder-1: Foundation & Core Documentation

### Scope
Establish the complete directory structure, perform web documentation harvest from official Agent SDK site, and create the three core entry-point documentation files (overview.md, quickstart.md, troubleshooting.md). This builder creates the foundation that enables all other builders to work in parallel.

### Complexity Estimate
**HIGH**

**Rationale:**
- External dependency on official documentation site (unknown structure, potential for incomplete data)
- Web harvesting requires systematic page discovery and content extraction
- Foundation for all other builders - any gaps will block downstream work
- Content synthesis required (not just copying, but organizing for agent consumption)
- Time-intensive: 3-4 hours total

### Success Criteria
- [ ] Directory structure created at `~/.claude/docs/agent-sdk/` with subdirectories: `typescript/`, `python/`, `concepts/`, `examples/`
- [ ] Web documentation harvest complete from https://docs.claude.com/en/api/agent-sdk/ (all pages discovered and fetched)
- [ ] `overview.md` written: What Agent SDK is, when to use it, core concepts (2-3 pages, ~800-1200 words)
- [ ] `quickstart.md` written: Installation, first agent example, basic patterns (~1000-1500 words with code examples)
- [ ] `troubleshooting.md` written: Common errors and solutions (10-15 scenarios documented)
- [ ] All code examples in these files are syntactically valid (compile without errors)
- [ ] Metadata (YAML frontmatter) present in all three files
- [ ] Cross-references to upcoming files documented (even if files don't exist yet)
- [ ] Raw harvested content organized into categories: TypeScript-specific, Python-specific, Cross-language, Examples

### Files to Create
**Directory Structure:**
- `~/.claude/docs/agent-sdk/` (root directory)
- `~/.claude/docs/agent-sdk/typescript/` (empty, ready for Builder 2)
- `~/.claude/docs/agent-sdk/concepts/` (empty, ready for Builder 3)
- `~/.claude/docs/agent-sdk/examples/` (empty, ready for Builder 3)

**Documentation Files:**
- `~/.claude/docs/agent-sdk/overview.md` - What Agent SDK is, when to use it, architecture overview
- `~/.claude/docs/agent-sdk/quickstart.md` - Installation guide, first agent, basic examples
- `~/.claude/docs/agent-sdk/troubleshooting.md` - Common errors, symptoms, causes, solutions

**Temporary Harvest Files (for Builder 2/3 reference):**
- `/tmp/agent-sdk-harvest/pages-list.txt` - List of all discovered pages
- `/tmp/agent-sdk-harvest/typescript-content.txt` - TypeScript-specific content
- `/tmp/agent-sdk-harvest/python-content.txt` - Python-specific content
- `/tmp/agent-sdk-harvest/concepts-content.txt` - Cross-language concepts
- `/tmp/agent-sdk-harvest/examples-content.txt` - Example implementations

### Dependencies
**Depends on:** None (foundation builder)

**Blocks:** Builder 2 and Builder 3 (must complete directory structure before they start)

**External Dependencies:**
- https://docs.claude.com/en/api/agent-sdk/ must be accessible
- WebFetch tool must be operational

### Implementation Notes

**Web Harvesting Strategy:**
1. **Discovery Phase (30-45 minutes):**
   - Start at root: https://docs.claude.com/en/api/agent-sdk/
   - Extract all navigation links (sidebar, breadcrumbs, in-content links)
   - Build comprehensive URL list (expect 15-25 pages)
   - Save list to /tmp/agent-sdk-harvest/pages-list.txt

2. **Fetching Phase (45-60 minutes):**
   - Fetch each discovered page using WebFetch tool
   - Add 1-2 second delay between requests (be polite)
   - Save raw HTML with source URL metadata
   - Handle errors gracefully (404s, timeouts, network issues)
   - Retry failed pages up to 3 times

3. **Content Extraction Phase (60-90 minutes):**
   - Extract main content from HTML (skip navigation, footer, ads)
   - Identify and preserve code blocks separately
   - Categorize content:
     - TypeScript-specific: SDK setup, TS syntax, type definitions
     - Python-specific: Python syntax, async patterns
     - Cross-language: Concepts like permissions, MCP, hooks
     - Examples: Complete application implementations
   - Save categorized content to temporary files for Builder 2/3

4. **Core File Writing Phase (45-60 minutes):**
   - Synthesize overview.md from harvested introduction/architecture content
   - Write quickstart.md combining installation + basic examples
   - Create troubleshooting.md from error messages, common issues, solutions
   - Add YAML frontmatter metadata to each file
   - Validate syntax of all code examples

**Key Content for overview.md:**
- What is Agent SDK? (2-3 paragraph introduction)
- When to use Agent SDK vs raw API (decision criteria)
- Core concepts: tools, permissions, MCP, hooks, sessions
- Architecture overview (stateless query vs stateful client)
- Quick comparison: TypeScript vs Python support
- Link to quickstart.md for getting started

**Key Content for quickstart.md:**
- Installation: `npm install @anthropic-ai/agent-sdk zod`
- Environment setup: `export ANTHROPIC_API_KEY=your-key`
- First agent: Simple query example (~20 lines)
- Adding custom tool: File reading example (~40 lines)
- Next steps: Links to detailed guides

**Key Content for troubleshooting.md:**
- Authentication errors (missing/invalid API key)
- Permission errors (tool execution blocked)
- Import errors (missing dependencies)
- Type errors (TypeScript configuration issues)
- Rate limiting (API quota exceeded)
- Network timeouts
- MCP server connection issues
- Context overflow (too many tokens)
- Version mismatches (SDK vs API version)
- Known gaps (Python documentation coming in Iteration 2)

**Gotchas to Avoid:**
- Don't copy official docs verbatim (synthesize for agent consumption)
- Don't skip error handling in code examples
- Don't hardcode API keys (always use environment variables)
- Don't leave placeholder text (TODO, FIXME, [FILL IN])
- Don't create broken cross-references (link to files Builder 2/3 will create)

### Patterns to Follow
Reference patterns from `patterns.md`:
- **Markdown Structure Pattern:** Use standard document template for all three files
- **Code Example Conventions:** Complete TypeScript example pattern with all imports
- **Frontmatter Metadata Pattern:** Standard metadata schema in YAML frontmatter
- **Web Harvesting Patterns:** Systematic page discovery and content extraction
- **Cross-Reference Format:** Relative markdown links (even to future files)
- **Syntax Validation Pattern:** Run `tsc --noEmit` on all TypeScript examples

### Testing Requirements
- **Manual code review:** All code examples reviewed for completeness
- **Syntax validation:** All TypeScript examples compile without errors
- **Link validation:** Cross-references use correct relative paths (to future files)
- **Content completeness:** All major Agent SDK concepts covered in overview
- **Harvest verification:** Compare harvested pages against official site navigation

### Potential Split Strategy
**If complexity proves too high**, consider splitting into:

**Foundation (Builder 1 - primary):** Complete before any split
- Create directory structure
- Perform web harvest
- Organize harvested content into categories
- **Estimate:** 2-2.5 hours

**Sub-builder 1A: Core Documentation Writer**
- Write overview.md using harvested content
- Write quickstart.md with validated examples
- **Estimate:** 1-1.5 hours

**Sub-builder 1B: Troubleshooting Writer**
- Write troubleshooting.md from harvested error messages
- Add common issues from community knowledge
- **Estimate:** 45-60 minutes

**IMPORTANT:** Only split if Builder 1 estimates >4 hours after starting. Prefer single builder for consistency.

---

## Builder-2: TypeScript Implementation Guides

### Scope
Create comprehensive TypeScript-specific implementation guides covering all major SDK patterns. Extract and validate all TypeScript code examples from harvested documentation. Ensure every guide follows the standard structure and includes working, copy-paste-ready code.

### Complexity Estimate
**HIGH**

**Rationale:**
- 6 complete implementation guides (setup, query-pattern, client-pattern, custom-tools, options, streaming)
- Each guide requires 30-45 minutes of focused writing
- All code examples must be syntactically valid (requires validation)
- Cross-references to concepts/ (written by Builder 3 in parallel)
- High quality bar: Examples must be production-ready, not toy examples

### Success Criteria
- [ ] All 6 TypeScript guides written and complete:
  - [ ] `typescript/setup.md` - Installation, configuration, project structure
  - [ ] `typescript/query-pattern.md` - Stateless query() function usage
  - [ ] `typescript/client-pattern.md` - ClaudeSDKClient for stateful conversations
  - [ ] `typescript/custom-tools.md` - Creating custom tools with Zod schemas
  - [ ] `typescript/options.md` - Complete Options interface reference
  - [ ] `typescript/streaming.md` - Async iterable streaming pattern
- [ ] Every guide follows standard markdown structure (Overview → Prerequisites → Basic Pattern → Complete Example → Advanced Patterns → Troubleshooting → Related Documentation)
- [ ] All code examples compile without errors (validated with `tsc --noEmit`)
- [ ] All code examples include complete imports and dependency information
- [ ] Cross-references to concepts/ guides included (e.g., custom-tools.md links to concepts/tools.md)
- [ ] YAML frontmatter metadata present in all files
- [ ] Each guide includes at least one complete example (50+ lines with error handling)
- [ ] Common pitfalls and gotchas documented for each pattern

### Files to Create
- `~/.claude/docs/agent-sdk/typescript/setup.md` - TypeScript project setup
- `~/.claude/docs/agent-sdk/typescript/query-pattern.md` - Stateless query usage
- `~/.claude/docs/agent-sdk/typescript/client-pattern.md` - Stateful client usage
- `~/.claude/docs/agent-sdk/typescript/custom-tools.md` - Custom tool creation
- `~/.claude/docs/agent-sdk/typescript/options.md` - Configuration options
- `~/.claude/docs/agent-sdk/typescript/streaming.md` - Streaming responses

### Dependencies
**Depends on:** Builder 1 (directory structure must exist, harvested TypeScript content available)

**Blocks:** None (fully parallel with Builder 3)

**Works with:** Builder 3 (coordinate on cross-references to concepts/)

### Implementation Notes

**Content Strategy:**
1. Use harvested TypeScript content from `/tmp/agent-sdk-harvest/typescript-content.txt`
2. Organize by pattern type (query vs client, tools, streaming)
3. Extract code examples from official docs (ensures they're correct)
4. Enhance examples with:
   - Complete imports
   - Error handling
   - Comments explaining key lines
   - Expected output documentation
5. Add "When to use" decision criteria for each pattern
6. Include troubleshooting section specific to each pattern

**Guide-by-Guide Breakdown:**

**setup.md (30-40 minutes):**
- Installation: `npm install @anthropic-ai/agent-sdk zod`
- package.json example with all dependencies
- tsconfig.json recommended settings
- Environment variable setup (ANTHROPIC_API_KEY)
- Project structure recommendations
- Import patterns: named exports vs default
- TypeScript version requirements

**query-pattern.md (30-40 minutes):**
- What: Stateless query() function
- When: Single-shot requests, no conversation memory needed
- Basic example: Simple query with prompt
- Complete example: Query with custom tool
- Response structure and types
- Error handling patterns
- Performance considerations
- Link to client-pattern.md for stateful alternative

**client-pattern.md (30-40 minutes):**
- What: ClaudeSDKClient for multi-turn conversations
- When: Need conversation memory, session management
- Initialization and configuration
- Multi-turn conversation example
- Session persistence
- Message history access
- Client lifecycle management
- Comparison to query() pattern

**custom-tools.md (45-60 minutes - most complex):**
- Tool creation with Zod schemas
- Input schema definition and validation
- Handler implementation (async patterns)
- Multiple tool registration
- Error handling in tools
- Complete examples:
  - File reading tool (basic)
  - API call tool (intermediate)
  - Database query tool (advanced)
- Type safety with TypeScript
- Tool naming and description best practices
- Cross-reference to concepts/tools.md

**options.md (30-40 minutes):**
- Complete Options interface documentation
- Required fields vs optional fields
- Model selection (claude-3-5-sonnet, etc.)
- Temperature and sampling parameters
- Permission configuration (reference concepts/permissions.md)
- Hook configuration (reference concepts/hooks.md)
- Default values for all options
- Common configuration patterns

**streaming.md (30-40 minutes):**
- Async iterable pattern for streaming
- When to use streaming vs single response
- Chunk types and handling
- Backpressure management
- Error handling in streams
- Complete streaming example (~60 lines)
- Performance benefits
- Client-side display patterns

**Key Patterns to Include in All Guides:**
- Complete dependency block at start of examples
- All imports explicit (never assume)
- Environment setup documented
- Error handling in complete examples
- Type annotations for clarity
- Comments explaining non-obvious code
- Expected output documentation
- Related documentation links

**Cross-Reference Strategy:**
- Reference concepts/tools.md from custom-tools.md
- Reference concepts/permissions.md from options.md
- Reference concepts/hooks.md from options.md
- Reference concepts/sessions.md from client-pattern.md
- Link between query-pattern.md and client-pattern.md (alternatives)
- Link to examples/ from all guides (working implementations)

**Coordination with Builder 3:**
- Builder 3 writes concepts/ in parallel
- Cross-references may point to files being written simultaneously
- Both builders must agree on concept file names early
- Validation phase will verify all cross-references resolve

### Patterns to Follow
Reference patterns from `patterns.md`:
- **Markdown Structure Pattern:** Standard document template for every guide
- **Complete TypeScript Example Pattern:** All examples have imports, deps, error handling
- **Syntax Validation Pattern:** Run `tsc --noEmit` on every code block
- **Cross-Reference Format:** Relative markdown links to concepts/ and examples/
- **Import Statement Pattern:** Group imports by category
- **Error Handling Pattern:** Standard try-catch for all async operations
- **Frontmatter Metadata Pattern:** Standard YAML metadata in every file

### Testing Requirements
- **Syntax validation:** All TypeScript examples compile (`tsc --noEmit --strict`)
- **Completeness check:** Each guide has all required sections
- **Code quality:** Examples include error handling, comments, type annotations
- **Cross-reference validation:** All links to concepts/ will exist (coordinate with Builder 3)
- **Metadata validation:** All files have proper YAML frontmatter

### Potential Split Strategy
**NOT RECOMMENDED** unless Builder 2 estimates >4.5 hours after starting. Keep as single builder for consistency. If absolutely necessary:

**Builder 2A: Basic Patterns**
- setup.md
- query-pattern.md
- client-pattern.md
- **Estimate:** 1.5-2 hours

**Builder 2B: Advanced Patterns**
- custom-tools.md
- options.md
- streaming.md
- **Estimate:** 2-2.5 hours

---

## Builder-3: Concepts & Examples

### Scope
Write 6 cross-language conceptual guides explaining framework-agnostic Agent SDK concepts, and create 5+ complete TypeScript example applications demonstrating common patterns. Update 2l-explorer.md agent prompt with Agent SDK reference (<50 tokens).

### Complexity Estimate
**VERY HIGH**

**Rationale:**
- 6 conceptual guides (permissions, MCP, hooks, tools, sessions, cost-tracking)
- 5+ complete example applications (simple-cli, web-api, stateful-chatbot, multi-tool, mcp-server)
- Examples must be production-quality with complete code, setup instructions, expected output
- Each example is 50-200 lines of validated code
- Agent prompt update requires careful token counting
- Total time: 4-5 hours (on high end of estimate)
- **Consider splitting into Builder 3A (concepts) and Builder 3B (examples) if scope proves too large**

### Success Criteria
- [ ] All 6 conceptual guides written:
  - [ ] `concepts/permissions.md` - Permission modes, security implications
  - [ ] `concepts/mcp.md` - Model Context Protocol overview and integration
  - [ ] `concepts/hooks.md` - Pre/post tool-use event handling
  - [ ] `concepts/tools.md` - Built-in vs custom tools overview
  - [ ] `concepts/sessions.md` - State management and conversation continuity
  - [ ] `concepts/cost-tracking.md` - Token usage monitoring and optimization
- [ ] All 5+ example applications written:
  - [ ] `examples/simple-cli-agent.md` - Basic CLI with 1-2 custom tools
  - [ ] `examples/web-api-agent.md` - Express backend with agent endpoints
  - [ ] `examples/stateful-chatbot.md` - Multi-turn conversation with memory
  - [ ] `examples/multi-tool-agent.md` - Complex agent with 5+ tools
  - [ ] `examples/mcp-server-agent.md` - MCP server integration example
- [ ] All example code is syntactically valid (compiles without errors)
- [ ] All examples include: problem description, complete code, dependencies, setup instructions, expected output
- [ ] 2l-explorer.md updated with Agent SDK reference (<50 tokens added)
- [ ] Cross-references from concepts to typescript/ guides (coordinate with Builder 2)
- [ ] YAML frontmatter metadata in all files

### Files to Create
**Conceptual Guides:**
- `~/.claude/docs/agent-sdk/concepts/permissions.md`
- `~/.claude/docs/agent-sdk/concepts/mcp.md`
- `~/.claude/docs/agent-sdk/concepts/hooks.md`
- `~/.claude/docs/agent-sdk/concepts/tools.md`
- `~/.claude/docs/agent-sdk/concepts/sessions.md`
- `~/.claude/docs/agent-sdk/concepts/cost-tracking.md`

**Example Applications:**
- `~/.claude/docs/agent-sdk/examples/simple-cli-agent.md`
- `~/.claude/docs/agent-sdk/examples/web-api-agent.md`
- `~/.claude/docs/agent-sdk/examples/stateful-chatbot.md`
- `~/.claude/docs/agent-sdk/examples/multi-tool-agent.md`
- `~/.claude/docs/agent-sdk/examples/mcp-server-agent.md`

**Agent Prompt Update:**
- `~/.claude/agents/2l-explorer.md` (add reference to Agent SDK docs)

### Dependencies
**Depends on:** Builder 1 (directory structure, harvested content)

**Blocks:** None (fully parallel with Builder 2)

**Works with:** Builder 2 (coordinate on cross-references)

### Implementation Notes

**Conceptual Guides Strategy (90-120 minutes total):**

Each concept guide should be **shorter** than implementation guides (800-1200 words vs 1500+ words). Focus on **what, when, why** rather than language-specific **how** (that's in typescript/ and python/ guides).

**permissions.md (15-20 minutes):**
- All permission modes: read, write, execute, network, filesystem, etc.
- Security implications of each mode
- Default permissions
- When to use each mode
- How to request minimal necessary permissions
- Best practices for permission scoping
- Link to typescript/options.md for configuration syntax

**mcp.md (20-25 minutes):**
- What is Model Context Protocol?
- Why use MCP servers vs custom tools?
- Built-in MCP servers overview
- Custom MCP server integration
- Use cases: filesystem access, database queries, API integrations
- Architecture diagram (text/ASCII)
- Link to examples/mcp-server-agent.md

**hooks.md (15-20 minutes):**
- Event handling in Agent SDK
- Pre-tool-use hooks (validation, logging, interruption)
- Post-tool-use hooks (monitoring, transformation)
- Use cases: authentication, rate limiting, audit logging
- Hook signature and parameters
- Link to typescript/options.md for hook configuration

**tools.md (15-20 minutes):**
- Built-in tools overview (bash, filesystem, read, write, etc.)
- Custom tool patterns (when to create vs use built-in)
- Tool naming conventions
- Tool description best practices
- Tool composition strategies
- Link to typescript/custom-tools.md for implementation

**sessions.md (15-20 minutes):**
- Stateless vs stateful patterns
- When to use query() vs ClaudeSDKClient
- Conversation continuity across requests
- Session persistence strategies (in-memory, database, filesystem)
- Memory management considerations
- Link to typescript/client-pattern.md

**cost-tracking.md (15-20 minutes):**
- Token usage monitoring
- Input tokens vs output tokens
- Cost calculation (tokens × price per token)
- Optimization techniques (shorter prompts, streaming for early termination)
- When to worry about costs
- Streaming vs single mode cost implications

**Example Applications Strategy (150-180 minutes total):**

Each example must be **complete, runnable, production-quality code**. Not toy examples. Include all imports, error handling, setup instructions.

**simple-cli-agent.md (25-30 minutes):**
- **Difficulty:** Beginner
- **Problem:** Create CLI tool that answers questions using file reading capability
- **Code:** ~50 lines
  - Import agent SDK and zod
  - Create readFile custom tool
  - Initialize client with tool
  - Accept CLI input (process.argv)
  - Query agent with user prompt
  - Display response
  - Error handling
- **Dependencies:** @anthropic-ai/agent-sdk, zod
- **Setup:** Installation, API key, run command
- **Expected Output:** Example interaction showing file reading in action

**web-api-agent.md (30-40 minutes):**
- **Difficulty:** Intermediate
- **Problem:** REST API that exposes agent capabilities
- **Code:** ~100 lines
  - Express server setup
  - POST /query endpoint with agent integration
  - Custom tools for API-specific operations
  - Request validation
  - Response formatting
  - Error handling middleware
- **Dependencies:** @anthropic-ai/agent-sdk, express, zod
- **Setup:** Installation, run server, test with curl
- **Expected Output:** API request/response examples

**stateful-chatbot.md (35-45 minutes):**
- **Difficulty:** Intermediate
- **Problem:** Multi-turn chatbot with conversation memory
- **Code:** ~150 lines
  - ClaudeSDKClient initialization
  - Session management (in-memory store)
  - Multi-turn conversation loop
  - Message history display
  - Graceful exit handling
- **Dependencies:** @anthropic-ai/agent-sdk, zod
- **Setup:** Installation, run chatbot, example conversation
- **Expected Output:** Multi-turn conversation transcript

**multi-tool-agent.md (40-50 minutes - most complex):**
- **Difficulty:** Advanced
- **Problem:** Agent with diverse capabilities (file ops, API calls, calculations, etc.)
- **Code:** ~200 lines
  - 5+ custom tools:
    - File reading/writing
    - HTTP API calls (weather, currency, etc.)
    - Mathematical calculations
    - Data transformation
    - External service integration
  - Tool coordination logic
  - Comprehensive error handling
- **Dependencies:** @anthropic-ai/agent-sdk, zod, axios
- **Setup:** Installation, API key configuration, run commands
- **Expected Output:** Examples demonstrating each tool

**mcp-server-agent.md (40-50 minutes - advanced):**
- **Difficulty:** Advanced
- **Problem:** Agent with custom MCP server integration
- **Code:** ~250 lines split into:
  - Custom MCP server implementation (~120 lines)
  - Agent integration code (~80 lines)
  - Setup and configuration (~50 lines)
- **Dependencies:** @anthropic-ai/agent-sdk, @modelcontextprotocol/server, zod
- **Setup:** MCP server installation, configuration, agent setup
- **Expected Output:** Agent using MCP server capabilities

**Agent Prompt Update (15-20 minutes):**

Update `~/.claude/agents/2l-explorer.md` with minimal reference to Agent SDK documentation.

**Location in file:** Add to "Technical Requirements" or "When Exploring" section

**Exact text to add (35 tokens):**
```markdown
When vision mentions AI agents, assistants, or chatbots, note that Agent SDK
documentation is available at `~/.claude/docs/agent-sdk/overview.md` for
implementation guidance.
```

**Validation:**
- Token count: 35 tokens ✓ (under 50-token limit)
- Strong directive language: "note that documentation is available"
- Specific file path: `~/.claude/docs/agent-sdk/overview.md`
- Keywords: "AI agents", "assistants", "chatbots"

**Testing:** After update, test explorer with vision containing "build an AI chatbot" to verify documentation reference appears in exploration report.

### Patterns to Follow
Reference patterns from `patterns.md`:
- **Markdown Structure Pattern:** Standard document template
- **Complete TypeScript Example Pattern:** All examples with imports, deps, error handling
- **Syntax Validation Pattern:** Validate all example code compiles
- **2l-explorer.md Prompt Directive:** Minimal reference pattern
- **Cross-Reference Format:** Relative links to typescript/ guides
- **Frontmatter Metadata Pattern:** YAML metadata in all files
- **Error Handling Pattern:** Try-catch in all async operations

### Testing Requirements
- **Syntax validation:** All example code compiles without errors
- **Completeness check:** Each example has problem, code, dependencies, setup, output
- **Token counting:** Verify 2l-explorer.md addition is <50 tokens
- **Cross-reference validation:** Links to typescript/ guides resolve (coordinate with Builder 2)
- **Example quality:** Code is production-ready, not toy examples

### Potential Split Strategy (RECOMMENDED if time estimates >4.5 hours)

**Builder 3A: Conceptual Guides**
- Write all 6 concept guides (permissions, MCP, hooks, tools, sessions, cost-tracking)
- **Estimated time:** 1.5-2 hours
- **Complexity:** MEDIUM (shorter content, less code)
- **Files:** 6 concept guides in concepts/

**Builder 3B: Example Applications & Agent Integration**
- Write all 5+ example applications
- Update 2l-explorer.md prompt
- **Estimated time:** 2.5-3 hours
- **Complexity:** HIGH (long code examples, validation intensive)
- **Files:** 5+ examples in examples/, 2l-explorer.md update

**Coordination between 3A and 3B:**
- 3A completes first (concepts referenced by examples)
- 3B cross-references concepts from examples
- Both can work in parallel if 3B writes examples first and adds cross-references last

---

## Builder Execution Order

### Phase 1: Foundation (SEQUENTIAL)
**Builder 1** - Must complete before others start
- Create directory structure
- Perform web documentation harvest
- Write overview.md, quickstart.md, troubleshooting.md
- Organize harvested content for Builders 2 & 3
- **Duration:** 3-4 hours

### Phase 2: Parallel Documentation (PARALLEL)
**Builder 2** and **Builder 3** (or 3A/3B) work simultaneously
- **Builder 2:** Write 6 TypeScript implementation guides
- **Builder 3:** Write 6 concept guides + 5 examples + update 2l-explorer.md
  - OR **Builder 3A:** Write 6 concept guides
  - AND **Builder 3B:** Write 5 examples + update 2l-explorer.md
- **Coordination:** Agree on concept file names early for cross-references
- **Duration:** 3-5 hours (wall clock time, parallel work)

### Phase 3: Integration (COLLABORATIVE)
**All builders** participate in validation
- Verify all cross-references resolve
- Run syntax validation on all code examples
- Test link validation script
- Verify 2l-explorer.md token count
- Test agent discovery (explore a vision with "AI agent" keyword)
- **Duration:** 30 minutes

---

## Integration Notes

### Shared Resources
**Temporary harvest files** (created by Builder 1, used by Builders 2 & 3):
- `/tmp/agent-sdk-harvest/typescript-content.txt` - TypeScript-specific content
- `/tmp/agent-sdk-harvest/python-content.txt` - Python-specific content (not used in Iteration 1)
- `/tmp/agent-sdk-harvest/concepts-content.txt` - Cross-language concepts
- `/tmp/agent-sdk-harvest/examples-content.txt` - Example implementations

### Cross-Reference Coordination
**Builder 2 references Builder 3's files:**
- `typescript/custom-tools.md` → `concepts/tools.md`
- `typescript/options.md` → `concepts/permissions.md`, `concepts/hooks.md`
- `typescript/client-pattern.md` → `concepts/sessions.md`

**Builder 3 references Builder 2's files:**
- `concepts/tools.md` → `typescript/custom-tools.md`
- `concepts/permissions.md` → `typescript/options.md`
- `concepts/sessions.md` → `typescript/client-pattern.md`
- `examples/*.md` → `typescript/setup.md`, `typescript/custom-tools.md`

**Agreement Required:**
- Exact filenames for all concept guides (before starting parallel work)
- Exact filenames for all TypeScript guides (before starting parallel work)
- Cross-reference format: relative paths from each location

### Potential Conflict Areas
**Low risk** - Different directories, different file sets:
- Builder 2 writes only to `typescript/`
- Builder 3 writes to `concepts/` and `examples/`
- No file conflicts expected
- Only risk: Cross-references to files not yet created (resolved in validation phase)

### Validation Strategy
After all builders complete:
1. **Link validation:** Run link validation script (see patterns.md)
2. **Syntax validation:** Run TypeScript compiler on all examples
3. **Completeness check:** Verify all 22 files exist
4. **Metadata check:** Verify YAML frontmatter in all files
5. **Token count:** Verify 2l-explorer.md addition <50 tokens
6. **Discovery test:** Test explorer with "AI agent" vision

---

## Success Metrics

### Quantitative Metrics
- **Files created:** 22 documentation files (2 root + 6 TS + 6 concepts + 5 examples + 1 troubleshooting + 2l-explorer.md update)
- **Code examples:** 20+ complete, validated TypeScript examples
- **Lines of documentation:** ~15,000-20,000 words total
- **Syntax validation pass rate:** 100% (all examples compile)
- **Link validation pass rate:** 100% (all cross-references resolve)
- **Token budget:** <50 tokens added to 2l-explorer.md

### Qualitative Metrics
- **Agent usability:** Agents can find relevant documentation via Grep
- **Code quality:** Examples are production-ready, not toy code
- **Completeness:** All major Agent SDK features documented
- **Consistency:** All files follow standard structure and patterns
- **Cross-reference quality:** Links are helpful, not excessive

---

## Risk Mitigation

### High-Risk Items
**Risk:** Web harvest is incomplete (missing SDK features)
- **Mitigation:** Systematic navigation discovery, manual verification
- **Contingency:** Document known gaps in troubleshooting.md

**Risk:** Code examples have errors
- **Mitigation:** Extract from official docs, syntax validation, manual review
- **Contingency:** Fix errors before declaring builder complete

**Risk:** Builder 3 scope too large
- **Mitigation:** Split into Builder 3A (concepts) and Builder 3B (examples)
- **Trigger:** If Builder 3 estimates >4.5 hours after starting

### Medium-Risk Items
**Risk:** Cross-references break (files renamed or moved)
- **Mitigation:** Agree on filenames early, validation script
- **Contingency:** Fix in integration phase

**Risk:** Token budget exceeded in agent prompt update
- **Mitigation:** Careful token counting, minimal phrasing
- **Contingency:** Edit down to 50 tokens or less

---

**Builder Task Breakdown Status:** COMPLETE
**Ready for:** Builder Execution Phase
**Total Estimated Time:** 9-11 hours (3-4h foundation + 3-4h parallel TS guides + 2-3h parallel concepts/examples + 0.5h integration)
**Key Success Factor:** Builder 1 foundation quality determines downstream success
