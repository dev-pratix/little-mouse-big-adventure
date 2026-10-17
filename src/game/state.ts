// Game state: mission progress, pause, completion. Tiny observable store used by React (HUD) and the engine.
export type Phase = "title" | "playing" | "paused" | "complete";

export interface GameState {
  phase: Phase;
  cheese: number;
  total: number;
  restartToken: number;
}

type Listener = () => void;

export function createStore() {
  let state: GameState = { phase: "title", cheese: 0, total: 3, restartToken: 0 };
  const listeners = new Set<Listener>();
  const set = (patch: Partial<GameState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };
  return {
    get: () => state,
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    play: () => set({ phase: "playing" }),
    pause: () => state.phase === "playing" && set({ phase: "paused" }),
    resume: () => state.phase === "paused" && set({ phase: "playing" }),
    restart: () => set({ phase: "playing", cheese: 0, restartToken: state.restartToken + 1 }),
    collect: () => set({ cheese: Math.min(state.total, state.cheese + 1) }),
    complete: () => set({ phase: "complete" }),
  };
}
export type Store = ReturnType<typeof createStore>;
