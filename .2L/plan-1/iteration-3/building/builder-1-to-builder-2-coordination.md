# Builder-1 to Builder-2 Coordination

## Focus Area Names (MUST MATCH EXACTLY)

Builder-2 is implementing Explorer 3 and Explorer 4 definitions in the 2l-master-explorer.md agent file.

The focus area names in the agent definition headers **MUST** match these exact strings (case-sensitive, punctuation-sensitive):

### Explorer 1 (Already Defined)
```
Architecture & Complexity Analysis
```

### Explorer 2 (Already Defined)
```
Dependencies & Risk Assessment
```

### Explorer 3 (Builder-2 to Implement)
```
User Experience & Integration Points
```

### Explorer 4 (Builder-2 to Implement)
```
Scalability & Performance Considerations
```

## How These Are Used

In both 2l-mvp.md and 2l-plan.md, the spawning logic uses these exact strings:

```bash
case $explorer_id in
    1)
        FOCUS_AREA="Architecture & Complexity Analysis"
        ;;
    2)
        FOCUS_AREA="Dependencies & Risk Assessment"
        ;;
    3)
        FOCUS_AREA="User Experience & Integration Points"
        ;;
    4)
        FOCUS_AREA="Scalability & Performance Considerations"
        ;;
esac
```

The FOCUS_AREA variable is then passed to the explorer in the spawn prompt:

```bash
spawn_task(
    type="2l-master-explorer",
    prompt=f"You are Master Explorer $explorer_id.

Focus Area: $FOCUS_AREA
...
)
```

## Agent Definition Template

Builder-2 should use this structure:

```markdown
### Explorer 3: User Experience & Integration Points

(SPAWNED IF num_explorers >= 3)

**What to analyze:**
- Frontend/backend integration complexity
- User flow dependencies and critical paths
- External API integrations and third-party services
- Data flow patterns across system boundaries
- Form handling, navigation, state management
- Real-time features (WebSockets, polling, SSE)
- Error handling and edge case flows
- Accessibility and responsive design

**What NOT to analyze:**
- Component architecture (Explorer 1 handles)
- Performance optimization (Explorer 4 handles)
- Build pipeline (Explorer 1 handles)

**Report focus:**
Provide UX integration strategy and data flow maps.
```

```markdown
### Explorer 4: Scalability & Performance Considerations

(SPAWNED IF num_explorers == 4)

**What to analyze:**
- Performance bottlenecks (database queries, API latency, rendering)
- Scalability concerns (concurrent users, data volume growth)
- Infrastructure requirements (database sizing, caching strategy, CDN)
- Deployment complexity (CI/CD, environments, rollback)
- Monitoring and observability needs
- Resource optimization (lazy loading, code splitting, image optimization)
- Load testing requirements

**What NOT to analyze:**
- Basic architecture (Explorer 1 handles)
- User flows (Explorer 3 handles)
- Feature dependencies (Explorer 2 handles)

**Report focus:**
Provide scalability roadmap and performance optimization strategy.
```

## Spawning Conditions

**Important for documentation in agent file:**

- Explorer 1: ALWAYS SPAWNED (num_explorers >= 2)
- Explorer 2: ALWAYS SPAWNED (num_explorers >= 2)
- Explorer 3: SPAWNED IF num_explorers >= 3
- Explorer 4: SPAWNED IF num_explorers == 4

Builder-2 should document these conditions clearly in the agent definition headers.

## Verification

After Builder-2 completes, verify with:

```bash
# Extract focus area from agent definition
grep "### Explorer 3:" ~/.claude/agents/2l-master-explorer.md
# Should show: ### Explorer 3: User Experience & Integration Points

grep "### Explorer 4:" ~/.claude/agents/2l-master-explorer.md
# Should show: ### Explorer 4: Scalability & Performance Considerations

# Compare with spawning logic
grep -A 12 "case \$explorer_id in" ~/.claude/commands/2l-mvp.md
# Should match exactly
```

## Questions for Builder-2

If Builder-2 has any questions about:
- Focus area boundaries (what to analyze vs what NOT to analyze)
- Example findings for each explorer
- Report structure template
- Overlap prevention

Reference the patterns.md file or coordinate directly.

## Critical Success Factor

The adaptive spawning logic is **already implemented and working**. Builder-2's task is purely additive (defining new explorers). The only requirement is that the focus area names match exactly so the spawning logic works correctly.

**DO NOT CHANGE** the focus area names in the spawning logic. The agent definition must match the orchestration, not the other way around.
