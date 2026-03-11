import { create } from 'zustand';

interface UiState {
  isInventoryOpen: boolean;
  interactionPrompt: string | null;
  eventLog: string[];
  toggleInventory: () => void;
  setInteractionPrompt: (prompt: string | null) => void;
  addLog: (message: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isInventoryOpen: false,
  interactionPrompt: null,
  eventLog: ['Bienvenue dans la démo FPS/RPG.'],
  toggleInventory: () => set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),
  setInteractionPrompt: (interactionPrompt) => set({ interactionPrompt }),
  addLog: (message) =>
    set((state) => ({
      eventLog: [message, ...state.eventLog].slice(0, 8)
    }))
}));
