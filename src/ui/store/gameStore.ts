import { create } from 'zustand';

export interface CurrencyState {
  gold: number;
  silver: number;
  copper: number;
}

interface GameState {
  inventory: string[];
  currency: CurrencyState;
  health: number;
  maxHealth: number;
  compassHeading: number;
  isCrouching: boolean;
  isJumping: boolean;
  isSprinting: boolean;
  setInventory: (ids: string[]) => void;
  setCurrency: (currency: CurrencyState) => void;
  setHealth: (health: number) => void;
  setMaxHealth: (maxHealth: number) => void;
  setCompassHeading: (heading: number) => void;
  setIsCrouching: (isCrouching: boolean) => void;
  setIsJumping: (isJumping: boolean) => void;
  setIsSprinting: (isSprinting: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  inventory: [],
  currency: {
    gold: 0,
    silver: 0,
    copper: 0
  },
  health: 100,
  maxHealth: 100,
  compassHeading: 0,
  isCrouching: false,
  isJumping: false,
  isSprinting: false,
  setInventory: (inventory) => set({ inventory }),
  setCurrency: (currency) => set({ currency }),
  setHealth: (health) => set({ health }),
  setMaxHealth: (maxHealth) =>
    set((state) => ({
      maxHealth,
      health: Math.min(state.health, maxHealth)
    })),
  setCompassHeading: (compassHeading) => set({ compassHeading }),
  setIsCrouching: (isCrouching) => set({ isCrouching }),
  setIsJumping: (isJumping) => set({ isJumping }),
  setIsSprinting: (isSprinting) => set({ isSprinting })
}));
