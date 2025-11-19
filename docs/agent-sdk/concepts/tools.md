---
title: "Tools Overview"
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
  - "Create tools with [TypeScript](../typescript/custom-tools.md) or [Python](../python/custom-tools.md)"
  - "Configure [Permissions](./permissions.md) for tool access"
  - "See [Multi-Tool Agent Example](../examples/multi-tool-agent.md)"
related_guides:
  - ../typescript/custom-tools.md
  - ./permissions.md
  - ./mcp.md
tags:
  - tools
  - capabilities
  - custom-tools
  - built-in-tools
---

# Tools Overview

## Overview

Tools are the primary mechanism through which agents interact with the world beyond conversation. A tool is a function that the agent can call with structured parameters to perform specific actions like reading files, making API requests, executing commands, or accessing databases. The Agent SDK provides built-in tools for common operations and allows you to create custom tools for domain-specific functionality. Tools are described to the agent through schemas that define their purpose, parameters, and expected outputs.

## When to Use

Use built-in tools when:
- Performing standard operations (file I/O, web requests, command execution)
- You want tested, optimized implementations
- You need consistent behavior across agents
- Documentation and examples are important

Create custom tools when:
- Integrating domain-specific business logic
- Accessing proprietary APIs or databases
- Combining multiple operations into specialized workflows
- You need precise control over behavior and error handling
- Built-in tools don't meet your requirements

Use MCP servers when:
- Tools need to be shared across multiple agents or projects
- Tool logic changes frequently and should be decoupled from agent code
- Third-party services provide MCP implementations
- You need dynamic tool discovery at runtime

## Core Principles

### Structured Input and Output

Tools define schemas (typically using JSON Schema or similar) that specify:
- **Parameters:** What inputs the tool accepts (types, constraints, descriptions)
- **Returns:** What the tool produces (success data, error formats)
- **Side effects:** What the tool changes (file system, database, external systems)

Schemas enable the agent to understand how to use tools correctly and help the SDK validate tool invocations before execution.

### Descriptive Naming and Documentation

Tool names and descriptions are critical for agent understanding. Well-named tools with clear descriptions help the agent:
- Discover appropriate tools for tasks
- Understand when to use each tool
- Construct valid tool invocations
- Interpret tool results

Poor naming or vague descriptions lead to incorrect tool usage and agent confusion.

### Composability

Tools should be focused and composable. Rather than creating monolithic tools that do everything, create smaller tools that can be combined:
- Each tool has a single, clear purpose
- Tools can be chained together by the agent
- Complex workflows emerge from simple tool combinations
- Tools are reusable across different agent tasks

### Idempotency and Safety

Consider tool safety and idempotency:
- **Read-only tools** (safe): Can be called multiple times without side effects
- **Idempotent tools** (safe): Multiple calls with same parameters produce same result
- **Mutating tools** (potentially unsafe): Change system state, require careful handling

Design tools to be as safe as possible. For mutating operations, implement validation and provide dry-run options.

## Common Patterns

### Built-In Tools

The Agent SDK includes several categories of built-in tools:

**File System Tools:**
- `read_file`: Read contents of a file
- `write_file`: Write data to a file
- `list_directory`: List files and directories
- `file_info`: Get file metadata (size, permissions, timestamps)
- `create_directory`: Create new directories
- `delete_file`: Remove files (with confirmation)

**Command Execution Tools:**
- `bash`: Execute shell commands
- `script`: Run scripts in specific languages (Python, Node.js, etc.)

**Web Tools:**
- `web_fetch`: Make HTTP requests (GET, POST, etc.)
- `web_search`: Search the web (if configured with search API)

**Memory Tools:**
- `read_memory`: Access agent's persistent memory
- `write_memory`: Store information for later retrieval
- `search_memory`: Query stored information

**Editor Tools:**
- `edit_file`: Make targeted edits to files without rewriting
- `search_file`: Search file contents with regex
- `replace_in_file`: Find and replace in files

**Permission Requirements:**
Built-in tools respect agent permissions. File system tools require `filesystem` permissions, web tools require `network` permissions, and command execution requires `execute` permissions.

### Custom Tool Creation

When built-in tools don't suffice, create custom tools:

**Custom Tool Structure:**
```
Tool Definition:
  - Name: snake_case identifier (e.g., "fetch_weather")
  - Description: Clear explanation of what tool does
  - Input Schema: Parameter definitions with types and descriptions
  - Handler Function: Implementation that executes tool logic
  - Output: Structured result or error message
```

**Common Custom Tool Types:**

**API Integration Tools:**
- Call external REST APIs
- Handle authentication (API keys, OAuth)
- Parse and format responses
- Implement retry logic and error handling

**Database Tools:**
- Execute SQL queries
- Insert/update records
- Perform database-specific operations
- Handle connection pooling

**Business Logic Tools:**
- Domain-specific calculations
- Data validation against business rules
- Multi-step workflows
- Integration with internal systems

**Data Transformation Tools:**
- Format conversion (JSON, CSV, XML)
- Data aggregation and analysis
- Text processing and extraction
- Image or file manipulation

### Tool Naming Conventions

Follow these conventions for better agent understanding:

**Action Verbs:**
- Use clear action verbs: `get_`, `create_`, `update_`, `delete_`, `search_`, `list_`
- Avoid ambiguous verbs: `process_`, `handle_`, `manage_`

**Specific Over Generic:**
- Good: `fetch_user_profile`, `calculate_shipping_cost`
- Bad: `get_data`, `do_calculation`

**Consistent Patterns:**
- Group related tools with prefixes: `user_create`, `user_update`, `user_delete`
- Maintain naming consistency across your toolset

**Avoid Technical Jargon:**
- Unless your agent's domain requires it, use plain language
- Good: `send_email`, Bad: `invoke_smtp_relay`

### Tool Description Best Practices

Write descriptions that help the agent make correct decisions:

**Include:**
- What the tool does (purpose)
- When to use it (use cases)
- What it returns (output format)
- Important constraints or limitations
- Examples of parameters (if complex)

**Example Description:**
```
"Fetch current weather data for a specified location. Use this when the user
asks about weather, temperature, or conditions. Returns temperature, conditions,
humidity, and wind speed. Location must be a city name or zip code. Data is
updated every 30 minutes."
```

### Tool Parameter Design

Design parameters that are clear and well-constrained:

**Required vs Optional:**
- Mark required parameters explicitly
- Provide sensible defaults for optional parameters
- Document what defaults mean

**Parameter Types:**
- Use specific types (don't default to strings for everything)
- Enums for known value sets
- Patterns/regex for constrained strings
- Min/max for numbers

**Parameter Descriptions:**
- Explain what the parameter is used for
- Provide examples of valid values
- Note any constraints or special formatting

## Best Practices

### Start with Built-In Tools

Before creating custom tools, thoroughly explore built-in tools. They're often sufficient for common operations and save development time.

### Test Tools Independently

Write tests for tool implementations separate from agent tests. Verify:
- Tools work with valid inputs
- Tools reject invalid inputs with clear errors
- Error handling is robust
- Performance is acceptable

### Handle Errors Gracefully

Tools should return useful error messages rather than throwing exceptions when possible. Help the agent understand what went wrong and how to fix it:
- "File not found: /path/to/file.txt"
- "Invalid email format: user@invalid"
- "API rate limit exceeded, retry in 60 seconds"

### Validate Inputs

Even with schema validation, implement additional validation in tool handlers:
- Business logic validation
- Cross-parameter validation
- External resource existence checks
- Permission and authorization checks

### Document Side Effects

Clearly document what tools change:
- "This tool modifies files on disk"
- "This tool sends an email to the specified address"
- "This tool charges the user's credit card"

### Provide Feedback

Tools should return informative results that help the agent understand what happened:
- Success confirmations: "File written successfully: /path/to/file.txt (1,234 bytes)"
- Partial success: "Sent 8 of 10 emails, 2 failed: ..."
- Structured data for further processing

### Version Tool APIs

If tools might change over time, include versioning:
- Version numbers in tool names: `api_v2_fetch_user`
- Version parameters: `{ version: "2.0" }`
- Deprecation notices in descriptions

### Limit Tool Scope

Keep tools focused:
- One tool per logical operation
- Don't create "swiss army knife" tools
- Let the agent compose multiple tools for complex tasks

## Security Considerations

### Input Sanitization

Always sanitize tool inputs:
- Validate file paths (prevent directory traversal)
- Sanitize SQL queries (prevent injection)
- Validate URLs (prevent SSRF attacks)
- Escape shell commands (prevent command injection)

### Output Filtering

Filter tool outputs to prevent information leakage:
- Remove sensitive data (passwords, tokens, PII)
- Limit output size (prevent memory exhaustion)
- Sanitize error messages (don't expose system details)

### Permission Integration

Tools should respect agent permissions:
- Check permissions before execution
- Fail with clear messages when permissions denied
- Don't attempt to bypass permission systems

### Audit Logging

Log tool invocations for security monitoring:
- Who invoked the tool
- What parameters were used
- When it was invoked
- What the result was
- Any errors or failures

### Rate Limiting

Implement rate limiting for expensive or dangerous tools:
- Limit calls per time period
- Throttle concurrent executions
- Prevent resource exhaustion
- Protect external services

## Performance Considerations

### Tool Execution Time

Tool execution directly impacts agent response time:
- Fast tools (<100ms): Can be called frequently
- Medium tools (100ms-1s): Reasonable for most use cases
- Slow tools (>1s): May frustrate users, consider async patterns

Profile and optimize tool performance, especially for tools called frequently.

### Caching

Implement caching for expensive operations:
- Cache external API responses (with appropriate TTLs)
- Cache computed results
- Cache file reads for unchanging data
- Invalidate caches when data changes

### Async Execution

For long-running tools, consider async patterns:
- Return immediately with a task ID
- Provide a separate tool to check task status
- Use webhooks or callbacks for completion notification

### Resource Limits

Set limits to prevent resource exhaustion:
- Timeout for tool execution
- Maximum output size
- Memory limits
- Concurrency limits

## Related Documentation

**Implementation:**
- [TypeScript Custom Tools](../typescript/custom-tools.md) - Creating custom tools in TypeScript
- [Python Custom Tools](../python/custom-tools.md) - Custom tool development for Python

**Concepts:**
- [Permissions](./permissions.md) - Permission requirements for tools
- [MCP](./mcp.md) - Using MCP servers as tool sources
- [Hooks](./hooks.md) - Intercepting tool execution with hooks

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic tool usage
- [Multi-Tool Agent](../examples/multi-tool-agent.md) - Complex tool scenarios
- [MCP Server Agent](../examples/mcp-server-agent.md) - Tools from MCP servers
