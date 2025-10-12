# ghstats - GitHub Repository Statistics CLI

Fetch and display GitHub repository statistics from the command line.

## Prerequisites

- **Node.js 18 or higher** (for built-in fetch API support)
- Check your version: `node --version`
- Install/upgrade: https://nodejs.org

## Installation

```bash
# Clone or download this project
cd ghstats

# Install dependencies
npm install

# Optional: Make globally available
npm link
```

## Usage

### Basic Usage

```bash
node ghstats.js <owner/repo>
```

### Examples

```bash
# Popular repositories
node ghstats.js facebook/react
node ghstats.js microsoft/vscode
node ghstats.js torvalds/linux

# Your own repository
node ghstats.js yourusername/yourrepo
```

### If Globally Installed (npm link)

```bash
ghstats facebook/react
```

## Output

```
Fetching repository statistics...

Repository: facebook/react
────────────────────────────────────────
Stars:           239,697
Forks:            49,565
Open Issues:       1,060
Watchers:          6,701
────────────────────────────────────────
```

## Options

```bash
ghstats --help     # Display help text
ghstats --version  # Display version
```

## Error Handling

The tool handles common errors gracefully:

- **Invalid format**: Displays usage example
- **Repository not found**: Suggests checking spelling and visibility
- **Rate limit exceeded**: Shows reset time (60 requests/hour limit)
- **Network errors**: Prompts to check internet connection

## How It Works

1. Validates repository format (owner/repo)
2. Fetches data from GitHub REST API v3
3. Displays formatted statistics

**Note:** Uses unauthenticated API (60 requests/hour limit). For higher limits, consider GitHub authentication.

## License

MIT

## Author

Built with Claude Code
