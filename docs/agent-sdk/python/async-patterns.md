---
title: "Async Patterns and Best Practices"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "python"
difficulty: "advanced"
prerequisites:
  - "Completed [Python Setup](./setup.md)"
  - "Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)"
  - "Basic knowledge of async/await and asyncio"
next_steps:
  - "Implement concurrent operations in production"
  - "Build [Web API Agent](../examples/web-api-agent.md) with async patterns"
  - "Explore [TypeScript Streaming](../typescript/streaming.md) for comparison"
related_guides:
  - query-pattern.md
  - client-pattern.md
  - ../concepts/sessions.md
  - ../typescript/streaming.md
tags:
  - async
  - asyncio
  - async-await
  - event-loop
  - concurrency
---

# Async Patterns and Best Practices

## Overview

This guide covers async/await patterns in the Python Agent SDK. The Claude Agent SDK for Python is built on asyncio for non-blocking I/O operations. This guide covers Python-specific async/await patterns, asyncio best practices, common pitfalls, and advanced concurrency patterns essential for building responsive agent applications.

## When to Use

Reference this guide when you need to:
- **Understand asyncio:** Learn Python async fundamentals
- **Concurrent operations:** Run multiple queries in parallel
- **Async iteration:** Process streaming responses
- **Event loop management:** Control asyncio behavior
- **Error handling:** Handle async exceptions properly
- **Performance optimization:** Improve async code efficiency

## Prerequisites

- Completed [Setup Guide](./setup.md)
- Understanding of [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)
- Basic knowledge of Python async/await
- Python 3.8+ with asyncio

## Async Fundamentals

### Basic Async/Await Pattern

```python
import asyncio
from claude_agent_sdk import query

# Async function definition
async def main():
    """
    All async code must be inside async functions.
    """
    # Await async operations
    response = await query(
        api_key=os.getenv('ANTHROPIC_API_KEY'),
        prompt='Hello!'
    )

    print(response.text)

# Entry point: Run async function
if __name__ == '__main__':
    asyncio.run(main())  # Required for scripts
```

### Why asyncio.run() is Required

```python
# Wrong: Can't use await at module level in scripts
response = await query(...)  # SyntaxError!

# Correct: Wrap in async function and use asyncio.run()
async def main():
    response = await query(...)
    print(response.text)

if __name__ == '__main__':
    asyncio.run(main())  # Creates and manages event loop
```

**Note:** Jupyter notebooks and IPython have running event loops, so you can use `await` directly:
```python
# In Jupyter notebook
response = await query(...)  # Works in notebooks!
```

## Async Context Managers

### Using ClaudeSDKClient with async with

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def main():
    """
    Async context manager handles resource cleanup automatically.
    """
    # Context manager pattern (recommended)
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        response = await client.query(prompt='Hello!')
        print(response.text)
        # Automatic disconnect and cleanup on exit

if __name__ == '__main__':
    asyncio.run(main())
```

### Manual Resource Management (Not Recommended)

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def manual_management():
    """
    Manual management requires explicit cleanup.
    """
    client = ClaudeSDKClient(api_key=os.getenv('ANTHROPIC_API_KEY'))

    try:
        await client.connect()  # Manual connection
        response = await client.query(prompt='Hello!')
        print(response.text)
    finally:
        await client.disconnect()  # Manual cleanup

# Prefer async with for automatic cleanup!
```

## Concurrent Operations

### Running Queries in Parallel

```python
import asyncio
from typing import List
from claude_agent_sdk import query

async def parallel_queries() -> List[str]:
    """
    Run multiple queries concurrently.
    """
    prompts = [
        'What is Python?',
        'What is TypeScript?',
        'What is Rust?'
    ]

    # Create tasks for concurrent execution
    tasks = [
        query(
            api_key=os.getenv('ANTHROPIC_API_KEY'),
            prompt=prompt
        )
        for prompt in prompts
    ]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    return [r.text for r in responses]

async def main():
    results = await parallel_queries()

    for i, result in enumerate(results, 1):
        print(f'\n{i}. {result}')

if __name__ == '__main__':
    asyncio.run(main())
```

### asyncio.gather() vs asyncio.create_task()

```python
import asyncio
from claude_agent_sdk import query

async def using_gather():
    """
    gather() runs tasks concurrently and returns results in order.
    """
    # All tasks start immediately
    results = await asyncio.gather(
        query(api_key=..., prompt='Query 1'),
        query(api_key=..., prompt='Query 2'),
        query(api_key=..., prompt='Query 3')
    )

    return results  # Results in same order as input

async def using_create_task():
    """
    create_task() gives more control over individual tasks.
    """
    # Create tasks (start immediately)
    task1 = asyncio.create_task(query(api_key=..., prompt='Query 1'))
    task2 = asyncio.create_task(query(api_key=..., prompt='Query 2'))
    task3 = asyncio.create_task(query(api_key=..., prompt='Query 3'))

    # Wait for specific tasks
    result1 = await task1
    result2 = await task2
    result3 = await task3

    return [result1, result2, result3]

# gather() is simpler, create_task() gives more control
```

### Rate-Limited Concurrent Execution

```python
import asyncio
from typing import List
from claude_agent_sdk import query

async def rate_limited_queries(
    prompts: List[str],
    max_concurrent: int = 3
) -> List[str]:
    """
    Run queries with concurrency limit.

    Args:
        prompts: List of prompts to process
        max_concurrent: Maximum concurrent queries

    Returns:
        List of responses
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def limited_query(prompt: str) -> str:
        """Query with semaphore limit."""
        async with semaphore:
            response = await query(
                api_key=os.getenv('ANTHROPIC_API_KEY'),
                prompt=prompt
            )
            return response.text

    # Run all queries with concurrency limit
    tasks = [limited_query(prompt) for prompt in prompts]
    results = await asyncio.gather(*tasks)

    return results

async def main():
    prompts = [f'Question {i}' for i in range(10)]

    # Only 3 queries run concurrently at a time
    results = await rate_limited_queries(prompts, max_concurrent=3)

if __name__ == '__main__':
    asyncio.run(main())
```

## Async Iteration

### Streaming Responses (if supported)

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

async def stream_response():
    """
    Process response chunks as they arrive.
    """
    async with ClaudeSDKClient(
        api_key=os.getenv('ANTHROPIC_API_KEY')
    ) as client:
        # Request streaming response
        stream = await client.query(
            prompt='Tell me a story.',
            stream=True
        )

        # Async iteration over chunks
        async for chunk in stream:
            if chunk.type == 'content_block_delta':
                if chunk.delta.type == 'text_delta':
                    print(chunk.delta.text, end='', flush=True)

        print()  # New line after complete

if __name__ == '__main__':
    asyncio.run(stream_response())
```

### Async Generators

```python
import asyncio
from typing import AsyncIterator
from claude_agent_sdk import query

async def query_generator(
    prompts: list[str]
) -> AsyncIterator[str]:
    """
    Generate responses asynchronously.

    Args:
        prompts: List of prompts

    Yields:
        Response texts
    """
    for prompt in prompts:
        response = await query(
            api_key=os.getenv('ANTHROPIC_API_KEY'),
            prompt=prompt
        )
        yield response.text

async def main():
    """Process responses as they become available."""
    prompts = ['Query 1', 'Query 2', 'Query 3']

    async for response in query_generator(prompts):
        print(f'Response: {response}\n')

if __name__ == '__main__':
    asyncio.run(main())
```

## Error Handling

### Handling Async Exceptions

```python
import asyncio
from claude_agent_sdk import query

async def safe_query(prompt: str) -> str:
    """
    Query with comprehensive error handling.

    Args:
        prompt: Prompt to send

    Returns:
        Response text or error message
    """
    try:
        response = await query(
            api_key=os.getenv('ANTHROPIC_API_KEY'),
            prompt=prompt
        )
        return response.text

    except asyncio.TimeoutError:
        return "Error: Request timed out"

    except asyncio.CancelledError:
        # Task was cancelled
        print("Query was cancelled")
        raise  # Re-raise CancelledError

    except ValueError as e:
        # Configuration errors
        return f"Configuration error: {e}"

    except Exception as e:
        # Catch-all for unexpected errors
        return f"Unexpected error: {e}"
```

### Error Handling in Concurrent Operations

```python
import asyncio
from claude_agent_sdk import query

async def concurrent_with_error_handling():
    """
    Handle errors in concurrent operations.
    """
    async def safe_query(prompt: str) -> dict:
        """Query with error information."""
        try:
            response = await query(
                api_key=os.getenv('ANTHROPIC_API_KEY'),
                prompt=prompt
            )
            return {'success': True, 'result': response.text}

        except Exception as e:
            return {'success': False, 'error': str(e)}

    # Run multiple queries
    tasks = [
        safe_query('Question 1'),
        safe_query('Question 2'),
        safe_query('Question 3')
    ]

    results = await asyncio.gather(*tasks)

    # Process results
    for i, result in enumerate(results, 1):
        if result['success']:
            print(f'{i}. {result["result"]}')
        else:
            print(f'{i}. Error: {result["error"]}')
```

## Timeout Patterns

### Query with Timeout

```python
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
    try:
        response = await asyncio.wait_for(
            query(
                api_key=os.getenv('ANTHROPIC_API_KEY'),
                prompt=prompt
            ),
            timeout=timeout_seconds
        )
        return response.text

    except asyncio.TimeoutError:
        raise asyncio.TimeoutError(
            f'Query timeout after {timeout_seconds}s'
        )

async def main():
    try:
        result = await query_with_timeout(
            'Complex question...',
            timeout_seconds=10.0
        )
        print(result)

    except asyncio.TimeoutError as e:
        print(f'Timeout: {e}')

if __name__ == '__main__':
    asyncio.run(main())
```

### Multiple Operations with Overall Timeout

```python
import asyncio
from typing import List
from claude_agent_sdk import query

async def batch_with_timeout(
    prompts: List[str],
    timeout_seconds: float = 60.0
) -> List[str]:
    """
    Process batch with overall timeout.

    Args:
        prompts: List of prompts
        timeout_seconds: Total timeout for all operations

    Returns:
        List of responses

    Raises:
        asyncio.TimeoutError: If overall timeout exceeded
    """
    async def single_query(prompt: str) -> str:
        response = await query(
            api_key=os.getenv('ANTHROPIC_API_KEY'),
            prompt=prompt
        )
        return response.text

    # Create tasks
    tasks = [single_query(p) for p in prompts]

    # Apply overall timeout
    try:
        results = await asyncio.wait_for(
            asyncio.gather(*tasks),
            timeout=timeout_seconds
        )
        return results

    except asyncio.TimeoutError:
        # Cancel remaining tasks
        for task in tasks:
            if not task.done():
                task.cancel()

        raise asyncio.TimeoutError(
            f'Batch processing timeout after {timeout_seconds}s'
        )
```

## Task Cancellation

### Graceful Cancellation

```python
import asyncio
from claude_agent_sdk import query

async def cancellable_operation():
    """
    Operation that can be cancelled gracefully.
    """
    try:
        response = await query(
            api_key=os.getenv('ANTHROPIC_API_KEY'),
            prompt='Long operation...'
        )
        return response.text

    except asyncio.CancelledError:
        print('Operation was cancelled')
        # Perform cleanup if needed
        raise  # Re-raise to propagate cancellation

async def main():
    # Create task
    task = asyncio.create_task(cancellable_operation())

    # Wait briefly
    await asyncio.sleep(0.5)

    # Cancel if still running
    if not task.done():
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            print('Task cancelled successfully')

if __name__ == '__main__':
    asyncio.run(main())
```

## Event Loop Management

### Running Async Code in Sync Context

```python
import asyncio
from claude_agent_sdk import query

def sync_function():
    """
    Call async code from synchronous function.
    """
    async def async_operation():
        response = await query(
            api_key=os.getenv('ANTHROPIC_API_KEY'),
            prompt='Hello!'
        )
        return response.text

    # Run async code in sync context
    result = asyncio.run(async_operation())
    return result

# Use from synchronous code
result = sync_function()
print(result)
```

### Checking Event Loop Status

```python
import asyncio

def check_event_loop():
    """
    Check if an event loop is running.
    """
    try:
        loop = asyncio.get_running_loop()
        print(f'Event loop is running: {loop}')
        return True
    except RuntimeError:
        print('No event loop is running')
        return False

# Use in sync context
check_event_loop()  # No event loop

async def in_async_context():
    check_event_loop()  # Event loop running

asyncio.run(in_async_context())
```

## Performance Optimization

### Avoiding Blocking Operations

```python
import asyncio
import time

# Wrong: Blocking operation in async code
async def blocking_bad():
    time.sleep(5)  # Blocks entire event loop!
    response = await query(...)

# Correct: Use asyncio.sleep()
async def blocking_good():
    await asyncio.sleep(5)  # Non-blocking
    response = await query(...)

# Correct: Run blocking code in executor
async def blocking_in_executor():
    loop = asyncio.get_running_loop()

    # Run blocking operation in thread pool
    result = await loop.run_in_executor(
        None,  # Default executor
        blocking_sync_function,
        arg1, arg2
    )
```

### Connection Pooling

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient

class ClientPool:
    """
    Maintain a pool of reusable clients.
    """

    def __init__(self, size: int = 5):
        self.size = size
        self.clients = asyncio.Queue(maxsize=size)
        self.initialized = False

    async def initialize(self):
        """Initialize client pool."""
        for _ in range(self.size):
            client = ClaudeSDKClient(
                api_key=os.getenv('ANTHROPIC_API_KEY')
            )
            await self.clients.put(client)

        self.initialized = True

    async def get_client(self) -> ClaudeSDKClient:
        """Get client from pool."""
        if not self.initialized:
            await self.initialize()

        return await self.clients.get()

    async def return_client(self, client: ClaudeSDKClient):
        """Return client to pool."""
        await self.clients.put(client)

    async def query(self, prompt: str) -> str:
        """Query using pooled client."""
        client = await self.get_client()

        try:
            response = await client.query(prompt=prompt)
            return response.text
        finally:
            await self.return_client(client)

# Usage
async def main():
    pool = ClientPool(size=3)

    # Multiple concurrent queries share pool
    tasks = [pool.query(f'Question {i}') for i in range(10)]
    results = await asyncio.gather(*tasks)

if __name__ == '__main__':
    asyncio.run(main())
```

## Common Pitfalls

### Blocking the Event Loop

```python
# Wrong: Blocks event loop
async def bad_async():
    import time
    time.sleep(1)  # Blocks everything!
    response = await query(...)

# Correct: Use async sleep
async def good_async():
    await asyncio.sleep(1)  # Non-blocking
    response = await query(...)
```

### Not Awaiting Coroutines

```python
# Wrong: Forgot await
async def forgot_await():
    response = query(...)  # Returns coroutine, not result!
    print(response.text)  # AttributeError!

# Correct: Always await async calls
async def correct_await():
    response = await query(...)  # Gets actual result
    print(response.text)  # Works!
```

### Using break in async for

```python
# Wrong: Break can cause cleanup issues
async def bad_break():
    async for item in async_generator():
        if condition:
            break  # May not cleanup properly

# Correct: Use return instead
async def good_return():
    async for item in async_generator():
        if condition:
            return  # Proper cleanup
```

## Troubleshooting

### "RuntimeError: This event loop is already running"

**Cause:** Trying to use `asyncio.run()` inside async context

**Solution:**
```python
# Wrong: Can't nest asyncio.run()
async def nested():
    asyncio.run(some_async_function())  # Error!

# Correct: Just await
async def correct():
    await some_async_function()  # Works!
```

### "RuntimeError: no running event loop"

**Cause:** Trying to await outside async function

**Solution:**
```python
# Wrong: Can't await at module level
response = await query(...)  # Error!

# Correct: Use asyncio.run()
async def main():
    response = await query(...)

asyncio.run(main())
```

## TypeScript Comparison

For developers familiar with TypeScript:

| Feature | TypeScript | Python |
|---------|-----------|--------|
| **Async syntax** | async function | async def |
| **Entry point** | Top-level await (ESM) | asyncio.run() |
| **Concurrency** | Promise.all() | asyncio.gather() |
| **Timeout** | Promise.race() | asyncio.wait_for() |
| **Generators** | async function* | async def (yield) |
| **Context managers** | try-finally | async with |

See [TypeScript Streaming](../typescript/streaming.md) for comparison.

## Next Steps

1. **Build applications:** [Simple CLI Agent](../examples/simple-cli-agent.md)
2. **Explore concepts:** [Sessions](../concepts/sessions.md)
3. **Advanced patterns:** [Stateful Chatbot](../examples/stateful-chatbot.md)

## Related Documentation

**Core Concepts:**
- [Sessions](../concepts/sessions.md) - State management
- [Tools](../concepts/tools.md) - Tool integration

**Implementation:**
- [Setup Guide](./setup.md) - Initial configuration
- [Query Pattern](./query-pattern.md) - Async query usage
- [Client Pattern](./client-pattern.md) - Async context managers
- [Custom Tools](./custom-tools.md) - Async tool handlers

**Comparison:**
- [TypeScript Streaming](../typescript/streaming.md) - Compare approaches

**Examples:**
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Basic async usage
- [Stateful Chatbot](../examples/stateful-chatbot.md) - Advanced async patterns
