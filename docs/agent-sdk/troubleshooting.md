---
title: "Agent SDK Troubleshooting"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "cross-language"
difficulty: "beginner"
prerequisites:
  - "Attempted SDK implementation"
  - "Access to error logs"
next_steps:
  - "Review [Setup Guides](./typescript/setup.md) if installation issues persist"
  - "Check [Permissions Guide](./concepts/permissions.md) for permission errors"
  - "Join community support channels for additional help"
related_guides:
  - overview.md
  - quickstart.md
  - typescript/setup.md
tags:
  - troubleshooting
  - errors
  - debugging
  - common-issues
  - solutions
---

# Agent SDK Troubleshooting

This guide covers common errors, their causes, and solutions when working with the Agent SDK.

## Quick Index

- [Authentication Errors](#authentication-errors)
- [Installation Issues](#installation-issues)
- [Permission Errors](#permission-errors)
- [Tool Execution Errors](#tool-execution-errors)
- [TypeScript Configuration Issues](#typescript-configuration-issues)
- [Runtime Errors](#runtime-errors)
- [Network and API Errors](#network-and-api-errors)
- [MCP Server Issues](#mcp-server-issues)
- [Performance Problems](#performance-problems)
- [Known Documentation Gaps](#known-documentation-gaps)

---

## Authentication Errors

### Error: "API key not found" or "ANTHROPIC_API_KEY not set"

**Symptoms:**
```
Error: API key not found. Please set the ANTHROPIC_API_KEY environment variable.
```

**Causes:**
- Environment variable not set
- Typo in variable name
- Environment not exported in shell

**Solutions:**

1. **Set the environment variable:**
   ```bash
   export ANTHROPIC_API_KEY=your-api-key-here
   ```

2. **Verify it's set:**
   ```bash
   echo $ANTHROPIC_API_KEY
   ```

3. **For persistent setup, add to your shell profile:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export ANTHROPIC_API_KEY=your-api-key-here
   ```

4. **In code, validate before use:**
   ```typescript
   const apiKey = process.env.ANTHROPIC_API_KEY;
   if (!apiKey) {
     throw new Error('ANTHROPIC_API_KEY environment variable required');
   }
   ```

### Error: "Invalid API key" or "Authentication failed"

**Symptoms:**
```
Error: Authentication failed. Please check your API key.
Status: 401 Unauthorized
```

**Causes:**
- Incorrect API key
- API key revoked or expired
- API key from wrong environment (test vs production)

**Solutions:**

1. **Regenerate your API key:**
   - Visit [console.anthropic.com](https://console.anthropic.com/)
   - Go to API Keys section
   - Create a new key
   - Update your environment variable

2. **Check for whitespace:**
   ```bash
   # Remove any accidental spaces
   export ANTHROPIC_API_KEY=$(echo $ANTHROPIC_API_KEY | tr -d ' \n')
   ```

3. **Verify key format:**
   - Should start with `sk-ant-api03-`
   - Followed by alphanumeric characters

---

## Installation Issues

### Error: "Cannot find module '@anthropic-ai/agent-sdk'"

**Symptoms:**
```
Error: Cannot find module '@anthropic-ai/agent-sdk'
```

**Causes:**
- Package not installed
- Wrong directory
- node_modules corrupted

**Solutions:**

1. **Install the package:**
   ```bash
   npm install @anthropic-ai/agent-sdk zod
   ```

2. **Verify installation:**
   ```bash
   npm list @anthropic-ai/agent-sdk
   ```

3. **If corrupted, reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Error: "Peer dependency warnings" or "Incompatible versions"

**Symptoms:**
```
npm WARN @anthropic-ai/agent-sdk@1.2.0 requires a peer of zod@^3.22.0
```

**Causes:**
- Missing peer dependencies
- Version mismatches

**Solutions:**

1. **Install all required dependencies:**
   ```bash
   npm install @anthropic-ai/agent-sdk zod
   npm install -D typescript @types/node
   ```

2. **Check versions:**
   ```bash
   npm list zod typescript
   ```

3. **Update to compatible versions:**
   ```bash
   npm update @anthropic-ai/agent-sdk zod
   ```

### Error: "Node version too old"

**Symptoms:**
```
Error: The engine "node" is incompatible with this module.
Expected version ">=18.0.0". Got "16.14.0"
```

**Causes:**
- Node.js version too old (SDK requires 18+)

**Solutions:**

1. **Check your Node version:**
   ```bash
   node --version
   ```

2. **Upgrade Node.js:**
   - Use nvm: `nvm install 18 && nvm use 18`
   - Or download from [nodejs.org](https://nodejs.org/)

3. **Verify upgrade:**
   ```bash
   node --version
   # Should show v18.x.x or higher
   ```

---

## Permission Errors

### Error: "Permission denied: Cannot read file"

**Symptoms:**
```
Error: Permission denied: Cannot read /path/to/file.txt
```

**Causes:**
- File permissions too restrictive
- SDK permission configuration blocks access
- Path doesn't exist

**Solutions:**

1. **Check file exists and is readable:**
   ```bash
   ls -la /path/to/file.txt
   ```

2. **Configure SDK permissions:**
   ```typescript
   const client = new ClaudeSDKClient({
     apiKey: process.env.ANTHROPIC_API_KEY,
     permissions: {
       read: ['*.txt', '*.md', '/specific/path/*'],
       write: [],
       execute: false,
     },
   });
   ```

3. **Use absolute paths:**
   ```typescript
   import path from 'path';
   const absolutePath = path.resolve('./file.txt');
   ```

See: [Permissions Guide](./concepts/permissions.md)

### Error: "Permission denied: Cannot execute command"

**Symptoms:**
```
Error: Permission denied: Cannot execute bash command
```

**Causes:**
- Execute permissions not granted
- Command not in allowed list

**Solutions:**

1. **Enable execute permissions:**
   ```typescript
   const client = new ClaudeSDKClient({
     apiKey: process.env.ANTHROPIC_API_KEY,
     permissions: {
       execute: true,
       allowedCommands: ['ls', 'cat', 'grep'],
     },
   });
   ```

2. **Security warning:** Only enable execute with trusted commands

### Error: "Network access denied"

**Symptoms:**
```
Error: Network access denied for domain: api.example.com
```

**Causes:**
- Network permissions not configured
- Domain not in allowlist

**Solutions:**

1. **Configure network permissions:**
   ```typescript
   const client = new ClaudeSDKClient({
     apiKey: process.env.ANTHROPIC_API_KEY,
     permissions: {
       network: ['api.example.com', 'api.weather.com'],
     },
   });
   ```

2. **Use wildcards for subdomains:**
   ```typescript
   permissions: {
     network: ['*.example.com'],
   }
   ```

---

## Tool Execution Errors

### Error: "Tool execution failed: Invalid input"

**Symptoms:**
```
Error: Tool execution failed for 'my_tool'
Reason: Invalid input: Expected string, received number
```

**Causes:**
- Input doesn't match Zod schema
- Claude providing wrong input type
- Schema too restrictive

**Solutions:**

1. **Validate your Zod schema:**
   ```typescript
   const myTool = tool({
     name: 'my_tool',
     description: 'Clear description helps Claude provide correct input',
     input_schema: z.object({
       // Be specific about types and constraints
       name: z.string().min(1).describe('User name (required, non-empty)'),
       age: z.number().int().positive().describe('Age in years'),
     }),
     handler: async (input) => {
       // Input is now validated
       return `${input.name} is ${input.age} years old`;
     },
   });
   ```

2. **Add better descriptions:**
   - Detailed descriptions help Claude understand expected input
   - Include examples in description if needed

3. **Test your tool directly:**
   ```typescript
   // Test tool outside of agent context
   const result = await myTool.handler({ name: 'Alice', age: 30 });
   console.log(result);
   ```

### Error: "Tool not found" or "Unknown tool"

**Symptoms:**
```
Error: Tool 'my_tool' not found
```

**Causes:**
- Tool not registered with client
- Typo in tool name
- Tool registered after client creation

**Solutions:**

1. **Register tools during client creation:**
   ```typescript
   const client = new ClaudeSDKClient({
     apiKey: process.env.ANTHROPIC_API_KEY,
     tools: [myTool, anotherTool],  // Register all tools here
   });
   ```

2. **Verify tool names:**
   ```typescript
   console.log('Registered tools:', client.tools.map(t => t.name));
   ```

3. **Check for typos:**
   - Tool name in definition must match usage
   - Names are case-sensitive

### Error: "Tool handler timeout"

**Symptoms:**
```
Error: Tool handler timeout after 30s
```

**Causes:**
- Handler taking too long
- Infinite loop in handler
- Network request hanging

**Solutions:**

1. **Add timeout to async operations:**
   ```typescript
   const myTool = tool({
     name: 'api_call',
     input_schema: z.object({ url: z.string() }),
     handler: async (input) => {
       const controller = new AbortController();
       const timeout = setTimeout(() => controller.abort(), 10000);

       try {
         const response = await fetch(input.url, {
           signal: controller.signal,
         });
         return await response.text();
       } catch (error) {
         return `Error: ${error.message}`;
       } finally {
         clearTimeout(timeout);
       }
     },
   });
   ```

2. **Optimize slow operations:**
   - Cache results when possible
   - Limit data processing
   - Use streaming for large responses

---

## TypeScript Configuration Issues

### Error: "Cannot find type definitions"

**Symptoms:**
```
error TS2307: Cannot find module '@anthropic-ai/agent-sdk' or its corresponding type declarations.
```

**Causes:**
- Missing @types packages
- TypeScript can't resolve modules
- tsconfig.json misconfigured

**Solutions:**

1. **Install type definitions:**
   ```bash
   npm install -D @types/node typescript
   ```

2. **Update tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "esModuleInterop": true,
       "strict": true,
       "skipLibCheck": true,
       "moduleResolution": "node"
     }
   }
   ```

3. **Verify TypeScript version:**
   ```bash
   npx tsc --version
   # Should be 5.0.0 or higher
   ```

### Error: "Property does not exist on type"

**Symptoms:**
```
error TS2339: Property 'text' does not exist on type 'Response'.
```

**Causes:**
- Wrong type expectations
- API response structure changed
- Type assertions needed

**Solutions:**

1. **Check response structure:**
   ```typescript
   const response = await client.query({ prompt: 'hello' });
   console.log('Response structure:', Object.keys(response));
   ```

2. **Use proper types:**
   ```typescript
   import { ClaudeSDKClient, QueryResponse } from '@anthropic-ai/agent-sdk';

   const response: QueryResponse = await client.query({ prompt: 'hello' });
   console.log(response.text);
   ```

### Error: "Strict mode errors"

**Symptoms:**
```
error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

**Causes:**
- Strict TypeScript settings catching potential undefined values
- Good! These catch real bugs

**Solutions:**

1. **Add null checks:**
   ```typescript
   const apiKey = process.env.ANTHROPIC_API_KEY;
   if (!apiKey) {
     throw new Error('API key required');
   }
   // Now TypeScript knows apiKey is definitely a string
   const client = new ClaudeSDKClient({ apiKey });
   ```

2. **Use optional chaining:**
   ```typescript
   const result = response?.text ?? 'No response';
   ```

---

## Runtime Errors

### Error: "Rate limit exceeded"

**Symptoms:**
```
Error: Rate limit exceeded. Please wait before retrying.
Status: 429 Too Many Requests
```

**Causes:**
- Too many requests in short time
- Exceeded API quota
- No backoff between retries

**Solutions:**

1. **Implement exponential backoff:**
   ```typescript
   async function queryWithRetry(prompt: string, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await client.query({ prompt });
       } catch (error) {
         if (error.message.includes('rate limit') && i < maxRetries - 1) {
           const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
           await new Promise(resolve => setTimeout(resolve, delay));
           continue;
         }
         throw error;
       }
     }
   }
   ```

2. **Add delays between requests:**
   ```typescript
   const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

   for (const item of items) {
     await processItem(item);
     await delay(1000); // 1 second between requests
   }
   ```

3. **Check your quota:**
   - Visit console.anthropic.com
   - Check usage limits
   - Consider upgrading plan

### Error: "Context length exceeded"

**Symptoms:**
```
Error: Context length exceeded. Maximum tokens: 100000
```

**Causes:**
- Too many messages in conversation
- Very long prompts or tool outputs
- Not clearing conversation history

**Solutions:**

1. **Clear conversation periodically:**
   ```typescript
   // For stateful client
   client.clearHistory();
   ```

2. **Summarize long conversations:**
   ```typescript
   if (client.messageCount > 50) {
     const summary = await client.query({
       prompt: 'Summarize our conversation so far',
     });
     client.clearHistory();
     client.query({
       prompt: `Previous conversation summary: ${summary.text}`,
     });
   }
   ```

3. **Limit tool output size:**
   ```typescript
   const readFile = tool({
     name: 'read_file',
     input_schema: z.object({ path: z.string() }),
     handler: async (input) => {
       const content = await fs.readFile(input.path, 'utf-8');
       // Truncate large files
       if (content.length > 10000) {
         return content.slice(0, 10000) + '\n[truncated...]';
       }
       return content;
     },
   });
   ```

### Error: "Network timeout"

**Symptoms:**
```
Error: Network request timeout after 60s
```

**Causes:**
- Slow network connection
- API server slow to respond
- Large response taking long time

**Solutions:**

1. **Increase timeout:**
   ```typescript
   const client = new ClaudeSDKClient({
     apiKey: process.env.ANTHROPIC_API_KEY,
     timeout: 120000, // 120 seconds
   });
   ```

2. **Use streaming for long responses:**
   ```typescript
   const stream = await client.streamQuery({ prompt: 'long task' });
   for await (const chunk of stream) {
     console.log(chunk.text);
   }
   ```

See: [Streaming Guide](./typescript/streaming.md)

---

## Network and API Errors

### Error: "Connection refused" or "ECONNREFUSED"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:443
```

**Causes:**
- No internet connection
- Firewall blocking requests
- Incorrect API endpoint

**Solutions:**

1. **Check internet connection:**
   ```bash
   ping api.anthropic.com
   ```

2. **Check firewall settings:**
   - Allow outbound HTTPS (port 443)
   - Allow connections to api.anthropic.com

3. **Verify API endpoint:**
   ```typescript
   // Default should work
   const client = new ClaudeSDKClient({
     apiKey: process.env.ANTHROPIC_API_KEY,
     baseURL: 'https://api.anthropic.com', // Optional, uses default
   });
   ```

### Error: "SSL certificate error"

**Symptoms:**
```
Error: unable to verify the first certificate
```

**Causes:**
- Corporate proxy interfering
- System certificates out of date
- Network security software

**Solutions:**

1. **Update system certificates:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install ca-certificates
   ```

2. **For corporate proxies, configure Node.js:**
   ```bash
   export NODE_TLS_REJECT_UNAUTHORIZED=0  # Not recommended for production
   ```

3. **Better: Configure proxy properly:**
   ```bash
   export HTTPS_PROXY=http://proxy.company.com:8080
   ```

---

## MCP Server Issues

### Error: "MCP server not found"

**Symptoms:**
```
Error: MCP server 'myserver' not found
```

**Causes:**
- MCP server not installed
- Server not in SDK's server list
- Configuration mismatch

**Solutions:**

1. **Check available MCP servers:**
   ```typescript
   console.log('Available servers:', client.mcpServers);
   ```

2. **Install MCP server package:**
   ```bash
   npm install @modelcontextprotocol/server-filesystem
   ```

3. **Register custom MCP server:**
   ```typescript
   const client = new ClaudeSDKClient({
     apiKey: process.env.ANTHROPIC_API_KEY,
     mcpServers: ['filesystem', 'database'],
   });
   ```

See: [MCP Guide](./concepts/mcp.md)

### Error: "MCP server connection failed"

**Symptoms:**
```
Error: Failed to connect to MCP server
```

**Causes:**
- Server not running
- Connection configuration wrong
- Server crashed

**Solutions:**

1. **Start the MCP server:**
   ```bash
   # Check if server is running
   ps aux | grep mcp
   ```

2. **Check server logs:**
   ```bash
   tail -f /path/to/mcp/server.log
   ```

3. **Restart server:**
   ```bash
   # Depends on server setup
   npm run mcp:start
   ```

---

## Performance Problems

### Issue: "Slow response times"

**Symptoms:**
- Queries taking >10 seconds
- High latency

**Causes:**
- Large context
- Complex tool operations
- Network issues

**Solutions:**

1. **Use streaming for better perceived performance:**
   ```typescript
   const stream = await client.streamQuery({ prompt });
   for await (const chunk of stream) {
     process.stdout.write(chunk.text);
   }
   ```

2. **Reduce context size:**
   - Clear old messages
   - Summarize long conversations
   - Limit tool output size

3. **Optimize tool operations:**
   - Cache expensive computations
   - Use async operations properly
   - Batch operations when possible

### Issue: "High memory usage"

**Symptoms:**
- Process memory growing unbounded
- Eventually crashes with OOM

**Causes:**
- Not clearing conversation history
- Storing all responses in memory
- Memory leaks in custom tools

**Solutions:**

1. **Clear history periodically:**
   ```typescript
   if (client.messageCount > 100) {
     client.clearHistory();
   }
   ```

2. **Don't store all responses:**
   ```typescript
   // Bad
   const allResponses = [];
   for (const query of queries) {
     allResponses.push(await client.query({ prompt: query }));
   }

   // Good
   for (const query of queries) {
     const response = await client.query({ prompt: query });
     await processAndDiscard(response);
   }
   ```

3. **Monitor memory:**
   ```typescript
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log('Memory:', Math.round(usage.heapUsed / 1024 / 1024), 'MB');
   }, 60000);
   ```

---

## Known Documentation Gaps

### Python SDK Documentation (Coming in Iteration 2)

**Current Status:** Python SDK is fully functional, but detailed implementation guides are planned for a future iteration.

**Workarounds:**
- Use official documentation: https://docs.anthropic.com/en/api/agent-sdk/python
- TypeScript patterns generally translate to Python async patterns
- Check the Python package README: `pip show anthropic-sdk`

### Beta and Experimental Features

The following features may have incomplete documentation:

**Subagents:**
- API may change in future versions
- Check official docs for latest information

**Advanced Streaming:**
- Backpressure handling still evolving
- Use basic streaming patterns for production

**Custom MCP Server Development:**
- Creating custom MCP servers is advanced
- Refer to MCP specification directly

### Feature Requests and Updates

If you encounter issues not covered here:
1. Check official documentation: https://docs.anthropic.com/en/api/agent-sdk/
2. Review SDK release notes for breaking changes
3. Join Anthropic developer community for support

---

## Getting Help

### Debug Checklist

Before asking for help, verify:

- [ ] Environment variables set correctly
- [ ] Dependencies installed (check package.json)
- [ ] TypeScript configured properly (check tsconfig.json)
- [ ] API key valid and not expired
- [ ] Network connectivity working
- [ ] Error messages carefully read
- [ ] This troubleshooting guide consulted

### Enable Debug Logging

```typescript
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
  debug: true, // Enable verbose logging
});
```

### Create Minimal Reproduction

When reporting issues, create minimal example:

```typescript
// minimal-example.ts
import { query } from '@anthropic-ai/agent-sdk';

async function reproduce() {
  const response = await query({
    apiKey: process.env.ANTHROPIC_API_KEY,
    prompt: 'test',
  });
  console.log(response);
}

reproduce();
```

---

## Related Documentation

**Core Guides:**
- [Overview](./overview.md) - What is Agent SDK
- [Quickstart](./quickstart.md) - Getting started guide

**TypeScript:**
- [Setup Guide](./typescript/setup.md) - Configuration
- [Custom Tools](./typescript/custom-tools.md) - Tool creation

**Concepts:**
- [Permissions](./concepts/permissions.md) - Security model
- [MCP](./concepts/mcp.md) - Model Context Protocol
- [Tools](./concepts/tools.md) - Tool system

**Examples:**
- [Simple CLI Agent](./examples/simple-cli-agent.md) - Basic example
- [Web API Agent](./examples/web-api-agent.md) - API integration
