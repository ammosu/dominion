export interface ClientMessage {
  type: 'PlayCard' | 'BuyCard' | 'EndPhase' | 'PlayCellar';
  payload?: Record<string, unknown>;
}

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
