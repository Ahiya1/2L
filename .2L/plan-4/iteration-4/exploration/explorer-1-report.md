# Explorer 1 Report: Architecture & Structure for Python Integration

## Executive Summary

The Python integration for Agent SDK documentation requires adding 6 Python implementation guides and extending 5 existing example files with Python code sections. The existing TypeScript-only architecture (20 files, ~23,000 words) provides an excellent foundation. The recommended approach is a **parallel directory structure** (python/ subdirectory) combined with **multi-language example files** to achieve feature parity while maintaining clarity and discoverability.

**Key recommendation:** Create python/ directory mirroring typescript/ structure (6 files), extend existing examples/ files with Python sections (dual-language), and maintain cross-language concepts/ unchanged. This achieves feature parity with minimal cross-reference disruption.

## Discoveries

### Current Architecture Analysis

**Directory Structure (Iteration 1 Complete):**
```
~/.claude/docs/agent-sdk/
├── overview.md                      (11,593 bytes)
├── quickstart.md                    (12,738 bytes)
├── troubleshooting.md               (20,687 bytes)
├── typescript/                      (6 files, 116,119 bytes total)
│   ├── setup.md
│   ├── query-pattern.md
│   ├── client-pattern.md
│   ├── custom-tools.md
│   ├── options.md
│   └── streaming.md
├── concepts/                        (6 files, cross-language)
│   ├── permissions.md
│   ├── mcp.md
│   ├── hooks.md
│   ├── tools.md
│   ├── sessions.md
│   └── cost-tracking.md
└── examples/                        (5 files, TypeScript-only)
    ├── simple-cli-agent.md          (281 lines)
    ├── web-api-agent.md             (398 lines)
    ├── stateful-chatbot.md          (387 lines)
    ├── multi-tool-agent.md          (520 lines)
    └── mcp-server-agent.md          (602 lines)
```

**Total Files:** 20 markdown files
**Total Content:** ~23,000 words + ~7,000 lines of TypeScript code
**Cross-References:** 200+ validated links (0 broken, 6 intentional Python forward-refs)
**Agent Integration:** 2l-explorer.md updated (line 188, ~26 tokens)

### Existing Python References

**Current Python mentions in documentation:**
- **overview.md (line 209-214):** "Python (Available) ✅" with forward reference to "future iteration"
- **6 forward-references in concepts/** to non-existent python/ files (intentional placeholders)
  - concepts/mcp.md:258 → ../python/options.md
  - concepts/tools.md:353 → ../python/custom-tools.md
  - concepts/sessions.md:365 → ../python/client-pattern.md
  - concepts/permissions.md:176 → ../python/options.md
  - concepts/cost-tracking.md:414 → ../python/options.md
  - concepts/hooks.md:301 → ../python/options.md

**Implication:** These forward-references are **intentional architecture decisions** from Iteration 1, anticipating the exact parallel structure we need to implement.

### Documentation Patterns (Established)

**From patterns.md analysis:**
1. **YAML Frontmatter:** All files have metadata (title, last_updated, sdk_version, language, difficulty, related_guides, tags)
2. **Consistent Structure:** Standard sections (Overview, When to Use, Prerequisites, Complete Example, Advanced Patterns, Common Pitfalls, Related Documentation)
3. **Code Quality:** All TypeScript examples validated, complete imports, error handling, security patterns
4. **Cross-Reference Format:** Relative paths (./same-dir.md, ../parent-dir/file.md)
5. **Agent Discovery:** Keywords naturally distributed, Grep-optimized content

**Success Criteria (from Iteration 1 validation):**
- 100% success rate for agent discovery (4/4 test queries)
- Zero security issues (environment variables enforced)
- Production-ready code quality (all examples syntactically valid)
- Excellent integration cohesion (reads as unified system)

## Patterns Identified

### Pattern 1: Parallel Language Directory Structure

**Description:** Create python/ directory that mirrors typescript/ structure exactly

**Use Case:** When SDKs have feature parity and language-specific implementation details differ significantly

**Example Structure:**
```
~/.claude/docs/agent-sdk/
├── typescript/
│   ├── setup.md              (npm, tsconfig, @types/node)
│   ├── query-pattern.md      (async/await, Promise<>)
│   ├── client-pattern.md     (ClaudeSDKClient class)
│   ├── custom-tools.md       (tool() function, Zod schemas)
│   ├── options.md            (Options interface, TypeScript types)
│   └── streaming.md          (AsyncIterable, async for...of)
└── python/                   [NEW]
    ├── setup.md              (pip, venv, requirements.txt)
    ├── query-pattern.md      (async def, asyncio patterns)
    ├── client-pattern.md     (ClaudeSDKClient class)
    ├── custom-tools.md       (@tool decorator, type hints)
    ├── options.md            (ClaudeAgentOptions, Pydantic models)
    └── async-patterns.md     (async iteration, message handling)
```

**Recommendation:** **STRONGLY RECOMMENDED** - Maintains consistency, mirrors TypeScript structure exactly, resolves 6 existing forward-references.

**Rationale:**
- Iteration 1 intentionally created forward-refs expecting this structure
- Language-specific guides need distinct content (package managers, syntax, idioms differ)
- Grep searches remain effective ("python setup", "typescript custom tools")
- Agents can easily navigate between language variants
- Future languages (Go, Rust) can follow same pattern

### Pattern 2: Multi-Language Example Files

**Description:** Extend existing example files to include both TypeScript and Python implementations

**Use Case:** When examples demonstrate same functionality but implementation language differs

**Example Structure (simple-cli-agent.md):**
```markdown
# Simple CLI Agent

## Overview
[Language-agnostic description]

## Problem Statement
[Applies to both languages]

## Complete Code

### TypeScript Implementation

```typescript
// Existing TypeScript code (~180 lines)
```

#### Running the TypeScript Version
[TS-specific instructions]

### Python Implementation

```python
# Python equivalent (~150 lines)
```

#### Running the Python Version
[Python-specific instructions]

## How It Works
[Language-agnostic explanation of concepts]

## Key Concepts
[Applies to both implementations]

## Related Documentation
- [TypeScript Setup](../typescript/setup.md)
- [Python Setup](../python/setup.md)
- [Custom Tools Concept](../concepts/tools.md)
```

**Recommendation:** **STRONGLY RECOMMENDED** - Allows direct comparison, reduces duplication, maintains example files as single source of truth per use case.

**Rationale:**
- Users often compare language implementations side-by-side
- Prevents duplication of problem statements, explanations, concepts
- Reduces navigation (one file instead of two)
- Maintains 5 example files (not 10)
- File size increase manageable (~2x current size)

**Estimated Size Impact:**
- simple-cli-agent.md: 281 lines → ~550 lines (TypeScript + Python + running instructions)
- web-api-agent.md: 398 lines → ~750 lines
- stateful-chatbot.md: 387 lines → ~750 lines
- multi-tool-agent.md: 520 lines → ~1,000 lines
- mcp-server-agent.md: 602 lines → ~1,150 lines
- **Total:** 2,188 lines → ~4,200 lines (+2,012 lines Python code)

### Pattern 3: Cross-Language Concept Preservation

**Description:** Keep concepts/ directory unchanged (already language-agnostic)

**Use Case:** When conceptual guides apply equally to all language implementations

**Current State:**
- All 6 concept files already written as cross-language
- No language-specific syntax in concepts/
- Focus on architectural decisions, not implementation details
- Forward-references already in place for language-specific guides

**Recommendation:** **NO CHANGES NEEDED** - Concepts are already properly architected.

**Rationale:**
- Permissions system is same regardless of language
- MCP integration concepts are universal
- Hooks patterns apply to both SDKs
- Avoids duplication without value

## Complexity Assessment

### High Complexity Areas

#### 1. Python Examples - Multi-Language File Integration
**Complexity:** HIGH  
**Estimated Builder Splits:** Likely 1 builder (Builder-2) handles all 5 files sequentially

**Why Complex:**
- Must maintain existing TypeScript examples exactly (no regressions)
- Add Python equivalents that demonstrate same functionality
- Ensure examples remain copy-paste ready for both languages
- Update frontmatter (change language: "typescript" → "multi-language")
- Add language-specific running instructions
- Update cross-references to point to both TS and Python guides
- File size increases significantly (~2x)

**Mitigation Strategy:**
- Use patterns.md templates extended for multi-language
- Validate both code sections separately (tsc for TS, python -m py_compile for Python)
- Maintain clear section headers (### TypeScript Implementation, ### Python Implementation)
- Preserve line-by-line conceptual equivalence where possible

**Recommendation:** Single builder handles all 5 examples to maintain consistency across example set.

#### 2. Python Implementation Guides - Feature Parity Validation
**Complexity:** MEDIUM-HIGH  
**Estimated Builder Splits:** 1 builder (Builder-1) creates all 6 Python guides

**Why Complex:**
- Must achieve feature parity with TypeScript documentation
- Document Python-specific patterns (@tool decorator vs tool() function)
- Handle async/await differences between languages
- Map TypeScript types to Python type hints
- Address Python-specific edge cases (virtual environments, asyncio, Pydantic)
- Maintain same depth and quality as TypeScript guides

**Mitigation Strategy:**
- Start with web harvest of official Python Agent SDK docs
- Use TypeScript guides as structural template
- Create feature parity checklist (query pattern, client pattern, custom tools, options, streaming)
- Document any SDK differences explicitly
- Include troubleshooting for Python-specific issues (pip install, venv, asyncio quirks)

**Recommendation:** Single builder creates entire python/ directory to ensure consistent voice and patterns.

### Medium Complexity Areas

#### 3. Cross-Reference Updates
**Complexity:** MEDIUM  
**Estimated Effort:** ~30 minutes manual work

**Why Complex:**
- 6 forward-references in concepts/ need no changes (already correct!)
- overview.md needs update to change "future iteration" → "see python/ guides"
- Example files need additional cross-refs to Python guides
- Must maintain all existing 200+ cross-references (no breaks)

**Impact:**
- Low risk of breaking existing links (only adding new ones)
- Validator-1 will catch any broken references

#### 4. Agent Prompt Update (2l-planner.md)
**Complexity:** MEDIUM  
**Token Budget:** <50 tokens

**Current State:**
- 2l-explorer.md already updated (Iteration 1)
- 2l-planner.md update planned for Iteration 2
- 2l-builder.md update planned for Iteration 3

**Recommendation:**
- Add minimal directive: "For AI agent features, consult Agent SDK docs at ~/.claude/docs/agent-sdk/ - both TypeScript and Python implementations available"
- Estimated tokens: ~22 tokens
- Placement: In "Technology Stack Selection" or "Framework Recommendations" section

### Low Complexity Areas

#### 5. Metadata Updates
**Complexity:** LOW  
**Scope:** Update YAML frontmatter in modified files

**Changes Required:**
- Example files: Change `language: "typescript"` → `language: "multi-language"`
- Python guides: Set `language: "python"`
- Update `last_updated: "2025-10-13"` → current date
- Add cross-references to Python guides in `related_guides:`
- No other metadata changes needed

#### 6. Directory Creation
**Complexity:** LOW  
**Scope:** Create python/ subdirectory

**Implementation:**
```bash
mkdir -p ~/.claude/docs/agent-sdk/python
```

## Technology Recommendations

### Primary Stack (No Changes)

**Current Architecture:** Markdown-based documentation in ~/.claude/docs/agent-sdk/  
**Rationale:** Works perfectly, zero issues in Iteration 1 validation

**Agent Tools:**
- Read: Access individual files
- Grep: Search across documentation
- Glob: Find files by pattern

**Validation Tools:**
- TypeScript: tsc --noEmit (syntax validation)
- Python: python -m py_compile (syntax validation) - **NEW**
- Bash: Link validation scripts from patterns.md

### Supporting Libraries (For Python Code Examples)

**Python Dependencies:**
- `anthropic-sdk` (or `@anthropic-ai/agent-sdk` if Python package name differs) - Core Agent SDK
- `pydantic` - Schema validation (equivalent to Zod)
- `asyncio` - Built-in async support
- `typing` - Type hints (built-in)

**Python Development Dependencies:**
- `mypy` - Type checking (equivalent to TypeScript's type system)
- `black` - Code formatting
- `pytest` - Testing framework (for examples that include tests)

### Documentation Format Recommendations

**Markdown Extensions (Keep Existing):**
- YAML frontmatter (metadata)
- Fenced code blocks with language tags (```typescript, ```python)
- Relative links (./file.md, ../dir/file.md)
- Heading anchors (# Section → #section)

**New Code Block Languages:**
```markdown
```python
# Python code examples
import asyncio
from anthropic_sdk import ClaudeSDKClient
```

```bash
# Python-specific commands
pip install anthropic-sdk
python -m venv venv
source venv/bin/activate
```

```text
# Python requirements.txt format
anthropic-sdk>=1.2.0
pydantic>=2.0.0
```
```

## Integration Points

### Internal Integrations

#### 1. python/ ↔ typescript/ (Parallel Implementation Guides)

**Relationship:** Sibling directories, parallel structure

**Integration Pattern:**
- Both directories document same SDK features in different languages
- concepts/ files cross-reference both (already done via forward-refs)
- examples/ files include code from both
- No direct links between typescript/ and python/ files (cross-refs go through concepts/ or examples/)

**Navigation Flow:**
```
User starts at overview.md
↓
Chooses language (TypeScript or Python)
↓
Reads language-specific setup.md
↓
Explores language-specific implementation guides
↓
References cross-language concepts/ as needed
↓
Studies examples/ (sees both implementations)
```

#### 2. examples/ ↔ python/ (Multi-Language Examples Reference Python Guides)

**Relationship:** Examples use both language guides

**Cross-Reference Updates:**
```markdown
# In examples/simple-cli-agent.md

## Prerequisites

### TypeScript
- [Setup Guide](../typescript/setup.md) - Initial SDK installation
- [Custom Tools](../typescript/custom-tools.md) - Tool creation

### Python
- [Setup Guide](../python/setup.md) - Initial SDK installation
- [Custom Tools](../python/custom-tools.md) - Tool creation

## Related Documentation

**Implementation Guides:**
- [TypeScript Query Pattern](../typescript/query-pattern.md)
- [Python Query Pattern](../python/query-pattern.md)
```

#### 3. concepts/ ↔ python/ (Concepts Link to Python Guides)

**Relationship:** Already architected in Iteration 1 (forward-refs exist)

**Current Forward-References (Will Resolve):**
- concepts/mcp.md:258 → ../python/options.md ✓
- concepts/tools.md:353 → ../python/custom-tools.md ✓
- concepts/sessions.md:365 → ../python/client-pattern.md ✓
- concepts/permissions.md:176 → ../python/options.md ✓
- concepts/cost-tracking.md:414 → ../python/options.md ✓
- concepts/hooks.md:301 → ../python/options.md ✓

**Action Required:** NONE - Forward-references will resolve automatically when python/ files created.

#### 4. overview.md ↔ python/ (Entry Point Update)

**Relationship:** overview.md lists Python as available language

**Current State (overview.md lines 209-214):**
```markdown
### Python (Available) ✅

- **Status:** Fully supported, production-ready
- **Package:** `anthropic-sdk`
- **Installation:** `pip install anthropic-sdk`
- **Documentation:** See official docs (Python guides coming in future iteration)
```

**Updated State (Iteration 2):**
```markdown
### Python (Available) ✅

- **Status:** Fully supported, production-ready
- **Package:** `anthropic-sdk`
- **Installation:** `pip install anthropic-sdk`
- **Documentation:** [Python Setup](./python/setup.md)
```

**Change:** Line 214 only - replace forward reference with actual link.

### External Integrations

#### 1. Official Agent SDK Documentation

**Source:** https://docs.claude.com/en/api/agent-sdk/  
**Integration Type:** One-time web harvest (Iteration 2 Builder-1)

**Python-Specific Pages to Harvest:**
- Python installation and setup
- Python query() function usage
- Python ClaudeSDKClient class
- Python @tool decorator and custom tools
- Python options and configuration
- Python async patterns and streaming

**Harvest Strategy:**
- Use WebFetch to retrieve Python SDK pages
- Extract code examples verbatim
- Adapt to local documentation structure
- Maintain source URLs in frontmatter for future updates

#### 2. Agent Prompt System (2l-planner.md)

**Integration Point:** ~/.claude/agents/2l-planner.md  
**Integration Type:** Minimal prompt directive (<50 tokens)

**Current State:** No Agent SDK reference  
**Iteration 2 Update:** Add language-aware directive

**Recommended Addition:**
```markdown
When planning AI agent features, consult Agent SDK documentation at
~/.claude/docs/agent-sdk/overview.md. Both TypeScript and Python
implementations are available.
```

**Token Count:** ~24 tokens ✓ (well under 50-token budget)  
**Placement:** In "Technology Selection" or "Stack Recommendations" section

#### 3. Agent Discovery via Grep

**Current Performance (from Iteration 1 validation):**
- 4/4 test queries successful
- Average 11 files per query
- 100% success rate

**Python Integration Impact:**
- New queries: "python agent", "python custom tool", "async python"
- Expected new results: +6 files (python/ guides)
- Example files now match both "typescript" and "python" queries
- **Risk:** LOW - Adding more content improves discoverability

**Validation Strategy:**
- Test new queries: grep -r "python custom tool" ~/.claude/docs/agent-sdk/
- Verify python/ files appear in results
- Ensure examples/ files match both language queries

## Risks & Challenges

### Technical Risks

#### Risk 1: Feature Parity Gaps Between TypeScript and Python SDKs
**Impact:** HIGH (blocks feature parity goal)  
**Likelihood:** MEDIUM (SDKs usually have minor differences)

**Scenario:** Python SDK missing features present in TypeScript SDK (or vice versa)

**Examples:**
- TypeScript SDK has advanced streaming features not in Python
- Python SDK uses different tool registration mechanism
- Configuration options differ between languages
- Error handling patterns diverge

**Mitigation:**
1. **Early Feature Audit:** Builder-1 compares TypeScript and Python SDK docs before writing
2. **Explicit Gap Documentation:** Document differences in python/setup.md introduction
3. **Fallback References:** Link to official docs for features not fully supported
4. **Troubleshooting Entries:** Add "TypeScript vs Python Differences" section to troubleshooting.md

**Acceptance Criteria:**
- If feature exists in both SDKs → Document both
- If feature only in one SDK → Note explicitly, don't pretend parity
- If behavior differs → Document both behaviors with clear labels

**Example Documentation:**
```markdown
## TypeScript vs Python Differences

### Tool Registration
- **TypeScript:** Uses `tool()` function with Zod schemas
- **Python:** Uses `@tool` decorator with Pydantic models

### Async Patterns
- **TypeScript:** AsyncIterable with `for await...of`
- **Python:** async generators with `async for`

### Configuration
- **TypeScript:** Options interface with TypeScript types
- **Python:** ClaudeAgentOptions class with Pydantic validation
```

#### Risk 2: Breaking Existing Cross-References
**Impact:** MEDIUM (requires integration rework)  
**Likelihood:** LOW (well-established patterns)

**Scenario:** Adding Python content breaks existing TypeScript cross-references

**Mitigation:**
1. **Preserve Existing Links:** Never modify existing cross-reference targets
2. **Add New Links Only:** Only add new cross-refs to Python guides
3. **Validation:** Integrator runs link validation script (from patterns.md)
4. **Backward Compatibility:** Ensure all Iteration 1 references still resolve

**Validation Command:**
```bash
# From patterns.md
find ~/.claude/docs/agent-sdk/ -name "*.md" -exec grep -l "\[.*\](.*\.md)" {} \; |
  xargs -I {} bash -c 'echo "Checking: {}"; # validate links'
```

#### Risk 3: Python Code Syntax Errors
**Impact:** MEDIUM (reduces code quality)  
**Likelihood:** MEDIUM (Python syntax differs from TypeScript)

**Scenario:** Python code examples have syntax errors, runtime issues, or don't follow Python conventions

**Mitigation:**
1. **Syntax Validation:** Run `python -m py_compile` on all Python code blocks
2. **Type Checking:** Use `mypy` for type hint validation
3. **Style Compliance:** Follow PEP 8 conventions (black formatter)
4. **Runtime Testing:** Execute simple examples to verify they work
5. **Peer Review:** Integrator validates Python code quality

**Validation Commands:**
```bash
# Extract Python code block from markdown
sed -n '/```python/,/```/p' file.md | sed '1d;$d' > /tmp/example.py

# Validate syntax
python -m py_compile /tmp/example.py

# Type check
mypy /tmp/example.py

# Style check (optional)
black --check /tmp/example.py
```

### Complexity Risks

#### Risk 4: Builder Needs to Split (Multi-Language Examples)
**Impact:** MEDIUM (coordination overhead)  
**Likelihood:** LOW (manageable scope)

**Scenario:** Builder-2 handling 5 example files needs to split into sub-builders

**Indicators:**
- File size increases beyond builder comfort (~1,000+ lines per file)
- Python and TypeScript examples drift in functionality
- Builder velocity drops significantly

**Mitigation:**
1. **Sequential Approach:** Builder completes one example file fully before moving to next
2. **Clear Patterns:** Use multi-language template from patterns.md extended version
3. **Early Split Decision:** If first file takes >90 minutes, split remaining 4 files
4. **Split Strategy:** If split needed: Builder-2A (2 files), Builder-2B (3 files)

**Recommendation:** Start with single builder, split only if first file reveals scope underestimation.

#### Risk 5: Feature Parity Validation Difficulty
**Impact:** MEDIUM (unclear success criteria)  
**Likelihood:** MEDIUM (subjective measurement)

**Scenario:** Unclear when Python documentation achieves "feature parity" with TypeScript

**Mitigation:**
1. **Feature Checklist:** Create explicit checklist of features to document
2. **Side-by-Side Comparison:** Compare python/ files to typescript/ files line-by-line
3. **Validator Review:** Validator-1 explicitly checks feature parity
4. **Gap Documentation:** Any gaps documented in troubleshooting.md or python/setup.md

**Feature Parity Checklist (Iteration 2):**
```markdown
## Python Feature Parity Checklist

### Core Patterns
- [ ] Installation (pip, venv, requirements.txt)
- [ ] Query pattern (stateless async query())
- [ ] Client pattern (stateful ClaudeSDKClient)
- [ ] Custom tool creation (@tool decorator)
- [ ] Options configuration (ClaudeAgentOptions)
- [ ] Async patterns (async/await, async for)

### Advanced Features
- [ ] Streaming responses
- [ ] MCP server integration
- [ ] Hooks (pre/post tool execution)
- [ ] Session management
- [ ] Cost tracking
- [ ] Permission configuration

### Examples (Python Implementations)
- [ ] Simple CLI agent
- [ ] Web API agent
- [ ] Stateful chatbot
- [ ] Multi-tool agent
- [ ] MCP server agent

### Documentation Quality
- [ ] All Python code syntactically valid
- [ ] Complete imports and dependencies
- [ ] Error handling patterns
- [ ] Security best practices
- [ ] Cross-references to concepts/
```

## Recommendations for Planner

### 1. Use Parallel Directory Structure (python/ subdirectory)

**Recommendation:** Create python/ directory mirroring typescript/ structure exactly (6 files).

**Rationale:**
- Iteration 1 intentionally created 6 forward-references expecting this structure
- Maintains language separation (TypeScript and Python users find their guides quickly)
- Allows language-specific depth (Python virtual environments, TypeScript tsconfig)
- Scales to future languages (Go, Rust, Java could follow same pattern)
- Grep searches remain effective ("python setup", "typescript query")

**Implementation:**
```bash
mkdir -p ~/.claude/docs/agent-sdk/python
# Create 6 files matching typescript/ structure
```

**Files to Create:**
1. python/setup.md (installation, venv, requirements.txt)
2. python/query-pattern.md (stateless query() with async/await)
3. python/client-pattern.md (stateful ClaudeSDKClient)
4. python/custom-tools.md (@tool decorator, type hints)
5. python/options.md (ClaudeAgentOptions reference)
6. python/async-patterns.md (async iteration, message handling)

**Estimated Effort:** 6-8 hours for Builder-1 (web harvest + documentation)

### 2. Extend Example Files to Multi-Language Format

**Recommendation:** Modify existing 5 example files to include both TypeScript and Python implementations in same file.

**Rationale:**
- Users benefit from side-by-side comparison
- Reduces duplication of problem statements, concepts, explanations
- Maintains 5 example files (not 10 separate files)
- Easier to keep synchronized (one source of truth per use case)
- File size increase manageable (~550-1,150 lines per file)

**Structure Pattern:**
```markdown
# Example Title

## Overview (language-agnostic)
## Problem Statement (language-agnostic)

## Complete Code

### TypeScript Implementation
```typescript
[existing TS code]
```
#### Running the TypeScript Version

### Python Implementation
```python
[new Python code]
```
#### Running the Python Version

## How It Works (language-agnostic)
## Key Concepts (language-agnostic)
## Related Documentation (both languages)
```

**Estimated Effort:** 5-7 hours for Builder-2 (5 files, ~150-250 lines Python per file)

### 3. Preserve concepts/ Directory (No Changes)

**Recommendation:** Keep all 6 concept files exactly as-is.

**Rationale:**
- Already architected as cross-language
- No language-specific syntax in concepts/
- Forward-references already in place (will resolve when python/ created)
- Avoids duplication without value

**Action Required:** NONE

### 4. Minimal Agent Prompt Updates

**Recommendation:** Update 2l-planner.md with language-aware directive (<50 tokens).

**Proposed Text:**
```markdown
When planning AI agent features, consult Agent SDK documentation at
~/.claude/docs/agent-sdk/overview.md. Both TypeScript and Python
implementations are available.
```

**Token Count:** ~24 tokens ✓  
**Placement:** "Technology Selection" or "Framework Recommendations" section

**Estimated Effort:** 10 minutes for Builder-2 or Builder-3 (minimal change)

### 5. Feature Parity Validation Strategy

**Recommendation:** Create explicit feature checklist for Builder-1 to follow and Validator to verify.

**Checklist (see Risk 5 above):**
- Core patterns: installation, query, client, tools, options, async
- Advanced features: streaming, MCP, hooks, sessions, cost tracking
- Examples: Python implementations for all 5
- Quality: syntax valid, complete imports, error handling, security

**Implementation:**
- Builder-1 checks off items as documented
- Validator explicitly verifies checklist completion
- Any gaps documented in python/setup.md introduction

**Estimated Effort:** Built into Builder-1 and Validator workflows (no separate time)

### 6. Builder Task Allocation

**Recommendation:** 2 builders for Iteration 2

**Builder-1: Python Implementation Guides (6 files)**
- Task: Create python/ directory with all 6 guides
- Input: Patterns.md, TypeScript guides (as structural template), official Python SDK docs
- Output: 6 markdown files (python/setup.md through python/async-patterns.md)
- Estimated Time: 6-8 hours
- Complexity: MEDIUM-HIGH (feature parity validation)

**Builder-2: Multi-Language Examples (5 files)**
- Task: Extend existing example files with Python implementations
- Input: Patterns.md (extended for multi-language), existing examples/, python/ guides (from Builder-1)
- Output: 5 modified markdown files (examples/*.md)
- Estimated Time: 5-7 hours
- Complexity: HIGH (maintain existing TS, add Python, update cross-refs)

**Builder-3: Agent Integration & Metadata (optional small task)**
- Task: Update 2l-planner.md prompt, update overview.md line 214
- Input: Agent prompt guidelines, overview.md current state
- Output: 2 modified files (2l-planner.md, overview.md)
- Estimated Time: 15-30 minutes
- Complexity: LOW

**Total Estimated Time:** 11-15 hours (within Iteration 2 budget of 7-9 hours for "Python SDK complete")

**Note:** Estimate exceeds plan by ~4 hours. Recommend planner adjusts timeline or simplifies scope (e.g., defer 1-2 complex examples to Iteration 3).

### 7. Validation Strategy for Iteration 2

**Recommendation:** Validator explicitly checks Python-specific quality criteria.

**Validation Checklist:**
- [ ] All 6 python/ files created and placed correctly
- [ ] All 5 example files extended with Python sections
- [ ] Python code syntax validated (python -m py_compile)
- [ ] Python type hints validated (mypy - optional)
- [ ] All new cross-references resolve (python/ ↔ concepts/, examples/ ↔ python/)
- [ ] 6 forward-references in concepts/ now resolve (no more broken links)
- [ ] Feature parity checklist completed (Builder-1 provides checklist)
- [ ] Agent discovery works for Python queries (grep -r "python custom tool")
- [ ] Security patterns followed (no hardcoded keys, environment variables used)
- [ ] Metadata correct (language: "python" for guides, "multi-language" for examples)

**Estimated Effort:** 45-60 minutes for Validator-1

### 8. Update master-plan.yaml Success Criteria

**Recommendation:** Ensure planner updates success criteria to be measurable.

**Current Criteria (from master-plan.yaml):**
- All Python SDK features documented
- Python guides mirror TypeScript structure
- All 5 examples have Python implementations
- Feature parity validated and gaps documented
- 2l-planner.md references docs appropriately
- Python examples are syntactically valid

**Suggested Additions:**
- Feature parity checklist 100% complete (see Risk 5)
- Python code passes `python -m py_compile` (syntax validation)
- New agent queries return Python docs (grep -r "python agent")
- File size increase within acceptable range (examples <1,200 lines)
- 6 forward-references in concepts/ resolve (0 broken links)
- Total documentation system remains cohesive (no fragmentation)

## Resource Map

### Critical Files/Directories

**Existing (from Iteration 1):**
- `~/.claude/docs/agent-sdk/overview.md` - Entry point, needs line 214 update
- `~/.claude/docs/agent-sdk/typescript/` - 6 files, structural template for python/
- `~/.claude/docs/agent-sdk/examples/` - 5 files, need Python sections added
- `~/.claude/docs/agent-sdk/concepts/` - 6 files, unchanged (forward-refs resolve)
- `~/.claude/agents/2l-planner.md` - Needs minimal prompt update (<50 tokens)
- `.2L/plan-4/iteration-3/plan/patterns.md` - Code patterns and conventions (reference)

**To Be Created (Iteration 2):**
- `~/.claude/docs/agent-sdk/python/` - NEW directory (6 files)
  - python/setup.md
  - python/query-pattern.md
  - python/client-pattern.md
  - python/custom-tools.md
  - python/options.md
  - python/async-patterns.md

**To Be Modified (Iteration 2):**
- `~/.claude/docs/agent-sdk/examples/simple-cli-agent.md` - Add Python section
- `~/.claude/docs/agent-sdk/examples/web-api-agent.md` - Add Python section
- `~/.claude/docs/agent-sdk/examples/stateful-chatbot.md` - Add Python section
- `~/.claude/docs/agent-sdk/examples/multi-tool-agent.md` - Add Python section
- `~/.claude/docs/agent-sdk/examples/mcp-server-agent.md` - Add Python section
- `~/.claude/docs/agent-sdk/overview.md` - Update line 214 (Python documentation link)
- `~/.claude/agents/2l-planner.md` - Add Agent SDK reference (<50 tokens)

### Key Dependencies

**Builder Dependencies:**
- **Builder-1 (Python guides)** must complete before **Builder-2 (examples)** starts
  - Reason: Examples need to reference python/ guides in cross-refs
- **Builder-1 and Builder-2** must complete before **Builder-3 (agent integration)** starts
  - Reason: Agent prompt should reference complete documentation
- **All builders** must complete before **Validator-1** runs
  - Reason: Validator needs complete system to check feature parity

**Documentation Dependencies:**
- python/setup.md → Examples reference in Prerequisites section
- python/custom-tools.md → Examples reference for tool creation
- python/query-pattern.md → Examples reference for stateless patterns
- python/client-pattern.md → Examples reference for stateful patterns
- python/options.md → Concepts reference (6 existing forward-refs)
- python/async-patterns.md → Examples reference for streaming/async

**External Dependencies:**
- Official Agent SDK Python docs (web harvest source)
- Python SDK package name (anthropic-sdk or @anthropic-ai/agent-sdk)
- Python SDK version for compatibility notes (assume 1.2.0 parity)

### Testing Infrastructure

**Existing (from Iteration 1):**
- TypeScript syntax validation: `tsc --noEmit`
- Link validation: Bash script from patterns.md
- Grep-based agent discovery testing
- Manual code review by Integrator

**New for Iteration 2:**
- Python syntax validation: `python -m py_compile`
- Python type checking: `mypy` (optional, recommended)
- Python style checking: `black --check` (optional)
- Feature parity checklist validation
- Multi-language file structure validation

**Validation Commands:**
```bash
# Python syntax check
find ~/.claude/docs/agent-sdk/python/ -name "*.md" -exec bash -c '
  sed -n "/\`\`\`python/,/\`\`\`/p" "$1" |
  sed "1d;\$d" > /tmp/example.py &&
  python -m py_compile /tmp/example.py
' _ {} \;

# Python type check (optional)
mypy /tmp/example.py

# Link validation (existing script)
find ~/.claude/docs/agent-sdk/ -name "*.md" -exec bash -c '
  # Extract links and verify targets exist
' _ {} \;

# Agent discovery test (Python queries)
grep -r "python agent" ~/.claude/docs/agent-sdk/
grep -r "python custom tool" ~/.claude/docs/agent-sdk/
grep -r "async python" ~/.claude/docs/agent-sdk/

# Feature parity verification
# (Manual checklist review by Validator-1)
```

## Questions for Planner

### 1. Time Budget Adjustment Needed?

**Context:** Iteration 2 master-plan.yaml estimates 7-9 hours, but Explorer-1 estimates 11-15 hours for complete Python integration (6 guides + 5 examples + agent integration).

**Question:** Should we:
- **Option A:** Adjust iteration budget to 11-15 hours (recommended)
- **Option B:** Reduce scope (defer 2 complex examples to Iteration 3)
- **Option C:** Accept risk of running over budget

**Explorer Recommendation:** Option A (adjust budget) - Feature parity goal requires all 5 examples.

### 2. Python SDK Package Name?

**Context:** Official Python package name unknown - might be `anthropic-sdk`, `anthropic`, or `@anthropic-ai/agent-sdk`.

**Question:** Should Builder-1 verify package name during web harvest, or should we research now?

**Explorer Recommendation:** Builder-1 verifies during web harvest (avoids premature assumption).

### 3. Python Type Checking Required?

**Context:** mypy provides type checking for Python (equivalent to TypeScript's type system) but adds validation time.

**Question:** Should Python code examples be validated with mypy, or is `python -m py_compile` (syntax only) sufficient?

**Explorer Recommendation:** Use mypy for python/ guides only (high visibility), skip for examples/ to save time.

### 4. Multi-Language Examples: Language Order?

**Context:** Examples will have both TypeScript and Python sections.

**Question:** Should TypeScript or Python appear first?

**Options:**
- **TypeScript first:** Maintains consistency with Iteration 1 (TypeScript-first project)
- **Python first:** Signals feature parity achieved
- **Alphabetical:** TypeScript would come after Python if we used "Python Implementation" heading

**Explorer Recommendation:** TypeScript first (consistency, less disruptive to existing structure).

### 5. Should overview.md Promote Python Equally?

**Context:** overview.md currently says "TypeScript - Complete (6 guides)" and "Python - Future iteration".

**Question:** After Iteration 2, should overview.md present both languages as equal first-class options?

**Explorer Recommendation:** Yes - Update overview.md to present TypeScript and Python as equal choices with side-by-side comparison table.

### 6. How to Handle SDK Feature Differences?

**Context:** TypeScript and Python SDKs might have minor differences (see Risk 1).

**Question:** If features differ, should we:
- **Option A:** Document both behaviors with clear labels
- **Option B:** Document only common features (lowest common denominator)
- **Option C:** Document all features, note which are language-specific

**Explorer Recommendation:** Option C (document all, note differences) - Most comprehensive, helps users choose language.

### 7. Should Iteration 2 Update troubleshooting.md?

**Context:** troubleshooting.md currently has TypeScript-only content. Python will introduce new error patterns.

**Question:** Should Builder-1 or Builder-2 add Python-specific troubleshooting entries?

**Scope:**
- Python virtual environment issues
- pip installation problems
- asyncio quirks
- Type hint confusion

**Explorer Recommendation:** Yes - Builder-1 adds "Python-Specific Issues" section to troubleshooting.md (estimated +30 minutes).

---

## Architecture Summary

**Recommended Directory Structure (Post-Iteration 2):**
```
~/.claude/docs/agent-sdk/
├── overview.md                      [MODIFIED: line 214 update]
├── quickstart.md                    [UNCHANGED]
├── troubleshooting.md               [MODIFIED: Python section added]
├── typescript/                      [UNCHANGED: 6 files]
│   ├── setup.md
│   ├── query-pattern.md
│   ├── client-pattern.md
│   ├── custom-tools.md
│   ├── options.md
│   └── streaming.md
├── python/                          [NEW: 6 files]
│   ├── setup.md
│   ├── query-pattern.md
│   ├── client-pattern.md
│   ├── custom-tools.md
│   ├── options.md
│   └── async-patterns.md
├── concepts/                        [UNCHANGED: 6 files]
│   ├── permissions.md
│   ├── mcp.md
│   ├── hooks.md
│   ├── tools.md
│   ├── sessions.md
│   └── cost-tracking.md
└── examples/                        [MODIFIED: 5 files extended]
    ├── simple-cli-agent.md          (now multi-language)
    ├── web-api-agent.md             (now multi-language)
    ├── stateful-chatbot.md          (now multi-language)
    ├── multi-tool-agent.md          (now multi-language)
    └── mcp-server-agent.md          (now multi-language)
```

**Files Changed:** 8 (5 examples + overview.md + troubleshooting.md + 2l-planner.md)  
**Files Created:** 6 (python/ directory)  
**Files Unchanged:** 13 (typescript/ + concepts/ + quickstart.md)  
**Total Files:** 27 (was 21 including agent prompts)

**Cross-References:**
- 6 forward-references in concepts/ resolve (no more broken links)
- ~50 new cross-references added (examples/ → python/, python/ → concepts/)
- All existing 200+ cross-references preserved

**Estimated Content:**
- Python guides: ~5,000 words (matching typescript/ depth)
- Python examples: ~2,000 lines of code (embedded in existing files)
- Total documentation: ~28,000 words + ~9,000 lines code

**Agent Discovery:**
- New queries work: "python agent", "python custom tool", "async python"
- Existing queries continue working: "custom tool", "permissions", "MCP"
- Examples match both language queries

---

**Explorer-1 Report Complete**  
**Date:** 2025-10-13  
**Confidence:** HIGH (95%)  
**Recommendation:** Proceed with parallel directory structure + multi-language examples approach.
