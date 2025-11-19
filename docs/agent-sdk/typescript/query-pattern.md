---
title: "Query Pattern - Stateless Requests"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "typescript"
difficulty: "beginner"
prerequisites:
  - "Completed [TypeScript Setup](./setup.md)"
  - "Basic TypeScript knowledge"
next_steps:
  - "Learn [Client Pattern](./client-pattern.md) for stateful conversations"
  - "Add [Custom Tools](./custom-tools.md) to extend capabilities"
  - "See [Simple CLI Agent](../examples/simple-cli-agent.md) example"
related_guides:
  - client-pattern.md
  - custom-tools.md
  - options.md
tags:
  - query
  - stateless
  - single-shot
  - pattern
---

# Query Pattern - Stateless Requests

## Overview

The `query()` function provides a stateless, single-shot way to interact with Claude. It's the simplest pattern in the Agent SDK - send a prompt, get a response, done. No conversation memory, no session management, just pure request-response.

## When to Use

Use the query pattern when:
- **One-off requests:** You need a single response without follow-up
- **Stateless operations:** Each request is independent
- **Simple tasks:** Quick questions, translations, summaries
- **Serverless functions:** Lambda, Cloud Functions, Edge Functions
- **Batch processing:** Process many independent items
- **No conversation needed:** Previous context doesn't matter

**Don't use query() when:**
- You need multi-turn conversations → Use [Client Pattern](./client-pattern.md)
- You need to maintain context → Use [Client Pattern](./client-pattern.md)
- You need session persistence → Use [Client Pattern](./client-pattern.md)

## Prerequisites

- Completed [Setup Guide](./setup.md)
- API key configured in environment
- Understanding of async/await in TypeScript

## Basic Pattern

### Minimal Example

```typescript
import { query } from '@anthropic-ai/agent-sdk';

const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'What is the capital of France?',
});

console.log(response.text);
// Output: "The capital of France is Paris."
```

### With Error Handling

```typescript
import { query } from '@anthropic-ai/agent-sdk';

async function askQuestion(question: string): Promise<string> {
  try {
    const response = await query({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      prompt: question,
    });

    return response.text;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Query failed:', error.message);
    }
    throw error;
  }
}

// Usage
const answer = await askQuestion('Explain quantum computing in one sentence.');
console.log(answer);
```

## Complete Example

```typescript
/**
 * Example: Document summarizer using query pattern
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 *
 * Install: npm install @anthropic-ai/agent-sdk
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import { query } from '@anthropic-ai/agent-sdk';

// Validate API key
function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable required. ' +
      'Get your API key from: https://console.anthropic.com/'
    );
  }

  return apiKey;
}

// Summarize document
async function summarizeDocument(text: string): Promise<string> {
  try {
    const response = await query({
      apiKey: getApiKey(),
      prompt: `Summarize the following text in 2-3 sentences:\n\n${text}`,
      model: 'claude-3-5-sonnet-20241022',
    });

    return response.text;
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('API key')) {
        throw new Error('Invalid API key. Please check your ANTHROPIC_API_KEY.');
      }

      if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
      }
    }

    // Re-throw unknown errors
    throw error;
  }
}

// Main execution
async function main() {
  const document = `
    TypeScript is a strongly typed programming language that builds on JavaScript.
    It adds optional static typing to the language, allowing developers to catch
    errors early in development. TypeScript compiles to plain JavaScript and can
    run anywhere JavaScript runs. It's widely used in large-scale applications
    for its improved maintainability and developer experience.
  `;

  try {
    console.log('Summarizing document...\n');

    const summary = await summarizeDocument(document);

    console.log('Summary:');
    console.log(summary);
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
 * Summarizing document...
 *
 * Summary:
 * TypeScript is a strongly typed language that extends JavaScript with
 * optional static typing. It helps catch errors early and compiles to
 * plain JavaScript. It's popular for large applications due to better
 * maintainability.
 */
```

## Query Options

### Model Selection

```typescript
import { query } from '@anthropic-ai/agent-sdk';

// Fast, cost-effective model
const response1 = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Quick question here',
  model: 'claude-3-haiku-20240307',
});

// Most capable model (default)
const response2 = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Complex reasoning task',
  model: 'claude-3-5-sonnet-20241022',
});
```

**Available models:**
- `claude-3-5-sonnet-20241022` - Most capable (default)
- `claude-3-haiku-20240307` - Fast and cost-effective
- `claude-3-opus-20240229` - Highest capability

### Temperature Control

```typescript
// Deterministic output (temperature = 0)
const factual = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'What is 2 + 2?',
  temperature: 0,
});

// Creative output (temperature = 1)
const creative = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Write a creative story opening.',
  temperature: 1,
});
```

**Temperature guidelines:**
- `0` - Deterministic, consistent responses (factual tasks)
- `0.3-0.7` - Balanced creativity and consistency (default: 0.7)
- `1` - Maximum creativity and variation (creative writing)

### Maximum Tokens

```typescript
// Short response
const brief = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Explain AI in one sentence.',
  maxTokens: 50,
});

// Longer response
const detailed = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Write a comprehensive guide to machine learning.',
  maxTokens: 2000,
});
```

## Response Structure

### Response Object

```typescript
import { query } from '@anthropic-ai/agent-sdk';

const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Hello!',
});

// Access response properties
console.log('Text:', response.text);
console.log('Stop reason:', response.stopReason);
console.log('Usage:', response.usage);

// TypeScript type
type QueryResponse = {
  text: string;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};
```

### Handling Stop Reasons

```typescript
async function handleResponse(prompt: string) {
  const response = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
    maxTokens: 100,
  });

  switch (response.stopReason) {
    case 'end_turn':
      // Normal completion
      console.log('Complete response:', response.text);
      break;

    case 'max_tokens':
      // Response truncated due to token limit
      console.warn('Response truncated. Consider increasing maxTokens.');
      console.log('Partial response:', response.text);
      break;

    case 'stop_sequence':
      // Custom stop sequence encountered
      console.log('Stopped at sequence:', response.text);
      break;
  }

  // Log token usage
  console.log(`Tokens used: ${response.usage.inputTokens + response.usage.outputTokens}`);
}
```

## Advanced Patterns

### Batch Processing

```typescript
/**
 * Process multiple independent items with query pattern
 */
import { query } from '@anthropic-ai/agent-sdk';

async function processBatch(items: string[]): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  // Process in parallel (be mindful of rate limits)
  const promises = items.map(item =>
    query({
      apiKey,
      prompt: `Analyze sentiment: "${item}"`,
    })
  );

  const responses = await Promise.all(promises);

  return responses.map(r => r.text);
}

// Usage
const tweets = [
  'I love this product!',
  'Terrible experience.',
  'It's okay, nothing special.',
];

const sentiments = await processBatch(tweets);
sentiments.forEach((sentiment, i) => {
  console.log(`"${tweets[i]}" → ${sentiment}`);
});
```

### Retry Logic

```typescript
/**
 * Retry query on transient failures
 */
async function queryWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await query({ apiKey, prompt });
      return response.text;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (error instanceof Error && error.message.includes('rate limit')) {
        if (isLastAttempt) throw error;

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Timeout Handling

```typescript
/**
 * Add timeout to query operations
 */
async function queryWithTimeout(
  prompt: string,
  timeoutMs: number = 30000
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
  });

  const queryPromise = query({ apiKey, prompt });

  const response = await Promise.race([queryPromise, timeoutPromise]);

  return response.text;
}
```

### Prompt Validation

```typescript
/**
 * Validate prompts before sending
 */
function validatePrompt(prompt: string): void {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty');
  }

  if (prompt.length > 100000) {
    throw new Error('Prompt too long (max 100,000 characters)');
  }

  // Check for common issues
  if (prompt.includes('\x00')) {
    throw new Error('Prompt contains null bytes');
  }
}

async function safeQuery(prompt: string): Promise<string> {
  validatePrompt(prompt);

  const response = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
  });

  return response.text;
}
```

## Performance Considerations

### Token Efficiency

```typescript
// Inefficient: Redundant context
const bad = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: `
    You are a helpful assistant.
    Please be concise and clear.
    Remember to be professional.
    Now answer this question: What is TypeScript?
  `, // 30+ tokens of unnecessary preamble
});

// Efficient: Direct and concise
const good = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Explain TypeScript concisely.', // Clear and direct
});
```

### Rate Limiting

```typescript
/**
 * Respect rate limits with queue
 */
class QueryQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private delayMs = 1000; // 1 request per second

  async add(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const response = await query({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            prompt,
          });
          resolve(response.text);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    this.processing = false;
  }
}
```

## Common Pitfalls

### Treating query() as Stateful

```typescript
// Wrong: Expecting memory between calls
const response1 = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'My name is Alice.',
});

const response2 = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'What is my name?', // Won't remember "Alice"!
});
```

**Solution:** Use [Client Pattern](./client-pattern.md) for conversations.

### Missing Error Handling

```typescript
// Wrong: No error handling
const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Hello',
});
// If API key is invalid, app crashes!

// Correct: Always handle errors
try {
  const response = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt: 'Hello',
  });
  console.log(response.text);
} catch (error) {
  console.error('Query failed:', error);
}
```

### Forgetting Async/Await

```typescript
// Wrong: Not awaiting
const response = query({ /* ... */ });
console.log(response.text); // undefined! It's a Promise

// Correct: Await the promise
const response = await query({ /* ... */ });
console.log(response.text); // Works!
```

## Troubleshooting

### "API key not found" error

**Cause:** Missing or undefined ANTHROPIC_API_KEY

**Solution:**
```bash
export ANTHROPIC_API_KEY=your-key
node -e "console.log(process.env.ANTHROPIC_API_KEY)"
```

### Rate limit errors

**Cause:** Too many requests too quickly

**Solution:**
- Add delays between requests
- Implement retry with exponential backoff
- Use batch processing with rate limiting

### Response truncated

**Cause:** Response hit maxTokens limit

**Solution:**
```typescript
const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Long task...',
  maxTokens: 4000, // Increase limit
});

if (response.stopReason === 'max_tokens') {
  console.warn('Response may be incomplete');
}
```

## Comparison: Query vs Client

| Feature | query() | ClaudeSDKClient |
|---------|---------|------------------|
| Conversation memory | No | Yes |
| State management | Stateless | Stateful |
| Multi-turn | No | Yes |
| Simplicity | Simpler | More complex |
| Use case | Single requests | Conversations |
| Performance | Lower overhead | Higher overhead |

**When to switch to Client Pattern:**
- You need to ask follow-up questions
- Context from previous messages matters
- Building a chatbot or assistant
- Managing conversation history

See [Client Pattern](./client-pattern.md) for details.

## Next Steps

1. **Add custom tools:** [Custom Tools Guide](./custom-tools.md)
2. **Learn client pattern:** [Client Pattern Guide](./client-pattern.md)
3. **Configure options:** [Options Reference](./options.md)
4. **Build examples:** [Simple CLI Agent](../examples/simple-cli-agent.md)

## Related Documentation

**Core Concepts:**
- [Tools Overview](../concepts/tools.md) - Custom tool capabilities
- [Sessions](../concepts/sessions.md) - When to use state

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Client Pattern](./client-pattern.md) - Stateful alternative
- [Custom Tools](./custom-tools.md) - Extend capabilities
- [Options Reference](./options.md) - All configuration options

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic usage
- [Web API Agent](../examples/web-api-agent.md) - API integration
