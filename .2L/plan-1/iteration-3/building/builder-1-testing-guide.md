# Builder-1 Testing Guide

## Quick Validation Checklist

### Pre-Integration Testing

Run these tests before integrating with other builders:

#### Test 1: Complexity Calculation Logic
```bash
cd /tmp/2l-test-adaptive-spawning
bash test-complexity.sh
```

**Expected Output:**
- Simple vision (3 features): 2 explorers, SIMPLE complexity ✓
- Medium vision (10 features): 3 explorers, MEDIUM complexity ✓
- Complex vision (20 features, 11 integrations): 4 explorers, COMPLEX complexity ✓

#### Test 2: Config.yaml Schema
After running adaptive spawning, verify config structure:

```bash
yq eval '.plans[] | select(.plan_id == "plan-test") | .master_exploration' .2L/config.yaml
```

**Expected Output:**
```yaml
num_explorers: 2|3|4
complexity_level: "SIMPLE"|"MEDIUM"|"COMPLEX"
status: COMPLETE
reports:
  - master-explorer-1-report.md
  - master-explorer-2-report.md
  # ... (if num_explorers >= 3)
```

#### Test 3: File Modifications
Verify both command files have identical logic:

```bash
# Check num_explorers usage
grep -c "num_explorers" ~/.claude/commands/2l-mvp.md
# Expected: 12 occurrences

grep -c "num_explorers" ~/.claude/commands/2l-plan.md
# Expected: 9 occurrences

# Verify focus area case statements match
diff <(grep -A 12 "case \$explorer_id in" ~/.claude/commands/2l-mvp.md) \
     <(grep -A 12 "case \$explorer_id in" ~/.claude/commands/2l-plan.md)
# Expected: Identical (only indentation may differ)
```

### Integration Testing

After Builder-2 and Builder-3 complete:

#### Test 4: Full Flow with Simple Vision
```bash
# 1. Create simple vision
mkdir -p .2L/plan-test
cat > .2L/plan-test/vision.md <<'EOF'
# Simple Todo App

## Feature 1: User Authentication
Login and signup functionality.

## Feature 2: Todo CRUD
Create, read, update, delete todos.

## Feature 3: Categories
Organize todos by category.
EOF

# 2. Initialize config (if needed)
# Run vision creation process

# 3. Run master exploration
# /2l-mvp or /2l-plan command

# 4. Verify results
yq eval '.plans[] | select(.plan_id == "plan-test") | .master_exploration.num_explorers' .2L/config.yaml
# Expected: 2

ls .2L/plan-test/master-exploration/
# Expected: master-explorer-1-report.md, master-explorer-2-report.md
```

#### Test 5: Full Flow with Medium Vision
```bash
cat > .2L/plan-test/vision.md <<'EOF'
# Medium E-commerce Platform

## Feature 1: User Authentication
## Feature 2: Product Catalog
## Feature 3: Shopping Cart
## Feature 4: Checkout Flow
## Feature 5: Order History
## Feature 6: User Profile
## Feature 7: Product Reviews
## Feature 8: Wishlist
## Feature 9: Admin Dashboard
## Feature 10: Analytics
EOF

# Run master exploration
# Expected: 3 explorers, master-explorer-3-report.md exists
```

#### Test 6: Full Flow with Complex Vision
```bash
cat > .2L/plan-test/vision.md <<'EOF'
# Complex Multi-tenant SaaS

## Feature 1: OAuth Integration
Third-party authentication with Google, GitHub.

## Feature 2: Multi-tenant Architecture
## Feature 3: API Gateway with rate limiting
## Feature 4: Webhook System for external integrations
## Feature 5: Real-time Collaboration
## Feature 6: S3 Integration for file storage
## Feature 7: SendGrid API for email
## Feature 8: Stripe Integration for payments
## Feature 9: Analytics Integration
## Feature 10: User Management
## Feature 11: Audit Logging
## Feature 12: Reporting Engine
## Feature 13: Notifications
## Feature 14: Search (ElasticSearch)
## Feature 15: API Documentation
## Feature 16: Monitoring (DataDog API)
## Feature 17: CI/CD Pipeline
## Feature 18: Mobile App
## Feature 19: Admin Console
## Feature 20: Custom Branding
EOF

# Run master exploration
# Expected: 4 explorers, master-explorer-4-report.md exists
```

### Edge Case Testing

#### Test 7: Resume Detection (Partial Completion)
```bash
# 1. Spawn 2 explorers, let them complete
# 2. Manually delete one report
rm .2L/plan-test/master-exploration/master-explorer-2-report.md

# 3. Re-run master exploration
# Expected: Only missing explorer 2 spawns, explorer 1 skipped
```

#### Test 8: Backward Compatibility
This test requires Builder-3's resume detection:

```bash
# 1. Create old config without num_explorers field
yq eval 'del(.plans[] | select(.plan_id == "plan-test") | .master_exploration.num_explorers)' -i .2L/config.yaml

# 2. Run resume detection (Builder-3's code)
# Expected: Defaults to 2 explorers
```

### Regression Testing

#### Test 9: Existing Visions Still Work
```bash
# Use a real vision from a previous plan
# Run master exploration
# Expected: Works without errors, spawns appropriate number of explorers
```

### Performance Testing

#### Test 10: Large Vision Performance
```bash
# Create vision with 100+ features
# Run complexity analysis
# Expected: Completes in <500ms, spawns 4 explorers (capped)
```

## Common Issues and Solutions

### Issue 1: grep returns error
**Symptom:** Script exits with "command not found" or grep error

**Solution:** Verify `|| echo 0` fallback is present:
```bash
feature_count=$(grep -c "^## " "$VISION_FILE" || echo 0)
```

### Issue 2: yq command fails
**Symptom:** Config.yaml not updated

**Solution:** Verify yq is installed:
```bash
which yq
yq --version
```

### Issue 3: Focus area names mismatch
**Symptom:** Explorers don't receive correct focus area

**Coordination with Builder-2:** Verify exact focus area strings:
1. "Architecture & Complexity Analysis"
2. "Dependencies & Risk Assessment"
3. "User Experience & Integration Points"
4. "Scalability & Performance Considerations"

### Issue 4: Reports not found during synthesis
**Symptom:** Master planner receives empty EXPLORER_REPORTS

**Solution:** Verify glob pattern matches files:
```bash
ls ${MASTER_EXPLORATION}/master-explorer-*-report.md
# Should show all reports
```

## Integration Coordination Points

### With Builder-2 (Explorer Definitions)
- **Verify:** Focus area names match exactly (case-sensitive)
- **Test:** Spawn all 4 explorers, check each report has correct focus

### With Builder-3 (Resume Detection)
- **Verify:** Config field names match (`num_explorers`, `complexity_level`)
- **Test:** Resume detection reads num_explorers correctly
- **Coordinate:** Default value operator `// 2` for backward compatibility

### With Builder-4 (Healing Exploration)
- **No direct interaction** - Healing exploration is separate phase

## Success Metrics

After all tests pass:

- ✅ All 3 complexity levels (SIMPLE, MEDIUM, COMPLEX) spawn correct explorers
- ✅ Config.yaml has correct schema (num_explorers, complexity_level)
- ✅ All explorer reports created (2, 3, or 4 depending on complexity)
- ✅ Master plan synthesis reads all reports
- ✅ Resume detection works with partial completion
- ✅ No regression in existing functionality
- ✅ Performance acceptable (<1 second for complexity analysis)

## Deployment Readiness

Before deployment to ~/.claude/:

1. ✅ All tests pass
2. ✅ Builder-2 confirms focus area names match
3. ✅ Builder-3 confirms config schema compatible
4. ✅ Integration tests pass with all builders
5. ✅ Backup original files to ~/.claude/.backup-pre-iteration-3/
6. ✅ Test with real vision from this project

## Rollback Plan

If critical issues found after deployment:

```bash
# Restore from backup
cp ~/.claude/.backup-pre-iteration-3/commands/2l-mvp.md ~/.claude/commands/
cp ~/.claude/.backup-pre-iteration-3/commands/2l-plan.md ~/.claude/commands/
```

Old behavior (2 explorers always) will be restored.
