---
title: "Web API Agent"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "multi-language"
difficulty: "intermediate"
example_type: "web-api"
prerequisites:
  - "Completed setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)"
  - "Understanding of [Custom Tools](../concepts/tools.md)"
  - "Basic REST API knowledge"
next_steps:
  - "Add [Streaming](../typescript/streaming.md) for real-time responses"
  - "Implement authentication and rate limiting"
  - "Deploy to production with [Session Management](../concepts/sessions.md)"
related_guides:
  - ../typescript/setup.md
  - ../python/setup.md
  - ../typescript/streaming.md
  - ../python/async-patterns.md
  - ../concepts/tools.md
tags:
  - complete-example
  - express
  - fastapi
  - rest-api
  - web-service
  - typescript
  - python
---

# Web API Agent

## Overview

This example demonstrates how to expose an Agent SDK-powered agent through a REST API using Express. It shows how to handle HTTP requests, validate input, stream responses, and provide proper error handling for a production-ready web service.

## Problem Statement

You need to expose AI agent capabilities through a REST API so that:

- Multiple clients can access the agent (web apps, mobile apps, other services)
- You can integrate the agent into existing web infrastructure
- You want to add authentication, rate limiting, and logging
- The agent needs to be accessible over HTTP/HTTPS

## Prerequisites

### For TypeScript
- Node.js 18 or higher
- npm or yarn package manager
- Basic Express.js knowledge
- See [TypeScript Setup Guide](../typescript/setup.md) for installation

### For Python
- Python 3.8 or higher
- pip or uv package manager
- Basic FastAPI knowledge
- See [Python Setup Guide](../python/setup.md) for installation

### General Requirements
- ANTHROPIC_API_KEY environment variable
- Understanding of REST APIs
- Basic async programming knowledge

## TypeScript Implementation

### Complete Code

```typescript
/**
 * Example: Web API Agent with Express
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - express@^4.18.0
 * - zod@^3.22.0
 *
 * DevDependencies:
 * - @types/express@^4.17.0
 * - typescript@^5.0.0
 * - @types/node@^20.0.0
 *
 * Install: npm install @anthropic-ai/agent-sdk express zod
 * Install Dev: npm install -D @types/express typescript @types/node tsx
 *
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 * Get your API key from: https://console.anthropic.com/
 */

import express, { Request, Response, NextFunction } from 'express';
import { query, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Define custom tools for the agent
const getCurrentTime = tool({
  name: 'get_current_time',
  description: 'Get the current date and time',
  input_schema: z.object({}),
  handler: async () => {
    const now = new Date();
    return `Current time: ${now.toLocaleString()}`;
  },
});

const calculateSum = tool({
  name: 'calculate_sum',
  description: 'Calculate the sum of two numbers',
  input_schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  handler: async (input) => {
    const sum = input.a + input.b;
    return `The sum of ${input.a} and ${input.b} is ${sum}`;
  },
});

// Zod schema for request validation
const QueryRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000, 'Prompt too long'),
  model: z.string().optional().default('claude-3-5-sonnet-20241022'),
});

type QueryRequest = z.infer<typeof QueryRequestSchema>;

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Main query endpoint
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedBody = QueryRequestSchema.parse(req.body);
    const { prompt, model } = validatedBody;

    // Validate API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key not configured',
      });
    }

    console.log(`Processing query: "${prompt.substring(0, 50)}..."`);

    // Query the agent
    const response = await query({
      apiKey: process.env.ANTHROPIC_API_KEY,
      prompt: prompt,
      model: model,
      tools: [getCurrentTime, calculateSum],
    });

    // Return successful response
    res.json({
      success: true,
      response: response.text,
      model: model,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Handle API errors
    if (error instanceof Error) {
      console.error('Query error:', error.message);

      // Check for specific error types
      if (error.message.includes('API key')) {
        return res.status(401).json({
          error: 'Authentication error',
          message: 'Invalid API key',
        });
      }

      if (error.message.includes('rate limit')) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later',
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }

    // Unknown error
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Agent API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Query endpoint: POST http://localhost:${PORT}/api/query`);
  console.log('\nReady to accept requests!');
});

/**
 * Expected output:
 * When you start the server: npx tsx web-api-agent.ts
 *
 * Console output:
 * Agent API server running on port 3000
 * Health check: http://localhost:3000/health
 * Query endpoint: POST http://localhost:3000/api/query
 *
 * Ready to accept requests!
 *
 * When you POST to /api/query:
 * curl -X POST http://localhost:3000/api/query \
 *   -H "Content-Type: application/json" \
 *   -d '{"prompt": "What is the current time?"}'
 *
 * Response:
 * {
 *   "success": true,
 *   "response": "The current time is October 13, 2025 at 3:45 PM.",
 *   "model": "claude-3-5-sonnet-20241022",
 *   "timestamp": "2025-10-13T15:45:23.123Z"
 * }
 */
```

## Python Implementation

### Installation

```bash
# Create project directory
mkdir agent-api
cd agent-api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install claude-agent-sdk fastapi uvicorn python-dotenv
```

### Complete Code

```python
"""
Example: Web API Agent with FastAPI

Dependencies:
- claude-agent-sdk>=1.2.0
- fastapi>=0.104.0
- uvicorn>=0.24.0
- python-dotenv>=1.0.0

Install: pip install claude-agent-sdk fastapi uvicorn python-dotenv

Setup:
export ANTHROPIC_API_KEY=your-api-key-here
Get your API key from: https://console.anthropic.com/

Python 3.8+ required
"""

import os
import sys
from datetime import datetime
from typing import Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from claude_agent_sdk import query, tool
from dotenv import load_dotenv
import uvicorn

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


# Define custom tools for the agent
@tool
async def get_current_time(args: dict[str, Any]) -> dict[str, Any]:
    """
    Get the current date and time.

    Args:
        args: Empty dictionary (no arguments required)

    Returns:
        Dictionary with current time information
    """
    now = datetime.now()
    return {
        "content": [{
            "type": "text",
            "text": f"Current time: {now.strftime('%Y-%m-%d %H:%M:%S')}"
        }]
    }


@tool
async def calculate_sum(args: dict[str, Any]) -> dict[str, Any]:
    """
    Calculate the sum of two numbers.

    Args:
        args: Dictionary with 'a' and 'b' numeric values

    Returns:
        Dictionary with calculation result
    """
    try:
        a = float(args.get('a', 0))
        b = float(args.get('b', 0))
        result = a + b
        return {
            "content": [{
                "type": "text",
                "text": f"The sum of {a} and {b} is {result}"
            }]
        }
    except (ValueError, TypeError) as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: Invalid numeric values: {str(e)}"
            }]
        }


# Pydantic model for request validation
class QueryRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=5000, description="User prompt")
    model: str = Field(default="claude-3-5-sonnet-20241022", description="Model ID")

    @validator('prompt')
    def validate_prompt(cls, v):
        if not v or not v.strip():
            raise ValueError('Prompt cannot be empty')
        return v.strip()


class QueryResponse(BaseModel):
    success: bool
    response: str
    model: str
    timestamp: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None


# FastAPI app setup
app = FastAPI(
    title="Agent API",
    description="REST API for Agent SDK-powered agent",
    version="1.0.0"
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    timestamp = datetime.now().isoformat()
    print(f"[{timestamp}] {request.method} {request.url.path}")
    response = await call_next(request)
    return response


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancing."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


# Main query endpoint
@app.post("/api/query", response_model=QueryResponse)
async def query_agent(request: QueryRequest):
    """
    Process a query through the agent with custom tools.

    Args:
        request: QueryRequest with prompt and optional model

    Returns:
        QueryResponse with agent's answer

    Raises:
        HTTPException: For various error conditions
    """
    try:
        # Validate API key is configured
        try:
            api_key = get_api_key()
        except ValueError as e:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Server configuration error",
                    "message": str(e)
                }
            )

        print(f"Processing query: \"{request.prompt[:50]}...\"")

        # Query the agent
        response = await query(
            api_key=api_key,
            prompt=request.prompt,
            model=request.model,
            tools=[get_current_time, calculate_sum]
        )

        # Return successful response
        return QueryResponse(
            success=True,
            response=response.text,
            model=request.model,
            timestamp=datetime.now().isoformat()
        )

    except ValueError as e:
        # Handle validation errors
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Validation error",
                "message": str(e)
            }
        )
    except Exception as e:
        # Handle API errors
        error_message = str(e)

        # Check for specific error types
        if 'API key' in error_message:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "Authentication error",
                    "message": "Invalid API key"
                }
            )

        if 'rate limit' in error_message:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": "Too many requests, please try again later"
                }
            )

        # Generic error
        print(f"Query error: {error_message}", file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": error_message
            }
        )


# 404 handler
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not found",
            "message": f"Route {request.method} {request.url.path} not found"
        }
    )


# Global error handler
@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    print(f"Unhandled error: {exc}", file=sys.stderr)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )


# Main entry point
if __name__ == '__main__':
    port = int(os.getenv('PORT', '3000'))
    print(f"Agent API server running on port {port}")
    print(f"Health check: http://localhost:{port}/health")
    print(f"Query endpoint: POST http://localhost:{port}/api/query")
    print("\nReady to accept requests!")

    uvicorn.run(app, host="0.0.0.0", port=port)


"""
Expected output:
When you start the server: python web-api-agent.py

Console output:
Agent API server running on port 3000
Health check: http://localhost:3000/health
Query endpoint: POST http://localhost:3000/api/query

Ready to accept requests!

When you POST to /api/query:
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the current time?"}'

Response:
{
  "success": true,
  "response": "The current time is October 13, 2025 at 3:45 PM.",
  "model": "claude-3-5-sonnet-20241022",
  "timestamp": "2025-10-13T15:45:23.123456"
}
"""
```

### Running the Python Version

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key-here

# Optional: Set custom port
export PORT=3000

# Save the code to web-api-agent.py
# Start the server:
python web-api-agent.py

# Or use uvicorn directly:
uvicorn web-api-agent:app --host 0.0.0.0 --port 3000 --reload
```

### Test the Python API

```bash
# Test health check
curl http://localhost:3000/health

# Query the agent
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the current time?"
  }'

# Try calculations
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Calculate the sum of 42 and 58"
  }'

# Test validation
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": ""
  }'
```

### Expected Python Output

Server startup:
```
Agent API server running on port 3000
Health check: http://localhost:3000/health
Query endpoint: POST http://localhost:3000/api/query

Ready to accept requests!
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:3000
```

Successful query response:
```json
{
  "success": true,
  "response": "The current time is October 13, 2025 at 3:45:23 PM.",
  "model": "claude-3-5-sonnet-20241022",
  "timestamp": "2025-10-13T15:45:23.456789"
}
```

## How It Works

This example demonstrates several important patterns across both implementations:

1. **Web Framework**:
   - TypeScript: Express server with middleware
   - Python: FastAPI with async request handlers
2. **Request Validation**:
   - TypeScript: Zod schemas for runtime validation
   - Python: Pydantic models with Field validators
3. **Custom Tools**:
   - TypeScript: `tool()` function with Zod schemas
   - Python: `@tool` decorator with docstrings
4. **Error Handling**:
   - TypeScript: try-catch with Zod error handling
   - Python: try-except with HTTPException
5. **HTTP Status Codes**: Both return appropriate status codes (400, 401, 429, 500, etc.)
6. **Request Logging**:
   - TypeScript: Custom middleware logging
   - Python: FastAPI middleware decorator
7. **Health Check**: Both provide monitoring endpoints for load balancing

The API accepts POST requests with a prompt and optional model specification, processes them through the agent with custom tools, and returns structured JSON responses.

## Running the Example

### Installation

```bash
# Create project directory
mkdir agent-api
cd agent-api

# Initialize npm project
npm init -y

# Install dependencies
npm install @anthropic-ai/agent-sdk express zod
npm install -D @types/express typescript @types/node tsx
```

### Set up environment

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key-here

# Optional: Set custom port
export PORT=3000
```

### Save and run the server

```bash
# Save the code to web-api-agent.ts
# Start the server:
npx tsx web-api-agent.ts
```

### Test the API

```bash
# Test health check
curl http://localhost:3000/health

# Query the agent
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the current time?"
  }'

# Try calculations
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Calculate the sum of 42 and 58"
  }'

# Test validation
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": ""
  }'
```

## Expected Output

### Server startup:
```
Agent API server running on port 3000
Health check: http://localhost:3000/health
Query endpoint: POST http://localhost:3000/api/query

Ready to accept requests!
```

### Successful query response:
```json
{
  "success": true,
  "response": "The current time is October 13, 2025 at 3:45:23 PM.",
  "model": "claude-3-5-sonnet-20241022",
  "timestamp": "2025-10-13T15:45:23.456Z"
}
```

### Validation error response:
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "prompt",
      "message": "Prompt is required"
    }
  ]
}
```

## Key Concepts Demonstrated

- **REST API Design**: Proper endpoint structure, HTTP methods, and status codes
- **Request Validation**: Using Zod for type-safe request validation
- **Error Handling**: Comprehensive error handling for production use
- **Middleware**: Logging, JSON parsing, and error handling middleware
- **Custom Tools**: Providing tools to extend agent capabilities
- **Environment Configuration**: Using environment variables for configuration
- **Health Checks**: Monitoring endpoint for production deployments

## Next Steps

- Add authentication middleware (API keys, JWT tokens)
- Implement rate limiting (express-rate-limit)
- Add streaming responses (see [Streaming Guide](../typescript/streaming.md))
- Connect to a database for conversation history
- Add CORS support for browser clients
- Implement request/response logging to files
- Deploy to production (Docker, cloud platforms)
- Add more sophisticated tools (see [Multi-Tool Agent](./multi-tool-agent.md))

## Related Documentation

**Core Concepts:**
- [Tools Overview](../concepts/tools.md) - Understanding custom tools
- [Sessions](../concepts/sessions.md) - Managing conversation state

**TypeScript:**
- [Setup Guide](../typescript/setup.md) - Initial configuration
- [Streaming](../typescript/streaming.md) - Real-time response streaming
- [Query Pattern](../typescript/query-pattern.md) - Stateless interactions

**Python:**
- [Setup Guide](../python/setup.md) - Python SDK configuration
- [Async Patterns](../python/async-patterns.md) - Async/await patterns
- [Query Pattern](../python/query-pattern.md) - Stateless async interactions

**Similar Examples:**
- [Simple CLI Agent](./simple-cli-agent.md) - Basic command-line usage
- [Stateful Chatbot](./stateful-chatbot.md) - Conversation memory
- [Multi-Tool Agent](./multi-tool-agent.md) - Complex tool coordination
