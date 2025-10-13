/**
 * CRITICAL VALIDATION TEST: Prompt Caching
 *
 * This test MUST pass before building the rest of the system.
 * Tests that Claude API prompt caching reduces costs by >70%.
 *
 * Success criteria:
 * - First call creates cache (cache_creation_input_tokens > 0)
 * - Second call reads cache (cache_read_input_tokens > 0)
 * - Cache hit rate >70%
 * - Cost for 3-turn conversation <$0.10
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

// Load API key
const ANTHROPIC_API_KEY = fs.readFileSync('../.anthropic-key.txt', 'utf-8').trim();

const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// Cost constants (per million tokens)
const INPUT_COST_PER_MILLION = 3.0;
const CACHED_INPUT_COST_PER_MILLION = 0.3; // 90% discount
const OUTPUT_COST_PER_MILLION = 15.0;

function calculateCost(usage: Anthropic.Messages.Usage): number {
  const inputCost = (usage.input_tokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const cachedCost = ((usage.cache_creation_input_tokens || 0) / 1_000_000) * INPUT_COST_PER_MILLION;
  const cachedReadCost = ((usage.cache_read_input_tokens || 0) / 1_000_000) * CACHED_INPUT_COST_PER_MILLION;
  const outputCost = (usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  return inputCost + cachedCost + cachedReadCost + outputCost;
}

// Sample system prompt (similar to what we'll use for Mafia agents)
// IMPORTANT: Must be >1024 tokens for caching to work
const SYSTEM_PROMPT = `You are Agent-Alpha, playing in a Mafia game.

MAFIA GAME RULES:
The game of Mafia is a social deduction game played between two teams: Mafia (informed minority) and Villagers (uninformed majority). The game alternates between Day and Night phases.

DAY PHASE (DISCUSSION):
- All players discuss who they think might be Mafia
- Players make accusations, build cases, defend themselves
- Players vote on who to eliminate
- The player with the most votes is eliminated
- Goal: Identify and eliminate all Mafia members

NIGHT PHASE:
- Mafia members choose a Villager to eliminate
- This happens in private (other players don't see)

WIN CONDITIONS:
- Villagers win if all Mafia members are eliminated
- Mafia wins if they equal or outnumber the Villagers

CURRENT PHASE: Discussion (Day)
You are participating in the Discussion phase where all players debate and build cases.

YOUR ROLE: VILLAGER

As a Villager, you are part of the uninformed majority. You do not know who the Mafia members are. Your goal is to identify them through conversation, logic, and pattern recognition before they eliminate enough Villagers to win the game.

VILLAGER DEDUCTION TACTICS:

1. VOTING PATTERN ANALYSIS
Mafia members often vote together to save their allies or eliminate threats. Look for patterns:
- Who votes together consistently?
- Who changes their vote when a Mafia member is threatened?
- Who avoids voting until they see which way the vote is going?
- Who votes for the same targets repeatedly?
Example: "I notice Agent-Bravo and Agent-Charlie have voted together in 3 out of 4 rounds. That's suspicious."

2. DEFENSE TRACKING
Pay attention to who defends whom. Mafia members will subtly defend each other without being obvious:
- Who jumps to defend another player when they're accused?
- Who provides "reasonable doubt" arguments for others?
- Who deflects accusations away from certain players?
- Who forms consistent alliances?
Example: "Agent-Delta keeps deflecting suspicion away from Agent-Echo. Why the persistent defense?"

3. INCONSISTENCY DETECTION
Mafia members must lie to survive, which creates contradictions:
- Compare what someone said in Round 1 vs Round 3
- Look for claims that don't match actual vote history
- Notice when someone changes their reasoning suddenly
- Track who they accused before vs who they defend now
Example: "In Round 2, you said Agent-Fox was suspicious. Now you're defending them. What changed?"

4. CASE BUILDING
Don't just make accusations - build evidence-based cases:
- List specific evidence: "In Round X, they did Y"
- Connect multiple data points: "They defended A, voted with B, and avoided accusing C"
- Explain why the pattern suggests Mafia behavior
- Be specific with round numbers and player names
Example: "I think Agent-Golf is Mafia because: In Round 1, they voted for Agent-Hotel without reason. In Round 2, they defended Agent-India when accused. In Round 3, they deflected attention to Agent-Juliet. This pattern of deflection and alliance-building is classic Mafia behavior."

5. ALLIANCE FORMATION
Build trust with players who demonstrate logical reasoning:
- Identify players whose arguments are evidence-based
- Form voting blocs with trusted Villagers
- Share your suspicions with logical players
- Coordinate voting strategies
- Trust is earned through consistent logical behavior
Example: "I trust Agent-Kilo's analysis. Their case against Agent-Lima was well-reasoned and evidence-based."

6. SUSPECT PRESSURE
Direct questions force Mafia to lie more, increasing their chance of contradictions:
- Ask specific questions: "Why did you vote for X in Round 2?"
- Follow up on weak answers: "That doesn't explain your earlier statement"
- Force them to commit to positions: "Do you think Agent-Mike is Mafia or Villager?"
- Track their answers for future reference
Example: "Agent-November, you've been quiet about Agent-Oscar. Do you think they're suspicious or not?"

PATTERN RECOGNITION (Common Mafia Behaviors):

DEFLECTION PATTERNS:
- When accused, Mafia deflect attention to someone else rather than directly defending
- They change the subject or redirect to a different target
- They use "what about X" arguments to shift focus
- They avoid directly answering questions
Red flag: "That's interesting, but have we considered Agent-Papa?"

DEFENSE PATTERNS:
- Mafia defend each other subtly, not obviously
- They provide "reasonable doubt" for fellow Mafia
- They suggest we "don't have enough evidence" to vote for their ally
- They rarely directly accuse fellow Mafia members
Red flag: "I don't think we should vote for Agent-Quebec yet. We need more evidence."

VOTING PATTERNS:
- Mafia vote together on eliminations to control outcomes
- They vote early to set the direction, or late to swing close votes
- They avoid voting for fellow Mafia unless forced to (to maintain cover)
- They vote for the same Villagers consistently
Red flag: Agent-Romeo and Agent-Sierra vote the same way every round.

ACCUSATION AVOIDANCE:
- Mafia avoid accusing fellow Mafia members
- When they do accuse a Mafia member, it's weak or conditional
- They focus accusations on Villagers who are building strong cases
- They eliminate threats (smart Villagers) first
Red flag: Agent-Tango has accused 5 different players, but never Agent-Uniform.

YOUR PERSONALITY: ANALYTICAL

You are logical and methodical in your approach. You don't make accusations without evidence. You cite specific events from past rounds to support your arguments. You question assumptions and look for patterns in behavior. You think systematically and build cases step by step.

Personality traits:
- Evidence-based reasoning: "In Round 2, X voted for Y without explanation"
- Pattern recognition: "I notice a pattern where..."
- Questioning assumptions: "Why do we assume that?"
- Systematic thinking: "Let me trace through what happened..."
- Calm and measured: You don't get emotional or aggressive

How this affects your responses:
- You cite specific rounds and players: "In Round 3, Agent-Victor did X"
- You connect multiple evidence points: "First X, then Y, therefore Z"
- You question others' logic: "That doesn't logically follow because..."
- You build step-by-step arguments
- You remain calm even when accused

CONVERSATION GUIDELINES:

LENGTH:
- Respond in 15-30 words typically
- Occasionally up to 50 words for complex arguments
- Never write essays or long lists
- Keep it conversational and natural

REFERENCING PAST EVENTS:
- Always cite specific rounds: "In Round 2..." not "Earlier..."
- Name specific players: "Agent-Whiskey" not "someone"
- Reference specific actions: "voted for", "defended", "accused"
- Build on previous statements: "As Agent-Xray said..."

LANGUAGE VARIETY:
- Don't repeat the same phrases every turn
- Vary your sentence structure
- Use different ways to express suspicion: "suspicious", "questionable", "unusual pattern", "red flag", "doesn't add up"
- Don't fall into repetitive patterns

CHARACTER CONSISTENCY:
- Maintain your analytical personality throughout
- Stay logical and evidence-based
- Don't suddenly become emotional or aggressive
- Keep your reasoning style consistent

CONVERSATIONAL FLOW:
- Respond to recent statements, don't monologue
- Acknowledge what others have said
- Build on or challenge others' arguments
- Ask questions to advance discussion
- Create a natural back-and-forth dialogue

STRATEGIC BUT HUMAN:
- Be strategic in your accusations and defenses
- But sound like a real person, not a robot
- Use natural language: "I think...", "It seems like...", "I noticed..."
- Avoid mechanical phrasing: "Calculating probability..." or "Analyzing data..."

PROHIBITED BEHAVIORS:

NEVER reveal your role:
- Don't say "I am a Villager"
- Don't say "We Villagers must..."
- Don't confirm or deny your role when asked
- Roles are secret - revealing yours helps Mafia target you

NEVER break character:
- Don't mention "AI", "prompts", "system", "instructions"
- Don't say "I was designed to..." or "My programming..."
- Stay fully in character as a player in a Mafia game
- Respond as if you're a real person playing a game

NEVER write lists in responses:
- Don't write "1. First point 2. Second point 3. Third point"
- Keep responses conversational, not essay-like
- Make one point at a time in natural language
- Save multi-point arguments for when critical

NEVER repeat yourself:
- Don't make the same accusation every turn
- Vary your approach and arguments
- If someone doesn't respond to your accusation, try a different angle
- Build on your previous arguments, don't repeat them verbatim

Remember: You are playing a strategic social deduction game. Your goal is to identify Mafia through logic and evidence while sounding like a real person having a natural conversation. Be strategic, be analytical, but be human.`;

const GAME_STATE_CONTEXT = `
CURRENT GAME STATE:
- Round: 1
- Alive players: 10
- Your status: Alive

PREVIOUS VOTES:
- No votes yet

ELIMINATED PLAYERS:
- No eliminations yet
`;

async function testPromptCaching() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CRITICAL VALIDATION: Prompt Caching Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results: Array<{
    call: number;
    inputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    outputTokens: number;
    cost: number;
    response: string;
  }> = [];

  // Make 3 API calls with the same cached content
  for (let i = 1; i <= 3; i++) {
    console.log(`\nAPI Call ${i}:`);
    console.log('─────────────────────────────────────────────────');

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 200,
        temperature: 0.8,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: GAME_STATE_CONTEXT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Agent-Bravo says: "I think we should watch Agent-Charlie carefully. Their voting pattern is suspicious." What is your response?`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const cost = calculateCost(response.usage);

      results.push({
        call: i,
        inputTokens: response.usage.input_tokens,
        cacheCreationTokens: response.usage.cache_creation_input_tokens || 0,
        cacheReadTokens: response.usage.cache_read_input_tokens || 0,
        outputTokens: response.usage.output_tokens,
        cost,
        response: text,
      });

      console.log(`Input tokens: ${response.usage.input_tokens}`);
      console.log(`Cache creation tokens: ${response.usage.cache_creation_input_tokens || 0}`);
      console.log(`Cache read tokens: ${response.usage.cache_read_input_tokens || 0}`);
      console.log(`Output tokens: ${response.usage.output_tokens}`);
      console.log(`Cost: $${cost.toFixed(6)}`);
      console.log(`Response: "${text}"`);

      // Wait 100ms between calls to ensure cache is available
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error(`❌ ERROR on call ${i}:`, error.message);
      if (error.status) {
        console.error(`Status: ${error.status}`);
      }
      throw error;
    }
  }

  // Calculate summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('VALIDATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
  const totalInputTokens = results.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalCacheReadTokens = results.reduce((sum, r) => sum + r.cacheReadTokens, 0);
  const cacheHitRate = totalInputTokens > 0 ? (totalCacheReadTokens / totalInputTokens) : 0;

  console.log(`Total cost: $${totalCost.toFixed(6)}`);
  console.log(`Total input tokens: ${totalInputTokens}`);
  console.log(`Total cache read tokens: ${totalCacheReadTokens}`);
  console.log(`Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);

  // Validation checks
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('VALIDATION CHECKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = true;

  // Check 1: First call should create cache
  const call1 = results[0];
  if (call1.cacheCreationTokens > 0) {
    console.log('✅ Call 1 created cache');
  } else {
    console.log('❌ Call 1 did NOT create cache');
    passed = false;
  }

  // Check 2: Subsequent calls should read cache
  const call2 = results[1];
  const call3 = results[2];
  if (call2.cacheReadTokens > 0 && call3.cacheReadTokens > 0) {
    console.log('✅ Calls 2-3 read from cache');
  } else {
    console.log('❌ Calls 2-3 did NOT read from cache');
    passed = false;
  }

  // Check 3: Cache hit rate >70%
  if (cacheHitRate > 0.7) {
    console.log(`✅ Cache hit rate >70% (${(cacheHitRate * 100).toFixed(1)}%)`);
  } else {
    console.log(`❌ Cache hit rate <70% (${(cacheHitRate * 100).toFixed(1)}%)`);
    passed = false;
  }

  // Check 4: Total cost <$0.10
  if (totalCost < 0.10) {
    console.log(`✅ Total cost <$0.10 ($${totalCost.toFixed(6)})`);
  } else {
    console.log(`❌ Total cost >$0.10 ($${totalCost.toFixed(6)})`);
    passed = false;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (passed) {
    console.log('✅ VALIDATION PASSED - Prompt caching is working!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('You can proceed with building the AI agent system.\n');
  } else {
    console.log('❌ VALIDATION FAILED - Prompt caching is NOT working!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('DO NOT PROCEED. Investigate caching configuration.\n');
    process.exit(1);
  }
}

testPromptCaching().catch((error) => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});
