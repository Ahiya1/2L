---
title: "Query Pattern - Stateless Requests"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "python"
difficulty: "beginner"
prerequisites:
  - "Completed [Python Setup](./setup.md)"
  - "Basic Python async/await knowledge"
next_steps:
  - "Learn [Client Pattern](./client-pattern.md) for stateful conversations"
  - "Add [Custom Tools](./custom-tools.md) with @tool decorator"
  - "See [Simple CLI Agent](../examples/simple-cli-agent.md) example"
related_guides:
  - client-pattern.md
  - custom-tools.md
  - options.md
  - ../typescript/query-pattern.md
tags:
  - query
  - stateless
  - single-shot
  - pattern
  - async
---

# Query Pattern - Stateless Requests

## Overview

This guide covers the `query()` function in the Python Agent SDK. The `query()` function provides a stateless, single-shot way to interact with Claude. It's the simplest pattern in the Agent SDK - send a prompt, get a response, done. No conversation memory, no session management, just pure request-response with async/await.

## When to Use

Use the query pattern when:
- **One-off requests:** You need a single response without follow-up
- **Stateless operations:** Each request is independent
- **Simple tasks:** Quick questions, translations, summaries
- **Serverless functions:** AWS Lambda, Cloud Functions, serverless endpoints
- **Batch processing:** Process many independent items
- **No conversation needed:** Previous context doesn't matter

**Don't use query() when:**
- You need multi-turn conversations → Use [Client Pattern](./client-pattern.md)
- You need to maintain context → Use [Client Pattern](./client-pattern.md)
- You need session persistence → Use [Client Pattern](./client-pattern.md)

## Prerequisites

- Completed [Setup Guide](./setup.md)
- API key configured in environment
- Understanding of async/await in Python
- Python 3.8+ with asyncio

## Basic Pattern

### Minimal Example

```python
import asyncio
from claude_agent_sdk import query

async def main():
    response = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='What is the capital of France?'
    )

    print(response.text)
    # Output: "The capital of France is Paris."

if __name__ == '__main__':
    asyncio.run(main())
```

### With Error Handling

```python
import asyncio
import os
from claude_agent_sdk import query

async def ask_question(question: str) -> str:
    """
    Ask Claude a question using query pattern.

    Args:
        question: Question to ask

    Returns:
        Response text

    Raises:
        ValueError: If API key not found
        Exception: For other errors
    """
    try:
        response = await query(
            api_key=os.getenv('ANTHROPIC_API_KEY'),
            prompt=question
        )

        return response.text

    except Exception as e:
        print(f'Query failed: {str(e)}', file=sys.stderr)
        raise

# Usage
async def main():
    answer = await ask_question('Explain quantum computing in one sentence.')
    print(answer)

if __name__ == '__main__':
    asyncio.run(main())
```

## Complete Example

```python
"""
Example: Document summarizer using query pattern

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
from claude_agent_sdk import query
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

async def summarize_document(text: str) -> str:
    """
    Summarize document using Claude.

    Args:
        text: Document text to summarize

    Returns:
        Summary text

    Raises:
        ValueError: For API key errors
        Exception: For other errors
    """
    try:
        response = await query(
            api_key=get_api_key(),
            prompt=f'Summarize the following text in 2-3 sentences:\n\n{text}',
            model='claude-3-5-sonnet-20241022'
        )

        return response.text

    except Exception as e:
        # Check for specific error types
        error_msg = str(e)

        if 'API key' in error_msg:
            raise ValueError('Invalid API key. Please check your ANTHROPIC_API_KEY.')

        if 'rate limit' in error_msg:
            raise ValueError('Rate limit exceeded. Please wait before retrying.')

        # Re-throw unknown errors
        raise

async def main():
    """Main async entry point."""
    document = """
        TypeScript is a strongly typed programming language that builds on JavaScript.
        It adds optional static typing to the language, allowing developers to catch
        errors early in development. TypeScript compiles to plain JavaScript and can
        run anywhere JavaScript runs. It's widely used in large-scale applications
        for its improved maintainability and developer experience.
    """

    try:
        print('Summarizing document...\n')

        summary = await summarize_document(document)

        print('Summary:')
        print(summary)

    except ValueError as e:
        print(f'Configuration error: {e}', file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f'Error: {str(e)}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())

"""
Expected output:
Summarizing document...

Summary:
TypeScript is a strongly typed language that extends JavaScript with
optional static typing. It helps catch errors early and compiles to
plain JavaScript. It's popular for large applications due to better
maintainability.
"""
```

## Query Options

### Model Selection

```python
import asyncio
from claude_agent_sdk import query

async def main():
    # Fast, cost-effective model
    response1 = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='Quick question here',
        model='claude-3-haiku-20240307'
    )

    # Most capable model (default)
    response2 = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='Complex reasoning task',
        model='claude-3-5-sonnet-20241022'
    )

if __name__ == '__main__':
    asyncio.run(main())
```

**Available models:**
- `claude-3-5-sonnet-20241022` - Most capable (default)
- `claude-3-haiku-20240307` - Fast and cost-effective
- `claude-3-opus-20240229` - Highest capability

### Temperature Control

```python
import asyncio
from claude_agent_sdk import query

async def main():
    # Deterministic output (temperature = 0)
    factual = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='What is 2 + 2?',
        temperature=0
    )

    # Creative output (temperature = 1)
    creative = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='Write a creative story opening.',
        temperature=1
    )

if __name__ == '__main__':
    asyncio.run(main())
```

**Temperature guidelines:**
- `0` - Deterministic, consistent responses (factual tasks)
- `0.3-0.7` - Balanced creativity and consistency (default: 0.7)
- `1` - Maximum creativity and variation (creative writing)

### Maximum Tokens

```python
import asyncio
from claude_agent_sdk import query

async def main():
    # Short response
    brief = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='Explain AI in one sentence.',
        max_tokens=50
    )

    # Longer response
    detailed = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='Write a comprehensive guide to machine learning.',
        max_tokens=2000
    )

if __name__ == '__main__':
    asyncio.run(main())
```

## Response Structure

### Response Object

```python
import asyncio
from claude_agent_sdk import query

async def main():
    response = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='Hello!'
    )

    # Access response properties
    print('Text:', response.text)
    print('Stop reason:', response.stop_reason)
    print('Usage:', response.usage)

    # Python type hints
    # response.text: str
    # response.stop_reason: Literal['end_turn', 'max_tokens', 'stop_sequence']
    # response.usage.input_tokens: int
    # response.usage.output_tokens: int

if __name__ == '__main__':
    asyncio.run(main())
```

### Handling Stop Reasons

```python
import asyncio
from claude_agent_sdk import query

async def handle_response(prompt: str):
    """Handle different stop reasons."""
    response = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt=prompt,
        max_tokens=100
    )

    if response.stop_reason == 'end_turn':
        # Normal completion
        print('Complete response:', response.text)

    elif response.stop_reason == 'max_tokens':
        # Response truncated due to token limit
        print('Warning: Response truncated. Consider increasing max_tokens.')
        print('Partial response:', response.text)

    elif response.stop_reason == 'stop_sequence':
        # Custom stop sequence encountered
        print('Stopped at sequence:', response.text)

    # Log token usage
    total_tokens = response.usage.input_tokens + response.usage.output_tokens
    print(f'Tokens used: {total_tokens}')
```

## Advanced Patterns

### Batch Processing

```python
"""
Process multiple independent items with query pattern
"""
import asyncio
from typing import List
from claude_agent_sdk import query

async def process_batch(items: List[str]) -> List[str]:
    """
    Process items in parallel.

    Args:
        items: List of items to process

    Returns:
        List of results

    Note:
        Be mindful of rate limits when processing many items
    """
    api_key = os.getenv('ANTHROPIC_API_KEY')

    # Create tasks for parallel processing
    tasks = [
        query(
            api_key=api_key,
            prompt=f'Analyze sentiment: "{item}"'
        )
        for item in items
    ]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    return [r.text for r in responses]

async def main():
    tweets = [
        'I love this product!',
        'Terrible experience.',
        "It's okay, nothing special."
    ]

    sentiments = await process_batch(tweets)

    for tweet, sentiment in zip(tweets, sentiments):
        print(f'"{tweet}" → {sentiment}')

if __name__ == '__main__':
    asyncio.run(main())
```

### Retry Logic

```python
"""
Retry query on transient failures
"""
import asyncio
from claude_agent_sdk import query

async def query_with_retry(
    prompt: str,
    max_retries: int = 3
) -> str:
    """
    Query with exponential backoff retry.

    Args:
        prompt: Prompt to send
        max_retries: Maximum retry attempts

    Returns:
        Response text

    Raises:
        Exception: If all retries exhausted
    """
    api_key = os.getenv('ANTHROPIC_API_KEY')

    for attempt in range(1, max_retries + 1):
        try:
            response = await query(api_key=api_key, prompt=prompt)
            return response.text

        except Exception as e:
            is_last_attempt = attempt == max_retries
            error_msg = str(e)

            if 'rate limit' in error_msg:
                if is_last_attempt:
                    raise

                # Exponential backoff
                delay = 2 ** attempt
                print(f'Rate limited. Retrying in {delay}s...')
                await asyncio.sleep(delay)
                continue

            # Non-retryable error
            raise

    raise Exception('Max retries exceeded')
```

### Timeout Handling

```python
"""
Add timeout to query operations
"""
import asyncio
from claude_agent_sdk import query

async def query_with_timeout(
    prompt: str,
    timeout_seconds: float = 30.0
) -> str:
    """
    Query with timeout.

    Args:
        prompt: Prompt to send
        timeout_seconds: Timeout in seconds

    Returns:
        Response text

    Raises:
        asyncio.TimeoutError: If timeout exceeded
    """
    api_key = os.getenv('ANTHROPIC_API_KEY')

    try:
        response = await asyncio.wait_for(
            query(api_key=api_key, prompt=prompt),
            timeout=timeout_seconds
        )
        return response.text

    except asyncio.TimeoutError:
        raise asyncio.TimeoutError(f'Query timeout after {timeout_seconds}s')
```

### Prompt Validation

```python
"""
Validate prompts before sending
"""
def validate_prompt(prompt: str) -> None:
    """
    Validate prompt before sending.

    Args:
        prompt: Prompt to validate

    Raises:
        ValueError: If prompt is invalid
    """
    if not prompt or not prompt.strip():
        raise ValueError('Prompt cannot be empty')

    if len(prompt) > 100000:
        raise ValueError('Prompt too long (max 100,000 characters)')

    # Check for common issues
    if '\x00' in prompt:
        raise ValueError('Prompt contains null bytes')

async def safe_query(prompt: str) -> str:
    """Query with validation."""
    validate_prompt(prompt)

    response = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt=prompt
    )

    return response.text
```

## Performance Considerations

### Token Efficiency

```python
# Inefficient: Redundant context
bad_prompt = """
    You are a helpful assistant.
    Please be concise and clear.
    Remember to be professional.
    Now answer this question: What is TypeScript?
"""  # 30+ tokens of unnecessary preamble

# Efficient: Direct and concise
good_prompt = 'Explain TypeScript concisely.'  # Clear and direct
```

### Rate Limiting

```python
"""
Respect rate limits with queue
"""
import asyncio
from typing import List

class QueryQueue:
    """Queue with rate limiting."""

    def __init__(self, delay_seconds: float = 1.0):
        """
        Initialize queue.

        Args:
            delay_seconds: Delay between requests
        """
        self.delay_seconds = delay_seconds
        self.queue: List[asyncio.Task] = []
        self.processing = False

    async def add(self, prompt: str) -> str:
        """
        Add query to queue.

        Args:
            prompt: Prompt to send

        Returns:
            Response text
        """
        # Wait for current processing to finish
        while self.processing:
            await asyncio.sleep(0.1)

        self.processing = True

        try:
            response = await query(
                api_key=os.getenv('ANTHROPIC_API_KEY'),
                prompt=prompt
            )

            # Rate limit delay
            await asyncio.sleep(self.delay_seconds)

            return response.text

        finally:
            self.processing = False
```

## Common Pitfalls

### Treating query() as Stateful

```python
# Wrong: Expecting memory between calls
async def wrong_approach():
    response1 = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='My name is Alice.'
    )

    response2 = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='What is my name?'  # Won't remember "Alice"!
    )
```

**Solution:** Use [Client Pattern](./client-pattern.md) for conversations.

### Missing Error Handling

```python
# Wrong: No error handling
async def no_error_handling():
    response = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='Hello'
    )
    # If API key is invalid, app crashes!

# Correct: Always handle errors
async def with_error_handling():
    try:
        response = await query(
            api_key=os.getenv('ANTHROPIC_API_KEY'),
            prompt='Hello'
        )
        print(response.text)
    except Exception as e:
        print(f'Query failed: {e}', file=sys.stderr)
```

### Forgetting asyncio.run()

```python
# Wrong: Not using asyncio.run()
response = await query(...)  # SyntaxError outside async function!

# Correct: Wrap in async function with asyncio.run()
async def main():
    response = await query(...)
    print(response.text)

if __name__ == '__main__':
    asyncio.run(main())
```

## Troubleshooting

### "API key not found" error

**Cause:** Missing or undefined ANTHROPIC_API_KEY

**Solution:**
```bash
export ANTHROPIC_API_KEY=your-key
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('ANTHROPIC_API_KEY'))"
```

### Rate limit errors

**Cause:** Too many requests too quickly

**Solution:**
- Add delays between requests
- Implement retry with exponential backoff
- Use batch processing with rate limiting

### Response truncated

**Cause:** Response hit max_tokens limit

**Solution:**
```python
response = await query(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
    prompt='Long task...',
    max_tokens=4000  # Increase limit
)

if response.stop_reason == 'max_tokens':
    print('Warning: Response may be incomplete')
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

## TypeScript Comparison

For developers familiar with TypeScript:

| Feature | TypeScript | Python |
|---------|-----------|--------|
| **Async syntax** | `async function` | `async def` |
| **Entry point** | Top-level await | `asyncio.run()` |
| **Error handling** | try-catch | try-except |
| **Imports** | `import { query }` | `from sdk import query` |

See [TypeScript Query Pattern](../typescript/query-pattern.md) for comparison.

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

**Comparison:**
- [TypeScript Query Pattern](../typescript/query-pattern.md) - Compare approaches

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic usage
- [Web API Agent](../examples/web-api-agent.md) - API integration
