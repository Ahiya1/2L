# Manual Test Guide - Sub-Builder-6B Components

## Components to Test
1. Enhanced DiscussionFeed
2. VoteTally

## Prerequisites
- Game server running on http://localhost:3000
- Test game created with 10 players
- Game progressed through DISCUSSION and VOTING phases

## Test Setup

```bash
# Terminal 1: Start dev server
cd app
npm run dev

# Terminal 2: Create test game
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -d '{"playerCount": 10}'

# Note the gameId returned, then start the game
curl -X POST http://localhost:3000/api/game/{gameId}/start
```

## DiscussionFeed Tests

### Test 1: Accusation Highlighting - "I think X is Mafia"
**Expected:** Red bold text for accusation phrases

1. Navigate to `/game/{gameId}` during DISCUSSION phase
2. Look for messages containing: "I think Agent-X is Mafia"
3. **PASS if:** The phrase "I think Agent-X is Mafia" is displayed in red bold text
4. **FAIL if:** Text appears in normal color

### Test 2: Accusation Highlighting - "I suspect X"
**Expected:** Red bold text for suspicion phrases

1. Look for messages containing: "I suspect Agent-Y"
2. **PASS if:** The phrase "I suspect Agent-Y" is displayed in red bold text
3. **FAIL if:** Text appears in normal color

### Test 3: Accusation Highlighting - "I vote for X"
**Expected:** Red bold text for vote statements

1. Look for messages containing: "I vote for Agent-Z"
2. **PASS if:** The phrase "I vote for Agent-Z" is displayed in red bold text
3. **FAIL if:** Text appears in normal color

### Test 4: Threading Indicators
**Expected:** Show "↪ Replying to Agent X" for replies

1. Look for messages that are replies to other messages
2. **PASS if:** You see "↪ Replying to [Agent Name]" above the message
3. **FAIL if:** No threading indicator appears for reply messages

### Test 5: Relative Timestamps
**Expected:** Show "X minutes ago" for recent messages

1. Look at message timestamps
2. **PASS if:** Recent messages show "just now", "2 minutes ago", etc.
3. **FAIL if:** Only absolute times (HH:MM:SS) are shown

### Test 6: Auto-scroll Behavior
**Expected:** Automatically scroll to latest message

1. Watch the discussion feed as new messages arrive
2. **PASS if:** The feed automatically scrolls to show the latest message
3. **FAIL if:** You have to manually scroll to see new messages

### Test 7: Scroll Lock Toggle
**Expected:** Button to pause/resume auto-scroll

1. Click the "🔒 Lock Scroll" button in the header
2. Observe button text changes to "▼ Auto-scroll"
3. Scroll up to view old messages
4. Wait for a new message to arrive
5. **PASS if:** Feed does NOT auto-scroll when locked
6. Click "▼ Auto-scroll" button
7. **PASS if:** Feed resumes auto-scrolling to new messages

### Test 8: Connection Status
**Expected:** Green dot when connected, red when disconnected

1. Look at connection indicator in header
2. **PASS if:** Shows green dot + "Connected" when SSE active
3. Disconnect network briefly
4. **PASS if:** Shows red dot + "Connecting..." when disconnected

### Test 9: Multiple Accusations in Single Message
**Expected:** Highlight all accusation patterns

1. Find message like: "I think Agent-A is Mafia and I suspect Agent-B"
2. **PASS if:** Both accusations are highlighted in red
3. **FAIL if:** Only one or neither is highlighted

### Test 10: Empty State
**Expected:** Show waiting message when no discussion yet

1. Navigate to game in LOBBY or NIGHT phase (before DISCUSSION)
2. **PASS if:** Shows "Waiting for discussion to start..."
3. **FAIL if:** Shows blank or error

## VoteTally Tests

### Test 11: Empty State
**Expected:** Show "no votes cast yet" when VOTING starts

1. Navigate to game at start of VOTING phase (no votes yet)
2. **PASS if:** Shows "No votes cast yet..."
3. **PASS if:** Shows "0/10 votes" badge
4. **FAIL if:** Shows error or blank

### Test 12: Majority Threshold Display
**Expected:** Show correct majority calculation

1. Look at threshold indicator
2. For 10 players: **PASS if:** Shows "5 votes needed"
3. For 9 players: **PASS if:** Shows "5 votes needed"
4. For 8 players: **PASS if:** Shows "4 votes needed"

### Test 13: Vote Aggregation
**Expected:** Count votes correctly per player

1. Wait for 3+ votes to be cast
2. Verify vote counts match actual votes
3. **PASS if:** Each player shows correct number of votes received
4. **FAIL if:** Vote counts are incorrect or missing

### Test 14: Leader Highlighting
**Expected:** Player with most votes shows "👑 LEADING"

1. Wait for votes where one player has more than others
2. **PASS if:** Top player shows yellow border + "👑 LEADING"
3. **FAIL if:** No leader indicator or wrong player highlighted

### Test 15: Majority Threshold Highlighting
**Expected:** Player reaching majority shows red warning

1. Wait for player to receive 5+ votes (for 10 player game)
2. **PASS if:** Shows red border + "⚠ MAJORITY REACHED"
3. **PASS if:** That player is highlighted more prominently
4. **FAIL if:** No special highlighting when majority reached

### Test 16: Voter List Display
**Expected:** Show names of all voters for each player

1. Click to expand votes for a player
2. **PASS if:** Shows list like "Voted by: Agent-A, Agent-B, Agent-C"
3. **FAIL if:** Voter names missing or incorrect

### Test 17: Vote Justification Expansion
**Expected:** Click to expand/collapse justifications

1. Click "▶ Voted by: [names]" button
2. **PASS if:** Button icon changes to "▼"
3. **PASS if:** Justifications appear below with voter names
4. Click again
5. **PASS if:** Justifications collapse and hide
6. **FAIL if:** Expansion/collapse doesn't work

### Test 18: Vote Bar Visualization
**Expected:** Visual progress bar showing vote proportion

1. Look at vote bars for each player
2. **PASS if:** Bar width reflects proportion of total players
3. **PASS if:** Player with 5/10 votes shows ~50% width bar
4. **PASS if:** Bar color is blue before majority, red after
5. **FAIL if:** Bar width incorrect or missing

### Test 19: All Votes Cast Indicator
**Expected:** Show completion message when voting done

1. Wait for all 10 players to cast votes
2. **PASS if:** Shows "✓ All votes cast! Tallying results..."
3. **PASS if:** Shows "10/10 votes" badge
4. **FAIL if:** Message doesn't appear

### Test 20: Partial Voting Progress
**Expected:** Show waiting message during voting

1. Look at tally when 3/10 votes cast
2. **PASS if:** Shows "Waiting for 7 more votes..."
3. When 1 vote remaining: **PASS if:** Shows "Waiting for 1 more vote"
4. **FAIL if:** Progress message incorrect or missing

### Test 21: Vote Sorting
**Expected:** Players sorted by vote count (descending)

1. Look at tally order
2. **PASS if:** Player with 5 votes appears above player with 2 votes
3. **PASS if:** Player with 2 votes appears above player with 1 vote
4. **FAIL if:** Order is incorrect or random

### Test 22: Real-time Updates
**Expected:** Tally updates immediately as votes arrive

1. Watch tally as votes are cast
2. **PASS if:** Each vote appears within 1 second
3. **PASS if:** Vote count increments immediately
4. **PASS if:** Order re-sorts when counts change
5. **FAIL if:** Delays > 2 seconds or votes don't appear

### Test 23: Multiple Justifications Display
**Expected:** Show all justifications when expanded

1. Expand player with 3+ votes
2. **PASS if:** All 3+ justifications displayed individually
3. **PASS if:** Each shows voter name + quoted justification
4. **FAIL if:** Some justifications missing

## Integration Tests

### Test 24: DiscussionFeed + GameEventsContext Integration
**Expected:** No duplicate SSE connections

1. Open browser DevTools → Network tab
2. Filter by "EventSource" or "stream"
3. Navigate to `/game/{gameId}`
4. **PASS if:** Only ONE SSE connection appears
5. **FAIL if:** Multiple connections to same stream endpoint

### Test 25: VoteTally Phase Conditional Rendering
**Expected:** Only visible during VOTING phase

1. Navigate to game during DISCUSSION phase
2. **PASS if:** VoteTally does NOT appear
3. Wait for VOTING phase to start
4. **PASS if:** VoteTally appears automatically
5. After voting ends (WIN_CHECK phase)
6. **PASS if:** VoteTally disappears (or shows final results)

### Test 26: Accusation Highlighting with Dynamic Player Names
**Expected:** Highlight accusations for all 10 player names

1. Verify DiscussionFeed receives playerNames prop with all 10 names
2. Look for accusations mentioning any of: Agent-A through Agent-J
3. **PASS if:** ALL player names are highlighted when accused
4. **FAIL if:** Some player names not highlighted

### Test 27: Stress Test - 100+ Messages
**Expected:** Performance remains smooth

1. Let discussion run for full 3-minute phase
2. Verify 50-100+ messages appear
3. **PASS if:** Feed scrolls smoothly
4. **PASS if:** No lag or freezing
5. **PASS if:** Highlighting still works on all messages
6. **FAIL if:** UI becomes sluggish

### Test 28: Stress Test - Rapid Voting
**Expected:** Handle 10 votes in quick succession

1. Watch tally during rapid voting (sequential voting)
2. **PASS if:** All 10 votes appear correctly
3. **PASS if:** No votes lost or duplicated
4. **PASS if:** Tally remains consistent
5. **FAIL if:** Vote counts incorrect

## Browser Compatibility

Test on:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari (if available)
- ✅ Mobile Chrome (responsive layout)

## Expected Results Summary

**DiscussionFeed (10 tests):**
- Accusation highlighting: 4 patterns
- Threading indicators: 1 test
- Timestamps: 1 test
- Auto-scroll: 2 tests
- Connection status: 1 test
- Edge cases: 1 test

**VoteTally (14 tests):**
- Empty/partial states: 2 tests
- Vote aggregation: 3 tests
- Visual indicators: 4 tests
- Justifications: 2 tests
- Real-time: 1 test
- Sorting: 1 test
- Progress: 1 test

**Integration (4 tests):**
- SSE context: 1 test
- Phase rendering: 1 test
- Dynamic data: 1 test
- Performance: 1 test

**Total: 28 manual tests**

## Bug Reporting Template

If test fails, document:

```
Test ID: [Test number and name]
Component: [DiscussionFeed or VoteTally]
Expected: [What should happen]
Actual: [What actually happened]
Browser: [Chrome/Firefox/Safari/etc]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Screenshots: [Attach if relevant]
Console Errors: [Any errors in DevTools console]
```

## Notes

- Tests assume standard 10-player game
- Adjust vote thresholds for different player counts
- Some tests require waiting for specific game phases
- All tests should pass for COMPLETE status
- Document any failures or limitations
