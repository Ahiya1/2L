---
title: "Configuration Options Reference"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "python"
difficulty: "intermediate"
prerequisites:
  - "Completed [Python Setup](./setup.md)"
  - "Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)"
next_steps:
  - "Configure [Permissions](../concepts/permissions.md) for security"
  - "Set up [Hooks](../concepts/hooks.md) for monitoring"
  - "Connect [MCP Servers](../concepts/mcp.md)"
related_guides:
  - query-pattern.md
  - client-pattern.md
  - custom-tools.md
  - ../concepts/permissions.md
  - ../concepts/hooks.md
  - ../typescript/options.md
tags:
  - configuration
  - options
  - settings
  - parameters
---

# Configuration Options Reference

## Overview

This guide documents all configuration options available in the Claude Agent SDK for Python. Options control model selection, behavior, permissions, tools, hooks, and more. Options can be set at initialization (for ClaudeSDKClient) or per-request (for query() and client.query()).

## When to Use

Reference this guide when you need to:
- **Configure model selection:** Choose between Claude models
- **Control behavior:** Temperature, max tokens, stop sequences
- **Set permissions:** Define what the agent can access
- **Register tools:** Add custom capabilities
- **Configure hooks:** Add event handlers
- **Optimize performance:** Token limits, timeouts

## Prerequisites

- Completed [Setup Guide](./setup.md)
- Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)

## Overview

This guide covers configuration options in the Python Agent SDK for customizing client behavior, model selection, tool registration, permissions, hooks, and MCP server connections.

## Options Overview

### Complete Python Interface

```python
# Interface reference (not executable code):
# Shows available ClaudeSDKClient parameters
from typing import List, Optional, Dict, Any
from claude_agent_sdk import ClaudeSDKClient

# All available options
client = ClaudeSDKClient(
    # Authentication (required)
    api_key: str,

    # Model selection
    model: Optional[str] = None,

    # Behavior control
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    stop_sequences: Optional[List[str]] = None,

    # Tool configuration
    tools: Optional[List[Any]] = None,

    # Permission configuration
    permissions: Optional[Dict[str, Any]] = None,

    # Hook configuration
    hooks: Optional[Dict[str, Any]] = None,

    # MCP configuration
    mcp_servers: Optional[List[Dict[str, Any]]] = None,
)
```

## Required Options

### api_key (str, required)

Your Anthropic API key for authentication.

```python
import os
from claude_agent_sdk import ClaudeSDKClient

# Required: API key must be provided
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY')
) as client:
    response = await client.query(prompt='Hello!')

# Alternative: Per-query
from claude_agent_sdk import query

response = await query(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    prompt='Hello!'
)
```

**Best practices:**
- Never hardcode API keys in source code
- Use environment variables: `os.getenv('ANTHROPIC_API_KEY')`
- Validate key exists before use
- Keep keys secure and rotate regularly

**Getting your API key:**
```bash
# Sign up at console.anthropic.com
# Generate API key in settings
export ANTHROPIC_API_KEY=your-key-here
```

## Model Selection

### model (str, optional)

Claude model to use for requests.

**Default:** `'claude-3-5-sonnet-20241022'` (most capable)

```python
from claude_agent_sdk import ClaudeSDKClient

# Use default model (Sonnet)
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY')
    # model not specified, uses default
) as client:
    pass

# Use Haiku (fast, cost-effective)
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    model='claude-3-haiku-20240307'
) as client:
    pass

# Use Opus (highest capability)
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    model='claude-3-opus-20240229'
) as client:
    pass
```

**Available models:**

| Model | ID | Best For | Speed | Cost |
|-------|----|---------| ------|------|
| **Sonnet 3.5** | `claude-3-5-sonnet-20241022` | General use, balanced | Fast | $$ |
| **Haiku 3** | `claude-3-haiku-20240307` | High speed, low cost | Fastest | $ |
| **Opus 3** | `claude-3-opus-20240229` | Complex tasks, highest quality | Slower | $$$ |

**Model selection guide:**
```python
# Development/testing: Use Haiku (fast & cheap)
dev_client = ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    model='claude-3-haiku-20240307'
)

# Production: Use Sonnet (balanced)
prod_client = ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    model='claude-3-5-sonnet-20241022'
)

# Complex reasoning: Use Opus (highest capability)
complex_client = ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    model='claude-3-opus-20240229'
)
```

## Behavior Control

### temperature (float, optional)

Controls randomness and creativity in responses.

**Range:** 0.0 to 1.0
**Default:** 0.7

```python
from claude_agent_sdk import ClaudeSDKClient

# Deterministic, consistent responses (factual tasks)
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    temperature=0.0
) as client:
    pass

# Balanced creativity (default)
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    temperature=0.7  # Default
) as client:
    pass

# Maximum creativity (creative writing)
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    temperature=1.0
) as client:
    pass
```

**Temperature guidelines:**

| Temperature | Use Case | Example |
|-------------|----------|---------|
| 0.0 | Deterministic | Math, facts, code |
| 0.3 | Mostly consistent | Documentation |
| 0.7 | Balanced (default) | General conversation |
| 1.0 | Maximum creativity | Story writing |

### max_tokens (int, optional)

Maximum number of tokens in response.

**Range:** 1 to model's maximum
**Default:** Model-specific (typically 4096)

```python
from claude_agent_sdk import ClaudeSDKClient

# Short responses
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    max_tokens=100
) as client:
    response = await client.query(
        prompt='Explain AI in one sentence.'
    )

# Long responses
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    max_tokens=4000
) as client:
    response = await client.query(
        prompt='Write a comprehensive guide to machine learning.'
    )
```

**Token guidelines:**
- 1 token ≈ 4 characters or 0.75 words
- Short answer: 50-200 tokens
- Paragraph: 200-500 tokens
- Page: 500-2000 tokens
- Long document: 2000+ tokens

### stop_sequences (List[str], optional)

Custom sequences that stop generation.

**Default:** None (use model's default stop behavior)

```python
from claude_agent_sdk import ClaudeSDKClient

# Stop at specific marker
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    stop_sequences=['END', '---']
) as client:
    response = await client.query(
        prompt='List 3 items. After each, write END.'
    )
    # Generation stops when 'END' or '---' is encountered
```

## Tool Configuration

### tools (List[Any], optional)

Register custom tools for the agent.

**Default:** None (no custom tools)

```python
from claude_agent_sdk import ClaudeSDKClient, tool
from typing import Any, Dict

# Define custom tools
@tool
async def calculator(args: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate math expressions."""
    # Implementation
    pass

@tool
async def weather(args: Dict[str, Any]) -> Dict[str, Any]:
    """Get weather information."""
    # Implementation
    pass

# Register tools
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    tools=[calculator, weather]
) as client:
    response = await client.query(
        prompt='What is 5+3 and what is the weather in Paris?'
    )
```

See [Custom Tools Guide](./custom-tools.md) for details.

## Permission Configuration

### permissions (Dict[str, Any], optional)

Configure tool permissions and access control.

**Default:** None (all tools allowed)

```python
from claude_agent_sdk import ClaudeSDKClient

# Restrict tools to specific operations
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    tools=[tool1, tool2, tool3],
    permissions={
        'allow_list': ['safe_tool1', 'safe_tool2'],
        'deny_list': ['dangerous_tool3']
    }
) as client:
    pass

# Fine-grained permission control
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    permissions={
        'allow_list': ['read_file', 'list_directory'],
        'deny_list': ['delete_file', 'execute_command'],
        'require_approval': ['write_file']
    }
) as client:
    pass
```

See [Permissions Concept](../concepts/permissions.md) for details.

## Hook Configuration

### hooks (Dict[str, Any], optional)

Configure event handlers for tool execution.

**Default:** None (no hooks)

```python
from claude_agent_sdk import ClaudeSDKClient
from typing import Any, Dict

# Define hook handlers
async def pre_tool_hook(tool_name: str, args: Dict[str, Any]):
    """Called before tool execution."""
    print(f'About to call tool: {tool_name}')
    print(f'Arguments: {args}')

async def post_tool_hook(
    tool_name: str,
    args: Dict[str, Any],
    result: Any
):
    """Called after tool execution."""
    print(f'Tool {tool_name} completed')
    print(f'Result: {result}')

# Register hooks
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    tools=[my_tool],
    hooks={
        'pre_tool_use': pre_tool_hook,
        'post_tool_use': post_tool_hook
    }
) as client:
    pass
```

See [Hooks Concept](../concepts/hooks.md) for details.

## MCP Configuration

### mcp_servers (List[Dict[str, Any]], optional)

Configure Model Context Protocol servers.

**Default:** None (no MCP servers)

```python
from claude_agent_sdk import ClaudeSDKClient

# Register MCP servers
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    mcp_servers=[
        {
            'name': 'my_mcp_server',
            'url': 'http://localhost:8080',
            'tools': ['tool1', 'tool2']
        }
    ]
) as client:
    pass
```

See [MCP Concept](../concepts/mcp.md) for details.

## Per-Request Options

### Overriding Options Per Query

```python
from claude_agent_sdk import ClaudeSDKClient

async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    temperature=0.7,  # Default temperature
    max_tokens=1000   # Default max tokens
) as client:
    # Use default options
    response1 = await client.query(prompt='Question 1')

    # Override for specific query
    response2 = await client.query(
        prompt='Question 2',
        temperature=0.0,  # Override to deterministic
        max_tokens=500    # Override to shorter response
    )
```

## Complete Configuration Example

```python
"""
Example: Fully configured client

Dependencies:
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0

Install: pip install claude-agent-sdk python-dotenv
Setup: export ANTHROPIC_API_KEY=your-api-key-here

Python 3.8+ required
"""

import os
import asyncio
from typing import Any, Dict
from claude_agent_sdk import ClaudeSDKClient, tool
from dotenv import load_dotenv

load_dotenv()

# Define custom tool
@tool
async def search_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """Search for information."""
    query = args.get('query', '')
    return {
        "content": [{
            "type": "text",
            "text": f"Search results for: {query}"
        }]
    }

# Define hooks
async def pre_tool_hook(tool_name: str, args: Dict[str, Any]):
    print(f'Calling tool: {tool_name}')

async def post_tool_hook(
    tool_name: str,
    args: Dict[str, Any],
    result: Any
):
    print(f'Tool {tool_name} completed')

async def main():
    """Main async entry point with full configuration."""
    async with ClaudeSDKClient(
        # Required
        api_key=os.getenv('ANTHROPIC_API_KEY'),

        # Model selection
        model='claude-3-5-sonnet-20241022',

        # Behavior control
        temperature=0.7,
        max_tokens=2000,
        stop_sequences=['END'],

        # Tool configuration
        tools=[search_tool],

        # Permission configuration
        permissions={
            'allow_list': ['search_tool'],
            'deny_list': []
        },

        # Hook configuration
        hooks={
            'pre_tool_use': pre_tool_hook,
            'post_tool_use': post_tool_hook
        }
    ) as client:
        response = await client.query(
            prompt='Search for information about Python async/await'
        )

        print('\nResponse:')
        print(response.text)

        print('\nUsage:')
        print(f'Input tokens: {response.usage.input_tokens}')
        print(f'Output tokens: {response.usage.output_tokens}')

if __name__ == '__main__':
    asyncio.run(main())
```

## Common Configuration Patterns

### Development vs Production

```python
import os
from claude_agent_sdk import ClaudeSDKClient

# Development configuration
def create_dev_client() -> ClaudeSDKClient:
    """Create client for development."""
    return ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        model='claude-3-haiku-20240307',  # Fast & cheap
        temperature=0.7,
        max_tokens=1000
    )

# Production configuration
def create_prod_client() -> ClaudeSDKClient:
    """Create client for production."""
    return ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        model='claude-3-5-sonnet-20241022',  # Balanced
        temperature=0.5,  # More consistent
        max_tokens=2000,
        permissions={
            'allow_list': ['approved_tool1', 'approved_tool2']
        }
    )

# Use based on environment
is_production = os.getenv('ENV') == 'production'
client = create_prod_client() if is_production else create_dev_client()
```

### Cost Optimization

```python
from claude_agent_sdk import ClaudeSDKClient

# Cost-optimized configuration
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    model='claude-3-haiku-20240307',  # Cheapest model
    max_tokens=500,  # Limit response length
    temperature=0.3  # More deterministic = fewer tokens
) as client:
    pass
```

### High-Quality Output

```python
from claude_agent_sdk import ClaudeSDKClient

# Quality-optimized configuration
async with ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    model='claude-3-opus-20240229',  # Highest quality
    max_tokens=4000,  # Allow detailed responses
    temperature=0.7  # Balanced creativity
) as client:
    pass
```

## TypeScript Comparison

For developers familiar with TypeScript:

| Feature | TypeScript | Python |
|---------|-----------|--------|
| **Configuration** | Object literal | Keyword arguments |
| **Type safety** | Interface types | Type hints (optional) |
| **Tool creation** | tool() function | @tool decorator |
| **Defaults** | Explicit in interface | Implicit with Optional |

See [TypeScript Options](../typescript/options.md) for comparison.

## Next Steps

1. **Learn async patterns:** [Async Patterns Guide](./async-patterns.md)
2. **Explore concepts:** [Permissions](../concepts/permissions.md), [Hooks](../concepts/hooks.md)
3. **Build examples:** [Multi-Tool Agent](../examples/multi-tool-agent.md)

## Related Documentation

**Core Concepts:**
- [Permissions](../concepts/permissions.md) - Access control
- [Hooks](../concepts/hooks.md) - Event handlers
- [MCP](../concepts/mcp.md) - Model Context Protocol

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Query Pattern](./query-pattern.md) - Query options
- [Client Pattern](./client-pattern.md) - Client initialization
- [Custom Tools](./custom-tools.md) - Tool configuration

**Comparison:**
- [TypeScript Options](../typescript/options.md) - Compare approaches

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic usage
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Complex configuration
