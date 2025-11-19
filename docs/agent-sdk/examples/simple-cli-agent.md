---
title: "Simple CLI Agent"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "multi-language"
difficulty: "beginner"
example_type: "cli"
prerequisites:
  - "Completed setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)"
  - "Understanding of [Custom Tools](../concepts/tools.md)"
next_steps:
  - "Try [Web API Agent](./web-api-agent.md) for REST API integration"
  - "Build [Stateful Chatbot](./stateful-chatbot.md) with conversation memory"
  - "Explore [Multi-Tool Agent](./multi-tool-agent.md) for complex workflows"
related_guides:
  - ../typescript/setup.md
  - ../python/setup.md
  - ../typescript/custom-tools.md
  - ../python/custom-tools.md
  - ../concepts/tools.md
tags:
  - complete-example
  - cli
  - custom-tools
  - beginner
  - typescript
  - python
---

# Simple CLI Agent

## Overview

This example demonstrates a basic command-line agent that accepts user input and responds using custom tools. It's perfect for getting started with the Agent SDK and understanding the fundamentals of tool creation and agent interaction.

## Problem Statement

You need a simple command-line tool that can answer questions and perform tasks using local file system capabilities. This pattern is useful for:

- Personal productivity tools
- Development utilities
- Quick prototyping and testing
- Local automation scripts

## Prerequisites

### For TypeScript
- Node.js 18 or higher
- npm or yarn package manager
- TypeScript knowledge (basic)
- See [TypeScript Setup Guide](../typescript/setup.md) for installation

### For Python
- Python 3.8 or higher
- pip or uv package manager
- Python knowledge (basic)
- See [Python Setup Guide](../python/setup.md) for installation

### General Requirements
- ANTHROPIC_API_KEY environment variable
- Basic understanding of async programming

## TypeScript Implementation

### Complete Code

```typescript
/**
 * Example: Simple CLI Agent
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - zod@^3.22.0
 *
 * Install: npm install @anthropic-ai/agent-sdk zod
 *
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 * Get your API key from: https://console.anthropic.com/
 */

import { query, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

// Define a custom tool to read file contents
const readFile = tool({
  name: 'read_file',
  description: 'Read the contents of a file from the filesystem',
  input_schema: z.object({
    filepath: z.string().describe('The path to the file to read'),
  }),
  handler: async (input) => {
    try {
      const content = await fs.readFile(input.filepath, 'utf-8');
      return `File contents:\n${content}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error reading file: ${error.message}`;
      }
      return 'Error reading file: Unknown error';
    }
  },
});

// Define a custom tool to list directory contents
const listDirectory = tool({
  name: 'list_directory',
  description: 'List all files and directories in a given path',
  input_schema: z.object({
    dirpath: z.string().describe('The directory path to list'),
  }),
  handler: async (input) => {
    try {
      const entries = await fs.readdir(input.dirpath, { withFileTypes: true });
      const items = entries.map(entry => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${entry.name}`;
      });
      return `Directory contents of ${input.dirpath}:\n${items.join('\n')}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error listing directory: ${error.message}`;
      }
      return 'Error listing directory: Unknown error';
    }
  },
});

// Main function to run the CLI agent
async function main() {
  // Get the user's question from command line arguments
  const userPrompt = process.argv.slice(2).join(' ');

  if (!userPrompt) {
    console.error('Usage: npx tsx simple-cli-agent.ts <your question>');
    console.error('Example: npx tsx simple-cli-agent.ts "What files are in the current directory?"');
    process.exit(1);
  }

  // Validate API key is set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    console.error('Set it with: export ANTHROPIC_API_KEY=your-api-key-here');
    process.exit(1);
  }

  try {
    console.log('Processing your request...\n');

    // Query the agent with custom tools
    const response = await query({
      apiKey: process.env.ANTHROPIC_API_KEY,
      prompt: userPrompt,
      tools: [readFile, listDirectory],
    });

    // Display the response
    console.log('Agent Response:');
    console.log('─'.repeat(50));
    console.log(response.text);
    console.log('─'.repeat(50));
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
}

main();

/**
 * Expected output:
 * When you run: npx tsx simple-cli-agent.ts "List the files in the current directory"
 *
 * The agent will:
 * 1. Use the list_directory tool to scan the current directory
 * 2. Return a formatted list of files and directories
 * 3. Provide a natural language response
 *
 * Example output:
 * Processing your request...
 *
 * Agent Response:
 * ──────────────────────────────────────────────────
 * I found the following items in the current directory:
 *
 * Directories:
 * - node_modules
 * - src
 * - dist
 *
 * Files:
 * - package.json
 * - tsconfig.json
 * - README.md
 * ──────────────────────────────────────────────────
 */
```

## Python Implementation

### Installation

```bash
# Create a new directory for your project
mkdir my-cli-agent
cd my-cli-agent

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install claude-agent-sdk python-dotenv
```

### Complete Code

```python
"""
Example: Simple CLI Agent

Dependencies:
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0

Install: pip install claude-agent-sdk python-dotenv

Setup:
export ANTHROPIC_API_KEY=your-api-key-here
Get your API key from: https://console.anthropic.com/

Python 3.8+ required
"""

import os
import sys
import asyncio
from typing import Any
from pathlib import Path
from claude_agent_sdk import query, tool
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
        raise ValueError(
            'ANTHROPIC_API_KEY environment variable required. '
            'Get your key at: https://console.anthropic.com/'
        )
    return api_key


@tool
async def read_file(args: dict[str, Any]) -> dict[str, Any]:
    """
    Read the contents of a file from the filesystem.

    Args:
        args: Dictionary with 'filepath' key containing the file path

    Returns:
        Dictionary with content result for Claude
    """
    filepath = args.get('filepath', '')

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
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
                "text": f"Error reading file: File not found: {filepath}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error reading file: {str(e)}"
            }]
        }


@tool
async def list_directory(args: dict[str, Any]) -> dict[str, Any]:
    """
    List all files and directories in a given path.

    Args:
        args: Dictionary with 'dirpath' key containing the directory path

    Returns:
        Dictionary with directory listing for Claude
    """
    dirpath = args.get('dirpath', '.')

    try:
        path = Path(dirpath)
        items = []

        for entry in sorted(path.iterdir()):
            entry_type = '[DIR]' if entry.is_dir() else '[FILE]'
            items.append(f"{entry_type} {entry.name}")

        listing = '\n'.join(items)
        return {
            "content": [{
                "type": "text",
                "text": f"Directory contents of {dirpath}:\n{listing}"
            }]
        }
    except FileNotFoundError:
        return {
            "content": [{
                "type": "text",
                "text": f"Error listing directory: Directory not found: {dirpath}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error listing directory: {str(e)}"
            }]
        }


async def main():
    """Main async entry point for the CLI agent."""
    # Get the user's question from command line arguments
    user_prompt = ' '.join(sys.argv[1:])

    if not user_prompt:
        print('Usage: python simple-cli-agent.py <your question>', file=sys.stderr)
        print('Example: python simple-cli-agent.py "What files are in the current directory?"', file=sys.stderr)
        sys.exit(1)

    try:
        # Validate API key
        api_key = get_api_key()

        print('Processing your request...\n')

        # Query the agent with custom tools
        response = await query(
            api_key=api_key,
            prompt=user_prompt,
            tools=[read_file, list_directory]
        )

        # Display the response
        print('Agent Response:')
        print('─' * 50)
        print(response.text)
        print('─' * 50)

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
When you run: python simple-cli-agent.py "List the files in the current directory"

The agent will:
1. Use the list_directory tool to scan the current directory
2. Return a formatted list of files and directories
3. Provide a natural language response

Example output:
Processing your request...

Agent Response:
──────────────────────────────────────────────────
I found the following items in the current directory:

Directories:
- venv
- src
- dist

Files:
- requirements.txt
- simple-cli-agent.py
- README.md
──────────────────────────────────────────────────
"""
```

### Running the Python Version

```bash
# Set your API key (get it from https://console.anthropic.com/)
export ANTHROPIC_API_KEY=your-api-key-here

# Save the code above to simple-cli-agent.py
# Then run it with a question:
python simple-cli-agent.py "What files are in this directory?"

# Try other prompts:
python simple-cli-agent.py "Read the requirements.txt file"
python simple-cli-agent.py "Tell me about the README.md contents"
```

### Expected Output

```
Processing your request...

Agent Response:
──────────────────────────────────────────────────
I can see the following files and directories:

Directories:
- venv (your Python virtual environment)
- src (likely your source code)

Files:
- requirements.txt (your Python dependencies)
- simple-cli-agent.py (this example file)
──────────────────────────────────────────────────
```

## How It Works

This example demonstrates several key concepts across both language implementations:

1. **Tool Definition**:
   - TypeScript: Uses `tool()` function with Zod schemas for input validation
   - Python: Uses `@tool` decorator with docstrings for description
2. **Error Handling**:
   - TypeScript: try-catch blocks with type-safe error handling
   - Python: try-except blocks with specific exception types
3. **Query Pattern**: Both use the stateless `query()` function for single-shot interactions
4. **CLI Integration**:
   - TypeScript: Reads arguments via `process.argv`
   - Python: Reads arguments via `sys.argv`
5. **Environment Variables**:
   - TypeScript: `process.env.ANTHROPIC_API_KEY`
   - Python: `os.getenv('ANTHROPIC_API_KEY')` with python-dotenv

The agent automatically decides which tool to use based on the user's prompt. For example:
- "List files" triggers `list_directory`
- "Read package.json" or "Read requirements.txt" triggers `read_file`
- "What's in my README?" triggers `read_file` with the appropriate path

## Running the Example

### Installation

```bash
# Create a new directory for your project
mkdir my-cli-agent
cd my-cli-agent

# Initialize npm project
npm init -y

# Install dependencies
npm install @anthropic-ai/agent-sdk zod
npm install -D typescript @types/node tsx
```

### Set up environment

```bash
# Set your API key (get it from https://console.anthropic.com/)
export ANTHROPIC_API_KEY=your-api-key-here
```

### Save and run the example

```bash
# Save the code above to simple-cli-agent.ts
# Then run it with a question:
npx tsx simple-cli-agent.ts "What files are in this directory?"

# Try other prompts:
npx tsx simple-cli-agent.ts "Read the package.json file"
npx tsx simple-cli-agent.ts "Tell me about the README.md contents"
```

## Expected Output

```
Processing your request...

Agent Response:
──────────────────────────────────────────────────
I can see the following files and directories:

Directories:
- node_modules (contains your installed dependencies)
- src (likely your source code)

Files:
- package.json (your project configuration)
- tsconfig.json (TypeScript configuration)
- simple-cli-agent.ts (this example file)
──────────────────────────────────────────────────
```

## Key Concepts Demonstrated

- **Custom Tools**: Creating tools with `tool()` and Zod schemas for input validation
- **Query Pattern**: Using the stateless `query()` function for simple interactions
- **Error Handling**: Proper try-catch blocks with type-safe error handling
- **CLI Arguments**: Reading user input from command-line arguments
- **File System Operations**: Using Node.js fs/promises for async file operations
- **Environment Security**: Loading API keys from environment variables, not hardcoded

## Next Steps

- Try adding more custom tools (write file, search files, etc.)
- Add input validation for file paths (prevent reading sensitive files)
- Implement streaming for real-time responses (see [Streaming Guide](../typescript/streaming.md))
- Convert to an interactive chatbot with conversation memory (see [Stateful Chatbot Example](./stateful-chatbot.md))
- Add multiple tools and coordination (see [Multi-Tool Agent Example](./multi-tool-agent.md))

## Related Documentation

**Core Concepts:**
- [Tools Overview](../concepts/tools.md) - Understanding built-in and custom tools
- [Permissions](../concepts/permissions.md) - File system permission considerations

**TypeScript:**
- [Setup Guide](../typescript/setup.md) - Installing and configuring the SDK
- [Custom Tools](../typescript/custom-tools.md) - Advanced tool creation patterns
- [Query Pattern](../typescript/query-pattern.md) - Stateless agent interactions

**Python:**
- [Setup Guide](../python/setup.md) - Installing and configuring the Python SDK
- [Custom Tools](../python/custom-tools.md) - @tool decorator and tool creation
- [Query Pattern](../python/query-pattern.md) - Async/await patterns for queries

**Similar Examples:**
- [Web API Agent](./web-api-agent.md) - Expose agent via REST API
- [Multi-Tool Agent](./multi-tool-agent.md) - Complex tool coordination
