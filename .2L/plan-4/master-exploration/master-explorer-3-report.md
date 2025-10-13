# Master Exploration Report

## Explorer ID
master-explorer-3

## Focus Area
User Experience & Integration Points

## Vision Summary
Create comprehensive, locally-available Claude Agent SDK documentation that enables 2L agents to build AI agent applications without external lookups, integrating seamlessly into the 2L workflow through documentation references.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 8 must-have features
- **User stories/acceptance criteria:** 63 acceptance criteria across all features
- **Estimated total work:** 18-24 hours (documentation-heavy work)

### Complexity Rating
**Overall Complexity: COMPLEX**

**Rationale:**
- **15+ distinct features** with comprehensive acceptance criteria (63 total)
- **Multi-language documentation** (TypeScript AND Python) doubles content volume
- **External API integration** (web scraping from docs.claude.com) with content synthesis requirements
- **Multiple integration points** across 2L agent system (explorers, planners, builders)
- **Cross-referencing requirements** between 20+ documentation files
- **Quality validation needed** for code examples to ensure they're copy-paste ready

---

## User Flow Analysis

### Flow 1: Builder Creates Agent SDK Application

**User journey:** Developer requests AI-powered feature → 2L agents discover, plan, and build using Agent SDK

**Integration points:**
1. **User → 2L System**
   - Input: Natural language vision ("Build a CLI tool that answers questions about local files")
   - Data format: Plain text vision document
   - Validation: None needed (free-form input)

2. **Explorer Agent → Documentation**
   - Integration: Read tool accessing `~/.claude/docs/agent-sdk/overview.md`
   - Data flow: File system read operation
   - Error handling: If file missing, explorer should note gap and continue with general approach
   - Pattern matching: Keywords like "agent", "bot", "assistant", "AI tool" trigger SDK consideration

3. **Explorer Agent → Planner Agent**
   - Integration: Exploration report with technology recommendations
   - Data format: Structured markdown with "Recommend Agent SDK" notes
   - Critical data: SDK applicability assessment, custom tool requirements

4. **Planner Agent → Documentation**
   - Integration: Read tool accessing `quickstart.md`, language-specific setup guides
   - Data flow: File system reads for setup patterns
   - Decision point: TypeScript vs Python based on project context

5. **Builder Agent → Documentation (Multi-stage)**
   - **Stage 1 - Setup:** `typescript/setup.md` or `python/setup.md`
     - Extracts: Dependencies, installation commands, config files
     - Integration pattern: Copy package.json/requirements.txt examples
   - **Stage 2 - Core Pattern:** `query-pattern.md` or `client-pattern.md`
     - Extracts: Basic application structure, import patterns
     - Integration pattern: Scaffold main file with documented structure
   - **Stage 3 - Custom Tools:** `custom-tools.md`
     - Extracts: Tool definition patterns, schema creation
     - Integration pattern: Create tool functions matching documentation format
   - **Stage 4 - Options:** `options.md`
     - Extracts: Configuration options, permission settings
     - Integration pattern: Configure agent with appropriate settings

6. **Builder Agent → Codebase**
   - Integration: Write tool creating application files
   - Data flow: Documentation patterns → Code files
   - Validation: Code should run without modification

**Edge cases:**
- **Unknown SDK feature:** Builder uses Grep tool to search across all docs for keywords
- **Language choice unclear:** Planner defaults to TypeScript (more common in 2L ecosystem)
- **Complex permissions:** Builder references `concepts/permissions.md` for security guidance
- **Error occurs:** Builder checks `troubleshooting.md` for known issues

**Critical UX concern:** Builder must NOT get stuck searching for information. Documentation must be:
- **Quickly searchable** with Grep
- **Cross-referenced** so related topics link together
- **Complete** to avoid external lookups

---

### Flow 2: Explorer Identifies Agent SDK Opportunity

**User journey:** Vision mentions AI capabilities → Explorer recognizes SDK as solution pattern

**Integration points:**
1. **Explorer Agent → Vision Document**
   - Integration: Read tool accessing `.2L/plan-N/vision.md`
   - Pattern recognition: Keywords trigger SDK consideration
     - "bot", "chatbot", "assistant", "AI agent"
     - "answer questions", "execute commands", "tool calling"
     - "conversation", "interactive", "stateful dialog"

2. **Explorer Agent → Documentation Discovery**
   - Integration: Read tool accessing `~/.claude/docs/agent-sdk/overview.md`
   - Data extraction: "When to use Agent SDK" section
   - Decision logic: Match vision requirements against SDK capabilities

3. **Explorer Agent → Exploration Report**
   - Integration: Write tool creating exploration output
   - Critical data: "Recommend Agent SDK" with reasoning
   - Downstream impact: Planner receives SDK as technology option

**Edge cases:**
- **Not an agent use case:** Explorer determines standard API sufficient, doesn't mention SDK
- **Unclear requirements:** Explorer notes "Could use Agent SDK if conversation/tools needed" with question for user
- **Documentation missing:** Explorer uses WebFetch as fallback, documents gap for future update

**Critical UX concern:** Explorer must have clear decision criteria. The `overview.md` needs explicit "When to use Agent SDK" vs "When NOT to use Agent SDK" guidance.

---

### Flow 3: User Requests Agent SDK Documentation Update

**User journey:** User notices outdated docs → Requests refresh → Builder updates documentation

**Integration points:**
1. **User → 2L System**
   - Input: "Update the Agent SDK documentation to latest version"
   - Trigger: Manual request (no automated refresh in MVP)

2. **Builder Agent → External Web API**
   - Integration: WebFetch tool accessing https://docs.claude.com/en/api/agent-sdk/
   - Data flow: HTTP GET requests → HTML content → Parsed text
   - Extraction pattern: Follow navigation links, capture all subpages
   - Challenge: Web scraping reliability (page structure changes)

3. **Builder Agent → Documentation Files**
   - Integration: Write tool updating ~/.claude/docs/agent-sdk/ files
   - Update pattern: Compare existing vs new content, preserve structure
   - Risk: Overwriting valid local changes

4. **Builder Agent → 2L Agents**
   - Integration: No direct integration needed (agents read updated files automatically)
   - Validation: Builder should test that key examples still work

**Edge cases:**
- **Official docs restructured:** Builder must adapt file organization while maintaining compatibility
- **SDK version mismatch:** Documentation should include version metadata
- **Network failure:** Builder should fail gracefully, preserve existing docs

**Critical UX concern:** Documentation updates should NOT break existing agent workflows. File paths and structure must remain stable.

---

## Frontend/Backend Integration Analysis

### Integration Complexity: MEDIUM

**Rationale:** This is a documentation-only project with no traditional frontend/backend. However, integration complexity exists in the agent-to-documentation interaction patterns.

### Key Integration Points

#### 1. Agent System Prompt Updates
**Integration type:** Prompt engineering (no API)

**Implementation:**
- **Explorer prompt addition:** "When vision mentions AI agents, assistants, or chatbots, note that Agent SDK documentation is available at `~/.claude/docs/agent-sdk/overview.md`"
- **Planner prompt addition:** "For AI agent features, consider Claude Agent SDK - see `~/.claude/docs/agent-sdk/` for implementation guidance"
- **Builder prompt addition:** "To implement Agent SDK features, reference `~/.claude/docs/agent-sdk/` - start with overview.md, then check language-specific guides"

**Challenge:** Prompt bloat
- **Constraint:** < 150 tokens total across all agent types
- **Solution:** References only, NO content duplication
- **Validation:** Count tokens before finalizing

**Risk:** LOW - Simple text additions, no logic changes

#### 2. File System Integration
**Integration type:** Direct file access

**Data flow:**
```
Builder (WebFetch) → Web docs (HTML)
  ↓
Builder (Write) → ~/.claude/docs/agent-sdk/*.md
  ↓
2L Agents (Read/Grep) → Documentation files
  ↓
2L Agents (Write) → Application code
```

**File locations:**
- **Global documentation:** `~/.claude/docs/agent-sdk/` (NOT project-specific)
- **Project code:** `.2L/plan-N/iterations/` (uses patterns from docs)

**Access pattern:**
- **Explorers:** Read overview.md for SDK applicability
- **Planners:** Read quickstart.md, setup guides for tech stack decisions
- **Builders:** Read extensively across all relevant docs during implementation

**Challenge:** Documentation discoverability
- **Solution:** Clear file naming, comprehensive README/overview
- **Grep optimization:** Use consistent terminology for searchability

**Risk:** LOW - Standard file I/O, well-supported by agent tools

#### 3. Cross-Document References
**Integration type:** Internal documentation navigation

**Pattern:**
```markdown
For permission configuration, see [Permissions Guide](../concepts/permissions.md)

Related topics:
- [Custom Tools](./custom-tools.md)
- [MCP Integration](../concepts/mcp.md)
```

**Challenge:** Relative path handling
- **Agent behavior:** Read tool uses absolute paths
- **Solution:** Include both relative (for human readers) and absolute paths in key navigation sections
- **Example:** "See `~/.claude/docs/agent-sdk/concepts/permissions.md` or [relative link](../concepts/permissions.md)"

**Risk:** LOW - Documentation convenience feature, not critical to function

---

## External API/Service Integration

### Integration 1: Official Claude Documentation Website

**Service:** https://docs.claude.com/en/api/agent-sdk/

**Integration method:** WebFetch tool (HTTP GET requests)

**Data flow:**
1. **Discovery phase:** Fetch main SDK page, extract navigation links
2. **Harvesting phase:** Recursively fetch all subpages
3. **Extraction phase:** Parse HTML to extract:
   - Headings and content structure
   - Code examples (preserve syntax highlighting markers)
   - Warning/Note/Pro-tip callouts
   - Navigation hierarchy
4. **Synthesis phase:** Reorganize into local documentation structure

**Authentication:** None required (public documentation)

**Rate limiting:** Should implement polite scraping (1-2 second delays between requests)

**Error handling:**
- **Network failure:** Retry with exponential backoff (3 attempts)
- **404 errors:** Document missing page, continue with other pages
- **HTML structure changes:** Fail gracefully, warn user that manual review needed
- **Timeout:** Set 30-second timeout per page fetch

**Data validation:**
- Check that code examples include necessary imports
- Verify that all internal links are captured
- Ensure no truncated content

**Risk:** MEDIUM
- **Website changes:** Official docs could restructure, breaking scraping logic
- **Completeness:** Risk of missing content if navigation structure changes
- **Mitigation:** Include last-fetched timestamp, manual validation after harvesting

### Integration 2: No Direct SDK API Integration

**Important:** This project does NOT integrate with the Agent SDK runtime itself. It only creates documentation for future SDK usage by builders.

**Implications:**
- No API keys or authentication needed for MVP
- No testing of actual Agent SDK functionality required
- Documentation quality assessed by readability, not runtime validation

**Post-MVP consideration:** Add validation testing that actually runs example code to verify correctness.

---

## Data Flow Patterns

### Pattern 1: Documentation Harvesting (One-time/Manual)

```
External Web → WebFetch Tool → Builder Agent Memory
  ↓
Builder Agent → Write Tool → ~/.claude/docs/agent-sdk/*.md
  ↓
[Documentation now available for all agents]
```

**Frequency:** Manual updates (no automated refresh in MVP)

**Data volume:** Estimate 50-100 KB of markdown documentation

**Performance:** One-time operation, no ongoing performance concerns

---

### Pattern 2: Agent Discovery (Per-plan Explorer Phase)

```
Vision Document → Explorer Agent (Read)
  ↓
Explorer Agent → Read(overview.md) → SDK Applicability Check
  ↓
Explorer Agent → Write(exploration-report.md) → "Recommend Agent SDK: Yes/No"
```

**Frequency:** Once per new 2L plan during exploration phase

**Data volume:** Small (single file reads, < 10 KB)

**Performance:** Fast (local file access), no concerns

---

### Pattern 3: Builder Implementation (Per-iteration Build Phase)

```
Master Plan → Builder Agent
  ↓
Builder → Read(typescript/setup.md) → Extract dependencies
  ↓
Builder → Read(query-pattern.md) → Extract structure
  ↓
Builder → Read(custom-tools.md) → Extract tool patterns
  ↓
Builder → Write(application files) → Implement using patterns
```

**Frequency:** Multiple reads per build iteration (5-10 doc file accesses)

**Data volume:** Medium (multiple file reads, 50-100 KB total)

**Performance:** Fast (local file access), no concerns

**Critical path:** Builder must not get stuck searching. Documentation organization is key UX factor.

---

## Authentication & Session Management

### Authentication Requirements: NONE

**Rationale:**
- Documentation files are local, no auth needed
- Public web scraping requires no authentication
- No user accounts or sessions in this system

**Future consideration:** If expanded to other frameworks with private/enterprise docs, would need auth integration.

---

## Form Handling & Validation

### No Traditional Forms

This project has no user-facing forms. However, there are validation requirements:

### Code Example Validation

**Validation type:** Syntax correctness

**Requirements:**
- TypeScript examples must be valid TS syntax
- Python examples must be valid Python syntax
- All imports must be included
- No placeholder values (use realistic examples)

**Validation method (MVP):** Manual review by builder during documentation creation

**Post-MVP:** Automated linting/syntax checking

### Documentation Completeness Validation

**Validation type:** Coverage checking

**Requirements:**
- All features from official docs captured
- All code examples include necessary imports
- All cross-references resolve to existing files
- No broken links

**Validation method:** Builder agent checklist during creation

---

## Error Handling & Edge Cases

### Error Scenario 1: Documentation File Missing

**Trigger:** Agent attempts to read `~/.claude/docs/agent-sdk/overview.md` but file doesn't exist

**Current behavior:** Read tool returns error

**Desired behavior:**
1. Agent recognizes documentation hasn't been created yet
2. Agent notes in output: "Agent SDK documentation not found at expected location"
3. Agent falls back to generic approach or WebFetch lookup
4. Agent continues without blocking

**Implementation:** No code changes needed - agents already handle missing files gracefully

**UX impact:** MEDIUM - Agents can still function, but less efficient

---

### Error Scenario 2: Incomplete Documentation

**Trigger:** Builder needs specific SDK feature but documentation is insufficient

**Current behavior:** Builder gets stuck or makes assumptions

**Desired behavior:**
1. Builder searches docs with Grep for keywords
2. If not found, builder checks `troubleshooting.md` for known gaps
3. Builder falls back to WebFetch for official docs
4. Builder documents the gap for future update

**Implementation:** Include "Known Gaps" section in troubleshooting.md

**UX impact:** LOW - Fallback available, but defeats purpose of local docs

---

### Error Scenario 3: Web Scraping Fails

**Trigger:** WebFetch cannot access https://docs.claude.com during documentation creation

**Current behavior:** Tool returns network error

**Desired behavior:**
1. Builder retries with exponential backoff (3 attempts)
2. If still failing, builder reports: "Cannot fetch documentation - network issue"
3. Builder preserves any existing documentation
4. Builder provides manual fallback instructions

**Implementation:** Builder logic during documentation harvest phase

**UX impact:** HIGH - Blocks initial documentation creation, but rare

---

### Error Scenario 4: Documentation Version Mismatch

**Trigger:** User's Agent SDK version differs from documented version

**Current behavior:** No version tracking (MVP)

**Desired behavior:**
1. Documentation includes version metadata (e.g., "SDK v1.2.0")
2. Builder notes version when creating docs
3. User aware of potential mismatches

**Implementation:** Add version header to each documentation file

**UX impact:** LOW - Awareness issue, not functional blocker

---

## Responsive Design & Accessibility

### Not Applicable (Documentation Project)

This project produces markdown documentation files with no visual interface. However, documentation READABILITY is the equivalent concern:

### Documentation Readability Requirements

**Clear headings:** Use markdown hierarchy (H1, H2, H3) consistently

**Code formatting:**
- Use syntax highlighting markers (\`\`\`typescript, \`\`\`python)
- Include comments in code examples
- Keep examples concise (< 50 lines when possible)

**Navigation aids:**
- Table of contents in longer documents
- "Prerequisites" sections
- "Next steps" at end of guides
- Cross-references to related topics

**Accessibility for agents:**
- Consistent terminology (use same terms across docs)
- Grep-friendly keywords (include common search terms)
- Clear file naming (e.g., `typescript/custom-tools.md`, not `ts-tools.md`)

**Accessibility for humans:**
- Plain language (avoid jargon when possible)
- Examples before theory (show, then explain)
- Progressive complexity (simple examples first)

---

## Real-time Features

### No Real-time Requirements

This project has no real-time data synchronization, live updates, or WebSocket requirements.

**Future consideration:** If documentation updates were automated (post-MVP), could implement:
- File watcher for documentation changes
- Notification system for agents when docs update
- But NOT required for MVP

---

## State Management

### Documentation State: File-based

**State storage:** File system (`~/.claude/docs/agent-sdk/*.md`)

**State persistence:** Permanent (until manually updated)

**State sharing:** All agents read same files (implicit sharing)

**State conflicts:** None (read-only for agents after creation)

### Agent State: Stateless Reads

**Agent behavior:** Each agent reads docs independently, no session state

**No state synchronization needed:** Documentation is stable between reads

---

## Integration Point Summary

### Critical Integration Points

1. **Agent System Prompts** (LOW complexity, HIGH impact)
   - Add documentation references to explorer, planner, builder prompts
   - Constraint: < 50 tokens each
   - Risk: Minimal - text additions only

2. **File System Access** (LOW complexity, HIGH impact)
   - Read/Write to `~/.claude/docs/agent-sdk/`
   - Pattern: Standard file I/O
   - Risk: Minimal - well-supported operations

3. **Web Documentation Scraping** (MEDIUM complexity, HIGH impact)
   - WebFetch from https://docs.claude.com/en/api/agent-sdk/
   - Pattern: HTTP GET + HTML parsing
   - Risk: Medium - website structure changes could break scraping

### Integration Challenges

**Challenge 1: Documentation Discoverability**
- **Issue:** Agents must know where to look
- **Solution:** Clear prompt additions + well-named files + comprehensive overview.md
- **Mitigation:** Test with sample queries to verify discoverability

**Challenge 2: Content Completeness**
- **Issue:** Missing information breaks builder workflow
- **Solution:** Comprehensive web scraping + manual validation + fallback to WebFetch
- **Mitigation:** Include "Known Gaps" tracking in troubleshooting.md

**Challenge 3: Cross-Reference Maintenance**
- **Issue:** Links break when files reorganized
- **Solution:** Use absolute paths + relative paths + validation checklist
- **Mitigation:** Keep file structure stable, minimize reorganization

---

## User Experience Insights

### UX Success Criteria

1. **Speed:** Builder finds relevant docs in < 30 seconds
   - Measured by: Grep search time + Read time
   - Target: 1-2 Grep queries max to find needed info

2. **Completeness:** Builder implements SDK feature without external lookup
   - Measured by: Zero WebFetch calls to external docs during build
   - Target: 100% self-sufficiency for common SDK features

3. **Clarity:** Code examples run without modification
   - Measured by: Copy-paste success rate
   - Target: 100% of examples in `examples/` directory work as-is

4. **Discoverability:** Explorer recognizes SDK opportunities automatically
   - Measured by: SDK recommendation rate for agent-related visions
   - Target: 100% for visions with "bot", "agent", "assistant" keywords

### UX Pain Points to Avoid

**Pain Point 1: Information Overload**
- **Risk:** Too much documentation, agent gets lost
- **Mitigation:** Clear entry point (overview.md), progressive disclosure pattern

**Pain Point 2: Fragmented Information**
- **Risk:** Need to read 5+ files to implement one feature
- **Mitigation:** Self-contained guides where possible, clear cross-references when needed

**Pain Point 3: Outdated Examples**
- **Risk:** Code examples don't work with current SDK
- **Mitigation:** Version metadata + update process documentation

**Pain Point 4: Unclear Applicability**
- **Risk:** Agent uses SDK when not appropriate (over-engineering)
- **Mitigation:** Explicit "When to use" and "When NOT to use" guidance in overview.md

---

## Recommendations for Master Plan

1. **Iteration Breakdown: Documentation-First Approach**
   - **Iteration 1 (Foundation):** Create directory structure + overview.md + quickstart.md + troubleshooting.md
     - Rationale: Establishes core navigation, enables basic discovery
     - Duration: 4-6 hours
     - Risk: LOW - Straightforward documentation writing

   - **Iteration 2 (Language Guides):** Complete TypeScript + Python implementation guides
     - Rationale: Enables actual implementation by builders
     - Duration: 8-10 hours (most content-heavy)
     - Risk: MEDIUM - Requires comprehensive web scraping

   - **Iteration 3 (Concepts + Examples):** Conceptual guides + working examples
     - Rationale: Adds depth and copy-paste solutions
     - Duration: 6-8 hours
     - Risk: LOW - Builds on existing foundation

2. **Start with TypeScript Focus**
   - TypeScript more common in existing 2L projects
   - Python can be added in parallel by separate builder if needed
   - Enables faster MVP validation

3. **Prioritize Common Use Cases**
   - Focus on simple CLI agent, basic web API integration first
   - Advanced features (MCP, multi-agent) can be post-MVP
   - 80/20 rule: Cover 80% of use cases with 20% of features

4. **Build Validation into Process**
   - Each documentation file should include validation checklist
   - Test that examples actually run (manual in MVP, automated post-MVP)
   - Grep test: Can agent find info with common search terms?

5. **Keep Prompts Minimal**
   - Absolute constraint: < 50 tokens per agent type
   - Just references, NO content duplication
   - Trust agents to read docs when needed

---

## Technology Recommendations

### Existing Infrastructure: Sufficient

**No new tools or frameworks needed:**
- WebFetch (for scraping)
- Read/Write (for file operations)
- Grep (for searching)
- Standard markdown (for documentation format)

**Tech stack decisions:**
- **Documentation format:** Markdown (already used by 2L system)
- **Storage location:** `~/.claude/docs/agent-sdk/` (global, accessible to all agents)
- **Scraping:** WebFetch with HTML text extraction (no parsing library needed)
- **Validation:** Manual in MVP (no automated testing framework yet)

---

## Notes & Observations

### Key Insight 1: Documentation AS Integration

This project is unique because the "integration" IS the documentation. Unlike typical projects where docs describe integration, here the docs ARE the integration layer between agents and Agent SDK knowledge.

**Implication:** Documentation quality directly determines integration success.

### Key Insight 2: Agent Discoverability Pattern

This establishes a pattern for future framework documentation:
- `~/.claude/docs/{framework-name}/overview.md` as standard entry point
- Minimal prompt additions (references only)
- Self-sufficient local documentation

**Future expansion:** Can replicate for tRPC, Prisma, Supabase, etc.

### Key Insight 3: Web Scraping Reliability

Web scraping from official docs is a single point of failure:
- If docs.claude.com restructures, harvesting breaks
- Need fallback: manual documentation creation from SDK source code/examples
- Post-MVP: Consider tracking GitHub SDK releases instead of web docs

### Key Insight 4: No Traditional API Integration

Despite being an "integration" project, there are no traditional API calls, webhooks, or authentication flows. This is purely file-based knowledge distribution.

**Advantage:** Simplifies implementation, no runtime dependencies
**Disadvantage:** No automated validation of documentation accuracy against SDK runtime

---

## Integration Risk Assessment

### HIGH Risk: Web Scraping Reliability

**Issue:** Documentation harvest depends on stable website structure

**Impact:** If scraping fails, cannot create documentation

**Mitigation:**
- Retry logic with exponential backoff
- Fallback to manual documentation creation
- Version tracking to know when docs were last successfully harvested

**Recommendation:** Address in Iteration 2, include retry logic from start

---

### MEDIUM Risk: Documentation Completeness

**Issue:** Missing SDK features in documentation blocks builder progress

**Impact:** Builder must fall back to external lookups (defeats purpose)

**Mitigation:**
- Comprehensive initial harvest (follow ALL navigation links)
- Include "Known Gaps" section in troubleshooting.md
- Post-MVP: Validation testing with real SDK implementation

**Recommendation:** Manual validation checklist during documentation creation

---

### LOW Risk: Version Mismatch

**Issue:** User's SDK version differs from documented version

**Impact:** Some features may not work exactly as documented

**Mitigation:**
- Include version metadata in all documentation files
- User awareness of potential mismatches
- Post-MVP: Support multiple versions

**Recommendation:** Add version header, don't over-engineer for MVP

---

### LOW Risk: Prompt Bloat

**Issue:** Adding documentation references to agent prompts increases token count

**Impact:** Slightly higher cost per agent invocation

**Mitigation:**
- Strict constraint: < 50 tokens per agent type
- References only, no content
- Measure token count before finalizing

**Recommendation:** Easy to control, just enforce constraint during implementation

---

## Data Flow Map (Visual)

```
┌─────────────────────────────────────────────────────────────────────┐
│ DOCUMENTATION CREATION FLOW (One-time/Manual)                      │
└─────────────────────────────────────────────────────────────────────┘

External Web (docs.claude.com)
    │
    │ WebFetch (HTTP GET)
    ↓
Builder Agent Memory
    │
    │ Content Extraction + Synthesis
    ↓
File System (~/.claude/docs/agent-sdk/*.md)
    │
    │ [Documentation now available]
    ↓
┌───────────────────────────────────────────────────────────────────┐
│ AGENT WORKFLOW (Per 2L Plan)                                     │
└───────────────────────────────────────────────────────────────────┘

Vision Document (.2L/plan-N/vision.md)
    │
    │ Read
    ↓
Explorer Agent
    │
    │ Read (overview.md)
    ↓
"Should we use Agent SDK?" Decision
    │
    │ Write (exploration report)
    ↓
Planner Agent
    │
    │ Read (quickstart.md, setup.md)
    ↓
Master Plan (includes Agent SDK in tech stack)
    │
    │
    ↓
Builder Agent
    │
    ├─ Read (typescript/setup.md) → Dependencies
    ├─ Read (query-pattern.md) → Structure
    ├─ Read (custom-tools.md) → Tool patterns
    └─ Read (options.md) → Configuration
    │
    │ Write (application files)
    ↓
Working Agent SDK Application
```

---

## User Journey Map

### Persona: Builder Agent (Primary User)

**Goal:** Implement Agent SDK feature described in master plan

**Current state:** Has master plan saying "Use Agent SDK for custom tools"

**Journey stages:**

1. **Awareness (Prompt trigger)**
   - Prompt says: "Reference ~/.claude/docs/agent-sdk/"
   - Emotion: Confident (knows where to look)

2. **Discovery (Read overview.md)**
   - Confirms: "Yes, custom tools are covered"
   - Finds: "See typescript/custom-tools.md for implementation"
   - Emotion: Reassured (clear path forward)

3. **Learning (Read custom-tools.md)**
   - Extracts: Tool schema pattern, decorator syntax, type safety tips
   - Sees: Complete working example with imports
   - Emotion: Prepared (knows what to implement)

4. **Implementation (Write code files)**
   - Copies: Tool structure from documentation
   - Adapts: Example to specific use case
   - Emotion: Efficient (no external lookups needed)

5. **Validation (Check code)**
   - Code runs: Successfully on first try
   - Emotion: Satisfied (documentation was accurate)

**Pain points if documentation missing:**
- Stage 2: "Overview doesn't mention custom tools" → Uncertainty
- Stage 3: "custom-tools.md incomplete" → Frustration, external lookup
- Stage 4: "Example missing imports" → Error, trial-and-error fixing
- Stage 5: "Example doesn't run" → Lost confidence in documentation

**Success criteria:**
- Zero external lookups (no WebFetch during implementation)
- < 5 minutes from reading docs to writing code
- Code runs without debugging

---

### Persona: End User (Developer Using 2L)

**Goal:** Build AI-powered application with 2L

**Current state:** Has idea for AI chatbot, writes vision document

**Journey stages:**

1. **Vision Creation**
   - Writes: "Build a chatbot that can query our database"
   - Emotion: Excited (has clear idea)

2. **Exploration (Transparent to user)**
   - Explorer recognizes: "Chatbot + database queries = Agent SDK use case"
   - User sees: Exploration report mentions "Agent SDK recommended"
   - Emotion: Impressed (2L understood requirements)

3. **Planning (Transparent to user)**
   - Planner includes: Agent SDK in tech stack with TypeScript
   - User sees: Master plan with clear iteration breakdown
   - Emotion: Confident (plan looks comprehensive)

4. **Building (Transparent to user)**
   - Builder implements: Custom DB query tool using documentation patterns
   - User sees: Progress updates, code files created
   - Emotion: Satisfied (2L handling complexity)

5. **Validation**
   - Application runs: Chatbot successfully queries database
   - User tests: Asks questions, gets accurate responses
   - Emotion: Delighted (exactly what was requested)

**Pain points if documentation missing:**
- Stage 2: Explorer doesn't recognize SDK opportunity → Wrong tech choice
- Stage 3: Planner unsure of SDK requirements → Incomplete plan
- Stage 4: Builder must research SDK externally → Slow build, inconsistent quality
- Stage 5: Application has bugs from incorrect SDK usage → Frustration

**Success criteria:**
- Natural language vision → Working AI agent (no manual intervention)
- Tech stack choice is automatic and correct
- Build quality matches hand-written code

---

## Critical Success Factors for Integration

1. **Documentation Discoverability: CRITICAL**
   - Agents must find relevant docs quickly
   - Success = < 30 seconds to locate needed information
   - Measurement = Grep query count + Read operations

2. **Content Completeness: CRITICAL**
   - All common SDK features documented
   - Success = Zero external lookups during builds
   - Measurement = WebFetch call count to external docs

3. **Code Example Quality: CRITICAL**
   - Examples must work as-is
   - Success = 100% copy-paste success rate
   - Measurement = Manual testing of all examples

4. **Prompt Integration: IMPORTANT**
   - Agents must know docs exist
   - Success = < 150 tokens total, clear references
   - Measurement = Token count, discovery test cases

5. **Cross-Reference Accuracy: IMPORTANT**
   - Internal links must resolve
   - Success = Zero broken links
   - Measurement = Manual link checking

6. **Update Process: NICE-TO-HAVE (MVP)**
   - Can refresh docs from web
   - Success = Documented update procedure
   - Measurement = Post-MVP (manual updates acceptable for MVP)

---

*Exploration completed: 2025-10-13T10:35:00Z*

*This report informs master planning decisions with focus on user experience flows, integration patterns, and data movement across system boundaries.*
