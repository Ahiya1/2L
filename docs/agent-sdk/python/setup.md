---
title: "Python Setup Guide"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "python"
difficulty: "beginner"
prerequisites:
  - "Python 3.8+ installed"
  - "pip installed"
next_steps:
  - "Try [Query Pattern](./query-pattern.md) for stateless agents"
  - "Follow [Simple CLI Agent Example](../examples/simple-cli-agent.md)"
  - "Learn about [Custom Tools](../concepts/tools.md)"
related_guides:
  - query-pattern.md
  - client-pattern.md
  - ../quickstart.md
  - ../typescript/setup.md
tags:
  - installation
  - setup
  - python
  - configuration
  - venv
---

# Python Setup Guide

## Overview

This guide covers installation and setup for the Python Agent SDK. You'll learn how to install dependencies, configure your virtual environment, set up environment variables, and structure your project for agent development.

## When to Use

Use this guide when:
- Starting a new Agent SDK project from scratch
- Adding Agent SDK to an existing Python project
- Troubleshooting Python configuration issues
- Setting up recommended project structure

## Prerequisites

- **Python:** Version 3.8.0 or higher
- **pip:** Version 21.0.0 or higher (or uv as alternative)
- **API Key:** Anthropic API key from https://console.anthropic.com/

## Installation

### Step 1: Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate on Linux/Mac
source venv/bin/activate

# Activate on Windows
venv\Scripts\activate
```

**Why virtual environments?**
- Isolate project dependencies
- Avoid conflicts with system Python packages
- Easy dependency management per project
- Required best practice for Python development

### Step 2: Install Core Dependencies

```bash
pip install claude-agent-sdk python-dotenv
```

**Package purposes:**
- `claude-agent-sdk` - Core Agent SDK with Claude integration
- `python-dotenv` - Load environment variables from .env file

### Step 3: Verify Installation

```bash
pip list | grep claude
```

Expected output should show `claude-agent-sdk` installed at version 1.2.0 or higher.

## Environment Setup

### Step 1: Create Environment File

Create a `.env` file in your project root:

```bash
# .env
ANTHROPIC_API_KEY=your-api-key-here
```

**Security best practices:**
- Never commit `.env` files to version control
- Add `.env` to `.gitignore` immediately
- Use different API keys for development and production
- Rotate keys regularly

### Step 2: Add to .gitignore

```bash
# .gitignore
venv/
__pycache__/
*.pyc
.env
.env.local
.env.*.local
*.log
.DS_Store
```

### Step 3: Load Environment Variables

**Option A: Using python-dotenv (recommended)**

```python
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

api_key = os.getenv('ANTHROPIC_API_KEY')
```

**Option B: Command line**

```bash
export ANTHROPIC_API_KEY=your-key
python main.py
```

### Step 4: Validate API Key

```python
"""
Validate API key is present before using SDK
"""
import os
from dotenv import load_dotenv

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
        raise ValueError(
            'ANTHROPIC_API_KEY environment variable is required. '
            'Get your API key from: https://console.anthropic.com/'
        )

    return api_key

# Usage
api_key = get_api_key()
```

## Project Structure

### Recommended Directory Layout

```
my-agent-project/
├── src/
│   ├── __init__.py
│   ├── main.py                 # Entry point
│   ├── config.py               # Configuration
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── simple_agent.py     # Agent implementations
│   │   └── complex_agent.py
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── file_tools.py       # Custom tools
│   │   ├── api_tools.py
│   │   └── calculator.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py          # Utility functions
├── tests/
│   ├── __init__.py
│   ├── test_agents.py
│   └── test_tools.py
├── venv/                        # Virtual environment
├── .env                         # Environment variables
├── .gitignore
├── requirements.txt             # Dependencies
└── README.md
```

### Minimal Structure

For simple projects:

```
my-agent/
├── main.py                      # Everything in one file
├── .env
├── requirements.txt
└── .gitignore
```

## Requirements File

### Complete requirements.txt

```txt
# Core dependencies
claude-agent-sdk>=1.2.0
python-dotenv>=1.0.0

# Optional: Web framework for API agents
fastapi>=0.104.0
uvicorn>=0.24.0

# Optional: HTTP client for tools
httpx>=0.25.0

# Optional: Async file operations
aiofiles>=23.2.0

# Development dependencies
pytest>=7.0.0
pytest-asyncio>=0.21.0
black>=23.0.0
mypy>=1.0.0
```

**Install all dependencies:**
```bash
pip install -r requirements.txt
```

## Import Patterns

### Named Imports (Recommended)

```python
# Core SDK imports
from claude_agent_sdk import query, ClaudeSDKClient, tool

# Standard library imports
import os
import asyncio
from typing import Any, Optional, List, Dict

# Environment variables
from dotenv import load_dotenv
```

### Import Organization

Group imports by category:

```python
"""
Complete import example with proper organization
"""

# 1. Standard library imports (always first)
import os
import sys
import asyncio
from typing import Any, Optional, List

# 2. Third-party library imports (alphabetical)
from dotenv import load_dotenv
import httpx

# 3. Agent SDK imports
from claude_agent_sdk import ClaudeSDKClient, query, tool

# 4. Local imports (last)
from .tools import CustomTool
from .config import Config
```

## Complete Setup Example

```python
"""
Example: Complete Python project setup

Dependencies:
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0

Install: pip install claude-agent-sdk python-dotenv
Setup: export ANTHROPIC_API_KEY=your-api-key-here

Python 3.8+ required
"""

import os
import asyncio
from claude_agent_sdk import ClaudeSDKClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_api_key() -> str:
    """
    Validate and retrieve API key.

    Returns:
        API key string

    Raises:
        ValueError: If API key not found
    """
    api_key = os.getenv('ANTHROPIC_API_KEY')

    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY is required')

    return api_key

async def main():
    """Main async entry point."""
    try:
        # Initialize client
        async with ClaudeSDKClient(api_key=get_api_key()) as client:
            # Use the agent
            response = await client.query(
                prompt='Hello! Tell me about Python.'
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
Agent responds with information about Python.
"""
```

## Version Requirements

### Minimum Versions

| Package | Minimum Version | Recommended |
|---------|----------------|-------------|
| Python | 3.8.0 | 3.11.0+ |
| pip | 21.0.0 | 23.0.0+ |
| claude-agent-sdk | 1.2.0 | Latest |
| python-dotenv | 1.0.0 | Latest |

### Check Installed Versions

```bash
python --version
pip --version
pip show claude-agent-sdk python-dotenv
```

## Common Pitfalls

### Missing Environment Variables

**Problem:** API key not loaded

```python
# Wrong: Undefined API key
from claude_agent_sdk import ClaudeSDKClient

client = ClaudeSDKClient(
    api_key=os.getenv('ANTHROPIC_API_KEY')  # Could be None!
)
```

**Solution:** Validate before use

```python
# Correct: Validate first
api_key = os.getenv('ANTHROPIC_API_KEY')
if not api_key:
    raise ValueError('ANTHROPIC_API_KEY required')

client = ClaudeSDKClient(api_key=api_key)
```

### Virtual Environment Not Activated

**Problem:** Installing to system Python

```bash
# Wrong: Not in virtual environment
pip install claude-agent-sdk  # Installs globally!
```

**Solution:** Always activate venv first

```bash
# Correct: Activate first
source venv/bin/activate
pip install claude-agent-sdk
```

### Forgetting asyncio.run()

**Problem:** Top-level await not supported in scripts

```python
# Wrong: Can't use await at module level
from claude_agent_sdk import query

response = await query(...)  # SyntaxError!
```

**Solution:** Use asyncio.run()

```python
# Correct: Wrap in async function
import asyncio
from claude_agent_sdk import query

async def main():
    response = await query(...)
    print(response.text)

if __name__ == '__main__':
    asyncio.run(main())
```

### Hardcoded API Keys

**Problem:** API key in code

```python
# NEVER DO THIS!
api_key = 'sk-ant-api03-...'  # Security risk!
```

**Solution:** Use environment variables

```python
# Always do this
import os
api_key = os.getenv('ANTHROPIC_API_KEY')
```

## Troubleshooting

### Cannot find module 'claude_agent_sdk'

**Cause:** Package not installed or venv not activated

**Solution:**
```bash
# Ensure venv is activated
source venv/bin/activate

# Install package
pip install claude-agent-sdk
```

### Python version too old

**Cause:** Python 3.7 or earlier

**Solution:**
```bash
# Check version
python --version

# Upgrade Python (example for Ubuntu)
sudo apt update
sudo apt install python3.11

# Or use pyenv for version management
pyenv install 3.11.0
pyenv local 3.11.0
```

### API key errors

**Cause:** Missing or invalid ANTHROPIC_API_KEY

**Solution:**
```bash
# Verify .env file exists and contains key
cat .env

# Load environment variables
export ANTHROPIC_API_KEY=your-key

# Test
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('ANTHROPIC_API_KEY'))"
```

### Import errors with type hints

**Cause:** Using Python 3.8 with newer syntax

**Solution:**
```python
# Python 3.8 compatible
from typing import Dict, List

def func(data: Dict[str, Any]) -> List[str]:
    pass

# Python 3.9+ only (will fail on 3.8)
def func(data: dict[str, Any]) -> list[str]:  # Requires 3.9+
    pass
```

## TypeScript vs Python Comparison

For developers familiar with TypeScript, here are the key differences:

| Feature | TypeScript | Python |
|---------|-----------|--------|
| **Package Manager** | npm/yarn | pip/venv |
| **Environment** | package.json | requirements.txt + venv |
| **Type System** | Native TypeScript | Type hints (optional) |
| **Async Entry** | Top-level await (ESM) | asyncio.run() wrapper |
| **Tool Creation** | tool() function | @tool decorator |
| **Compilation** | tsc (required) | None (interpreted) |
| **Error Handling** | try-catch | try-except |

See [TypeScript Setup Guide](../typescript/setup.md) for comparison.

## Next Steps

After completing setup:

1. **Learn patterns:** See [Query Pattern](./query-pattern.md) for stateless requests
2. **Build tools:** See [Custom Tools](./custom-tools.md) for extending capabilities
3. **Manage state:** See [Client Pattern](./client-pattern.md) for conversations
4. **Explore examples:** See [Simple CLI Agent](../examples/simple-cli-agent.md)

## Related Documentation

**Core Concepts:**
- [Overview](../overview.md) - What Agent SDK is and when to use it
- [Quickstart](../quickstart.md) - First agent in 5 minutes

**Implementation:**
- [Query Pattern](./query-pattern.md) - Stateless query() usage
- [Client Pattern](./client-pattern.md) - Stateful client usage
- [Custom Tools](./custom-tools.md) - Tool creation

**Comparison:**
- [TypeScript Setup](../typescript/setup.md) - Compare approaches

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic usage
- [Web API Agent](../examples/web-api-agent.md) - API integration
