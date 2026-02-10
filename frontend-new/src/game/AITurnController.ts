import { wsService } from '../services/websocket';
import { GameState } from '../types/game';
import { useGameStore } from '../store/gameStore';

export class AITurnController {
  private processingAI: boolean = false;
  private currentAIPlayerIndex: number | null = null;

  checkAndProcessAITurn(gameState: GameState) {
    const currentPlayer = gameState.players[gameState.current_player];
    const isAIPlayer = currentPlayer.name.includes('Bot') || currentPlayer.name.includes('AI');

    // If it's AI's turn and we're not already processing this specific AI player
    if (isAIPlayer && !this.processingAI) {
      this.currentAIPlayerIndex = gameState.current_player;
      this.processAITurn();
    }

    // If it's no longer AI's turn (switched to human), clear processing flag
    if (!isAIPlayer && this.processingAI) {
      this.processingAI = false;
      this.currentAIPlayerIndex = null;
    }
  }

  private async processAITurn() {
    this.processingAI = true;

    // Wait 1 second before AI acts (so player can see)
    await this.delay(1000);

    // AI automatically advances through phases
    // Backend AI makes all decisions, we just send EndPhase

    // Get latest state from store instead of using stale parameter
    const getCurrentPlayer = () => useGameStore.getState().gameState?.current_player;

    // Keep advancing phases until turn switches to next player
    let attempts = 0;
    const maxAttempts = 10; // Safety limit to prevent infinite loops

    while (attempts < maxAttempts) {
      const currentPlayer = getCurrentPlayer();

      // If turn switched to different player, we're done
      if (currentPlayer !== this.currentAIPlayerIndex) {
        break;
      }

      // Send EndPhase to advance
      wsService.send({ type: 'EndPhase' });

      // Wait for backend to respond
      await this.delay(500);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.warn('AI turn processing hit max attempts limit');
    }

    this.processingAI = false;
    this.currentAIPlayerIndex = null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
