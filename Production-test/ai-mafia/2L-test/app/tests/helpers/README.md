# Test Helpers

Shared utility functions for E2E tests.

## Available Functions

### `createGame(page: Page): Promise<{ gameId: string }>`
Creates a new game via the lobby UI and navigates to the game page.

**Returns:** Object containing the `gameId`

**Example:**
```typescript
const { gameId } = await createGame(page);
```

### `startGame(page: Page, gameId: string): Promise<void>`
Starts the game by clicking the "Start Game" button and waits for the phase to change.

**Example:**
```typescript
await startGame(page, gameId);
```

### `waitForPhase(page: Page, phase: string, timeout?: number): Promise<void>`
Waits for a specific game phase to become active.

**Parameters:**
- `phase`: Target phase (e.g., 'NIGHT', 'DISCUSSION', 'VOTING')
- `timeout`: Timeout in milliseconds (default: 300000 = 5 minutes)

**Example:**
```typescript
await waitForPhase(page, 'NIGHT');
await waitForPhase(page, 'VOTING', 120000); // Custom 2-minute timeout
```

### `waitForMessages(page: Page, minCount: number, timeout?: number): Promise<void>`
Waits for a minimum number of messages to appear in the discussion feed.

**Parameters:**
- `minCount`: Minimum number of messages
- `timeout`: Timeout in milliseconds (default: 300000 = 5 minutes)

**Example:**
```typescript
await waitForMessages(page, 40); // Wait for at least 40 messages
```

### `waitForAllVotes(page: Page, expectedVotes?: number, timeout?: number): Promise<void>`
Waits for all votes to be cast during the Voting phase.

**Parameters:**
- `expectedVotes`: Expected number of votes (default: 10)
- `timeout`: Timeout in milliseconds (default: 120000 = 2 minutes)

**Example:**
```typescript
await waitForAllVotes(page);
```

### `waitForSSEConnection(page: Page, timeout?: number): Promise<void>`
Waits for the SSE connection to be established (green indicator).

**Parameters:**
- `timeout`: Timeout in milliseconds (default: 10000 = 10 seconds)

**Example:**
```typescript
await waitForSSEConnection(page);
```

### `getPlayerNames(page: Page): Promise<string[]>`
Extracts all player names from the player grid.

**Returns:** Array of player names

**Example:**
```typescript
const players = await getPlayerNames(page);
console.log(`Players: ${players.join(', ')}`);
```

### `getCurrentPhase(page: Page): Promise<string | null>`
Gets the current phase from the phase indicator.

**Returns:** Current phase (e.g., 'NIGHT', 'DISCUSSION') or null if not found

**Example:**
```typescript
const phase = await getCurrentPhase(page);
if (phase === 'NIGHT') {
  // Do something specific to Night phase
}
```

## Usage Best Practices

1. **Always wait for SSE connection before assertions:**
   ```typescript
   await waitForSSEConnection(page);
   await expect(element).toBeVisible();
   ```

2. **Use generous timeouts for phase transitions:**
   ```typescript
   await waitForPhase(page, 'DISCUSSION', 300000); // 5 minutes
   ```

3. **Log test progress:**
   All helpers include `console.log` statements for debugging.

4. **Handle errors gracefully:**
   Helpers throw descriptive errors on failure.

## Error Handling

All helpers throw errors with descriptive messages when operations fail:
- `createGame`: Throws if game creation fails or gameId cannot be extracted
- `startGame`: Throws if Start Game button is not found or phase doesn't change
- `waitForPhase`: Throws if phase is not reached within timeout
- `waitForSSEConnection`: Throws if connection is not established within timeout

Errors include contextual information to aid debugging.
