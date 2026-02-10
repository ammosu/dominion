import { wsService } from '../services/websocket';
import { GameState } from '../types/game';

export class AITurnController {
  private processingAI: boolean = false;

  checkAndProcessAITurn(gameState: GameState) {
    const currentPlayer = gameState.players[gameState.current_player];

    if (currentPlayer.name.includes('Bot') || currentPlayer.name.includes('AI')) {
      if (!this.processingAI) {
        this.processAITurn(gameState);
      }
    }
  }

  private async processAITurn(gameState: GameState) {
    this.processingAI = true;

    // Wait 1 second before AI acts (so player can see)
    await this.delay(1000);

    // AI automatically plays all cards, then buys, then ends turn
    // This is placeholder - backend AI already makes decisions
    // Just send EndPhase to let backend AI continue

    while (gameState.phase !== 'Cleanup') {
      wsService.send({ type: 'EndPhase' });
      await this.delay(500);
    }

    this.processingAI = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
