---
title: "Streaming and Message Handling"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "typescript"
difficulty: "advanced"
prerequisites:
  - "Completed [TypeScript Setup](./setup.md)"
  - "Understanding of [Client Pattern](./client-pattern.md)"
  - "Familiarity with async iterables"
next_steps:
  - "Build responsive UIs with streaming"
  - "Implement [Chatbot Example](../examples/stateful-chatbot.md) with streaming"
  - "Explore [Session Management](../concepts/sessions.md)"
related_guides:
  - query-pattern.md
  - client-pattern.md
  - ../concepts/sessions.md
tags:
  - streaming
  - async-iterables
  - message-events
  - real-time
---

# Streaming and Message Handling

## Overview

The Claude Agent SDK supports streaming responses for real-time message delivery. Instead of waiting for the complete response, you can process messages as they arrive using async iterables. This enables responsive UIs, progress indicators, and early processing of partial results.

## When to Use

Use streaming when:
- **Real-time UIs:** Display messages as they're generated
- **Progress indicators:** Show that the agent is working
- **Long responses:** Start processing before completion
- **Interactive experiences:** Provide immediate feedback
- **Partial result handling:** Act on incomplete data

**Don't use streaming when:**
- Simple request/response is sufficient
- Full response needed before processing
- Streaming adds unnecessary complexity

## Prerequisites

- Completed [Setup Guide](./setup.md)
- Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)
- Familiarity with async iterables and `for await...of` loops
- Knowledge of async/await patterns

## Basic Pattern

### Non-Streaming (Default)

```typescript
import { query } from '@anthropic-ai/agent-sdk';

// Wait for complete response
const response = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Tell me a story.',
});

// Get entire response at once
console.log(response.text);
```

### Streaming Response

```typescript
import { query } from '@anthropic-ai/agent-sdk';

// Enable streaming
const stream = await query({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  prompt: 'Tell me a story.',
  stream: true, // Enable streaming
});

// Process chunks as they arrive
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    // Print each chunk as it arrives
    process.stdout.write(chunk.delta.text);
  }
}
```

## Complete Example

```typescript
/**
 * Example: Interactive streaming chatbot
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 *
 * Install: npm install @anthropic-ai/agent-sdk
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 */

import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';
import * as readline from 'readline';

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

// Stream response with visual feedback
async function streamResponse(client: ClaudeSDKClient, prompt: string) {
  try {
    // Request streaming response
    const stream = await client.query({
      prompt,
      stream: true,
    });

    // Process stream
    let fullText = '';

    process.stdout.write('Agent: ');

    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_start':
          // Content block begins
          break;

        case 'content_block_delta':
          // New text chunk
          if (event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullText += text;
            process.stdout.write(text); // Print immediately
          }
          break;

        case 'content_block_stop':
          // Content block complete
          break;

        case 'message_stop':
          // Message complete
          console.log('\n'); // New line after complete
          break;
      }
    }

    return fullText;

  } catch (error) {
    if (error instanceof Error) {
      console.error('\nError:', error.message);
    }
    throw error;
  }
}

// Main chatbot loop
async function runStreamingChatbot() {
  const client = new ClaudeSDKClient({
    apiKey: getApiKey(),
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Streaming Chatbot ready! Type your messages (or "quit" to exit).\n');

  let running = true;

  while (running) {
    // Get user input
    const userMessage = await new Promise<string>(resolve => {
      rl.question('You: ', answer => resolve(answer));
    });

    if (userMessage.toLowerCase() === 'quit') {
      running = false;
      break;
    }

    // Stream response
    await streamResponse(client, userMessage);
  }

  rl.close();
  console.log('Goodbye!');
}

// Run chatbot
runStreamingChatbot().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Expected interaction:
 *
 * You: Tell me a joke
 * Agent: Why did the programmer quit his job? Because he didn't get arrays!
 *
 * You: Explain it
 * Agent: The joke is a play on words. "Arrays" sounds like "a raise"...
 * (text appears in real-time as it's generated)
 */
```

## Stream Event Types

### Event Type Hierarchy

```typescript
type StreamEvent =
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | ErrorEvent;
```

### MessageStartEvent

Fired when message generation begins.

```typescript
interface MessageStartEvent {
  type: 'message_start';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: [];
    model: string;
    stop_reason: null;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

// Handle message start
for await (const event of stream) {
  if (event.type === 'message_start') {
    console.log('Message ID:', event.message.id);
    console.log('Model:', event.message.model);
    console.log('Input tokens:', event.message.usage.input_tokens);
  }
}
```

### ContentBlockStartEvent

Fired when a content block begins.

```typescript
interface ContentBlockStartEvent {
  type: 'content_block_start';
  index: number;
  content_block: {
    type: 'text';
    text: string;
  };
}

// Handle content block start
for await (const event of stream) {
  if (event.type === 'content_block_start') {
    console.log(`Content block ${event.index} started`);
  }
}
```

### ContentBlockDeltaEvent

Fired for each chunk of text generated.

```typescript
interface ContentBlockDeltaEvent {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta';
    text: string;
  };
}

// Handle text deltas (most important for streaming)
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      const chunk = event.delta.text;
      process.stdout.write(chunk); // Print immediately
    }
  }
}
```

### ContentBlockStopEvent

Fired when a content block completes.

```typescript
interface ContentBlockStopEvent {
  type: 'content_block_stop';
  index: number;
}

// Handle content block stop
for await (const event of stream) {
  if (event.type === 'content_block_stop') {
    console.log(`\nContent block ${event.index} complete`);
  }
}
```

### MessageDeltaEvent

Fired with usage updates during generation.

```typescript
interface MessageDeltaEvent {
  type: 'message_delta';
  delta: {
    stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
    stop_sequence: string | null;
  };
  usage: {
    output_tokens: number;
  };
}

// Handle message delta
for await (const event of stream) {
  if (event.type === 'message_delta') {
    console.log('Output tokens so far:', event.usage.output_tokens);

    if (event.delta.stop_reason) {
      console.log('Stop reason:', event.delta.stop_reason);
    }
  }
}
```

### MessageStopEvent

Fired when message generation completes.

```typescript
interface MessageStopEvent {
  type: 'message_stop';
}

// Handle message stop
for await (const event of stream) {
  if (event.type === 'message_stop') {
    console.log('\n[Message complete]');
  }
}
```

### ErrorEvent

Fired when an error occurs during streaming.

```typescript
interface ErrorEvent {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

// Handle errors
for await (const event of stream) {
  if (event.type === 'error') {
    console.error('Stream error:', event.error.message);
    break; // Stop processing
  }
}
```

## Stream Processing Patterns

### Collecting Full Text

```typescript
/**
 * Collect complete text while streaming
 */
async function streamAndCollect(prompt: string): Promise<string> {
  const stream = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
    stream: true,
  });

  let fullText = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        fullText += event.delta.text;
      }
    }
  }

  return fullText;
}

// Usage
const text = await streamAndCollect('Tell me a story.');
console.log('Complete text:', text);
```

### Progress Indicator

```typescript
/**
 * Show progress while streaming
 */
async function streamWithProgress(prompt: string) {
  const stream = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
    stream: true,
  });

  let chunkCount = 0;
  let totalChars = 0;

  process.stdout.write('Generating');

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        chunkCount++;
        totalChars += event.delta.text.length;

        // Show progress dots
        if (chunkCount % 5 === 0) {
          process.stdout.write('.');
        }
      }
    }
  }

  console.log(`\n\nReceived ${chunkCount} chunks, ${totalChars} characters`);
}
```

### Real-Time Token Counting

```typescript
/**
 * Track token usage in real-time
 */
async function streamWithTokenTracking(prompt: string) {
  const stream = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
    stream: true,
  });

  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    switch (event.type) {
      case 'message_start':
        inputTokens = event.message.usage.input_tokens;
        console.log(`Input tokens: ${inputTokens}`);
        break;

      case 'message_delta':
        outputTokens = event.usage.output_tokens;
        process.stdout.write(`\rOutput tokens: ${outputTokens}`);
        break;

      case 'message_stop':
        console.log(`\nTotal tokens: ${inputTokens + outputTokens}`);
        break;
    }
  }
}
```

### Partial Result Processing

```typescript
/**
 * Process results before complete
 */
async function streamWithEarlyProcessing(prompt: string) {
  const stream = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt: 'List 10 programming languages, one per line.',
    stream: true,
  });

  let buffer = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        buffer += event.delta.text;

        // Process complete lines as they arrive
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) {
            console.log('Found language:', line.trim());
            // Can process immediately without waiting for full response
          }
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    console.log('Found language:', buffer.trim());
  }
}
```

## Advanced Patterns

### Streaming with Client

```typescript
/**
 * Stream responses with ClaudeSDKClient (maintains conversation state)
 */
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// First message (streamed)
console.log('You: Hello!');
process.stdout.write('Agent: ');

const stream1 = await client.query({
  prompt: 'Hello!',
  stream: true,
});

for await (const event of stream1) {
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text);
    }
  }
}

console.log('\n');

// Follow-up message (still streamed, remembers context)
console.log('You: What did I just say?');
process.stdout.write('Agent: ');

const stream2 = await client.query({
  prompt: 'What did I just say?',
  stream: true,
});

for await (const event of stream2) {
  if (event.type === 'content_block_delta') {
    if (event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text);
    }
  }
}
```

### Cancellable Streaming

```typescript
/**
 * Cancel streaming mid-generation
 */
import { AbortController } from 'node-abort-controller';

async function cancellableStream(prompt: string) {
  const controller = new AbortController();

  // Cancel after 5 seconds
  setTimeout(() => {
    console.log('\nCancelling stream...');
    controller.abort();
  }, 5000);

  try {
    const stream = await query({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      prompt,
      stream: true,
      signal: controller.signal, // Pass abort signal
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          process.stdout.write(event.delta.text);
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('\nStream cancelled successfully');
    } else {
      throw error;
    }
  }
}
```

### Buffered Streaming

```typescript
/**
 * Buffer chunks before displaying (reduce flicker)
 */
async function bufferedStream(prompt: string) {
  const stream = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
    stream: true,
  });

  let buffer = '';
  const BUFFER_SIZE = 10; // Characters

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        buffer += event.delta.text;

        // Flush buffer when it reaches size
        if (buffer.length >= BUFFER_SIZE) {
          process.stdout.write(buffer);
          buffer = '';
        }
      }
    }

    if (event.type === 'message_stop') {
      // Flush remaining buffer
      if (buffer) {
        process.stdout.write(buffer);
      }
    }
  }
}
```

### Multi-Event Handler

```typescript
/**
 * Handle all event types comprehensively
 */
async function comprehensiveStreamHandler(prompt: string) {
  const stream = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
    stream: true,
  });

  const stats = {
    messageId: '',
    model: '',
    inputTokens: 0,
    outputTokens: 0,
    stopReason: null as string | null,
    contentBlocks: 0,
    chunks: 0,
    totalChars: 0,
  };

  for await (const event of stream) {
    switch (event.type) {
      case 'message_start':
        stats.messageId = event.message.id;
        stats.model = event.message.model;
        stats.inputTokens = event.message.usage.input_tokens;
        console.log(`[Started: ${stats.messageId}]`);
        break;

      case 'content_block_start':
        stats.contentBlocks++;
        console.log(`[Block ${stats.contentBlocks} started]`);
        break;

      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          stats.chunks++;
          stats.totalChars += event.delta.text.length;
          process.stdout.write(event.delta.text);
        }
        break;

      case 'content_block_stop':
        console.log(`\n[Block complete]`);
        break;

      case 'message_delta':
        stats.outputTokens = event.usage.output_tokens;
        if (event.delta.stop_reason) {
          stats.stopReason = event.delta.stop_reason;
        }
        break;

      case 'message_stop':
        console.log('\n[Message complete]');
        console.log('Stats:', stats);
        break;

      case 'error':
        console.error('Error:', event.error.message);
        break;
    }
  }
}
```

## Error Handling

### Stream Error Recovery

```typescript
/**
 * Handle errors gracefully during streaming
 */
async function robustStream(prompt: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const stream = await query({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        prompt,
        stream: true,
      });

      let fullText = '';

      for await (const event of stream) {
        // Check for error events
        if (event.type === 'error') {
          throw new Error(`Stream error: ${event.error.message}`);
        }

        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            fullText += event.delta.text;
          }
        }
      }

      return fullText; // Success

    } catch (error) {
      if (error instanceof Error) {
        console.error(`Attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw error; // Give up after max retries
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Timeout Handling

```typescript
/**
 * Add timeout to streaming operations
 */
async function streamWithTimeout(prompt: string, timeoutMs = 30000) {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Stream timeout')), timeoutMs);
  });

  const streamPromise = (async () => {
    const stream = await query({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      prompt,
      stream: true,
    });

    let text = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          text += event.delta.text;
        }
      }
    }

    return text;
  })();

  return await Promise.race([streamPromise, timeoutPromise]);
}
```

## Performance Considerations

### Efficient Stream Processing

```typescript
/**
 * Minimize overhead in stream processing
 */
async function efficientStream(prompt: string) {
  const stream = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
    stream: true,
  });

  // Pre-allocate array for better performance
  const chunks: string[] = [];
  let chunkCount = 0;

  for await (const event of stream) {
    // Only process relevant events
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      chunks[chunkCount++] = event.delta.text;
    }
  }

  // Join once at end (more efficient than concatenating strings)
  return chunks.join('');
}
```

### Memory Management

```typescript
/**
 * Stream large responses without excessive memory usage
 */
async function streamToFile(prompt: string, outputPath: string) {
  const stream = await query({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    prompt,
    stream: true,
  });

  const writeStream = fs.createWriteStream(outputPath);

  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          // Write directly to file (no memory accumulation)
          writeStream.write(event.delta.text);
        }
      }
    }

    writeStream.end();
    console.log(`Response written to ${outputPath}`);

  } catch (error) {
    writeStream.end();
    throw error;
  }
}
```

## Common Pitfalls

### Not Handling All Event Types

```typescript
// Wrong: Only handling deltas
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    console.log(event.delta.text);
  }
  // Missing error handling!
}

// Correct: Handle errors and completion
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    console.log(event.delta.text);
  } else if (event.type === 'error') {
    console.error('Error:', event.error.message);
    break;
  } else if (event.type === 'message_stop') {
    console.log('\nComplete!');
  }
}
```

### Blocking the Event Loop

```typescript
// Wrong: Heavy processing in stream loop
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    // This blocks receiving next chunks!
    await heavyProcessing(event.delta.text);
  }
}

// Correct: Queue for async processing
const queue: string[] = [];

// Consumer (separate async function)
(async () => {
  while (true) {
    if (queue.length > 0) {
      const chunk = queue.shift()!;
      await heavyProcessing(chunk);
    } else {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
})();

// Producer (stream handler)
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    queue.push(event.delta.text); // Non-blocking
  }
}
```

### Not Collecting Full Text

```typescript
// Wrong: Only printing, can't access full text later
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    console.log(event.delta.text); // Just printing
  }
}
// No way to get full text!

// Correct: Collect while streaming
let fullText = '';

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    const chunk = event.delta.text;
    fullText += chunk; // Save
    console.log(chunk); // Print
  }
}

// Can use fullText after stream completes
console.log('Full text:', fullText);
```

## Troubleshooting

### Stream stops unexpectedly

**Cause:** Network error or connection drop

**Solution:**
```typescript
// Add retry logic
try {
  for await (const event of stream) {
    // Process events
  }
} catch (error) {
  console.error('Stream interrupted:', error);
  // Retry or handle gracefully
}
```

### Events arrive out of order

**Cause:** Buffering or network issues

**Solution:**
```typescript
// Events should arrive in order, but handle defensively
const eventLog: any[] = [];

for await (const event of stream) {
  eventLog.push({ type: event.type, timestamp: Date.now() });
  // Process event
}

// Verify order
console.log('Event order:', eventLog.map(e => e.type));
```

### Memory leaks with long streams

**Cause:** Accumulating all chunks in memory

**Solution:**
```typescript
// Process or discard chunks as you go
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    // Process chunk immediately
    processChunk(event.delta.text);
    // Don't accumulate
  }
}
```

## Next Steps

1. **Learn concepts:** [Sessions Concept](../concepts/sessions.md)
2. **Explore patterns:** [Query Pattern](./query-pattern.md) | [Client Pattern](./client-pattern.md)
3. **Build examples:** [Stateful Chatbot Example](../examples/stateful-chatbot.md)
4. **Review options:** [Options Reference](./options.md)

## Related Documentation

**Core Concepts:**
- [Sessions](../concepts/sessions.md) - Stateful conversation patterns
- [Cost Tracking](../concepts/cost-tracking.md) - Monitor token usage

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Query Pattern](./query-pattern.md) - Stateless usage
- [Client Pattern](./client-pattern.md) - Stateful usage
- [Options Reference](./options.md) - Configuration options

**Examples:**
- [Stateful Chatbot](../examples/stateful-chatbot.md) - Complete streaming example
- [Web API Agent](../examples/web-api-agent.md) - API integration
