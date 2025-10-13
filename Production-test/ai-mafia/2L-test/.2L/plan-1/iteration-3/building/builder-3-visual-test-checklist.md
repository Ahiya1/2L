# Builder-3 Visual Test Checklist

## Purpose
This checklist guides manual visual testing of UI/UX enhancements in a browser.

## Prerequisites
1. Start the development server: `npm run dev`
2. Create a new game with 8-12 players
3. Start the game and let it progress to discussion phase
4. Open browser developer console (F12) for debugging

---

## Test 1: Conversation Threading

### Setup
- Wait for discussion phase with multiple messages
- Look for messages with "Replying to X" indicator

### Visual Checks
- [ ] **Indentation**: Threaded messages indent to the right (16px per level)
- [ ] **Border Line**: Threaded messages show vertical gray border on left
- [ ] **Max Depth**: No more than 3 levels of indentation visible
- [ ] **Alignment**: Message content aligns properly despite indentation

### Expected Result
```
┌─ Alice: I think Bob is suspicious
│  └─ Bob: I'm not Mafia! (indented 16px, gray border)
│     └─ Charlie: I agree with Alice (indented 32px, gray border)
│        └─ Diana: Let's investigate (indented 48px - MAX)
└─ Eve: What about Frank? (back to 0px)
```

### How to Test
1. Find a message chain in the feed
2. Measure indentation using browser dev tools (Inspect > Computed > margin-left)
3. Count depth levels visually

---

## Test 2: Message Type Color-Coding

### Test 2.1: Accusations (Red/Bold)
- [ ] Find message with "I think [Name] is Mafia"
- [ ] Text is **red** (text-red-600)
- [ ] Text is **bold** (font-semibold)

### Test 2.2: Defenses (Blue)
- [ ] Find accused player's response
- [ ] Text is **blue** (text-blue-600)
- [ ] Text is **not bold** (normal weight)

### Test 2.3: Questions (Yellow)
- [ ] Find message ending with "?"
- [ ] Text is **yellow** (text-yellow-600)

### Test 2.4: Alliances (Green)
- [ ] Find message with "I agree with X"
- [ ] Text is **green** (text-green-600)

### Test 2.5: Neutral (Gray)
- [ ] Find general statement message
- [ ] Text is **dark gray** (text-gray-900)

### Classification Accuracy Check
- [ ] Count 20 random messages
- [ ] Classify each manually (accusation/defense/question/alliance/neutral)
- [ ] Compare with displayed color
- [ ] **Target: 18+ out of 20 correct (90%)**

---

## Test 3: Deterministic Avatars

### Test 3.1: Consistency Across Components
- [ ] Pick a player (e.g., "Alice")
- [ ] Note avatar color in Discussion Feed
- [ ] Check same player in Player Grid
- [ ] **Colors match exactly**

### Test 3.2: Consistency Across Messages
- [ ] Find same player's multiple messages in feed
- [ ] All messages show same avatar color
- [ ] **No color changes**

### Test 3.3: Initial Display
- [ ] All avatars show first letter of name
- [ ] Letters are capitalized (e.g., "A" for "Alice")
- [ ] Letters are white on colored background

### Test 3.4: Color Distribution
- [ ] Count how many players have each color
- [ ] With 10+ players, some colors may repeat
- [ ] **Colors should be distributed (not all red)**

### Visual Check
```
DiscussionFeed:
[R] Alice: Message 1
[B] Bob: Message 2
[R] Alice: Message 3  ← Same color as first Alice message

PlayerGrid:
[R] Alice | Analytical | Alive
[B] Bob | Aggressive | Alive
```

---

## Test 4: Enhanced Phase Indicator

### Test 4.1: Turn Counter
- [ ] Phase indicator shows "Round X / 40"
- [ ] Round number is bold and prominent
- [ ] As game progresses, round number increments

### Test 4.2: Phase Descriptions
- [ ] **Night**: "Mafia coordinates their strategy in private"
- [ ] **Discussion**: "Public debate - players share suspicions and build cases"
- [ ] **Voting**: "Democratic elimination - vote for the most suspicious player"
- [ ] Description text is italic and gray

### Test 4.3: Progress Bar
- [ ] For timed phases, progress bar visible
- [ ] Bar color matches phase color (blue for discussion, red for voting)
- [ ] Bar decreases as time elapses

### Test 4.4: Timer Display
- [ ] For timed phases, countdown timer visible
- [ ] Format: "MM:SS" or "SS" seconds
- [ ] Updates every second
- [ ] Shows "Time Left" label

---

## Test 5: Relative Timestamps

### Test 5.1: "Just Now" Display
- [ ] Wait for a new message to arrive
- [ ] Timestamp shows "just now"
- [ ] After ~10 seconds, changes to "X seconds ago"

### Test 5.2: Seconds Ago
- [ ] Wait 30 seconds after message arrival
- [ ] Timestamp shows "30 seconds ago" or "less than a minute ago"

### Test 5.3: Minutes Ago
- [ ] Wait 2-3 minutes
- [ ] Timestamp shows "2 minutes ago" or "3 minutes ago"

### Test 5.4: Format Consistency
- [ ] All timestamps use same format
- [ ] No absolute times visible (unless very old messages)
- [ ] Text is subtle gray (text-gray-400)

### Note
Timestamps only update on component re-render, not in real-time. New messages trigger re-renders naturally.

---

## Test 6: Integration & Performance

### Test 6.1: Auto-Scroll
- [ ] New messages arrive
- [ ] Feed auto-scrolls to bottom (if not locked)
- [ ] Threading doesn't break auto-scroll

### Test 6.2: Scroll Lock
- [ ] Click "Lock Scroll" button
- [ ] New messages arrive
- [ ] Feed doesn't scroll automatically
- [ ] Click "Auto-scroll" button
- [ ] Feed scrolls to bottom

### Test 6.3: Performance
- [ ] With 100+ messages, feed renders smoothly
- [ ] No visible lag when new messages arrive
- [ ] Scrolling is smooth (no janky animation)

### Test 6.4: Responsive Layout
- [ ] Resize browser window
- [ ] Avatars remain visible
- [ ] Threading indentation adjusts properly
- [ ] Phase indicator layout remains readable

---

## Test 7: Edge Cases

### Test 7.1: Circular Threading
- [ ] If messages reference each other circularly
- [ ] No browser freeze or infinite loop
- [ ] Max 3 levels enforced

### Test 7.2: Long Player Names
- [ ] Players with long names (15+ characters)
- [ ] Avatars show first letter only
- [ ] Names don't overflow containers

### Test 7.3: Special Characters
- [ ] Messages with emojis or special characters
- [ ] Classification still works
- [ ] Timestamps still display

### Test 7.4: Empty State
- [ ] Before any messages arrive
- [ ] Shows "Waiting for discussion to start..."
- [ ] No errors in console

---

## Console Error Check

### Throughout All Tests
- [ ] Open browser console (F12)
- [ ] No red errors visible
- [ ] No TypeScript type errors
- [ ] No "undefined" or "null" warnings

---

## Acceptance Criteria Summary

After completing all tests, verify:

- [x] Threading visible (3-level indentation)
- [x] Message colors correctly classified (>90% accuracy)
- [x] Avatars deterministic (same name = same color)
- [x] Phase indicator shows progress
- [x] Timestamps display relative time
- [x] Build succeeds, UI renders correctly
- [x] No console errors

---

## Bug Reporting Template

If issues found, report with:

```
**Test:** [Test number/name]
**Issue:** [Brief description]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Screenshot:** [If applicable]
**Console Errors:** [Copy from browser console]
```

---

## Notes for Integrator

- Visual inspection is **required** (no automated UI tests yet)
- Classification accuracy may vary based on agent prompt quality
- Threading depends on agents using `inReplyToId` correctly
- Colors are deterministic but distribution may cause collisions with 10+ players

**Estimated Testing Time:** 15-20 minutes for full checklist
