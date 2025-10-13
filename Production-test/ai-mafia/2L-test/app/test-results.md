# Game Over Screen Manual Test Plan

## Test 1: Load Results Before Game Over
1. Create a new game
2. Navigate to `/game/{gameId}/results` immediately
3. Verify 403 error is shown
4. Verify error message: "Game not finished" or similar
5. Verify "Return to Lobby" button works

## Test 2: Load Results After Game Over
1. Wait for a game to complete (status = GAME_OVER)
2. Navigate to `/game/{gameId}/results`
3. Verify results page loads successfully
4. Verify winner banner displays correct winner (Mafia or Villagers)
5. Verify round count is displayed

## Test 3: Player Roles Display
1. Verify all players are listed
2. Verify roles are revealed (Mafia/Villager badges)
3. Verify alive/dead status for each player
4. Verify Mafia players shown in purple section
5. Verify Villagers shown in blue section
6. Verify elimination type shown (Killed/Voted Out)

## Test 4: Transcript Display
1. Verify transcript is organized by round
2. For each round, verify:
   - Night phase messages (purple background, Mafia only)
   - Discussion phase messages (gray background)
   - Voting phase (red background, vote targets highlighted)
3. Verify player names are shown for all messages
4. Verify vote justifications are displayed

## Test 5: New Game Flow
1. Click "New Game" button
2. Verify navigation to `/` (lobby)
3. Verify lobby is ready for new game

## Test 6: Edge Cases
1. Test with 8 players (2 Mafia)
2. Test with 12 players (4 Mafia)
3. Test with short game (1 round)
4. Test with long game (5+ rounds)
5. Test with Mafia win
6. Test with Villagers win

## Test 7: Responsive Design
1. Test on mobile (375px width)
   - Verify roles stack vertically
   - Verify transcript is readable
2. Test on tablet (768px width)
   - Verify 2-column layout for roles
3. Test on desktop (1920px width)
   - Verify optimal layout

## Expected Outcomes
- 403 error before game over
- All data displays correctly after game over
- Roles are revealed accurately
- Transcript is complete and chronological
- UI is responsive and readable
- New Game button returns to lobby
