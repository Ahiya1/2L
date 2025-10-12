# Vision: GitHub Repository Statistics CLI Tool

## Overview

Build a CLI tool called 'ghstats' that fetches and displays GitHub repository statistics. The tool will accept a repository URL as an argument, fetch key metrics via the GitHub API, and display them in a clean, formatted terminal output.

## Core Features

### CLI Interface
- Accept repository identifier as command-line argument (format: `owner/repo`)
- Use commander.js for robust CLI argument parsing
- Simple invocation: `node ghstats.js owner/repo`

### GitHub API Integration
- Fetch repository statistics via GitHub API
- Display key metrics:
  - Stars
  - Forks
  - Open issues
  - Watchers

### Error Handling
- Gracefully handle repository not found (404)
- Handle GitHub API rate limits with clear error messages
- Provide helpful error messages for invalid input
- Network error handling

### Output Formatting
- Clean, readable terminal output
- Formatted display of statistics
- User-friendly presentation

## Technical Requirements

### Technology Stack
- **Runtime**: Node.js
- **CLI Framework**: commander
- **HTTP Client**: Built-in fetch or axios for GitHub API requests

### API Endpoint
- GitHub REST API v3
- Repository endpoint: `https://api.github.com/repos/{owner}/{repo}`

## Success Criteria

1. ✅ User can run `node ghstats.js owner/repo` successfully
2. ✅ Tool fetches and displays stars, forks, issues, and watchers
3. ✅ Errors are handled gracefully with clear messages
4. ✅ Output is formatted and easy to read
5. ✅ Rate limit errors are caught and displayed
6. ✅ 404 errors show "repository not found" message

## Non-Goals

- Authentication (use public API, unauthenticated)
- Historical data or trends
- Multiple repository comparison
- Web interface
- Publishing to npm

## Approach

This project is a straightforward CLI tool with a single primary function. Implementation should be:
- Simple and focused
- Well-structured code
- Clear separation between CLI logic, API client, and output formatting
- Comprehensive error handling

---

*Auto-generated: 2025-10-12*
*Plan ID: plan-1*
