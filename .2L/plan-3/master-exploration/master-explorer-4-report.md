# Master Exploration Report

## Explorer ID
master-explorer-4

## Focus Area
Scalability & Performance Considerations

## Vision Summary
Transform 2L from development tool to production-ready system with automated installation, zero-config setup, and instant dashboard startup - enabling 5-minute onboarding from git clone to first orchestration.

---

## Requirements Analysis

### Scope Assessment
- **Total features identified:** 6 must-have features
- **User stories/acceptance criteria:** 42 acceptance criteria
- **Estimated total work:** 14-18 hours

### Complexity Rating
**Overall Complexity: MEDIUM**

**Rationale:**
- **Performance-critical features:** Dashboard startup optimization (30s -> <2s target = 93% reduction), installation idempotency
- **Scalability concerns:** Multi-machine portability, concurrent dashboard sessions (20 ports), file I/O operations (backup/restore)
- **Infrastructure requirements:** Shell script performance, database connection pooling, HTTP server efficiency
- **Monitoring needs:** Installation state tracking, health checks, graceful degradation patterns

---

## Performance Bottlenecks Analysis

### Critical Bottleneck 1: Dashboard Agent Spawning (Feature 4)

**Current state:**
- Dashboard startup: ~30 seconds
- Cause: Spawning agent just to generate HTML template
- Agent overhead: Claude context loading, initialization, prompt processing

**Performance impact:** HIGH
- User experience severely degraded
- Blocks real-time monitoring during orchestration
- 30s delay unacceptable for observability tool

**Target performance:**
- Dashboard startup: <2 seconds (93% reduction)
- Method: Direct template substitution (no agent spawn)

**Optimization strategy:**
1. **Template caching:** Store `2l-dashboard-template.html` in `~/.claude/lib/`
2. **Direct file operations:** Read template, replace placeholders inline (bash string ops)
3. **Eliminate agent spawn:** Remove entire agent invocation path
4. **Pre-generated HTML:** Write directly to `.2L/dashboard/index.html`

**Technical implementation:**
```bash
# Current (slow):
# 1. Check HTML -> 2. Spawn builder agent -> 3. Agent generates HTML -> 4. Start server

# Optimized (fast):
# 1. Read template from ~/.claude/lib/2l-dashboard-template.html
# 2. sed/awk inline replacement (PROJECT_NAME, TIMESTAMP, EVENTS_PATH)
# 3. Write to .2L/dashboard/index.html
# 4. Start server immediately

# Example inline replacement (bash):
TEMPLATE="$HOME/.claude/lib/2l-dashboard-template.html"
PROJECT_NAME=$(basename "$PWD")
TIMESTAMP=$(date -Iseconds)
sed -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
    -e "s/{{TIMESTAMP}}/$TIMESTAMP/g" \
    -e "s|{{EVENTS_PATH}}|../events.jsonl|g" \
    "$TEMPLATE" > .2L/dashboard/index.html
```

**Performance gain estimate:**
- Agent spawn elimination: -25s
- File I/O optimization: -3s
- Total improvement: ~28 seconds (30s -> 2s)

**Acceptance criteria validation:**
- "Reduces dashboard startup time from ~30s to <2s" - ACHIEVABLE with direct template approach
- "Maintains all existing dashboard functionality" - Template approach preserves all features

---

### Critical Bottleneck 2: Installation Script I/O (Feature 1)

**Current state:**
- Installation must copy agents, commands, templates to `~/.claude/`
- Estimated files: 15-20 agent files, 10-15 command files, 5+ library templates
- Total file operations: 30-40 copies + directory creation + backup operations

**Performance impact:** MEDIUM
- Installation time: Estimated 3-5 seconds on SSD, 10-15s on HDD
- Backup operations add overhead (copying existing files before overwrite)
- Idempotency checks require file existence validation

**Optimization strategy:**
1. **Batch copy operations:** Use `cp -r` for directory copies instead of individual files
2. **Conditional backups:** Only backup if files exist and differ (use `cmp` for comparison)
3. **Parallel operations:** Independent copy operations can run concurrently (agents, commands, lib)
4. **Incremental updates:** `--update` flag only copies changed files

**Technical implementation:**
```bash
# Optimized approach:
# 1. Parallel directory copies
cp -r agents/* ~/.claude/agents/ &
cp -r commands/* ~/.claude/commands/ &
cp -r lib/* ~/.claude/lib/ &
wait  # Wait for all background processes

# 2. Smart backup (only if different)
if [ -f "$DEST" ] && ! cmp -s "$SRC" "$DEST"; then
  cp "$DEST" "$BACKUP_DIR/$(date +%Y%m%d-%H%M%S)-$(basename $DEST)"
fi
```

**Performance considerations:**
- SSD vs HDD: 3-5s vs 10-15s (factor of 3x)
- Network-mounted home: Potential 30-60s if `~/.claude/` on slow NFS
- Mitigation: Progress indicators, verbose output to show activity

**Acceptance criteria validation:**
- "Idempotent (can run multiple times without breaking)" - Requires existence checks (adds 1-2s)
- "Backs up existing configuration before overwriting" - Backup adds 2-4s depending on file count

**Performance target:** Complete installation in <10 seconds on modern SSD

---

### Bottleneck 3: Database Connection Pooling (Feature 2)

**Current state:**
- Database setup establishes psql connection to Supabase local (localhost:54322)
- Each query spawns new psql process
- No connection pooling or persistent connection

**Performance impact:** LOW-MEDIUM
- Setup is one-time operation
- Testing connection: 1-2 queries at setup time
- Ongoing usage: Agents spawn psql per query (acceptable for orchestration workloads)

**Scalability concern:**
- If 10+ builders query DB concurrently: 10+ psql processes
- PostgreSQL default max connections: 100 (sufficient for 2L workloads)
- Supabase local typically handles 20-30 concurrent connections easily

**Optimization strategy:**
1. **Connection test caching:** Store last successful connection test timestamp
2. **Skip redundant tests:** If tested within last 5 minutes, skip re-test
3. **Batch queries:** When possible, combine multiple SQL statements

**NOT CRITICAL:** Database access is infrequent during orchestration (schema validation, not high-frequency queries)

**Acceptance criteria validation:**
- "Tests connection to Supabase local (localhost:54322)" - Single test query, <500ms overhead
- "Verifies Claude can execute SQL queries via psql" - One-time validation, acceptable latency

---

### Bottleneck 4: MCP Setup Instruction Generation (Feature 3)

**Current state:**
- MCP setup generates configuration snippets and instructions
- Primarily text generation and file reading

**Performance impact:** NEGLIGIBLE
- Text templating: <100ms
- File I/O for config reading: <50ms
- Total overhead: <200ms

**No optimization needed** - Performance already excellent

---

## Scalability Concerns

### Scalability Concern 1: Multi-Project Dashboard Sessions

**Current design:**
- Port range: 8080-8099 (20 concurrent dashboards)
- Each project allocates one port
- State files: `.2L/dashboard/.server-port`, `.server-pid`

**Scalability analysis:**

**Capacity:** 20 concurrent projects
- **Sufficient for:** Individual developers (typical: 1-3 active projects)
- **Insufficient for:** Large teams with 20+ concurrent projects on single machine

**Resource consumption per dashboard:**
- **Memory:** ~15-30MB per Python HTTP server
- **CPU:** <1% (idle most of time, 2-5% during polling)
- **Network:** Localhost only, no external traffic
- **Disk I/O:** Minimal (serving static files, reading events.jsonl every 2s)

**Total resource footprint (20 dashboards):**
- **Memory:** 300-600MB (acceptable on 8GB+ systems)
- **CPU:** 20-40% during peak polling (acceptable)
- **Ports:** 20 ports on localhost (no conflict with external services)

**Scalability recommendations:**

1. **Current design is ADEQUATE** for individual developer use case
2. **If scaling beyond 20 projects needed:**
   - Expand port range (8080-8199 = 120 ports)
   - Implement port cleanup on project deletion
   - Add `2l-dashboard-cleanup` command to kill orphaned servers

3. **Alternative architecture (future):**
   - Single dashboard server with multi-project support
   - Switch projects via URL query params: `localhost:8080/dashboard?project=X`
   - Reduces resource footprint from 20 servers to 1 server
   - Complexity: Moderate (requires project detection and event file routing)

**Risk level:** LOW - Current 20-project limit adequate for MVP target users

---

### Scalability Concern 2: Installation State Tracking

**Proposed design:**
- Location: `~/.claude/.2l-install.yaml`
- Fields: `installed_at`, `version`, `components`, `backups`

**Scalability analysis:**

**File size growth:**
- Base metadata: ~200 bytes
- Components list: ~500 bytes (20 components × 25 bytes each)
- Backups list: ~100 bytes per backup × N backups

**Growth rate:**
- Each installation with backup: +100 bytes to backups list
- 100 installations: ~10KB file size
- 1000 installations: ~100KB file size

**Performance impact:**
- YAML parsing: <10ms for files <100KB
- Write operations: <5ms
- **NEGLIGIBLE** - Installation state file remains small even after hundreds of updates

**Recommendations:**
1. **Backup rotation:** Keep last 10 backups, delete older entries
2. **Compression:** Not needed (file stays <100KB even with 1000 installs)
3. **Current design is SUFFICIENT** for long-term use

---

### Scalability Concern 3: Backup Directory Growth

**Proposed behavior:**
- Backup existing files before overwriting
- Location: `~/.claude/.2l-backups/TIMESTAMP-filename`

**Scalability analysis:**

**Storage consumption:**
- Average agent file: 10-20KB
- Average command file: 5-10KB
- Total per backup: ~500KB-1MB (all agents + commands)

**Growth rate:**
- 1 installation per week: 52MB/year
- 1 installation per day: 365MB/year
- 10 installations per day: 3.65GB/year

**Disk impact:**
- **Low-frequency updates:** NEGLIGIBLE (<100MB/year)
- **High-frequency updates:** MEDIUM (1-5GB/year)

**Mitigation strategies:**

1. **Backup retention policy:**
   - Keep last 10 backups only
   - Auto-delete backups older than 30 days
   - Max disk usage: 10MB (10 backups × 1MB)

2. **Smart backup (only if changed):**
   - Use `cmp -s` to compare files before backup
   - Skip backup if identical
   - Reduces backups by 80-90% for unchanged files

3. **Compression:**
   - Gzip backup archives: `tar czf ~/.claude/.2l-backups/backup-TIMESTAMP.tar.gz`
   - Compression ratio: 70-80% (1MB -> 200-300KB)
   - 10 compressed backups: ~3MB total

**Recommendation:**
- Implement backup rotation (keep last 10)
- Use smart backup (skip identical files)
- Compression optional (nice-to-have, not critical)

**Acceptance criteria impact:**
- "Backs up existing configuration before overwriting" - Must track backup count
- "Idempotent (can run multiple times without breaking)" - Backup rotation ensures disk doesn't fill

---

### Scalability Concern 4: Concurrent Installation Attempts

**Scenario:** User runs `./2l.sh install` in multiple terminals simultaneously

**Race conditions:**
1. **File writes:** Two processes writing to `~/.claude/agents/agent-1.sh`
2. **Backup creation:** Concurrent backup to same timestamp (collision)
3. **State file:** Concurrent writes to `.2l-install.yaml`

**Mitigation strategies:**

1. **File locking:**
   ```bash
   # Acquire lock before installation
   LOCK_FILE="$HOME/.claude/.2l-install.lock"
   exec 200>"$LOCK_FILE"
   flock -n 200 || { echo "Installation already running"; exit 1; }
   ```

2. **Atomic writes:**
   ```bash
   # Write to temp file, then atomic move
   cp file.sh /tmp/file.sh.tmp
   mv /tmp/file.sh.tmp ~/.claude/agents/file.sh
   ```

3. **Timestamp collision avoidance:**
   ```bash
   # Use PID in backup filename
   BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)-$$.tar.gz"
   ```

**Risk level:** LOW - Concurrent installations unlikely in practice (user must explicitly run twice)

**Recommendation:** Implement file locking (simple, prevents all race conditions)

---

## Database Optimization Needs

### Database Access Pattern Analysis

**Current design:**
- Database access via psql command-line tool
- Connection: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Usage pattern: Infrequent queries during orchestration (schema validation, test data seeding)

**Query complexity:** LOW
- Typical queries: `SELECT * FROM table_name LIMIT 10;` (testing)
- Schema queries: `\d table_name` (introspection)
- No complex joins, aggregations, or analytical queries

**Indexing strategy:**
- **NOT APPLICABLE** - 2L doesn't create database schemas
- Database indexing is responsibility of application being built, not 2L system

**Connection pooling:**
- **NOT NEEDED** - Infrequent access pattern (1-5 queries per orchestration)
- Each psql invocation creates connection, executes query, closes connection
- Overhead: ~50-100ms per query (acceptable for low-frequency access)

**Performance acceptance criteria:**
- Database setup connection test: <2 seconds
- Individual query execution: <500ms (including psql startup)

**Optimization recommendations:**
1. **Connection test caching:** Store last successful test (skip re-test if recent)
2. **Query timeout:** Set `--command-timeout=5s` to prevent hung queries
3. **Error handling:** Graceful degradation if database unavailable

**Risk level:** LOW - Database performance already adequate for 2L use case

---

## Infrastructure Requirements

### Compute Resources

**Per-project resource consumption:**

| Component | CPU | Memory | Disk I/O |
|-----------|-----|--------|----------|
| Installation script | 5-10% (burst) | 50-100MB | 1-2MB writes |
| Dashboard server | <1% (idle), 2-5% (polling) | 15-30MB | 10-20KB/s reads |
| Database setup | 2-5% (during setup) | 20-50MB | Minimal |
| MCP setup | <1% | 10-20MB | Minimal |

**Concurrent orchestration scenario (3 projects):**
- **CPU:** 10-20% total (mostly idle)
- **Memory:** 150-300MB total
- **Disk I/O:** 30-60KB/s (event polling)

**Minimum system requirements:**
- **CPU:** 2 cores (1 core sufficient, 2 recommended)
- **Memory:** 2GB available (4GB recommended)
- **Disk:** 500MB free space (for installation + backups)
- **Network:** Not required (localhost-only operations)

**Recommended system specifications:**
- **CPU:** 4 cores
- **Memory:** 8GB total (2GB available for 2L)
- **Disk:** SSD with 2GB+ free space
- **OS:** Ubuntu 24.04, macOS 12+, WSL2 on Windows

**Scaling characteristics:**
- **Linear scaling:** Each additional project adds ~50MB memory, <5% CPU
- **20-project limit:** 1GB memory, 40-60% CPU (acceptable on modern hardware)

---

### Caching Strategies

#### Cache 1: Dashboard Template (Feature 4)

**What to cache:**
- Dashboard HTML template in `~/.claude/lib/2l-dashboard-template.html`
- Template size: ~50-100KB
- Update frequency: Only on 2L version updates

**Cache strategy:**
- **Location:** `~/.claude/lib/` (persistent across sessions)
- **Invalidation:** Manual (user runs `./2l.sh install --update`)
- **TTL:** Infinite (template doesn't expire)

**Performance benefit:**
- Eliminates agent spawn (30s -> 0s)
- Template read from disk: <10ms
- **Total benefit:** ~30 seconds per dashboard start

**Implementation:**
```bash
# Template is static file installed once
# No cache invalidation logic needed
# Always read from ~/.claude/lib/2l-dashboard-template.html
```

---

#### Cache 2: Database Connection Test

**What to cache:**
- Last successful database connection test result
- Test timestamp
- Connection string validation

**Cache strategy:**
- **Location:** `.2L/.db-test-cache` (project-specific)
- **Invalidation:** Time-based (5-minute TTL)
- **Format:** `TIMESTAMP=2025-10-10T02:00:00Z\nSTATUS=success`

**Performance benefit:**
- Skip redundant connection tests
- Saves 1-2 seconds per validation
- **Use case:** Multiple commands requiring DB access in short succession

**Implementation:**
```bash
# Read cache
if [ -f .2L/.db-test-cache ]; then
  CACHE_TIME=$(grep TIMESTAMP .2L/.db-test-cache | cut -d= -f2)
  NOW=$(date -Iseconds)
  AGE=$(($(date -d "$NOW" +%s) - $(date -d "$CACHE_TIME" +%s)))

  if [ $AGE -lt 300 ]; then  # 5 minutes = 300 seconds
    echo "Database connection verified (cached)"
    exit 0
  fi
fi

# Run test and cache result
psql "postgresql://..." -c "SELECT 1" && echo -e "TIMESTAMP=$(date -Iseconds)\nSTATUS=success" > .2L/.db-test-cache
```

**Risk:** Stale cache if database stops between tests
**Mitigation:** Short TTL (5 minutes), graceful degradation on actual query failure

---

#### Cache 3: Installation State

**What to cache:**
- Installed component versions
- Last installation timestamp
- Backup locations

**Cache strategy:**
- **Location:** `~/.claude/.2l-install.yaml` (persistent)
- **Invalidation:** On each installation (update file)
- **TTL:** Infinite (state file, not cache)

**Performance benefit:**
- Enables idempotency checks
- Prevents redundant backups of unchanged files
- **Use case:** `./2l.sh install` detects existing installation

**Implementation:**
```yaml
installed_at: "2025-10-10T02:00:00Z"
version: "1.0.0"
components:
  - name: "agent-orchestrator"
    checksum: "abc123"
  - name: "command-2l-mvp"
    checksum: "def456"
backups:
  - timestamp: "2025-10-09T15:00:00Z"
    location: "~/.claude/.2l-backups/backup-20251009-150000.tar.gz"
```

---

### Deployment Complexity

**Deployment model:** Script-based installation (no containerization in MVP)

**Deployment steps:**
1. Git clone repository
2. Run `./2l.sh install`
3. Run `/2l-setup-db` (optional)
4. Run `/2l-setup-mcps` (optional)

**Complexity analysis:**

| Aspect | Complexity | Rationale |
|--------|------------|-----------|
| Installation | LOW | Single script, no dependencies beyond Python 3 & Git |
| Configuration | LOW | Automated setup commands, minimal manual config |
| Updates | LOW | `./2l.sh install --update` overwrites with backup |
| Rollback | MEDIUM | Manual restore from backup directory |
| Multi-environment | LOW | Same script works on Ubuntu, macOS, WSL2 |

**CI/CD considerations:**
- **Automated testing:** Run installation on fresh VM, verify files copied correctly
- **Integration tests:** Test dashboard startup time (<2s requirement)
- **Idempotency tests:** Run installation 10 times, verify no errors
- **Performance benchmarks:** Track installation time (target: <10s on SSD)

**Deployment automation opportunities:**
1. **GitHub Actions:** Test installation on Ubuntu/macOS matrices
2. **Docker image (future):** Pre-installed 2L for instant deployment
3. **Ansible playbook (future):** Multi-machine deployment for teams

**Risk level:** LOW - Simple deployment model, well-suited for individual developers

---

## Monitoring and Observability Requirements

### Monitoring Requirement 1: Installation Success Rate

**What to monitor:**
- Installation completion status (success/failure)
- Installation duration (target: <10s)
- Backup creation success
- Component copy verification

**Implementation strategy:**
```bash
# Installation script logging
INSTALL_LOG="$HOME/.claude/.2l-install.log"
echo "$(date -Iseconds) START installation" >> "$INSTALL_LOG"

# Track each component
echo "$(date -Iseconds) COPY agents/ -> ~/.claude/agents/" >> "$INSTALL_LOG"
cp -r agents/* ~/.claude/agents/ && echo "$(date -Iseconds) SUCCESS agents" >> "$INSTALL_LOG" || echo "$(date -Iseconds) FAILURE agents" >> "$INSTALL_LOG"

# Final status
echo "$(date -Iseconds) COMPLETE installation (duration: ${DURATION}s)" >> "$INSTALL_LOG"
```

**Observability:**
- Users can review installation log for troubleshooting
- `./2l.sh install --verbose` provides real-time progress
- Log retention: Last 100 installations (auto-rotate)

---

### Monitoring Requirement 2: Dashboard Performance

**What to monitor:**
- Dashboard startup time (target: <2s)
- Port allocation failures
- Server crash/restart events
- Event polling latency

**Implementation strategy:**
```bash
# Dashboard command logging
DASHBOARD_LOG=".2L/dashboard/.performance.log"
START_TIME=$(date +%s%N)

# Generate HTML
generate_dashboard_html

END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds

echo "$(date -Iseconds) Dashboard startup: ${DURATION}ms" >> "$DASHBOARD_LOG"

# Alert if slow
if [ $DURATION -gt 2000 ]; then
  echo "WARNING: Dashboard startup took ${DURATION}ms (target: <2000ms)"
fi
```

**Performance acceptance criteria:**
- 95% of dashboard starts complete in <2 seconds
- 99% of dashboard starts complete in <5 seconds
- 100% of dashboard starts complete in <10 seconds (failure threshold)

**Metrics to track:**
- Startup duration (ms)
- Template substitution time (ms)
- HTTP server initialization time (ms)
- Port allocation time (ms)

---

### Monitoring Requirement 3: Database Connection Health

**What to monitor:**
- Database connection success rate (target: >95%)
- Connection test duration (target: <2s)
- Query execution time
- Connection failures and error codes

**Implementation strategy:**
```bash
# Database setup logging
DB_LOG=".2L/.db-setup.log"

# Test connection with timing
START=$(date +%s%N)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT 1" 2>&1 | tee -a "$DB_LOG"
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))

echo "$(date -Iseconds) Connection test: ${DURATION}ms (status: $?)" >> "$DB_LOG"
```

**Alerting thresholds:**
- Connection test >5 seconds: WARNING (network issue?)
- Connection test fails: ERROR (provide troubleshooting steps)
- Repeated failures (3+): CRITICAL (suggest manual debugging)

---

### Monitoring Requirement 4: Backup Directory Size

**What to monitor:**
- Backup directory disk usage
- Number of backups stored
- Backup rotation effectiveness

**Implementation strategy:**
```bash
# Check backup directory size
BACKUP_DIR="$HOME/.claude/.2l-backups"
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR" | wc -l)

# Log metrics
echo "$(date -Iseconds) Backups: $BACKUP_COUNT files, $BACKUP_SIZE total" >> "$HOME/.claude/.2l-install.log"

# Alert if excessive
if [ $BACKUP_COUNT -gt 10 ]; then
  echo "INFO: Rotating old backups (keeping last 10)"
  # Delete oldest backups
  ls -1t "$BACKUP_DIR" | tail -n +11 | xargs -I {} rm "$BACKUP_DIR/{}"
fi
```

**Observability:**
- Installation script reports backup count and size
- Automatic cleanup prevents disk exhaustion
- User can review backup history in installation log

---

## Resource Optimization Strategies

### Optimization 1: Lazy Template Loading (Dashboard)

**Current design:** Template loaded on every dashboard start

**Optimization:**
- Template already in `~/.claude/lib/` (installed once)
- Read template only when needed (dashboard start)
- No pre-loading or caching in memory (not needed for CLI tool)

**Performance impact:**
- Template read: ~10ms (negligible)
- No optimization needed - already efficient

---

### Optimization 2: Parallel File Copying (Installation)

**Current design:** Sequential file copying (agents, commands, lib)

**Optimization:**
```bash
# Sequential (current)
cp -r agents/* ~/.claude/agents/
cp -r commands/* ~/.claude/commands/
cp -r lib/* ~/.claude/lib/

# Parallel (optimized)
cp -r agents/* ~/.claude/agents/ &
PID1=$!
cp -r commands/* ~/.claude/commands/ &
PID2=$!
cp -r lib/* ~/.claude/lib/ &
PID3=$!

wait $PID1 $PID2 $PID3  # Wait for all to complete
```

**Performance gain:**
- Sequential: 3-5 seconds (on SSD)
- Parallel: 1-2 seconds (limited by slowest copy)
- **Improvement:** 50-60% reduction in copy time

**Trade-off:**
- Increased CPU usage during installation (burst)
- Minimal impact (installation is infrequent operation)

---

### Optimization 3: Smart Backup (Skip Identical Files)

**Current design:** Backup all existing files before overwrite

**Optimization:**
```bash
# Only backup if file differs
for file in agents/*; do
  DEST="$HOME/.claude/agents/$(basename $file)"

  if [ -f "$DEST" ]; then
    # Compare files
    if ! cmp -s "$file" "$DEST"; then
      # Files differ - backup needed
      cp "$DEST" "$BACKUP_DIR/$(date +%Y%m%d-%H%M%S)-$(basename $file)"
    else
      # Files identical - skip backup
      echo "Skipping backup of $(basename $file) (unchanged)"
    fi
  fi

  # Copy new file
  cp "$file" "$DEST"
done
```

**Performance gain:**
- Typical scenario: 80% of files unchanged on update
- Backup reduction: 80% (only 2-4 files backed up instead of 10-20)
- **Time saved:** 1-2 seconds per installation
- **Disk saved:** 80% reduction in backup directory growth

**Acceptance criteria impact:**
- "Idempotent (can run multiple times without breaking)" - Enhanced by smart backup
- "Backs up existing configuration before overwriting" - Still backs up changed files

---

### Optimization 4: Compressed Backups (Optional)

**Current design:** Backup individual files

**Optimization:**
```bash
# Create compressed backup archive
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar czf "$HOME/.claude/.2l-backups/$BACKUP_NAME" \
  -C "$HOME/.claude" \
  agents/ commands/ lib/

# Single compressed file instead of 30+ individual files
```

**Performance gain:**
- Disk usage: 70-80% reduction (1MB -> 200-300KB per backup)
- Backup speed: Slightly slower due to compression (adds 0.5-1s)
- Restore complexity: Higher (must extract archive)

**Trade-off analysis:**
- **Benefit:** Significant disk savings (important for high-frequency updates)
- **Cost:** Slight installation slowdown, restore complexity
- **Recommendation:** Optional feature (enabled with `--compress-backups` flag)

---

## Load Testing Requirements

### Load Test 1: Concurrent Dashboard Sessions

**Test scenario:**
- Spawn 20 concurrent dashboard servers (port exhaustion test)
- Verify port allocation (8080-8099)
- Measure total resource consumption

**Test script:**
```bash
# Create 20 test projects
for i in {1..20}; do
  mkdir -p /tmp/test-project-$i/.2L
  echo '{"timestamp":"2025-10-10T00:00:00Z","event_type":"test","phase":"test","agent_id":"test","data":"test"}' > /tmp/test-project-$i/.2L/events.jsonl

  # Start dashboard in each project
  cd /tmp/test-project-$i
  /2l-dashboard &
done

# Measure resource usage
ps aux | grep "python3 -m http.server" | wc -l  # Should be 20
ps aux | grep "python3 -m http.server" | awk '{sum+=$3} END {print "Total CPU: " sum "%"}'
ps aux | grep "python3 -m http.server" | awk '{sum+=$4} END {print "Total Memory: " sum "%"}'
```

**Performance acceptance criteria:**
- All 20 dashboards start successfully
- Port allocation: 8080-8099 all occupied
- Total CPU: <50% on 4-core system
- Total memory: <600MB
- No port conflicts or crashes

---

### Load Test 2: Rapid Installation/Uninstallation

**Test scenario:**
- Run installation 100 times in succession
- Verify idempotency (no errors on repeated runs)
- Measure backup directory growth

**Test script:**
```bash
# Run installation 100 times
for i in {1..100}; do
  echo "Installation attempt $i"
  ./2l.sh install --quiet

  # Verify installation succeeded
  [ -d "$HOME/.claude/agents" ] || echo "ERROR: agents/ missing on iteration $i"
done

# Check backup directory size
du -sh ~/.claude/.2l-backups/
ls -1 ~/.claude/.2l-backups/ | wc -l  # Should be capped at 10 (rotation)
```

**Performance acceptance criteria:**
- All 100 installations succeed
- Average installation time: <10 seconds
- Backup directory: <10 backups (rotation working)
- Disk usage: <50MB for backups
- No file corruption or permission issues

---

### Load Test 3: Dashboard Event Polling Under Load

**Test scenario:**
- Generate 10,000 events in events.jsonl
- Dashboard polls file every 2 seconds
- Measure polling latency and UI responsiveness

**Test script:**
```bash
# Generate 10,000 test events
for i in {1..10000}; do
  echo "{\"timestamp\":\"2025-10-10T00:00:00Z\",\"event_type\":\"test\",\"phase\":\"test\",\"agent_id\":\"test-$i\",\"data\":\"Event $i\"}" >> .2L/events.jsonl
done

# File size: ~1.5MB (10,000 events × 150 bytes each)

# Start dashboard and monitor polling
/2l-dashboard

# Measure:
# 1. File read time (should be <100ms for 1.5MB file)
# 2. JSON parsing time (should be <200ms for 10,000 lines)
# 3. UI render time (last 50 events only)
```

**Performance acceptance criteria:**
- Dashboard loads 10,000-event file in <500ms
- Polling remains responsive (2-second interval maintained)
- UI renders last 50 events in <100ms
- No browser lag or freezing

**Scaling characteristics:**
- Linear file read time: O(n) where n = file size
- Constant UI render time: O(1) - always last 50 events
- **File size limit:** 10MB events.jsonl (~60,000 events) before noticeable slowdown

---

## Performance Acceptance Criteria

### Metric 1: Dashboard Startup Time

**Target:** <2 seconds (93% improvement from current 30s)

**Measurement method:**
```bash
START=$(date +%s%N)
/2l-dashboard
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
echo "Dashboard startup: ${DURATION}ms"
```

**Success criteria:**
- P50 (median): <1500ms
- P95: <2000ms
- P99: <3000ms
- Max acceptable: 5000ms (failure if exceeded)

**Baseline:** 30,000ms (current)
**Target:** <2,000ms (optimized)

---

### Metric 2: Installation Duration

**Target:** <10 seconds on modern SSD

**Measurement method:**
```bash
START=$(date +%s)
./2l.sh install
END=$(date +%s)
DURATION=$((END - START))
echo "Installation duration: ${DURATION}s"
```

**Success criteria:**
- SSD: <10 seconds
- HDD: <30 seconds
- Network-mounted home: <60 seconds (acceptable with warning)

**Factors:**
- File count: 30-40 files
- Total size: 500KB-1MB
- Backup operations: 0-30 files (if updating)

---

### Metric 3: Database Connection Test

**Target:** <2 seconds

**Measurement method:**
```bash
START=$(date +%s%N)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT 1"
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
echo "Connection test: ${DURATION}ms"
```

**Success criteria:**
- Local database: <500ms
- Docker database: <1000ms
- Remote database (if supported): <2000ms

---

### Metric 4: Event Polling Latency (Dashboard)

**Target:** <200ms per poll

**Measurement method:**
```javascript
// In dashboard JavaScript
const start = performance.now();
fetch('/events.jsonl')
  .then(response => response.text())
  .then(data => {
    const end = performance.now();
    console.log(`Poll latency: ${end - start}ms`);
  });
```

**Success criteria:**
- Small file (<10KB): <50ms
- Medium file (<100KB): <100ms
- Large file (<1MB): <200ms
- Very large file (>1MB): <500ms (warn user to archive old events)

---

## Cost Optimization Opportunities

### Cost Factor 1: Disk Storage (Backups)

**Current consumption:**
- Per backup: 500KB-1MB
- Without rotation: 365MB/year (daily updates)
- With rotation (10 backups): 10MB max

**Optimization:**
- Smart backup (skip unchanged): 80% reduction
- Compression: 70-80% reduction
- **Combined:** 95% reduction (365MB -> 18MB/year)

**Cost impact:**
- Disk: Negligible (modern systems have 100GB+ available)
- Not a cost concern for MVP

---

### Cost Factor 2: Compute Resources

**Current consumption:**
- Dashboard servers: 300-600MB memory (20 concurrent)
- Installation: Burst CPU (5-10% for <10s)

**Optimization opportunities:**
- Minimal - resource consumption already low
- Dashboard memory cannot be significantly reduced (Python HTTP server overhead)

**Cost impact:**
- Zero - runs on user's local machine (no cloud costs)

---

### Cost Factor 3: Network Bandwidth

**Current consumption:**
- Zero - all operations localhost-only
- No external API calls (except optional GitHub push)

**Optimization:**
- Not applicable - no network costs

---

## Recommendations for Master Plan

### Recommendation 1: Prioritize Dashboard Optimization (Feature 4)

**Rationale:**
- Highest performance impact (30s -> <2s = 93% improvement)
- Most visible to users (real-time monitoring critical for orchestration)
- Technical solution is clear (template substitution vs agent spawn)

**Implementation priority:** HIGH
**Iteration placement:** Iteration 1 (foundation feature)

---

### Recommendation 2: Implement Installation Performance Monitoring

**Rationale:**
- Enables tracking of 5-minute setup metric (success criterion)
- Identifies bottlenecks on different systems (SSD vs HDD)
- Validates optimization effectiveness (parallel copying, smart backups)

**Implementation approach:**
- Add timing instrumentation to installation script
- Log duration of each phase (copy agents, copy commands, backups)
- Report total duration at end
- Alert if exceeds 10s threshold on SSD

**Implementation priority:** MEDIUM
**Iteration placement:** Iteration 1 (alongside installation script)

---

### Recommendation 3: Add Backup Rotation from Day 1

**Rationale:**
- Prevents disk exhaustion over time
- Simple to implement (10 lines of bash)
- Avoids technical debt (harder to add later if users have 100+ backups)

**Implementation approach:**
```bash
# In installation script, after backup creation
BACKUP_DIR="$HOME/.claude/.2l-backups"
BACKUP_LIMIT=10

# Count backups
BACKUP_COUNT=$(ls -1t "$BACKUP_DIR" | wc -l)

# Rotate if exceeding limit
if [ $BACKUP_COUNT -gt $BACKUP_LIMIT ]; then
  echo "Rotating old backups (keeping last $BACKUP_LIMIT)"
  ls -1t "$BACKUP_DIR" | tail -n +$((BACKUP_LIMIT + 1)) | xargs -I {} rm -rf "$BACKUP_DIR/{}"
fi
```

**Implementation priority:** MEDIUM
**Iteration placement:** Iteration 1 (core installation feature)

---

### Recommendation 4: Dashboard Performance Acceptance Testing

**Rationale:**
- Critical success metric: "<2 second dashboard startup"
- Must validate on different systems (Ubuntu, macOS)
- Edge case testing: 10,000-event files, port exhaustion

**Implementation approach:**
1. Create automated performance test script
2. Run on CI (GitHub Actions) on Ubuntu/macOS matrices
3. Assert startup time <2000ms (fail build if exceeded)
4. Track performance regression over time

**Test script:**
```bash
#!/bin/bash
# dashboard-perf-test.sh

# Create test project
mkdir -p /tmp/perf-test/.2L
echo '{}' > /tmp/perf-test/.2L/events.jsonl

# Measure startup time
cd /tmp/perf-test
START=$(date +%s%N)
/2l-dashboard --no-browser &  # Start without opening browser
DASHBOARD_PID=$!
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))

# Kill dashboard
kill $DASHBOARD_PID

# Assert performance
if [ $DURATION -gt 2000 ]; then
  echo "FAIL: Dashboard startup took ${DURATION}ms (target: <2000ms)"
  exit 1
else
  echo "PASS: Dashboard startup took ${DURATION}ms"
  exit 0
fi
```

**Implementation priority:** HIGH
**Iteration placement:** Iteration 2 (after dashboard optimization implemented)

---

### Recommendation 5: Defer Advanced Optimizations to Post-MVP

**Features to defer:**
1. **Compressed backups:** Nice-to-have, not critical (adds complexity)
2. **Connection pooling:** Over-engineering for infrequent DB access
3. **WebSocket streaming:** Polling sufficient for 2-second refresh
4. **Multi-project dashboard:** Current 20-port limit adequate for MVP

**Rationale:**
- Focus MVP on core performance targets (dashboard <2s, installation <10s)
- Avoid premature optimization (YAGNI principle)
- Gather user feedback before investing in advanced features

**Post-MVP candidates:**
- Compressed backups (if users report disk concerns)
- Multi-project dashboard (if 20-port limit becomes issue)
- Performance profiling tools (if users need deeper insights)

---

## Scalability Roadmap

### Phase 1: MVP (Current Plan)

**Targets:**
- Dashboard startup: <2 seconds
- Installation duration: <10 seconds
- Concurrent dashboards: 20 projects
- Database connection: <2 seconds

**Scaling limits:**
- Projects: 20 concurrent (port exhaustion at 8099)
- Backup storage: Unbounded (rotation at 10 backups mitigates)
- Event file: ~10MB before slowdown (60,000 events)

**Acceptable for:** Individual developers, small teams (1-5 people)

---

### Phase 2: Post-MVP Enhancements (Future)

**Optimizations:**
1. **Expand port range:** 8080-8199 (120 concurrent dashboards)
2. **Event archiving:** Auto-archive events.jsonl when >10MB
3. **Health check command:** `/2l-doctor` to diagnose performance issues
4. **Performance dashboard:** Track installation time, dashboard startup, query latency

**Scaling targets:**
- Projects: 100+ concurrent (expanded port range)
- Event file: 100MB+ (with archiving)
- Backup storage: 100MB+ (with compression)

**Acceptable for:** Medium teams (5-20 people), power users

---

### Phase 3: Enterprise Scale (Long-term)

**Architecture changes:**
1. **Single multi-project dashboard:** Replace 20 servers with 1 server
2. **Event database:** Replace JSONL with SQLite for >100,000 events
3. **Cloud dashboard:** Web-based dashboard accessible remotely
4. **Distributed installation:** Ansible/Docker deployment for teams

**Scaling targets:**
- Projects: Unlimited (database-backed)
- Event storage: 1GB+ (database with indexing)
- Users: 100+ (multi-user collaboration)

**Acceptable for:** Large teams (20+ people), enterprise deployments

---

## Notes & Observations

### Observation 1: Dashboard Performance is Critical Path

The vision explicitly states: "Dashboard startup time from ~30s to <2s" as a core success metric. This is the highest-impact performance optimization in the entire plan.

**Impact analysis:**
- Current state: 30-second delay blocks real-time monitoring
- Users cannot watch orchestration progress live
- UX severely degraded (unusable for real-time observability)

**Solution is well-defined:**
- Eliminate agent spawn (25s overhead)
- Direct template substitution (10ms overhead)
- Technical feasibility: HIGH (straightforward bash string replacement)

**Risk:** LOW - Template approach is simpler and more reliable than agent spawn

---

### Observation 2: Installation Idempotency Impacts Performance

The vision requires: "Idempotent (can run multiple times without breaking)"

This requirement necessitates:
1. File existence checks (adds 0.5-1s)
2. Backup creation (adds 1-2s)
3. State file updates (adds 0.1-0.2s)

**Total overhead:** 2-3 seconds per installation

**Trade-off:**
- Safety: Prevents data loss, enables rollback
- Performance: Adds 20-30% to installation time (8s -> 10s)

**Recommendation:** Accept overhead - idempotency is critical for production readiness

---

### Observation 3: Port Exhaustion is Edge Case

20 concurrent dashboards (ports 8080-8099) is generous for individual developer use case.

**Typical usage pattern:**
- Average developer: 1-3 active projects
- Power user: 5-10 active projects
- 20-project limit: Rarely hit in practice

**Mitigation if needed:**
- Error message provides clear guidance: "Run /2l-dashboard-stop in another project"
- Port cleanup on dashboard stop (automatic)
- Manual cleanup: `pkill -f "python3 -m http.server"`

**Recommendation:** Accept 20-port limit for MVP, expand if users report issues

---

### Observation 4: Database Performance is Non-Critical

Database access pattern is infrequent (schema validation, test data seeding). Connection pooling and query optimization are over-engineering for this use case.

**Performance characteristics:**
- Queries per orchestration: 1-5
- Query complexity: Simple SELECT/INSERT
- Latency tolerance: 500ms per query acceptable

**Current design is sufficient:**
- psql command-line tool: Simple, reliable
- Connection overhead: 50-100ms (acceptable)
- No connection pooling needed

**Recommendation:** Defer database optimization to post-MVP (if usage pattern changes)

---

### Observation 5: Backup Strategy Balances Safety and Performance

Smart backup (skip unchanged files) provides optimal balance:
- **Safety:** Changed files always backed up
- **Performance:** 80% reduction in backup operations
- **Disk usage:** 80% reduction in storage growth

**Implementation complexity:** LOW (10 lines of bash with `cmp -s`)

**Recommendation:** Implement smart backup in Iteration 1 (foundation feature)

---

### Observation 6: Monitoring is Essential for Performance Validation

The vision defines specific metrics:
- "5-minute setup test" (validation)
- "Dashboard startup time <2s" (acceptance criterion)
- "Installation success rate 95%+" (reliability metric)

**Implication:** Must instrument code to track these metrics

**Implementation approach:**
1. Add timing instrumentation to all commands
2. Log performance metrics to `.2L/.performance.log`
3. Report metrics at end of operations
4. Create `/2l-perf-report` command to view metrics

**Recommendation:** Build monitoring into Iteration 1 (not post-MVP addition)

---

## Performance Optimization Summary

### Critical Optimizations (Iteration 1)

1. **Dashboard template substitution:** 30s -> <2s (93% improvement)
2. **Parallel file copying:** 3-5s -> 1-2s (50% improvement)
3. **Smart backup:** 80% reduction in backup operations
4. **Backup rotation:** Prevent disk exhaustion (cap at 10 backups)

**Total impact:** Dashboard becomes usable for real-time monitoring, installation completes in <10s

---

### Optional Optimizations (Post-MVP)

1. **Compressed backups:** 70-80% disk savings (complexity: moderate)
2. **Connection test caching:** 1-2s savings on repeated tests (complexity: low)
3. **Expanded port range:** 120 concurrent dashboards (complexity: low)
4. **Event archiving:** Support 100MB+ event files (complexity: medium)

**Total impact:** Enhanced experience for power users, team deployments

---

**Exploration completed:** 2025-10-10T02:28:26Z

**This report informs master planning decisions focused on performance, scalability, and infrastructure optimization strategies.**
