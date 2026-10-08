// Mirrors the backend's serialized GameState (crates/shared).

export type GainDestination = 'Discard' | 'Hand' | 'DeckTop';

export type Purpose =
  | { kind: 'DiscardToDraw' }
  | { kind: 'TrashFromHand' }
  | { kind: 'TopdeckFromDiscard' }
  | { kind: 'PlayDiscarded' }
  | { kind: 'Gain'; max_cost: number; destination: GainDestination }
  | { kind: 'TopdeckVictory' }
  | { kind: 'DiscardDownTo'; keep: number }
  | { kind: 'TrashCopper' }
  | { kind: 'DiscardPerEmptyPile' }
  | { kind: 'TrashToRemodel' }
  | { kind: 'TrashTreasureToMine' }
  | { kind: 'PlayTwice' }
  | { kind: 'TrashRevealedTreasure'; revealed: string[] }
  | { kind: 'SetAside' }
  | { kind: 'SentryTrash' }
  | { kind: 'SentryDiscard' }
  | { kind: 'SentryTopCard' }
  | { kind: 'TopdeckFromHand' };

/** A choice a player must make; answer with a sub-multiset of `options`. */
export interface Decision {
  player: number;
  source: string;
  purpose: Purpose;
  options: string[];
  min: number;
  max: number;
}

export interface TurnState {
  merchants_played: number;
  silver_played: boolean;
  has_bought: boolean;
}

export interface GameState {
  current_player: number;
  phase: 'Action' | 'Buy';
  players: Player[];
  supply: Record<string, number>;
  kingdom: string[];
  turn: TurnState;
  trash: string[];
  pending_decision: Decision | null;
  log: string[];
  game_over: boolean;
  scores: [string, number][] | null;
  winners: string[];
}

export interface Player {
  name: string;
  hand: string[];
  deck: string[];
  discard: string[];
  in_play: string[];
  set_aside: string[];
  actions: number;
  buys: number;
  coins: number;
  turns_taken: number;
  is_ai: boolean;
}
