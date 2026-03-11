import { create } from 'zustand';

interface GameState {
  inventory: string[];
  setInventory: (ids: string[]) => void;
}

export const useGameStore = create<GameState>((set) => ({
  inventory: [],
  setInventory: (inventory) => set({ inventory })
}));
