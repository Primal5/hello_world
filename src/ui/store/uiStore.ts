import { create } from 'zustand';
import { DISPLAY_TEXT } from '../../text/DisplayText';

interface UiState {
  isInventoryOpen: boolean;
  interactionPrompt: string | null;
  eventLog: string[];
  toggleInventory: () => void;
  closeInventory: () => void;
  setInteractionPrompt: (prompt: string | null) => void;
  addLog: (message: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isInventoryOpen: false,
  interactionPrompt: null,
  eventLog: [DISPLAY_TEXT.ui.log.welcome],
  toggleInventory: () => set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),
  closeInventory: () => set({ isInventoryOpen: false }),
  setInteractionPrompt: (interactionPrompt) => set({ interactionPrompt }),
  addLog: (message) =>
    set((state) => ({
      eventLog: [message, ...state.eventLog].slice(0, 8)
    }))
}));
