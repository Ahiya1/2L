---
title: "Permission Management"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "cross-language"
difficulty: "beginner"
prerequisites:
  - "Read [Agent SDK Overview](../overview.md)"
  - "Completed setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)"
next_steps:
  - "Apply in [TypeScript Options](../typescript/options.md) or [Python Options](../python/options.md)"
  - "See [MCP Server Example](../examples/mcp-server-agent.md) for permission patterns"
  - "Learn about [Hooks](./hooks.md) for permission validation"
related_guides:
  - ../typescript/options.md
  - ./tools.md
tags:
  - permissions
  - security
  - access-control
---

# Permission Management

## Overview

The Agent SDK implements a granular permission system that controls what actions your agent can perform during execution. Permissions act as security boundaries, restricting access to sensitive operations like file system access, network requests, and command execution. By default, the SDK operates with minimal permissions, requiring explicit grants for potentially dangerous operations.

## When to Use

Configure permissions when your agent needs to:
- Read from or write to the file system
- Execute shell commands or scripts
- Make network requests to external APIs
- Access environment variables
- Perform any operation that could affect system state

The permission system is especially critical in production environments where agents interact with user data, production systems, or untrusted input.

## Core Principles

### Principle of Least Privilege

Always grant the minimum permissions necessary for your agent to function. Start with no permissions and add only what's required. This minimizes security risks and limits potential damage from bugs or malicious prompts.

### Explicit Over Implicit

The SDK requires explicit permission grants. There are no hidden defaults or automatic escalations. If a permission isn't granted, the operation will fail with a clear error message.

### Runtime Enforcement

Permissions are enforced at runtime before each tool use. The SDK checks permissions immediately before executing any restricted operation, ensuring that even dynamically generated tool uses respect permission boundaries.

## Common Patterns

### Read-Only File Access

When your agent needs to analyze files but should never modify them:

**Permission configuration:**
- `read`: Granted
- `write`: Denied
- `execute`: Denied

**Use cases:**
- Code analysis tools
- Log file analyzers
- Documentation search agents
- Content summarization systems

### Safe Execution Environment

For agents that need to run user code in isolation:

**Permission configuration:**
- `execute`: Granted with restricted scope
- `filesystem`: Granted only for specific directories
- `network`: Denied or limited to allowlisted domains

**Use cases:**
- Code testing agents
- CI/CD automation
- Development environment assistants

### Network-Only Agents

For agents that interact with external APIs without file system access:

**Permission configuration:**
- `network`: Granted
- `filesystem`: Denied
- `execute`: Denied

**Use cases:**
- API integration agents
- Data aggregation services
- External service orchestration

### Unrestricted Development Mode

For local development and testing only:

**Permission configuration:**
- All permissions granted
- Not recommended for production

**Use cases:**
- Rapid prototyping
- Local testing
- Development workflows

## Best Practices

### Start Restrictive, Expand As Needed

Begin with minimal permissions and add more only when operations fail due to permission denials. This approach is safer than starting permissive and trying to restrict later.

### Document Permission Requirements

Clearly document what permissions your agent requires and why. This helps users understand security implications and makes code review easier.

### Use Scoped Permissions

When possible, restrict permissions to specific directories, domains, or command patterns rather than granting blanket access. Check your SDK's configuration options for scoping capabilities.

### Separate Development and Production Configurations

Use different permission profiles for development (more permissive) and production (strictly limited). Never deploy with development-level permissions.

### Validate User Input

Even with restricted permissions, always validate and sanitize user input before using it in file paths, command arguments, or network requests. Permissions are not a substitute for input validation.

### Log Permission Denials

Implement logging for permission denials to help debug issues and identify when users need to adjust configurations. Clear error messages improve user experience.

### Test Permission Boundaries

Include tests that verify your agent fails gracefully when operations are denied due to insufficient permissions. Ensure error handling is robust.

## Security Considerations

### Defense in Depth

Permissions are one layer of security. Combine them with:
- Input validation and sanitization
- Output filtering
- Rate limiting
- Audit logging
- Secure API key management

### Avoid Permission Escalation

Never design agents that attempt to request additional permissions at runtime or bypass permission checks. Permission configuration should be static and explicit.

### Monitor Permission Usage

Track which permissions your agent actually uses in production. Remove unused permissions to reduce attack surface.

### Be Cautious with Execute Permissions

The `execute` permission is particularly dangerous as it allows arbitrary command execution. Grant this only when absolutely necessary and consider sandboxing or containerization.

### Network Permission Risks

Network permissions enable data exfiltration. Be especially careful when combining network access with file system read permissions.

### Audit Permission Changes

Treat permission configuration changes as security-critical. Require code review and testing before deploying permission changes to production.

## Performance Considerations

Permission checks add minimal overhead to tool execution. The performance impact is negligible compared to the actual tool operations (file I/O, network requests, command execution).

However, overly granular scoping (checking every file path against complex allow/deny lists) can slow down agents that perform many small operations. Balance security with performance based on your use case.

## Related Documentation

**Implementation:**
- [TypeScript Configuration Options](../typescript/options.md) - How to configure permissions in code
- [Python Configuration Options](../python/options.md) - Permission setup for Python SDK

**Concepts:**
- [Tools Overview](./tools.md) - Understanding which tools require which permissions
- [Hooks](./hooks.md) - Using pre-tool hooks for additional permission checks

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic permission configuration
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Complex permission scenarios
