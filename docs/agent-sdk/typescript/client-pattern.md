---
title: "Client Pattern - Stateful Conversations"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "typescript"
difficulty: "intermediate"
prerequisites:
  - "Completed [TypeScript Setup](./setup.md)"
  - "Understanding of [Query Pattern](./query-pattern.md)"
next_steps:
  - "Build [Stateful Chatbot Example](../examples/stateful-chatbot.md)"
  - "Learn [Session Management](../concepts/sessions.md)"
  - "Explore [Hooks](../concepts/hooks.md) for advanced control"
related_guides:
  - query-pattern.md
  - custom-tools.md
  - ../concepts/sessions.md
tags:
  - client
  - stateful
  - conversations
  - sessions
  - memory
---

# Client Pattern - Stateful Conversations

## Overview

`ClaudeSDKClient` provides stateful, multi-turn conversation capabilities. Unlike the stateless `query()` function, the client maintains conversation history and context across multiple interactions, making it ideal for chatbots, assistants, and any application requiring conversational memory.

## When to Use

Use the Client pattern when:
- **Multi-turn conversations:** Follow-up questions that reference previous context
- **Chatbots:** Interactive assistants with memory
- **Context matters:** Responses depend on conversation history
- **Session management:** Need to save/restore conversations
- **Complex interactions:** Multiple exchanges to complete a task

**Don't use Client when:**
- Single, independent requests → Use [Query Pattern](./query-pattern.md)
- No conversation memory needed → Use [Query Pattern](./query-pattern.md)
- Serverless/stateless architecture → Use [Query Pattern](./query-pattern.md)

## Prerequisites

- Completed [Setup Guide](./setup.md)
- Understanding of [Query Pattern](./query-pattern.md)
- Familiarity with async/await and TypeScript classes

## Basic Pattern

### Minimal Example

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

// Initialize client
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// First message
const response1 = await client.query({
  prompt: 'My favorite color is blue.',
});

// Follow-up - client remembers context
const response2 = await client.query({
  prompt: 'What is my favorite color?',
});

console.log(response2.text);
// Output: "Your favorite color is blue."
```

### Multi-Turn Conversation

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

async function conversation() {
  const client = new ClaudeSDKClient({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  // Turn 1
  const r1 = await client.query({
    prompt: 'I have 3 apples.',
  });
  console.log('Agent:', r1.text);

  // Turn 2 - references previous context
  const r2 = await client.query({
    prompt: 'I buy 2 more. How many do I have now?',
  });
  console.log('Agent:', r2.text);
  // Output: "You now have 5 apples."

  // Turn 3 - still remembers original count
  const r3 = await client.query({
    prompt: 'If I give away half, how many remain?',
  });
  console.log('Agent:', r3.text);
  // Output: "You would have 2.5 apples remaining..."
}
```

## Complete Example

```typescript
/**
 * Example: Interactive chatbot with conversation memory
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

// Create chatbot with memory
async function runChatbot() {
  // Initialize client (maintains conversation state)
  const client = new ClaudeSDKClient({
    apiKey: getApiKey(),
    model: 'claude-3-5-sonnet-20241022',
  });

  // Setup readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Chatbot ready! Type your messages (or "quit" to exit).\n');

  // Conversation loop
  let running = true;

  while (running) {
    // Get user input
    const userMessage = await new Promise<string>(resolve => {
      rl.question('You: ', answer => resolve(answer));
    });

    // Check for exit
    if (userMessage.toLowerCase() === 'quit') {
      running = false;
      break;
    }

    try {
      // Send message to agent (client remembers history)
      const response = await client.query({
        prompt: userMessage,
      });

      console.log(`Agent: ${response.text}\n`);

      // Log token usage
      const totalTokens = response.usage.inputTokens + response.usage.outputTokens;
      console.log(`[Tokens used: ${totalTokens}]\n`);

    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);

        // Check for specific errors
        if (error.message.includes('rate limit')) {
          console.log('Rate limit hit. Waiting before retry...\n');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }

  rl.close();
  console.log('Goodbye!');
}

// Run the chatbot
runChatbot().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Expected interaction:
 *
 * You: My name is Alice and I like programming.
 * Agent: Nice to meet you, Alice! Programming is a wonderful hobby...
 *
 * You: What's my name?
 * Agent: Your name is Alice.
 *
 * You: What do I enjoy?
 * Agent: You mentioned that you like programming.
 */
```

## Client Initialization

### Basic Initialization

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
```

### With Configuration

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 2000,
});
```

### With Custom Tools

```typescript
import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Define custom tool
const calculator = tool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  input_schema: z.object({
    expression: z.string(),
  }),
  handler: async (input) => {
    try {
      return String(eval(input.expression));
    } catch (error) {
      return 'Invalid expression';
    }
  },
});

// Initialize client with tool
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: [calculator],
});
```

## Conversation History

### Accessing Message History

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Have a conversation
await client.query({ prompt: 'Hello!' });
await client.query({ prompt: 'Tell me a joke.' });
await client.query({ prompt: 'Explain it.' });

// Access full message history
const history = client.getMessages();

console.log(`Total messages: ${history.length}`);
history.forEach((msg, i) => {
  console.log(`${i + 1}. ${msg.role}: ${msg.content}`);
});
```

### Clearing History

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';

const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Have some conversation
await client.query({ prompt: 'Remember this: code is 1234' });

// Clear conversation history
client.clearHistory();

// Previous context is forgotten
const response = await client.query({
  prompt: 'What was the code?',
});
console.log(response.text);
// Output: "I don't have any previous information about a code."
```

### History Size Management

```typescript
/**
 * Monitor and manage conversation history size
 */
async function managedConversation() {
  const client = new ClaudeSDKClient({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const MAX_MESSAGES = 20;

  async function sendMessage(prompt: string) {
    // Check history size
    const history = client.getMessages();

    if (history.length >= MAX_MESSAGES) {
      console.log('History limit reached. Clearing old messages...');
      client.clearHistory();
    }

    // Send message
    return await client.query({ prompt });
  }

  // Use managed sending
  await sendMessage('Hello!');
  await sendMessage('How are you?');
}
```

## Session Management

### Saving Session State

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/agent-sdk';
import fs from 'fs/promises';

/**
 * Save conversation to file
 */
async function saveSession(client: ClaudeSDKClient, filename: string) {
  const history = client.getMessages();

  await fs.writeFile(
    filename,
    JSON.stringify(history, null, 2),
    'utf-8'
  );

  console.log(`Session saved to ${filename}`);
}

// Usage
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

await client.query({ prompt: 'My favorite food is pizza.' });
await saveSession(client, './session.json');
```

### Restoring Session State

```typescript
/**
 * Restore conversation from file
 */
async function loadSession(filename: string): Promise<ClaudeSDKClient> {
  const client = new ClaudeSDKClient({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  try {
    const data = await fs.readFile(filename, 'utf-8');
    const history = JSON.parse(data);

    // Restore message history
    client.loadHistory(history);

    console.log(`Session restored from ${filename}`);
    return client;
  } catch (error) {
    console.error('Failed to load session:', error);
    return client;
  }
}

// Usage
const client = await loadSession('./session.json');

// Continue previous conversation
const response = await client.query({
  prompt: 'What is my favorite food?',
});
console.log(response.text);
// Output: "Your favorite food is pizza."
```

### Session Persistence with Database

```typescript
/**
 * Store sessions in database (example with simple object store)
 */
class SessionStore {
  private sessions = new Map<string, any[]>();

  saveSession(sessionId: string, client: ClaudeSDKClient) {
    const history = client.getMessages();
    this.sessions.set(sessionId, history);
  }

  loadSession(sessionId: string): ClaudeSDKClient | null {
    const history = this.sessions.get(sessionId);

    if (!history) return null;

    const client = new ClaudeSDKClient({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    client.loadHistory(history);

    return client;
  }

  deleteSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

// Usage
const store = new SessionStore();

// Save session
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
await client.query({ prompt: 'Hello!' });
store.saveSession('user-123', client);

// Later: restore session
const restoredClient = store.loadSession('user-123');
if (restoredClient) {
  await restoredClient.query({ prompt: 'Continue conversation' });
}
```

## Advanced Patterns

### Multi-Client Management

```typescript
/**
 * Manage multiple independent conversations
 */
class ConversationManager {
  private clients = new Map<string, ClaudeSDKClient>();

  getClient(userId: string): ClaudeSDKClient {
    if (!this.clients.has(userId)) {
      this.clients.set(
        userId,
        new ClaudeSDKClient({
          apiKey: process.env.ANTHROPIC_API_KEY!,
        })
      );
    }

    return this.clients.get(userId)!;
  }

  async sendMessage(userId: string, prompt: string): Promise<string> {
    const client = this.getClient(userId);
    const response = await client.query({ prompt });
    return response.text;
  }

  clearConversation(userId: string) {
    const client = this.clients.get(userId);
    client?.clearHistory();
  }
}

// Usage
const manager = new ConversationManager();

// User A's conversation
await manager.sendMessage('user-A', 'My name is Alice.');

// User B's conversation (independent)
await manager.sendMessage('user-B', 'My name is Bob.');

// Each user has isolated conversation
const responseA = await manager.sendMessage('user-A', 'What is my name?');
// "Your name is Alice."

const responseB = await manager.sendMessage('user-B', 'What is my name?');
// "Your name is Bob."
```

### Conversation Branching

```typescript
/**
 * Create conversation branches (save/restore points)
 */
class ConversationBranch {
  private client: ClaudeSDKClient;
  private savePoints = new Map<string, any[]>();

  constructor(apiKey: string) {
    this.client = new ClaudeSDKClient({ apiKey });
  }

  async query(prompt: string) {
    return await this.client.query({ prompt });
  }

  // Save current state
  createSavePoint(name: string) {
    const history = this.client.getMessages();
    this.savePoints.set(name, JSON.parse(JSON.stringify(history)));
    console.log(`Save point "${name}" created`);
  }

  // Restore to save point
  restoreSavePoint(name: string) {
    const history = this.savePoints.get(name);

    if (!history) {
      throw new Error(`Save point "${name}" not found`);
    }

    this.client.clearHistory();
    this.client.loadHistory(history);
    console.log(`Restored to save point "${name}"`);
  }
}

// Usage
const conversation = new ConversationBranch(process.env.ANTHROPIC_API_KEY!);

await conversation.query('Let\'s discuss TypeScript.');
conversation.createSavePoint('before-question');

// Branch 1: Ask about types
await conversation.query('Tell me about TypeScript types.');

// Restore and try different path
conversation.restoreSavePoint('before-question');

// Branch 2: Ask about async
await conversation.query('Tell me about async/await.');
```

### Context Window Management

```typescript
/**
 * Automatically manage context window size
 */
class ManagedClient {
  private client: ClaudeSDKClient;
  private maxContextTokens = 50000;

  constructor(apiKey: string) {
    this.client = new ClaudeSDKClient({ apiKey });
  }

  async query(prompt: string) {
    // Check if we need to trim history
    const history = this.client.getMessages();
    const estimatedTokens = this.estimateTokens(history);

    if (estimatedTokens > this.maxContextTokens) {
      console.log('Context window full. Trimming history...');
      this.trimHistory();
    }

    return await this.client.query({ prompt });
  }

  private estimateTokens(messages: any[]): number {
    // Rough estimation: 1 token ≈ 4 characters
    return messages.reduce((sum, msg) => {
      return sum + Math.ceil(msg.content.length / 4);
    }, 0);
  }

  private trimHistory() {
    const history = this.client.getMessages();

    // Keep system message and last 10 exchanges
    const systemMessages = history.filter(m => m.role === 'system');
    const recentMessages = history.slice(-20);

    this.client.clearHistory();
    this.client.loadHistory([...systemMessages, ...recentMessages]);
  }
}
```

## Performance Considerations

### Token Usage Tracking

```typescript
/**
 * Track cumulative token usage across conversation
 */
class TokenTrackingClient {
  private client: ClaudeSDKClient;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor(apiKey: string) {
    this.client = new ClaudeSDKClient({ apiKey });
  }

  async query(prompt: string) {
    const response = await this.client.query({ prompt });

    // Track usage
    this.totalInputTokens += response.usage.inputTokens;
    this.totalOutputTokens += response.usage.outputTokens;

    return response;
  }

  getUsage() {
    return {
      input: this.totalInputTokens,
      output: this.totalOutputTokens,
      total: this.totalInputTokens + this.totalOutputTokens,
    };
  }

  estimatedCost(inputPricePerMToken: number, outputPricePerMToken: number) {
    const inputCost = (this.totalInputTokens / 1_000_000) * inputPricePerMToken;
    const outputCost = (this.totalOutputTokens / 1_000_000) * outputPricePerMToken;
    return inputCost + outputCost;
  }
}

// Usage
const client = new TokenTrackingClient(process.env.ANTHROPIC_API_KEY!);

await client.query('Hello!');
await client.query('Tell me about TypeScript.');
await client.query('Give me an example.');

const usage = client.getUsage();
console.log(`Total tokens used: ${usage.total}`);

// Estimate cost (example rates)
const cost = client.estimatedCost(3, 15); // $3/$15 per million tokens
console.log(`Estimated cost: $${cost.toFixed(4)}`);
```

### Memory-Efficient History

```typescript
/**
 * Store only essential message data
 */
interface CompactMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

class CompactHistoryClient {
  private client: ClaudeSDKClient;
  private compactHistory: CompactMessage[] = [];

  constructor(apiKey: string) {
    this.client = new ClaudeSDKClient({ apiKey });
  }

  async query(prompt: string) {
    // Add to compact history
    this.compactHistory.push({
      role: 'user',
      text: prompt,
      timestamp: Date.now(),
    });

    const response = await this.client.query({ prompt });

    this.compactHistory.push({
      role: 'assistant',
      text: response.text,
      timestamp: Date.now(),
    });

    return response;
  }

  getCompactHistory() {
    return this.compactHistory;
  }
}
```

## Common Pitfalls

### Not Clearing History

```typescript
// Wrong: History grows unbounded
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// After thousands of messages, performance degrades
for (let i = 0; i < 10000; i++) {
  await client.query({ prompt: `Message ${i}` });
  // Context window will eventually overflow!
}

// Correct: Periodically clear or trim history
for (let i = 0; i < 10000; i++) {
  await client.query({ prompt: `Message ${i}` });

  if (i % 100 === 0) {
    client.clearHistory(); // Reset every 100 messages
  }
}
```

### Sharing Client Across Users

```typescript
// Wrong: One client for all users (conversations mix!)
const sharedClient = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

async function handleUserA() {
  await sharedClient.query({ prompt: 'My name is Alice.' });
}

async function handleUserB() {
  // This query sees Alice's message!
  const r = await sharedClient.query({ prompt: 'What is my name?' });
  // Could get "Your name is Alice" (wrong!)
}

// Correct: One client per user
const clientsMap = new Map<string, ClaudeSDKClient>();

function getClientForUser(userId: string): ClaudeSDKClient {
  if (!clientsMap.has(userId)) {
    clientsMap.set(userId, new ClaudeSDKClient({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    }));
  }
  return clientsMap.get(userId)!;
}
```

### Forgetting to Await

```typescript
// Wrong: Not awaiting query
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = client.query({ prompt: 'Hello' }); // Promise!
console.log(response.text); // undefined

// Correct: Always await
const response = await client.query({ prompt: 'Hello' });
console.log(response.text); // Works!
```

## Troubleshooting

### Context overflow errors

**Cause:** Too many tokens in conversation history

**Solution:**
```typescript
// Monitor and trim history
const history = client.getMessages();
if (history.length > 50) {
  client.clearHistory();
  // Or keep only recent messages
}
```

### Lost conversation state

**Cause:** Not saving/restoring client properly

**Solution:**
```typescript
// Save before server restart
const history = client.getMessages();
await fs.writeFile('session.json', JSON.stringify(history));

// Restore after restart
const history = JSON.parse(await fs.readFile('session.json', 'utf-8'));
client.loadHistory(history);
```

### Memory leaks with multiple clients

**Cause:** Not cleaning up unused clients

**Solution:**
```typescript
// Implement cleanup
const clients = new Map<string, ClaudeSDKClient>();

function cleanupInactiveClients() {
  // Remove clients inactive for > 1 hour
  const oneHourAgo = Date.now() - 3600000;

  for (const [userId, client] of clients) {
    if (client.lastActivity < oneHourAgo) {
      clients.delete(userId);
    }
  }
}

setInterval(cleanupInactiveClients, 300000); // Every 5 minutes
```

## Next Steps

1. **Add custom tools:** [Custom Tools Guide](./custom-tools.md)
2. **Configure options:** [Options Reference](./options.md)
3. **Explore sessions:** [Sessions Concept](../concepts/sessions.md)
4. **Build chatbot:** [Stateful Chatbot Example](../examples/stateful-chatbot.md)

## Related Documentation

**Core Concepts:**
- [Sessions](../concepts/sessions.md) - State management patterns
- [Tools](../concepts/tools.md) - Adding capabilities

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Query Pattern](./query-pattern.md) - Stateless alternative
- [Custom Tools](./custom-tools.md) - Tool creation
- [Streaming](./streaming.md) - Async response handling

**Examples:**
- [Stateful Chatbot](../examples/stateful-chatbot.md) - Complete example
- [Web API Agent](../examples/web-api-agent.md) - HTTP integration
