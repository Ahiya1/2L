---
title: "TypeScript Setup Guide"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "typescript"
difficulty: "beginner"
prerequisites:
  - "Node.js 18+ installed"
  - "npm or yarn installed"
next_steps:
  - "Try [Query Pattern](./query-pattern.md) for stateless agents"
  - "Follow [Simple CLI Agent Example](../examples/simple-cli-agent.md)"
  - "Learn about [Custom Tools](../concepts/tools.md)"
related_guides:
  - query-pattern.md
  - client-pattern.md
  - ../quickstart.md
tags:
  - installation
  - setup
  - typescript
  - configuration
---

# TypeScript Setup Guide

## Overview

This guide covers everything you need to set up a TypeScript project with the Claude Agent SDK. You'll learn how to install dependencies, configure TypeScript, set up your environment, and structure your project for agent development.

## When to Use

Use this guide when:
- Starting a new Agent SDK project from scratch
- Adding Agent SDK to an existing TypeScript project
- Troubleshooting TypeScript configuration issues
- Setting up recommended project structure

## Prerequisites

- **Node.js:** Version 18.0.0 or higher
- **npm:** Version 8.0.0 or higher (or yarn/pnpm equivalent)
- **TypeScript:** Version 5.0.0 or higher
- **API Key:** Anthropic API key from https://console.anthropic.com/

## Installation

### Step 1: Install Core Dependencies

```bash
npm install @anthropic-ai/agent-sdk zod
```

**Package purposes:**
- `@anthropic-ai/agent-sdk` - Core Agent SDK with Claude integration
- `zod` - Schema validation for custom tools (required dependency)

### Step 2: Install Development Dependencies

```bash
npm install -D typescript @types/node
```

**Development dependencies:**
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions

### Step 3: Verify Installation

```bash
npm list @anthropic-ai/agent-sdk zod
```

Expected output should show both packages installed at version 1.2.0 or higher.

## TypeScript Configuration

### Recommended tsconfig.json

Create a `tsconfig.json` file in your project root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Key configuration options:**
- `target: "ES2022"` - Modern JavaScript features
- `strict: true` - Enable all strict type checking
- `esModuleInterop: true` - Better compatibility with CommonJS modules
- `moduleResolution: "node"` - Standard Node.js module resolution

### Minimal tsconfig.json

For quick prototyping:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true
  }
}
```

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
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
```

### Step 3: Load Environment Variables

**Option A: Using dotenv package (recommended)**

```bash
npm install dotenv
```

```typescript
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
```

**Option B: Native Node.js (Node 20.6+)**

```typescript
// No package needed
const apiKey = process.env.ANTHROPIC_API_KEY;
```

**Option C: Command line**

```bash
ANTHROPIC_API_KEY=your-key node dist/index.js
```

### Step 4: Validate API Key

```typescript
/**
 * Validate API key is present before using SDK
 */
function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is required. ' +
      'Get your API key from: https://console.anthropic.com/'
    );
  }

  return apiKey;
}

// Usage
const apiKey = getApiKey();
```

## Project Structure

### Recommended Directory Layout

```
my-agent-project/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config.ts                # Configuration
│   ├── agents/
│   │   ├── simple-agent.ts      # Agent implementations
│   │   └── complex-agent.ts
│   ├── tools/
│   │   ├── file-tools.ts        # Custom tools
│   │   ├── api-tools.ts
│   │   └── index.ts             # Tool exports
│   ├── types/
│   │   └── index.ts             # Type definitions
│   └── utils/
│       └── helpers.ts           # Utility functions
├── dist/                         # Compiled JavaScript
├── node_modules/
├── .env                          # Environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Minimal Structure

For simple projects:

```
my-agent/
├── src/
│   └── index.ts                 # Everything in one file
├── .env
├── package.json
└── tsconfig.json
```

## Package.json Configuration

### Complete package.json

```json
{
  "name": "my-agent-project",
  "version": "1.0.0",
  "description": "Claude Agent SDK project",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "watch": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "keywords": ["claude", "agent", "sdk"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@anthropic-ai/agent-sdk": "^1.2.0",
    "zod": "^3.22.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Useful scripts:**
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled code
- `npm run dev` - Run directly with ts-node (development)
- `npm run watch` - Auto-recompile on file changes

## Import Patterns

### Named Exports (Recommended)

```typescript
// Core SDK imports
import { query, ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';

// Schema validation
import { z } from 'zod';

// Node.js built-ins
import fs from 'fs/promises';
import path from 'path';
```

### Import Organization

Group imports by category:

```typescript
/**
 * Complete import example with proper organization
 */

// 1. Core SDK imports (always first)
import { ClaudeSDKClient, query, tool } from '@anthropic-ai/agent-sdk';

// 2. Third-party library imports (alphabetical)
import axios from 'axios';
import { z } from 'zod';

// 3. Node.js built-in imports (last)
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

// 4. Local imports
import { CustomTool } from './tools';
import { Config } from './config';
```

## Complete Setup Example

```typescript
/**
 * Example: Complete TypeScript project setup
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - zod@^3.22.0
 * - dotenv@^16.0.0
 *
 * Install: npm install @anthropic-ai/agent-sdk zod dotenv
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import dotenv from 'dotenv';
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

// Load environment variables
dotenv.config();

// Validate API key
function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  return apiKey;
}

// Initialize client
const client = new ClaudeSDKClient({
  apiKey: getApiKey(),
});

// Use the agent
async function main() {
  try {
    const response = await client.query({
      prompt: 'Hello! Tell me about TypeScript.',
    });

    console.log(response.text);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

main();

/**
 * Expected output:
 * Agent responds with information about TypeScript.
 */
```

## Version Requirements

### Minimum Versions

| Package | Minimum Version | Recommended |
|---------|----------------|-------------|
| Node.js | 18.0.0 | 20.0.0+ |
| npm | 8.0.0 | 10.0.0+ |
| TypeScript | 5.0.0 | 5.3.0+ |
| @anthropic-ai/agent-sdk | 1.2.0 | Latest |
| zod | 3.22.0 | Latest |

### Check Installed Versions

```bash
node --version
npm --version
npx tsc --version
npm list @anthropic-ai/agent-sdk zod
```

## Common Pitfalls

### Missing Environment Variables

**Problem:** API key not loaded

```typescript
// Wrong: Undefined API key
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY, // undefined!
});
```

**Solution:** Validate before use

```typescript
// Correct: Validate first
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY required');
}

const client = new ClaudeSDKClient({ apiKey });
```

### Incorrect TypeScript Configuration

**Problem:** Strict mode disabled

```json
// Problematic
{
  "compilerOptions": {
    "strict": false  // Disables type safety!
  }
}
```

**Solution:** Enable strict mode

```json
// Correct
{
  "compilerOptions": {
    "strict": true  // Full type safety
  }
}
```

### Wrong Import Syntax

**Problem:** Using default imports

```typescript
// Wrong: No default export
import SDK from '@anthropic-ai/agent-sdk';
```

**Solution:** Use named imports

```typescript
// Correct: Named exports
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';
```

### Hardcoded API Keys

**Problem:** API key in code

```typescript
// NEVER DO THIS!
const apiKey = 'sk-ant-api03-...';  // Security risk!
```

**Solution:** Use environment variables

```typescript
// Always do this
const apiKey = process.env.ANTHROPIC_API_KEY;
```

## Troubleshooting

### Cannot find module '@anthropic-ai/agent-sdk'

**Cause:** Package not installed or not in node_modules

**Solution:**
```bash
npm install @anthropic-ai/agent-sdk zod
```

### TypeScript compilation errors

**Cause:** Incorrect tsconfig.json or outdated TypeScript

**Solution:**
```bash
# Update TypeScript
npm install -D typescript@latest

# Verify tsconfig.json has strict: true
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
node -e "console.log(process.env.ANTHROPIC_API_KEY)"
```

### Module resolution errors

**Cause:** Incorrect moduleResolution in tsconfig.json

**Solution:**
```json
{
  "compilerOptions": {
    "moduleResolution": "node"  // Use Node.js resolution
  }
}
```

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

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic usage
- [Web API Agent](../examples/web-api-agent.md) - API integration
