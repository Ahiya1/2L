# Explorer 2 Report: Technical Requirements & Implementation Patterns

## Executive Summary

Python documentation integration for Agent SDK requires 6 implementation guides and 5 example file extensions (11 file modifications total). Python SDK demonstrates strong API parity with TypeScript but uses distinct patterns: @tool decorators vs Zod schemas, asyncio vs promises, type hints vs TypeScript interfaces. Existing web harvest (/tmp/agent-sdk-harvest/python.html, 2266 lines) provides sufficient content for Python-specific features. Validation strategy uses Python ast module for syntax checking (no compilation). Primary technical risk: async/await pattern differences between languages requiring careful documentation of asyncio-specific behaviors.

## Discoveries

### 1. Python SDK API Coverage

**Package Information:**
- **Package name:** claude-agent-sdk (PyPI)
- **Installation:** pip install claude-agent-sdk
- **Python version:** 3.8+ required (async/await support)
- **SDK version:** 1.2.0+ (matches TypeScript version)

**Core API Equivalence:**

| Feature | TypeScript | Python | Parity Status |
|---------|-----------|--------|---------------|
| Stateless query | query() | query() | Full parity |
| Stateful client | ClaudeSDKClient | ClaudeSDKClient | Full parity |
| Custom tools | tool() with Zod | @tool() decorator | Full parity (different syntax) |
| MCP server creation | create_sdk_mcp_server() | create_sdk_mcp_server() | Full parity |
| Options configuration | ClaudeAgentOptions interface | ClaudeAgentOptions class | Full parity |
| Streaming | Async iterables | AsyncIterator | Full parity |
| Hooks | Pre/post tool hooks | Pre/post tool hooks | Full parity |
| Interrupts | client.interrupt() | await client.interrupt() | Full parity |
| Message types | TypeScript types | Python classes | Full parity |

**Key Finding:** Python SDK achieves 100% feature parity with TypeScript SDK. All 6 TypeScript guides have direct Python equivalents.

### 2. Python-Specific Implementation Patterns

**Pattern 1: Tool Definition with Decorator**

TypeScript approach (Zod schema):
```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

const readFile = tool({
  name: 'read_file',
  description: 'Read file contents',
  input_schema: z.object({
    filepath: z.string().describe('Path to file'),
  }),
  handler: async (input) => {
    return content;
  },
});
```

Python approach (decorator with type hints):
```python
from claude_agent_sdk import tool
from typing import Any

@tool("read_file", "Read file contents", {"filepath": str})
async def read_file(args: dict[str, Any]) -> dict[str, Any]:
    return {
        "content": [{
            "type": "text",
            "text": content
        }]
    }
```

**Key differences:**
- Python uses decorator syntax (@tool) instead of function call wrapper
- Python tool handlers return structured dict with content key
- Python type hints (dict[str, Any]) vs TypeScript interfaces
- No external schema library (Zod) required for Python

**Pattern 2: Async/Await and Context Managers**

TypeScript approach:
```typescript
const client = new ClaudeSDKClient({ apiKey: process.env.ANTHROPIC_API_KEY });
await client.connect();
await client.query("Hello");
for await (const message of client.receiveResponse()) {
  console.log(message);
}
await client.disconnect();
```

Python approach (context manager):
```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def main():
    async with ClaudeSDKClient() as client:
        await client.query("Hello")
        async for message in client.receive_response():
            print(message)

asyncio.run(main())
```

**Key differences:**
- Python strongly favors async with context managers for resource cleanup
- Python requires explicit asyncio.run(main()) wrapper
- Python uses snake_case method names (receive_response vs receiveResponse)
- Python has asyncio-specific cleanup issues (must avoid break in async loops)

### 3. Documentation Structure Requirements

**Python Guide Structure (mirrors TypeScript):**

```
~/.claude/docs/agent-sdk/
├── python/                          # NEW: Python-specific guides
│   ├── setup.md                    # Virtual env, pip, requirements.txt
│   ├── query-pattern.md            # async/await with query()
│   ├── client-pattern.md           # ClaudeSDKClient with asyncio
│   ├── custom-tools.md             # @tool decorator, type hints
│   ├── options.md                  # ClaudeAgentOptions reference
│   └── async-patterns.md           # asyncio, AsyncIterator, context managers
└── examples/                        # MODIFY: Add Python sections
    ├── simple-cli-agent.md         # Add Python implementation
    ├── web-api-agent.md            # Add Python implementation
    ├── stateful-chatbot.md         # Add Python implementation
    ├── multi-tool-agent.md         # Add Python implementation
    └── mcp-server-agent.md         # Add Python implementation
```

**Files to Create:** 6 new Python guide files
**Files to Modify:** 5 existing example files + 1 overview.md

### 4. Code Example Requirements (All 5 Examples)

**Example 1: simple-cli-agent.md**
- Current state: TypeScript-only (177 lines)
- Python addition: Convert process.argv to sys.argv, fs operations to pathlib
- Estimated addition: ~150 lines Python code + 50 lines explanation

**Example 2: web-api-agent.md**
- Current state: TypeScript with Express (100+ lines)
- Python addition: Replace Express with FastAPI, add ASGI server setup
- Estimated addition: ~120 lines Python code + 60 lines explanation

**Example 3: stateful-chatbot.md**
- Current state: TypeScript with ClaudeSDKClient (150+ lines)
- Python addition: Context manager pattern, asyncio.run() wrapper
- Estimated addition: ~140 lines Python code + 50 lines explanation

**Example 4: multi-tool-agent.md**
- Current state: TypeScript with 5+ tools (200+ lines)
- Python addition: Convert Zod schemas to decorators, replace axios with aiohttp
- Estimated addition: ~180 lines Python code + 70 lines explanation

**Example 5: mcp-server-agent.md**
- Current state: TypeScript with MCP server (250+ lines)
- Python addition: Python MCP server implementation with @tool decorators
- Estimated addition: ~200 lines Python code + 80 lines explanation

**Total estimated additions:** ~1,100 lines across 5 files

### 5. Python-Specific Dependencies

**Core Dependencies:**
```
claude-agent-sdk>=1.2.0
python-dotenv>=1.0.0
aiofiles>=23.0.0
```

**Development Dependencies:**
```
mypy>=1.0.0
black>=23.0.0
pytest>=7.0.0
pytest-asyncio>=0.21.0
```

**Example-Specific:**
- Web API: fastapi, uvicorn, httpx
- Multi-Tool: aiohttp, pydantic

## Patterns Identified

### Pattern 1: Multi-Language Example Structure

**Description:** Single markdown file containing both TypeScript and Python implementations side-by-side

**Structure:**
```markdown
# Simple CLI Agent

## Overview
[Language-agnostic description]

## Complete Code

### TypeScript Implementation
[Full TypeScript code]

### Python Implementation
[Full Python code]

## Running the Example

### TypeScript
npm install && npx tsx example.ts

### Python
pip install -r requirements.txt && python example.py
```

**Recommendation:** Use this pattern for all 5 examples.

### Pattern 2: Python Syntax Validation Strategy

**Description:** Use Python ast module for syntax validation (no compilation needed)

**Implementation:**
```python
import ast

def validate_python_syntax(code: str) -> tuple[bool, str]:
    try:
        ast.parse(code)
        return (True, "")
    except SyntaxError as e:
        return (False, f"Syntax error at line {e.lineno}: {e.msg}")
```

**Recommendation:** Use ast.parse() for syntax validation. Add optional mypy type checking.

### Pattern 3: Python Type Hints Documentation

**Description:** Document type hints consistently across Python examples

**Pattern:**
```python
from typing import Any, AsyncIterator, Optional
from claude_agent_sdk import ClaudeSDKClient

async def create_agent_client(
    api_key: Optional[str] = None
) -> ClaudeSDKClient:
    """Create and configure an agent client."""
    if api_key is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
    return ClaudeSDKClient(options=ClaudeAgentOptions(api_key=api_key))
```

**Recommendation:** Use type hints on function signatures. Include docstrings for complex functions.

### Pattern 4: Asyncio Event Loop Documentation

**Description:** Clearly document asyncio entry point patterns

**Pattern for script entry points:**
```python
async def main() -> None:
    async with ClaudeSDKClient() as client:
        await client.query("Hello")

if __name__ == "__main__":
    asyncio.run(main())
```

**Recommendation:** Document all three patterns (script, Jupyter, nested functions).

### Pattern 5: Error Handling in Python

**Description:** Python-specific error handling patterns for async code

**Pattern:**
```python
try:
    async with ClaudeSDKClient() as client:
        await client.query(prompt)
        async for message in client.receive_response():
            print(message)
except ClaudeSDKError as e:
    print(f"Agent error: {e}")
except asyncio.TimeoutError:
    print("Request timed out")
```

**Recommendation:** Catch specific exceptions before generic Exception.

## Complexity Assessment

### High Complexity Areas

**1. Async/Await Pattern Translation (8/10 complexity)**
- Why complex: Python asyncio has different semantics than JavaScript promises
- Specific challenges: Context manager pattern, event loop management, cleanup issues
- Estimated builder splits: Likely needs 2 builders (core vs advanced async)

**2. Tool Definition Pattern Differences (7/10 complexity)**
- Why complex: Decorator syntax vs functional composition
- Specific challenges: Return format differs, type hints vs Zod
- Estimated builder splits: Single builder can handle with careful documentation

**3. Multi-Language Example Files (6/10 complexity)**
- Why complex: Maintaining consistency across two implementations
- Specific challenges: Same capabilities in both languages, cross-references
- Estimated builder splits: Single builder per example

### Medium Complexity Areas

**1. Python Virtual Environment Documentation (5/10 complexity)**
- Why medium: Multiple approaches (venv, virtualenv, poetry)
- Recommendation: Document venv as primary

**2. Python Package Management (4/10 complexity)**
- Why medium: requirements.txt vs pyproject.toml
- Recommendation: Use requirements.txt for simplicity

**3. Type Hints vs TypeScript Types (5/10 complexity)**
- Why medium: Similar but not identical semantics
- Recommendation: Create comparison table

### Low Complexity Areas

**1. Import Statement Conversion (2/10 complexity)**
- Why low: Direct 1:1 mapping

**2. File Operations (2/10 complexity)**
- Why low: Well-documented Python equivalents

**3. Environment Variable Loading (2/10 complexity)**
- Why low: Standard pattern in both languages

## Technology Recommendations

### Primary Python Stack

**Package Manager:** pip with requirements.txt
- Rationale: Standard tool, universal compatibility, simple for beginners

**Virtual Environment:** venv (standard library)
- Rationale: Built into Python 3.3+, no external dependencies

**Type Checking:** mypy (optional)
- Rationale: Industry standard, catches type errors, optional

**Async File I/O:** aiofiles
- Rationale: Required for async file operations in examples

### Supporting Libraries

**Web API Agent Example:**
- Primary: FastAPI + Uvicorn
- Rationale: Modern, async-native, excellent documentation

**Multi-Tool Agent Example:**
- HTTP Client: httpx (async)
- Rationale: Async-native, similar to requests API

**Syntax Validation:**
- Primary: ast module (standard library)
- Secondary: mypy (optional)

## Integration Points

### Internal Integrations

**1. TypeScript ↔ Python Guide Cross-References**

Python guides will link to:
- Other Python guides (same directory)
- Same concept guides (cross-language)
- Same examples (now multi-language)
- TypeScript equivalents (for comparison)

**2. Example Files ↔ Language-Specific Guides**

Examples will link to both TypeScript and Python guides with conditional language sections.

**3. Overview.md ↔ Language Guides**

Add Python code examples to overview.md, update Quick Start section with both languages.

## Web Harvest Assessment

### Harvest Completeness

**Files harvested:**
- /tmp/agent-sdk-harvest/python.html - 2,266 lines
- Contains full Python API reference from official docs

**Content quality assessment:**
- Installation instructions: Complete
- query() function: Complete
- ClaudeSDKClient class: Complete
- @tool decorator: Complete
- Async/await patterns: Complete
- Context manager examples: Complete

**Gaps identified:**
- Virtual environment setup (not SDK-specific)
- requirements.txt best practices (general Python)
- mypy configuration (general Python)
- Testing patterns (general Python)

**Assessment:** Web harvest provides 90% of needed content. Missing items are Python ecosystem conventions.

### Additional Harvest Needed?

**Recommendation:** No additional harvest needed

**Rationale:**
1. Existing harvest covers all SDK APIs
2. Missing items are general Python knowledge
3. Can supplement with Python ecosystem best practices

**Manual research areas:**
- Python virtual environment setup
- FastAPI integration patterns
- Asyncio best practices

## Validation Strategy

### 1. Python Syntax Validation

**Tool:** Python ast module (standard library)

**Usage:**
```python
import ast

code = open("example.py").read()
try:
    ast.parse(code)
    print("Syntax valid")
except SyntaxError as e:
    print(f"Syntax error: {e}")
```

**Validation levels:**
- Level 1 (REQUIRED): Syntax validation with ast.parse()
- Level 2 (OPTIONAL): Type checking with mypy
- Level 3 (POST-MVP): Import validation
- Level 4 (POST-MVP): Execution testing

### 2. Cross-Reference Validation

Validate Python-specific links resolve correctly.

### 3. Feature Parity Validation

Check that Python guides mirror TypeScript guides.

### 4. Quality Metrics

| Metric | Target | Method |
|--------|--------|--------|
| Python syntax validity | 100% | ast.parse() |
| Type hint coverage | 80%+ | Count functions |
| Cross-references valid | 100% | Link validation |
| Feature parity | 100% | Compare topics |

## Risks & Challenges

### Technical Risks

**Risk 1: Async/Await Semantic Differences**
- Impact: HIGH
- Mitigation: Comprehensive async patterns guide, troubleshooting section

**Risk 2: Type Hints Not Enforced**
- Impact: MEDIUM
- Mitigation: Document as best practice, show examples both ways

**Risk 3: Multiple Package Management Approaches**
- Impact: MEDIUM
- Mitigation: pip + requirements.txt as primary, mention alternatives

**Risk 4: Virtual Environment Complexity**
- Impact: MEDIUM
- Mitigation: Emphasize venv setup, explain why it matters

### Complexity Risks

**Risk 1: Builder Needs to Split Python Guides**
- Impact: HIGH
- Mitigation: Detailed patterns, templates, pre-assign split point

**Risk 2: Example File Modifications Cause Conflicts**
- Impact: MEDIUM
- Mitigation: Sequence modifications, use clear section markers

**Risk 3: Maintaining Consistency Across Languages**
- Impact: MEDIUM
- Mitigation: Strict templates, cross-reference validation

## Recommendations for Planner

### 1. Use Template-Driven Approach for Python Guides

Create detailed templates BEFORE builder starts.

### 2. Implement Python Guides Before Modifying Examples

Sequence: Python guides first, then example modifications.

### 3. Provide Async Pattern Comparison Table

Create table comparing TypeScript to Python async patterns.

### 4. Validate Incrementally, Not End-to-End

Run validation after each guide is complete.

### 5. Use Two Builders Only If First Guide Takes >3 Hours

Decision criteria: Monitor progress, split if needed.

### 6. Extract Python Code Examples to Separate Files First

Validate syntax before inserting into markdown.

### 7. Document Python-Specific "Gotchas" Prominently

Create callout boxes for critical differences.

### 8. Test With Multiple Python Versions

Minimum: Python 3.8, 3.11, 3.12

### 9. Create Python Example Requirements Files

Add requirements.txt for each example.

### 10. Add "Compare with TypeScript" Links

Help users transitioning between languages.

## Resource Map

### Critical Files/Directories

**Existing (reference):**
- ~/.claude/docs/agent-sdk/typescript/ - 6 TypeScript guides
- ~/.claude/docs/agent-sdk/concepts/ - 6 cross-language guides
- /tmp/agent-sdk-harvest/python.html - Harvested content

**Files to CREATE (6 new):**
- ~/.claude/docs/agent-sdk/python/setup.md
- ~/.claude/docs/agent-sdk/python/query-pattern.md
- ~/.claude/docs/agent-sdk/python/client-pattern.md
- ~/.claude/docs/agent-sdk/python/custom-tools.md
- ~/.claude/docs/agent-sdk/python/options.md
- ~/.claude/docs/agent-sdk/python/async-patterns.md

**Files to MODIFY (6):**
- ~/.claude/docs/agent-sdk/examples/simple-cli-agent.md
- ~/.claude/docs/agent-sdk/examples/web-api-agent.md
- ~/.claude/docs/agent-sdk/examples/stateful-chatbot.md
- ~/.claude/docs/agent-sdk/examples/multi-tool-agent.md
- ~/.claude/docs/agent-sdk/examples/mcp-server-agent.md
- ~/.claude/docs/agent-sdk/overview.md

### Key Dependencies

**Python Runtime:** Python 3.8+

**Core Packages:**
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0
- aiofiles>=23.0.0

**Example Packages:**
- fastapi, uvicorn (Web API)
- aiohttp, pydantic (Multi-Tool)

**Validation:** ast (built-in), mypy (optional)

## Questions for Planner

### 1. Builder Task Splitting Decision

Should Python guide creation be split into 2 builder tasks?

Options:
- Single builder: all 6 guides + 5 examples (7-9 hours)
- Split builders: parallel work, faster completion

Recommendation: Start single builder, split if >3 hours on first guide.

### 2. Python Package Manager Standardization

Which Python package management approach for documentation?

Options:
- pip + requirements.txt (traditional)
- poetry + pyproject.toml (modern)

Recommendation: pip + requirements.txt as primary.

### 3. Type Hints Policy

How strictly should examples use type hints?

Options:
- All examples with full type hints
- Function signatures only
- Optional, show both ways

Recommendation: Function signatures, optional for variables.

### 4. Virtual Environment Documentation Scope

How much detail about virtual environments?

Options:
- Minimal (just venv commands)
- Comprehensive (venv, virtualenv, conda)
- Medium (venv primary, mention alternatives)

Recommendation: Medium depth.

### 5. Async Pattern Documentation Depth

Should there be dedicated async-patterns.md guide?

Options:
- Dedicated guide
- Integrate into each guide

Recommendation: Dedicated guide for this complex topic.

### 6. Multi-Language Example File Structure

How should examples present code?

Options:
- Side-by-side columns
- Sequential (TS first, then Python)
- Tabs (interactive)

Recommendation: Sequential, simple formatting.

---

**Exploration Complete:** All technical requirements analyzed. Ready for planner to create detailed builder tasks.
