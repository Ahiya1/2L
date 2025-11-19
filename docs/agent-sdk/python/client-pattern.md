---
title: "Client Pattern - Stateful Conversations"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "python"
difficulty: "intermediate"
prerequisites:
  - "Completed [Python Setup](./setup.md)"
  - "Understanding of [Query Pattern](./query-pattern.md)"
  - "Familiarity with async context managers"
next_steps:
  - "Build [Stateful Chatbot Example](../examples/stateful-chatbot.md)"
  - "Learn [Session Management](../concepts/sessions.md)"
  - "Explore [Async Patterns](./async-patterns.md) for advanced usage"
related_guides:
  - query-pattern.md
  - custom-tools.md
  - ../concepts/sessions.md
  - ../typescript/client-pattern.md
tags:
  - client
  - stateful
  - conversations
  - sessions
  - memory
  - async
---

# Client Pattern - Stateful Conversations

## Overview

This guide covers the `ClaudeSDKClient` class in the Python Agent SDK. `ClaudeSDKClient` provides stateful, multi-turn conversation capabilities with Python's async context manager pattern. Unlike the stateless `query()` function, the client maintains conversation history and context across multiple interactions, making it ideal for chatbots, assistants, and any application requiring conversational memory.

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
- Familiarity with async/await and async context managers
- Python 3.8+ with asyncio

## Basic Pattern

### Minimal Example

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def main():
    # Initialize client with context manager
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        # First message
        response1 = await client.query(
            prompt='My favorite color is blue.'
        )

        # Follow-up - client remembers context
        response2 = await client.query(
            prompt='What is my favorite color?'
        )

        print(response2.text)
        # Output: "Your favorite color is blue."

if __name__ == '__main__':
    asyncio.run(main())
```

### Multi-Turn Conversation

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def conversation():
    """
    Multi-turn conversation with context.
    """
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        # Turn 1
        r1 = await client.query(prompt='I have 3 apples.')
        print('Agent:', r1.text)

        # Turn 2 - references previous context
        r2 = await client.query(
            prompt='I buy 2 more. How many do I have now?'
        )
        print('Agent:', r2.text)
        # Output: "You now have 5 apples."

        # Turn 3 - still remembers original count
        r3 = await client.query(
            prompt='If I give away half, how many remain?'
        )
        print('Agent:', r3.text)
        # Output: "You would have 2.5 apples remaining..."

if __name__ == '__main__':
    asyncio.run(conversation())
```

## Complete Example

```python
"""
Example: Interactive chatbot with conversation memory

Dependencies:
- claude-agent-sdk>=1.2.0
- python-dotenv>=1.0.0

Install: pip install claude-agent-sdk python-dotenv
Setup: export ANTHROPIC_API_KEY=your-api-key-here

Python 3.8+ required
"""

import os
import sys
import asyncio
from claude_agent_sdk import ClaudeSDKClient
from dotenv import load_dotenv

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
            'Get your API key from: https://console.anthropic.com/'
        )

    return api_key

async def run_chatbot():
    """
    Create chatbot with memory using async context manager.
    """
    # Initialize client (maintains conversation state)
    async with ClaudeSDKClient(
        api_key=get_api_key(),
        model='claude-3-5-sonnet-20241022'
    ) as client:
        print('Chatbot ready! Type your messages (or "quit" to exit).\n')

        # Conversation loop
        while True:
            # Get user input
            try:
                user_message = input('You: ')
            except EOFError:
                break

            # Check for exit
            if user_message.lower() in ['quit', 'exit']:
                break

            try:
                # Send message to agent (client remembers history)
                response = await client.query(prompt=user_message)

                print(f'Agent: {response.text}\n')

                # Log token usage
                total_tokens = (
                    response.usage.input_tokens +
                    response.usage.output_tokens
                )
                print(f'[Tokens used: {total_tokens}]\n')

            except Exception as e:
                error_msg = str(e)

                if 'rate limit' in error_msg:
                    print('Rate limit hit. Waiting before retry...\n')
                    await asyncio.sleep(5)
                else:
                    print(f'Error: {error_msg}\n', file=sys.stderr)

        print('Goodbye!')

async def main():
    """Main async entry point."""
    try:
        await run_chatbot()
    except ValueError as e:
        print(f'Configuration error: {e}', file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f'Fatal error: {str(e)}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())

"""
Expected interaction:

You: My name is Alice and I like programming.
Agent: Nice to meet you, Alice! Programming is a wonderful hobby...

You: What's my name?
Agent: Your name is Alice.

You: What do I enjoy?
Agent: You mentioned that you like programming.
"""
```

## Client Initialization

### Basic Initialization

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def main():
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        # Use client
        response = await client.query(prompt='Hello!')
        print(response.text)

if __name__ == '__main__':
    asyncio.run(main())
```

### With Configuration

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def main():
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        model='claude-3-5-sonnet-20241022',
        temperature=0.7,
        max_tokens=2000
    ) as client:
        # Use configured client
        response = await client.query(prompt='Explain Python.')
        print(response.text)

if __name__ == '__main__':
    asyncio.run(main())
```

### With Custom Tools

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient, tool
from typing import Any, Dict

# Define custom tool
@tool
async def calculator(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform mathematical calculations.

    Args:
        args: Dictionary with 'expression' key

    Returns:
        Result dictionary for Claude
    """
    try:
        result = eval(args['expression'])
        return {
            "content": [{
                "type": "text",
                "text": f"Result: {result}"
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }]
        }

async def main():
    # Initialize client with tool
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        tools=[calculator]
    ) as client:
        response = await client.query(
            prompt='What is 15 * 7?'
        )
        print(response.text)

if __name__ == '__main__':
    asyncio.run(main())
```

## Conversation History

### Accessing Message History

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def main():
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        # Have a conversation
        await client.query(prompt='Hello!')
        await client.query(prompt='Tell me a joke.')
        await client.query(prompt='Explain it.')

        # Access full message history
        history = client.get_messages()

        print(f'Total messages: {len(history)}')
        for i, msg in enumerate(history):
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            print(f'{i + 1}. {role}: {content[:50]}...')

if __name__ == '__main__':
    asyncio.run(main())
```

### Clearing History

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def main():
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        # Have some conversation
        await client.query(prompt='Remember this: code is 1234')

        # Clear conversation history
        client.clear_history()

        # Previous context is forgotten
        response = await client.query(prompt='What was the code?')
        print(response.text)
        # Output: "I don't have any previous information about a code."

if __name__ == '__main__':
    asyncio.run(main())
```

### History Size Management

```python
"""
Monitor and manage conversation history size
"""
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def managed_conversation():
    """
    Conversation with automatic history management.
    """
    MAX_MESSAGES = 20

    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        async def send_message(prompt: str):
            """Send message with history management."""
            # Check history size
            history = client.get_messages()

            if len(history) >= MAX_MESSAGES:
                print('History limit reached. Clearing old messages...')
                client.clear_history()

            # Send message
            return await client.query(prompt=prompt)

        # Use managed sending
        await send_message('Hello!')
        await send_message('How are you?')

if __name__ == '__main__':
    asyncio.run(managed_conversation())
```

## Session Management

### Saving Session State

```python
"""
Save conversation to file
"""
import asyncio
import json
from pathlib import Path
from claude_agent_sdk import ClaudeSDKClient

async def save_session(client: ClaudeSDKClient, filename: str):
    """
    Save conversation to JSON file.

    Args:
        client: Active client
        filename: File path to save to
    """
    history = client.get_messages()

    Path(filename).write_text(
        json.dumps(history, indent=2),
        encoding='utf-8'
    )

    print(f'Session saved to {filename}')

async def main():
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        await client.query(prompt='My favorite food is pizza.')
        await save_session(client, './session.json')

if __name__ == '__main__':
    asyncio.run(main())
```

### Restoring Session State

```python
"""
Restore conversation from file
"""
import asyncio
import json
from pathlib import Path
from claude_agent_sdk import ClaudeSDKClient

async def load_session(filename: str) -> ClaudeSDKClient:
    """
    Restore conversation from JSON file.

    Args:
        filename: File path to load from

    Returns:
        Client with restored history
    """
    client = ClaudeSDKClient(api_key=os.getenv('ANTHROPIC_API_KEY'))

    try:
        data = Path(filename).read_text(encoding='utf-8')
        history = json.loads(data)

        # Restore message history
        client.load_history(history)

        print(f'Session restored from {filename}')
        return client

    except FileNotFoundError:
        print(f'No session file found at {filename}')
        return client

async def main():
    client = await load_session('./session.json')

    async with client:
        # Continue previous conversation
        response = await client.query(prompt='What is my favorite food?')
        print(response.text)
        # Output: "Your favorite food is pizza."

if __name__ == '__main__':
    asyncio.run(main())
```

### Session Persistence with Database

```python
"""
Store sessions in database (example with dictionary)
"""
from typing import Dict, Optional, List, Any
from claude_agent_sdk import ClaudeSDKClient

class SessionStore:
    """Simple in-memory session store."""

    def __init__(self):
        self.sessions: Dict[str, List[Any]] = {}

    def save_session(
        self,
        session_id: str,
        client: ClaudeSDKClient
    ):
        """
        Save client session.

        Args:
            session_id: Unique session identifier
            client: Client to save
        """
        history = client.get_messages()
        self.sessions[session_id] = history

    def load_session(
        self,
        session_id: str
    ) -> Optional[ClaudeSDKClient]:
        """
        Load client session.

        Args:
            session_id: Session identifier

        Returns:
            Client with restored history or None
        """
        history = self.sessions.get(session_id)

        if not history:
            return None

        client = ClaudeSDKClient(
            api_key=os.getenv('ANTHROPIC_API_KEY')
        )
        client.load_history(history)

        return client

    def delete_session(self, session_id: str):
        """Delete session."""
        self.sessions.pop(session_id, None)

# Usage
async def main():
    store = SessionStore()

    # Save session
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        await client.query(prompt='Hello!')
        store.save_session('user-123', client)

    # Later: restore session
    restored_client = store.load_session('user-123')
    if restored_client:
        async with restored_client:
            await restored_client.query(prompt='Continue conversation')
```

## Advanced Patterns

### Multi-Client Management

```python
"""
Manage multiple independent conversations
"""
from typing import Dict
from claude_agent_sdk import ClaudeSDKClient

class ConversationManager:
    """Manage multiple user conversations."""

    def __init__(self):
        self.clients: Dict[str, ClaudeSDKClient] = {}

    def get_client(self, user_id: str) -> ClaudeSDKClient:
        """
        Get or create client for user.

        Args:
            user_id: Unique user identifier

        Returns:
            Client for user
        """
        if user_id not in self.clients:
            self.clients[user_id] = ClaudeSDKClient(
                api_key=os.getenv('ANTHROPIC_API_KEY')
            )

        return self.clients[user_id]

    async def send_message(
        self,
        user_id: str,
        prompt: str
    ) -> str:
        """
        Send message for specific user.

        Args:
            user_id: User identifier
            prompt: Message to send

        Returns:
            Response text
        """
        client = self.get_client(user_id)

        async with client:
            response = await client.query(prompt=prompt)
            return response.text

    def clear_conversation(self, user_id: str):
        """Clear user's conversation."""
        client = self.clients.get(user_id)
        if client:
            client.clear_history()

# Usage
async def main():
    manager = ConversationManager()

    # User A's conversation
    await manager.send_message('user-A', 'My name is Alice.')

    # User B's conversation (independent)
    await manager.send_message('user-B', 'My name is Bob.')

    # Each user has isolated conversation
    response_a = await manager.send_message('user-A', 'What is my name?')
    # "Your name is Alice."

    response_b = await manager.send_message('user-B', 'What is my name?')
    # "Your name is Bob."
```

## Common Pitfalls

### Not Using Async Context Manager

```python
# Wrong: Manual resource management
async def wrong_approach():
    client = ClaudeSDKClient(api_key=os.getenv('ANTHROPIC_API_KEY'))
    response = await client.query(prompt='Hello')
    # Forgot to clean up!

# Correct: Use async context manager
async def correct_approach():
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        response = await client.query(prompt='Hello')
        # Automatic cleanup on exit
```

### Sharing Client Across Users

```python
# Wrong: One client for all users (conversations mix!)
shared_client = None

async def handle_user_a():
    global shared_client
    async with ClaudeSDKClient(...) as client:
        shared_client = client
        await client.query(prompt='My name is Alice.')

async def handle_user_b():
    # This query sees Alice's message!
    async with shared_client:
        r = await shared_client.query(prompt='What is my name?')
        # Could get "Your name is Alice" (wrong!)

# Correct: One client per user
clients = {}

def get_client_for_user(user_id: str) -> ClaudeSDKClient:
    if user_id not in clients:
        clients[user_id] = ClaudeSDKClient(
            api_key=os.getenv('ANTHROPIC_API_KEY')
        )
    return clients[user_id]
```

### Not Clearing History

```python
# Wrong: History grows unbounded
async def unbounded_history():
    async with ClaudeSDKClient(...) as client:
        # After thousands of messages, performance degrades
        for i in range(10000):
            await client.query(prompt=f'Message {i}')
            # Context window will eventually overflow!

# Correct: Periodically clear or trim history
async def managed_history():
    async with ClaudeSDKClient(...) as client:
        for i in range(10000):
            await client.query(prompt=f'Message {i}')

            if i % 100 == 0:
                client.clear_history()  # Reset every 100 messages
```

## Troubleshooting

### Context overflow errors

**Cause:** Too many tokens in conversation history

**Solution:**
```python
# Monitor and trim history
history = client.get_messages()
if len(history) > 50:
    client.clear_history()
    # Or keep only recent messages
```

### Lost conversation state

**Cause:** Not saving/restoring client properly

**Solution:**
```python
# Save before server restart
history = client.get_messages()
Path('session.json').write_text(json.dumps(history))

# Restore after restart
history = json.loads(Path('session.json').read_text())
client.load_history(history)
```

## TypeScript Comparison

For developers familiar with TypeScript:

| Feature | TypeScript | Python |
|---------|-----------|--------|
| **Resource cleanup** | try-finally | async with (context manager) |
| **Client creation** | new ClaudeSDKClient() | ClaudeSDKClient() |
| **Async syntax** | async function | async def |
| **Error handling** | try-catch | try-except |

Python's `async with` is cleaner than TypeScript's try-finally pattern.

See [TypeScript Client Pattern](../typescript/client-pattern.md) for comparison.

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
- [Async Patterns](./async-patterns.md) - Async iteration

**Comparison:**
- [TypeScript Client Pattern](../typescript/client-pattern.md) - Compare approaches

**Examples:**
- [Stateful Chatbot](../examples/stateful-chatbot.md) - Complete example
- [Web API Agent](../examples/web-api-agent.md) - HTTP integration
