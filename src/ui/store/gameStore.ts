import { create } from 'zustand';

interface GameState {
  inventory: string[];
  health: number;
  maxHealth: number;
  compassHeading: number;
  setInventory: (ids: string[]) => void;
  setHealth: (health: number) => void;
  setMaxHealth: (maxHealth: number) => void;
  setCompassHeading: (heading: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  inventory: [],
  health: 100,
  maxHealth: 100,
  compassHeading: 0,
  setInventory: (inventory) => set({ inventory }),
  setHealth: (health) => set({ health }),
  setMaxHealth: (maxHealth) =>
    set((state) => ({
      maxHealth,
      health: Math.min(state.health, maxHealth)
    })),
  setCompassHeading: (compassHeading) => set({ compassHeading })
}));