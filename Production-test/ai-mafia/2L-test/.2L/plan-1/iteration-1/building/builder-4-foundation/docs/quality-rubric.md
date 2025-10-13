# Quality Evaluation Rubric

## Overview

This rubric defines the 7 quality dimensions used to evaluate Discussion phase conversations. A Discussion passes if **5 out of 7 metrics** meet their thresholds.

---

## Metric 1: Memory Accuracy

**Definition:** Percentage of references to past events that are factually accurate.

**Threshold:** ≥80%

**Calculation:**
1. Identify all messages that reference past events:
   - Patterns: "in round X", "last round", "previously", "earlier", "voted for"
2. For each reference, manually verify accuracy against transcript history
3. Score = (accurate references / total references) × 100

**Examples:**

✓ **PASS:** "Agent-Alpha voted for Agent-Bravo in Round 2"
- If transcript shows this vote actually happened → accurate

✗ **FAIL:** "Agent-Charlie defended Agent-Delta last round"
- If transcript shows no such defense → inaccurate

**Edge Cases:**
- If no memory references found → score = 100% (N/A, no references to evaluate)
- Vague references ("someone said...") → mark as inaccurate unless speaker can be identified

---

## Metric 2: Strategic Depth

**Definition:** Percentage of messages that demonstrate strategic thinking with evidence/reasoning.

**Threshold:** ≥60%

**Calculation:**
1. Count messages containing strategic keywords:
   - Evidence-based: "because", "evidence", "pattern", "reason"
   - Strategic: "vote", "suspicious", "innocent", "trust", "defend", "accuse"
   - Analytical: "think", "believe", "consistent", "inconsistent"
2. Score = (strategic messages / total messages) × 100

**Examples:**

✓ **PASS:** "I think Agent-Alpha is suspicious because they defended Agent-Bravo without evidence"
- Contains: "think", "suspicious", "because", "defended", "evidence"

✗ **FAIL:** "I agree with that"
- No strategic keywords, no reasoning

**Manual Override:**
- If message shows deep strategy but lacks keywords → count as strategic
- If message has keywords but is shallow → don't count

---

## Metric 3: Conversation Coherence

**Definition:** Percentage of messages that respond to recent conversation context.

**Threshold:** ≥70%

**Calculation:**
1. For each message after the first:
   - Check if it references previous 3 messages (name mention, topic continuity, explicit reply)
   - Check if it has `inReplyToId` set
2. Score = (coherent messages / total messages) × 100

**Examples:**

✓ **PASS:** "I disagree with Agent-Alpha. Their accusation doesn't match the voting pattern"
- Explicitly references Agent-Alpha (previous speaker)
- Addresses same topic (accusation)

✗ **FAIL:** "Let's analyze the evidence carefully"
- Generic statement, no connection to prior conversation

**Topic Continuity Detection:**
- 2+ shared keywords (length >4 characters) with previous 3 messages
- Example: Previous says "voting pattern", current says "pattern analysis" → coherent

---

## Metric 4: Role Consistency

**Definition:** Percentage of agent behavior that matches their assigned role (Mafia vs Villager).

**Threshold:** ≥80%

**Calculation:**
1. For each message, evaluate if behavior is role-appropriate:

**Mafia Should:**
- Deflect suspicion subtly ("that seems hasty", "let's not jump to conclusions")
- Appear helpful/analytical ("let's look at the evidence")
- Defend allies with reasonable doubt ("I think you're being too harsh on X")
- Avoid direct accusations of fellow Mafia

**Mafia Should NOT:**
- Directly accuse other Mafia
- Be overly aggressive (draws attention)
- Reveal role explicitly

**Villagers Should:**
- Analyze voting patterns ("X and Y voted together")
- Build cases with evidence ("I think X is Mafia because...")
- Question suspects directly ("Why did you vote for Y?")
- Form alliances ("I trust Z's reasoning")

**Villagers Should NOT:**
- Deflect without reason
- Defend suspects without evidence
- Make random accusations

2. Score = (consistent messages / total messages) × 100

**Examples:**

✓ **PASS (Mafia):** "I think you're jumping to conclusions about Agent-Bravo. We don't have solid evidence yet"
- Deflects suspicion, appears reasonable, protects ally

✓ **PASS (Villager):** "Agent-Charlie voted for Agent-Delta without explanation. That's suspicious"
- Analyzes behavior, builds case with evidence

✗ **FAIL (Mafia):** "I think Agent-Echo is definitely Mafia!"
- Too aggressive for Mafia (draws attention)

✗ **FAIL (Villager):** "Let's not be too hasty"
- Deflecting like Mafia, not analytical like Villager

---

## Metric 5: Personality Diversity

**Definition:** Percentage of agents with unique language patterns (not generic/repetitive across all agents).

**Threshold:** ≥50%

**Calculation:**
1. Group all messages by player
2. Concatenate each player's messages into single text
3. For each player, calculate text similarity with all other players (string similarity algorithm)
4. If player's text is <70% similar to all others → unique
5. Score = (unique players / total players) × 100

**Personality Types:**
- **Analytical:** Cites specific evidence, methodical, questions assumptions
- **Aggressive:** Bold accusations, pressures others, prefers action
- **Cautious:** Measured responses, avoids strong claims, observes more than speaks
- **Social:** Friendly, builds alliances, uses "we should work together"
- **Suspicious:** Paranoid, questions everyone's motives, sees patterns everywhere

**Examples:**

✓ **PASS:** Agent-Alpha (analytical) consistently uses "evidence", "data", "pattern analysis"
- Distinct from Agent-Bravo (aggressive) who uses "I accuse", "definitely", "no doubt"

✗ **FAIL:** All agents use similar phrases ("I think", "suspicious", "vote")
- No personality differentiation

**Manual Check:**
- Read 3-5 messages per agent
- Ask: "Could I identify this agent by their language style?"
- If yes for 5+ agents → PASS

---

## Metric 6: Anti-Repetition

**Definition:** Inverse of phrase repetition rate. Measures conversation variety.

**Threshold:** ≥90% (i.e., <10% phrase repetition)

**Calculation:**
1. Extract all 3-word phrases from all messages
2. Count occurrences of each phrase
3. Calculate repetition rate = (repeated phrases / total phrases) × 100
4. Anti-repetition score = 100 - repetition rate

**Examples:**

✓ **PASS:** Phrases like "I think that" appear 2-3 times across 50 messages
- Low repetition, high variety

✗ **FAIL:** Phrase "I think Agent" appears 15 times across 50 messages
- High repetition, robotic

**Common Repetitive Patterns to Avoid:**
- "I think [name] is suspicious" (varies the accusation)
- "Let's look at the evidence" (varies the call to action)
- "I agree with [name]" (varies the agreement)

**Acceptable Repetitions:**
- Role names (Agent-Alpha, Agent-Bravo) - not counted
- Game terms (vote, Mafia, Villager) - expected repetition
- Phrases used by different agents - not counted as repetition

---

## Metric 7: Manual Engagement

**Definition:** Human evaluator's subjective rating of conversation quality on a scale of 1-5.

**Threshold:** ≥3.0

**Rating Scale:**

**1 - Boring:** Robotic, repetitive, no strategic depth, would not watch
- Agents make generic statements
- No meaningful debate or tension
- Conversations don't build toward anything

**2 - Somewhat Interesting:** Shows some strategy, but lacks natural flow or depth
- Some strategic statements, but feel forced
- Limited interaction between agents
- Occasional interesting moments

**3 - Acceptable:** Decent strategy, variety, and flow. Would watch casually
- Clear Mafia deception and Villager deduction
- Conversations reference past events
- Some personality differentiation
- **MINIMUM for Iteration 1 success**

**4 - Engaging:** Strong strategy, natural conversation, compelling to watch
- Heated debates with evidence
- Agents build complex cases
- Personalities shine through
- Would watch actively

**5 - Fascinating:** Would watch as entertainment. Feels like human gameplay
- Surprising strategic moves
- Emotional tension
- Complex social dynamics
- Memorable moments

**Evaluation Questions:**
1. Would you voluntarily watch 3 minutes of this conversation?
2. Did you find yourself curious about who the Mafia are?
3. Did any agent stand out as particularly clever or interesting?
4. Did the conversation flow naturally, or feel scripted?
5. Would you want to watch another game?

**If 4+ questions are "yes" → Score ≥3**

---

## Overall Evaluation

**PASS Criteria:**
- 5 out of 7 metrics must meet thresholds
- Engagement (metric 7) is MANDATORY - if <3.0, overall FAIL regardless of other metrics

**FAIL Criteria:**
- <5 metrics pass
- Engagement <3.0 (critical failure)
- Cost >$3.00 (caching broken, not a quality issue but blocks iteration)

**Edge Case:**
- If 6/7 metrics pass but engagement = 2.5 → FAIL
- If 4/7 metrics pass but engagement = 4.0 → Still FAIL (need 5 metrics)

---

## Iteration Strategy

**Baseline Test:**
1. Run 3 games with initial prompts
2. Calculate metrics for all 3
3. Average scores to establish baseline

**Iteration Cycle:**
1. Identify lowest-scoring metric(s)
2. Make ONE prompt change targeting that metric
3. Run 3 more games
4. Compare average scores to baseline
5. Keep change if improved, revert if not

**Success Criteria:**
- 3 consecutive tests with 5/7 metrics passing
- Engagement consistently ≥3.0
- Cost consistently <$2.00

**Do NOT proceed to Iteration 2 until:**
- 5/7 metrics pass in 3 consecutive tests
- Manual review confirms "fascinating to watch" quality
- Cost validation shows >70% cache hit rate

---

## Troubleshooting Guide

**If Memory Accuracy fails (<80%):**
- Add more game history to context
- Emphasize "cite specific rounds" in prompt
- Reduce context window size (may improve focus)

**If Strategic Depth fails (<60%):**
- Add explicit "build cases with evidence" instruction
- Provide examples of strategic statements in prompt
- Increase temperature for more creative reasoning

**If Coherence fails (<70%):**
- Include last 5-10 messages in context (not just 3)
- Add threading hints in prompt
- Encourage agents to name who they're responding to

**If Role Consistency fails (<80%):**
- Strengthen role-specific strategy sections in prompt
- Add explicit "don't do X" for each role
- Test prompts with manual role-playing first

**If Personality Diversity fails (<50%):**
- Expand personality descriptions (more detailed, unique phrases)
- Assign different personalities to each agent (not random)
- Increase temperature to 0.9 for more variation

**If Anti-Repetition fails (<90%):**
- Add "vary your language" instruction to prompt
- Prune context to last 20-30 messages (reduce echo)
- Shuffle agent turn order between rounds

**If Engagement fails (<3.0):**
- This is the hardest to fix - requires holistic prompt improvement
- Add more dramatic/emotional language options
- Increase strategic tension (higher stakes)
- Review transcripts for patterns of boring statements

---

## Appendix: Example Evaluation

**Test Transcript:** `discussion-1697234567.json`

**Calculated Metrics:**
- Memory Accuracy: 85% (17/20 references accurate) ✓ PASS
- Strategic Depth: 68% (34/50 messages strategic) ✓ PASS
- Coherence: 74% (37/50 messages coherent) ✓ PASS
- Role Consistency: 76% (38/50 role-appropriate) ✗ FAIL (threshold 80%)
- Personality Diversity: 60% (6/10 agents unique) ✓ PASS
- Anti-Repetition: 92% (8% repetition rate) ✓ PASS
- Engagement: 3.5/5.0 (manual evaluation) ✓ PASS

**Result:** 6/7 metrics pass → **OVERALL PASS**

**Recommendation:** Improve role consistency by strengthening Mafia deception tactics in prompt.

---

**Rubric Version:** 1.0
**Last Updated:** January 2025
**Owner:** Builder-4
