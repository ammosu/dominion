import { create } from 'zustand';
import { Decision, GameState, Player } from '../types/game';

interface GameStore {
  gameState: GameState | null;
  /** Index of the player this client controls. */
  viewer: number;
  setGameState: (state: GameState, viewer: number) => void;
  /** Player whose turn it is. */
  currentPlayer: Player | null;
  /** Player this client controls (whose hand is shown). */
  viewerPlayer: Player | null;
  /** Decision this client must answer, if any. */
  myDecision: Decision | null;
  /** True when it is our turn and nothing is waiting on a decision. */
  canAct: boolean;
  isGameOver: boolean;
  finalScores: { name: string; score: number }[] | null;
  winners: string[];
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  viewer: 0,
  currentPlayer: null,
  viewerPlayer: null,
  myDecision: null,
  canAct: false,
  isGameOver: false,
  finalScores: null,
  winners: [],

  setGameState: (state, viewer) => {
    const decision = state.pending_decision;
    set({
      gameState: state,
      viewer,
      currentPlayer: state.players[state.current_player] ?? null,
      viewerPlayer: state.players[viewer] ?? null,
      myDecision: decision && decision.player === viewer ? decision : null,
      canAct: !state.game_over && !decision && state.current_player === viewer,
      isGameOver: state.game_over && !!state.scores,
      finalScores: state.scores?.map(([name, score]) => ({ name, score })) ?? null,
      winners: state.winners,
    });
  },
}));
