---
title: "Model Context Protocol (MCP)"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "cross-language"
difficulty: "intermediate"
prerequisites:
  - "Read [Agent SDK Overview](../overview.md)"
  - "Completed setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)"
  - "Understanding of [Tools](./tools.md)"
next_steps:
  - "Build [MCP Server Agent Example](../examples/mcp-server-agent.md)"
  - "Configure MCP in [TypeScript Options](../typescript/options.md) or [Python Options](../python/options.md)"
  - "Explore [Permissions](./permissions.md) for MCP tools"
related_guides:
  - ../examples/mcp-server-agent.md
  - ./tools.md
tags:
  - mcp
  - protocol
  - integration
  - extensibility
---

# Model Context Protocol (MCP)

## Overview

Model Context Protocol (MCP) is an open standard for connecting AI agents to external data sources and tools through a unified interface. The Agent SDK includes built-in MCP client capabilities, allowing your agents to communicate with MCP servers that provide specialized functionality like database access, API integrations, or file system operations. MCP servers expose tools, resources, and prompts that agents can discover and use dynamically.

## When to Use

Choose MCP when you need:

**Dynamic Tool Discovery:** Tools that are discovered at runtime rather than hardcoded at build time.

**Shared Functionality:** Multiple agents across different projects need access to the same tools (e.g., a company-wide database MCP server).

**Third-Party Integrations:** Connecting to external services that provide their own MCP servers (e.g., SaaS platforms, cloud services).

**Separation of Concerns:** Tool logic maintained separately from agent logic, enabling independent updates and versioning.

**Complex Tool Ecosystems:** Agents that need access to dozens or hundreds of tools that would be impractical to implement as custom tools.

Choose custom tools instead when:
- You have a small number of simple, stable tools
- Tool logic is tightly coupled to your agent's specific needs
- You need maximum performance (MCP adds slight overhead)
- You want to avoid the complexity of running separate server processes

## Core Principles

### Client-Server Architecture

MCP uses a client-server model where:
- **MCP Server:** Exposes tools, resources, and prompts through standardized endpoints
- **MCP Client:** (Built into Agent SDK) Connects to servers and translates MCP tools into agent-usable formats
- **Transport Layer:** Communication happens over stdio, HTTP, or WebSocket connections

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│   Your Agent    │ ◄────► │  Agent SDK   │ ◄────► │ MCP Server  │
│                 │         │ (MCP Client) │         │             │
└─────────────────┘         └──────────────┘         └─────────────┘
                                                            │
                                                            ▼
                                                     ┌─────────────┐
                                                     │  External   │
                                                     │  Resources  │
                                                     │ (DB, API)   │
                                                     └─────────────┘
```

### Tool Discovery

When your agent connects to an MCP server, it automatically discovers available tools through the server's manifest. Tools are described with schemas (typically JSON Schema) that define input parameters and output formats. The SDK handles schema translation and validation.

### Standardized Protocol

MCP defines standard message formats for:
- **Tool listing:** Discovering what tools are available
- **Tool invocation:** Calling tools with parameters
- **Resource access:** Reading from server-managed resources
- **Prompt templates:** Retrieving server-provided prompt templates

### Transport Agnostic

MCP supports multiple transport mechanisms:
- **stdio:** Server runs as subprocess, communicates via standard input/output
- **HTTP/SSE:** Server exposed as HTTP endpoint with Server-Sent Events for streaming
- **WebSocket:** Bidirectional real-time communication

## Common Patterns

### Built-In MCP Servers

The Agent SDK includes several built-in MCP servers you can enable:

**Filesystem MCP Server:**
- Provides structured file operations
- Safer than direct bash commands
- Includes directory traversal, file search, metadata access

**Database MCP Server:**
- SQL query execution
- Schema introspection
- Connection pooling
- Query result formatting

**Web API MCP Server:**
- HTTP request templating
- Response parsing
- Authentication handling
- Rate limiting

Enable built-in servers through SDK configuration rather than implementing them yourself.

### Custom MCP Server Integration

Connect your agent to custom or third-party MCP servers:

**Development pattern:**
1. Server runs as separate process
2. Agent SDK connects via configured transport
3. Tools automatically become available to agent
4. Agent uses tools transparently (no special syntax)

**Configuration requirements:**
- Server command or endpoint URL
- Transport type (stdio, HTTP, WebSocket)
- Authentication credentials (if required)
- Environment variables for server

### Multiple MCP Server Composition

Agents can connect to multiple MCP servers simultaneously:

**Pattern:**
```
Agent SDK ─┬─► MCP Server 1 (Database)
           ├─► MCP Server 2 (File System)
           ├─► MCP Server 3 (Custom API)
           └─► MCP Server 4 (External SaaS)
```

**Considerations:**
- Tool names must be unique across all servers
- Name conflicts handled by SDK (usually with server prefix)
- Connection management and health checking
- Performance impact of multiple connections

### MCP Server Development

When building your own MCP server:

**Server responsibilities:**
- Implement MCP protocol specification
- Expose tool manifest with schemas
- Handle tool invocation requests
- Manage resource access
- Provide error responses

**Implementation approaches:**
- Use official MCP server SDKs (TypeScript, Python)
- Implement protocol directly for other languages
- Wrap existing tools/APIs in MCP interface
- Deploy as standalone service or embed in application

## Best Practices

### Use Built-In Servers First

Before building custom MCP servers, check if built-in servers meet your needs. They're well-tested, maintained, and optimized for common use cases.

### Design for Reusability

When creating custom MCP servers, design them to be useful across multiple agents and projects. Generic, well-scoped servers have more value than agent-specific ones.

### Implement Proper Error Handling

MCP servers should return structured errors that agents can interpret and handle gracefully. Include error codes, messages, and recovery suggestions.

### Version Your Server APIs

Use semantic versioning for MCP servers and include version information in tool manifests. This allows agents to handle version compatibility.

### Document Tool Schemas Thoroughly

Tool descriptions and parameter schemas are critical for agent understanding. Write clear, detailed descriptions that explain what tools do, what inputs they expect, and what outputs they return.

### Test Server Reliability

MCP servers are external dependencies. Implement health checks, timeouts, retries, and fallback behavior in your agents. Test how agents handle server unavailability.

### Secure Server Communication

For production deployments:
- Use encrypted transports (HTTPS, WSS)
- Implement authentication (API keys, OAuth)
- Validate all inputs server-side
- Rate limit tool invocations
- Log all access for audit trails

### Monitor Server Performance

Track MCP server latency and throughput. Slow servers directly impact agent response time. Set performance budgets and alert on degradation.

## Security Considerations

### Trust Boundaries

MCP servers operate outside your agent's security context. Treat them as untrusted external services:
- Validate all data received from servers
- Don't assume server responses are safe
- Implement timeouts to prevent hanging
- Handle malicious or malformed responses

### Permission Integration

Even when using MCP servers, agent SDK permissions still apply. Network permissions are required to connect to servers, and tool-specific permissions may be checked by the SDK.

### Data Privacy

Be cautious about sending sensitive data to MCP servers, especially third-party servers. Consider:
- What data is transmitted to servers
- Where servers are hosted
- Data retention policies
- Compliance requirements (GDPR, HIPAA, etc.)

### Server Authentication

Always authenticate connections to MCP servers in production. Use strong credentials, rotate them regularly, and store them securely (environment variables, secret managers).

### Sandboxing

Consider running MCP servers in isolated environments (containers, VMs) to limit potential damage from compromised servers.

## Performance Considerations

### Connection Overhead

MCP adds latency compared to inline custom tools:
- Initial connection establishment
- Tool discovery and schema transfer
- Network round-trips for each invocation
- Serialization/deserialization overhead

For performance-critical applications with simple tools, custom tools may be better.

### Connection Pooling

When connecting to HTTP/WebSocket MCP servers, the SDK typically maintains persistent connections. Monitor connection pool health and implement reconnection logic.

### Tool Invocation Batching

Some MCP servers support batching multiple tool calls in a single request. Check server capabilities and use batching when available to reduce round-trips.

### Caching Tool Manifests

Tool discovery can be expensive. The SDK may cache tool manifests to avoid repeated queries. Understand cache invalidation behavior for servers with dynamic tool sets.

## Related Documentation

**Implementation:**
- [TypeScript MCP Configuration](../typescript/options.md) - Configuring MCP servers in TypeScript
- [Python MCP Configuration](../python/options.md) - MCP setup for Python SDK

**Concepts:**
- [Tools Overview](./tools.md) - Understanding tools, including MCP-provided tools
- [Permissions](./permissions.md) - Permission requirements for MCP connections

**Examples:**
- [MCP Server Agent](../examples/mcp-server-agent.md) - Complete working example with custom MCP server
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Using multiple tool sources including MCP

**External Resources:**
- [MCP Specification](https://modelcontextprotocol.io/docs) - Official protocol documentation
- [MCP Server SDKs](https://github.com/modelcontextprotocol) - Official server implementation libraries
