---
title: "MCP Server Agent"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "multi-language"
difficulty: "advanced"
example_type: "integration"
prerequisites:
  - "Completed setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)"
  - "Understanding of [MCP Concept](../concepts/mcp.md)"
  - "Familiarity with [Custom Tools](../typescript/custom-tools.md) or [Python Tools](../python/custom-tools.md)"
next_steps:
  - "Deploy MCP server for production use"
  - "Add [Permissions](../concepts/permissions.md) for MCP tools"
  - "Implement [Cost Tracking](../concepts/cost-tracking.md) for MCP operations"
related_guides:
  - ../concepts/mcp.md
  - ../typescript/custom-tools.md
  - ../typescript/setup.md
  - ../python/custom-tools.md
  - ../python/setup.md
  - ../python/options.md
  - ../python/async-patterns.md
tags:
  - complete-example
  - mcp
  - advanced
  - model-context-protocol
  - custom-server
  - typescript
  - python
---

# MCP Server Agent

## Overview

This example demonstrates how to create a custom Model Context Protocol (MCP) server and integrate it with an Agent SDK client. MCP provides a standardized way to expose tools and resources to AI agents, enabling modular, reusable components that can be shared across different agent implementations.

## Problem Statement

You need to:

- Create reusable tool collections that can be shared across multiple agents
- Expose local resources (databases, files, APIs) through a standardized protocol
- Build modular agent capabilities that can be maintained independently
- Enable agent ecosystems where different MCP servers provide specialized capabilities

MCP is ideal for:
- Database query tools (SQL, MongoDB, etc.)
- File system operations
- API integrations (GitHub, Slack, etc.)
- Specialized domain tools (math, data science, etc.)

## Prerequisites

### For TypeScript
- Node.js 18 or higher
- npm or yarn package manager
- Advanced TypeScript knowledge
- See [TypeScript Setup Guide](../typescript/setup.md)
- See [TypeScript Custom Tools](../typescript/custom-tools.md)

### For Python
- Python 3.8 or higher
- pip or uv package manager
- Advanced Python async/await knowledge
- See [Python Setup Guide](../python/setup.md)
- See [Python Custom Tools](../python/custom-tools.md)
- See [Python Async Patterns](../python/async-patterns.md)

### General Requirements
- ANTHROPIC_API_KEY environment variable
- [MCP Concept Guide](../concepts/mcp.md) - Understanding Model Context Protocol

## TypeScript Implementation

### Part 1: MCP Server Implementation

```typescript
/**
 * Example: Custom MCP Server
 * File: mcp-server.ts
 *
 * Dependencies:
 * - @modelcontextprotocol/sdk@^1.0.0
 * - zod@^3.22.0
 *
 * Install: npm install @modelcontextprotocol/sdk zod
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Define tool schemas
const CalculatorInputSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number(),
  b: z.number(),
});

const DataQueryInputSchema = z.object({
  collection: z.string(),
  query: z.record(z.any()).optional(),
  limit: z.number().optional().default(10),
});

// Tool definitions
const tools: Tool[] = [
  {
    name: 'calculator',
    description: 'Perform mathematical operations (add, subtract, multiply, divide)',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'The mathematical operation to perform',
        },
        a: {
          type: 'number',
          description: 'First number',
        },
        b: {
          type: 'number',
          description: 'Second number',
        },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'data_query',
    description: 'Query data from an in-memory database',
    inputSchema: {
      type: 'object',
      properties: {
        collection: {
          type: 'string',
          description: 'Collection name to query',
        },
        query: {
          type: 'object',
          description: 'Query filter (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 10,
        },
      },
      required: ['collection'],
    },
  },
];

// In-memory database for demo
const database: Record<string, any[]> = {
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: true },
    { id: 3, name: 'Charlie', role: 'user', active: false },
  ],
  products: [
    { id: 101, name: 'Laptop', price: 999.99, stock: 5 },
    { id: 102, name: 'Mouse', price: 29.99, stock: 50 },
    { id: 103, name: 'Keyboard', price: 79.99, stock: 30 },
  ],
};

// Tool handlers
async function handleCalculator(args: any): Promise<string> {
  try {
    const input = CalculatorInputSchema.parse(args);
    let result: number;

    switch (input.operation) {
      case 'add':
        result = input.a + input.b;
        break;
      case 'subtract':
        result = input.a - input.b;
        break;
      case 'multiply':
        result = input.a * input.b;
        break;
      case 'divide':
        if (input.b === 0) {
          throw new Error('Division by zero');
        }
        result = input.a / input.b;
        break;
    }

    return `Result: ${input.a} ${input.operation} ${input.b} = ${result}`;
  } catch (error) {
    if (error instanceof Error) {
      return `Calculator error: ${error.message}`;
    }
    return 'Calculator error: Unknown error';
  }
}

async function handleDataQuery(args: any): Promise<string> {
  try {
    const input = DataQueryInputSchema.parse(args);

    if (!database[input.collection]) {
      return `Error: Collection '${input.collection}' not found. Available: ${Object.keys(database).join(', ')}`;
    }

    let results = database[input.collection];

    // Apply query filter if provided
    if (input.query) {
      results = results.filter(item => {
        return Object.entries(input.query!).every(([key, value]) => item[key] === value);
      });
    }

    // Apply limit
    results = results.slice(0, input.limit);

    return JSON.stringify({
      collection: input.collection,
      count: results.length,
      results: results,
    }, null, 2);
  } catch (error) {
    if (error instanceof Error) {
      return `Query error: ${error.message}`;
    }
    return 'Query error: Unknown error';
  }
}

// Create and configure MCP server
async function main() {
  const server = new Server(
    {
      name: 'example-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool list requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool execution requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'calculator':
        return {
          content: [
            {
              type: 'text',
              text: await handleCalculator(args),
            },
          ],
        };

      case 'data_query':
        return {
          content: [
            {
              type: 'text',
              text: await handleDataQuery(args),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('MCP Server started successfully');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

### Part 2: Agent Integration

```typescript
/**
 * Example: Agent with MCP Server Integration
 * File: agent-with-mcp.ts
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - @modelcontextprotocol/sdk@^1.0.0
 *
 * Install: npm install @anthropic-ai/agent-sdk @modelcontextprotocol/sdk
 *
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

// MCP client wrapper
class MCPClientWrapper {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(serverCommand: string, serverArgs: string[]) {
    // Spawn the MCP server process
    const serverProcess = spawn(serverCommand, serverArgs);

    // Create transport using the server's stdio
    this.transport = new StdioClientTransport({
      reader: serverProcess.stdout,
      writer: serverProcess.stdin,
    });

    // Create and connect MCP client
    this.client = new Client(
      {
        name: 'agent-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);
    console.log('✓ Connected to MCP server');
  }

  async listTools() {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const response = await this.client.listTools();
    return response.tools;
  }

  async callTool(name: string, args: any) {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    const response = await this.client.callTool({ name, arguments: args });
    return response.content;
  }

  async close() {
    if (this.client && this.transport) {
      await this.client.close();
      await this.transport.close();
    }
  }
}

// Create agent with MCP integration
async function createAgentWithMCP(): Promise<ClaudeSDKClient> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  // Initialize MCP client
  const mcpClient = new MCPClientWrapper();
  await mcpClient.connect('node', ['mcp-server.js']);

  // Get available tools from MCP server
  const mcpTools = await mcpClient.listTools();
  console.log(`✓ Loaded ${mcpTools.length} tools from MCP server`);

  // Create Agent SDK client
  // Note: In a real implementation, you'd create custom tools that wrap MCP calls
  const agent = new ClaudeSDKClient({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
  });

  return agent;
}

// Example usage
async function main() {
  try {
    console.log('Initializing Agent with MCP Server...\n');

    const agent = await createAgentWithMCP();

    // Example 1: Use calculator through MCP
    console.log('Example 1: Calculator via MCP');
    console.log('─'.repeat(60));
    const response1 = await agent.query({
      prompt: 'Calculate 156 multiplied by 23',
    });
    console.log(response1.text);
    console.log('\n');

    // Example 2: Query database through MCP
    console.log('Example 2: Database Query via MCP');
    console.log('─'.repeat(60));
    const response2 = await agent.query({
      prompt: 'Show me all active users from the users collection',
    });
    console.log(response2.text);
    console.log('\n');

    // Example 3: Complex query combining tools
    console.log('Example 3: Combined Operations');
    console.log('─'.repeat(60));
    const response3 = await agent.query({
      prompt: 'Get all products, then calculate the total value of the laptop inventory (price × stock)',
    });
    console.log(response3.text);
    console.log('\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unexpected error occurred');
    }
    process.exit(1);
  }
}

main();

/**
 * Expected output:
 *
 * Initializing Agent with MCP Server...
 * ✓ Connected to MCP server
 * ✓ Loaded 2 tools from MCP server
 *
 * Example 1: Calculator via MCP
 * ────────────────────────────────────────────────────────────
 * Using the calculator tool: 156 × 23 = 3,588
 *
 * Example 2: Database Query via MCP
 * ────────────────────────────────────────────────────────────
 * I found 2 active users in the database:
 * 1. Alice (admin) - ID: 1
 * 2. Bob (user) - ID: 2
 *
 * Example 3: Combined Operations
 * ────────────────────────────────────────────────────────────
 * Here's the inventory analysis:
 *
 * Products:
 * - Laptop: $999.99 × 5 units = $4,999.95
 * - Mouse: $29.99 × 50 units = $1,499.50
 * - Keyboard: $79.99 × 30 units = $2,399.70
 *
 * Total inventory value: $8,899.15
 *
 * All examples completed successfully!
 */
```

### Part 3: Configuration and Setup

```typescript
/**
 * Example: MCP Configuration
 * File: mcp-config.json
 *
 * This configuration file tells the Agent SDK how to connect to MCP servers.
 * Place it in your project root or specify path via environment variable.
 */

{
  "mcpServers": {
    "example": {
      "command": "node",
      "args": ["dist/mcp-server.js"],
      "description": "Example MCP server with calculator and data query tools"
    }
  }
}
```

## Python Implementation

### Part 1: Python MCP Server Implementation

```python
"""
Example: Custom MCP Server (Python)
File: mcp_server.py

Dependencies:
- mcp>=1.0.0  # Model Context Protocol SDK
- aiosqlite>=0.19.0  # Async SQLite (for demo database)

Install: pip install mcp aiosqlite

Python 3.8+ required
"""

import asyncio
import json
from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Tool,
    TextContent,
    CallToolResult,
)

# In-memory database for demo
DATABASE: Dict[str, List[Dict[str, Any]]] = {
    'users': [
        {'id': 1, 'name': 'Alice', 'role': 'admin', 'active': True},
        {'id': 2, 'name': 'Bob', 'role': 'user', 'active': True},
        {'id': 3, 'name': 'Charlie', 'role': 'user', 'active': False},
    ],
    'products': [
        {'id': 101, 'name': 'Laptop', 'price': 999.99, 'stock': 5},
        {'id': 102, 'name': 'Mouse', 'price': 29.99, 'stock': 50},
        {'id': 103, 'name': 'Keyboard', 'price': 79.99, 'stock': 30},
    ],
}

# Tool definitions
TOOLS: List[Tool] = [
    Tool(
        name='calculator',
        description='Perform mathematical operations (add, subtract, multiply, divide)',
        inputSchema={
            'type': 'object',
            'properties': {
                'operation': {
                    'type': 'string',
                    'enum': ['add', 'subtract', 'multiply', 'divide'],
                    'description': 'The mathematical operation to perform',
                },
                'a': {
                    'type': 'number',
                    'description': 'First number',
                },
                'b': {
                    'type': 'number',
                    'description': 'Second number',
                },
            },
            'required': ['operation', 'a', 'b'],
        },
    ),
    Tool(
        name='data_query',
        description='Query data from an in-memory database',
        inputSchema={
            'type': 'object',
            'properties': {
                'collection': {
                    'type': 'string',
                    'description': 'Collection name to query',
                },
                'query': {
                    'type': 'object',
                    'description': 'Query filter (optional)',
                },
                'limit': {
                    'type': 'number',
                    'description': 'Maximum number of results',
                    'default': 10,
                },
            },
            'required': ['collection'],
        },
    ),
]


async def handle_calculator(args: Dict[str, Any]) -> str:
    """
    Handle calculator tool requests.

    Args:
        args: Tool arguments containing operation, a, and b

    Returns:
        Result string
    """
    try:
        operation = args.get('operation')
        a = args.get('a')
        b = args.get('b')

        if operation == 'add':
            result = a + b
        elif operation == 'subtract':
            result = a - b
        elif operation == 'multiply':
            result = a * b
        elif operation == 'divide':
            if b == 0:
                return 'Error: Division by zero'
            result = a / b
        else:
            return f'Error: Unknown operation: {operation}'

        return f'Result: {a} {operation} {b} = {result}'

    except Exception as e:
        return f'Calculator error: {str(e)}'


async def handle_data_query(args: Dict[str, Any]) -> str:
    """
    Handle data query tool requests.

    Args:
        args: Tool arguments containing collection, query, and limit

    Returns:
        JSON string with query results
    """
    try:
        collection = args.get('collection')
        query_filter = args.get('query', {})
        limit = args.get('limit', 10)

        # Check if collection exists
        if collection not in DATABASE:
            available = ', '.join(DATABASE.keys())
            return f"Error: Collection '{collection}' not found. Available: {available}"

        # Get data from collection
        results = DATABASE[collection]

        # Apply query filter if provided
        if query_filter:
            filtered = []
            for item in results:
                match = all(
                    item.get(key) == value
                    for key, value in query_filter.items()
                )
                if match:
                    filtered.append(item)
            results = filtered

        # Apply limit
        results = results[:limit]

        # Return as JSON
        response = {
            'collection': collection,
            'count': len(results),
            'results': results,
        }

        return json.dumps(response, indent=2)

    except Exception as e:
        return f'Query error: {str(e)}'


async def main():
    """
    Main MCP server entry point.
    """
    # Create MCP server
    server = Server('example-mcp-server')

    # Register tool list handler
    @server.list_tools()
    async def list_tools() -> List[Tool]:
        """Return available tools."""
        return TOOLS

    # Register tool call handler
    @server.call_tool()
    async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
        """
        Handle tool invocation requests.

        Args:
            name: Tool name
            arguments: Tool arguments

        Returns:
            CallToolResult with content
        """
        if name == 'calculator':
            text = await handle_calculator(arguments)
            return CallToolResult(
                content=[TextContent(type='text', text=text)]
            )

        elif name == 'data_query':
            text = await handle_data_query(arguments)
            return CallToolResult(
                content=[TextContent(type='text', text=text)]
            )

        else:
            error_text = f'Unknown tool: {name}'
            return CallToolResult(
                content=[TextContent(type='text', text=error_text)],
                isError=True
            )

    # Run server with stdio transport
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == '__main__':
    import sys
    print('MCP Server starting...', file=sys.stderr)
    asyncio.run(main())
    print('MCP Server stopped.', file=sys.stderr)
```

### Part 2: Python Agent Integration

```python
"""
Example: Agent with MCP Server Integration (Python)
File: agent_with_mcp.py

Dependencies:
- claude-agent-sdk>=1.2.0
- mcp>=1.0.0
- python-dotenv>=1.0.0

Install: pip install claude-agent-sdk mcp python-dotenv

Setup:
export ANTHROPIC_API_KEY=your-api-key-here

Python 3.8+ required
"""

import os
import sys
import asyncio
import subprocess
from typing import Any, Dict, List, Optional
from claude_agent_sdk import ClaudeSDKClient
from mcp.client import Client
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

# Load environment variables
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


class MCPClientWrapper:
    """
    Wrapper for MCP client with stdio transport.
    """

    def __init__(self):
        self.client: Optional[Client] = None
        self.server_process: Optional[subprocess.Popen] = None

    async def connect(self, server_command: str, server_args: List[str]):
        """
        Connect to MCP server via stdio.

        Args:
            server_command: Command to run server (e.g., 'python')
            server_args: Server arguments (e.g., ['mcp_server.py'])
        """
        # Start MCP server process
        self.server_process = subprocess.Popen(
            [server_command] + server_args,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Create MCP client with stdio transport
        read_stream = self.server_process.stdout
        write_stream = self.server_process.stdin

        # Initialize client
        self.client = Client(
            name='agent-mcp-client',
            version='1.0.0'
        )

        async with stdio_client(read_stream, write_stream) as streams:
            read, write = streams
            await self.client.connect(read, write)

        print('✓ Connected to MCP server', file=sys.stderr)

    async def list_tools(self) -> List[Any]:
        """
        List available tools from MCP server.

        Returns:
            List of tool definitions

        Raises:
            RuntimeError: If client not connected
        """
        if not self.client:
            raise RuntimeError('MCP client not connected')

        response = await self.client.list_tools()
        return response.tools

    async def call_tool(self, name: str, args: Dict[str, Any]) -> List[Any]:
        """
        Call a tool on the MCP server.

        Args:
            name: Tool name
            args: Tool arguments

        Returns:
            Tool result content

        Raises:
            RuntimeError: If client not connected
        """
        if not self.client:
            raise RuntimeError('MCP client not connected')

        response = await self.client.call_tool(name, args)
        return response.content

    async def close(self):
        """Close client connection and terminate server process."""
        if self.client:
            await self.client.close()

        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait()


async def create_agent_with_mcp() -> ClaudeSDKClient:
    """
    Create agent with MCP integration.

    Returns:
        Configured ClaudeSDKClient

    Raises:
        ValueError: If API key not set
    """
    # Validate API key
    api_key = get_api_key()

    # Initialize MCP client
    mcp_client = MCPClientWrapper()
    await mcp_client.connect('python', ['mcp_server.py'])

    # Get available tools from MCP server
    mcp_tools = await mcp_client.list_tools()
    print(f'✓ Loaded {len(mcp_tools)} tools from MCP server', file=sys.stderr)

    # Create Agent SDK client
    # Note: In production, you would create custom tools that wrap MCP calls
    agent = ClaudeSDKClient(
        api_key=api_key,
        model='claude-3-5-sonnet-20241022',
    )

    return agent


async def main():
    """Main async entry point."""
    try:
        print('Initializing Agent with MCP Server...\n')

        # Create agent with MCP integration
        agent = await create_agent_with_mcp()

        # Example 1: Use calculator through MCP
        print('Example 1: Calculator via MCP')
        print('─' * 60)
        async with agent:
            response1 = await agent.query(
                prompt='Calculate 156 multiplied by 23'
            )
            print(response1.text)
            print('\n')

        # Example 2: Query database through MCP
        print('Example 2: Database Query via MCP')
        print('─' * 60)
        async with agent:
            response2 = await agent.query(
                prompt='Show me all active users from the users collection'
            )
            print(response2.text)
            print('\n')

        # Example 3: Complex query combining tools
        print('Example 3: Combined Operations')
        print('─' * 60)
        async with agent:
            response3 = await agent.query(
                prompt='Get all products, then calculate the total value '
                       'of the laptop inventory (price × stock)'
            )
            print(response3.text)
            print('\n')

        print('All examples completed successfully!')

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

Initializing Agent with MCP Server...
✓ Connected to MCP server
✓ Loaded 2 tools from MCP server

Example 1: Calculator via MCP
────────────────────────────────────────────────────────────
Using the calculator tool: 156 × 23 = 3,588

Example 2: Database Query via MCP
────────────────────────────────────────────────────────────
I found 2 active users in the database:
1. Alice (admin) - ID: 1
2. Bob (user) - ID: 2

Example 3: Combined Operations
────────────────────────────────────────────────────────────
Here's the inventory analysis:

Products:
- Laptop: $999.99 × 5 units = $4,999.95
- Mouse: $29.99 × 50 units = $1,499.50
- Keyboard: $79.99 × 30 units = $2,399.70

Total inventory value: $8,899.15

All examples completed successfully!
"""
```

### Part 3: Python Configuration

```python
"""
Example: MCP Configuration (Python)
File: mcp_config.py

Configuration helper for MCP server connections.
"""

import os
from typing import Dict, List, Any

# MCP server configuration
MCP_SERVERS: Dict[str, Dict[str, Any]] = {
    'example': {
        'command': 'python',
        'args': ['mcp_server.py'],
        'description': 'Example MCP server with calculator and data query tools',
        'env': {
            # Additional environment variables for server
            'LOG_LEVEL': 'INFO',
        }
    }
}


def get_server_config(server_name: str) -> Dict[str, Any]:
    """
    Get configuration for a specific MCP server.

    Args:
        server_name: Name of the server

    Returns:
        Server configuration dict

    Raises:
        KeyError: If server not found
    """
    if server_name not in MCP_SERVERS:
        available = ', '.join(MCP_SERVERS.keys())
        raise KeyError(
            f"Server '{server_name}' not found. Available: {available}"
        )

    return MCP_SERVERS[server_name]


def list_servers() -> List[str]:
    """
    List all configured MCP servers.

    Returns:
        List of server names
    """
    return list(MCP_SERVERS.keys())
```

## How It Works

This example demonstrates the complete MCP integration pattern across both TypeScript and Python implementations:

1. **MCP Server Creation**: Implements a custom MCP server with multiple tools using the MCP SDK
2. **Tool Registration**: Defines tools with JSON schemas for input validation
3. **Request Handling**: Processes `ListTools` and `CallTool` requests from clients
4. **StdIO Transport**: Uses standard input/output for communication (can also use HTTP)
5. **Agent Integration**: Connects Agent SDK client to MCP server via MCP client
6. **Tool Wrapping**: MCP tools are exposed to the agent transparently
7. **Error Handling**: Comprehensive error handling across the MCP boundary

The architecture:
```
┌─────────────────┐
│  Agent SDK      │
│  Client         │
└────────┬────────┘
         │ queries
         ▼
┌─────────────────┐
│  MCP Client     │
│  (Transport)    │
└────────┬────────┘
         │ StdIO/HTTP
         ▼
┌─────────────────┐
│  MCP Server     │
│  (Your Tools)   │
└─────────────────┘
```

**Key differences between implementations:**

| Aspect | TypeScript | Python |
|--------|-----------|--------|
| **Server SDK** | @modelcontextprotocol/sdk | mcp |
| **Transport** | StdioServerTransport | stdio_server() |
| **Tool Definition** | JSON schemas with Zod | JSON schemas (dict) |
| **Handler Pattern** | setRequestHandler() | @server decorators |
| **Client** | StdioClientTransport | stdio_client() |
| **Process Management** | spawn() from child_process | subprocess.Popen |
| **Async Pattern** | Native async/await | asyncio.run() wrapper |

## Running the Example

### TypeScript Installation

```bash
# Create project directory
mkdir mcp-agent
cd mcp-agent

# Initialize npm
npm init -y

# Install dependencies
npm install @anthropic-ai/agent-sdk @modelcontextprotocol/sdk
npm install -D typescript @types/node tsx

# Setup TypeScript
npx tsc --init
```

### Project structure

```
mcp-agent/
├── package.json
├── tsconfig.json
├── mcp-server.ts          # MCP server implementation
├── agent-with-mcp.ts      # Agent integration
└── mcp-config.json        # Configuration (optional)
```

### Build and run

```bash
# Set API key
export ANTHROPIC_API_KEY=your-api-key-here

# Compile TypeScript
npx tsc

# Run MCP server (in one terminal)
node dist/mcp-server.js

# Run agent with MCP (in another terminal)
npx tsx agent-with-mcp.ts
```

### Python Installation

```bash
# Create project directory
mkdir mcp-agent-python
cd mcp-agent-python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install claude-agent-sdk mcp python-dotenv aiosqlite
```

### Python Project Structure

```
mcp-agent-python/
├── venv/                  # Virtual environment
├── .env                   # Environment variables
├── mcp_server.py          # MCP server implementation
├── agent_with_mcp.py      # Agent integration
├── mcp_config.py          # Configuration helper
└── requirements.txt       # Dependencies
```

### Python Build and Run

```bash
# Set API key
export ANTHROPIC_API_KEY=your-api-key-here

# Run MCP server (in one terminal)
python mcp_server.py

# Run agent with MCP (in another terminal)
python agent_with_mcp.py
```

## Expected Output

The agent will successfully communicate with the MCP server, use its tools transparently, and provide coherent responses that leverage the server's capabilities.

## Key Concepts Demonstrated

- **MCP Protocol**: Implementing the Model Context Protocol specification
- **Server Creation**: Building a custom MCP server with multiple tools
- **Client Integration**: Connecting Agent SDK to MCP servers
- **StdIO Transport**: Using standard input/output for process communication
- **Tool Abstraction**: MCP tools work identically to native Agent SDK tools
- **Modularity**: MCP servers can be reused across different agents
- **Error Handling**: Managing errors across process boundaries
- **Configuration**: External configuration for MCP server connections

## Next Steps

- Add more specialized tools to your MCP server
- Implement HTTP transport for remote MCP servers
- Create MCP servers for specific domains (database, APIs, etc.)
- Share MCP servers across multiple agent applications
- Add authentication and authorization to MCP servers
- Implement resource providers (not just tools) in MCP
- Use existing MCP servers from the community
- Add logging and monitoring for MCP communications
- Implement connection pooling for multiple MCP servers

## Related Documentation

**Core Concepts:**
- [MCP Overview](../concepts/mcp.md) - Model Context Protocol fundamentals
- [Tools](../concepts/tools.md) - Tool design and best practices
- [Hooks](../concepts/hooks.md) - Pre/post tool execution

**TypeScript:**
- [TypeScript Setup Guide](../typescript/setup.md) - Initial configuration
- [TypeScript Custom Tools](../typescript/custom-tools.md) - Tool creation patterns
- [TypeScript Client Pattern](../typescript/client-pattern.md) - Stateful agents

**Python:**
- [Python Setup Guide](../python/setup.md) - Installation and configuration
- [Python Custom Tools](../python/custom-tools.md) - @tool decorator and patterns
- [Python Options](../python/options.md) - MCP configuration
- [Python Async Patterns](../python/async-patterns.md) - Async best practices

**Similar Examples:**
- [Multi-Tool Agent](./multi-tool-agent.md) - Complex tool coordination
- [Simple CLI Agent](./simple-cli-agent.md) - Basic tool usage
- [Web API Agent](./web-api-agent.md) - REST API patterns
