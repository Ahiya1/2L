# Code Patterns & Conventions - Iteration 5

## Overview

This iteration focuses on **documentation enhancement patterns** rather than code implementation. All patterns are additive (no breaking changes) and designed for single-builder sequential execution.

---

## File Organization

```
~/.claude/docs/agent-sdk/
├── overview.md (26 files total)
├── quickstart.md
├── troubleshooting.md
├── typescript/
│   ├── setup.md
│   ├── query-pattern.md
│   ├── client-pattern.md
│   ├── custom-tools.md
│   ├── options.md
│   └── streaming.md
├── python/
│   ├── setup.md
│   ├── query-pattern.md
│   ├── client-pattern.md
│   ├── custom-tools.md
│   ├── options.md
│   └── async-patterns.md
├── concepts/
│   ├── permissions.md
│   ├── mcp.md
│   ├── hooks.md
│   ├── tools.md
│   ├── sessions.md
│   └── cost-tracking.md
└── examples/
    ├── simple-cli-agent.md
    ├── web-api-agent.md
    ├── stateful-chatbot.md
    ├── multi-tool-agent.md
    └── mcp-server-agent.md
```

**All 26 files** receive metadata enhancements this iteration.

---

## Metadata YAML Frontmatter Pattern

### Complete Template

**Use this template for ALL 26 files:**

```yaml
---
title: "[Descriptive Title]"
last_updated: "2025-10-13"
sdk_version: "1.2.0"
sdk_version_range: "1.0.0+"
status: "stable"
language: "[typescript|python|cross-language|multi-language]"
difficulty: "[beginner|intermediate|advanced]"
prerequisites:
  - "[Prerequisite 1 with link or description]"
  - "[Prerequisite 2 with link or description]"
next_steps:
  - "[Next Step 1 with link or description]"
  - "[Next Step 2 with link or description]"
related_guides:
  - ../path/to/related/guide.md
tags:
  - tag1
  - tag2
  - tag3
---
```

### Field Guidelines

#### sdk_version_range
**Format:** `"X.Y.Z+"`

**Examples:**
- `"1.0.0+"` - Compatible with all versions from 1.0.0 onwards
- `"1.2.0+"` - Requires minimum version 1.2.0

**Decision Logic:**
- Most guides: `"1.0.0+"` (core features stable since initial release)
- Advanced features (if any): `"1.2.0+"` (if feature added in later version)

#### status
**Values:** `stable` | `beta` | `experimental`

**Decision Logic:**
- All current guides: `"stable"` (documentation validated in Iterations 1-2)
- Future features: `"beta"` or `"experimental"` (if applicable)

#### prerequisites
**Format:** Array of 2-3 items (strings or markdown links)

**Examples:**
```yaml
# Simple (no links):
prerequisites:
  - "Basic TypeScript knowledge"
  - "Node.js 18+ installed"

# With links:
prerequisites:
  - "Completed [Setup](./setup.md)"
  - "Understanding of [Custom Tools](./custom-tools.md)"

# Mixed:
prerequisites:
  - "Python 3.8+ installed"
  - "Read [Agent SDK Overview](../overview.md)"
```

**Decision Logic by File Type:**

**Root files (overview.md, quickstart.md, troubleshooting.md):**
- overview.md: `["Basic understanding of AI agents", "Familiarity with CLI tools"]`
- quickstart.md: `["Read Agent SDK Overview", "Node.js or Python installed"]`
- troubleshooting.md: `["Attempted SDK implementation", "Access to error logs"]`

**TypeScript guides:**
- setup.md: `["Node.js 18+ installed", "npm or yarn installed"]` (entry point, minimal prerequisites)
- Others: `["Completed [TypeScript Setup](./setup.md)", "Basic TypeScript knowledge"]`

**Python guides:**
- setup.md: `["Python 3.8+ installed", "pip installed"]` (entry point, minimal prerequisites)
- Others: `["Completed [Python Setup](./setup.md)", "Basic Python knowledge"]`

**Concepts guides:**
- All: `["Read [Agent SDK Overview](../overview.md)", "Completed either [TypeScript Setup](../typescript/setup.md) or [Python Setup](../python/setup.md)"]`

**Examples:**
- All: `["Completed setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)", "Understanding of [Custom Tools](../concepts/tools.md)"]`

#### next_steps
**Format:** Array of 2-3 items (logical progressions)

**Examples:**
```yaml
next_steps:
  - "Try the [Simple CLI Agent Example](../examples/simple-cli-agent.md)"
  - "Learn about [Custom Tools](./custom-tools.md)"
  - "Explore [Advanced Features](../concepts/hooks.md)"
```

**Decision Logic:**
- Beginner guides → Intermediate guides
- Intermediate guides → Advanced guides or examples
- Advanced guides → Examples or related concepts
- Examples → More complex examples or concepts

**Specific Progressions:**
- setup.md → query-pattern.md → client-pattern.md → custom-tools.md → examples
- concepts → implementation guides → examples
- simple examples → complex examples

---

## Prerequisites Section Pattern

### When to Add

**Add Prerequisites section to:**
- TypeScript guides (5 files): query-pattern, client-pattern, custom-tools, options, streaming
  - NOT setup.md (it's the entry point)
- Concepts guides (6 files): All 6 need prerequisites
- Root docs (1 file): quickstart.md
  - NOT overview.md (entry point) or troubleshooting.md (reference)

**Total: 12 files**

### Section Format

**Placement:** After YAML frontmatter and title, before "Overview" or first content section

**Template:**
```markdown
# [Guide Title]

## Prerequisites

Before following this guide, ensure you have:

- **Requirement 1:** Description or [Link](./path.md)
- **Requirement 2:** Description or [Link](./path.md)

**Recommended knowledge:**
- Skill or concept description

---

[Rest of guide content...]
```

### Examples by File Type

#### TypeScript Implementation Guide (e.g., custom-tools.md)
```markdown
# Custom Tools in TypeScript

## Prerequisites

Before creating custom tools, ensure you have:

- **TypeScript Setup:** Complete [TypeScript Setup](./setup.md)
- **Basic Agent Usage:** Understand [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)

**Recommended knowledge:**
- TypeScript type system (interfaces, generics)
- Zod schema validation library

---
```

#### Python Implementation Guide (e.g., async-patterns.md)
```markdown
# Async Patterns in Python

## Prerequisites

Before exploring async patterns, ensure you have:

- **Python Setup:** Complete [Python Setup](./setup.md)
- **Basic Agent Usage:** Understand [Query Pattern](./query-pattern.md) or [Client Pattern](./client-pattern.md)

**Recommended knowledge:**
- Python async/await syntax
- asyncio library basics

---
```

#### Concepts Guide (e.g., hooks.md)
```markdown
# Agent Hooks

## Prerequisites

Before working with hooks, ensure you have:

- **Agent SDK Overview:** Read [Overview](../overview.md) for core concepts
- **Implementation Setup:** Complete setup for [TypeScript](../typescript/setup.md) or [Python](../python/setup.md)

**Recommended knowledge:**
- Event-driven programming concepts
- Tool execution lifecycle

---
```

#### Root Doc (quickstart.md)
```markdown
# Quick Start Guide

## Prerequisites

Before starting, ensure you have:

- **Read Overview:** Understand [what Agent SDK is](./overview.md)
- **Environment Setup:** Node.js 18+ or Python 3.8+ installed

**Recommended:**
- API key from Anthropic Console
- Familiarity with command-line tools

---
```

---

## Next Steps Section Pattern

### When to Add/Enhance

**Add or enhance Next Steps in:**
- TypeScript guides (6 files): All 6
- Python guides (6 files): All 6 (already have, verify quality)
- Concepts guides (6 files): All 6
- Root docs (3 files): overview.md, quickstart.md, troubleshooting.md

**Total: 21 files** (but only 15 need additions/enhancements - others already sufficient)

### Section Format

**Placement:** At end of guide, before "Related Documentation"

**Template:**
```markdown
---

## Next Steps

Now that you've completed this guide, explore:

1. **[Next Logical Step]:** [Link and brief description](./path.md)
2. **[Alternative Path]:** [Link and brief description](./path.md)
3. **[Advanced Topic]:** [Link and brief description](./path.md)

**For more examples:**
- See [Example 1](../examples/example1.md)
- See [Example 2](../examples/example2.md)
```

### Examples by File Type

#### TypeScript Setup Guide
```markdown
## Next Steps

Now that you've set up TypeScript, explore:

1. **Try a Quick Example:** Start with [Query Pattern](./query-pattern.md) for stateless agents
2. **Build Something Real:** Follow [Simple CLI Agent Example](../examples/simple-cli-agent.md)
3. **Understand Concepts:** Read about [Custom Tools](../concepts/tools.md)

**For more examples:**
- See all [TypeScript Examples](../examples/) with copy-paste code
```

#### Python Custom Tools Guide
```markdown
## Next Steps

Now that you can create custom tools, explore:

1. **Build Complete Agents:** See [Multi-Tool Agent Example](../examples/multi-tool-agent.md)
2. **Advanced Tool Features:** Learn about [Hooks](../concepts/hooks.md)
3. **MCP Integration:** Connect tools to [MCP Servers](../concepts/mcp.md)

**For more examples:**
- See [Python Examples](../examples/) for production-ready implementations
```

#### Concepts Guide (e.g., permissions.md)
```markdown
## Next Steps

Now that you understand permissions, explore:

1. **Implementation:** See [TypeScript Options](../typescript/options.md) or [Python Options](../python/options.md)
2. **Real-World Usage:** Check [MCP Server Example](../examples/mcp-server-agent.md) for permission patterns
3. **Related Concepts:** Learn about [Hooks](./hooks.md) for permission validation

**For comprehensive examples:**
- See [Examples Directory](../examples/) for permission configurations
```

#### Overview (Root Doc)
```markdown
## Next Steps

Ready to build with Agent SDK? Start here:

1. **Get Started:** Follow [Quick Start Guide](./quickstart.md) for your first agent
2. **Choose Your Language:**
   - [TypeScript Setup](./typescript/setup.md) for Node.js projects
   - [Python Setup](./python/setup.md) for Python projects
3. **Learn Core Concepts:** Read about [Custom Tools](./concepts/tools.md)

**Skip to examples:**
- [Simple CLI Agent](./examples/simple-cli-agent.md) - Basic file operations
- [Web API Agent](./examples/web-api-agent.md) - REST API integration
```

---

## SDK Version Compatibility Notes Pattern

### Format

**Placement:** After main title, before Prerequisites (if present) or Overview

**Template:**
```markdown
# [Guide Title]

> **SDK Version:** This guide applies to Agent SDK v1.0.0 and later. Last verified with v1.2.0.

[Prerequisites or Overview section...]
```

**All 26 files** get this note.

### Examples

#### Stable Feature (Most Files)
```markdown
# Query Pattern in TypeScript

> **SDK Version:** This guide applies to Agent SDK v1.0.0 and later. Last verified with v1.2.0.

## Prerequisites
...
```

#### Feature with Minimum Version (If Applicable)
```markdown
# Advanced Hooks

> **SDK Version:** This feature requires Agent SDK v1.2.0 or later. Last verified with v1.2.0.

## Prerequisites
...
```

**Decision Logic:**
- Most guides: `"v1.0.0 and later"` (core features)
- Advanced features: `"v1.X.Y or later"` (if feature was added in specific version)
- All: `"Last verified with v1.2.0"` (current version)

---

## Navigation TOC Pattern

### overview.md Table of Contents

**Placement:** After YAML frontmatter, before first content section

**Complete TOC for overview.md:**
```markdown
---
title: "Agent SDK Overview"
[... other frontmatter ...]
---

# Agent SDK Overview

## Table of Contents

1. [What is the Agent SDK?](#what-is-the-agent-sdk)
2. [When to Use Agent SDK](#when-to-use-agent-sdk)
   - [Perfect For](#perfect-for)
   - [Not Ideal For](#not-ideal-for)
3. [Core Concepts](#core-concepts)
   - [Conversation State](#conversation-state)
   - [Custom Tools](#custom-tools)
   - [Model Context Protocol (MCP)](#model-context-protocol-mcp)
   - [Permissions](#permissions)
4. [Architecture Overview](#architecture-overview)
   - [Stateless Query Pattern](#stateless-query-pattern)
   - [Stateful Client Pattern](#stateful-client-pattern)
5. [Language Support](#language-support)
   - [TypeScript](#typescript)
   - [Python](#python)
6. [Key Features](#key-features)
7. [Quick Comparison: Query vs Client](#quick-comparison-query-vs-client)
8. [Common Use Cases](#common-use-cases)
9. [Advanced Features](#advanced-features)
   - [Hooks](#hooks)
   - [Token Usage Tracking](#token-usage-tracking)
   - [Session Management](#session-management)
10. [Next Steps](#next-steps)
11. [Related Documentation](#related-documentation)

---

[Rest of content...]
```

**Key Points:**
- Use markdown anchor links (`#section-name`)
- Match existing section headers exactly
- Include subsections for major topics
- Two-level depth maximum (readability)
- Ordered list for main sections

---

## Critical Navigation Fix Pattern

### overview.md Line 214 Correction

**Current (Line ~214):**
```markdown
## Python

The Agent SDK is available for Python with full API parity.

- **Package Manager:** pip or uv
- **Tool Creation:** @tool decorator
- **Documentation:** See official docs (Python guides coming in future iteration)
```

**Fixed:**
```markdown
## Python

The Agent SDK is available for Python with full API parity.

- **Package Manager:** pip or uv
- **Tool Creation:** @tool decorator
- **Documentation:** [Python Setup](./python/setup.md)
```

**Key Change:**
- Remove: `"See official docs (Python guides coming in future iteration)"`
- Add: `"[Python Setup](./python/setup.md)"`
- Impact: HIGH (removes misleading reference, provides correct entry point)

---

## Agent Prompt Update Pattern

### 2l-builder.md Update

**File:** `~/.claude/agents/2l-builder.md`

**Placement:** After "# Your Mission" section (around line 15), before "# Available MCP Servers" section

**Content to Insert:**
```markdown
# Agent SDK Support

For AI agent features, reference **`~/.claude/docs/agent-sdk/`** documentation (TypeScript and Python implementation guides available).

```

**Key Points:**
- Section header: `# Agent SDK Support` (matches style)
- Bold path: `**`~/.claude/docs/agent-sdk/`**` (emphasis)
- Language mention: Both TypeScript and Python
- Token count: ~25 tokens (50% of 50-token budget)
- Blank line after (spacing)

**Validation:**
```bash
# Token count approximation (1.3 tokens per word)
echo "For AI agent features, reference ~/.claude/docs/agent-sdk/ documentation (TypeScript and Python implementation guides available)." | wc -w
# Expected: ~19 words = ~25 tokens
```

**Full Context (How It Looks):**
```markdown
# Your Mission

You are a Builder agent responsible for implementing a specific, well-defined task...

[Existing mission text...]

# Agent SDK Support

For AI agent features, reference **`~/.claude/docs/agent-sdk/`** documentation (TypeScript and Python implementation guides available).

# Available MCP Servers

When your task requires external data or capabilities...
```

---

## Grep Discoverability Enhancement Pattern

### Add "Python Agent SDK" Phrase

**Files to Update:** All 6 Python guides

**Placement:** First paragraph of Overview section

**Pattern:**
```markdown
# [Guide Title]

> **SDK Version:** This guide applies to Agent SDK v1.0.0 and later. Last verified with v1.2.0.

## Prerequisites
[...]

## Overview

This guide covers [topic] in the Python Agent SDK. [Rest of overview...]
```

**Examples:**

#### python/setup.md
```markdown
## Overview

This guide covers installation and setup for the Python Agent SDK. You'll learn how to...
```

#### python/custom-tools.md
```markdown
## Overview

This guide covers custom tool creation in the Python Agent SDK using the @tool decorator. Custom tools...
```

#### python/async-patterns.md
```markdown
## Overview

This guide covers async/await patterns in the Python Agent SDK. You'll learn how to...
```

**Key Points:**
- Add phrase naturally in first sentence
- Phrase: "the Python Agent SDK"
- Improves grep search results for "python agent sdk"
- Time: 1-2 minutes per file (6 files = 10 minutes)

---

## End-to-End Test Structure

### Test Validation Report Template

**File:** `.2L/plan-4/iteration-5/validation/test-validation-report.md`

**Complete Template:**
```markdown
# End-to-End Testing Report - Iteration 5

## Test Execution Date
2025-10-13

## Test Environment
- Agent prompts: 2l-explorer.md, 2l-planner.md, 2l-builder.md (all updated)
- Documentation: 26 files in ~/.claude/docs/agent-sdk/
- Tools: Read, Grep

---

## Test 1: Explorer Discovery

### Test Vision
"Build a chatbot for customer support"

### Expected Behavior
- Explorer identifies Agent SDK opportunity
- References ~/.claude/docs/agent-sdk/overview.md
- Grep searches return relevant documentation

### Actual Results
[Document what happened]

### Grep Tests
```bash
# Test: "chatbot agent sdk"
# Expected: overview.md, examples/stateful-chatbot.md
# Actual: [Results]

# Test: "python agent sdk"
# Expected: python/*.md files
# Actual: [Results]
```

### Status
- [ ] PASS
- [ ] FAIL (describe issues)

### Observations
[Notes, issues, improvements]

---

## Test 2: Planner Inclusion

### Test Vision
"Build a chatbot for customer support" (same as Test 1)

### Expected Behavior
- Planner includes Agent SDK in tech stack
- References ~/.claude/docs/agent-sdk/
- Mentions both TypeScript and Python options

### Actual Results
[Document what happened]

### Status
- [ ] PASS
- [ ] FAIL (describe issues)

### Observations
[Notes, issues, improvements]

---

## Test 3: Builder Implementation

### Test Vision
"Simple CLI agent that reads files"

### Expected Behavior
Builder workflow:
1. Read overview.md (understand concepts)
2. Read setup.md (TypeScript or Python)
3. Read custom-tools.md (tool creation)
4. Read examples/simple-cli-agent.md (complete pattern)
5. Has all information needed (no external lookups)

### Actual Results
[Document each step]

### Missing Information (If Any)
- [ ] Installation steps unclear
- [ ] Tool creation pattern incomplete
- [ ] Example missing dependencies
- [ ] Other: [Describe]

### Status
- [ ] PASS (builder can implement with local docs only)
- [ ] FAIL (critical information missing)

### Observations
[Notes, issues, improvements]

---

## Grep Discoverability Assessment

### Key Search Terms

| Search Term | Expected Files | Actual Files | Status |
|-------------|----------------|--------------|--------|
| "agent sdk" | overview.md + many | [List] | PASS/FAIL |
| "python agent sdk" | python/*.md | [List] | PASS/FAIL |
| "custom tool" | concepts/tools.md, examples | [List] | PASS/FAIL |
| "typescript agent" | typescript/*.md | [List] | PASS/FAIL |

### Assessment
- Overall discoverability: [Excellent/Good/Needs Improvement]
- Issues identified: [List]
- Recommendations: [If any]

---

## Cross-Reference Validation

### Sample Cross-References Checked
- [ ] overview.md → typescript/setup.md (PASS/FAIL)
- [ ] python/custom-tools.md → concepts/tools.md (PASS/FAIL)
- [ ] examples/simple-cli-agent.md → typescript/setup.md (PASS/FAIL)
- [ ] [List 10-15 more samples]

### Broken Links Found
[List any broken links, or "None"]

---

## Agent Prompt Token Budget

| Agent | Token Count | Budget | Status |
|-------|-------------|--------|--------|
| 2l-explorer.md | ~26 | 50 | ✓ |
| 2l-planner.md | ~31 | 50 | ✓ |
| 2l-builder.md | ~25 | 50 | ✓ |
| **Total** | **~82** | **150** | **✓** |

### Assessment
Token budget usage: 55% (well within limit)

---

## Overall Assessment

### Agent Workflows
- [ ] Explorer discovers Agent SDK opportunities: PASS/FAIL
- [ ] Planner includes Agent SDK in tech stack: PASS/FAIL
- [ ] Builder implements using local docs: PASS/FAIL

### Documentation Completeness
- [ ] All information accessible via Read tool
- [ ] Grep searches effective
- [ ] Cross-references working
- [ ] No critical gaps identified

### Issues Identified

#### Critical Issues (Block Deployment)
[None expected, list if found]

#### Major Issues (Should Fix)
[List if found]

#### Minor Issues (Nice to Fix)
[List if found]

---

## Recommendations

### Immediate Actions
[If any issues found]

### Post-MVP Enhancements
- [Suggestions for future improvements]

---

## Conclusion

**Test Results:** [X/3 scenarios passed]

**Documentation Quality:** [Excellent/Good/Acceptable/Needs Work]

**Deployment Readiness:** [APPROVED/NEEDS FIXES]

**Confidence Level:** [HIGH/MEDIUM/LOW] ([XX]%)

---

**Tested By:** Builder-1
**Date:** 2025-10-13
**Iteration:** 5 (Final iteration of plan-4)
```

---

## Validation Checklists

### Per-File Metadata Validation

**Run after completing metadata enrichment:**

```bash
#!/bin/bash
# Validate all 26 files have required metadata

cd ~/.claude/docs/agent-sdk/

for file in $(find . -name "*.md" -type f); do
  echo "Checking: $file"

  # Check required fields
  grep -q "sdk_version_range:" "$file" || echo "  ⚠️  Missing: sdk_version_range"
  grep -q "status:" "$file" || echo "  ⚠️  Missing: status"
  grep -q "prerequisites:" "$file" || echo "  ⚠️  Missing: prerequisites (if applicable)"
  grep -q "next_steps:" "$file" || echo "  ⚠️  Missing: next_steps"
done

echo ""
echo "Validation complete. Review any warnings above."
```

### Link Validation Script

**Run after completing navigation aids:**

```bash
#!/bin/bash
# Validate all markdown links resolve

cd ~/.claude/docs/agent-sdk/

echo "Checking cross-references..."

find . -name "*.md" -exec grep -oP '\[.*?\]\(\K[^)]+' {} + | sort -u | while read link; do
  # Skip external links
  if [[ $link == http* ]]; then
    continue
  fi

  # Check if file exists
  if [[ ! -f "$link" ]]; then
    echo "⚠️  BROKEN LINK: $link"
  fi
done

echo ""
echo "Link validation complete."
```

### Final Quality Checklist

**Review before marking iteration complete:**

- [ ] **Metadata:** All 26 files have enhanced YAML frontmatter
- [ ] **Consistency:** sdk_version_range and status consistent across files
- [ ] **Prerequisites:** 12 files have prerequisites sections (TypeScript: 5, Concepts: 6, Root: 1)
- [ ] **Next Steps:** 15 files have next steps sections
- [ ] **Version Notes:** All 26 files have SDK version compatibility notes
- [ ] **Navigation Fix:** overview.md line 214 corrected (Python reference)
- [ ] **TOC:** overview.md has comprehensive table of contents
- [ ] **Grep Enhancement:** 6 Python guides include "Python Agent SDK" phrase
- [ ] **Agent Prompt:** 2l-builder.md updated correctly
- [ ] **Token Budget:** Total tokens <150 (verified)
- [ ] **Link Validation:** No broken links (script confirms)
- [ ] **Testing:** All 3 test scenarios executed
- [ ] **Test Report:** Validation report written
- [ ] **Issue Resolution:** 2 Iteration 4 issues addressed
- [ ] **Git Status:** All changes committed (if applicable)

---

## Import/Usage Patterns

*Not applicable for this iteration (documentation enhancement only)*

---

## Common Pitfalls to Avoid

1. **Generic Prerequisites:** Don't copy-paste same prerequisites for all files
   - **Wrong:** Every file says "Basic programming knowledge"
   - **Right:** Context-specific prerequisites per file

2. **Broken Anchor Links:** TOC links must match section headers exactly
   - **Wrong:** `[Core Concepts](#concepts)` when header is `## Core Concepts`
   - **Right:** `[Core Concepts](#core-concepts)` (lowercase, hyphens)

3. **Forgetting Files:** Easy to miss files in batch updates
   - **Prevention:** Use checklist, validate count (26 files)

4. **Inconsistent Metadata:** Different files have different structures
   - **Prevention:** Use exact template for all files

5. **Token Count Overrun:** Agent prompt exceeds 50-token budget
   - **Prevention:** Count before inserting, use concise phrasing

6. **Modifying Content:** Accidentally changing guide content while adding metadata
   - **Prevention:** Only edit frontmatter and add sections, don't modify existing content

7. **Skipping Validation:** Not running validation scripts
   - **Prevention:** Run scripts after each phase (metadata, navigation)

---

**Patterns Documentation:** COMPLETE
**Ready for:** Builder implementation
**Complexity Level:** LOW (additive enhancements with clear templates)
