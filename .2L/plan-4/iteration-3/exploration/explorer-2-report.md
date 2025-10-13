# Explorer 2 Report: Technology Patterns & Dependencies

## Executive Summary

Iteration 1 focuses on harvesting and organizing Agent SDK documentation using WebFetch-based scraping, markdown documentation structure, and TypeScript-first implementation. The technical approach is straightforward: systematically fetch official documentation, synthesize into 20-22 agent-friendly markdown files, and validate code examples syntactically. Key insight: This is primarily a content synthesis project (not technical complexity), with success depending on harvest completeness and documentation quality over infrastructure scalability.

**Critical technical decisions:**
1. WebFetch tool for scraping (no external dependencies)
2. Pure markdown with YAML frontmatter metadata
3. Syntax-only validation for MVP (no runtime testing)
4. File-based structure optimized for Read/Grep tools
5. Relative path cross-references for portability

## Discoveries

### Web Scraping Strategy (WebFetch Patterns)

**Official Documentation Source:**
- Base URL: `https://docs.claude.com/en/api/agent-sdk/`
- Content type: HTML documentation pages
- Navigation: Hierarchical structure with subpages
- Update frequency: Unknown (no changelog monitoring in MVP)

**WebFetch Tool Capabilities:**
- Available in 2L agent toolkit (no installation needed)
- HTTP GET requests to static documentation
- Returns HTML content for parsing
- No JavaScript rendering (documentation is static HTML)
- Handles redirects and standard HTTP responses

**Harvesting Approach - Three Phases:**

Phase 1: Discovery - Build comprehensive URL list of all Agent SDK documentation pages
Phase 2: Content Extraction - Fetch each page and extract main content
Phase 3: Organization - Categorize content into TypeScript/Python/Concepts/Examples

**Quality Validation Checklist:**
- Installation/setup instructions captured
- Quick start tutorial present
- API reference documentation complete
- Code examples include all necessary imports
- Configuration options documented
- Troubleshooting content extracted
- TypeScript SDK fully covered
- Python SDK fully covered

### Agent SDK Documentation Structure Expected

**Core Sections to Harvest:**

1. Overview/Introduction - What Agent SDK is, when to use it
2. Quick Start - Installation, first agent example
3. TypeScript SDK - All TS-specific patterns and APIs
4. Python SDK - All Python-specific patterns and APIs
5. Cross-Language Concepts - Permissions, MCP, hooks, tools, sessions
6. Examples - CLI, web API, chatbot, multi-tool, MCP integration
7. Troubleshooting - Common errors and solutions

**Extraction Priorities:**
- Priority 1 CRITICAL: Installation, basic usage, custom tool creation, complete examples
- Priority 2 HIGH: Configuration options, permissions, streaming, error handling
- Priority 3 MEDIUM: Advanced features (MCP, hooks), best practices
- Priority 4 LOW: Historical context, release notes, community resources

### TypeScript SDK Features to Document

**Six TypeScript Guide Files Required (Iteration 1 scope):**

#### 1. typescript/setup.md
- npm installation command
- Package.json dependencies (agent-sdk, zod)
- tsconfig.json configuration
- Import patterns
- Environment variables for API keys

#### 2. typescript/query-pattern.md
- Stateless query() usage
- When to use query vs client
- Query options and configuration
- Response structure
- Error handling

#### 3. typescript/client-pattern.md  
- ClaudeSDKClient initialization
- Multi-turn conversations
- Session management
- Message history access
- Client lifecycle

#### 4. typescript/custom-tools.md
- Tool creation with Zod schemas
- Input schema definition
- Handler async patterns
- Error handling in tools
- Multiple tool registration

#### 5. typescript/options.md
- Complete Options interface reference
- Required vs optional fields
- Default values
- Permission configuration
- Hook configuration

#### 6. typescript/streaming.md
- Async iterable pattern
- Chunk types and handling
- Backpressure management
- Error handling in streams

### Code Example Requirements

**Every code example MUST include:**
1. Complete imports (no missing dependencies)
2. Dependency context (versions required)
3. Environment setup (API key handling)
4. Error handling (try/catch patterns)
5. Comments explaining key lines
6. Realistic use cases (not trivial examples)
7. Expected output documentation

**Example Quality Standard:**
```typescript
/**
 * Dependencies: @anthropic-ai/agent-sdk@^1.2.0, zod@^3.22.0
 * Install: npm install @anthropic-ai/agent-sdk zod
 */

import { ClaudeSDKClient, tool } from '@anthropic-ai/agent-sdk';
import { z } from 'zod';

// Create custom file-reading tool
const readFile = tool({
  name: 'read_file',
  description: 'Read contents of a file',
  input_schema: z.object({
    path: z.string().describe('File path to read'),
  }),
  handler: async (input) => {
    try {
      const fs = await import('fs/promises');
      return await fs.readFile(input.path, 'utf-8');
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
});

// Initialize client with custom tool
const client = new ClaudeSDKClient({
  apiKey: process.env.ANTHROPIC_API_KEY,  // Set via: export ANTHROPIC_API_KEY=key
  tools: [readFile],
});
```

### Markdown Formatting Standards

**File Structure Template:**
```markdown
---
title: "Guide Title"
last_updated: "YYYY-MM-DD"
sdk_version: "1.2.0"
language: "typescript|python|cross-language"
difficulty: "beginner|intermediate|advanced"
related_guides:
  - relative-path.md
---

# Guide Title

## Overview
Brief 2-3 sentence summary

## When to Use
Decision criteria for this pattern

## Prerequisites
Links to required reading

## Installation
Shell commands

## Basic Pattern
Minimal working example

## Complete Example
Full-featured realistic code

## Advanced Patterns
Complex scenarios

## Common Patterns
Typical use cases

## Gotchas & Best Practices
Things to avoid, tips to follow

## Troubleshooting
Common issues and solutions

## Next Steps
Where to go from here

## Related Documentation
Cross-references
```

**Formatting Rules:**
- H1 for title only (once per file)
- H2 for major sections
- H3 for subsections
- Code blocks always specify language
- Cross-references use relative paths
- Lists: unordered for concepts, ordered for procedures
- Callouts: **Note:**, **Warning:**, **Pro Tip:**

## Patterns Identified

### Pattern 1: Web Documentation Harvesting
**Description:** Systematic extraction of external documentation into local markdown

**Use Case:** When agents need framework reference but WebFetch is slow/unreliable

**Implementation:**
- Discover all URLs via navigation links
- Fetch each page with polite delays
- Extract text content from HTML
- Organize into agent-friendly structure
- Validate completeness

**Recommendation:** Apply to Agent SDK (MVP), extend to tRPC/Prisma/etc (post-MVP)

### Pattern 2: File-Based Knowledge Distribution
**Description:** Store reference material as markdown in ~/.claude/docs/

**Use Case:** Fast, reliable agent access without network dependency

**Structure:**
```
~/.claude/docs/
├── README.md
├── agent-sdk/
│   ├── overview.md
│   ├── typescript/
│   ├── python/
│   └── examples/
└── [future-frameworks]/
```

**Recommendation:** Establish pattern now, trivial to add frameworks later

### Pattern 3: Minimal Agent Prompt Enhancement
**Description:** Add documentation references without bloating prompts

**Implementation:**
- 30 tokens: Explorer prompt addition
- 25 tokens: Planner prompt addition  
- 35 tokens: Builder prompt addition
- Total: 90 tokens (under 150 limit)

**Recommendation:** References only, trust agents to explore docs

### Pattern 4: Syntax-Only Code Validation
**Description:** Validate examples compile without executing

**Validation Levels:**
- Level 1: Manual review (REQUIRED)
- Level 2: Syntax check with tsc/ast.parse (REQUIRED)
- Level 3: Linting (OPTIONAL)
- Level 4: Execution testing (POST-MVP)

**Recommendation:** Accept Level 1+2 for MVP, defer execution to post-MVP

### Pattern 5: Cross-Language Documentation Parity
**Description:** Mirror structure for TypeScript and Python

**Tracking:**
| Feature | TypeScript | Python | Notes |
|---------|-----------|--------|-------|
| Basic query | ✓ | ✓ | Full parity |
| Custom tools | ✓ | ✓ | Syntax differs |
| Streaming | ✓ | ✓ | Async patterns differ |
| MCP | ✓ | ⚠ | Python experimental |

**Recommendation:** Create TypeScript first, Python in Iteration 2 with explicit parity matrix

## Complexity Assessment

### High Complexity Areas

**1. Web Documentation Harvesting - 3-4 hours**
- External dependency (website changes)
- Completeness validation difficult
- Content extraction from HTML
- Feature discovery (TS vs Python)

Mitigation: URL inventory, manual verification, retry logic, source URL tracking

**2. Code Example Quality Assurance - 2-3 hours**
- Must include ALL imports
- Syntactically valid
- Realistic scenarios
- Cannot runtime-test

Mitigation: Extract from official docs, syntax validation, manual review, expected output sections

### Medium Complexity Areas

**3. Cross-Reference Link Management - 1 hour**
- 20-22 files with multiple links
- Relative paths from each location
- Easy to break during creation

Mitigation: Validation script, consistent patterns, stable structure

**4. Feature Coverage Validation - 1 hour**
- Verify all SDK features documented
- TS and Python coverage may differ
- Official docs may be incomplete

Mitigation: Checklist-based validation, gap tracking

### Low Complexity Areas

**5. Directory Structure Creation - 15 minutes**
Simple shell commands

**6. Agent Prompt Updates - 30 minutes**
Just 3 lines, 90 tokens total

**7. Metadata Addition - 1-2 hours**
YAML frontmatter, scriptable

## Technology Recommendations

### Primary Stack

**Documentation Format: Markdown**
- Native Read tool support
- Grep-friendly searching
- Code fence syntax highlighting
- Human-readable, Git-friendly
- No build step required

**Web Scraping: WebFetch Tool**
- Already available in 2L
- No external dependencies
- Sufficient for static docs
- HTTP GET handling

**Code Validation: tsc + ast.parse**
- TypeScript: tsc --noEmit
- Python: ast.parse()
- Built-in tools
- Catches 90% of errors

**Storage: ~/.claude/docs/agent-sdk/**
- Global directory
- Survives project deletion
- Standard .claude/ location
- Hierarchical structure

### Supporting Libraries

**None Required for MVP**

All functionality via:
- Built-in 2L tools (WebFetch, Read, Write, Grep)
- Standard shell (mkdir, cat, grep)
- TypeScript compiler (tsc)
- Python interpreter (ast.parse)

**Post-MVP Optional:**
- markdownlint (formatting)
- markdown-link-check (validation)
- GitHub Actions (CI/CD)

## Integration Points

### External APIs

**Official Claude Documentation**
- Endpoint: `https://docs.claude.com/en/api/agent-sdk/`
- Method: HTTP GET via WebFetch
- Authentication: None (public)
- Rate Limiting: Unknown (implement 1-2 second delays)

**Error Handling:**
- Network failures: Retry 3 times
- 404 errors: Log and continue
- Timeouts: 30 seconds per page
- Structure changes: Fail gracefully

### Internal Integrations

**Builder → Documentation Files**
- Write tool creates markdown in ~/.claude/docs/agent-sdk/

**Agent Prompts → Documentation**
- Update 3 files: 2l-explorer.md, 2l-planner.md, 2l-builder.md
- Total: 90 tokens

**Agents → Documentation Files**
- Read tool accesses during build
- Grep tool searches for keywords

**Validation → Documentation**
- Script validates links and syntax

## Risks & Challenges

### Technical Risks

**1. Official Documentation Incompleteness**
- Impact: Gaps mean builders still need WebFetch
- Mitigation: Manual verification, Known Gaps section, fallback to WebFetch

**2. Web Scraping Reliability**
- Impact: Cannot harvest if website changes
- Mitigation: Retry logic, partial progress saving, manual fallback

**3. TypeScript vs Python Feature Parity**
- Impact: Promised features don't exist in one language
- Mitigation: Feature matrix early, mark language-specific features

**4. Code Examples Contain Errors**
- Impact: Broken examples damage trust
- Mitigation: Extract from official docs, syntax validation, manual review

### Complexity Risks

**5. Cross-Reference Link Rot**
- Impact: Broken navigation
- Mitigation: Relative paths, validation script, stable structure

**6. Documentation Staleness**
- Impact: Deprecated patterns implemented
- Mitigation: Version metadata, update mechanism, quarterly refresh

**7. Agent Discovery Failure**
- Impact: Docs exist but unused (zero value)
- Mitigation: Keyword triggers, test with real visions, strong directives

## Recommendations for Planner

### 1. Use WebFetch Systematically
- Start with root URL
- Extract all navigation links
- Fetch each subpage
- Save with metadata
- Time: 3-4 hours

### 2. Prioritize Documentation Quality
- 30% of time to validation
- Test every example syntax
- Manual review required
- Explicit dependency versions
- Troubleshooting sections

### 3. Design for Future Scale
```
~/.claude/docs/
├── README.md
├── TEMPLATE.md
├── agent-sdk/           # MVP
└── [future-frameworks]  # Post-MVP
```

### 4. Minimal Agent Prompt Changes
- Explorer: 30 tokens
- Planner: 25 tokens
- Builder: 35 tokens
- Total: 90 tokens (under 150)

### 5. Accept Syntax-Only Validation
- Manual review + tsc/ast.parse for MVP
- Defer execution testing to post-MVP

### 6. Track Feature Parity
- Create matrix in Iteration 1
- Mark language-specific features
- Document gaps explicitly

### 7. Design for Updates
- Version metadata in every file
- Source URLs for re-harvest
- Update mechanism post-MVP

## Questions for Planner

**Q1: API key handling in examples?**
Recommendation: Environment variables only (process.env.ANTHROPIC_API_KEY)

**Q2: Troubleshooting.md detail level?**
Recommendation: Common errors only (10-15 scenarios), expand post-MVP

**Q3: Python type hints?**
Recommendation: Full type hints (match TypeScript type safety)

**Q4: Performance optimization tips?**
Recommendation: Brief notes where relevant (not dedicated sections)

**Q5: Beta/experimental features?**
Recommendation: Document everything, mark experimental clearly

## Resource Map

### Critical Files/Directories

```
~/.claude/docs/agent-sdk/
├── overview.md
├── quickstart.md
├── typescript/          # 6 files
├── python/              # 6 files
├── concepts/            # 6 files
├── examples/            # 5+ files
└── troubleshooting.md

~/.claude/agents/
├── 2l-explorer.md      # +30 tokens
├── 2l-planner.md       # +25 tokens
└── 2l-builder.md       # +35 tokens
```

### Key Dependencies

**Runtime:** None (static markdown)

**Build/Validation:**
- TypeScript compiler (tsc)
- Python interpreter
- WebFetch tool
- Standard shell tools

**External:**
- docs.claude.com (only during harvest)
- Network (only during creation)

### Testing Infrastructure

**MVP Validation:**
1. Manual code review (REQUIRED)
2. Syntax validation: tsc --noEmit, ast.parse (REQUIRED)
3. Link validation script (REQUIRED)
4. Completeness checklist (REQUIRED)

**Post-MVP:**
- Execution testing
- CI/CD integration
- Performance benchmarking

## Limitations

- MCP unavailable for this exploration
- WebFetch reliability unknown until tested
- SDK version unknown (assuming stable v1.x)
- Cannot validate execution without API keys
- TypeScript/Python parity unknown until harvest
- Official docs completeness unknown

---

*Explorer 2 Report Complete*  
*Report Location: /home/ahiya/Ahiya/2L/.2L/plan-4/iteration-3/exploration/explorer-2-report.md*  
*Ready for master planning decisions*
