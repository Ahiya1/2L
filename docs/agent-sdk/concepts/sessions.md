---
title: "Session Management"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "cross-language"
difficulty: "intermediate"
prerequisites:
  - "Read [Agent SDK Overview](../overview.md)"
  - "Understanding of [Client Pattern](../typescript/client-pattern.md) or [Python Client](../python/client-pattern.md)"
next_steps:
  - "Build [Stateful Chatbot Example](../examples/stateful-chatbot.md)"
  - "Implement session persistence"
  - "Explore [Cost Tracking](./cost-tracking.md) per session"
related_guides:
  - ../typescript/client-pattern.md
  - ../typescript/query-pattern.md
  - ../examples/stateful-chatbot.md
tags:
  - sessions
  - state
  - conversation
  - memory
---

# Session Management

## Overview

Session management determines how agents maintain state and context across interactions. The Agent SDK provides two primary patterns: stateless (single-query) and stateful (persistent sessions). Stateless agents treat each request independently, while stateful agents maintain conversation history and context across multiple turns. Your choice between patterns affects memory usage, scalability, implementation complexity, and user experience.

## When to Use

### Stateless (Query Pattern)

Use stateless agents when:
- Each request is independent (no conversation history needed)
- Scaling to many concurrent users is critical
- Memory usage must be minimal
- Requests are single-turn question-answer
- Context fits entirely in one prompt

**Examples:**
- Code analysis on single files
- Document summarization
- One-off API queries
- Stateless web API endpoints
- Lambda/serverless functions

### Stateful (Client Pattern)

Use stateful agents when:
- Multi-turn conversations are required
- Agents need to remember previous interactions
- Building chatbots or interactive assistants
- Tasks span multiple agent turns
- Context accumulates over conversation

**Examples:**
- Interactive chatbots
- Personal assistants
- Long-running workflows
- Debugging sessions
- Tutorial or teaching agents

## Core Principles

### Stateless Architecture

**Query pattern characteristics:**
```
Request 1: query("What is the weather?") → Response
Request 2: query("What about tomorrow?") → No context from Request 1
```

Each query:
- Creates new agent instance
- Has no memory of previous queries
- Must include all necessary context in prompt
- Agent is destroyed after response
- Zero state persisted between calls

**Benefits:**
- Simple to implement and reason about
- Easy to scale horizontally
- Minimal memory footprint
- No state synchronization issues
- Stateless architectures (serverless, containers)

**Limitations:**
- Cannot maintain conversation context
- Must repeat context in each query
- No learning from previous interactions
- Poor user experience for multi-turn dialogs

### Stateful Architecture

**Client pattern characteristics:**
```
Session start: client = new ClaudeSDKClient()
Turn 1: client.query("What is the weather?") → Response
Turn 2: client.query("What about tomorrow?") → Has context from Turn 1
Turn 3: client.query("And precipitation?") → Has full conversation history
```

Each session:
- Maintains persistent client instance
- Accumulates conversation history
- Context grows with each turn
- State managed by SDK or application
- Session ends explicitly or on timeout

**Benefits:**
- Natural conversation flow
- Context awareness across turns
- Better user experience for interactive tasks
- Agent can reference previous exchanges

**Limitations:**
- Higher memory usage (stores full history)
- More complex state management
- Scaling requires session persistence
- Potential memory leaks if sessions not cleaned up

## Common Patterns

### In-Memory Session Storage

Store session state in application memory:

**Pattern:**
```
Sessions stored in: Map<sessionId, ClientInstance>

Create session: sessionId = generateId(), store client
Resume session: retrieve client by sessionId
End session: delete client from map
```

**Use cases:**
- Single-server deployments
- Desktop applications
- Development and testing
- Low-concurrency scenarios

**Considerations:**
- Lost on server restart
- Cannot share across multiple servers
- Memory grows with active sessions
- Implement session timeouts to prevent unbounded growth

### Database Session Persistence

Store conversation history in a database:

**Pattern:**
```
Sessions stored in: Database table (session_id, messages, metadata)

Create session: Insert new session record
Load session: Query messages, reconstruct client state
Update session: Append new messages to record
End session: Mark session as ended or delete
```

**Use cases:**
- Multi-server deployments
- Long-term conversation history
- User analytics and insights
- Compliance and audit requirements

**Considerations:**
- Database I/O overhead on each turn
- Schema design for efficient queries
- Message history size limits
- Data retention and privacy policies

### Filesystem Session Storage

Persist sessions to files:

**Pattern:**
```
Sessions stored in: Files (e.g., /sessions/{sessionId}.json)

Create session: Write new session file
Load session: Read and parse session file
Update session: Rewrite session file with new messages
End session: Delete session file
```

**Use cases:**
- Local desktop applications
- CLI tools
- Single-user environments
- Simple persistence without database

**Considerations:**
- File I/O performance
- Concurrent access handling
- Cleanup of stale sessions
- Not suitable for multi-server setups

### Hybrid Approaches

Combine patterns for optimal trade-offs:

**Memory + Database:**
- Active sessions in memory for speed
- Periodically checkpoint to database for durability
- Load from database on startup or cache miss

**Memory + Filesystem:**
- Session state in memory
- Serialize to disk on idle/shutdown
- Load from disk on startup

**Time-Based Strategies:**
- Start with stateless for first query
- Transition to stateful if conversation continues
- Expire stateful sessions after inactivity

## Best Practices

### Set Session Timeouts

Always implement session expiration:
- Idle timeout (e.g., 30 minutes of inactivity)
- Maximum lifetime (e.g., 24 hours regardless of activity)
- Cleanup expired sessions regularly
- Notify users before expiration in interactive UIs

### Limit Conversation History

Prevent unbounded memory growth:
- Maximum message count (e.g., last 50 messages)
- Maximum token count (e.g., 100,000 tokens)
- Truncate or summarize old messages
- Balance context retention with resource usage

### Implement Session IDs

Use unique, secure session identifiers:
- Generate cryptographically random IDs
- Use UUIDs or similar standards
- Don't expose internal database IDs
- Include session IDs in logs for debugging

### Handle Session Not Found

Gracefully handle missing sessions:
- Check if session exists before use
- Return user-friendly errors
- Offer to start new session
- Log session lookup failures

### Cleanup on Exit

Ensure sessions are properly closed:
- Close sessions on application shutdown
- Handle process termination gracefully
- Persist important state before exit
- Implement cleanup scripts for orphaned sessions

### Separate User Identity from Sessions

Don't conflate user accounts with sessions:
- One user may have multiple concurrent sessions
- Sessions may be anonymous (no user account)
- Store user ID with session for authorization
- Allow users to list/manage their sessions

### Test Session Edge Cases

Test scenarios like:
- Concurrent access to same session
- Session expiration during active use
- Session restoration after server restart
- Memory leaks with many long-running sessions
- Extremely long conversations

## Security Considerations

### Session Hijacking Prevention

Protect sessions from unauthorized access:
- Use secure, random session IDs
- Implement session authentication
- Validate session ownership on each request
- Rotate session IDs after authentication changes
- Use HTTPS for session ID transmission

### Data Privacy

Handle conversation data responsibly:
- Encrypt stored conversation history
- Implement data retention policies
- Allow users to delete their sessions
- Comply with privacy regulations (GDPR, CCPA)
- Don't log sensitive conversation content

### Authorization

Verify permissions for session operations:
- Check user can access specific session
- Prevent cross-session data leakage
- Implement role-based access for admin features
- Audit session access attempts

### Resource Limits

Prevent abuse through resource exhaustion:
- Limit sessions per user
- Limit message rate per session
- Cap conversation length
- Monitor for unusual patterns
- Implement rate limiting

## Performance Considerations

### Memory Management

Monitor and optimize memory usage:
- Profile memory consumption per session
- Implement aggressive garbage collection
- Use memory-efficient data structures
- Consider message compression for old messages
- Set hard memory limits per session

### Context Window Management

Balance context retention with performance:
- Longer context = slower inference
- Longer context = higher API costs
- Intelligently prune less relevant messages
- Summarize old conversation segments
- Keep system prompts and recent messages

### Scaling Strategies

**Vertical Scaling:**
- Increase server memory to support more sessions
- Profile and optimize per-session overhead
- Use efficient serialization formats

**Horizontal Scaling:**
- Use shared session storage (Redis, database)
- Implement session affinity (sticky sessions)
- Consider session sharding by user ID
- Load balance across multiple servers

### Caching

Cache frequently accessed session data:
- Cache active sessions in memory
- Cache user preferences
- Use CDN for static session metadata
- Invalidate caches appropriately

### Async Session Operations

For better responsiveness:
- Load sessions asynchronously
- Save sessions in background
- Use message queues for session updates
- Don't block requests on session I/O

## Related Documentation

**Implementation:**
- [TypeScript Client Pattern](../typescript/client-pattern.md) - Implementing stateful sessions in TypeScript
- [TypeScript Query Pattern](../typescript/query-pattern.md) - Stateless agent usage
- [Python Client Pattern](../python/client-pattern.md) - Session management in Python

**Concepts:**
- [Cost Tracking](./cost-tracking.md) - Monitor token usage across sessions
- [Tools](./tools.md) - Tool usage in stateful vs stateless contexts

**Examples:**
- [Stateful Chatbot](../examples/stateful-chatbot.md) - Complete interactive chatbot with sessions
- [Simple CLI Agent](../examples/simple-cli-agent.md) - Stateless single-query example
- [Web API Agent](../examples/web-api-agent.md) - Stateless REST API with optional sessions
