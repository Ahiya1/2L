# Technology Stack - Iteration 2 (Python SDK Integration)

## Core Framework

**Decision:** Python 3.8+ with claude-agent-sdk

**Rationale:**
- Python 3.8 minimum required for async/await support (Agent SDK requirement)
- claude-agent-sdk package provides 100% API parity with TypeScript SDK (confirmed by Explorer-2)
- Python's context manager pattern (async with) aligns perfectly with Agent SDK resource management
- Type hints (typing module) provide equivalent safety to TypeScript types without compilation overhead
- asyncio standard library handles async patterns without external dependencies

**Alternatives Considered:**
- Python 3.7: Lacks some async features, not supported by SDK
- Python 3.9+: Would exclude some users, 3.8 provides good balance

**SDK Version:** 1.2.0+ (matches TypeScript version from Iteration 1)

---

## Python SDK Documentation Approach

**Decision:** Mirror TypeScript structure with parallel python/ directory

**Rationale:**
- Maintains clear language separation (users choose TypeScript OR Python path)
- Preserves Iteration 1 architecture (concepts/ remain cross-language, implementations separated)
- Enables language-specific depth (Python virtual environments, asyncio patterns)
- Resolves 6 intentional forward-references from Iteration 1 concepts/ files
- Scales to future languages (Go, Rust can follow same pattern)

**Implementation Structure:**
```
~/.claude/docs/agent-sdk/
├── typescript/        # Iteration 1 (6 files, UNCHANGED)
├── python/           # Iteration 2 (6 files, NEW)
├── concepts/         # Cross-language (6 files, UNCHANGED)
└── examples/         # Multi-language (5 files, EXTENDED)
```

**Package Management:** pip with requirements.txt (standard, universal compatibility)

**Virtual Environment:** venv (Python 3.3+ standard library, no external dependencies)

---

## Multi-Language Example File Structure

**Decision:** Extend existing example files with Python sections (not create separate files)

**Rationale:**
- Users benefit from side-by-side language comparison
- Reduces duplication of problem statements, explanations, concepts
- Maintains 5 example files (not 10) - easier navigation
- File size increase manageable (examples will be 550-1,150 lines vs current 180-602 lines)
- Preserves Iteration 1 TypeScript content exactly (no modifications to existing sections)

**Example Structure Pattern:**
```markdown
# Example Title

## Overview (language-agnostic)
## Problem Statement (language-agnostic)
## Prerequisites (both languages listed)

## TypeScript Implementation
### Installation
### Complete Code
### Running the Example

## Python Implementation
### Installation
### Complete Code
### Running the Example

## How It Works (expanded for both languages)
## Key Concepts (language-agnostic)
## Related Documentation (both language guides)
```

**File Size Impact:**
- simple-cli-agent.md: 281 lines → ~550 lines (+200 lines Python)
- web-api-agent.md: 398 lines → ~750 lines (+250 lines Python)
- stateful-chatbot.md: 387 lines → ~750 lines (+300 lines Python)
- multi-tool-agent.md: 520 lines → ~1,000 lines (+450 lines Python)
- mcp-server-agent.md: 602 lines → ~1,150 lines (+500 lines Python)

---

## Python Syntax Validation Approach

**Decision:** Python ast module for syntax validation (no compilation step)

**Rationale:**
- Python has no TypeScript-equivalent compilation step
- ast.parse() validates syntax correctness (standard library, zero dependencies)
- Type hints are optional in Python (mypy validation optional, not required)
- Manual review with checklist provides "good enough" confidence for documentation
- Iteration 1 achieved 95% confidence without runtime execution (same approach acceptable for Python)

**Validation Method:**
```python
import ast

def validate_python_syntax(code: str) -> tuple[bool, str]:
    try:
        ast.parse(code)
        return (True, "")
    except SyntaxError as e:
        return (False, f"Syntax error at line {e.lineno}: {e.msg}")
```

**Validation Levels:**
- Level 1 (REQUIRED): Syntax validation with ast.parse()
- Level 2 (OPTIONAL): Type checking with mypy (guides only, not examples)
- Level 3 (POST-MVP): Import validation
- Level 4 (POST-MVP): Execution testing

**Implementation:**
- Builder-1 validates Python guides during creation
- Builder-2 validates Python example code before insertion
- Manual review checklist ensures pattern compliance

---

## Feature Parity Validation Method

**Decision:** Early validation with explicit gap documentation

**Rationale:**
- Python and TypeScript SDKs have 100% API parity (confirmed by Explorer-2)
- Syntax differs but capabilities identical (decorators vs functions, async def vs async function)
- Early validation (Builder-1 first hour) catches gaps before building documentation
- Explicit gap documentation better than pretending parity where it doesn't exist

**Validation Strategy:**

**Phase 1: Initial Comparison (Builder-1, Hour 1)**
```markdown
Feature Parity Checklist:
- [ ] Query pattern (stateless)
- [ ] Client pattern (stateful)
- [ ] Custom tool creation (@tool decorator)
- [ ] Configuration options (ClaudeAgentOptions)
- [ ] Streaming (AsyncIterator)
- [ ] MCP integration
- [ ] Hooks system
- [ ] Permissions
- [ ] Session management
- [ ] Cost tracking
```

**Phase 2: Per-Guide Validation (Builder-1, during writing)**
- Compare python/setup.md structure to typescript/setup.md
- Verify same sections, same depth, same concepts
- Flag missing features immediately

**Phase 3: Final Validation (Builder-2, end of iteration)**
- Side-by-side comparison of all 6 Python vs TypeScript guides
- Validation report documents any differences
- Gaps noted in python/setup.md "Known Differences" section

**Gap Documentation Pattern:**
```markdown
## TypeScript vs Python Differences

### Syntax Differences (Expected)
- Tool creation: tool() function vs @tool decorator
- Async: async function vs async def
- Types: TypeScript interfaces vs Python type hints

### Feature Differences (Document if found)
- [None found - 100% API parity]
```

---

## Cross-Reference Strategy

**Decision:** Bidirectional linking with language comparison references

**Rationale:**
- Python guides link to concepts (same as TypeScript)
- Python guides link to TypeScript equivalents (helps users compare)
- Examples link to both Python and TypeScript guides (users choose language)
- 6 forward-references from Iteration 1 concepts/ resolve automatically

**Cross-Reference Types:**

**Type 1: Python → Concepts (Bidirectional)**
```markdown
# In python/custom-tools.md
See [Tools Concept](../concepts/tools.md) for architectural overview.

# In concepts/tools.md (already has forward-ref)
For Python implementation, see [Python Custom Tools](../python/custom-tools.md).
```

**Type 2: Python → TypeScript (Comparison)**
```markdown
# In python/query-pattern.md
For TypeScript equivalent, see [TypeScript Query Pattern](../typescript/query-pattern.md).
```

**Type 3: Examples → Both Languages**
```markdown
# In examples/simple-cli-agent.md
## Prerequisites

**For TypeScript:**
- [Setup Guide](../typescript/setup.md)

**For Python:**
- [Setup Guide](../python/setup.md)
```

**Type 4: Overview → Python Directory**
```markdown
# In overview.md (line 214 update)
- **Documentation:** [Python Setup](./python/setup.md)
```

**Cross-Reference Validation:**
- All 6 forward-references from Iteration 1 must resolve
- All new Python → concepts links must resolve
- All Python → TypeScript comparison links must resolve
- Integration phase validates zero broken links

---

## Agent Prompt Integration Method

**Decision:** Minimal directive in 2l-planner.md following Iteration 1 pattern

**Rationale:**
- Iteration 1 successfully updated 2l-explorer.md with ~26 tokens
- Same pattern proven effective (strong directive, specific file path)
- 2l-planner.md needs language-aware reference (both TypeScript and Python available)
- Token budget <50 allows clear, actionable language

**Prompt Text (approximately 30 tokens):**
```markdown
When planning agent or assistant features, note that Agent SDK documentation
covers both TypeScript and Python implementations at
`~/.claude/docs/agent-sdk/overview.md`.
```

**Placement:** After "# Technology Selection" or in "Framework Recommendations" section

**Token Count:** ~30 tokens (60% of 50-token budget) ✓

**Directive Strength:** STRONG
- "note that... covers" (imperative language)
- Specific file path for Read tool
- Mentions both languages
- Links to overview.md (entry point for all documentation)

**Validation:**
- Token count measured after insertion
- Functional test: Does planner reference Agent SDK in tech stack decisions?
- Grep test: Can agents find both Python and TypeScript documentation?

---

## Python Dependencies

### Core Dependencies
**Purpose:** Required for all Python Agent SDK applications

```txt
claude-agent-sdk>=1.2.0
python-dotenv>=1.0.0
```

**Rationale:**
- claude-agent-sdk: Core SDK (matches TypeScript version)
- python-dotenv: Environment variable loading (equivalent to dotenv in TypeScript examples)

### Development Dependencies
**Purpose:** Code quality and validation (optional)

```txt
mypy>=1.0.0
black>=23.0.0
pytest>=7.0.0
pytest-asyncio>=0.21.0
```

**Rationale:**
- mypy: Type checking (optional, validates type hints)
- black: Code formatting (consistent style)
- pytest: Testing framework (for examples with tests)
- pytest-asyncio: Async test support

### Example-Specific Dependencies

**Web API Agent Example:**
```txt
fastapi>=0.104.0
uvicorn>=0.24.0
httpx>=0.25.0
```

**Multi-Tool Agent Example:**
```txt
aiohttp>=3.9.0
pydantic>=2.5.0
aiofiles>=23.2.0
```

**Rationale:**
- fastapi/uvicorn: Modern async web framework (equivalent to Express in TypeScript)
- httpx: Async HTTP client (equivalent to axios)
- aiohttp: Alternative async HTTP library
- pydantic: Schema validation (equivalent to Zod)
- aiofiles: Async file operations

### Python Version Requirements

**Minimum:** Python 3.8

**Recommended:** Python 3.11+

**Rationale:**
- 3.8: Minimum for async/await features used by SDK
- 3.11: Performance improvements, better async support
- Type hints syntax compatible with 3.8+

---

## Environment Variables

**Standard Environment Setup:**

```bash
# Required for all examples
export ANTHROPIC_API_KEY=your-api-key-here

# Optional: Python virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows
```

**Documentation in python/setup.md:**
- Virtual environment setup (venv command)
- Environment variable configuration (.env file support)
- API key acquisition (link to Anthropic console)
- Common installation issues (pip, Python version)

---

## Python vs TypeScript Comparison Table

**Document in overview.md for quick reference:**

| Feature | TypeScript | Python | Notes |
|---------|-----------|--------|-------|
| **Package Manager** | npm/yarn | pip/uv | Both use standard tools |
| **Environment** | package.json | requirements.txt + venv | Python needs virtual env |
| **Type System** | Native types | Type hints (optional) | Python types not enforced |
| **Tool Creation** | tool() function | @tool decorator | Different syntax, same capability |
| **Schema Validation** | Zod | Pydantic | Different libraries, same patterns |
| **Async Syntax** | async function | async def | Different keywords |
| **Imports** | import { x } from 'y' | from y import x | Different syntax |
| **Error Handling** | try-catch | try-except | Different keywords |
| **Compilation** | tsc (checked) | None (runtime only) | Python no compile step |
| **Context Management** | try-finally | async with | Python has cleaner pattern |

**Key Takeaway:** 100% feature parity, syntax differs, choose based on team preference.

---

## Performance Targets

**Documentation System:**
- Total files: 26 (20 from Iteration 1 + 6 new)
- New content: ~5,000 words (Python guides) + ~2,000 lines code (examples)
- Cross-references: +50 new links
- Agent discovery: <2 seconds for Grep searches

**Code Quality Targets:**
- Python syntax validity: 100% (ast.parse validation)
- Type hint coverage: 80%+ (function signatures)
- Error handling: 100% (all async operations wrapped)
- Security compliance: 100% (no hardcoded secrets)

---

## Security Considerations

**Environment Variables (Required Pattern):**
```python
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('ANTHROPIC_API_KEY')
if not api_key:
    raise ValueError('ANTHROPIC_API_KEY environment variable required')
```

**Security Patterns:**
- All production examples use environment variables
- API key validation before use
- Explicit warnings against hardcoding in python/setup.md
- Security considerations in python/custom-tools.md (tool access control)

**Documentation Requirements:**
- Security section in python/setup.md
- API key best practices in quickstart.md
- Permission system reference in python/options.md

---

## Technology Decisions Summary

**Established (Reuse from Iteration 1):**
- Markdown documentation (same format)
- YAML frontmatter (same metadata schema)
- Relative path cross-references (same convention)
- ~/.claude/docs/agent-sdk/ location (same directory)

**New for Iteration 2:**
- Python 3.8+ language requirement
- claude-agent-sdk package (Python equivalent)
- ast.parse() syntax validation (no compilation)
- Multi-language example file structure
- pip + requirements.txt + venv (Python ecosystem)
- @tool decorator pattern (Python SDK syntax)
- async def / await patterns (Python async syntax)
- Type hints with typing module (Python types)

**Deferred (Future Iterations):**
- Execution testing (post-MVP)
- Advanced async patterns (Iteration 3+)
- Alternative package managers (post-MVP)
- IDE configuration (post-MVP)

---

**Tech Stack Status:** DEFINED
**Ready for:** Pattern documentation and builder task breakdown
**Validated by:** 3 explorer reports, Iteration 1 success
**API Parity:** 100% confirmed (TypeScript ↔ Python)
