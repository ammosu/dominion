import { create } from 'zustand';

export interface Banner {
  id: number;
  /** The player whose turn starts. */
  player: number;
  turn: number;
}

interface FxStore {
  /** Replaying another player's moves: the table waits (a tap skips ahead). */
  busy: boolean;
  /** Whose move is being shown, while busy. */
  actor: number | null;
  banner: Banner | null;
  set: (patch: Partial<Omit<FxStore, 'set'>>) => void;
}

export const useFxStore = create<FxStore>((set) => ({
  busy: false,
  actor: null,
  banner: null,
  set: (patch) => set(patch),
}));
