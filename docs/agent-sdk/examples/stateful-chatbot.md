---
title: "Stateful Chatbot"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "multi-language"
difficulty: "intermediate"
example_type: "chatbot"
prerequisites:
  - "Completed setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)"
  - "Understanding of [Client Pattern](../typescript/client-pattern.md) or [Python Client](../python/client-pattern.md)"
next_steps:
  - "Add [Session Management](../concepts/sessions.md) for persistence"
  - "Implement [Cost Tracking](../concepts/cost-tracking.md) per conversation"
  - "Build [Multi-Tool Agent](./multi-tool-agent.md) with more capabilities"
related_guides:
  - ../typescript/client-pattern.md
  - ../python/client-pattern.md
  - ../concepts/sessions.md
  - ../typescript/setup.md
  - ../python/setup.md
tags:
  - complete-example
  - chatbot
  - stateful
  - conversation-memory
  - typescript
  - python
---

# Stateful Chatbot

## Overview

This example demonstrates how to build an interactive chatbot with conversation memory using the `ClaudeSDKClient`. It maintains context across multiple turns, allowing for natural, coherent conversations where the agent remembers previous exchanges.

## Problem Statement

You need an interactive chatbot that:

- Remembers previous messages in the conversation
- Maintains context across multiple turns
- Provides a natural, conversational experience
- Allows users to have back-and-forth dialogue
- Can be terminated gracefully

This is useful for customer support bots, personal assistants, interactive tutorials, and any application requiring multi-turn conversations.

## Prerequisites

### For TypeScript
- Node.js 18 or higher
- npm or yarn package manager
- Basic TypeScript knowledge
- See [TypeScript Setup Guide](../typescript/setup.md) and [Client Pattern](../typescript/client-pattern.md)

### For Python
- Python 3.8 or higher
- pip or uv package manager
- Basic Python knowledge
- See [Python Setup Guide](../python/setup.md) and [Client Pattern](../python/client-pattern.md)

### General Requirements
- ANTHROPIC_API_KEY environment variable
- Understanding of stateful conversations
- Basic async programming knowledge

## TypeScript Implementation

### Complete Code

```typescript
/**
 * Example: Stateful Chatbot with Conversation Memory
 *
 * Dependencies:
 * - @anthropic-ai/agent-sdk@^1.2.0
 * - zod@^3.22.0
 *
 * Install: npm install @anthropic-ai/agent-sdk zod
 *
 * Setup: export ANTHROPIC_API_KEY=your-api-key-here
 * Get your API key from: https://console.anthropic.com/
 */

import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';
import readline from 'readline';

// Define custom tools for the chatbot
const getWeather = tool({
  name: 'get_weather',
  description: 'Get the current weather for a location',
  input_schema: z.object({
    location: z.string().describe('City name or location'),
  }),
  handler: async (input) => {
    // Simulated weather data (in production, call a real weather API)
    const weather = {
      temperature: Math.floor(Math.random() * 30) + 10,
      condition: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
    };
    return `Weather in ${input.location}: ${weather.temperature}°C, ${weather.condition}`;
  },
});

const setReminder = tool({
  name: 'set_reminder',
  description: 'Set a reminder for the user',
  input_schema: z.object({
    task: z.string().describe('What to remind about'),
    time: z.string().describe('When to remind (e.g., "in 30 minutes", "tomorrow")'),
  }),
  handler: async (input) => {
    // Simulated reminder (in production, store in database or schedule)
    return `Reminder set: "${input.task}" for ${input.time}`;
  },
});

const searchKnowledge = tool({
  name: 'search_knowledge',
  description: 'Search the knowledge base for information',
  input_schema: z.object({
    query: z.string().describe('Search query'),
  }),
  handler: async (input) => {
    // Simulated knowledge base search
    const results = [
      'The Agent SDK supports TypeScript and Python',
      'Custom tools can be created using the tool() function',
      'Sessions maintain conversation history automatically',
    ];
    return `Search results for "${input.query}":\n${results.join('\n')}`;
  },
});

// Initialize the stateful client
let client: ClaudeSDKClient;

function initializeClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    console.error('Set it with: export ANTHROPIC_API_KEY=your-api-key-here');
    process.exit(1);
  }

  client = new ClaudeSDKClient({
    apiKey: process.env.ANTHROPIC_API_KEY,
    tools: [getWeather, setReminder, searchKnowledge],
    model: 'claude-3-5-sonnet-20241022',
  });

  console.log('✓ Chatbot initialized with conversation memory');
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\nYou: ',
});

// Display welcome message
function displayWelcome() {
  console.log('═'.repeat(60));
  console.log('  Stateful Chatbot - Conversation Memory Enabled');
  console.log('═'.repeat(60));
  console.log('\nI can help you with:');
  console.log('  • Check weather conditions');
  console.log('  • Set reminders');
  console.log('  • Search my knowledge base');
  console.log('  • Have natural conversations with context');
  console.log('\nType "exit" or "quit" to end the conversation');
  console.log('Press Ctrl+C to terminate');
  console.log('═'.repeat(60));
}

// Display conversation history summary
let messageCount = 0;

function displayStats() {
  console.log(`\n[Conversation: ${messageCount} exchanges]`);
}

// Handle user input
async function handleUserInput(userInput: string) {
  // Check for exit commands
  if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
    console.log('\nGoodbye! Thanks for chatting.');
    process.exit(0);
  }

  // Skip empty input
  if (!userInput.trim()) {
    rl.prompt();
    return;
  }

  try {
    console.log('\nAssistant: ', '');

    // Query the stateful client (maintains conversation history)
    const response = await client.query({
      prompt: userInput,
    });

    // Display the response
    console.log(response.text);

    messageCount++;
    displayStats();
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n✗ Error:', error.message);

      // Provide helpful error messages
      if (error.message.includes('API key')) {
        console.error('Check that your ANTHROPIC_API_KEY is valid');
      } else if (error.message.includes('rate limit')) {
        console.error('Rate limit reached. Please wait a moment before continuing.');
      }
    } else {
      console.error('\n✗ An unexpected error occurred');
    }
  }

  // Show prompt for next input
  rl.prompt();
}

// Handle graceful shutdown
function setupGracefulShutdown() {
  process.on('SIGINT', () => {
    console.log('\n\nReceived interrupt signal');
    console.log(`Total exchanges: ${messageCount}`);
    console.log('Goodbye!');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\nReceived termination signal');
    console.log('Shutting down gracefully...');
    process.exit(0);
  });
}

// Main function
async function main() {
  try {
    // Initialize the client
    initializeClient();

    // Display welcome message
    displayWelcome();

    // Setup graceful shutdown handlers
    setupGracefulShutdown();

    // Start the conversation loop
    console.log('\nStart chatting! The assistant will remember our conversation.');
    rl.prompt();

    // Handle each line of input
    rl.on('line', async (input: string) => {
      await handleUserInput(input);
    });

    // Handle readline close
    rl.on('close', () => {
      console.log('\nConversation ended');
      process.exit(0);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Initialization error:', error.message);
    } else {
      console.error('An unexpected error occurred during initialization');
    }
    process.exit(1);
  }
}

main();

/**
 * Expected output:
 * When you run: npx tsx stateful-chatbot.ts
 *
 * ════════════════════════════════════════════════════════════
 *   Stateful Chatbot - Conversation Memory Enabled
 * ════════════════════════════════════════════════════════════
 *
 * I can help you with:
 *   • Check weather conditions
 *   • Set reminders
 *   • Search my knowledge base
 *   • Have natural conversations with context
 *
 * Type "exit" or "quit" to end the conversation
 * Press Ctrl+C to terminate
 * ════════════════════════════════════════════════════════════
 * ✓ Chatbot initialized with conversation memory
 *
 * Start chatting! The assistant will remember our conversation.
 *
 * You: Hi! My name is Alex.
 *
 * Assistant: Hello Alex! It's nice to meet you. I'm here to help you
 * with weather information, reminders, knowledge searches, and general
 * conversation. How can I assist you today?
 *
 * [Conversation: 1 exchanges]
 *
 * You: What's the weather in Paris?
 *
 * Assistant: Let me check the weather in Paris for you.
 * The current weather in Paris is 22°C and partly cloudy.
 *
 * [Conversation: 2 exchanges]
 *
 * You: Could you remind me about that later?
 *
 * Assistant: I'll set a reminder for you about the Paris weather.
 * Reminder set: "Check weather in Paris" for later today.
 *
 * [Conversation: 3 exchanges]
 *
 * You: Thanks! What was my name again?
 *
 * Assistant: Your name is Alex! I remember from when you introduced
 * yourself at the beginning of our conversation.
 *
 * [Conversation: 4 exchanges]
 */
```

## Python Implementation

### Installation

```bash
# Create project directory
mkdir chatbot
cd chatbot

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install claude-agent-sdk python-dotenv
```

### Complete Code

```python
"""
Example: Stateful Chatbot with Conversation Memory

Dependencies:
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0

Install: pip install claude-agent-sdk python-dotenv

Setup:
export ANTHROPIC_API_KEY=your-api-key-here
Get your API key from: https://console.anthropic.com/

Python 3.8+ required
"""

import os
import sys
import asyncio
import signal
from typing import Any
from claude_agent_sdk import ClaudeSDKClient, tool
from dotenv import load_dotenv

load_dotenv()

# Define custom tools
@tool
async def get_weather(args: dict[str, Any]) -> dict[str, Any]:
    """Get current weather for a location."""
    import random
    location = args.get('location', 'Unknown')
    temp = random.randint(10, 35)
    conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy']
    condition = random.choice(conditions)

    return {
        "content": [{
            "type": "text",
            "text": f"Weather in {location}: {temp}°C, {condition}"
        }]
    }

@tool
async def set_reminder(args: dict[str, Any]) -> dict[str, Any]:
    """Set a reminder for the user."""
    task = args.get('task', '')
    time = args.get('time', '')

    return {
        "content": [{
            "type": "text",
            "text": f"Reminder set: \"{task}\" for {time}"
        }]
    }

@tool
async def search_knowledge(args: dict[str, Any]) -> dict[str, Any]:
    """Search the knowledge base."""
    query = args.get('query', '')
    results = [
        'The Agent SDK supports TypeScript and Python',
        'Custom tools can be created using decorators',
        'Sessions maintain conversation history automatically',
    ]

    return {
        "content": [{
            "type": "text",
            "text": f"Search results for \"{query}\":\\n" + "\\n".join(results)
        }]
    }

# Global state
message_count = 0
should_exit = False

def display_welcome():
    """Display welcome message."""
    print('=' * 60)
    print('  Stateful Chatbot - Conversation Memory Enabled')
    print('=' * 60)
    print('\\nI can help you with:')
    print('  • Check weather conditions')
    print('  • Set reminders')
    print('  • Search my knowledge base')
    print('  • Have natural conversations with context')
    print('\\nType "exit" or "quit" to end the conversation')
    print('Press Ctrl+C to terminate')
    print('=' * 60)

def display_stats():
    """Display conversation statistics."""
    print(f'\\n[Conversation: {message_count} exchanges]')

def signal_handler(sig, frame):
    """Handle graceful shutdown."""
    global should_exit
    print('\\n\\nReceived interrupt signal')
    print(f'Total exchanges: {message_count}')
    print('Goodbye!')
    should_exit = True
    sys.exit(0)

async def handle_user_input(client: ClaudeSDKClient, user_input: str):
    """Process user input and get response."""
    global message_count

    # Check for exit commands
    if user_input.lower() in ['exit', 'quit']:
        print('\\nGoodbye! Thanks for chatting.')
        return False

    # Skip empty input
    if not user_input.strip():
        return True

    try:
        print('\\nAssistant: ', end='', flush=True)

        # Query the stateful client
        response = await client.query(prompt=user_input)

        print(response.text)
        message_count += 1
        display_stats()

    except ValueError as e:
        print(f'\\n✗ Configuration error: {e}', file=sys.stderr)
    except Exception as e:
        error_msg = str(e)
        print(f'\\n✗ Error: {error_msg}', file=sys.stderr)

        if 'API key' in error_msg:
            print('Check that your ANTHROPIC_API_KEY is valid', file=sys.stderr)
        elif 'rate limit' in error_msg:
            print('Rate limit reached. Please wait before continuing.', file=sys.stderr)

    return True

async def main():
    """Main chatbot loop."""
    # Setup signal handler
    signal.signal(signal.SIGINT, signal_handler)

    # Validate API key
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print('Error: ANTHROPIC_API_KEY environment variable required', file=sys.stderr)
        print('Set it with: export ANTHROPIC_API_KEY=your-api-key-here', file=sys.stderr)
        sys.exit(1)

    # Initialize stateful client with context manager
    async with ClaudeSDKClient(
        api_key=api_key,
        tools=[get_weather, set_reminder, search_knowledge],
        model='claude-3-5-sonnet-20241022'
    ) as client:
        print('✓ Chatbot initialized with conversation memory')
        display_welcome()
        print('\\nStart chatting! The assistant will remember our conversation.')

        # Main conversation loop
        while True:
            try:
                # Get user input (blocking, but in async context)
                user_input = await asyncio.get_event_loop().run_in_executor(
                    None, input, '\\nYou: '
                )

                # Process input
                should_continue = await handle_user_input(client, user_input)
                if not should_continue:
                    break

            except EOFError:
                print('\\nConversation ended')
                break
            except KeyboardInterrupt:
                print('\\n\\nInterrupted')
                break

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\\nGoodbye!')
        sys.exit(0)

"""
Expected output:
When you run: python stateful-chatbot.py

====================================================
  Stateful Chatbot - Conversation Memory Enabled
====================================================

I can help you with:
  • Check weather conditions
  • Set reminders
  • Search my knowledge base
  • Have natural conversations with context

Type "exit" or "quit" to end the conversation
Press Ctrl+C to terminate
====================================================
✓ Chatbot initialized with conversation memory

Start chatting! The assistant will remember our conversation.

You: Hi! My name is Alex.

Assistant: Hello Alex\! It's nice to meet you. I'm here to help you
with weather information, reminders, knowledge searches, and general
conversation. How can I assist you today?

[Conversation: 1 exchanges]

You: What's the weather in Paris?

Assistant: Let me check the weather in Paris for you.
The current weather in Paris is 22°C and partly cloudy.

[Conversation: 2 exchanges]

You: Thanks\! What was my name again?

Assistant: Your name is Alex\! I remember from when you introduced
yourself at the beginning of our conversation.

[Conversation: 3 exchanges]
"""
```

### Running the Python Version

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key-here

# Save the code to stateful-chatbot.py
# Run the chatbot:
python stateful-chatbot.py
```

### Try these conversation flows

**Test conversation memory:**
```
You: My favorite color is blue
Assistant: [acknowledges]
You: What's my favorite color?
Assistant: Your favorite color is blue! [remembers from earlier]
```

**Test tools:**
```
You: What's the weather in Tokyo?
Assistant: [uses get_weather tool]
You: Remind me to check that tomorrow
Assistant: [uses set_reminder tool, references previous weather query]
```

**Test context:**
```
You: Tell me about the Agent SDK
Assistant: [uses search_knowledge tool]
You: Can you explain more about that?
Assistant: [understands "that" refers to Agent SDK from previous message]
```

## How It Works

This example demonstrates several key concepts across both language implementations:

1. **Stateful Client**:
   - TypeScript: `ClaudeSDKClient` instance maintains conversation history
   - Python: `ClaudeSDKClient` with async context manager (`async with`)
   - Both automatically track messages and context

2. **Interactive Loop**:
   - TypeScript: Uses Node.js `readline` interface for terminal input
   - Python: Uses `asyncio.get_event_loop().run_in_executor()` for async input
   - Both handle graceful shutdown (Ctrl+C, exit commands)

3. **Conversation Memory**:
   - Client automatically maintains message history
   - References to previous exchanges work naturally
   - Context carries through the entire conversation

4. **Tool Integration**:
   - TypeScript: `tool()` function with Zod schemas
   - Python: `@tool` decorator with type hints
   - Tools can reference conversation context

5. **Signal Handling**:
   - TypeScript: `process.on('SIGINT')` and `process.on('SIGTERM')`
   - Python: `signal.signal(signal.SIGINT, handler)`
   - Both display conversation statistics on exit

The stateful client is perfect for:
- Multi-turn conversations requiring context
- Interactive applications
- Customer support bots
- Personal assistants
- Educational/tutorial applications

## Key Concepts Demonstrated

- **Stateful Conversations**: Using `ClaudeSDKClient` instead of stateless `query()`
- **Conversation Memory**: Automatic message history tracking
- **Interactive Loop**: Terminal-based user input handling
- **Custom Tools**: Weather, reminders, knowledge search
- **Graceful Shutdown**: Proper cleanup and exit handling
- **Error Handling**: User-friendly error messages
- **Context Awareness**: Agent remembers previous exchanges

## Next Steps

- Add conversation history persistence (save to database)
- Implement conversation summaries for long sessions
- Add conversation branching (save/load different conversations)
- Integrate with web interface (WebSocket for real-time)
- Add more sophisticated tools (file operations, web search)
- Implement conversation analytics (track common queries)
- Add streaming responses for real-time output (see [Streaming Guide](../typescript/streaming.md))

## Related Documentation

**Core Concepts:**
- [Sessions & Conversation Management](../concepts/sessions.md) - How conversation state works
- [Tools Overview](../concepts/tools.md) - Custom tool creation

**TypeScript:**
- [Client Pattern](../typescript/client-pattern.md) - Stateful client usage
- [Setup Guide](../typescript/setup.md) - Initial configuration
- [Streaming](../typescript/streaming.md) - Real-time response streaming

**Python:**
- [Client Pattern](../python/client-pattern.md) - Async context managers
- [Setup Guide](../python/setup.md) - Python SDK configuration
- [Async Patterns](../python/async-patterns.md) - Event loop and async/await

**Similar Examples:**
- [Simple CLI Agent](./simple-cli-agent.md) - Stateless single-shot queries
- [Web API Agent](./web-api-agent.md) - HTTP API interface
- [Multi-Tool Agent](./multi-tool-agent.md) - Complex tool coordination
