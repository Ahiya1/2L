---
title: "Custom Tools in Python"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "python"
difficulty: "intermediate"
prerequisites:
  - "Completed [Python Setup](./setup.md)"
  - "Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)"
  - "Familiarity with Python decorators and type hints"
next_steps:
  - "Build [Multi-Tool Agent Example](../examples/multi-tool-agent.md)"
  - "Learn about [Hooks](../concepts/hooks.md) for tool lifecycle"
  - "Explore [MCP Integration](../concepts/mcp.md)"
related_guides:
  - query-pattern.md
  - client-pattern.md
  - ../concepts/tools.md
  - ../typescript/custom-tools.md
tags:
  - custom-tools
  - decorator
  - tool-creation
  - handlers
  - type-hints
---

# Custom Tools in Python

## Overview

This guide covers custom tool creation in the Python Agent SDK using the `@tool` decorator. Custom tools extend Claude's capabilities by giving it access to external functions, APIs, databases, and services. Tools are defined with the `@tool` decorator for clean Python syntax, type hints for input validation, and async handlers for execution. The Agent SDK handles tool discovery, validation, and execution automatically.

## When to Use

Create custom tools when you need Claude to:
- **Read/write files:** Access the filesystem
- **Call APIs:** Fetch data from external services
- **Query databases:** Read or write database records
- **Perform calculations:** Complex math, data processing
- **Execute commands:** Run system operations (with caution)
- **Access services:** Email, SMS, cloud services

## Prerequisites

- Completed [Setup Guide](./setup.md)
- Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)
- Familiarity with Python decorators
- Knowledge of async/await patterns and type hints

## Basic Pattern

### Minimal Tool Example

```python
import asyncio
from typing import Any, Dict
from claude_agent_sdk import tool, query

# Define tool with decorator
@tool
async def calculator(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform basic arithmetic operations.

    Args:
        args: Dictionary with 'operation' and 'numbers' keys
            operation: One of 'add', 'subtract', 'multiply', 'divide'
            numbers: List of numbers to operate on

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
    elif operation == 'subtract':
        result = numbers[0] - sum(numbers[1:]) if numbers else 0
    elif operation == 'divide':
        result = numbers[0]
        for num in numbers[1:]:
            result /= num if num != 0 else 1
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

# Use tool with query
async def main():
    response = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='What is 15 multiplied by 7?',
        tools=[calculator]
    )

    print(response.text)
    # Output: "15 multiplied by 7 is 105."

if __name__ == '__main__':
    asyncio.run(main())
```

### File Reading Tool

```python
import asyncio
from typing import Any, Dict
from pathlib import Path
from claude_agent_sdk import tool

@tool
async def read_file(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Read contents of a text file.

    Args:
        args: Dictionary with 'path' key containing file path

    Returns:
        File contents or error message
    """
    file_path = args.get('path', '')

    try:
        content = Path(file_path).read_text(encoding='utf-8')

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
                "text": f"Error: File not found: {file_path}"
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error reading file: {str(e)}"
            }]
        }
```

## Complete Example

```python
"""
Example: Weather information tool

Dependencies:
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0
- httpx>=0.25.0

Install: pip install claude-agent-sdk python-dotenv httpx
Setup: export ANTHROPIC_API_KEY=your-api-key-here

Python 3.8+ required
"""

import os
import sys
import asyncio
from typing import Any, Dict
from claude_agent_sdk import ClaudeSDKClient, tool
from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()

# Weather tool definition
@tool
async def get_weather(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get current weather information for a city.

    Returns temperature, conditions, and humidity.

    Args:
        args: Dictionary with keys:
            city (str): City name (e.g., "San Francisco", "London")
            units (str, optional): Temperature units ("celsius" or "fahrenheit")

    Returns:
        Weather data dictionary for Claude
    """
    city = args.get('city', '')
    units = args.get('units', 'celsius')

    try:
        # Mock API call (replace with real weather API)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://api.weatherapi.com/v1/current.json',
                params={
                    'key': os.getenv('WEATHER_API_KEY'),
                    'q': city
                },
                timeout=10.0
            )
            response.raise_for_status()

            data = response.json()

            # Extract temperature based on units
            if units == 'fahrenheit':
                temp = data['current']['temp_f']
                unit_symbol = 'F'
            else:
                temp = data['current']['temp_c']
                unit_symbol = 'C'

            # Format result
            result = {
                'city': city,
                'temperature': f"{temp}°{unit_symbol}",
                'conditions': data['current']['condition']['text'],
                'humidity': f"{data['current']['humidity']}%"
            }

            return {
                "content": [{
                    "type": "text",
                    "text": f"Weather in {city}:\n"
                            f"Temperature: {result['temperature']}\n"
                            f"Conditions: {result['conditions']}\n"
                            f"Humidity: {result['humidity']}"
                }]
            }

    except httpx.HTTPError as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error fetching weather: {str(e)}"
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Unexpected error: {str(e)}"
            }]
        }

def get_api_key() -> str:
    """Validate and retrieve API key."""
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY required')
    return api_key

async def main():
    """Main async entry point."""
    try:
        # Initialize client with weather tool
        async with ClaudeSDKClient(
            api_key=get_api_key(),
            tools=[get_weather]
        ) as client:
            response = await client.query(
                prompt="What's the weather like in Tokyo? And how about Paris?"
            )

            print(response.text)

    except ValueError as e:
        print(f'Configuration error: {e}', file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f'Error: {str(e)}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())

"""
Expected output:
The agent will call the get_weather tool twice (once for Tokyo, once for Paris)
and provide a natural language response about the weather in both cities.

Example: "In Tokyo, it's currently 22°C with partly cloudy skies and 65% humidity.
Paris is experiencing 18°C with light rain and 80% humidity."
"""
```

## Tool Definition

### Required Elements

A Python tool requires:

1. **@tool decorator:** Marks function as a tool
2. **Async function:** Tool handler must be async
3. **Type hints:** Parameters and return type
4. **Docstring:** Describes tool purpose and parameters
5. **Return format:** Specific dictionary structure

### Return Format

All tools must return this structure:

```python
{
    "content": [
        {
            "type": "text",
            "text": "Your result here"
        }
    ]
}
```

### Tool Definition Pattern

```python
from typing import Any, Dict
from claude_agent_sdk import tool

@tool
async def tool_name(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tool description for Claude.

    Explain what the tool does and when to use it.

    Args:
        args: Dictionary with expected keys:
            key1 (type): Description
            key2 (type, optional): Description

    Returns:
        Result dictionary for Claude
    """
    # Extract parameters
    param1 = args.get('key1')
    param2 = args.get('key2', default_value)

    try:
        # Tool logic here
        result = perform_operation(param1, param2)

        return {
            "content": [{
                "type": "text",
                "text": f"Operation result: {result}"
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }]
        }
```

## Common Tool Patterns

### File Operations Tool

```python
import asyncio
from typing import Any, Dict
from pathlib import Path
from claude_agent_sdk import tool

@tool
async def file_operations(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform file system operations.

    Args:
        args: Dictionary with keys:
            operation (str): 'read', 'write', 'list', or 'delete'
            path (str): File or directory path
            content (str, optional): Content for write operation

    Returns:
        Operation result
    """
    operation = args.get('operation')
    path_str = args.get('path', '')
    content = args.get('content', '')

    path = Path(path_str)

    try:
        if operation == 'read':
            text = path.read_text(encoding='utf-8')
            return {
                "content": [{
                    "type": "text",
                    "text": f"File contents:\n{text}"
                }]
            }

        elif operation == 'write':
            path.write_text(content, encoding='utf-8')
            return {
                "content": [{
                    "type": "text",
                    "text": f"Successfully wrote to {path}"
                }]
            }

        elif operation == 'list':
            if path.is_dir():
                files = [f.name for f in path.iterdir()]
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Files in {path}:\n" + "\n".join(files)
                    }]
                }
            else:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Error: {path} is not a directory"
                    }]
                }

        elif operation == 'delete':
            path.unlink()
            return {
                "content": [{
                    "type": "text",
                    "text": f"Deleted {path}"
                }]
            }

        else:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Unknown operation: {operation}"
                }]
            }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }]
        }
```

### API Call Tool

```python
import asyncio
import httpx
from typing import Any, Dict
from claude_agent_sdk import tool

@tool
async def api_call(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Make HTTP API calls.

    Args:
        args: Dictionary with keys:
            url (str): API endpoint URL
            method (str, optional): HTTP method (default: 'GET')
            headers (dict, optional): HTTP headers
            params (dict, optional): Query parameters
            data (dict, optional): Request body data

    Returns:
        API response
    """
    url = args.get('url', '')
    method = args.get('method', 'GET').upper()
    headers = args.get('headers', {})
    params = args.get('params', {})
    data = args.get('data', {})

    try:
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data if data else None,
                timeout=30.0
            )
            response.raise_for_status()

            # Try to parse as JSON
            try:
                result = response.json()
                return {
                    "content": [{
                        "type": "text",
                        "text": f"API Response:\n{result}"
                    }]
                }
            except:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"API Response:\n{response.text}"
                    }]
                }

    except httpx.HTTPError as e:
        return {
            "content": [{
                "type": "text",
                "text": f"HTTP Error: {str(e)}"
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }]
        }
```

### Database Query Tool

```python
import asyncio
from typing import Any, Dict, List
from claude_agent_sdk import tool

@tool
async def database_query(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute database queries.

    Args:
        args: Dictionary with keys:
            query (str): SQL query to execute
            params (list, optional): Query parameters

    Returns:
        Query results
    """
    query_str = args.get('query', '')
    params = args.get('params', [])

    try:
        # Mock database connection (replace with actual DB library)
        # Example with aiosqlite:
        # import aiosqlite
        # async with aiosqlite.connect('database.db') as db:
        #     async with db.execute(query_str, params) as cursor:
        #         rows = await cursor.fetchall()

        # Mock result
        rows = [
            {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'},
            {'id': 2, 'name': 'Bob', 'email': 'bob@example.com'}
        ]

        return {
            "content": [{
                "type": "text",
                "text": f"Query results:\n{rows}"
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Database error: {str(e)}"
            }]
        }
```

## Multiple Tools

### Registering Multiple Tools

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient, tool
from typing import Any, Dict

@tool
async def calculator(args: Dict[str, Any]) -> Dict[str, Any]:
    """Calculator tool."""
    # Implementation
    pass

@tool
async def weather(args: Dict[str, Any]) -> Dict[str, Any]:
    """Weather tool."""
    # Implementation
    pass

@tool
async def translator(args: Dict[str, Any]) -> Dict[str, Any]:
    """Translation tool."""
    # Implementation
    pass

async def main():
    # Register all tools
    tools = [calculator, weather, translator]

    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        tools=tools
    ) as client:
        response = await client.query(
            prompt='What is 5+3, what is the weather in Paris, '
                   'and translate "hello" to Spanish?'
        )
        print(response.text)

if __name__ == '__main__':
    asyncio.run(main())
```

## Error Handling

### Comprehensive Error Handling

```python
from typing import Any, Dict
from claude_agent_sdk import tool

@tool
async def safe_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tool with comprehensive error handling.

    Args:
        args: Tool parameters

    Returns:
        Result or error message
    """
    try:
        # Validate required parameters
        if 'required_param' not in args:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Missing required parameter 'required_param'"
                }]
            }

        # Perform operation
        result = perform_operation(args['required_param'])

        return {
            "content": [{
                "type": "text",
                "text": f"Success: {result}"
            }]
        }

    except ValueError as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Validation error: {str(e)}"
            }]
        }

    except PermissionError as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Permission denied: {str(e)}"
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Unexpected error: {str(e)}"
            }]
        }
```

## Security Considerations

### Safe Tool Implementation

```python
from typing import Any, Dict
from pathlib import Path
from claude_agent_sdk import tool

# Define allowed operations
ALLOWED_OPERATIONS = ['read', 'list']
ALLOWED_PATHS = ['/safe/directory', '/public/data']

@tool
async def secure_file_access(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Secure file access with restrictions.

    Args:
        args: Dictionary with 'operation' and 'path' keys

    Returns:
        Result or access denied message
    """
    operation = args.get('operation')
    path_str = args.get('path', '')

    # Validate operation
    if operation not in ALLOWED_OPERATIONS:
        return {
            "content": [{
                "type": "text",
                "text": f"Operation '{operation}' not allowed"
            }]
        }

    # Validate path
    path = Path(path_str).resolve()
    if not any(str(path).startswith(allowed) for allowed in ALLOWED_PATHS):
        return {
            "content": [{
                "type": "text",
                "text": f"Access denied: Path outside allowed directories"
            }]
        }

    # Safe operation
    try:
        if operation == 'read':
            content = path.read_text(encoding='utf-8')
            return {
                "content": [{
                    "type": "text",
                    "text": content
                }]
            }
        elif operation == 'list':
            files = [f.name for f in path.iterdir()]
            return {
                "content": [{
                    "type": "text",
                    "text": "\n".join(files)
                }]
            }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }]
        }
```

## TypeScript Comparison

For developers familiar with TypeScript, here are the key differences:

| Feature | TypeScript | Python |
|---------|-----------|--------|
| **Tool definition** | tool() function | @tool decorator |
| **Schema validation** | Zod schemas | Docstrings + type hints |
| **Async syntax** | async function | async def |
| **Type system** | Native TypeScript | Type hints (optional) |
| **Parameters** | Destructured object | Dictionary with .get() |

See [TypeScript Custom Tools](../typescript/custom-tools.md) for comparison.

## Next Steps

1. **Configure options:** [Options Reference](./options.md)
2. **Learn async patterns:** [Async Patterns Guide](./async-patterns.md)
3. **Explore concepts:** [Tools Overview](../concepts/tools.md)
4. **Build examples:** [Multi-Tool Agent](../examples/multi-tool-agent.md)

## Related Documentation

**Core Concepts:**
- [Tools Overview](../concepts/tools.md) - Architectural overview
- [Permissions](../concepts/permissions.md) - Tool access control

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Query Pattern](./query-pattern.md) - Using tools with query()
- [Client Pattern](./client-pattern.md) - Using tools with client
- [Options Reference](./options.md) - Tool configuration

**Comparison:**
- [TypeScript Custom Tools](../typescript/custom-tools.md) - Compare approaches

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic tool usage
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Multiple tools
