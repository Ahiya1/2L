# Project Vision: 2L Agent SDK Knowledge Integration

**Created:** 2025-10-13T00:00:00Z
**Plan:** plan-4

---

## Problem Statement

2L agents currently lack knowledge about the Claude Agent SDK, preventing them from building applications with integrated AI agent capabilities. When users request features like "build an AI assistant" or "create a chatbot that can execute commands," 2L cannot naturally scaffold or implement Agent SDK-based solutions.

**Current pain points:**
- No awareness of Agent SDK as a solution pattern
- Cannot scaffold Agent SDK projects (TypeScript or Python)
- No reference material for custom tool creation, permission modes, or MCP integration
- Builders must rely on external documentation lookups (slow, inconsistent)
- Users must explicitly provide Agent SDK code examples

---

## Target Users

**Primary user:** 2L system agents (explorers, planners, builders)
- Need reliable, comprehensive reference material
- Require quick access to implementation patterns
- Must understand when Agent SDK is appropriate

**Secondary users:** 2L end users (developers)
- Want to build AI-powered applications effortlessly
- Expect 2L to recognize Agent SDK use cases
- Benefit from best-practice implementations

---

## Core Value Proposition

2L agents can naturally build Agent SDK applications by consulting comprehensive, locally-available documentation, eliminating external dependency lookups and enabling sophisticated AI agent implementations.

**Key benefits:**
1. **Faster development** - No external doc lookups during building
2. **Consistent quality** - Standardized patterns and best practices
3. **Expanded capabilities** - 2L can now build AI agent apps
4. **Self-sufficient agents** - Complete reference material available locally

---

## Feature Breakdown

### Must-Have (MVP)

1. **Comprehensive Web Documentation Harvest**
   - Description: Systematically fetch and synthesize ALL Agent SDK documentation from official sources
   - User story: As a builder agent, I want complete reference material so I can implement any Agent SDK feature
   - Acceptance criteria:
     - [ ] Fetch all pages from https://docs.claude.com/en/api/agent-sdk/ and subpages
     - [ ] Extract TypeScript SDK documentation completely
     - [ ] Extract Python SDK documentation completely
     - [ ] Capture all code examples, patterns, and edge cases
     - [ ] Document streaming vs single mode patterns
     - [ ] Document permissions system comprehensively
     - [ ] Document MCP integration patterns
     - [ ] Document custom tool creation with schemas
     - [ ] Document hooks and event handling
     - [ ] Document sessions and state management
     - [ ] Include troubleshooting and common pitfalls

2. **Structured Documentation Library Creation**
   - Description: Organize harvested knowledge into well-structured markdown files in `~/.claude/docs/agent-sdk/`
   - User story: As an agent, I want organized docs so I can quickly find relevant information
   - Acceptance criteria:
     - [ ] Create `~/.claude/docs/agent-sdk/` directory structure
     - [ ] Write `overview.md` - What Agent SDK is, when to use it, core concepts
     - [ ] Write `quickstart.md` - Installation, first agent, basic patterns
     - [ ] Create `typescript/` subdirectory with language-specific guides
     - [ ] Create `python/` subdirectory with language-specific guides
     - [ ] Create `concepts/` subdirectory for cross-language topics (permissions, MCP, hooks)
     - [ ] Create `examples/` subdirectory with complete working examples
     - [ ] Each file has clear structure: problem → solution → code → gotchas
     - [ ] Include inline code examples with comments
     - [ ] Cross-reference related topics

3. **TypeScript Implementation Guides**
   - Description: Complete TS-specific documentation covering all SDK features
   - User story: As a builder creating a TS app, I want TS-specific patterns and examples
   - Acceptance criteria:
     - [ ] `typescript/setup.md` - Installation, tsconfig, dependencies
     - [ ] `typescript/query-pattern.md` - Stateless query() usage with examples
     - [ ] `typescript/client-pattern.md` - Stateful ClaudeSDKClient with conversation management
     - [ ] `typescript/custom-tools.md` - Tool creation with Zod schemas, type safety
     - [ ] `typescript/options.md` - Complete Options interface documentation
     - [ ] `typescript/streaming.md` - Handling async iterables, message streaming
     - [ ] Include package.json examples, import patterns

4. **Python Implementation Guides**
   - Description: Complete Python-specific documentation covering all SDK features
   - User story: As a builder creating a Python app, I want Python-specific patterns and examples
   - Acceptance criteria:
     - [ ] `python/setup.md` - Installation, virtual env, requirements.txt
     - [ ] `python/query-pattern.md` - Stateless query() usage with async/await
     - [ ] `python/client-pattern.md` - Stateful ClaudeSDKClient with conversation management
     - [ ] `python/custom-tools.md` - @tool decorator, type hints, schemas
     - [ ] `python/options.md` - ClaudeAgentOptions complete reference
     - [ ] `python/async-patterns.md` - Async iteration, message handling
     - [ ] Include requirements.txt examples, import patterns

5. **Conceptual Guides (Cross-Language)**
   - Description: Framework-agnostic documentation for key concepts
   - User story: As an agent, I want to understand concepts regardless of language choice
   - Acceptance criteria:
     - [ ] `concepts/permissions.md` - All permission modes, when to use each, security implications
     - [ ] `concepts/mcp.md` - Model Context Protocol integration, server setup, use cases
     - [ ] `concepts/hooks.md` - Event handling, pre/post tool use, interruption patterns
     - [ ] `concepts/tools.md` - Built-in tools overview, custom tool patterns, best practices
     - [ ] `concepts/sessions.md` - State management, conversation continuity
     - [ ] `concepts/cost-tracking.md` - Token usage monitoring, optimization

6. **Working Examples Collection**
   - Description: Complete, runnable example applications demonstrating common patterns
   - User story: As a builder, I want copy-paste examples that work immediately
   - Acceptance criteria:
     - [ ] `examples/simple-cli-agent.md` - Basic CLI tool with 1-2 custom tools
     - [ ] `examples/web-api-agent.md` - Express/FastAPI backend with agent endpoints
     - [ ] `examples/stateful-chatbot.md` - Conversation memory, multi-turn interactions
     - [ ] `examples/multi-tool-agent.md` - Complex agent with 5+ custom tools
     - [ ] `examples/mcp-server-agent.md` - Custom MCP server integration
     - [ ] Each example includes: problem, full code, setup steps, expected output
     - [ ] Examples for both TypeScript AND Python

7. **Agent Discovery Integration**
   - Description: Minimal updates to 2L agent system prompts to reference documentation
   - User story: As an explorer/builder, I want to know this documentation exists
   - Acceptance criteria:
     - [ ] Update `2l-explorer` prompt with: "When vision mentions AI agents, assistants, or chatbots, note that Agent SDK documentation is available at `~/.claude/docs/agent-sdk/overview.md`"
     - [ ] Update `2l-planner` prompt with: "For AI agent features, consider Claude Agent SDK - see `~/.claude/docs/agent-sdk/` for implementation guidance"
     - [ ] Update `2l-builder` prompt with: "To implement Agent SDK features, reference `~/.claude/docs/agent-sdk/` - start with overview.md, then check language-specific guides"
     - [ ] NO content duplication - only references to docs location
     - [ ] Keep prompt additions under 50 tokens each

8. **Troubleshooting Guide**
   - Description: Common issues, error messages, and solutions
   - User story: As a builder, I want quick fixes for common problems
   - Acceptance criteria:
     - [ ] `troubleshooting.md` with common error patterns
     - [ ] Authentication issues and solutions
     - [ ] Permission errors and how to resolve
     - [ ] Tool execution failures
     - [ ] Context overflow handling
     - [ ] Dependency conflicts
     - [ ] Each issue has: symptom, cause, solution, prevention

### Should-Have (Post-MVP)

1. **Validation Testing** - Automated tests that verify agents can build SDK apps using only these docs
2. **Version Tracking** - Document which Agent SDK version docs correspond to
3. **Update Mechanism** - Process for refreshing docs when SDK updates
4. **Extended Examples** - Advanced patterns: multi-agent orchestration, production deployments
5. **Healer Integration** - Teach healer agent common Agent SDK fixes
6. **Validator Integration** - Teach validator agent to test Agent SDK integrations

### Could-Have (Future)

1. **Interactive Tutorials** - Step-by-step guided implementations
2. **Performance Optimization Guides** - Token efficiency, streaming best practices
3. **Integration Patterns** - Common stacks (Next.js + Agent SDK, FastAPI + Agent SDK)
4. **Migration Guides** - From basic Claude API to Agent SDK
5. **Community Patterns** - User-contributed examples and patterns
6. **Other Framework Docs** - Expand `~/.claude/docs/` to cover tRPC, Prisma, etc.

---

## User Flows

### Flow 1: Builder Creates Agent SDK Application

**Steps:**
1. User requests: "Build a CLI tool that can answer questions about local files"
2. Explorer reads vision, searches `~/.claude/docs/agent-sdk/overview.md`
3. Explorer identifies: "This is a good Agent SDK use case - needs tool calling for file reading"
4. Planner includes Agent SDK in tech stack, references `quickstart.md` for setup
5. Builder reads `typescript/setup.md` for installation
6. Builder reads `typescript/query-pattern.md` for basic structure
7. Builder reads `typescript/custom-tools.md` to create file-reading tool
8. Builder implements complete application using documented patterns
9. Application runs successfully with custom tools

**Edge cases:**
- Unknown SDK feature: Builder searches docs with Grep, finds relevant guide
- Python vs TypeScript: Planner chooses based on project, builder follows correct language guide
- Complex permissions needed: Builder references `concepts/permissions.md`

**Error handling:**
- Missing docs: Builder falls back to WebFetch for official docs (documents gap for future update)
- Unclear pattern: Builder references `examples/` for working code

### Flow 2: Explorer Identifies Agent SDK Opportunity

**Steps:**
1. User provides vision: "Create a customer support bot that queries our database"
2. Explorer reads vision, sees "bot", "queries database"
3. Explorer checks `~/.claude/docs/agent-sdk/overview.md` for applicability
4. Explorer confirms: database querying = custom tool, bot = conversation state
5. Explorer notes in exploration: "Recommend Agent SDK with custom DB query tool and stateful client"
6. Planner receives explorer output, includes Agent SDK in master plan

**Edge cases:**
- Not an agent use case: Explorer determines standard API is sufficient, doesn't mention SDK
- Unclear requirements: Explorer asks user for clarification on agent vs API

---

## Data Model Overview

**Key entities:**

1. **Documentation Files**
   - Fields: file_path, content (markdown), last_updated, sdk_version
   - Relationships: Files reference each other, organized hierarchically

2. **Code Examples**
   - Fields: language (TS/Python), use_case, full_code, dependencies
   - Relationships: Embedded within documentation files

3. **Concepts**
   - Fields: concept_name, description, cross_references, examples
   - Relationships: Multiple docs reference same concepts

**File Structure:**
```
~/.claude/docs/agent-sdk/
├── overview.md
├── quickstart.md
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
├── examples/
│   ├── simple-cli-agent.md
│   ├── web-api-agent.md
│   ├── stateful-chatbot.md
│   ├── multi-tool-agent.md
│   └── mcp-server-agent.md
└── troubleshooting.md
```

---

## Technical Requirements

**Must support:**
- Complete Agent SDK feature coverage (TypeScript and Python)
- Fast local file access (Read/Grep tools)
- Clear, searchable markdown formatting
- Code examples that are copy-paste ready
- Cross-referencing between documents

**Constraints:**
- Documentation must be in `~/.claude/docs/` (global, not project-specific)
- Cannot bloat agent system prompts (references only, not content)
- Must stay synchronized with official Agent SDK docs

**Preferences:**
- Use standard markdown formatting for consistency
- Include inline code examples with syntax highlighting
- Add "Last updated" metadata to track freshness
- Include links to official docs for deep dives

---

## Success Criteria

**The MVP is successful when:**

1. **Complete Documentation Coverage**
   - Metric: All Agent SDK features documented
   - Target: 100% coverage of official docs at https://docs.claude.com/en/api/agent-sdk/

2. **Agent Can Build Without External Lookups**
   - Metric: Builder agent successfully creates Agent SDK app using only local docs
   - Target: 3/3 test cases pass (CLI agent, web API agent, stateful chatbot)

3. **Discovery Works Automatically**
   - Metric: Explorer identifies Agent SDK opportunity from vision keywords
   - Target: 100% identification rate for visions containing "agent", "bot", "assistant"

4. **Documentation Quality**
   - Metric: Code examples run without modification
   - Target: All examples in `examples/` directory execute successfully

5. **Minimal Prompt Bloat**
   - Metric: Total tokens added to agent prompts
   - Target: < 150 tokens across all agent types (just references, no content)

---

## Out of Scope

**Explicitly not included in MVP:**
- Automated documentation updates (manual refresh initially)
- Other framework documentation (focus on Agent SDK only)
- Interactive tutorials or guided implementations
- Performance optimization deep dives
- Production deployment guides beyond basics
- Community-contributed content
- Version management across multiple SDK versions

**Why:** Focused MVP on establishing the pattern with Agent SDK first. Once proven valuable, can expand to other frameworks and add automation.

---

## Assumptions

1. Official Agent SDK documentation is stable and comprehensive enough to extract
2. Agents will naturally use Read/Grep to search documentation when implementing
3. TypeScript and Python SDKs have feature parity (or close enough)
4. `~/.claude/docs/` directory is accessible to all 2L agents
5. Users will provide feedback if documentation gaps are discovered
6. Markdown format is sufficient for code examples and explanations

---

## Open Questions

1. Should we include SDK version numbers in doc filenames (e.g., `overview-v1.0.md`) or use single files with version metadata?
2. How often should we refresh docs from official sources?
3. Should examples include error handling, or keep them minimal for clarity?
4. Do we need a separate "migration guide" for users already using basic Claude API?
5. Should troubleshooting.md include links to GitHub issues for known bugs?

---

## Implementation Notes

### Phase 1: Documentation Harvest
**Critical:** Use WebFetch extensively to gather ALL available information:
- Start with https://docs.claude.com/en/api/agent-sdk/
- Follow all navigation links to subpages
- Capture TypeScript SDK pages completely
- Capture Python SDK pages completely
- Extract all code examples verbatim
- Document all configuration options
- Note any "Pro tips", "Warning", or "Note" sections
- Capture troubleshooting information

### Phase 2: Documentation Structuring
- Organize content into clear hierarchy
- Ensure cross-references are accurate
- Add navigation aids (links between related topics)
- Include "Prerequisites" sections where relevant
- Add "Next Steps" at end of each guide

### Phase 3: Validation
- Test that file paths are correct
- Verify code examples are syntactically valid
- Ensure all cross-references resolve
- Check that examples include all necessary imports/setup

---

## Next Steps

- [ ] Review and refine this vision
- [ ] Run `/2l-plan` for interactive master planning
- [ ] OR run `/2l-mvp` to auto-plan and execute

---

**Vision Status:** VISIONED
**Ready for:** Master Planning
