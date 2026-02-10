export interface GameState {
  current_player: number;
  phase: 'Action' | 'Buy' | 'Cleanup';
  players: Player[];
  supply: Record<string, number>;
  log: string[];
}

export interface Player {
  name: string;
  hand: string[];
  deck_size: number;
  discard_size: number;
  actions: number;
  buys: number;
  coins: number;
}
