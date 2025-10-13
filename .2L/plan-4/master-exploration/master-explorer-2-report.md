# Master Exploration Report

## Explorer ID
master-explorer-2

## Focus Area
Dependencies & Risk Assessment

## Vision Summary
Enable 2L agents to naturally build Agent SDK applications by creating comprehensive, locally-available documentation that eliminates external dependency lookups, enabling sophisticated AI agent implementations without manual reference to web documentation.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 8 must-have features across 4 major categories
  - **Documentation Harvest:** Comprehensive web documentation harvest (1)
  - **Documentation Structure:** Structured library creation (1), TypeScript guides (1), Python guides (1), Conceptual guides (1), Working examples (1)
  - **System Integration:** Agent discovery integration (1)
  - **Support Resources:** Troubleshooting guide (1)
- **User stories/acceptance criteria:** 89 acceptance criteria across all features
- **Estimated total work:** 20-28 hours (breakdown by phase below)

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **8 distinct features with deep interdependencies** - Documentation structure depends on harvest completeness; agent integration depends on documentation quality; examples depend on both language guides
- **Two-phase dependency pattern** - Must harvest BEFORE structuring; must structure BEFORE integrating with agents
- **External data dependency** - Quality depends entirely on completeness of official Agent SDK documentation (uncontrollable variable)
- **Multi-language support required** - TypeScript AND Python guides must achieve feature parity (double the documentation surface area)
- **Cross-cutting integration** - Must update 3 separate agent system prompts (explorer, planner, builder) without bloating token count
- **Knowledge synthesis challenge** - Not just copying docs, but organizing for agent consumption (different mental model than human docs)
- **Validation complexity** - Must verify code examples work WITHOUT having Agent SDK API keys during documentation phase

---

## Architectural Analysis

### Major Components Identified

1. **Web Documentation Harvester**
   - **Purpose:** Systematically fetch and extract ALL Agent SDK documentation from official sources (https://docs.claude.com/en/api/agent-sdk/)
   - **Complexity:** MEDIUM-HIGH
   - **Why critical:** Foundation for entire project - if harvest is incomplete, all downstream documentation will have gaps
   - **Current state:** Does NOT exist - greenfield development
   - **Dependencies:**
     - WebFetch tool (available in 2L)
     - HTML parsing capability (extract content from documentation pages)
     - URL discovery (follow navigation links to find all subpages)

2. **Documentation Directory Structure**
   - **Purpose:** Organize harvested knowledge into well-structured, searchable markdown files at `~/.claude/docs/agent-sdk/`
   - **Complexity:** MEDIUM
   - **Why critical:** Agent discoverability depends on logical structure; Read/Grep effectiveness depends on file organization
   - **Current state:** `~/.claude/docs/` directory does NOT exist yet
   - **Implementation requirements:**
     - Create 4 subdirectories: `typescript/`, `python/`, `concepts/`, `examples/`
     - Define consistent markdown structure for all files
     - Establish cross-referencing convention
     - Include metadata (last_updated, sdk_version)

3. **Language-Specific Implementation Guides**
   - **Purpose:** Provide complete TypeScript and Python reference material for all SDK features
   - **Complexity:** HIGH
   - **Why critical:** Builders need language-specific patterns and examples; code must be copy-paste ready
   - **Implementation requirements:**
     - TypeScript: 6 guides (setup, query-pattern, client-pattern, custom-tools, options, streaming)
     - Python: 6 guides (setup, query-pattern, client-pattern, custom-tools, options, async-patterns)
     - Each guide must include: problem statement, solution approach, complete code examples, gotchas
     - Examples must be syntactically valid and runnable
   - **Technology decision:** Must ensure feature parity between TS and Python (or document gaps explicitly)

4. **Conceptual Documentation System**
   - **Purpose:** Framework-agnostic documentation for key concepts (permissions, MCP, hooks, tools, sessions, cost-tracking)
   - **Complexity:** MEDIUM
   - **Why critical:** Helps agents understand WHEN to use Agent SDK and WHICH patterns to apply
   - **Implementation requirements:**
     - 6 concept guides covering cross-language topics
     - Each concept must explain: what it is, when to use it, security implications, best practices
     - Must be language-neutral (agents choose language later)

5. **Working Examples Library**
   - **Purpose:** Complete, runnable example applications demonstrating common patterns
   - **Complexity:** MEDIUM-HIGH
   - **Why critical:** Builders often start with examples and adapt; must be production-quality reference implementations
   - **Implementation requirements:**
     - 5 examples: simple-cli-agent, web-api-agent, stateful-chatbot, multi-tool-agent, mcp-server-agent
     - Each example in BOTH TypeScript AND Python (10 total implementations)
     - Must include: problem description, full code, setup instructions, expected output
     - Code must be tested and verified working

6. **Agent System Prompt Integration**
   - **Purpose:** Add minimal references to Agent SDK documentation in 2L agent prompts (explorer, planner, builder)
   - **Complexity:** LOW
   - **Why critical:** Discovery mechanism - agents must KNOW documentation exists; but cannot bloat prompts (token budget constraint)
   - **Current state:** Agent system prompts exist as markdown files in `~/.claude/agents/`
   - **Implementation requirements:**
     - Add <50 tokens per agent type (vision constraint: <150 total)
     - References only, NO content duplication
     - Format: "For AI agent features, see `~/.claude/docs/agent-sdk/overview.md`"

7. **Troubleshooting Knowledge Base**
   - **Purpose:** Common error messages and solutions for Agent SDK issues
   - **Complexity:** LOW-MEDIUM
   - **Why critical:** Unblocks builders during implementation; reduces iteration time for fixes
   - **Implementation requirements:**
     - Single `troubleshooting.md` file with categorized issues
     - Format: symptom, cause, solution, prevention
     - Cover: auth errors, permission errors, tool execution failures, context overflow, dependency conflicts

8. **Documentation Validation System**
   - **Purpose:** Ensure code examples are syntactically valid and documentation is complete
   - **Complexity:** MEDIUM
   - **Why critical:** Invalid examples break builder trust; incomplete docs lead to external lookups (defeats purpose)
   - **Implementation requirements:**
     - Syntax validation for all TypeScript code blocks (use TypeScript compiler API)
     - Syntax validation for all Python code blocks (use ast.parse)
     - Link validation (all cross-references resolve to existing files)
     - Placeholder detection (no TODOs or [FILL IN] markers in examples)

### Technology Stack Implications

**Documentation Format**
- **Options:** Markdown (standard), MDX (React-style docs), AsciiDoc (technical docs), Plain text
- **Recommendation:** Markdown
- **Rationale:**
  - Vision specifies markdown format
  - Agents already use Read tool for markdown files
  - Grep works excellently with markdown (flat text structure)
  - Syntax highlighting support in code blocks (```typescript, ```python)
  - No build step required (unlike MDX)

**Documentation Location**
- **Options:** `~/.claude/docs/agent-sdk/` (global), `.2L/docs/` (project-specific), GitHub repo with clone
- **Recommendation:** `~/.claude/docs/agent-sdk/` (global)
- **Rationale:**
  - Vision explicitly specifies this location
  - Constraint: "Must be in ~/.claude/docs/ (global, not project-specific)"
  - Accessible to all 2L agents across all projects
  - Survives project deletion (persistent reference material)

**Web Scraping Strategy**
- **Options:** WebFetch tool only, Beautiful Soup (Python), Puppeteer (headless browser), Manual copy-paste
- **Recommendation:** WebFetch tool (built into 2L)
- **Rationale:**
  - Already available in 2L agent toolkit
  - Sufficient for documentation pages (no JavaScript rendering needed)
  - Can be called multiple times for different pages
  - No external dependencies required

**Code Example Validation**
- **Options:** Full execution testing (requires API keys), Syntax-only validation, Manual review, No validation
- **Recommendation:** Syntax-only validation (cannot execute without API keys)
- **Rationale:**
  - Cannot execute examples during documentation phase (no Agent SDK API access configured)
  - Syntax validation catches most errors (typos, import mistakes, missing brackets)
  - TypeScript: Use `tsc --noEmit` on example files
  - Python: Use `python -m py_compile` on example files
  - Mark examples as "syntax-validated" in metadata

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 iterations)

**Rationale:**
- 8 features is moderate-high scope, with clear dependency phases
- Natural separation: **Harvest** (gather raw material) → **Structure** (organize and write guides) → **Integrate** (connect to 2L agents)
- Each iteration delivers standalone value that can be validated independently
- 20-28 hour total effort splits naturally: 6-8 hours (Iteration 1) + 10-14 hours (Iteration 2) + 4-6 hours (Iteration 3)
- Risk distribution: High-risk harvest in iteration 1 (external dependency), high-complexity documentation in iteration 2, low-risk integration in iteration 3

### Suggested Iteration Phases

**Iteration 1: Documentation Harvest & Foundation**
- **Vision:** "Gather all Agent SDK knowledge from official sources into raw, structured form"
- **Scope:** Complete web documentation harvest and directory setup
  - Feature 1: Comprehensive Web Documentation Harvest
    - Fetch all pages from https://docs.claude.com/en/api/agent-sdk/
    - Extract TypeScript SDK documentation completely
    - Extract Python SDK documentation completely
    - Capture all code examples, configuration options, edge cases
    - Document permissions system, MCP integration, tool patterns
    - Save raw content to temporary staging directory
  - Foundation: Create `~/.claude/docs/agent-sdk/` directory structure
    - Create subdirectories: `typescript/`, `python/`, `concepts/`, `examples/`
    - Create template structure for each guide type
    - Define cross-reference format and metadata schema
- **Why first:** Cannot write structured documentation without complete raw material; establishes foundation for all future features
- **Estimated duration:** 6-8 hours
  - Web harvesting: 3-4 hours (systematic page discovery, content extraction, de-duplication)
  - Directory setup: 1 hour (create structure, define templates)
  - Initial content organization: 2-3 hours (categorize harvested content into buckets)
- **Risk level:** HIGH
  - External dependency on official docs (could be incomplete, paywalled, or restructured)
  - HTML parsing complexity (inconsistent page structure could break extraction)
  - Content completeness validation (no way to know if we missed pages)
  - Version mismatch (TypeScript vs Python SDK versions might differ)
- **Success criteria:**
  - All Agent SDK documentation pages discovered and fetched (verify navigation completeness)
  - Raw content saved with source URL metadata (for future updates)
  - Directory structure created at `~/.claude/docs/agent-sdk/`
  - Template files created for each guide type (ready to populate)
  - Harvested content categorized into: TS-specific, Python-specific, Cross-language, Examples

**Iteration 2: Documentation Structuring & Content Creation**
- **Vision:** "Transform raw harvested knowledge into comprehensive, agent-friendly guides"
- **Scope:** Write all structured documentation files (guides, concepts, examples)
  - Feature 2: Structured Documentation Library Creation
    - Write `overview.md` (what Agent SDK is, when to use it, core concepts)
    - Write `quickstart.md` (installation, first agent, basic patterns)
    - Define cross-reference format and implement links
  - Feature 3: TypeScript Implementation Guides (6 files)
    - `typescript/setup.md`, `query-pattern.md`, `client-pattern.md`, `custom-tools.md`, `options.md`, `streaming.md`
    - Each with: problem → solution → code → gotchas structure
  - Feature 4: Python Implementation Guides (6 files)
    - `python/setup.md`, `query-pattern.md`, `client-pattern.md`, `custom-tools.md`, `options.md`, `async-patterns.md`
    - Mirror TypeScript structure for consistency
  - Feature 5: Conceptual Guides (6 files)
    - `concepts/permissions.md`, `mcp.md`, `hooks.md`, `tools.md`, `sessions.md`, `cost-tracking.md`
    - Language-agnostic explanations
  - Feature 6: Working Examples Collection (5 examples × 2 languages = 10 files)
    - Simple CLI agent, Web API agent, Stateful chatbot, Multi-tool agent, MCP server agent
    - Each with complete, runnable code for both TypeScript and Python
  - Feature 8: Troubleshooting Guide
    - `troubleshooting.md` with common errors and solutions
- **Dependencies from Iteration 1:**
  - Requires: Raw documentation content (harvested in iteration 1)
  - Requires: Directory structure (`~/.claude/docs/agent-sdk/` created)
  - Requires: Template structure (defined in iteration 1)
  - Uses: Categorized content buckets to know what goes where
- **Estimated duration:** 10-14 hours (most complex iteration)
  - Overview + Quickstart: 2 hours (synthesis and clarity)
  - TypeScript guides (6 files): 3-4 hours (6 files × 30-40 min each)
  - Python guides (6 files): 3-4 hours (parallel structure to TS)
  - Conceptual guides (6 files): 2 hours (shorter, less code-heavy)
  - Working examples (10 implementations): 4-5 hours (most time-intensive, must test syntax)
  - Troubleshooting: 1 hour (collect common errors)
- **Risk level:** HIGH
  - Content quality depends on harvest completeness (garbage in, garbage out)
  - Code examples might not work (no execution testing possible without API keys)
  - Feature parity between TS and Python (one might have features the other lacks)
  - Cross-reference maintenance (many links to keep in sync)
  - Scope creep risk (temptation to over-document every detail)
- **Success criteria:**
  - All 22 documentation files written (2 top-level + 6 TS + 6 Python + 6 concepts + 1 troubleshooting)
  - All 10 example implementations complete (5 examples × 2 languages)
  - All code examples syntax-validated (TypeScript compiles, Python parses)
  - All cross-references resolve (no broken links)
  - Each guide follows consistent structure (problem → solution → code → gotchas)
  - No placeholder text remaining (no TODO or [FILL IN] markers)

**Iteration 3: Agent Integration & Validation**
- **Vision:** "Enable 2L agents to discover and use Agent SDK documentation naturally"
- **Scope:** Update agent system prompts and validate end-to-end workflows
  - Feature 7: Agent Discovery Integration
    - Update `2l-explorer` prompt: Add reference to `~/.claude/docs/agent-sdk/overview.md`
    - Update `2l-planner` prompt: Add reference to Agent SDK for AI agent features
    - Update `2l-builder` prompt: Add reference to language-specific guides
    - Verify token additions <150 tokens total (<50 per agent)
  - Validation: End-to-end workflow testing
    - Test Explorer: Reads vision with "build AI agent" → references Agent SDK docs
    - Test Planner: Includes Agent SDK in tech stack based on explorer input
    - Test Builder: Reads `typescript/setup.md` and implements basic agent
    - Verify: No external documentation lookups needed (all info in local docs)
- **Dependencies from Iteration 1 & 2:**
  - Requires: All documentation files complete (iteration 2)
  - Requires: Examples tested and validated (iteration 2)
  - Requires: Directory structure stable (iteration 1)
  - Uses: Agent system prompts exist (current 2L setup)
- **Estimated duration:** 4-6 hours
  - Agent prompt updates: 1-2 hours (careful token counting, minimal additions)
  - Explorer workflow test: 1 hour (vision → exploration report validation)
  - Planner workflow test: 1 hour (exploration → master plan validation)
  - Builder workflow test: 2 hours (plan → implementation validation, most critical)
  - Documentation fixes: 1 hour (inevitable gaps discovered during testing)
- **Risk level:** MEDIUM
  - Token budget constraint (must stay <50 tokens per agent)
  - Prompt bloat concern (too much guidance hurts other capabilities)
  - Discovery mechanism might not work (agents might not read docs even with references)
  - Documentation gaps revealed during testing (requires iteration back to iteration 2)
- **Success criteria:**
  - All 3 agent prompts updated (explorer, planner, builder)
  - Token additions verified <150 total (<50 per agent type)
  - Explorer correctly identifies Agent SDK opportunities from vision keywords
  - Builder successfully implements basic Agent SDK app using only local docs
  - No WebFetch calls to official Agent SDK docs during test workflows
  - All documentation cross-references work as expected

---

## Dependency Graph

```
Iteration 1: Documentation Harvest & Foundation (6-8 hours)
├── Web Documentation Harvest
│   ├── Fetch: https://docs.claude.com/en/api/agent-sdk/ (landing page)
│   ├── Discover: All subpages via navigation links
│   ├── Extract: TypeScript SDK pages (installation, usage, API reference)
│   ├── Extract: Python SDK pages (installation, usage, API reference)
│   ├── Extract: All code examples (verbatim with syntax highlighting metadata)
│   ├── Extract: Configuration options (permissions, hooks, MCP settings)
│   └── Save: Raw content with source URL metadata
│       ↓
└── Directory Structure Setup
    ├── Create: ~/.claude/docs/agent-sdk/ (base directory)
    ├── Create: typescript/, python/, concepts/, examples/ (subdirectories)
    ├── Define: Markdown template structure (problem → solution → code → gotchas)
    ├── Define: Metadata schema (last_updated, sdk_version, source_url)
    └── Categorize: Harvested content into buckets (TS, Python, cross-lang, examples)
        ↓
        ↓ (Foundation complete, raw material ready)
        ↓
Iteration 2: Documentation Structuring & Content Creation (10-14 hours)
├── Top-Level Documentation
│   ├── Write: overview.md (what, when, core concepts)
│   └── Write: quickstart.md (installation, first agent)
│       ↓
├── TypeScript Implementation Guides (6 files)
│   ├── Write: setup.md (tsconfig, dependencies, imports)
│   ├── Write: query-pattern.md (stateless query() usage)
│   ├── Write: client-pattern.md (stateful ClaudeSDKClient)
│   ├── Write: custom-tools.md (Zod schemas, tool creation)
│   ├── Write: options.md (Options interface reference)
│   └── Write: streaming.md (async iterables, message streaming)
│       ↓
├── Python Implementation Guides (6 files, parallel to TS)
│   ├── Write: setup.md (venv, requirements.txt, imports)
│   ├── Write: query-pattern.md (async/await patterns)
│   ├── Write: client-pattern.md (ClaudeSDKClient usage)
│   ├── Write: custom-tools.md (@tool decorator, type hints)
│   ├── Write: options.md (ClaudeAgentOptions reference)
│   └── Write: async-patterns.md (async iteration, message handling)
│       ↓
├── Conceptual Guides (6 files, cross-language)
│   ├── Write: permissions.md (modes, security implications)
│   ├── Write: mcp.md (Model Context Protocol integration)
│   ├── Write: hooks.md (event handling, pre/post tool use)
│   ├── Write: tools.md (built-in tools, custom tool patterns)
│   ├── Write: sessions.md (state management, continuity)
│   └── Write: cost-tracking.md (token usage monitoring)
│       ↓
├── Working Examples (10 implementations)
│   ├── Write: examples/simple-cli-agent.md (TS + Python)
│   ├── Write: examples/web-api-agent.md (Express + FastAPI)
│   ├── Write: examples/stateful-chatbot.md (conversation memory)
│   ├── Write: examples/multi-tool-agent.md (5+ custom tools)
│   └── Write: examples/mcp-server-agent.md (custom MCP server)
│       ↓
├── Troubleshooting Guide
│   └── Write: troubleshooting.md (common errors + solutions)
│       ↓
└── Validation
    ├── Syntax check: All TypeScript code blocks (tsc --noEmit)
    ├── Syntax check: All Python code blocks (ast.parse)
    ├── Link validation: All cross-references resolve
    └── Completeness check: No TODO/placeholder markers
        ↓
        ↓ (All documentation complete, validated)
        ↓
Iteration 3: Agent Integration & Validation (4-6 hours)
├── Agent Prompt Updates
│   ├── Update: ~/.claude/agents/2l-explorer.md
│   │   └── Add: "For AI agent features, see ~/.claude/docs/agent-sdk/overview.md" (<50 tokens)
│   ├── Update: ~/.claude/agents/2l-planner.md
│   │   └── Add: "Consider Agent SDK for AI agent requests - see ~/.claude/docs/agent-sdk/" (<50 tokens)
│   └── Update: ~/.claude/agents/2l-builder.md
│       └── Add: "Agent SDK reference: ~/.claude/docs/agent-sdk/ (start with overview.md)" (<50 tokens)
│       ↓
├── Workflow Validation: Explorer
│   ├── Test: Vision with "build AI assistant" keyword
│   ├── Verify: Explorer reads overview.md
│   └── Verify: Exploration report mentions Agent SDK
│       ↓
├── Workflow Validation: Planner
│   ├── Test: Exploration report referencing Agent SDK
│   ├── Verify: Master plan includes Agent SDK in tech stack
│   └── Verify: Plan references specific guides (e.g., typescript/setup.md)
│       ↓
└── Workflow Validation: Builder (Most Critical)
    ├── Test: Build simple CLI agent with custom tool
    ├── Verify: Builder reads typescript/setup.md, custom-tools.md, query-pattern.md
    ├── Verify: No WebFetch calls to official docs
    ├── Verify: Implementation matches documentation patterns
    └── Success: Agent runs and executes custom tool
```

**Critical Path Analysis:**

1. **Iteration 1 → 2 hard dependency:** Cannot write structured docs without harvested raw content
2. **Iteration 2 → 3 hard dependency:** Cannot integrate with agents until documentation is complete and validated
3. **Within Iteration 2:** TypeScript and Python guides can be written in parallel (no interdependency)
4. **Within Iteration 2:** Conceptual guides can be written in parallel with language guides
5. **Within Iteration 2:** Examples should be written AFTER language guides (examples reference guide patterns)
6. **Within Iteration 3:** All 3 agent prompt updates are independent (parallel work)

**Dependency Chain Summary:**
- **Blocking dependencies:** Harvest blocks everything; structured docs block integration
- **Parallel work opportunities:** TS and Python guides (iteration 2); all agent updates (iteration 3)
- **Integration points:** Examples must reference established patterns from language guides; troubleshooting must reference specific guide sections

---

## Risk Assessment

### High Risks

#### Risk 1: Official Documentation Incompleteness
- **Description:** Agent SDK documentation at https://docs.claude.com/en/api/agent-sdk/ might be incomplete, beta-quality, or missing critical features
- **Impact:**
  - Structured docs inherit all gaps from official docs
  - Builders unable to implement advanced features (fallback to external searches)
  - Project value diminished if documentation is 70% complete instead of 100%
  - User frustration if promised features undocumented
- **Mitigation:**
  1. Early validation: Spot-check official docs BEFORE iteration 1 (assess completeness)
  2. Gap tracking: Create `gaps.md` file documenting missing/unclear areas
  3. Fallback strategy: For undocumented features, add "⚠️ Feature exists but documentation pending - check official docs"
  4. Version tracking: Document which Agent SDK version docs correspond to (e.g., "Based on Agent SDK v1.2.0")
  5. Update mechanism: Plan for quarterly doc refresh (vision acknowledges docs will update)
- **Recommendation:** Accept partial completeness for MVP; document gaps explicitly; plan for iteration in should-have features (vision includes "Update Mechanism")

#### Risk 2: Feature Parity Mismatch Between TypeScript and Python SDKs
- **Description:** TypeScript SDK might have features Python SDK lacks (or vice versa), making "complete coverage" impossible
- **Impact:**
  - Cannot provide equivalent examples for both languages
  - Builders choose language, discover missing features mid-implementation
  - Documentation loses credibility ("supposedly complete" but key feature missing)
  - Agent recommendations might suggest wrong language for user requirements
- **Mitigation:**
  1. Early assessment: During harvest (iteration 1), create feature matrix (TS vs Python)
  2. Document gaps explicitly: Add warning banners: "⚠️ This feature currently TypeScript-only - Python support pending"
  3. Recommend primary language: If significant parity gap, suggest "Use TypeScript for full feature access" in overview.md
  4. Provide workarounds: For missing Python features, document alternative approaches
  5. Track parity status: Add metadata to each guide: `feature_parity: full|partial|typescript_only|python_only`
- **Recommendation:** Implement feature matrix during iteration 1 harvest; set realistic expectations about parity in overview.md

#### Risk 3: Code Examples Cannot Be Execution-Tested
- **Description:** Cannot run Agent SDK examples without API keys and Agent SDK installed; limited to syntax validation only
- **Impact:**
  - Examples might be syntactically correct but functionally broken (wrong API calls, incorrect imports, missing setup steps)
  - Builder implements example, gets runtime errors, loses trust in documentation
  - Time wasted debugging "validated" examples
- **Mitigation:**
  1. Multi-level validation:
     - Level 1: Syntax validation (TypeScript compiler, Python parser) - REQUIRED
     - Level 2: Type checking (tsc --noEmit) - REQUIRED for TypeScript
     - Level 3: Manual review (experienced developer reads code) - REQUIRED
     - Level 4: Execution testing (run with real API) - DEFERRED to post-MVP
  2. Example structure: Keep examples minimal (reduce surface area for errors)
  3. Source tracking: Document source URL for each example (if copied from official docs, likely to work)
  4. Community validation: After release, collect feedback on broken examples
  5. Validation backlog: Track examples needing execution testing in should-have features
- **Recommendation:** Accept syntax-only validation for MVP; prioritize "Validation Testing" in should-have features (vision already includes this)

#### Risk 4: Agent Discovery Mechanism Failure
- **Description:** Adding documentation references to agent prompts might not be sufficient for agents to actually USE the documentation
- **Impact:**
  - Documentation exists but agents don't read it (continue using WebFetch for external docs)
  - Project delivers no value (builders still slow, still inconsistent)
  - 20-28 hours of work produces unused artifact
- **Mitigation:**
  1. Explicit prompting: Use strong directive language: "You MUST consult `~/.claude/docs/agent-sdk/overview.md` when vision mentions AI agents"
  2. Contextual triggers: Add keyword detection logic: "If vision contains ['agent', 'bot', 'assistant', 'chatbot'], check Agent SDK docs"
  3. Example demonstration: Include concrete example in agent prompts: "Example: Vision says 'build chatbot' → Read ~/.claude/docs/agent-sdk/quickstart.md → Plan includes Agent SDK"
  4. Builder reinforcement: In builder prompt, explicitly state: "Do NOT use WebFetch for Agent SDK docs - use local docs at ~/.claude/docs/agent-sdk/"
  5. Validation testing: Iteration 3 specifically tests discovery mechanism (3 workflow tests)
- **Recommendation:** Invest extra time in prompt engineering during iteration 3; test with real visions that should trigger Agent SDK

#### Risk 5: Token Budget Constraint Forces Inadequate Integration
- **Description:** Vision requires <50 tokens per agent prompt addition; might be insufficient to convey how/when to use docs
- **Impact:**
  - Vague prompt additions don't guide agents effectively
  - Agents uncertain when to consult docs (over-consult or under-consult)
  - Documentation underutilized despite existence
- **Mitigation:**
  1. Optimize prompt wording: Every word counts; prefer "For AI agents: see ~/.claude/docs/agent-sdk/overview.md" over "If you're implementing AI agent capabilities, you can reference the comprehensive documentation available at ~/.claude/docs/agent-sdk/overview.md"
  2. Leverage existing prompt structure: Add to existing sections (e.g., "Technical Requirements" or "When to use which tools") rather than new section
  3. Use file path as primary signal: Path itself conveys purpose (`agent-sdk` is self-explanatory)
  4. Defer detailed guidance to documentation: First line of overview.md explains WHEN to use Agent SDK (agents read that for full guidance)
  5. Test effectiveness: If 50 tokens insufficient, request constraint relaxation in iteration 3
- **Recommendation:** Start with absolute minimal additions (30-40 tokens); test; add more if needed up to 50 token limit

### Medium Risks

#### Risk 6: Documentation Staleness Over Time
- **Description:** Agent SDK will update post-MVP; documentation becomes outdated within months
- **Impact:**
  - Builders follow outdated patterns, get deprecation warnings or errors
  - Documentation loses trust (known to be stale)
  - Maintenance burden grows (must refresh periodically)
- **Mitigation:**
  1. Version tracking: Prominently display "Based on Agent SDK v1.2.0 - Last updated: 2025-10-13" in overview.md
  2. Update reminder: Add to should-have features: "Update Mechanism - Process for refreshing docs when SDK updates"
  3. Change detection: Bookmark official docs pages, periodically check for updates (manual process)
  4. Deprecation warnings: Add note in overview.md: "If you encounter unexpected behavior, check official docs for recent changes"
  5. Community feedback: Encourage users to report documentation drift (GitHub issues)
- **Recommendation:** Accept manual updates for MVP; plan automated update mechanism in should-have features (vision already includes this)

#### Risk 7: Cross-Reference Link Maintenance Burden
- **Description:** 22+ documentation files with extensive cross-references; high risk of broken links over time
- **Impact:**
  - Agents follow link, get "file not found" error, lose trust
  - Navigation between related topics broken (poor user experience)
  - Maintenance overhead to keep links synchronized
- **Mitigation:**
  1. Automated link validation: Create script to verify all cross-references resolve (run during iteration 2 validation)
  2. Relative paths: Use relative paths (`../concepts/permissions.md`) not absolute paths (survives directory moves)
  3. Link format standard: Always use format `[Topic Name](relative/path.md)` for consistency
  4. Pre-commit hook: Add git pre-commit hook to validate links before committing changes
  5. Periodic audits: Quarterly link validation as part of documentation refresh
- **Recommendation:** Implement link validation script in iteration 2; run before marking iteration complete

#### Risk 8: Example Complexity Mismatch
- **Description:** Examples might be too simple (don't show real patterns) or too complex (overwhelming for beginners)
- **Impact:**
  - Too simple: Builders can't extrapolate to real use cases, still need external searches
  - Too complex: Builders confused, give up on Agent SDK, fall back to basic API
  - Wrong difficulty curve: No progression from simple to complex
- **Mitigation:**
  1. Difficulty gradient: Intentionally order examples by complexity:
     - simple-cli-agent (beginner: 1 custom tool, 50 lines)
     - web-api-agent (intermediate: API endpoint integration, 100 lines)
     - stateful-chatbot (intermediate: conversation memory, 150 lines)
     - multi-tool-agent (advanced: 5+ tools, 200 lines)
     - mcp-server-agent (advanced: custom MCP server, 250 lines)
  2. Complexity indicators: Label each example: "Difficulty: Beginner | Intermediate | Advanced"
  3. Problem statement: Each example starts with concrete problem it solves (helps builders self-select)
  4. Incremental examples: Each example builds on previous concepts (not standalone complex apps)
  5. User testing: If possible, have 2-3 developers review examples for appropriate complexity
- **Recommendation:** Follow difficulty gradient pattern; start with minimal examples and grow complexity progressively

#### Risk 9: Troubleshooting Guide Incompleteness
- **Description:** Cannot anticipate all common errors without real-world usage data
- **Impact:**
  - Builders encounter errors not in troubleshooting guide, still stuck
  - Troubleshooting guide has low coverage, low utility
- **Mitigation:**
  1. Bootstrap from official docs: Harvest any troubleshooting sections from official docs
  2. Generic error patterns: Document general categories even without specific errors:
     - Authentication errors (API key issues)
     - Permission errors (security constraints)
     - Tool execution failures (malformed tool schemas)
     - Context overflow (message history too large)
     - Dependency conflicts (version mismatches)
  3. Living document approach: Clearly mark troubleshooting.md as "Initial version - will expand based on user feedback"
  4. Feedback collection: Add note: "Encountered an error not listed? Report it for inclusion in next update"
  5. Post-MVP expansion: Plan to expand troubleshooting based on real builder experiences
- **Recommendation:** Accept limited coverage for MVP; commit to expanding based on usage patterns in should-have features

### Low Risks

#### Risk 10: Directory Structure Change Requirements
- **Description:** Chosen directory structure might prove suboptimal after usage
- **Impact:** Agents struggle to find relevant documentation; requires restructuring
- **Mitigation:**
  1. Follow established patterns (mimic official docs structure where applicable)
  2. Keep structure flat (minimize deep nesting for easier discovery)
  3. Use clear, descriptive names (typescript/, python/, concepts/, examples/)
  4. Document structure in overview.md (guide agents to right locations)
- **Recommendation:** Low risk; current structure (from vision) is well-reasoned

#### Risk 11: Markdown Formatting Inconsistencies
- **Description:** 22+ files written over time might have inconsistent formatting
- **Impact:** Minor readability issues; agents adapt but slightly suboptimal UX
- **Mitigation:**
  1. Define style guide upfront (heading levels, code block format, list style)
  2. Use consistent template structure for all files
  3. Markdown linter (markdownlint) to enforce consistency
- **Recommendation:** Low impact; cosmetic issue only

#### Risk 12: Python Virtual Environment Confusion
- **Description:** Python examples might not clearly explain venv setup
- **Impact:** Builders struggle with dependency installation
- **Mitigation:**
  1. Include explicit venv instructions in `python/setup.md`
  2. All Python examples show: `python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
- **Recommendation:** Easy to address in python/setup.md during iteration 2

---

## Integration Considerations

### Cross-Phase Integration Points

#### Shared Component: Raw Content Staging Area
- **What it is:** Temporary directory to store harvested web content before structuring
- **Why it spans iterations:**
  - Iteration 1: Harvest saves raw HTML/markdown to staging area
  - Iteration 2: Content writers read from staging area to populate structured docs
- **Integration challenge:** Must preserve source URL metadata with each content chunk
- **Solution:** Create staging structure during iteration 1:
  ```
  ~/.claude/docs/agent-sdk/.staging/
  ├── typescript/
  │   ├── page1.json (content + metadata)
  │   └── page2.json
  ├── python/
  └── cross-language/
  ```
- **Alternative:** Skip staging, write directly to final files (riskier, less flexible)

#### Shared Pattern: Metadata Schema
- **What it is:** Consistent metadata format across all documentation files
- **Why it spans iterations:**
  - Iteration 1: Define metadata schema
  - Iteration 2: All files include metadata in frontmatter
  - Iteration 3: Agents can check metadata (e.g., last_updated) to assess freshness
- **Integration challenge:** Must decide metadata fields upfront (hard to change later)
- **Solution:** Define minimal metadata schema in iteration 1:
  ```yaml
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
  ```

#### Shared Pattern: Cross-Reference Format
- **What it is:** Standard way to link between documentation files
- **Why consistency matters:**
  - Iteration 2: Writers create hundreds of cross-reference links
  - Iteration 3: Agents follow links during implementation
  - Future: Link validation scripts parse link format
- **Integration challenge:** Must be relative paths (work regardless of installation location)
- **Solution:** Establish link format rules in iteration 1:
  - Same directory: `[Query Pattern](query-pattern.md)`
  - Parent directory: `[Overview](../overview.md)`
  - Sibling directory: `[Permissions Concept](../concepts/permissions.md)`
  - Never use absolute paths: ~~`[Guide](/home/user/.claude/docs/agent-sdk/guide.md)`~~

#### Shared Component: Code Example Validation Script
- **What it is:** Automated script to validate all code blocks in documentation
- **Why it spans iterations:**
  - Iteration 2: Run validation before marking docs complete
  - Post-MVP: Run validation during documentation updates
- **Integration challenge:** Must extract code blocks from markdown, validate with appropriate tool
- **Solution:** Create validation script in iteration 2:
  ```bash
  # validate-docs.sh
  # Extract TypeScript code blocks, save to .ts files, run tsc --noEmit
  # Extract Python code blocks, save to .py files, run python -m py_compile
  # Report: "45/45 TypeScript examples valid, 40/40 Python examples valid"
  ```

### Potential Integration Challenges

#### Challenge 1: Harvest Completeness Verification
- **Description:** No authoritative way to know if we fetched ALL Agent SDK documentation pages
- **Why it matters:** Missing pages = incomplete documentation = builders still need external searches
- **Solution:**
  1. Manual sitemap review: Check https://docs.claude.com/en/api/agent-sdk/ for sitemap or navigation structure
  2. Recursive link following: Start at landing page, follow all internal links within /agent-sdk/ path
  3. Known section checklist: Verify coverage of expected sections (installation, quick start, API reference, examples, troubleshooting)
  4. URL logging: Save list of all fetched URLs to `~/.claude/docs/agent-sdk/.staging/fetched-urls.txt`
  5. Spot check: Manually verify 5-10 random pages exist in staging area
- **Testing:** Manual review of fetched URLs against official docs navigation; count of pages should match

#### Challenge 2: TypeScript vs Python Example Parity Tracking
- **Description:** Must ensure every example exists in both languages, or document why not
- **Why it matters:** Vision promises both languages; missing examples break that promise
- **Solution:**
  1. Example matrix: Create tracking document during iteration 2:
     ```markdown
     | Example | TypeScript | Python | Notes |
     |---------|------------|--------|-------|
     | simple-cli-agent | ✅ | ✅ | Both complete |
     | web-api-agent | ✅ | ✅ | TS uses Express, Python uses FastAPI |
     | stateful-chatbot | ✅ | ✅ | Both complete |
     | multi-tool-agent | ✅ | ✅ | Both complete |
     | mcp-server-agent | ✅ | ⚠️ | Python example simplified (MCP server creation different) |
     ```
  2. Acceptance criteria: All examples must have either ✅ for both or explicit ⚠️ note explaining difference
- **Testing:** Matrix complete with no empty cells; all ⚠️ cases documented

#### Challenge 3: Agent Prompt Token Budget Enforcement
- **Description:** Easy to accidentally exceed 50 token limit per agent during prompt updates
- **Why it matters:** Vision constraint: <150 tokens total across 3 agents
- **Solution:**
  1. Token counter: Use simple word count as proxy (1 word ≈ 1.3 tokens, so 40 words ≈ 50 tokens)
  2. Before-after comparison: Measure prompt length before and after additions
  3. Iterate on wording: If first draft exceeds 50 tokens, ruthlessly edit down
  4. Review checklist: Token count validation is required acceptance criteria for iteration 3
- **Testing:** Explicit token counting in iteration 3; reject if >150 total

#### Challenge 4: Documentation Discoverability by Agents
- **Description:** Even with prompt references, agents might not think to search docs at right moment
- **Why it matters:** Documentation must be discoverable WHEN builder needs it (not just THAT it exists)
- **Solution:**
  1. Keyword-based prompting: "When you see keywords ['agent', 'bot', 'assistant', 'chatbot', 'tool calling'], immediately consult `~/.claude/docs/agent-sdk/overview.md`"
  2. Decision tree in docs: overview.md has clear "When to use Agent SDK" section (agents read this to decide applicability)
  3. Explorer reinforcement: Explorer agent specifically trained to recognize Agent SDK use cases
  4. Builder workflow: Builder prompt includes: "Step 1: Check if vision mentions AI agent features → Step 2: If yes, read overview.md"
- **Testing:** Iteration 3 workflow tests specifically verify agents consult docs at appropriate times

#### Challenge 5: Code Example Syntax Validation Limitations
- **Description:** Syntax validation catches typos but not logic errors or incorrect API usage
- **Why it matters:** Examples might look correct but fail at runtime
- **Solution:**
  1. Accept limitation for MVP: Syntax validation is minimum viable quality bar
  2. Manual code review: Experienced developer reads all examples for logical correctness
  3. Source verification: Examples copied from official docs likely to work (trust official sources)
  4. Conservative examples: Keep examples simple to reduce logic error surface area
  5. Post-MVP execution testing: Plan should-have feature "Validation Testing" to execute examples with real API
- **Testing:** Manual code review is required step in iteration 2; add reviewer sign-off to acceptance criteria

---

## Recommendations for Master Plan

1. **Prioritize Iteration 1 quality over speed**
   - Harvest completeness is critical - cannot fix gaps retroactively without re-running entire iteration 2
   - Recommendation: Budget upper end of estimate (8 hours, not 6) for thorough systematic harvest
   - Success metric: Fetched URLs match official docs sitemap 1:1; no missing pages

2. **Implement feature parity matrix during Iteration 1**
   - Assess TypeScript vs Python feature parity during harvest phase
   - If significant gaps discovered, adjust expectations early (before writing structured docs)
   - Recommendation: Create `typescript-vs-python-features.md` matrix in iteration 1 staging area

3. **Accept syntax-only validation for MVP**
   - Cannot execute examples without Agent SDK API access during documentation phase
   - Recommendation: Defer execution testing to should-have features (vision already includes "Validation Testing")
   - Mitigation: Rigorous manual code review by experienced developer

4. **Design for documentation updates from day one**
   - Agent SDK will evolve; documentation will require periodic refresh
   - Recommendation: Include version metadata and source URLs in all files (enables future updates)
   - Structure: Keep staging area around for future re-harvests (don't delete after iteration 2)

5. **Test agent discovery mechanism thoroughly in Iteration 3**
   - Prompt references are unproven; might not trigger agent behavior as expected
   - Recommendation: Budget 2-3 hours for agent workflow testing (not just 1 hour)
   - Fallback: If discovery mechanism fails, iterate on prompt wording until effective

6. **Plan for post-MVP feedback loop**
   - Cannot anticipate all documentation needs without real-world usage
   - Recommendation: Add clear feedback mechanism to overview.md (e.g., "Found a gap? Report via GitHub issues")
   - Commit to quarterly documentation updates based on user feedback

7. **Consider documentation-only pre-release for validation**
   - Before full integration (iteration 3), share documentation with 2-3 developers for feedback
   - Recommendation: After iteration 2, share docs with beta users; collect feedback; fix gaps before iteration 3
   - Benefits: Catch confusing wording, missing examples, broken links before agent integration

---

## Technology Recommendations

### Existing Codebase Findings

**Stack detected:**
- Documentation format: Markdown (agents, commands, README all use markdown)
- Documentation location: `~/.claude/` global directory (agents, commands, lib)
- Agent system: Markdown files with embedded agent definitions (`.claude/agents/`)
- Read/Grep tools: Agents use Read and Grep to access documentation
- WebFetch tool: Available for web scraping (used in harvest phase)

**Patterns observed:**
- Markdown with frontmatter metadata (YAML header at top of files)
- Code blocks with language tags (```typescript, ```python, ```bash)
- Cross-references using relative paths ([Link](../path/file.md))
- File-based organization (clear directory structure, not database-backed)

**Opportunities:**
- Extend existing `~/.claude/docs/` pattern to include Agent SDK docs
- Leverage existing Read/Grep workflows (agents already know how to search docs)
- Use same markdown conventions as existing agent documentation (consistency)

**Constraints:**
- Vision requirement: "Must be in ~/.claude/docs/ (global, not project-specific)"
- Cannot bloat agent system prompts (token budget: <150 tokens total)
- Must stay synchronized with official Agent SDK docs (external dependency)
- No build step allowed (must be raw markdown, readable by Read tool)

### Greenfield Recommendations

**New components to create:**

1. **Documentation Harvester Script**
   - Language: Bash (consistent with 2L tooling)
   - Location: Temporary script (not part of final deliverable)
   - Purpose: Systematically fetch Agent SDK documentation pages
   - Implementation:
     ```bash
     # harvest-agent-sdk-docs.sh
     BASE_URL="https://docs.claude.com/en/api/agent-sdk"
     OUTPUT_DIR="~/.claude/docs/agent-sdk/.staging"

     # Fetch landing page
     # Extract all links to subpages
     # Recursively fetch subpages
     # Save with metadata (URL, fetch timestamp)
     ```

2. **Documentation Validation Script**
   - Language: Bash + TypeScript/Python tooling
   - Location: `~/.claude/docs/agent-sdk/validate-docs.sh`
   - Purpose: Validate all code examples and cross-references
   - Implementation:
     ```bash
     # validate-docs.sh
     # 1. Extract TypeScript code blocks from all .md files
     # 2. Create temporary .ts files
     # 3. Run tsc --noEmit on each file
     # 4. Repeat for Python code blocks with ast.parse
     # 5. Validate all markdown links resolve to existing files
     # 6. Report: X/Y examples valid, Z/W links valid
     ```

3. **Metadata Schema Definition**
   - Format: YAML frontmatter in each markdown file
   - Schema:
     ```yaml
     ---
     title: "File Title"
     description: "Brief description for search/discovery"
     last_updated: "2025-10-13"
     sdk_version: "1.2.0"
     language: "typescript|python|cross-language"
     difficulty: "beginner|intermediate|advanced"
     related_guides:
       - relative/path/to/related-doc.md
     source_url: "https://docs.claude.com/en/api/agent-sdk/original-page"
     ---
     ```

4. **Directory Structure**
   - Final structure (from vision):
     ```
     ~/.claude/docs/agent-sdk/
     ├── overview.md (What is Agent SDK, when to use it, core concepts)
     ├── quickstart.md (Installation, first agent, basic patterns)
     ├── troubleshooting.md (Common errors and solutions)
     ├── typescript/
     │   ├── setup.md
     │   ├── query-pattern.md
     │   ├── client-pattern.md
     │   ├── custom-tools.md
     │   ├── options.md
     │   └── streaming.md
     ├── python/
     │   ├── setup.md
     │   ├── query-pattern.md
     │   ├── client-pattern.md
     │   ├── custom-tools.md
     │   ├── options.md
     │   └── async-patterns.md
     ├── concepts/
     │   ├── permissions.md
     │   ├── mcp.md
     │   ├── hooks.md
     │   ├── tools.md
     │   ├── sessions.md
     │   └── cost-tracking.md
     └── examples/
         ├── simple-cli-agent.md
         ├── web-api-agent.md
         ├── stateful-chatbot.md
         ├── multi-tool-agent.md
         └── mcp-server-agent.md
     ```

5. **Agent Prompt Additions**
   - Format: Plain text additions to existing agent markdown files
   - Locations:
     - `~/.claude/agents/2l-explorer.md`
     - `~/.claude/agents/2l-planner.md`
     - `~/.claude/agents/2l-builder.md`
   - Constraint: <50 tokens each (<150 total)

**Technology Decisions:**

1. **Web Scraping Strategy**
   - **Decision:** Use WebFetch tool (built into 2L agent toolkit)
   - **Alternative:** Beautiful Soup (Python) - rejected (requires external dependency)
   - **Rationale:** WebFetch already available; no new dependencies; sufficient for static docs

2. **Code Validation Tools**
   - **TypeScript:** tsc --noEmit (TypeScript compiler in no-emit mode)
   - **Python:** ast.parse (built-in Python AST parser)
   - **Rationale:** Both are standard tools; no exotic dependencies; syntax-level validation sufficient for MVP

3. **Markdown Link Validation**
   - **Decision:** Custom bash script using grep and file existence checks
   - **Alternative:** markdown-link-check (npm package) - rejected (avoid Node.js dependency for docs)
   - **Rationale:** Simple relative path validation can be done with basic tools

4. **Documentation Format**
   - **Decision:** Pure Markdown with YAML frontmatter
   - **Alternative:** MDX (React-style docs) - rejected (requires build step, not readable by Read tool)
   - **Rationale:** Vision requirement for markdown; agents use Read tool to access raw markdown

---

## Notes & Observations

### Observation 1: This is a Knowledge Management Project, Not a Coding Project
The primary deliverable is high-quality documentation, not code. Success depends on:
- Completeness of harvest (external dependency)
- Clarity of writing (communication skill)
- Organization for discoverability (information architecture)

**Implication:** Traditional software development risks (bugs, regressions) are lower; documentation quality risks (gaps, staleness, confusing wording) are higher.

**Recommendation:** Allocate time for writing quality (clear explanations, tested examples) over code quantity.

### Observation 2: Official Documentation Quality is Uncontrolled Variable
Cannot control completeness or quality of https://docs.claude.com/en/api/agent-sdk/ documentation. If official docs are beta-quality or incomplete, structured docs inherit those limitations.

**Implication:** Project success partially dependent on external factor (official docs quality).

**Recommendation:** Early assessment (spot-check official docs) during iteration 1 to set realistic expectations. If official docs are sparse, document gaps explicitly and adjust project scope.

### Observation 3: Agent Discovery Mechanism is Unproven
Adding documentation references to agent prompts is untested. No guarantee agents will actually USE the documentation when implementing features.

**Implication:** Highest risk is documentation exists but goes unused (zero value delivered).

**Recommendation:** Iteration 3 workflow testing is CRITICAL. If agents don't naturally consult docs, iterate on prompt wording until effective. Consider stronger directives if needed.

### Observation 4: Post-MVP Documentation Maintenance Required
Agent SDK will update over time; documentation will become stale within 6-12 months. One-time documentation project requires ongoing maintenance commitment.

**Implication:** This is not "build once, done forever" - requires periodic refresh.

**Recommendation:** Vision already includes "Update Mechanism" in should-have features. Commit to quarterly documentation review and updates. Consider automated change detection (bookmark official docs, check for updates).

### Observation 5: Feature Parity Between TypeScript and Python is Unknown
Vision assumes both languages supported, but actual feature parity is uncertain until harvest phase. If Python SDK significantly lags TypeScript, documentation strategy must adapt.

**Implication:** Cannot guarantee equal quality documentation for both languages until iteration 1 complete.

**Recommendation:** Create feature matrix during iteration 1 harvest. If parity gaps found, adjust iteration 2 scope (focus on primary language, document gaps for secondary language).

### Observation 6: Syntax Validation is Minimum Viable Quality Bar
Cannot execution-test examples without Agent SDK API keys. Relying on syntax validation only (catches typos, not logic errors).

**Implication:** Examples might be syntactically correct but functionally broken. Risk of broken examples damaging builder trust.

**Recommendation:** Mitigate with rigorous manual code review. Keep examples simple (reduce logic error surface area). Plan execution testing in should-have features.

### Observation 7: Token Budget Constraint is Tight
Vision requires <50 tokens per agent prompt addition. This is approximately 35-40 words. Very limited space to convey how/when to use documentation.

**Implication:** Prompt additions must be extremely concise; might not provide sufficient guidance.

**Recommendation:** Optimize every word. Use file paths as self-explanatory signals (agent-sdk conveys purpose). Defer detailed guidance to overview.md (agents read that for full context).

### Observation 8: Documentation Benefits All Future 2L Projects
Once created, Agent SDK documentation benefits every future 2L project that needs AI agent capabilities. High leverage investment.

**Implication:** Even if initial agent discovery mechanism is imperfect, documentation value compounds over time as agents improve.

**Recommendation:** Invest in documentation quality (clarity, completeness, examples) - it's a reusable asset, not one-time project deliverable.

---

*Exploration completed: 2025-10-13T00:45:00Z*
*This report informs master planning decisions*
