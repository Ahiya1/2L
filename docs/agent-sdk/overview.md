---
title: "Agent SDK Overview"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "cross-language"
difficulty: "beginner"
prerequisites:
  - "Basic understanding of AI agents"
  - "Familiarity with CLI tools"
next_steps:
  - "Follow [Quick Start Guide](./quickstart.md) for your first agent"
  - "Choose your language: [TypeScript Setup](./typescript/setup.md) or [Python Setup](./python/setup.md)"
  - "Learn about [Custom Tools](./concepts/tools.md)"
related_guides:
  - quickstart.md
  - typescript/setup.md
  - concepts/tools.md
tags:
  - agent-sdk
  - overview
  - introduction
  - getting-started
---

# Agent SDK Overview

## Table of Contents

1. [What is the Agent SDK?](#what-is-the-agent-sdk)
2. [When to Use the Agent SDK](#when-to-use-the-agent-sdk)
   - [Use Agent SDK When](#use-agent-sdk-when)
   - [Use Direct Claude API When](#use-direct-claude-api-when)
3. [Core Concepts](#core-concepts)
   - [Stateless Query Pattern](#1-stateless-query-pattern)
   - [Stateful Client Pattern](#2-stateful-client-pattern)
   - [Custom Tools](#3-custom-tools)
   - [Permissions](#4-permissions)
   - [Model Context Protocol (MCP)](#5-model-context-protocol-mcp)
   - [Hooks](#6-hooks)
4. [Architecture Overview](#architecture-overview)
5. [Language Support](#language-support)
   - [TypeScript (Complete) ✅](#typescript-complete-)
   - [Python (Available) ✅](#python-available-)
6. [Key Features](#key-features)
   - [Built-in Tools](#built-in-tools)
   - [Session Management](#session-management)
   - [Cost Tracking](#cost-tracking)
   - [Streaming](#streaming)
7. [Quick Comparison: Query vs Client](#quick-comparison-query-vs-client)
8. [Getting Started](#getting-started)
9. [Common Use Cases](#common-use-cases)
   - [CLI Tool Assistant](#1-cli-tool-assistant)
   - [Web API with Agent](#2-web-api-with-agent)
   - [Interactive Chatbot](#3-interactive-chatbot)
   - [Multi-Tool Agent](#4-multi-tool-agent)
   - [MCP Integration](#5-mcp-integration)
10. [Advanced Features](#advanced-features)
    - [Subagents](#subagents)
    - [System Prompt Modification](#system-prompt-modification)
    - [Todo Tracking](#todo-tracking)
    - [Slash Commands](#slash-commands)
11. [Troubleshooting](#troubleshooting)
12. [Next Steps](#next-steps)
13. [Related Documentation](#related-documentation)

---

## What is the Agent SDK?

The Agent SDK (also known as Claude Code SDK) is Anthropic's official toolkit for building AI agents that can interact with tools, manage state, and execute complex multi-step workflows. It provides a high-level abstraction over the Claude API, specifically designed for agentic applications where Claude needs to use tools, maintain conversation context, and work through problems iteratively.

The SDK handles the complexity of:
- **Tool orchestration:** Registering custom tools and managing tool execution
- **Conversation management:** Maintaining multi-turn conversation state
- **Permission systems:** Controlling what actions agents can perform
- **Model Context Protocol (MCP):** Integrating with MCP servers for extended capabilities
- **Token tracking:** Monitoring usage and costs
- **Streaming responses:** Real-time output for better user experience

## When to Use the Agent SDK

### Use Agent SDK When:

✅ **Building AI agents with custom tools** - You need Claude to interact with your APIs, filesystem, databases, or other external systems

✅ **Multi-turn conversations required** - Your application needs to maintain conversation context across multiple interactions

✅ **Complex workflows** - Your agent needs to plan, execute steps, and adapt based on results

✅ **MCP integration** - You want to leverage Model Context Protocol servers for standardized tool access

✅ **Rapid prototyping** - You want to build agentic applications quickly without handling low-level API details

### Use Direct Claude API When:

❌ **Simple single-shot requests** - You just need to send a prompt and get a response

❌ **Maximum control required** - You want fine-grained control over every API parameter

❌ **No tool use needed** - Your application doesn't require Claude to execute tools

❌ **Custom orchestration** - You're building your own agentic framework from scratch

## Core Concepts

### 1. Stateless Query Pattern

The simplest way to use the SDK - send a query, get a response:

```typescript
import { query } from '@anthropic-ai/agent-sdk';

const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY,
  prompt: 'What is the capital of France?',
});
```

Best for: Single-shot questions, stateless operations, simple tool use

### 2. Stateful Client Pattern

For multi-turn conversations with memory:

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response1 = await client.query({ prompt: 'My name is Alice' });
const response2 = await client.query({ prompt: 'What is my name?' });
// Claude remembers: "Your name is Alice"
```

Best for: Chatbots, interactive agents, conversations requiring context

### 3. Custom Tools

Extend Claude's capabilities by registering custom functions:

```typescript
import { tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

const weatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  input_schema: z.object({
    location: z.string(),
  }),
  handler: async ({ location }) => {
    // Your implementation
    return `Weather in ${location}: Sunny, 72°F`;
  },
});
```

See: [Custom Tools Guide](./typescript/custom-tools.md) | [Tools Concepts](./concepts/tools.md)

### 4. Permissions

Control what your agent can do:

```typescript
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  permissions: {
    read: ['*.txt', '*.md'],
    write: [],
    execute: false,
    network: ['api.weather.com'],
  },
});
```

See: [Permissions Guide](./concepts/permissions.md)

### 5. Model Context Protocol (MCP)

Integrate with MCP servers for standardized tool access:

```typescript
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  mcpServers: ['filesystem', 'database'],
});
```

MCP provides pre-built tools for common operations (filesystem access, database queries, API integrations) without writing custom tools.

See: [MCP Guide](./concepts/mcp.md)

### 6. Hooks

Intercept and modify agent behavior:

```typescript
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  hooks: {
    preToolUse: async (tool, input) => {
      console.log(`About to execute: ${tool.name}`);
      // Can validate, log, or reject tool use
      return true; // Allow execution
    },
    postToolUse: async (tool, input, result) => {
      console.log(`Tool ${tool.name} returned:`, result);
    },
  },
});
```

See: [Hooks Guide](./concepts/hooks.md)

## Architecture Overview

```
┌─────────────────┐
│  Your App       │
│  (TypeScript/   │
│   Python)       │
└────────┬────────┘
         │
         │ Agent SDK
         │
┌────────▼────────┐
│ SDK Client      │
│ - Query mgmt    │
│ - Tool exec     │
│ - State mgmt    │
└────────┬────────┘
         │
    ┌────┼────┐
    │    │    │
┌───▼──┐ │ ┌──▼──────┐
│Claude│ │ │ MCP     │
│ API  │ │ │ Servers │
└──────┘ │ └─────────┘
         │
    ┌────▼──────┐
    │ Your Tools│
    │ & APIs    │
    └───────────┘
```

## Language Support

### TypeScript (Complete) ✅

- **Status:** Fully supported, production-ready
- **Package:** `@anthropic-ai/agent-sdk`
- **Installation:** `npm install @anthropic-ai/agent-sdk zod`
- **Documentation:** [TypeScript Setup](./typescript/setup.md)

### Python (Available) ✅

- **Status:** Fully supported, production-ready
- **Package:** `anthropic-sdk`
- **Installation:** `pip install anthropic-sdk`
- **Documentation:** [Python Setup](./python/setup.md)

## Key Features

### Built-in Tools

The SDK includes several built-in tools:
- **Bash execution:** Run shell commands
- **File operations:** Read, write, edit files
- **Text editor:** Advanced text editing capabilities
- **Web fetch:** HTTP requests to external APIs
- **Memory:** Persistent key-value storage across sessions

See: [Tools Overview](./concepts/tools.md)

### Session Management

Maintain conversation state across multiple requests:
- In-memory sessions for temporary conversations
- Persistent sessions with external storage
- Session serialization for pause/resume

See: [Sessions Guide](./concepts/sessions.md)

### Cost Tracking

Monitor token usage and costs:
- Input/output token counts
- Real-time cost calculation
- Per-session and cumulative tracking

See: [Cost Tracking](./concepts/cost-tracking.md)

### Streaming

Get real-time responses as they're generated:
- Async iterable pattern
- Backpressure handling
- Early termination support

See: [Streaming Guide](./typescript/streaming.md)

## Quick Comparison: Query vs Client

| Feature | query() | ClaudeSDKClient |
|---------|---------|-----------------|
| **Statefulness** | Stateless | Stateful |
| **Conversation memory** | No | Yes |
| **Use case** | Single questions | Multi-turn chats |
| **Setup complexity** | Minimal | Moderate |
| **Resource usage** | Low | Higher (maintains state) |
| **When to use** | One-off queries | Chatbots, interactive agents |

## Getting Started

1. **Install the SDK**
   ```bash
   npm install @anthropic-ai/agent-sdk zod
   ```

2. **Set your API key**
   ```bash
   export ANTHROPIC_API_KEY=your-api-key-here
   ```
   Get your API key from: https://console.anthropic.com/

3. **Try your first query**
   See: [Quickstart Guide](./quickstart.md)

4. **Build with custom tools**
   See: [Custom Tools Guide](./typescript/custom-tools.md)

5. **Explore examples**
   See: [Simple CLI Agent](./examples/simple-cli-agent.md)

## Common Use Cases

### 1. CLI Tool Assistant
Build a command-line tool that answers questions and performs file operations.
Example: [Simple CLI Agent](./examples/simple-cli-agent.md)

### 2. Web API with Agent
Expose agent capabilities via REST API endpoints.
Example: [Web API Agent](./examples/web-api-agent.md)

### 3. Interactive Chatbot
Multi-turn conversation with context retention.
Example: [Stateful Chatbot](./examples/stateful-chatbot.md)

### 4. Multi-Tool Agent
Complex agent with diverse capabilities (file ops, API calls, calculations).
Example: [Multi-Tool Agent](./examples/multi-tool-agent.md)

### 5. MCP Integration
Agent with custom Model Context Protocol server.
Example: [MCP Server Agent](./examples/mcp-server-agent.md)

## Advanced Features

### Subagents

Create specialized sub-agents for complex tasks:
- Delegate specific subtasks to focused agents
- Hierarchical agent structures
- Parallel task execution

### System Prompt Modification

Customize agent behavior with custom system prompts:
- Project-level instructions via `.claude.md` files
- Runtime prompt injection
- Persona and expertise customization

### Todo Tracking

Built-in task management:
- Create and track tasks within conversations
- Persistent todo lists
- Integration with external task systems

### Slash Commands

Command-line style shortcuts for common operations:
- `/tools` - List available tools
- `/clear` - Clear conversation history
- `/cost` - Show token usage
- Custom slash commands

## Troubleshooting

Common issues and solutions:

**"API key not found"**
- Ensure `ANTHROPIC_API_KEY` environment variable is set
- See: [Troubleshooting Guide](./troubleshooting.md)

**"Permission denied"**
- Check permission configuration
- See: [Permissions Guide](./concepts/permissions.md)

**"Tool execution failed"**
- Validate tool input schema
- Check error handling in tool handler
- See: [Custom Tools Guide](./typescript/custom-tools.md)

For comprehensive troubleshooting, see: [Troubleshooting Guide](./troubleshooting.md)

## Next Steps

- **New to Agent SDK?** Start with [Quickstart Guide](./quickstart.md)
- **Using TypeScript?** See [TypeScript Setup](./typescript/setup.md)
- **Want examples?** Browse [Examples](./examples/simple-cli-agent.md)
- **Need help?** Check [Troubleshooting](./troubleshooting.md)

## Related Documentation

**Core Guides:**
- [Quickstart Guide](./quickstart.md) - Get started in 5 minutes
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

**TypeScript Implementation:**
- [Setup Guide](./typescript/setup.md) - TypeScript project setup
- [Query Pattern](./typescript/query-pattern.md) - Stateless usage
- [Client Pattern](./typescript/client-pattern.md) - Stateful usage
- [Custom Tools](./typescript/custom-tools.md) - Create custom tools

**Concepts:**
- [Tools Overview](./concepts/tools.md) - Built-in vs custom tools
- [Permissions](./concepts/permissions.md) - Security model
- [MCP](./concepts/mcp.md) - Model Context Protocol
- [Sessions](./concepts/sessions.md) - State management

**Examples:**
- [Simple CLI Agent](./examples/simple-cli-agent.md) - Beginner
- [Web API Agent](./examples/web-api-agent.md) - Intermediate
- [Stateful Chatbot](./examples/stateful-chatbot.md) - Intermediate
- [Multi-Tool Agent](./examples/multi-tool-agent.md) - Advanced
