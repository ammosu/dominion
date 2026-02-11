import { GameState } from '../types/game';

/**
 * AITurnController - monitors game state for AI turns.
 * The backend now handles all AI decisions server-side,
 * so this controller only tracks whether it's an AI turn
 * for UI purposes (e.g., showing "AI is thinking..." message).
 */
export class AITurnController {
  checkAndProcessAITurn(_gameState: GameState) {
    // Backend handles AI turns automatically after each human action.
    // No client-side intervention needed.
  }
}
