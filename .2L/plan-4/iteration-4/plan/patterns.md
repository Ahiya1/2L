# Code Patterns & Conventions - Iteration 2 (Python Integration)

## File Organization Patterns

### Updated Directory Structure
```
~/.claude/docs/agent-sdk/
├── overview.md                      # Entry point (MODIFIED: Python reference)
├── quickstart.md                    # UNCHANGED
├── troubleshooting.md               # MODIFIED: Python section
├── typescript/                      # UNCHANGED: 6 TypeScript guides
│   ├── setup.md
│   ├── query-pattern.md
│   ├── client-pattern.md
│   ├── custom-tools.md
│   ├── options.md
│   └── streaming.md
├── python/                          # NEW: 6 Python guides
│   ├── setup.md
│   ├── query-pattern.md
│   ├── client-pattern.md
│   ├── custom-tools.md
│   ├── options.md
│   └── async-patterns.md
├── concepts/                        # UNCHANGED: 6 cross-language guides
│   ├── permissions.md
│   ├── mcp.md
│   ├── hooks.md
│   ├── tools.md
│   ├── sessions.md
│   └── cost-tracking.md
└── examples/                        # MODIFIED: 5 multi-language examples
    ├── simple-cli-agent.md
    ├── web-api-agent.md
    ├── stateful-chatbot.md
    ├── multi-tool-agent.md
    └── mcp-server-agent.md
```

---

## Python Code Example Pattern

### Complete Python Example Template
**When to use:** Every Python code block in python/ guides and examples/

**Code example:**
```python
"""
Example: Read file contents with custom tool

Dependencies:
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0

Install: pip install claude-agent-sdk python-dotenv

Setup:
export ANTHROPIC_API_KEY=your-api-key-here

Python 3.8+ required
"""

import os
import asyncio
from typing import Any, Optional
from claude_agent_sdk import ClaudeSDKClient, tool
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_api_key() -> str:
    """
    Validate and retrieve API key from environment.

    Returns:
        API key string

    Raises:
        ValueError: If ANTHROPIC_API_KEY not set
    """
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY environment variable required')
    return api_key

@tool
async def read_file(args: dict[str, Any]) -> dict[str, Any]:
    """
    Read contents of a file from the filesystem.

    Args:
        args: Dictionary with 'path' key containing file path

    Returns:
        Dictionary with content result for Claude
    """
    try:
        with open(args['path'], 'r', encoding='utf-8') as f:
            content = f.read()

        return {
            "content": [{
                "type": "text",
                "text": f"File contents:\n{content}"
            }]
        }
    except FileNotFoundError:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: File not found: {args['path']}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error reading file: {str(e)}"
            }]
        }

async def main():
    """Main async entry point."""
    try:
        api_key = get_api_key()

        # Initialize client with custom tool
        async with ClaudeSDKClient(
            api_key=api_key,
            tools=[read_file]
        ) as client:
            # Query the agent
            response = await client.query(
                prompt="Read the contents of README.md and summarize it"
            )

            print(f"Response: {response.text}")

    except ValueError as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())

"""
Expected output:
The agent will use the read_file tool to access README.md,
then provide a summary of the project documentation.
"""
```

**Key differences from TypeScript:**
- Triple-quote docstrings (not `/** */` JSDoc comments)
- Type hints: `def func(param: str) -> str:` not `function func(param: string): string`
- `@tool` decorator not `tool()` function wrapper
- `async def` not `async function`
- `asyncio.run(main())` wrapper required (no top-level await)
- `sys.stderr` not `console.error`
- `os.getenv()` not `process.env`
- Context manager: `async with` for resource cleanup
- Dictionary unpacking: `args['path']` not object destructuring

**Required elements:**
- Header docstring with dependencies, installation, setup
- All imports explicit at top
- Type hints on function signatures
- Docstrings for functions (Google style)
- Environment variable validation
- Error handling with try-except
- Context manager for ClaudeSDKClient
- asyncio.run() entry point
- Expected output documentation
- Python 3.8+ compatibility

---

## Dual-Language Example File Pattern

### Multi-Language Example Structure
**When to use:** All 5 example files (simple-cli-agent.md through mcp-server-agent.md)

**Structure:**
```markdown
---
title: "Simple CLI Agent"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
language: "multi-language"
difficulty: "beginner"
related_guides:
  - ../typescript/setup.md
  - ../python/setup.md
  - ../concepts/tools.md
tags:
  - cli
  - agent
  - typescript
  - python
---

# Simple CLI Agent

## Overview
[Language-agnostic description of what this example demonstrates]

## Problem Statement
[The use case this example solves - applies to both languages]

## Prerequisites

### For TypeScript
- Node.js 18+
- npm or yarn
- See [TypeScript Setup Guide](../typescript/setup.md) for installation

### For Python
- Python 3.8+
- pip or uv
- See [Python Setup Guide](../python/setup.md) for installation

### General Requirements
- ANTHROPIC_API_KEY environment variable
- Basic understanding of async programming

## TypeScript Implementation

### Installation

```bash
npm install @anthropic-ai/agent-sdk zod
```

### Complete Code

```typescript
/**
 * TypeScript implementation
 * [Existing TypeScript code - UNCHANGED from Iteration 1]
 */
```

### Running the TypeScript Version

```bash
export ANTHROPIC_API_KEY=your-key
npx tsx simple-cli-agent.ts
```

## Python Implementation

### Installation

```bash
pip install claude-agent-sdk python-dotenv
```

### Complete Code

```python
"""
Python implementation
[Full Python equivalent demonstrating same functionality]
"""

import asyncio
import os
from claude_agent_sdk import ClaudeSDKClient, tool
from dotenv import load_dotenv

# [Full Python implementation here]

if __name__ == '__main__':
    asyncio.run(main())
```

### Running the Python Version

```bash
export ANTHROPIC_API_KEY=your-key
python simple-cli-agent.py
```

## How It Works

[Expanded explanation covering both implementations:
1. Language-agnostic concepts first
2. Note syntax differences where relevant
3. Explain why certain patterns differ between languages]

## Key Concepts Demonstrated

[Language-agnostic list of concepts:
- Custom tool creation
- Environment variable usage
- Error handling
- Async patterns]

## Next Steps

Explore these related examples:
- [Web API Agent](./web-api-agent.md) - Add HTTP interface
- [Stateful Chatbot](./stateful-chatbot.md) - Maintain conversation state

## Related Documentation

**TypeScript:**
- [TypeScript Setup](../typescript/setup.md)
- [TypeScript Custom Tools](../typescript/custom-tools.md)
- [TypeScript Query Pattern](../typescript/query-pattern.md)

**Python:**
- [Python Setup](../python/setup.md)
- [Python Custom Tools](../python/custom-tools.md)
- [Python Query Pattern](../python/query-pattern.md)

**Concepts:**
- [Tools Overview](../concepts/tools.md)
- [Permissions](../concepts/permissions.md)
```

**Key points:**
- YAML frontmatter: `language: "multi-language"`
- Prerequisites section lists both languages separately
- TypeScript section UNCHANGED from Iteration 1 (critical!)
- Python section follows same structure as TypeScript
- "How It Works" expanded to mention both languages
- Related Documentation lists both language guides
- No language preference implied (equal treatment)

---

## Python-Specific Patterns

### Pattern 1: Tool Definition with Decorator

**Description:** Python uses @tool decorator instead of tool() function

**Python pattern:**
```python
from claude_agent_sdk import tool
from typing import Any

@tool
async def calculator(args: dict[str, Any]) -> dict[str, Any]:
    """
    Perform basic arithmetic operations.

    Args:
        args: Dictionary with 'operation' (str) and 'numbers' (list[float])

    Returns:
        Result dictionary for Claude
    """
    operation = args.get('operation', 'add')
    numbers = args.get('numbers', [])

    if operation == 'add':
        result = sum(numbers)
    elif operation == 'multiply':
        result = 1
        for num in numbers:
            result *= num
    else:
        return {
            "content": [{
                "type": "text",
                "text": f"Unsupported operation: {operation}"
            }]
        }

    return {
        "content": [{
            "type": "text",
            "text": f"Result: {result}"
        }]
    }
```

**TypeScript equivalent (for comparison):**
```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

const calculator = tool({
  name: 'calculator',
  description: 'Perform basic arithmetic operations',
  input_schema: z.object({
    operation: z.enum(['add', 'multiply']),
    numbers: z.array(z.number()),
  }),
  handler: async (input) => {
    // [Implementation]
  },
});
```

**Key differences:**
- Python: Decorator syntax `@tool` above function definition
- Python: Function name becomes tool name automatically
- Python: Docstring provides description
- Python: No external schema library (Zod) required
- Python: Return format is explicit dictionary structure
- TypeScript: Function call wrapper with configuration object
- TypeScript: Zod schemas provide runtime validation

---

### Pattern 2: Async Context Manager

**Description:** Python uses async with for resource cleanup (cleaner than try-finally)

**Python pattern:**
```python
async def main():
    """Use context manager for automatic cleanup."""
    async with ClaudeSDKClient(api_key=get_api_key()) as client:
        # Client automatically connects
        response = await client.query(prompt="Hello")
        print(response.text)
        # Client automatically disconnects on exit
```

**TypeScript equivalent:**
```typescript
async function main() {
  const client = new ClaudeSDKClient({ apiKey: getApiKey() });
  try {
    await client.connect();
    const response = await client.query({ prompt: "Hello" });
    console.log(response.text);
  } finally {
    await client.disconnect();
  }
}
```

**Key differences:**
- Python: `async with` handles connect/disconnect automatically
- Python: No manual resource management needed
- Python: Cleaner syntax, less error-prone
- TypeScript: Explicit connect/disconnect required
- TypeScript: try-finally pattern for cleanup

---

### Pattern 3: Type Hints

**Description:** Python type hints are optional but recommended for clarity

**Python pattern:**
```python
from typing import Any, Optional, List
from claude_agent_sdk import ClaudeSDKClient

async def create_agent(
    api_key: str,
    tools: Optional[List[Any]] = None
) -> ClaudeSDKClient:
    """
    Create and configure an agent client.

    Args:
        api_key: Anthropic API key
        tools: Optional list of custom tools

    Returns:
        Configured ClaudeSDKClient instance
    """
    return ClaudeSDKClient(
        api_key=api_key,
        tools=tools or []
    )
```

**Key points:**
- Use type hints on function parameters and returns
- Import types from `typing` module
- Type hints are not enforced at runtime (documentation only)
- Optional types: `Optional[str]` or `str | None` (Python 3.10+)
- Generic types: `List[str]`, `Dict[str, Any]`
- Docstrings complement type hints (explain purpose)

---

### Pattern 4: Asyncio Entry Point

**Description:** Python requires explicit async event loop management

**Pattern for script entry points:**
```python
import asyncio

async def main() -> None:
    """Main application logic."""
    # All async code here
    pass

if __name__ == '__main__':
    asyncio.run(main())
```

**Pattern for Jupyter notebooks:**
```python
# In Jupyter, event loop already running
async def notebook_demo():
    # Async code here
    pass

await notebook_demo()  # Direct await works
```

**Pattern for nested async functions:**
```python
async def outer():
    """Outer async function."""
    async def inner():
        """Nested async logic."""
        await some_operation()

    await inner()  # Call nested async function
```

**Key differences from TypeScript:**
- Python: Explicit `asyncio.run(main())` required for scripts
- Python: No top-level await in scripts (only in modules)
- TypeScript: Top-level await supported in modern versions
- TypeScript: No explicit event loop management

---

### Pattern 5: Error Handling in Python

**Description:** Python-specific error handling patterns for async code

**Python pattern:**
```python
import asyncio

async def safe_agent_call():
    """Demonstrate comprehensive error handling."""
    try:
        async with ClaudeSDKClient(api_key=get_api_key()) as client:
            response = await client.query(prompt="Hello")
            return response.text

    except ValueError as e:
        # Configuration errors (missing API key, etc.)
        print(f"Configuration error: {e}", file=sys.stderr)
        return None

    except asyncio.TimeoutError:
        # Request timeout
        print("Request timed out", file=sys.stderr)
        return None

    except Exception as e:
        # Catch-all for unexpected errors
        print(f"Unexpected error: {str(e)}", file=sys.stderr)
        return None
```

**Key points:**
- Catch specific exceptions before generic Exception
- Use `file=sys.stderr` for error output
- `asyncio.TimeoutError` for timeout handling
- `ValueError` for configuration errors
- Always include generic Exception handler
- Return None or raise for error propagation

---

## Feature Parity Validation Checklist

### Usage
Builder-1 validates this checklist in first hour. Any gaps documented in python/setup.md.

### Core Patterns
- [ ] Installation (pip, venv, requirements.txt) - Document in python/setup.md
- [ ] Query pattern (stateless async query()) - Document in python/query-pattern.md
- [ ] Client pattern (stateful ClaudeSDKClient) - Document in python/client-pattern.md
- [ ] Custom tool creation (@tool decorator) - Document in python/custom-tools.md
- [ ] Options configuration (ClaudeAgentOptions) - Document in python/options.md
- [ ] Async patterns (async/await, async for) - Document in python/async-patterns.md

### Advanced Features
- [ ] Streaming responses (AsyncIterator)
- [ ] MCP server integration (create_sdk_mcp_server)
- [ ] Hooks (pre_tool_use, post_tool_use)
- [ ] Session management (conversation_id)
- [ ] Cost tracking (usage statistics)
- [ ] Permission configuration (allow_list, deny_list)

### Examples (Python Implementations)
- [ ] Simple CLI agent - Add to examples/simple-cli-agent.md
- [ ] Web API agent (FastAPI) - Add to examples/web-api-agent.md
- [ ] Stateful chatbot - Add to examples/stateful-chatbot.md
- [ ] Multi-tool agent - Add to examples/multi-tool-agent.md
- [ ] MCP server agent - Add to examples/mcp-server-agent.md

### Documentation Quality
- [ ] All Python code syntactically valid (ast.parse validates)
- [ ] Complete imports and dependencies documented
- [ ] Error handling patterns in all examples
- [ ] Security best practices (environment variables)
- [ ] Cross-references to concepts/ bidirectional

### Gap Documentation
If any feature missing:
```markdown
## Known Limitations (in python/setup.md)

### Features Not Yet Available
- [List any Python SDK gaps found]
- Workaround: [Alternative approach or link to TypeScript]
```

---

## Example File Modification Pattern

### How to Add Python Without Breaking TypeScript

**Step 1: Read Existing File**
```bash
# Verify file exists and TypeScript section complete
cat ~/.claude/docs/agent-sdk/examples/simple-cli-agent.md
```

**Step 2: Identify Insertion Point**
Find this section:
```markdown
## TypeScript Implementation

### Installation
[TypeScript npm commands]

### Complete Code
```typescript
[Existing TypeScript code - DO NOT MODIFY]
```

### Running the TypeScript Version
[TypeScript run commands]

## How It Works    <-- INSERT PYTHON SECTION BEFORE THIS
```

**Step 3: Insert Python Section**
Add new section between TypeScript and "How It Works":
```markdown
## Python Implementation

### Installation

```bash
pip install claude-agent-sdk python-dotenv
```

### Complete Code

```python
"""
Python equivalent of TypeScript implementation above.
[Full Python code demonstrating same functionality]
"""
```

### Running the Python Version

```bash
export ANTHROPIC_API_KEY=your-key
python simple-cli-agent.py
```

## How It Works
[Existing content - expand to mention both languages]
```

**Step 4: Update Prerequisites Section**
Change:
```markdown
## Prerequisites
- Node.js 18+
- npm or yarn
```

To:
```markdown
## Prerequisites

### For TypeScript
- Node.js 18+
- npm or yarn
- See [TypeScript Setup Guide](../typescript/setup.md)

### For Python
- Python 3.8+
- pip or uv
- See [Python Setup Guide](../python/setup.md)

### General Requirements
- ANTHROPIC_API_KEY environment variable
```

**Step 5: Update YAML Frontmatter**
Change:
```yaml
language: "typescript"
```

To:
```yaml
language: "multi-language"
```

Add Python to tags:
```yaml
tags:
  - cli
  - agent
  - typescript
  - python  # ADD THIS
```

Add Python guide references:
```yaml
related_guides:
  - ../typescript/setup.md
  - ../python/setup.md  # ADD THIS
  - ../concepts/tools.md
```

**Step 6: Validate with Git Diff**
```bash
git diff examples/simple-cli-agent.md
```

Verify:
- [ ] Only additions after TypeScript section
- [ ] TypeScript code blocks UNCHANGED
- [ ] TypeScript cross-references UNCHANGED
- [ ] No deletions or modifications to existing TypeScript content
- [ ] YAML frontmatter updated correctly

**Step 7: Manual Python Syntax Validation**
Extract Python code and validate:
```bash
# Extract Python code block
sed -n '/```python/,/```/p' examples/simple-cli-agent.md | sed '1d;$d' > /tmp/example.py

# Validate syntax
python -c "import ast; ast.parse(open('/tmp/example.py').read())"
# No output = success
```

**Critical Rules:**
- NEVER modify TypeScript sections
- NEVER modify TypeScript code blocks
- ONLY add new sections
- Update frontmatter and prerequisites
- Validate with git diff after each file
- Single builder handles all 5 files (consistency)

---

## YAML Frontmatter for Python Files

### Python Guide Frontmatter Pattern
**Use in all python/ directory files:**

```yaml
---
title: "Python Setup Guide"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
language: "python"
difficulty: "beginner"
related_guides:
  - ./query-pattern.md
  - ../typescript/setup.md
  - ../concepts/tools.md
tags:
  - python
  - setup
  - installation
  - venv
---
```

**Key fields:**
- `title`: Include "Python" in title for clarity
- `language: "python"` (not "typescript")
- `related_guides`: Link to other Python guides, TypeScript equivalent, concepts
- `tags`: Include "python" plus topic-specific tags

### Multi-Language Example Frontmatter Pattern
**Use in all modified example files:**

```yaml
---
title: "Simple CLI Agent"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
language: "multi-language"  # CHANGED from "typescript"
difficulty: "beginner"
related_guides:
  - ../typescript/setup.md
  - ../python/setup.md       # ADDED
  - ../typescript/custom-tools.md
  - ../python/custom-tools.md  # ADDED
  - ../concepts/tools.md
tags:
  - cli
  - agent
  - typescript
  - python                    # ADDED
---
```

**Key changes:**
- `language: "multi-language"` (was "typescript")
- Add Python guide references to `related_guides`
- Add "python" to `tags`

---

## Cross-Reference Patterns Between Python and TypeScript

### Pattern 1: Python Guide → TypeScript Guide (Comparison)
**Use in:** Every Python guide in "Related Documentation" section

```markdown
## Related Documentation

**TypeScript Equivalent:**
- [TypeScript Setup](../typescript/setup.md) - Compare installation approaches
- [TypeScript Custom Tools](../typescript/custom-tools.md) - tool() vs @tool syntax

**Concepts:**
- [Tools Overview](../concepts/tools.md)

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Both implementations
```

### Pattern 2: Concepts → Python Guide (Bidirectional)
**Already exists in Iteration 1 as forward-reference, will resolve automatically:**

In `concepts/tools.md`:
```markdown
## Related Documentation
- [TypeScript Custom Tools](../typescript/custom-tools.md)
- [Python Custom Tools](../python/custom-tools.md)  # Forward-ref from Iteration 1
```

In `python/custom-tools.md`:
```markdown
## Related Documentation
- [Tools Concept](../concepts/tools.md) - Architectural overview
```

### Pattern 3: Examples → Both Language Guides
**Use in:** Modified example files

```markdown
## Related Documentation

**TypeScript:**
- [TypeScript Setup](../typescript/setup.md)
- [TypeScript Query Pattern](../typescript/query-pattern.md)

**Python:**
- [Python Setup](../python/setup.md)
- [Python Query Pattern](../python/query-pattern.md)

**Concepts:**
- [Tools Overview](../concepts/tools.md)
```

---

## Import Order Convention for Python

### Standard Import Grouping
**Use in all Python code examples:**

```python
"""Example docstring."""

# Standard library imports
import os
import sys
import asyncio
from typing import Any, Optional, List

# Third-party imports
from dotenv import load_dotenv

# Agent SDK imports
from claude_agent_sdk import ClaudeSDKClient, tool

# Application imports (if any)
# from .local_module import something
```

**Grouping order:**
1. Standard library (os, sys, asyncio, typing)
2. Third-party packages (dotenv, fastapi, etc.)
3. Agent SDK imports
4. Application/local imports

**Within each group:**
- Sort alphabetically
- Separate groups with blank line
- Use absolute imports (not relative for examples)

---

## Code Quality Standards

### Standard 1: Type Hints Required
**Where:** Function signatures in all Python examples

**Example:**
```python
async def create_tool(
    name: str,
    description: str,
    handler: Any
) -> dict[str, Any]:
    """Type hints on all parameters and return."""
    pass
```

### Standard 2: Docstrings Required
**Where:** Functions, classes, modules in all Python examples

**Format:** Google style
```python
def calculate(x: int, y: int) -> int:
    """
    Calculate the sum of two numbers.

    Args:
        x: First number
        y: Second number

    Returns:
        Sum of x and y
    """
    return x + y
```

### Standard 3: Error Handling Required
**Where:** All async operations, file operations, API calls

**Pattern:**
```python
try:
    result = await operation()
except SpecificError as e:
    # Handle specific error
except Exception as e:
    # Generic fallback
```

### Standard 4: Environment Variables, Never Hardcoded
**Where:** All examples requiring API keys

**Pattern:**
```python
api_key = os.getenv('ANTHROPIC_API_KEY')
if not api_key:
    raise ValueError('ANTHROPIC_API_KEY environment variable required')
```

### Standard 5: Context Managers for Resources
**Where:** ClaudeSDKClient usage, file operations

**Pattern:**
```python
async with ClaudeSDKClient(api_key=api_key) as client:
    # Use client
    # Automatic cleanup on exit
```

---

## Performance Patterns

### Pattern 1: Async All the Way
**Description:** Don't block async code with sync operations

**Correct:**
```python
import aiofiles

async def read_file_async(path: str) -> str:
    """Async file reading."""
    async with aiofiles.open(path, 'r') as f:
        return await f.read()
```

**Incorrect:**
```python
async def read_file_sync(path: str) -> str:
    """Don't do this - blocks event loop."""
    with open(path, 'r') as f:  # Blocking!
        return f.read()
```

### Pattern 2: Batch Tool Calls
**Description:** Register multiple tools at once, not one at a time

**Correct:**
```python
tools = [tool1, tool2, tool3]
client = ClaudeSDKClient(api_key=api_key, tools=tools)
```

---

## Security Patterns

### Pattern 1: Environment Variable Validation
**Use in:** Every example that needs API key

```python
import os
from dotenv import load_dotenv

load_dotenv()

def get_api_key() -> str:
    """Validate API key presence."""
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError(
            'ANTHROPIC_API_KEY environment variable required. '
            'Get your key at: https://console.anthropic.com/'
        )
    return api_key
```

### Pattern 2: Tool Permission Restrictions
**Document in:** python/options.md and examples

```python
from claude_agent_sdk import ClaudeSDKClient

# Restrict tools to specific operations
client = ClaudeSDKClient(
    api_key=api_key,
    tools=[safe_tool1, safe_tool2],
    allow_list=["safe_operation"],
    deny_list=["dangerous_operation"]
)
```

---

**Patterns Status:** COMPREHENSIVE
**Ready for:** Builder task breakdown
**Usage:** Builders copy these patterns exactly for consistency
