// Mirrors crates/shared/src/event.rs: what one message did, in order.

export type Zone = 'Hand' | 'Deck' | 'Discard' | 'InPlay';

export type GameEvent =
  | { kind: 'Play'; player: number; cards: string[]; from: Zone }
  | { kind: 'Shuffle'; player: number }
  | { kind: 'Draw'; player: number; count: number }
  | { kind: 'Buy'; player: number; card: string }
  | { kind: 'Gain'; player: number; card: string; to: Zone }
  | { kind: 'Discard'; player: number; cards: string[]; from: Zone }
  | { kind: 'Trash'; player: number; cards: string[]; from: Zone }
  | { kind: 'Topdeck'; player: number; cards: string[]; from: Zone }
  | { kind: 'Attack'; player: number; card: string; target: number }
  | { kind: 'Blocked'; player: number; card: string }
  | { kind: 'Cleanup'; player: number }
  | { kind: 'TurnStart'; player: number }
  | { kind: 'GameOver' };
