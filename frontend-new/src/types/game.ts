export interface GameState {
  current_player: number;
  phase: 'Action' | 'Buy' | 'Cleanup';
  players: Player[];
  supply: Record<string, number>;
  trash: string[];
  log: string[];
  game_over: boolean;
  scores: [string, number][] | null;
}

export interface Player {
  name: string;
  hand: string[];
  deck: string[];
  discard: string[];
  actions: number;
  buys: number;
  coins: number;
  is_ai: boolean;
}
