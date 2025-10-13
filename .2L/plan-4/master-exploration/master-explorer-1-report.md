# Master Exploration Report

## Explorer ID
master-explorer-1

## Focus Area
Architecture & Complexity Analysis

## Vision Summary
Integrate comprehensive Claude Agent SDK documentation into 2L's local knowledge base, enabling 2L agents to naturally build AI agent applications without external documentation lookups.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 8 must-have features
  1. Comprehensive Web Documentation Harvest (fetch all Agent SDK docs)
  2. Structured Documentation Library Creation (~/.claude/docs/agent-sdk/)
  3. TypeScript Implementation Guides (6 guide files)
  4. Python Implementation Guides (6 guide files)
  5. Conceptual Guides - Cross-Language (6 concept files)
  6. Working Examples Collection (5+ example files, both TS and Python)
  7. Agent Discovery Integration (prompt updates for 3 agents)
  8. Troubleshooting Guide (common issues + solutions)
- **User stories/acceptance criteria:** 49 acceptance criteria across 8 feature areas
- **Total documentation files to create:** 30-35 markdown files
- **Agent prompts to update:** 3 files (2l-explorer.md, 2l-planner.md, 2l-builder.md)
- **Estimated total work:** 20-28 hours

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **35+ documentation files:** Comprehensive knowledge harvesting and organization across multiple documentation layers (overview, quickstart, language-specific, conceptual, examples, troubleshooting)
- **Dual-language coverage:** Must extract and document both TypeScript and Python SDKs with feature parity validation
- **Web scraping complexity:** Requires systematic navigation of https://docs.claude.com/en/api/agent-sdk/ and all subpages with complete extraction (not just summaries)
- **Knowledge synthesis required:** Raw documentation must be reorganized into agent-friendly formats with cross-references, searchable structure, and copy-paste examples
- **Integration with existing agent system:** Must update 3 agent prompts with references while avoiding content duplication (keep under 150 tokens total)
- **Quality requirements:** All code examples must be syntactically valid, runnable, and include all necessary imports/setup
- **Maintenance considerations:** Documentation structure must support future updates when SDK evolves

---

## Architectural Analysis

### Major Components Identified

1. **Documentation Harvesting System**
   - **Purpose:** Extract all Agent SDK documentation from official sources via WebFetch
   - **Complexity:** HIGH
   - **Why critical:** Foundation for entire system - incomplete harvesting means missing features when builders need them. Must capture not just API references but also "Pro tips", warnings, edge cases, and troubleshooting from official docs.
   - **Sub-components:**
     - Web scraping strategy for https://docs.claude.com/en/api/agent-sdk/
     - Navigation link following to capture all subpages
     - TypeScript SDK complete extraction
     - Python SDK complete extraction
     - Code example preservation (verbatim, not paraphrased)
     - Configuration options documentation
     - Best practices and gotchas extraction

2. **Documentation Library Structure**
   - **Purpose:** Organize harvested knowledge into `~/.claude/docs/agent-sdk/` with clear hierarchy
   - **Complexity:** MEDIUM
   - **Why critical:** Structure determines discoverability - agents will use Read and Grep tools to find relevant docs. Poor organization means builders waste time searching or miss critical information.
   - **Directory hierarchy:**
     ```
     ~/.claude/docs/agent-sdk/
     ├── overview.md (what, when, core concepts)
     ├── quickstart.md (installation, first agent, basic patterns)
     ├── typescript/ (6 files: setup, query-pattern, client-pattern, custom-tools, options, streaming)
     ├── python/ (6 files: setup, query-pattern, client-pattern, custom-tools, options, async-patterns)
     ├── concepts/ (6 files: permissions, mcp, hooks, tools, sessions, cost-tracking)
     ├── examples/ (5+ files: cli-agent, web-api-agent, stateful-chatbot, multi-tool-agent, mcp-server-agent)
     └── troubleshooting.md (common errors, solutions, prevention)
     ```

3. **Language-Specific Implementation Guides**
   - **Purpose:** Provide complete TypeScript and Python patterns for all SDK features
   - **Complexity:** HIGH
   - **Why critical:** Builders need language-specific examples that match their chosen stack. Generic documentation forces builders to translate concepts, introducing errors. Must include package.json/requirements.txt examples, import patterns, type annotations, and idiomatic usage.
   - **TypeScript guides (6 files):**
     - setup.md: Installation, tsconfig, dependencies
     - query-pattern.md: Stateless query() usage
     - client-pattern.md: Stateful ClaudeSDKClient with conversations
     - custom-tools.md: Tool creation with Zod schemas
     - options.md: Complete Options interface
     - streaming.md: Async iterables, message streaming
   - **Python guides (6 files):**
     - setup.md: Virtual env, requirements.txt
     - query-pattern.md: Stateless query() with async/await
     - client-pattern.md: Stateful ClaudeSDKClient
     - custom-tools.md: @tool decorator, type hints
     - options.md: ClaudeAgentOptions reference
     - async-patterns.md: Async iteration, message handling

4. **Conceptual Documentation Layer**
   - **Purpose:** Framework-agnostic explanations of key Agent SDK concepts
   - **Complexity:** MEDIUM
   - **Why critical:** Some concepts (permissions, MCP, hooks) transcend language choice. Cross-language docs prevent duplication and ensure consistency. Builders need to understand WHEN to use features, not just HOW.
   - **Concept files (6 files):**
     - permissions.md: All permission modes, security implications, when to use each
     - mcp.md: Model Context Protocol integration, server setup, use cases
     - hooks.md: Event handling, pre/post tool use, interruption patterns
     - tools.md: Built-in tools overview, custom tool patterns, best practices
     - sessions.md: State management, conversation continuity
     - cost-tracking.md: Token usage monitoring, optimization strategies

5. **Working Examples Collection**
   - **Purpose:** Complete, runnable example applications demonstrating common patterns
   - **Complexity:** MEDIUM-HIGH
   - **Why critical:** Builders prefer copy-paste examples over reading documentation. Each example must include problem description, full code, setup steps, and expected output. Must cover both TypeScript AND Python for each use case.
   - **Example applications (5+ patterns × 2 languages = 10+ files):**
     - simple-cli-agent: Basic CLI with 1-2 custom tools
     - web-api-agent: Express/FastAPI backend with agent endpoints
     - stateful-chatbot: Conversation memory, multi-turn interactions
     - multi-tool-agent: Complex agent with 5+ custom tools
     - mcp-server-agent: Custom MCP server integration
   - **Quality requirements:** All examples must be syntactically valid, include all imports, and run without modification

6. **Agent System Integration**
   - **Purpose:** Update 2L agent prompts to reference new documentation without bloating prompts
   - **Complexity:** LOW
   - **Why critical:** If agents don't know docs exist, they won't use them. Must add references to 3 agent prompts (explorer, planner, builder) while staying under 150 tokens total (50 per agent). NO content duplication - only pointer to docs location.
   - **Prompt updates:**
     - 2l-explorer.md: "When vision mentions AI agents, assistants, or chatbots, note that Agent SDK documentation is available at `~/.claude/docs/agent-sdk/overview.md`"
     - 2l-planner.md: "For AI agent features, consider Claude Agent SDK - see `~/.claude/docs/agent-sdk/` for implementation guidance"
     - 2l-builder.md: "To implement Agent SDK features, reference `~/.claude/docs/agent-sdk/` - start with overview.md, then check language-specific guides"

7. **Troubleshooting Knowledge Base**
   - **Purpose:** Document common errors, symptoms, causes, solutions, and prevention strategies
   - **Complexity:** MEDIUM
   - **Why critical:** Reduces healer workload and accelerates debugging. Each issue must follow structure: symptom → cause → solution → prevention. Covers auth issues, permission errors, tool failures, context overflow, dependency conflicts.
   - **Structure in troubleshooting.md:**
     - Authentication issues and solutions
     - Permission errors and how to resolve
     - Tool execution failures
     - Context overflow handling
     - Dependency conflicts
     - Each issue: symptom, cause, solution, prevention

### Technology Stack Implications

**Existing Codebase Analysis**
- **Codebase type:** Brownfield - extending existing 2L system
- **Stack detected:** Bash orchestration + Markdown agent prompts + file-based knowledge
- **Installation location:** `~/.claude/` (global, not project-specific)
- **Access patterns:** Agents use Read and Grep tools to search docs
- **Constraints:**
  - Must work with Claude Code as execution environment
  - No external dependencies beyond WebFetch for initial harvest
  - Documentation must be pure markdown (no special tooling)
  - Cannot bloat agent prompts (references only, <150 tokens total)

**Documentation Format Decision**
- **Options:** HTML, PDF, JSON, Markdown, MDX
- **Recommendation:** Pure Markdown with standard formatting
- **Rationale:**
  - Read tool natively supports markdown
  - Grep tool can search markdown content easily
  - Syntax highlighting via code fences (```typescript, ```python)
  - Cross-references via relative links
  - No build step or special rendering needed
  - Humans can read/edit if manual updates needed

**Web Harvesting Strategy**
- **Options:** Manual copy-paste, WebFetch + manual organization, automated scraping
- **Recommendation:** WebFetch for extraction + manual organization/synthesis
- **Rationale:**
  - WebFetch tool can access https://docs.claude.com/en/api/agent-sdk/
  - Official docs are authoritative source of truth
  - Manual organization ensures agent-friendly structure
  - Allows adding cross-references and navigation aids
  - Enables quality control on code examples
  - Can add context that official docs may lack

**Knowledge Organization Pattern**
- **Approach:** Hierarchical directory structure with clear separation of concerns
- **Navigation:** Each doc has "Prerequisites" and "Next Steps" sections
- **Searchability:** Clear filenames (setup.md not ts-install.md), consistent headers
- **Cross-referencing:** Relative links between related docs
- **Discoverability:** overview.md serves as entry point and table of contents

---

## Iteration Breakdown Recommendation

### Recommendation: MULTI-ITERATION (3 phases)

**Rationale:**
- 35+ documentation files cannot be created in single iteration (8+ hour limit per iteration)
- Natural separation: documentation harvest → TypeScript docs → Python docs
- Each iteration delivers standalone value (can stop after iteration 1 or 2 if needed)
- Enables validation of documentation quality before expanding
- Allows testing agent discovery after iteration 1 to validate approach
- Total 20-28 hours work: roughly 7-9 hours per iteration
- Different risk profiles per iteration (harvest=HIGH, TS/Python=MEDIUM, integration=LOW)

---

### Suggested Iteration Phases

**Iteration 1: Foundation (Harvest + Structure + TypeScript)**
- **Vision:** Establish documentation foundation with complete TypeScript coverage and core examples
- **Scope:** Documentation infrastructure + TypeScript complete
  - Create `~/.claude/docs/agent-sdk/` directory structure
  - Write overview.md (what Agent SDK is, when to use, core concepts)
  - Write quickstart.md (installation, first agent, basic patterns)
  - Create typescript/ directory with 6 complete guides:
    - setup.md, query-pattern.md, client-pattern.md
    - custom-tools.md, options.md, streaming.md
  - Create concepts/ directory with 6 cross-language guides:
    - permissions.md, mcp.md, hooks.md
    - tools.md, sessions.md, cost-tracking.md
  - Create examples/ directory with 5+ examples (TypeScript versions only):
    - simple-cli-agent.md, web-api-agent.md, stateful-chatbot.md
    - multi-tool-agent.md, mcp-server-agent.md
  - Create troubleshooting.md with common errors and solutions
  - Update 2l-explorer.md prompt with doc reference (<50 tokens)
  - **Files created:** 20-22 markdown files
  - **Files modified:** 1 agent prompt (2l-explorer.md)
- **Why first:** Establishes complete documentation structure and validates approach with TypeScript. TypeScript is primary SDK implementation. Creates all foundational files (overview, quickstart, concepts, troubleshooting) that Python iteration will reference. Enables testing agent discovery immediately.
- **Estimated duration:** 9-11 hours
  - Web harvesting: 2-3 hours (systematic navigation + extraction)
  - Documentation organization: 4-5 hours (create structure, write guides)
  - Example creation: 2-3 hours (5+ working examples with full code)
  - Validation: 1 hour (check syntax, test cross-references)
- **Risk level:** HIGH
  - Risk: Incomplete web harvesting (missing SDK features)
    - Mitigation: Systematic navigation of all subpages, checklist verification
  - Risk: Documentation structure doesn't work for agents
    - Mitigation: Test with Read/Grep tools, ensure searchability
  - Risk: Code examples have syntax errors or missing imports
    - Mitigation: Validate all TypeScript examples can compile
  - Risk: Cross-references break or link to non-existent files
    - Mitigation: Test all relative links after creation
- **Success criteria:**
  - All TypeScript SDK features documented
  - All concept files complete (cross-language)
  - 5+ working TypeScript examples with full code
  - overview.md and quickstart.md provide clear entry points
  - troubleshooting.md covers common errors
  - 2l-explorer.md references docs location
  - Read tool can access all files
  - Grep tool can search across documentation
  - All code examples are syntactically valid

**Iteration 2: Python Implementation Coverage**
- **Vision:** Complete Python SDK documentation with feature parity to TypeScript
- **Scope:** Python-specific guides and examples
  - Create python/ directory with 6 complete guides:
    - setup.md (virtual env, requirements.txt, pip install)
    - query-pattern.md (stateless query() with async/await)
    - client-pattern.md (stateful ClaudeSDKClient)
    - custom-tools.md (@tool decorator, type hints, schemas)
    - options.md (ClaudeAgentOptions complete reference)
    - async-patterns.md (async iteration, message handling)
  - Create Python versions of all 5+ examples:
    - simple-cli-agent.md (Python), web-api-agent.md (Python)
    - stateful-chatbot.md (Python), multi-tool-agent.md (Python)
    - mcp-server-agent.md (Python)
  - Update existing examples/ files to include both TS and Python sections
  - Validate feature parity between TS and Python docs
  - Update 2l-planner.md prompt with doc reference (<50 tokens)
  - **Files created:** 11 markdown files (6 guides + 5 examples)
  - **Files modified:** 5 existing example files (add Python sections) + 1 agent prompt
- **Dependencies:**
  - Requires: Documentation structure from iteration 1
  - References: concepts/ docs from iteration 1 (cross-language)
  - Imports: overview.md and quickstart.md mention both languages
  - Extends: examples/ directory with Python implementations
- **Estimated duration:** 7-9 hours
  - Python guide writing: 3-4 hours (6 comprehensive guides)
  - Python examples: 3-4 hours (5+ working examples)
  - Feature parity validation: 1 hour (ensure no gaps)
  - Prompt update: 0.5 hours
- **Risk level:** MEDIUM
  - Risk: Python SDK has different features than TypeScript
    - Mitigation: Consult official docs for Python-specific patterns
  - Risk: Async/await patterns unclear for Python developers
    - Mitigation: Include clear async-patterns.md with examples
  - Risk: Examples don't run or have dependency issues
    - Mitigation: Test Python examples with requirements.txt
- **Success criteria:**
  - All Python SDK features documented
  - Feature parity with TypeScript documentation
  - 5+ working Python examples with full code
  - All Python examples include requirements.txt
  - Async/await patterns clearly explained
  - 2l-planner.md references docs location
  - Agents can choose TS or Python based on project needs

**Iteration 3: Integration & Validation**
- **Vision:** Complete agent system integration and validate documentation quality
- **Scope:** Agent prompt updates + comprehensive testing
  - Update 2l-builder.md prompt with doc reference (<50 tokens)
  - Add metadata to all documentation files:
    - "Last updated" timestamps
    - SDK version compatibility notes
    - Cross-reference links verification
  - Create navigation aids:
    - Update overview.md with complete table of contents
    - Add "Related docs" sections to all guides
    - Ensure "Prerequisites" and "Next Steps" in all docs
  - Validation testing:
    - Test agent discovery: Does explorer find docs for "build a chatbot" vision?
    - Test agent building: Can builder create CLI agent using only local docs?
    - Test documentation searchability: Can agents grep for "custom tool" and find relevant guides?
    - Test example runnability: Do all examples execute without modification?
  - Create post-MVP enhancements list:
    - Version tracking system design
    - Update mechanism proposal
    - Extended examples ideas
    - Healer integration notes
  - **Files created:** 1 post-mvp enhancement doc
  - **Files modified:** 35+ docs (metadata additions) + 1 agent prompt (2l-builder.md)
- **Dependencies:**
  - Requires: Complete TypeScript docs (iteration 1)
  - Requires: Complete Python docs (iteration 2)
  - Validates: Entire documentation system end-to-end
  - Prepares: Agent system for production use
- **Estimated duration:** 4-6 hours
  - Builder prompt update: 0.5 hours
  - Metadata additions: 1-2 hours (35+ files)
  - Navigation aids: 1 hour (cross-references, TOC)
  - Validation testing: 2-3 hours (explorer, builder, grep tests)
  - Post-MVP planning: 0.5 hours
- **Risk level:** LOW
  - Risk: Agents don't actually use documentation
    - Mitigation: Test with real vision ("build chatbot") and observe agent behavior
  - Risk: Documentation gaps discovered during testing
    - Mitigation: Note gaps for future iteration, don't block on perfection
  - Risk: Prompt updates break existing agent behavior
    - Mitigation: Keep updates minimal (<50 tokens), test with existing tasks
- **Success criteria:**
  - All 3 agent prompts reference docs (<150 tokens total)
  - Explorer identifies Agent SDK opportunity from test vision
  - Builder successfully creates Agent SDK app using only local docs
  - All cross-references resolve correctly
  - All examples run without modification
  - Metadata present on all documentation files
  - Navigation aids make docs easily discoverable
  - Post-MVP enhancement plan documented

---

## Dependency Graph

```
Iteration 1: Foundation (Harvest + Structure + TypeScript)
├── Web Harvesting (WebFetch all official docs)
│   ├── https://docs.claude.com/en/api/agent-sdk/ (root)
│   ├── TypeScript SDK pages (all subpages)
│   ├── Python SDK pages (all subpages)
│   ├── Code examples (verbatim extraction)
│   └── Troubleshooting sections
├── Documentation Structure
│   ├── ~/.claude/docs/agent-sdk/ (root directory)
│   ├── overview.md (entry point)
│   ├── quickstart.md (getting started)
│   ├── typescript/ (6 guides)
│   ├── concepts/ (6 cross-language)
│   ├── examples/ (5+ TS examples)
│   └── troubleshooting.md
└── Agent Integration (2l-explorer.md update)
    ↓
Iteration 2: Python Implementation Coverage
├── Python Guides (6 files in python/)
│   ├── Depends on: concepts/ from iteration 1
│   ├── References: overview.md, quickstart.md
│   └── Mirrors: TypeScript structure for consistency
├── Python Examples (5+ implementations)
│   ├── Depends on: examples/ structure from iteration 1
│   └── Ensures: Same use cases as TypeScript
├── Feature Parity Validation
│   ├── Compares: TS vs Python documentation
│   └── Identifies: Any gaps or differences
└── Agent Integration (2l-planner.md update)
    ↓
Iteration 3: Integration & Validation
├── Agent Integration Complete (2l-builder.md update)
├── Metadata Enrichment (35+ files)
│   ├── Depends on: All docs from iterations 1 & 2
│   └── Adds: Timestamps, version info, cross-refs
├── Navigation Aids (TOC, prerequisites, next steps)
│   ├── Depends on: Complete documentation set
│   └── Improves: Discoverability and flow
├── End-to-End Testing
│   ├── Tests: Explorer discovery (iteration 1 update)
│   ├── Tests: Planner tech stack (iteration 2 update)
│   ├── Tests: Builder implementation (iteration 3 update)
│   └── Validates: All examples, all cross-references
└── Post-MVP Planning (future enhancements)
```

**Critical Path:**
1. Web harvesting (iteration 1) is foundation for everything
2. TypeScript docs (iteration 1) establish structure for Python docs (iteration 2)
3. concepts/ directory (iteration 1) is referenced by both language-specific docs
4. examples/ structure (iteration 1) is extended in iteration 2
5. Agent prompt updates (iterations 1-3) are sequential, cumulative
6. Validation (iteration 3) requires complete docs from iterations 1 & 2

**Parallelization Opportunities:**
- Within iteration 1: TypeScript guides and examples can be written in parallel
- Within iteration 2: Python guides and examples can be written in parallel
- Across iterations: Cannot parallelize - each depends on previous

---

## Risk Assessment

### High Risks

- **Incomplete Web Harvesting (Missing SDK Features)**
  - **Impact:** Builders encounter SDK features not documented locally, must fall back to WebFetch, defeating purpose of this project
  - **Mitigation:**
    - Systematic navigation of all https://docs.claude.com/en/api/agent-sdk/ subpages
    - Create checklist of expected SDK features before harvesting
    - Compare extracted docs against SDK changelog/release notes
    - Test with diverse use cases in iteration 3 validation
  - **Recommendation:** Dedicate 2-3 hours in iteration 1 to thorough harvesting with verification checklist

- **Documentation Structure Doesn't Serve Agents**
  - **Impact:** Agents struggle to find relevant information despite docs existing, continue using WebFetch, poor developer experience
  - **Mitigation:**
    - Test with Read/Grep tools during iteration 1
    - Ensure clear filenames that match likely search terms
    - Add comprehensive cross-references
    - Include table of contents in overview.md
    - Validate searchability with test queries
  - **Recommendation:** Test discoverability in iteration 1 before expanding to Python docs

- **Code Examples Have Errors or Missing Dependencies**
  - **Impact:** Builders copy examples that don't run, lose trust in documentation, manual debugging required
  - **Mitigation:**
    - Extract examples verbatim from official docs (tested by Anthropic)
    - Add explicit imports and setup sections
    - Include package.json/requirements.txt snippets
    - Validate TypeScript syntax in iteration 1
    - Test Python examples can run in iteration 2
  - **Recommendation:** Budget time for example validation (1 hour iteration 1, 1 hour iteration 2)

### Medium Risks

- **Feature Parity Between TypeScript and Python SDKs**
  - **Impact:** Documentation implies features exist in both languages, but one SDK lacks capabilities, builders hit dead ends
  - **Mitigation:**
    - Consult official docs for language-specific notes
    - Mark Python-only or TypeScript-only features clearly
    - Test both implementations in iteration 3
    - Include "Language Differences" section in overview.md if needed
  - **Recommendation:** Validate parity explicitly in iteration 2

- **Agent Prompt Updates Break Existing Behavior**
  - **Impact:** Agents change behavior unexpectedly, existing tasks fail, regression in system stability
  - **Mitigation:**
    - Keep updates minimal (<50 tokens per agent)
    - Add references only, no content duplication
    - Test with existing tasks before and after updates
    - Use conditional language ("if vision mentions AI agents, consider...")
  - **Recommendation:** Test each prompt update independently in iterations 1-3

- **Cross-References Break or Link to Wrong Docs**
  - **Impact:** Agents follow links to 404s or wrong content, navigation broken, frustrating experience
  - **Mitigation:**
    - Use relative links consistently (./concepts/permissions.md)
    - Test all links after file creation
    - Create validation script in iteration 3
    - Fix broken links before iteration completion
  - **Recommendation:** Include link validation in iteration 3 testing

- **Documentation Becomes Stale (SDK Updates)**
  - **Impact:** Docs reflect old SDK version, builders use deprecated patterns, new features missing
  - **Mitigation:**
    - Add "Last updated" and "SDK version" to all files
    - Create post-MVP update process design
    - Note manual refresh required initially
    - Consider automation in future iteration
  - **Recommendation:** Accept manual updates for MVP, design update mechanism in iteration 3

### Low Risks

- **Agents Ignore Documentation (Prefer WebFetch)**
  - **Impact:** Effort wasted, agents continue external lookups despite local docs
  - **Mitigation:** Test in iteration 3 validation with real vision
  - **Likelihood:** Low (agents prefer fast local access over slow WebFetch)

- **Prompt Bloat (Exceeding 150 Token Budget)**
  - **Impact:** Agent prompts become long, context window pressure, slower performance
  - **Mitigation:** Hard limit at 50 tokens per agent, just references
  - **Likelihood:** Very low (references are ~30 tokens each)

- **Documentation Directory Permission Issues**
  - **Impact:** Agents cannot read ~/.claude/docs/ directory
  - **Mitigation:** Test file access in iteration 1, ensure standard permissions
  - **Likelihood:** Low (same directory pattern as agents/, commands/)

---

## Integration Considerations

### Cross-Phase Integration Points

- **Directory Structure (Established in Iteration 1, Extended in Iterations 2-3)**
  - Iteration 1: Creates typescript/, concepts/, examples/ directories
  - Iteration 2: Adds python/ directory, extends examples/
  - Iteration 3: Adds metadata to all files
  - **Strategy:** Design complete structure in iteration 1, stick to it in iterations 2-3

- **Overview.md (Entry Point, Updated Across Iterations)**
  - Iteration 1: Initial version with TypeScript focus
  - Iteration 2: Updated to mention Python equally
  - Iteration 3: Enhanced with complete table of contents
  - **Strategy:** Maintain clear sections, append rather than rewrite

- **Examples Directory (Incremental Expansion)**
  - Iteration 1: TypeScript examples only (5+ files)
  - Iteration 2: Add Python sections to existing example files
  - Iteration 3: Add metadata and validation notes
  - **Strategy:** Each example file contains both TS and Python implementations

- **Agent Prompt Updates (Sequential, Cumulative)**
  - Iteration 1: 2l-explorer.md (discovery phase)
  - Iteration 2: 2l-planner.md (planning phase)
  - Iteration 3: 2l-builder.md (building phase)
  - **Strategy:** Test each update independently, ensure <50 tokens each

### Potential Integration Challenges

- **Web Harvesting Inconsistencies**
  - Challenge: Official docs may have inconsistent structure or incomplete sections
  - Solution: Normalize during extraction, fill gaps with cross-referencing to official docs for deep dives
  - Iteration: Address in iteration 1 during harvesting

- **TypeScript vs Python Documentation Drift**
  - Challenge: Maintaining consistency between two language implementations
  - Solution: Use identical file structure (python/ mirrors typescript/), same section headers, parallel examples
  - Iteration: Validate consistency in iteration 2

- **Cross-Reference Link Management**
  - Challenge: Links break when file structure changes or files renamed
  - Solution: Use relative paths consistently, test links in iteration 3, create validation script
  - Iteration: Final link validation in iteration 3

- **Agent Discovery May Not Work**
  - Challenge: Agents may not recognize when Agent SDK is appropriate
  - Solution: Test with diverse visions in iteration 3, refine prompt references if needed
  - Iteration: Validate and adjust in iteration 3

---

## Recommendations for Master Plan

1. **Use 3-iteration approach with clear boundaries**
   - Iteration 1: Foundation + TypeScript (complete documentation infrastructure)
   - Iteration 2: Python coverage (feature parity)
   - Iteration 3: Integration + validation (agent system integration and testing)
   - Each iteration delivers standalone value
   - Can stop after iteration 1 if time-constrained (TypeScript-only is still valuable)

2. **Prioritize web harvesting quality in iteration 1**
   - Dedicate 2-3 hours to systematic extraction
   - Create verification checklist of expected SDK features
   - Capture code examples verbatim (don't paraphrase)
   - Extract troubleshooting sections completely
   - Test documentation structure before expanding

3. **Validate documentation usability early**
   - Test Read/Grep access in iteration 1
   - Verify searchability with test queries
   - Check code example syntax before iteration 2
   - Ensure cross-references work before iteration 3
   - This prevents wasted effort if structure doesn't work

4. **Keep agent prompt updates minimal**
   - Hard limit: <50 tokens per agent, <150 tokens total
   - References only, no content duplication
   - Test each update independently
   - Validate existing tasks still work after updates
   - Roll back if any regressions detected

5. **Design for future maintainability**
   - Add "Last updated" to all files from start
   - Note SDK version compatibility
   - Design update mechanism in iteration 3
   - Accept manual refresh for MVP
   - Plan automation in post-MVP enhancement list

6. **Consider iteration 2 as optional but valuable**
   - TypeScript-only docs (iteration 1) serve many users
   - Python coverage (iteration 2) achieves feature parity
   - If time-constrained, defer iteration 2 to future plan
   - If proceeding, validate parity rigorously

---

## Technology Recommendations

### Existing Codebase Findings

- **Stack detected:**
  - Bash orchestration commands in `~/.claude/commands/`
  - Markdown agent definitions in `~/.claude/agents/`
  - File-based knowledge management (implied by vision)
  - Read and Grep tools for documentation access

- **Patterns observed:**
  - Global installation in `~/.claude/` (not project-specific)
  - Markdown is primary format for agent-readable content
  - Agent prompts are self-contained markdown files
  - Documentation directory pattern: `~/.claude/docs/`

- **Opportunities:**
  - Establish `docs/` directory as standard pattern for future frameworks
  - Agent SDK is first, but could expand to tRPC, Prisma, Next.js, etc.
  - Reusable documentation harvesting approach for other tools
  - Template for knowledge integration into 2L system

- **Constraints:**
  - Must work with Claude Code as execution environment
  - No external dependencies beyond WebFetch (for initial harvest)
  - Cannot bloat agent prompts (references only)
  - Documentation must be searchable via Grep tool
  - Must stay synchronized manually (no automation for MVP)

### Key Technology Decisions

**Documentation Format:**
- Pure Markdown with code fences
- Syntax highlighting: ```typescript and ```python
- Cross-references: Relative links (./concepts/permissions.md)
- Metadata: YAML frontmatter or comment block
- Navigation: "Prerequisites" and "Next Steps" sections

**Directory Structure:**
- Root: `~/.claude/docs/agent-sdk/`
- Language-specific: `typescript/`, `python/`
- Cross-language: `concepts/`
- Examples: `examples/` (combined TS + Python in same files)
- Entry points: `overview.md`, `quickstart.md`
- Troubleshooting: `troubleshooting.md` at root

**Web Harvesting Approach:**
- Tool: WebFetch for official docs
- Source: https://docs.claude.com/en/api/agent-sdk/
- Process: Manual navigation + extraction + organization
- Quality: Verbatim code examples, preserve warnings
- Synthesis: Add cross-references, reorganize for agents

**Agent Integration:**
- Method: Minimal prompt updates (references only)
- Format: Single line per agent, <50 tokens
- Placement: In existing prompt sections (not new sections)
- Testing: Validate with existing tasks before/after

**Validation Strategy:**
- Syntax: Check TypeScript/Python examples can compile
- Links: Test all cross-references resolve
- Searchability: Grep for key terms, verify relevant results
- Usability: Test builder creates app using only local docs
- Completeness: Compare against official docs checklist

---

## Notes & Observations

- **Knowledge base pattern:** This project establishes a reusable pattern for integrating external documentation into 2L. Once proven with Agent SDK, can expand to other frameworks (tRPC, Prisma, Next.js patterns, etc.). The `~/.claude/docs/` directory could become a comprehensive knowledge library.

- **Strategic value beyond immediate use:** Even if no users build Agent SDK apps immediately, this demonstrates 2L can integrate domain-specific knowledge. This is meta-capability that enhances 2L's long-term value.

- **Web harvesting is critical phase:** Quality of iteration 1 web harvesting determines entire project success. Incomplete extraction means builders fall back to WebFetch, defeating purpose. Budget adequate time (2-3 hours) for systematic, thorough harvesting with verification.

- **Documentation structure for agents, not humans:** While docs must be human-readable, primary audience is agents using Read/Grep tools. This means clear filenames, consistent section headers, searchable keywords are more important than prose style.

- **Example quality is trust signal:** If first example a builder copies doesn't run, they lose trust in entire documentation system. All examples must be syntactically valid, include all imports, and execute without modification. This is worth dedicated validation time.

- **TypeScript-first is pragmatic:** Most Agent SDK usage is TypeScript. Python coverage is valuable but secondary. Iteration 1 (TS-only) delivers significant value even without iteration 2. This allows flexible stopping point if time-constrained.

- **Prompt updates are low-risk, high-value:** Adding 150 tokens of references across 3 agent prompts is minimal impact but unlocks entire documentation system. This is high ROI change that should succeed easily.

- **Manual updates are acceptable for MVP:** Vision notes update mechanism is post-MVP. For initial version, manual refresh when SDK updates is reasonable. Automation can be added later once pattern proven.

- **Testing agent discovery is crucial:** Iteration 3 must test whether explorer actually recognizes "build a chatbot" as Agent SDK opportunity. If not, prompt references need refinement. This validates entire integration approach.

- **File count is manageable:** 35+ files sounds like many, but each is focused documentation (not large codebases). Iteration 1 creates ~22 files (9-11 hours), iteration 2 adds ~11 files (7-9 hours), iteration 3 enhances existing (4-6 hours). This is reasonable scope.

- **Dependency on official docs:** This project assumes https://docs.claude.com/en/api/agent-sdk/ is stable and comprehensive. If official docs are incomplete or in flux, this project becomes harder. Should verify official docs exist and are reasonably complete before starting iteration 1.

- **Opportunity for community contribution:** Post-MVP, could accept community-contributed examples or patterns. This would enrich knowledge base over time. Vision mentions this in "Could-Have" section.

---

*Exploration completed: 2025-10-13T10:45:00Z*
*This report informs master planning decisions*
