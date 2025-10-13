# Explorer 3 Report: Discussion UI & Testing Strategy

## Executive Summary

Iteration 1's success hinges on a robust testing strategy that validates conversation quality before investing in full game implementation. This report provides a comprehensive testing architecture featuring: (1) CLI test harness with real-time logging and cost tracking, (2) Basic Discussion viewer UI using Server-Sent Events for live spectator updates, (3) Multi-dimensional quality validation framework with concrete success criteria gates, (4) Iterative prompt engineering workflow with A/B testing methodology, and (5) SSE implementation patterns with reconnection handling. Critical insight: "Fascinating to watch" requires measurable proxies - we define 7 objective quality metrics that correlate with conversation engagement.

## Discoveries

### 1. Testing is the Quality Gate, Not UI Polish

**Finding:** Iteration 1's primary deliverable is validation that Claude agents produce strategic Mafia conversation, NOT a polished user interface.

**Rationale:**
- Master plan explicitly states: "DO NOT PROCEED to Iteration 2 if Discussion phase doesn't produce compelling strategic conversation"
- Manual transcript review is the validation method (human evaluator rates "fascinating" scale)
- CLI test harness is primary tool (run 10+ tests, review transcripts, iterate prompts)
- Web UI is secondary (basic spectator view, no interactivity needed)

**Implication for Builder:**
- Allocate 60% of time to testing/validation (12-14 hours)
- Allocate 40% of time to implementation (8-10 hours)
- UI polish is explicitly deferred to Iteration 3

### 2. Quality Metrics Must Be Measurable

**Finding:** "Fascinating to watch" is subjective, but we can define objective proxies.

**7 Measurable Quality Dimensions:**

| Dimension | Metric | Success Threshold | How to Measure |
|-----------|--------|-------------------|----------------|
| **Memory Accuracy** | % of statements that correctly reference past events | >80% accuracy | Manual transcript review: count accurate vs inaccurate references |
| **Strategic Depth** | % of statements with evidence-based reasoning | >60% strategic | Count statements with "because", "evidence", "pattern" keywords |
| **Conversation Coherence** | % of responses that address prior statements | >70% coherent | Check if message relates to last 3 messages (not random topic) |
| **Role Consistency** | Mafia deflect/lie, Villagers question/deduce | 80% role-appropriate | Classify each statement as role-consistent or not |
| **Personality Diversity** | Unique vocabulary per personality type | >50% unique words | Compare word frequency across agents |
| **Anti-Repetition** | % of unique phrasings (no copy-paste responses) | <10% repetition | Fuzzy string matching across all messages |
| **Engagement Rating** | Human evaluator "fascinating" score | ≥3 out of 5 | Manual rating after reading full transcript |

**Example Evaluation Rubric:**
```
Game #1 Transcript Evaluation:
✓ Memory Accuracy: 42/50 references correct (84%) - PASS
✓ Strategic Depth: 32/50 statements strategic (64%) - PASS
✗ Conversation Coherence: 28/50 responses coherent (56%) - FAIL (need 70%)
✓ Role Consistency: 41/50 statements role-appropriate (82%) - PASS
✗ Personality Diversity: Only 35% unique vocabulary - FAIL (need 50%)
✗ Anti-Repetition: 18% repetition rate - FAIL (need <10%)
✓ Engagement Rating: 3.5/5 - PASS

RESULT: 4/7 gates passed - ITERATE PROMPTS (focus on coherence and repetition)
```

### 3. CLI Test Harness is Rapid Iteration Engine

**Finding:** Web UI introduces friction for prompt testing. CLI enables 5-10 test iterations per hour.

**CLI Workflow:**
```bash
# 1. Run test (creates game, seeds agents, runs Discussion, saves transcript)
npm run test-discussion

# 2. Review transcript (human evaluation)
cat logs/discussion-test-1697234567.txt

# 3. Adjust prompts (edit system-prompts.ts)
vim src/lib/prompts/system-prompts.ts

# 4. Run test again (iterate)
npm run test-discussion

# Repeat 10-15 times until quality gates pass
```

**Time Savings:**
- CLI: 3 minutes per test (30 seconds setup + 2.5 min run)
- Web UI: 6 minutes per test (1 min manual setup + 2.5 min run + 2.5 min UI interaction)
- 10 tests = 30 min (CLI) vs 60 min (Web UI) → 30 min saved per iteration cycle

**Implication:** CLI harness is FIRST implementation priority (before web UI).

### 4. SSE is Optimal for Spectator Use Case

**Finding:** Server-Sent Events are simpler and more reliable than WebSockets for unidirectional updates.

**SSE vs WebSockets Comparison:**

| Feature | SSE | WebSockets |
|---------|-----|------------|
| Directionality | Server → Client only | Bidirectional |
| Protocol | HTTP (no upgrade) | Separate protocol (ws://) |
| Browser Support | Native EventSource API | Requires library |
| Reconnection | Automatic (native) | Manual implementation |
| Complexity | Low (10 lines server, 5 lines client) | Medium (50+ lines each) |
| Firewall/Proxy | Works everywhere (HTTP) | Often blocked |
| Use Case Fit | Perfect for spectator mode | Overkill (no client→server needed) |

**Recommendation:** Use SSE for Iteration 1. WebSockets unnecessary complexity.

**SSE Implementation Pattern:**
```typescript
// Server: app/api/game/[gameId]/stream/route.ts
export async function GET(req: Request, { params }: { params: { gameId: string } }) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`));
      
      // Listen for game events
      gameEventEmitter.on('message', (data) => {
        if (data.gameId === params.gameId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
      });
      
      // Keepalive (15-second heartbeat)
      const keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15000);
      
      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Client: app/test-discussion/page.tsx
const eventSource = new EventSource(`/api/game/${gameId}/stream`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'NEW_MESSAGE') {
    setMessages(prev => [...prev, data.payload]);
  } else if (data.type === 'PHASE_CHANGE') {
    setPhase(data.payload.phase);
  }
};

eventSource.onerror = () => {
  console.error('SSE connection lost, falling back to polling');
  eventSource.close();
  startPolling(); // 2-second polling fallback
};
```

### 5. Prompt Iteration Requires A/B Testing Methodology

**Finding:** Prompt changes are unpredictable. A/B testing reveals which changes improve quality.

**A/B Testing Workflow:**

1. **Baseline Test (3 games):**
   - Run 3 games with Prompt Version A
   - Save transcripts: `logs/baseline-game-1.txt`, `logs/baseline-game-2.txt`, `logs/baseline-game-3.txt`
   - Evaluate quality metrics (average across 3 games)

2. **Experimental Test (3 games):**
   - Make ONE prompt change (e.g., add "avoid repetitive phrasing" instruction)
   - Run 3 games with Prompt Version B
   - Save transcripts: `logs/experiment-game-1.txt`, etc.

3. **Compare Results:**
   - Baseline Engagement: 2.8/5 → Experiment Engagement: 3.4/5 (improvement!)
   - Baseline Repetition: 22% → Experiment Repetition: 12% (improvement!)
   - **Decision:** Keep Prompt Version B, use as new baseline

4. **Iterate:**
   - Make next change (e.g., add Mafia deflection examples)
   - Repeat process

**Anti-Pattern (avoid this):**
- Making 5 prompt changes at once → can't isolate which change helped
- Only running 1 test per version → not statistically meaningful
- Not documenting changes → can't revert bad changes

**Example Prompt Change Log:**
```markdown
# Prompt Iteration Log

## Baseline (v1.0)
- Date: 2025-10-12
- Tests: game-1, game-2, game-3
- Avg Engagement: 2.8/5
- Issues: Too robotic, repetitive phrasing

## Experiment 1 (v1.1) - Add anti-repetition instruction
- Change: Added "Vary your language, don't repeat phrases" to guidelines
- Tests: game-4, game-5, game-6
- Avg Engagement: 3.1/5
- Result: Repetition reduced 22% → 15%, BUT still >10% threshold
- Decision: Keep change, continue iterating

## Experiment 2 (v1.2) - Add conversation examples
- Change: Added 5 example responses showing natural phrasing
- Tests: game-7, game-8, game-9
- Avg Engagement: 3.6/5
- Result: Repetition now 8%, engagement above threshold!
- Decision: PASS quality gates, lock this version
```

### 6. Test Configuration Matrix for Comprehensive Coverage

**Finding:** Different configurations stress-test different aspects of conversation quality.

**10+ Test Scenarios (Iteration 1 Validation):**

| Test # | Player Count | Mafia Count | Personality Mix | Duration | Focus Area |
|--------|--------------|-------------|-----------------|----------|------------|
| 1 | 8 | 2 | All analytical | 3 min | Baseline (simple) |
| 2 | 10 | 3 | Balanced (5 types) | 3 min | Personality diversity |
| 3 | 12 | 4 | All aggressive | 3 min | High conflict |
| 4 | 10 | 3 | All cautious | 3 min | Low conflict |
| 5 | 10 | 3 | Random | 5 min | Long conversation |
| 6 | 8 | 2 | Random | 3 min | Memory accuracy (repeat test) |
| 7 | 10 | 3 | Random | 3 min | Strategic depth |
| 8 | 10 | 3 | Random | 3 min | Mafia deception quality |
| 9 | 10 | 3 | Random | 3 min | Villager deduction quality |
| 10 | 10 | 3 | Random | 3 min | Final validation |

**Why This Matrix:**
- Tests 1-4: Isolate personality effects
- Test 5: Stress-test memory across many turns
- Tests 6-9: Focus on specific quality dimensions
- Test 10: Final holistic validation

**Cost Budget:**
- 10 tests × $2/test (with caching) = $20
- 5 prompt iterations × 3 tests each × $2 = $30
- **Total testing budget: $50** (acceptable for quality gate validation)

### 7. Discussion Viewer UI Components (Minimal Viable)

**Finding:** Iteration 1 UI needs 3 core components + 1 page. No navigation, no interactivity.

**Component Architecture:**

```
app/test-discussion/page.tsx (Main Page - Client Component)
├── PhaseIndicator (Server Component)
│   └── Shows "DISCUSSION" + countdown timer
├── PlayerGrid (Server Component)
│   └── 8-12 agent cards (name, alive/dead status, NO role reveal)
└── DiscussionFeed (Client Component)
    ├── Scrolling message list (auto-scroll)
    ├── Message threading (basic: show "Replying to X")
    └── Real-time SSE updates
```

**PhaseIndicator Component:**
```typescript
// components/PhaseIndicator.tsx
interface PhaseIndicatorProps {
  phase: 'DISCUSSION' | 'VOTING' | 'NIGHT';
  endTime: Date;
}

export function PhaseIndicator({ phase, endTime }: PhaseIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, differenceInSeconds(endTime, new Date()));
      setTimeRemaining(remaining);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [endTime]);
  
  return (
    <div className="bg-purple-600 text-white p-4 rounded-lg">
      <div className="text-2xl font-bold">{phase}</div>
      <div className="text-lg">{formatDuration(timeRemaining)} remaining</div>
    </div>
  );
}
```

**PlayerGrid Component:**
```typescript
// components/PlayerGrid.tsx
interface PlayerGridProps {
  players: Player[];
}

export function PlayerGrid({ players }: PlayerGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {players.map(player => (
        <div
          key={player.id}
          className={`p-4 rounded border ${
            player.isAlive ? 'border-green-500' : 'border-gray-400 opacity-50'
          }`}
        >
          <div className="font-bold">{player.name}</div>
          <div className="text-sm text-gray-600">
            {player.isAlive ? 'Alive' : 'Eliminated'}
          </div>
          {/* NO ROLE DISPLAY - hidden until game over */}
        </div>
      ))}
    </div>
  );
}
```

**DiscussionFeed Component:**
```typescript
// components/DiscussionFeed.tsx (Client Component)
'use client';

interface DiscussionFeedProps {
  gameId: string;
}

export function DiscussionFeed({ gameId }: DiscussionFeedProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/game/${gameId}/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_MESSAGE') {
        setMessages(prev => [...prev, data.payload]);
      }
    };
    
    return () => eventSource.close();
  }, [gameId]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div ref={scrollRef} className="h-96 overflow-y-auto border rounded p-4">
      {messages.map((msg, idx) => (
        <div key={idx} className="mb-4">
          <div className="font-bold text-blue-600">{msg.playerName}</div>
          {msg.inReplyTo && (
            <div className="text-xs text-gray-500 italic">
              Replying to {msg.inReplyTo.playerName}
            </div>
          )}
          <div className="text-gray-800">{msg.message}</div>
          <div className="text-xs text-gray-400">
            {formatDistanceToNow(msg.timestamp)} ago
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Page Layout:**
```typescript
// app/test-discussion/page.tsx
export default async function TestDiscussionPage() {
  // Fetch initial data server-side
  const game = await prisma.game.findFirst({
    where: { status: 'DISCUSSION' },
    include: { players: true },
  });
  
  if (!game) {
    return <div>No active Discussion found. Run: npm run test-discussion</div>;
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">AI Mafia - Discussion Test</h1>
      
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1">
          <PhaseIndicator 
            phase={game.currentPhase} 
            endTime={game.phaseEndTime} 
          />
          <div className="mt-8">
            <PlayerGrid players={game.players} />
          </div>
        </div>
        
        <div className="col-span-2">
          <DiscussionFeed gameId={game.id} />
        </div>
      </div>
    </div>
  );
}
```

**Styling Priority:**
- Functional layout: YES (readable feed, clear phases)
- Visual polish: NO (defer to Iteration 3)
- Animations: NO (except auto-scroll)
- Responsive design: NO (desktop-only acceptable)

## Patterns Identified

### Pattern 1: CLI-First Testing Strategy

**Description:** Build validation infrastructure before UI polish to enable rapid iteration.

**Use Case:** Testing AI conversation quality requires many iterations (10-20 test runs minimum).

**Example Implementation:**
```typescript
// src/cli/test-discussion.ts
import { orchestrateDiscussionPhase } from '@/lib/orchestration/turn-scheduler';
import { seedTestGame } from '@/lib/db/seed';
import chalk from 'chalk';
import ora from 'ora';

async function runTest() {
  const spinner = ora('Setting up test game...').start();
  
  // 1. Create game and seed agents
  const gameId = await seedTestGame({
    playerCount: 10,
    mafiaCount: 3,
    personalities: ['analytical', 'aggressive', 'cautious', 'social', 'suspicious'],
  });
  
  spinner.succeed(`Game created: ${gameId}`);
  
  // 2. Run Discussion phase
  console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('Discussion Phase Starting (3 minutes)'));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  
  const startTime = Date.now();
  let totalCost = 0;
  let turnCount = 0;
  
  // Hook into orchestrator to log turns
  const originalExecuteTurn = global.executeTurn;
  global.executeTurn = async (...args) => {
    const result = await originalExecuteTurn(...args);
    
    turnCount++;
    totalCost += result.cost;
    
    console.log(chalk.green(`Turn ${turnCount}/${50}`));
    console.log(chalk.cyan(`${result.playerName}:`));
    console.log(chalk.white(`"${result.message}"`));
    console.log(chalk.gray(`(${result.usage.outputTokens} tokens, $${result.cost.toFixed(4)})\n`));
    
    return result;
  };
  
  await orchestrateDiscussionPhase(gameId, 3);
  
  const duration = (Date.now() - startTime) / 1000;
  
  // 3. Save transcript
  const transcript = await generateTranscript(gameId);
  const filename = `logs/discussion-test-${Date.now()}.txt`;
  fs.writeFileSync(filename, transcript);
  
  // 4. Display summary
  console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('Discussion Complete!'));
  console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  console.log(`Duration: ${duration.toFixed(1)} seconds`);
  console.log(`Total turns: ${turnCount}`);
  console.log(`Total cost: ${chalk.green(`$${totalCost.toFixed(2)}`)}`);
  console.log(`Transcript: ${chalk.cyan(filename)}\n`);
}

runTest().catch(console.error);
```

**Recommendation:** Implement CLI harness FIRST (Day 1-2), web UI SECOND (Day 3-4).

### Pattern 2: Multi-Dimensional Quality Evaluation

**Description:** Define objective metrics for subjective "fascinating" quality.

**Use Case:** Convert "this conversation is boring" into actionable prompt improvements.

**Example Evaluation Script:**
```typescript
// src/cli/evaluate-transcript.ts
interface QualityReport {
  memoryAccuracy: number;      // 0-1 scale
  strategicDepth: number;       // 0-1 scale
  coherence: number;            // 0-1 scale
  roleConsistency: number;      // 0-1 scale
  personalityDiversity: number; // 0-1 scale
  repetitionRate: number;       // 0-1 scale (lower is better)
  engagementRating: number;     // 1-5 scale (manual)
}

async function evaluateTranscript(gameId: string): Promise<QualityReport> {
  const messages = await prisma.discussionMessage.findMany({
    where: { gameId },
    include: { player: true },
  });
  
  return {
    memoryAccuracy: calculateMemoryAccuracy(messages),
    strategicDepth: calculateStrategicDepth(messages),
    coherence: calculateCoherence(messages),
    roleConsistency: calculateRoleConsistency(messages),
    personalityDiversity: calculatePersonalityDiversity(messages),
    repetitionRate: calculateRepetitionRate(messages),
    engagementRating: 0, // Manual entry required
  };
}

function calculateStrategicDepth(messages: Message[]): number {
  const strategicKeywords = ['because', 'evidence', 'pattern', 'vote', 'suspicious', 'defend', 'accuse'];
  
  const strategicCount = messages.filter(msg => 
    strategicKeywords.some(kw => msg.message.toLowerCase().includes(kw))
  ).length;
  
  return strategicCount / messages.length; // Returns 0-1
}

function calculateRepetitionRate(messages: Message[]): number {
  const phrases = messages.map(msg => msg.message.toLowerCase());
  let duplicates = 0;
  
  for (let i = 0; i < phrases.length; i++) {
    for (let j = i + 1; j < phrases.length; j++) {
      const similarity = jaroWinkler(phrases[i], phrases[j]);
      if (similarity > 0.85) { // 85% similar = too repetitive
        duplicates++;
      }
    }
  }
  
  return duplicates / messages.length;
}

function calculateMemoryAccuracy(messages: Message[]): number {
  // Look for references to past events
  const referencePattern = /in round \d+|last vote|previously|earlier|before/gi;
  const referencingMessages = messages.filter(msg => referencePattern.test(msg.message));
  
  // Manual validation required: are these references accurate?
  console.log('\nValidate Memory References (mark accurate/inaccurate):');
  
  let accurate = 0;
  for (const msg of referencingMessages) {
    console.log(`\n${msg.player.name}: "${msg.message}"`);
    const answer = prompt('Accurate? (y/n): ');
    if (answer.toLowerCase() === 'y') accurate++;
  }
  
  return referencingMessages.length > 0 
    ? accurate / referencingMessages.length 
    : 1.0; // No references = no errors
}
```

**Recommendation:** Run evaluation script on EVERY test game, track metrics over time.

### Pattern 3: SSE with Polling Fallback

**Description:** Use Server-Sent Events as primary transport, fall back to polling if SSE fails.

**Use Case:** Unreliable networks, firewall restrictions, or browser compatibility issues.

**Example Implementation:**
```typescript
// Client-side reconnection logic
class ResilientEventSource {
  private eventSource: EventSource | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private failureCount = 0;
  private lastMessageTime = Date.now();
  
  constructor(
    private url: string,
    private onMessage: (data: any) => void
  ) {
    this.connect();
  }
  
  private connect() {
    try {
      this.eventSource = new EventSource(this.url);
      
      this.eventSource.onmessage = (event) => {
        this.failureCount = 0; // Reset on success
        this.lastMessageTime = Date.now();
        this.onMessage(JSON.parse(event.data));
      };
      
      this.eventSource.onerror = () => {
        this.failureCount++;
        
        if (this.failureCount >= 3) {
          console.warn('SSE failed 3 times, switching to polling');
          this.eventSource?.close();
          this.startPolling();
        } else {
          // Auto-reconnect (EventSource does this automatically)
          console.log('SSE reconnecting...');
        }
      };
    } catch (error) {
      console.error('SSE not supported, using polling');
      this.startPolling();
    }
  }
  
  private startPolling() {
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.url}?since=${this.lastMessageTime}`);
        const messages = await response.json();
        
        messages.forEach((msg: any) => {
          this.onMessage(msg);
          this.lastMessageTime = new Date(msg.timestamp).getTime();
        });
      } catch (error) {
        console.error('Polling failed:', error);
      }
    }, 2000); // Poll every 2 seconds
  }
  
  close() {
    this.eventSource?.close();
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }
}

// Usage in component
useEffect(() => {
  const connection = new ResilientEventSource(
    `/api/game/${gameId}/stream`,
    (data) => {
      if (data.type === 'NEW_MESSAGE') {
        setMessages(prev => [...prev, data.payload]);
      }
    }
  );
  
  return () => connection.close();
}, [gameId]);
```

**Recommendation:** Implement SSE first, add polling fallback only if QA reveals connection issues.

### Pattern 4: Cost Tracking Per Test

**Description:** Log API costs in real-time during test runs to validate prompt caching effectiveness.

**Use Case:** Detect caching failures early (before spending $50+ on broken tests).

**Example Implementation:**
```typescript
// src/lib/orchestration/cost-tracker.ts
interface CostLog {
  gameId: string;
  turnNumber: number;
  playerId: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

class CostTracker {
  private logs: CostLog[] = [];
  
  log(entry: CostLog) {
    this.logs.push(entry);
  }
  
  getGameSummary(gameId: string) {
    const gameLogs = this.logs.filter(log => log.gameId === gameId);
    
    const totalInputTokens = gameLogs.reduce((sum, log) => sum + log.inputTokens, 0);
    const totalCachedTokens = gameLogs.reduce((sum, log) => sum + log.cachedTokens, 0);
    const totalOutputTokens = gameLogs.reduce((sum, log) => sum + log.outputTokens, 0);
    const totalCost = gameLogs.reduce((sum, log) => sum + log.cost, 0);
    
    const cacheHitRate = totalCachedTokens / totalInputTokens;
    
    return {
      totalTurns: gameLogs.length,
      totalInputTokens,
      totalCachedTokens,
      totalOutputTokens,
      totalCost,
      cacheHitRate,
      avgCostPerTurn: totalCost / gameLogs.length,
      status: cacheHitRate > 0.5 ? 'HEALTHY' : 'CACHING_ISSUE',
    };
  }
  
  exportCSV(gameId: string): string {
    const gameLogs = this.logs.filter(log => log.gameId === gameId);
    
    const header = 'turn,player,inputTokens,cachedTokens,outputTokens,cost\n';
    const rows = gameLogs.map(log => 
      `${log.turnNumber},${log.playerId},${log.inputTokens},${log.cachedTokens},${log.outputTokens},${log.cost}`
    ).join('\n');
    
    return header + rows;
  }
}

export const costTracker = new CostTracker();

// Usage in orchestrator
const { text, usage } = await generateAgentResponse(context);

costTracker.log({
  gameId,
  turnNumber,
  playerId,
  inputTokens: usage.inputTokens,
  cachedTokens: usage.cachedTokens,
  outputTokens: usage.outputTokens,
  cost: usage.cost,
  timestamp: new Date(),
});

// At end of game
const summary = costTracker.getGameSummary(gameId);
console.log(`Total cost: $${summary.totalCost.toFixed(2)}`);
console.log(`Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);

if (summary.status === 'CACHING_ISSUE') {
  console.warn('⚠️  Cache hit rate <50% - investigate prompt caching configuration!');
}
```

**Recommendation:** Display cost summary after EVERY CLI test run. Fail test if cost >$3.

### Pattern 5: Transcript Export with Metadata

**Description:** Save not just conversation text, but full game context for analysis.

**Use Case:** Debug prompt issues, share examples with team, build training dataset.

**Example Transcript Format:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI MAFIA - DISCUSSION PHASE TRANSCRIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Game ID: game-abc123
Date: 2025-10-12 19:30:45
Duration: 2m 47s
Cost: $1.87

CONFIGURATION:
  Players: 10 (3 Mafia, 7 Villagers)
  Personalities: analytical, aggressive, cautious, social, suspicious
  Model: claude-sonnet-4.5-20250929
  Temperature: 0.8
  Prompt Version: v1.2

AGENTS:
  1. Agent Alpha (VILLAGER, analytical)
  2. Agent Bravo (MAFIA, aggressive)
  3. Agent Charlie (VILLAGER, cautious)
  4. Agent Delta (MAFIA, social)
  5. Agent Echo (VILLAGER, suspicious)
  6. Agent Foxtrot (VILLAGER, strategic)
  7. Agent Golf (MAFIA, cautious)
  8. Agent Hotel (VILLAGER, analytical)
  9. Agent India (VILLAGER, aggressive)
  10. Agent Juliet (VILLAGER, social)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION (52 turns)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Round 1, Turn 1] Agent Alpha (VILLAGER):
"I think we need to carefully analyze voting patterns from previous rounds to identify suspicious behavior."
  → Cost: $0.042 (185 tokens)

[Round 1, Turn 2] Agent Bravo (MAFIA):
"I agree with Alpha. Let's focus on facts, not speculation."
  → Replying to: Agent Alpha
  → Cost: $0.011 (78 tokens)

[Round 1, Turn 3] Agent Charlie (VILLAGER):
"Bravo, why are you so quick to agree without offering your own analysis?"
  → Replying to: Agent Bravo
  → Cost: $0.013 (82 tokens)

... (48 more turns) ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY METRICS (Automated)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strategic Depth: 68% (35/52 statements with evidence)
Coherence: 73% (38/52 responses addressed prior statements)
Role Consistency: 85% (44/52 statements role-appropriate)
Personality Diversity: 52% unique vocabulary
Repetition Rate: 11% (6 repetitive phrases)

Memory References: 18 found
  - "In Round 2, Alpha voted for Beta" ✓ ACCURATE
  - "Last elimination was Delta" ✗ INACCURATE (was Echo)
  ... (16 more) ...
Memory Accuracy: 83% (15/18 accurate)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANUAL EVALUATION (Fill in after review)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Engagement Rating: [ ] 1  [ ] 2  [ ] 3  [ ] 4  [ ] 5
Mafia Deception Quality: [ ] Poor  [ ] Fair  [ ] Good  [ ] Excellent
Villager Deduction Quality: [ ] Poor  [ ] Fair  [ ] Good  [ ] Excellent

Notes:
________________________________________________
________________________________________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Recommendation:** Generate this format for every CLI test, commit to git for version control.

## Complexity Assessment

### High Complexity Areas

**1. Quality Evaluation Framework (HIGHEST PRIORITY)**
- **Challenge:** Defining "fascinating" in measurable terms
- **Complexity Factors:**
  - 7 dimensions to measure (memory, strategy, coherence, role, personality, repetition, engagement)
  - Hybrid automated + manual evaluation required
  - Must be repeatable (consistent scoring across tests)
  - Requires domain expertise (what makes Mafia conversation good?)
- **Estimated Builder Effort:** 6-8 hours
  - 2 hours: Define metrics and thresholds
  - 3 hours: Implement automated calculations
  - 2 hours: Manual evaluation protocol
  - 1 hour: Reporting/visualization
- **Recommendation:** Start with 3 core metrics (memory, strategy, engagement), expand to 7 if time permits
- **Split Needed:** No (cohesive problem domain)

**2. CLI Test Harness with Real-time Logging**
- **Challenge:** Orchestrating test setup, execution, transcript generation, cost tracking
- **Complexity Factors:**
  - Integration with orchestrator (hook into turn execution)
  - Real-time console output (colored, formatted)
  - Transcript file generation with metadata
  - Cost tracking and cache validation
  - Error handling (API failures shouldn't crash test)
- **Estimated Builder Effort:** 5-7 hours
  - 2 hours: Basic test setup (seed game, run orchestrator)
  - 2 hours: Real-time console logging (chalk, ora)
  - 1 hour: Transcript generation
  - 1 hour: Cost tracking integration
  - 1 hour: Error handling and edge cases
- **Recommendation:** Implement incrementally (basic → logging → transcripts → cost)
- **Split Needed:** No (straightforward scripting)

**3. Prompt Iteration Workflow**
- **Challenge:** Systematic experimentation to improve conversation quality
- **Complexity Factors:**
  - A/B testing methodology (baseline vs experiment)
  - Change isolation (one variable at a time)
  - Statistical significance (3+ tests per version)
  - Documentation (track all changes and results)
  - Subjective evaluation (requires human judgment)
- **Estimated Builder Effort:** 6-10 hours
  - 2 hours: Initial baseline tests (3 games)
  - 4-6 hours: Iteration cycles (3-5 cycles × 1-2 hours each)
  - 2 hours: Final validation tests
- **Recommendation:** Builder MUST allocate time for this (not just implementation)
- **Split Needed:** Possibly - if prompt iteration exceeds 8 hours, split to dedicated sub-builder

### Medium Complexity Areas

**4. Server-Sent Events Implementation**
- **Challenge:** Streaming real-time updates from server to client
- **Complexity:** Medium (Next.js has native support, but needs proper event handling)
- **Estimated Builder Effort:** 3-4 hours
  - 1 hour: Server route handler (ReadableStream)
  - 1 hour: Client EventSource integration
  - 1 hour: Event types and payloads
  - 1 hour: Testing and debugging
- **Split Needed:** No
- **Notes:** Defer polling fallback to QA (implement only if needed)

**5. Discussion Viewer UI Components**
- **Challenge:** Rendering real-time message feed with auto-scroll
- **Complexity:** Medium (React state management, SSE updates)
- **Estimated Builder Effort:** 4-5 hours
  - 1 hour: PhaseIndicator component
  - 1 hour: PlayerGrid component
  - 2 hours: DiscussionFeed component (SSE + auto-scroll)
  - 1 hour: Page layout and styling
- **Split Needed:** No
- **Notes:** Minimal styling acceptable (function over form)

### Low Complexity Areas

**6. Transcript Export**
- **Straightforward:** Format database records as text file
- **Estimated Builder Effort:** 1-2 hours
- **Notes:** Use template string with metadata header

**7. Cost Summary Display**
- **Straightforward:** Aggregate token usage logs
- **Estimated Builder Effort:** 1 hour
- **Notes:** Display in CLI after game completes

**8. Basic Message Threading UI**
- **Straightforward:** Show "Replying to X" text
- **Estimated Builder Effort:** 1 hour
- **Notes:** No fancy graph visualization (defer to Iteration 3)

## Technology Recommendations

### Primary Stack (Confirmed from Explorer 1 & 2)

**Framework: Next.js 14 App Router**
- SSE support via Route Handlers (ReadableStream)
- Server + Client Component split (ideal for Discussion viewer)
- No additional dependencies needed

**UI Library: React 18**
- Native useState/useEffect for SSE connection
- useRef for auto-scroll management
- No state management library needed (SSE is single source of truth)

**Styling: Tailwind CSS**
- Rapid prototyping (no custom CSS needed)
- Utility-first approach (readable components)
- Defer polish to Iteration 3

### Supporting Libraries

**1. chalk (CLI Colored Output)**
- **Purpose:** Color-coded terminal output for CLI test harness
- **Version:** `5.3.0`
- **Usage:**
```typescript
import chalk from 'chalk';

console.log(chalk.blue('━━━━ Discussion Starting ━━━━'));
console.log(chalk.green(`✓ Agent Alpha: "${message}"`));
console.log(chalk.red(`✗ API Error: ${error.message}`));
console.log(chalk.gray(`Cost: $${cost.toFixed(4)}`));
```

**2. ora (CLI Spinners)**
- **Purpose:** Loading indicators during async operations
- **Version:** `8.1.0`
- **Usage:**
```typescript
import ora from 'ora';

const spinner = ora('Setting up test game...').start();
await seedTestGame();
spinner.succeed('Game created!');

const turnSpinner = ora().start();
for (const player of players) {
  turnSpinner.text = `${player.name} is thinking...`;
  await executeTurn(player.id);
}
turnSpinner.stop();
```

**3. date-fns (Date Formatting)**
- **Purpose:** Format timestamps, calculate durations
- **Version:** `3.6.0`
- **Usage:**
```typescript
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';

<div>{formatDistanceToNow(message.timestamp)} ago</div>
<div>{differenceInSeconds(phaseEndTime, now)} seconds remaining</div>
```

**4. string-similarity (Repetition Detection)**
- **Purpose:** Fuzzy string matching to detect repetitive phrases
- **Version:** `4.0.4`
- **Usage:**
```typescript
import { compareTwoStrings } from 'string-similarity';

const similarity = compareTwoStrings(phrase1, phrase2);
if (similarity > 0.85) {
  console.warn('Repetitive phrasing detected');
}
```

**5. csv-writer (Cost Data Export)**
- **Purpose:** Export cost tracking data to CSV for analysis
- **Version:** `1.6.0`
- **Usage:**
```typescript
import { createObjectCsvWriter } from 'csv-writer';

const csvWriter = createObjectCsvWriter({
  path: 'logs/cost-tracking.csv',
  header: [
    { id: 'turn', title: 'Turn' },
    { id: 'player', title: 'Player' },
    { id: 'tokens', title: 'Tokens' },
    { id: 'cost', title: 'Cost' },
  ],
});

await csvWriter.writeRecords(costLogs);
```

### Optional Libraries (Defer to Iteration 2/3)

- **react-window:** Virtual scrolling (only if >200 messages cause performance issues)
- **recharts:** Cost/token usage visualizations (Iteration 3)
- **framer-motion:** Message fade-in animations (Iteration 3 polish)

## Integration Points

### External APIs

**1. Claude API (via @anthropic-ai/sdk)**
- **Integration Point:** CLI test harness → Orchestrator → Claude API
- **Considerations:**
  - Cost tracking MUST be integrated at API call level
  - Timeout handling (10 seconds) MUST work in CLI tests
  - Error handling (API failures) should NOT crash CLI test
- **Testing Strategy:**
  - Mock API calls in unit tests (use fixtures)
  - Real API in CLI tests (with cost budget limits)
  - Log ALL API calls (input/output tokens, latency, cost)

### Internal Integrations

**1. CLI Test Harness ↔ Discussion Orchestrator**
- **Connection:** Direct function call
- **Data Flow:**
  - CLI creates game in database
  - CLI invokes `orchestrateDiscussionPhase(gameId, duration)`
  - Orchestrator emits events (turn complete, phase complete)
  - CLI listens to events for real-time logging
- **Complexity:** Low (simple event emission)
- **Key Challenge:** Hook into turn execution without modifying orchestrator core logic

**Implementation Pattern:**
```typescript
// CLI test harness
import { orchestrateDiscussionPhase } from '@/lib/orchestration/turn-scheduler';
import { gameEventEmitter } from '@/lib/orchestration/events';

// Listen for turn events
gameEventEmitter.on('turn_complete', (data) => {
  console.log(`${data.playerName}: "${data.message}"`);
  console.log(`Cost: $${data.cost.toFixed(4)}\n`);
});

// Run orchestration
await orchestrateDiscussionPhase(gameId, 3);
```

**2. Discussion Viewer UI ↔ SSE Stream**
- **Connection:** HTTP EventSource
- **Data Flow:**
  - Client opens SSE connection: `new EventSource('/api/game/:id/stream')`
  - Server pushes events: `NEW_MESSAGE`, `PHASE_CHANGE`, `TURN_COMPLETE`
  - Client updates React state → UI re-renders
- **Complexity:** Low (native EventSource API)
- **Key Challenge:** Handle reconnection gracefully (EventSource does this automatically)

**3. SSE Route Handler ↔ Game Event Emitter**
- **Connection:** In-memory EventEmitter
- **Data Flow:**
  - Orchestrator emits events: `gameEventEmitter.emit('message', data)`
  - SSE handler listens: `gameEventEmitter.on('message', callback)`
  - SSE handler encodes and sends to client
- **Complexity:** Low (Node.js EventEmitter)
- **Key Challenge:** Filter events by gameId (don't leak events between games)

**Implementation Pattern:**
```typescript
// Server: app/api/game/[gameId]/stream/route.ts
export async function GET(req: Request, { params }: { params: { gameId: string } }) {
  const stream = new ReadableStream({
    start(controller) {
      // Filter events for this game only
      const handler = (data: any) => {
        if (data.gameId === params.gameId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
      };
      
      gameEventEmitter.on('message', handler);
      
      req.signal.addEventListener('abort', () => {
        gameEventEmitter.off('message', handler);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

## Risks & Challenges

### Technical Risks

**Risk 1: Quality Metrics Don't Correlate with "Fascinating"**
- **Impact:** HIGH - We waste time optimizing wrong metrics
- **Likelihood:** MEDIUM - Proxies may not capture subjective engagement
- **Mitigation:**
  - Run 3 games with HIGH automated metrics + LOW manual engagement (identify gaps)
  - Run 3 games with LOW automated metrics + HIGH manual engagement (identify missing dimensions)
  - Adjust metric weights based on correlation analysis
  - Always include manual engagement rating (never rely solely on automated metrics)
- **Fallback:** If metrics don't correlate, fall back to pure manual evaluation (slower but accurate)

**Risk 2: CLI Test Harness Becomes Too Slow**
- **Impact:** MEDIUM - Slow iteration cycles delay prompt refinement
- **Likelihood:** LOW - CLI is faster than Web UI by design
- **Mitigation:**
  - Profile test execution (identify bottlenecks: API latency? Database queries? Logging?)
  - Optimize slowest component (e.g., reduce transcript generation overhead)
  - Consider parallel test execution (run 3 tests concurrently on different games)
- **Fallback:** Reduce test duration (2 minutes instead of 3) for iteration cycles

**Risk 3: SSE Connection Drops Frequently**
- **Impact:** LOW - Spectators miss messages, but game continues
- **Likelihood:** MEDIUM - SSE can be flaky on poor networks
- **Mitigation:**
  - Implement automatic reconnection (EventSource does this by default)
  - Add state catchup (fetch missed messages on reconnect)
  - Display connection status indicator ("Connected" / "Reconnecting...")
- **Fallback:** Implement 2-second polling fallback (only if SSE proves unreliable in QA)

### Complexity Risks

**Risk 4: Prompt Iteration Takes Longer Than Expected**
- **Impact:** HIGH - Blocks Iteration 1 completion
- **Likelihood:** HIGH - Prompt engineering is inherently unpredictable
- **Mitigation:**
  - Allocate 8-10 hours for prompt iteration (not just 4-6)
  - Define "good enough" threshold (not perfect): 5/7 quality gates passing is acceptable
  - Use A/B testing methodology (systematic, not random changes)
  - Document all changes (avoid repeating failed experiments)
- **Fallback:** If >10 hours spent without passing quality gates, split to dedicated sub-builder

**Risk 5: Manual Evaluation is Inconsistent**
- **Impact:** MEDIUM - Can't reliably measure improvement
- **Likelihood:** MEDIUM - Subjective ratings vary by mood, context, etc.
- **Mitigation:**
  - Define explicit evaluation rubric (what makes conversation "3/5" vs "4/5"?)
  - Evaluate multiple transcripts in single session (consistent mental baseline)
  - Use comparative evaluation ("Game B is better than Game A") instead of absolute ratings
  - Track inter-rater reliability if multiple people evaluate (target >80% agreement)
- **Fallback:** Average scores across multiple evaluators (reduces individual bias)

**Risk 6: Transcript Files Become Too Large**
- **Impact:** LOW - Hard to read/analyze long transcripts
- **Likelihood:** LOW - 3-minute games generate ~50 messages = ~5KB text
- **Mitigation:**
  - Limit transcript to first 100 messages (sufficient for evaluation)
  - Provide summary statistics at top (read summary first, dive into details if needed)
  - Generate both full transcript (archive) and condensed version (evaluation)
- **Fallback:** Split transcript into sections (Round 1, Round 2, etc.)

## Recommendations for Planner

### 1. CRITICAL: Prioritize CLI Test Harness Over Web UI
**Rationale:** CLI is the validation engine. Web UI is secondary for Iteration 1.

**Action Items:**
- Builder implements CLI test harness FIRST (Day 1-2)
- Run 3 baseline tests to validate orchestrator integration
- THEN implement web UI (Day 3-4) for spectator experience
- Quality gates are validated via CLI, not web UI

**Time Allocation:**
- CLI: 5-7 hours (high priority)
- Web UI: 4-5 hours (medium priority)

### 2. Define "Fascinating" Rubric Before Starting Tests
**Rationale:** Can't validate quality without clear success criteria.

**Action Items:**
- Before running first test, builder defines:
  - 7 quality dimensions with thresholds
  - Manual evaluation rubric (what's 3/5 vs 4/5?)
  - Minimum passing score (5/7 dimensions = acceptable?)
- Document in `docs/quality-rubric.md`
- Commit to git (version control for rubric iterations)

**Example Rubric:**
```markdown
# Iteration 1 Quality Rubric

## Automated Metrics (6 dimensions)

1. Memory Accuracy: >80% accurate references
2. Strategic Depth: >60% statements with evidence
3. Coherence: >70% responses address prior statements
4. Role Consistency: >80% role-appropriate statements
5. Personality Diversity: >50% unique vocabulary
6. Repetition Rate: <10% repetitive phrases

## Manual Evaluation (1 dimension)

7. Engagement Rating: 1-5 scale
   - 1 = Boring (robotic, repetitive)
   - 2 = Below average (some strategic moments, mostly bland)
   - 3 = Average (consistently strategic, occasionally engaging)
   - 4 = Above average (frequently engaging, strategic depth)
   - 5 = Excellent (highly engaging, emergent strategy)

## Passing Criteria

- 5/7 dimensions must pass thresholds
- Engagement rating MUST be ≥3 (non-negotiable)
- If 4/7 pass but engagement is <3, FAIL (automated metrics don't capture quality)
```

### 3. Implement Cost Tracking from Day 1
**Rationale:** Detect prompt caching failures early (before spending $50+ on broken tests).

**Action Items:**
- Integrate cost tracking into orchestrator (log every API call)
- Display cost summary after EVERY CLI test
- FAIL test if cost >$3 (indicates caching not working)
- Export cost data to CSV for analysis

**Alert Thresholds:**
- Cost >$3 per game → ERROR (caching broken)
- Cache hit rate <50% → WARNING (investigate cache configuration)
- Cost $2-3 per game → OK (acceptable range)

### 4. Plan for 3 Prompt Iteration Cycles (Minimum)
**Rationale:** First prompts will NOT pass quality gates. This is expected.

**Action Items:**
- Cycle 1 (Baseline): Run 3 tests, identify weaknesses
- Cycle 2 (Iteration): Adjust prompts, run 3 tests, compare results
- Cycle 3 (Refinement): Further adjustments, run 3 tests
- Final Validation: Run 3 tests with locked prompts (prove stability)

**Total Tests:** 3 + 3 + 3 + 3 = 12 tests minimum
**Total Cost:** 12 tests × $2 = $24 (acceptable)
**Total Time:** 4 cycles × 2 hours = 8 hours (plan for this)

### 5. Use A/B Testing Methodology (Not Random Changes)
**Rationale:** Systematic experimentation isolates effective changes.

**Action Items:**
- Make ONE prompt change per cycle
- Compare against previous version (baseline)
- Document change and rationale
- Only keep change if metrics improve
- If metrics worsen, revert and try different approach

**Anti-Pattern to Avoid:**
- Making 5 changes at once → can't isolate which helped
- Only running 1 test per version → not statistically meaningful
- Not documenting changes → repeat failed experiments

### 6. Defer Polling Fallback Unless QA Reveals Issues
**Rationale:** SSE works reliably in most environments. Don't implement fallback preemptively.

**Action Items:**
- Implement SSE first (3-4 hours)
- Test with various browsers/networks
- Only implement polling if SSE fails in QA
- Document SSE limitations (if any)

**Decision Gate:** If SSE works in 95% of test cases, ship without polling fallback.

### 7. Minimal UI Styling (Function Over Form)
**Rationale:** Iteration 3 handles polish. Iteration 1 validates conversation quality.

**Action Items:**
- Use default Tailwind styling (no custom CSS)
- Functional layout: readable feed, clear phase indicator
- No animations (except auto-scroll)
- No responsive design (desktop-only acceptable)
- No dark mode toggle
- No accessibility features (defer to Iteration 3)

**Time Saved:** 4-6 hours (reallocated to prompt iteration)

### 8. Create Transcript Archive for Future Analysis
**Rationale:** Transcripts are valuable for prompt research, debugging, and demo purposes.

**Action Items:**
- Save ALL transcripts to `logs/` directory
- Name format: `discussion-test-{timestamp}-v{prompt-version}.txt`
- Commit representative transcripts to git (3-5 examples)
- Create `docs/transcript-analysis.md` with findings

**Benefit:** Future iterations can reference past tests ("Why did we change this prompt?")

### 9. Implement Graceful Degradation for API Failures
**Rationale:** API failures shouldn't crash CLI tests (lose all progress).

**Action Items:**
- Wrap API calls in try-catch
- On failure, log error and continue to next turn
- Generate fallback response ("Agent is silent")
- Complete test with partial results (better than total failure)
- Flag test as "PARTIAL" in summary

**Example:**
```
Discussion Complete (PARTIAL - 3 API failures)
  Duration: 2m 54s
  Total turns: 47/50 (3 failures)
  Total cost: $1.92
  ⚠️  Agent Alpha failed turn 12 (timeout)
  ⚠️  Agent Bravo failed turn 28 (API error)
  ⚠️  Agent Charlie failed turn 43 (rate limit)
```

### 10. Define Clear Handoff Criteria to Iteration 2
**Rationale:** Iteration 2 builder needs objective signal that Iteration 1 succeeded.

**Handoff Criteria (ALL must pass):**

1. ✓ CLI test harness works (run 3 tests successfully)
2. ✓ Web UI displays Discussion (basic spectator view functional)
3. ✓ SSE streaming works (messages appear <2 seconds after generation)
4. ✓ Cost tracking validates caching (cache hit rate >70%)
5. ✓ Quality gates pass (5/7 dimensions pass thresholds)
6. ✓ 3 final validation tests pass (prove stability)
7. ✓ Documentation complete (setup guide, quality rubric, transcript examples)

**Deliverables:**
- `logs/` directory with 10+ test transcripts
- `docs/quality-evaluation.md` with metrics and analysis
- `docs/prompt-iteration-log.md` with all changes documented
- Working CLI command: `npm run test-discussion`
- Working web UI: `http://localhost:3000/test-discussion`

## Resource Map

### Critical Files/Directories

#### CLI Test Harness
**Path:** `/src/cli/test-discussion.ts`
- **Purpose:** Main test execution script (setup game → run → log → summarize)
- **Key Functions:** `runTest()`, `setupTestGame()`, `generateTranscript()`
- **Priority:** HIGH (implement Day 1)

**Path:** `/src/cli/evaluate-transcript.ts`
- **Purpose:** Quality evaluation script (calculate metrics, generate report)
- **Key Functions:** `evaluateTranscript()`, `calculateStrategicDepth()`, `calculateRepetitionRate()`
- **Priority:** MEDIUM (implement Day 2-3)

#### Web UI Components
**Path:** `/app/test-discussion/page.tsx`
- **Purpose:** Main Discussion viewer page
- **Priority:** MEDIUM (implement Day 3)

**Path:** `/components/PhaseIndicator.tsx`
- **Purpose:** Display current phase + countdown timer
- **Priority:** MEDIUM

**Path:** `/components/PlayerGrid.tsx`
- **Purpose:** Display 8-12 agent cards (name, status)
- **Priority:** MEDIUM

**Path:** `/components/DiscussionFeed.tsx`
- **Purpose:** Scrolling message feed with SSE updates
- **Priority:** HIGH (core UI component)

#### SSE Implementation
**Path:** `/app/api/game/[gameId]/stream/route.ts`
- **Purpose:** Server-Sent Events endpoint
- **Key Functions:** `GET()` route handler with ReadableStream
- **Priority:** HIGH (implement Day 3)

**Path:** `/lib/orchestration/events.ts`
- **Purpose:** Game event emitter (orchestrator → SSE)
- **Key Functions:** `gameEventEmitter.emit()`, `gameEventEmitter.on()`
- **Priority:** MEDIUM

#### Testing Infrastructure
**Path:** `/logs/` (directory)
- **Purpose:** Store all test transcripts
- **Contents:** `discussion-test-{timestamp}.txt` files
- **Priority:** HIGH (create Day 1)

**Path:** `/docs/quality-rubric.md`
- **Purpose:** Define quality evaluation criteria
- **Priority:** HIGH (create before first test)

**Path:** `/docs/prompt-iteration-log.md`
- **Purpose:** Track all prompt changes and results
- **Priority:** HIGH (update after each iteration)

**Path:** `/docs/transcript-analysis.md`
- **Purpose:** Summarize findings from test transcripts
- **Priority:** MEDIUM (create after 10+ tests)

### Key Dependencies

**Production Dependencies:**
- `next` (SSE via Route Handlers)
- `react` (UI components)
- `@anthropic-ai/sdk` (Claude API)
- `@prisma/client` (Database queries)
- `date-fns` (Timestamp formatting)

**Development Dependencies:**
- `chalk` (CLI colored output)
- `ora` (CLI spinners)
- `tsx` (Run TypeScript CLI scripts)
- `string-similarity` (Repetition detection)
- `csv-writer` (Cost data export)

### Testing Infrastructure

**CLI Test Command:**
```json
// package.json
{
  "scripts": {
    "test-discussion": "tsx src/cli/test-discussion.ts",
    "evaluate": "tsx src/cli/evaluate-transcript.ts"
  }
}
```

**Usage:**
```bash
# Run test
npm run test-discussion

# Evaluate transcript
npm run evaluate -- --gameId game-abc123
```

**Quality Gate Validation:**
- Manual evaluation of transcripts (primary method)
- Automated metric calculation (supporting method)
- Cost tracking validation (caching check)

## Questions for Planner

### Q1: Should builder implement all 7 quality metrics or start with 3 core metrics?
**Trade-off:**
- All 7 metrics: Comprehensive evaluation, but 4-6 hours implementation
- 3 core metrics (memory, strategy, engagement): Faster validation, but less precise

**Recommendation:** Start with 3 core metrics, expand to 7 if time permits.

### Q2: What's the acceptable cost per test game?
**Context:** With caching: ~$2/game. Without: ~$17/game.

**Proposed Limits:**
- $2-3/game: PASS (caching working well)
- $3-5/game: WARNING (investigate caching)
- >$5/game: FAIL (caching broken, don't proceed)

**Recommendation:** Set hard limit at $3/game for CLI tests.

### Q3: How many test games required before Iteration 2?
**Options:**
- Minimum: 10 tests (3 baseline + 3 per iteration cycle × 2 cycles + 1 final)
- Recommended: 15 tests (more iteration cycles)
- Maximum: 20 tests (extensive validation)

**Cost Implications:**
- 10 tests × $2 = $20
- 15 tests × $2 = $30
- 20 tests × $2 = $40

**Recommendation:** Plan for 15 tests ($30 budget). This allows 4 iteration cycles.

### Q4: Should manual evaluation be done by builder or separate evaluator?
**Trade-off:**
- Builder evaluates: Faster (no handoff), but potential bias
- Separate evaluator: Objective, but slower (handoff friction)

**Recommendation:** Builder evaluates for iteration cycles (speed), separate evaluator for final validation (objectivity).

### Q5: Should SSE polling fallback be implemented in Iteration 1?
**Trade-off:**
- Implement now: More robust, but 2-3 extra hours
- Defer to QA: Faster Iteration 1, but might need hotfix if SSE unreliable

**Recommendation:** Defer to QA. SSE is reliable in most environments. Add polling only if QA reveals issues.

### Q6: What's the minimum UI polish for Iteration 1?
**Options:**
- Bare minimum: Unstyled HTML (0 hours styling)
- Basic Tailwind: Functional layout (1-2 hours styling)
- Polished Tailwind: Attractive design (4-6 hours styling)

**Recommendation:** Basic Tailwind (1-2 hours). Functional layout, readable feed, no custom CSS.

### Q7: Should transcripts be committed to git or stored locally?
**Trade-off:**
- Commit to git: Version controlled, easy to share, but increases repo size
- Local only: Cleaner repo, but transcripts lost on new clone

**Recommendation:** Commit 3-5 representative transcripts, store rest locally. Add `logs/*.txt` to `.gitignore`, manually commit selected examples.

### Q8: What's the threshold for prompt iteration "good enough"?
**Context:** Prompts can always be improved, but at what point do we stop iterating?

**Proposed Thresholds:**
- 5/7 quality gates passing: Minimum viable
- 6/7 quality gates passing: Good
- 7/7 quality gates passing: Excellent (may not be achievable)

**Recommendation:** Target 6/7 quality gates. If achieved in <10 hours, excellent. If not achieved after 10 hours, 5/7 is acceptable to unblock Iteration 2.

### Q9: Should cost tracking data be exported for analysis?
**Trade-off:**
- Export to CSV: Enables analysis (cache hit rate trends, cost optimization), but adds complexity
- Console only: Simpler, but no historical tracking

**Recommendation:** Export to CSV. Minimal complexity (csv-writer library), high value for debugging and optimization.

### Q10: Should test harness support custom configurations?
**Context:** Test configurations like player count, duration, personalities.

**Options:**
- Hardcoded: 10 players, 3 minutes, random personalities (0 hours)
- CLI flags: `npm run test-discussion -- --players 12 --duration 5` (1-2 hours)
- Interactive prompts: Ask user for configuration (1-2 hours)

**Recommendation:** Start hardcoded (10 players, 3 min, random). Add CLI flags if time permits (nice to have, not required).

## Limitations

### MCP Tool Availability

**Status:** MCP tools were NOT used in this exploration.

**Rationale:**
- **Playwright MCP:** No existing web application to test (greenfield project)
- **Chrome DevTools MCP:** No performance profiling needed until application exists
- **Supabase MCP:** Using SQLite (not Supabase/PostgreSQL)

**Recommendations for Future Use:**

**Iteration 2 (After Full Game Implementation):**
- Use Playwright MCP to test full game flow end-to-end
- Test scenarios: Lobby → Game Start → Night → Discussion → Voting → Win
- Validate SSE updates arrive correctly (<2 second latency)

**Iteration 3 (Performance Optimization):**
- Use Chrome DevTools MCP to profile Discussion feed rendering
- Identify bottlenecks: Is scrolling smooth with 100+ messages?
- Measure memory usage during long games
- Optimize as needed (virtual scrolling, lazy loading)

### Research Limitations

**Areas Requiring Additional Research:**

1. **Mafia Strategy Research (Builder Responsibility):**
   - What are common Mafia deception tactics? (research real game transcripts)
   - What are effective Villager deduction patterns? (research strategy guides)
   - How do experienced players build cases? (inform prompt engineering)

2. **Conversation Quality Research:**
   - What makes multi-agent AI conversation "engaging"? (academic papers?)
   - Are there established metrics for conversation quality? (NLP research?)
   - How do other AI agents handle strategic deception? (competitor analysis?)

3. **Prompt Engineering Best Practices:**
   - What are effective anti-repetition strategies? (Claude documentation)
   - How to balance role instructions with personality? (experimentation needed)
   - Optimal system prompt length? (test 500 vs 1000 vs 2000 tokens)

**Recommendation:** Builder should allocate 2-3 hours for research BEFORE implementing prompts.

---

**Report completed: 2025-10-12**
**Explorer ID:** explorer-3
**Focus Area:** Discussion UI & Testing Strategy
**Status:** COMPLETE - Ready for Planner synthesis
