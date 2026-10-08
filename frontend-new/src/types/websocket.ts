import { GameState } from './game';

// Backend expects tagged enum format: { type: "BuyCard", card: "Copper" }
export type ClientMessage =
  | { type: 'PlayCard'; card: string }
  | { type: 'PlayTreasure'; card: string }
  | { type: 'PlayAllTreasures' }
  | { type: 'BuyCard'; card: string }
  | { type: 'EndPhase' }
  | { type: 'Resolve'; cards: string[] };

export interface ServerMessage {
  type: 'GameStateUpdate';
  payload: {
    game_state: GameState;
    /** Index of the player this connection controls. */
    viewer: number;
    /** Why the last message was rejected, if it was. */
    error: string | null;
  };
}
