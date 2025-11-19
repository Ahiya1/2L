---
title: "Event Hooks"
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
  - "Implement hooks in [TypeScript Options](../typescript/options.md) or [Python Options](../python/options.md)"
  - "Monitor tool execution with hooks"
  - "See [Cost Tracking](./cost-tracking.md) for usage metrics"
related_guides:
  - ../typescript/options.md
  - ./tools.md
tags:
  - hooks
  - events
  - lifecycle
  - middleware
---

# Event Hooks

## Overview

Event hooks provide interception points in the agent execution lifecycle, allowing you to inject custom logic before and after tool use. Hooks enable cross-cutting concerns like logging, authentication, rate limiting, input validation, and response transformation without modifying tool implementations. The Agent SDK supports two primary hook types: pre-tool-use hooks (executed before tool invocation) and post-tool-use hooks (executed after tool completion).

## When to Use

Implement hooks when you need to:

**Audit and Logging:** Record all tool invocations for compliance, debugging, or analytics.

**Authentication and Authorization:** Verify credentials or check permissions before allowing tool use.

**Rate Limiting:** Enforce usage quotas or throttle tool invocations to protect resources.

**Input Validation:** Apply additional validation beyond tool schema requirements.

**Response Transformation:** Modify tool outputs before they're returned to the agent (filtering, formatting, sanitization).

**Cost Tracking:** Monitor resource usage, API calls, or computational costs across tool invocations.

**Circuit Breaking:** Prevent tool execution when external dependencies are unhealthy.

**Testing and Debugging:** Inject test data, mock responses, or capture execution state.

Avoid hooks for tool-specific logic that should be part of the tool implementation itself. Hooks are for cross-cutting concerns that apply to multiple tools.

## Core Principles

### Non-Invasive Interception

Hooks operate outside tool implementations, allowing you to add functionality without modifying existing tools. Tools remain unaware of hook execution.

### Composable Middleware

Multiple hooks can be registered and will execute in sequence. This enables layered functionality (e.g., logging → authentication → rate limiting) where each hook has a single responsibility.

### Explicit Control Flow

Hooks can:
- Allow execution to proceed normally
- Modify inputs before tool execution
- Modify outputs after tool execution
- Prevent tool execution entirely (pre-tool hooks)
- Signal errors that halt agent execution

### Synchronous and Asynchronous

Hooks support both synchronous and asynchronous operations, allowing integration with external services (database queries, API calls) within hook logic.

## Common Patterns

### Pre-Tool-Use Hooks

Execute before a tool is invoked, receiving tool name and input parameters.

**Validation Pattern:**
```
Hook receives:
- Tool name
- Input parameters
- Execution context

Hook can:
- Validate inputs (return error if invalid)
- Modify inputs (transform before passing to tool)
- Skip execution (return cached result)
- Allow execution (pass through)
```

**Use cases:**
- Schema validation beyond basic type checking
- Business logic validation (e.g., date ranges, authorization)
- Input sanitization (removing sensitive data)
- Caching checks (return cached results without tool execution)
- Feature flags (disable tools conditionally)

**Example scenarios:**
- Prevent file deletion tools from accessing protected directories
- Require authentication token in database query tools
- Enforce rate limits on API calling tools
- Validate email addresses before sending emails

### Post-Tool-Use Hooks

Execute after a tool completes, receiving tool result and execution context.

**Transformation Pattern:**
```
Hook receives:
- Tool name
- Input parameters (original)
- Tool output/result
- Execution context

Hook can:
- Transform output (format, filter, enrich)
- Log results
- Trigger side effects
- Return modified output
```

**Use cases:**
- Response filtering (removing sensitive data)
- Format standardization (ensuring consistent output structure)
- Result enrichment (adding metadata or context)
- Success/failure logging
- Metrics collection
- Triggering downstream actions (notifications, webhooks)

**Example scenarios:**
- Redact sensitive information from database query results
- Add timestamps and metadata to all tool outputs
- Convert tool outputs to standardized format
- Send alerts when tools fail
- Update usage metrics after expensive operations

### Combined Hook Patterns

Many applications use both pre and post hooks together.

**Request-Response Pattern:**
```
Pre-hook:  Validate input → Log request → Check cache
Tool execution happens
Post-hook: Log response → Transform output → Update cache
```

**Audit Trail Pattern:**
```
Pre-hook:  Record invocation start with timestamp and user context
Tool execution happens
Post-hook: Record completion, duration, result status
```

**Error Handling Pattern:**
```
Pre-hook:  Validate inputs, fail fast if invalid
Tool execution happens (may fail)
Post-hook: Catch errors, log details, return user-friendly error
```

### Hook Chaining

When multiple hooks are registered, they execute in sequence:

**Pre-hook chain:**
```
Request → Hook1 → Hook2 → Hook3 → Tool
```

**Post-hook chain:**
```
Tool → Hook1 → Hook2 → Hook3 → Response
```

Each hook can:
- Modify data for the next hook
- Short-circuit the chain (pre-hooks only)
- Pass through unchanged

## Best Practices

### Keep Hooks Fast

Hooks execute on the critical path of tool invocation. Slow hooks directly impact agent response time. Optimize for performance:
- Avoid synchronous I/O when possible
- Cache frequently accessed data
- Use connection pooling for database/API calls
- Set timeouts on external service calls
- Consider async execution for non-critical operations

### Single Responsibility

Each hook should have one clear purpose. Separate concerns into multiple hooks rather than creating monolithic hooks that do everything.

### Fail Gracefully

Hooks should handle errors without crashing the agent. Decide whether hook failures should:
- Block tool execution (for critical hooks like authentication)
- Log error and continue (for non-critical hooks like metrics)
- Return default values (for transformation hooks)

### Avoid State Mutation

Prefer returning new objects rather than mutating input parameters. This prevents unexpected side effects and makes hooks easier to test and debug.

### Log Hook Execution

Log when hooks execute, especially when they modify data or prevent execution. This aids debugging and provides audit trails.

### Use Context for Shared Data

If multiple hooks need to share data, use the execution context object rather than global variables or closures. Context provides thread-safe, request-scoped storage.

### Test Hooks Independently

Write unit tests for hook logic separate from agent tests. Mock tool execution and verify hook behavior in isolation.

### Document Hook Requirements

Clearly document what hooks require (environment variables, external services) and what they modify. This helps other developers understand hook behavior.

## Security Considerations

### Validate in Pre-Hooks, Sanitize in Post-Hooks

Use pre-hooks to validate inputs and reject malicious or malformed data. Use post-hooks to sanitize outputs and prevent data leakage.

### Authentication and Authorization

Hooks are ideal for centralized auth checks:
- Verify API keys or tokens
- Check user permissions for specific tools
- Enforce role-based access control
- Audit authorization decisions

### Prevent Hook Bypass

Ensure hooks cannot be bypassed. The SDK should guarantee hook execution, but verify this in your security testing.

### Limit Hook Privileges

Hooks run with the same permissions as the agent. Grant minimal permissions needed for hook logic. Don't give hooks access to resources they don't need.

### Secure External Dependencies

If hooks call external services (auth servers, databases), secure those connections:
- Use TLS/HTTPS
- Authenticate to external services
- Validate responses from external services
- Handle service unavailability gracefully

### Audit Sensitive Operations

Use hooks to create audit logs for sensitive operations:
- Log who invoked which tools with what parameters
- Record authorization decisions
- Track data access
- Generate compliance reports

## Performance Considerations

### Hook Overhead

Every hook adds latency to tool execution:
- Simple hooks (logging): ~1-5ms
- Validation hooks: ~5-20ms
- Hooks with I/O (database, API): ~50-500ms

Profile your hooks and optimize performance-critical paths.

### Async vs Sync Hooks

Asynchronous hooks allow concurrent execution but add complexity. Use async when:
- Hook needs to call external services
- Multiple hooks can execute in parallel
- Hook logic is I/O bound

Use synchronous hooks when:
- Hook logic is CPU-bound and fast
- Order of execution matters
- Simplicity is more important than performance

### Caching in Hooks

Implement caching in frequently-executed hooks:
- Cache authorization checks (with short TTL)
- Cache validation rules
- Cache transformed data
- Invalidate caches appropriately

### Conditional Hook Execution

Skip hook logic when not needed:
- Check feature flags before expensive operations
- Skip validation for trusted input sources
- Bypass caching for fresh data requirements

## Related Documentation

**Implementation:**
- [TypeScript Hook Configuration](../typescript/options.md) - How to register and configure hooks
- [Python Hook Configuration](../python/options.md) - Hook setup for Python SDK

**Concepts:**
- [Tools Overview](./tools.md) - Understanding tools that hooks intercept
- [Permissions](./permissions.md) - Permission checks complementary to hooks
- [Cost Tracking](./cost-tracking.md) - Using hooks for usage monitoring

**Examples:**
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Example with authentication hooks
- [Stateful Chatbot](../examples/stateful-chatbot.md) - Logging hooks example
