/**
 * Discussion Phase Orchestrator - Main Exports
 *
 * Provides complete discussion orchestration system
 * for AI Mafia game Discussion phase.
 */

// Main orchestrator
export { runDiscussion, testOrchestrator } from './orchestrator';

// Turn scheduling
export {
  createTurnSchedule,
  getNextPlayer,
  advanceToNextTurn,
  shouldContinue,
  getRemainingTime,
  getElapsedTime,
  getProgress,
  getScheduleStats,
  shuffleArray,
  sleep,
} from './turn-scheduler';

// Turn execution
export { executeTurn } from './turn-executor';

// Threading inference
export {
  determineReplyTarget,
  extractAccusationTargets,
  calculateThreadingStats,
} from './threading';

// Types
export type {
  TurnSchedule,
  TurnResult,
  DiscussionConfig,
  DiscussionResult,
} from './types';
