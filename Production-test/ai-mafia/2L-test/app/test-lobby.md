# Lobby Screen Manual Test Plan

## Test 1: Load Lobby Screen
1. Navigate to `/`
2. Verify page loads with "AI Mafia" title
3. Verify player count slider shows default value of 10
4. Verify role distribution shows: 3 Mafia, 7 Villagers
5. Verify "Create Game" button is visible and enabled
6. Verify game rules section is displayed

## Test 2: Adjust Player Count
1. Move slider to 8 players
2. Verify display shows: 2 Mafia, 6 Villagers
3. Move slider to 12 players
4. Verify display shows: 4 Mafia, 8 Villagers
5. Try each value (8, 9, 10, 11, 12)
6. Verify Mafia counts: [2, 3, 3, 3, 4]

## Test 3: Create Game Flow
1. Set player count to 10
2. Click "Create Game" button
3. Verify button changes to "Creating Game..." and is disabled
4. Verify API calls:
   - POST /api/game/create with { playerCount: 10 }
   - POST /api/game/{gameId}/start
5. Verify navigation to `/game/{gameId}`

## Test 4: Error Handling
1. Simulate API failure (disconnect network)
2. Click "Create Game"
3. Verify error message displays in red box
4. Verify button re-enables after error

## Test 5: Responsive Design
1. Test on mobile (375px width)
2. Verify card is full width with padding
3. Verify slider is usable on mobile
4. Test on tablet (768px width)
5. Test on desktop (1920px width)

## Expected Outcomes
- Lobby loads in < 1 second
- Slider is smooth and responsive
- Role calculations are accurate
- Game creation succeeds with valid API
- Error states are user-friendly
- Layout is responsive across all devices
