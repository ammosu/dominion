// Backend expects tagged enum format: { type: "BuyCard", card: "Copper" }
export type ClientMessage =
  | { type: 'PlayCard'; card: string }
  | { type: 'BuyCard'; card: string }
  | { type: 'EndPhase' }
  | { type: 'PlayCellar'; cards: string[] }
  | { type: 'StartGame'; playerName: string };

export interface AnimationHint {
  type: string;
  from: string;
  to: string;
  card: string;
}

export interface ServerMessage {
  type: string;
  payload: {
    game_state?: unknown;
    animation_hints?: AnimationHint;
  };
}
