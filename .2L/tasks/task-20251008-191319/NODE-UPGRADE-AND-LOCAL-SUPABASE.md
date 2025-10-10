# Node.js Upgrade & Local Supabase MCP Configuration

## Task Summary

**Date**: 2025-10-08
**Status**: ✅ Node 20 Installed | ⚠️ Local Supabase Pending

---

## Part 1: Node.js Upgrade ✅ COMPLETE

### What Was Done

1. **Installed NVM (Node Version Manager)**
   ```bash
   wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
   ```

2. **Installed Node 20 LTS**
   ```bash
   nvm install 20
   nvm use --delete-prefix 20
   nvm alias default 20
   ```

3. **Configured for Auto-Load**
   - nvm initialization already added to `~/.bashrc`
   - Will load automatically in new terminal sessions

### Current Versions

**In New Sessions (with nvm loaded)**:
- Node: v20.19.5 ✅
- npm: v10.8.2 ✅

**In Current Session**:
- Still using system Node 18.19.1 (until restart)

### Chrome DevTools MCP Status

**Before**: ❌ Failed (Required Node 20+)
**After**: ✅ Will work in new Claude Code sessions

**How to Verify After Restart**:
```bash
# Start new terminal or reload shell
source ~/.bashrc

# Check Node version
node --version  # Should show v20.19.5

# Test Chrome DevTools MCP
claude mcp list
# chrome-devtools should now show ✓ Connected
```

---

## Part 2: Local Supabase MCP ⚠️ REQUIRES SETUP

### Current Status

**Configured**: Hosted Supabase at `https://mcp.supabase.com/mcp` (cloud)
**Desired**: Local Supabase at `http://localhost:54321/mcp` (development)

### Why Local Supabase Matters for 2L

**Benefits for 2L Orchestration**:
1. **Validation Phase**: Agents can verify database schema changes
2. **Integration Testing**: Test database queries without cloud access
3. **Seeding**: Populate test data during builds
4. **Migration Testing**: Verify migrations before deployment
5. **No OAuth Required**: Local instances don't need authentication

### Option 1: Use Supabase CLI (Recommended)

**Requirements**:
- Docker installed and running
- Supabase CLI installed

**Installation Steps**:

1. **Install Docker** (if not installed):
   ```bash
   # Follow official Docker installation for your OS
   # https://docs.docker.com/engine/install/
   ```

2. **Install Supabase CLI**:
   ```bash
   # Using standalone binary (recommended)
   # Visit: https://github.com/supabase/cli/releases/latest
   # Download supabase_linux_amd64.tar.gz

   wget https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
   tar -xzf supabase_linux_amd64.tar.gz
   sudo mv supabase /usr/local/bin/
   supabase --version
   ```

3. **Initialize Supabase Project**:
   ```bash
   cd /home/ahiya/Ahiya/2L
   supabase init
   ```

4. **Start Local Supabase**:
   ```bash
   supabase start
   # This will:
   # - Start Postgres on localhost:54322
   # - Start Studio on http://localhost:54323
   # - Start MCP server on http://localhost:54321/mcp
   ```

5. **Configure MCP for Local Supabase**:
   ```bash
   # Remove hosted Supabase
   claude mcp remove supabase --scope user

   # Add local Supabase via HTTP transport
   claude mcp add --scope user --transport http supabase http://localhost:54321/mcp
   ```

6. **Verify Connection**:
   ```bash
   supabase status  # Check all services running
   claude mcp list  # supabase should show ✓ Connected
   ```

**Supabase Local Services**:
- **API**: http://localhost:54321
- **Studio**: http://localhost:54323 (web UI)
- **DB**: postgresql://postgres:postgres@localhost:54322/postgres
- **MCP**: http://localhost:54321/mcp

### Option 2: Self-Hosted MCP Server

If you have an existing Postgres database and don't want full Supabase:

**Install Self-Hosted MCP**:
```bash
git clone https://github.com/HenkDz/selfhosted-supabase-mcp.git
cd selfhosted-supabase-mcp
npm install
npm run build
```

**Configure**:
```bash
# Set environment variables
export SUPABASE_URL=http://localhost:8000
export SUPABASE_ANON_KEY=your_anon_key
export DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres

# Run the server
node dist/index.js
```

**Add to Claude Code**:
```bash
claude mcp add --scope user supabase-local node \
  /path/to/selfhosted-supabase-mcp/dist/index.js \
  -e SUPABASE_URL=http://localhost:8000 \
  -e DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
```

### Option 3: PostgREST MCP (Minimalist)

For direct Postgres access without full Supabase:

**Install PostgREST MCP**:
```bash
# This is an npm package that connects to PostgREST endpoints
claude mcp add --scope user postgrest npx -- -y @supabase/mcp-server-postgrest
```

**Configuration**: Requires PostgREST running and environment variables for connection.

### Comparison

| Option | Complexity | Features | Best For |
|--------|-----------|----------|----------|
| **Supabase CLI** | Medium | Full Supabase stack | Complete local development |
| **Self-Hosted MCP** | Low | Custom DB connection | Existing Postgres setup |
| **PostgREST MCP** | Low | REST API to Postgres | Minimalist approach |
| **Hosted (Current)** | Lowest | Cloud-based | No local setup |

---

## Recommended Path Forward

### For Complete 2L Integration

**Use Supabase CLI** for full local development environment:

1. **Install Docker**: Required by Supabase CLI
2. **Install Supabase CLI**: For local Supabase instance
3. **Initialize in 2L project**: `cd /home/ahiya/Ahiya/2L && supabase init`
4. **Start services**: `supabase start`
5. **Configure MCP**: Point to `http://localhost:54321/mcp`

### Quick Test (Current Hosted Setup)

If you want to test MCPs work now:

1. **Restart Claude Code** (to get Node 20)
2. **Test MCPs**:
   ```bash
   claude mcp list
   # All MCPs should now work:
   # - playwright: ✓
   # - chrome-devtools: ✓ (Node 20 fixed it)
   # - screenshot: ✓
   # - supabase: ⚠️ (hosted, requires OAuth)
   ```

3. **Try Supabase**:
   - First use will open browser for OAuth
   - After auth, you can query cloud Supabase projects

---

## Current MCP Configuration

**User Scope** (`~/.claude.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    },
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    },
    "screenshot": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@kazuph/mcp-screenshot"]
    },
    "supabase": {
      "type": "sse",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

---

## Next Session Status (After Restart)

### Expected Working MCPs: 4 of 4 ✅

| MCP | Status | Transport | Notes |
|-----|--------|-----------|-------|
| **Playwright** | ✅ Working | stdio/npx | Browser automation ready |
| **Chrome DevTools** | ✅ Working | stdio/npx | **FIXED** with Node 20 |
| **Screenshot** | ✅ Working | stdio/npx | Visual capture ready |
| **Supabase** | ⚠️ Cloud | SSE/hosted | Works with OAuth |

### To Switch to Local Supabase

1. Install & start local Supabase
2. Run:
   ```bash
   claude mcp remove supabase --scope user
   claude mcp add --scope user --transport http supabase http://localhost:54321/mcp
   ```

---

## Testing the Setup

### After Restarting Claude Code

**Verify Node 20**:
```bash
node --version  # Should be v20.19.5
```

**Test All MCPs**:
```bash
claude mcp list
# Expected:
# playwright: ✓ Connected
# chrome-devtools: ✓ Connected
# screenshot: ✓ Connected
# supabase: ✓ Connected (or requires OAuth on first use)
```

**Test with 2L**:
```bash
cd /home/ahiya/Ahiya/2L
# Run any 2L orchestration
# Agents will automatically use MCPs when needed
```

---

## Files & Configuration

**Configuration File**: `~/.claude.json` (user scope - global)

**Shell Configuration**: `~/.bashrc`
- nvm initialization: ✅ Present
- Loads on new terminal sessions

**Node Versions Available**:
- System: v18.19.1 (old)
- nvm default: v20.19.5 ✅ (active in new sessions)

---

## Summary

### ✅ Completed

- Installed NVM
- Installed Node 20.19.5
- Set Node 20 as default
- Chrome DevTools MCP will work after restart

### ⚠️ Pending (Local Supabase)

**Current**: Using hosted Supabase (cloud)
**Desired**: Local Supabase (development)

**Action Required**:
1. Install Docker
2. Install Supabase CLI
3. Initialize local Supabase project
4. Update MCP configuration to point to localhost

**OR**

Accept current hosted setup for now and switch to local later when needed.

---

## Resources

- [Supabase CLI Installation](https://github.com/supabase/cli#install-the-cli)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Self-Hosted Supabase MCP](https://github.com/HenkDz/selfhosted-supabase-mcp)
- [Supabase MCP Docs](https://supabase.com/docs/guides/getting-started/mcp)
- [NVM Documentation](https://github.com/nvm-sh/nvm)

---

**Report Created**: 2025-10-08 19:36
**Node 20 Status**: ✅ Installed, will be active after restart
**Local Supabase Status**: ⚠️ Requires Docker + Supabase CLI installation
