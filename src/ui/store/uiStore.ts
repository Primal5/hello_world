import { create } from 'zustand';

export interface JournalHighlight {
  text: string;
  color: string;
}

export interface UiEventMessage {
  id: number;
  message: string;
  highlights?: JournalHighlight[];
}

export type EventMessageInput = string | Omit<UiEventMessage, 'id'>;

export interface DialogueChoice {
  id: string;
  label: string;
  onSelect: () => void;
}

export interface DialogueBoxState {
  speaker: string;
  message: string;
  highlights?: JournalHighlight[];
  mode: 'acknowledgment' | 'choice';
  confirmLabel?: string;
  choices?: DialogueChoice[];
  onConfirm?: () => void;
}

export interface JournalEntry {
  message: string;
  highlights?: JournalHighlight[];
}

export type JournalEntryInput = string | JournalEntry;

interface UiState {
  isInventoryOpen: boolean;
  isJournalOpen: boolean;
  isPaused: boolean;
  pauseLabel: string | null;
  interactionPrompt: string | null;
  eventMessages: UiEventMessage[];
  journalEntries: JournalEntry[];
  journalRevealTick: number;
  dialogueBox: DialogueBoxState | null;
  toggleInventory: () => void;
  closeInventory: () => void;
  toggleJournal: () => void;
  closeJournal: () => void;
  setPaused: (paused: boolean, label?: string | null) => void;
  setInteractionPrompt: (prompt: string | null) => void;
  pushEventMessage: (entry: EventMessageInput) => number;
  removeEventMessage: (id: number) => void;
  addJournalEntry: (entry: JournalEntryInput) => void;
  openDialogue: (dialogue: DialogueBoxState) => void;
  closeDialogue: () => void;
}

let nextEventId = 1;

function toJournalEntry(entry: JournalEntryInput): JournalEntry {
  return typeof entry === 'string' ? { message: entry } : entry;
}

function toEventMessage(entry: EventMessageInput, id: number): UiEventMessage {
  return typeof entry === 'string' ? { id, message: entry } : { id, ...entry };
}

export const useUiStore = create<UiState>((set) => ({
  isInventoryOpen: false,
  isJournalOpen: false,
  isPaused: false,
  pauseLabel: null,
  interactionPrompt: null,
  eventMessages: [],
  journalEntries: [],
  journalRevealTick: 0,
  dialogueBox: null,
  toggleInventory: () => set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),
  closeInventory: () => set({ isInventoryOpen: false }),
  toggleJournal: () => set((state) => ({ isJournalOpen: !state.isJournalOpen })),
  closeJournal: () => set({ isJournalOpen: false }),
  setPaused: (isPaused, pauseLabel = null) => set({ isPaused, pauseLabel }),
  setInteractionPrompt: (interactionPrompt) => set({ interactionPrompt }),
  pushEventMessage: (entry) => {
    const id = nextEventId++;
    const eventMessage = toEventMessage(entry, id);
    set((state) => ({
      eventMessages: [eventMessage, ...state.eventMessages].slice(0, 4)
    }));
    return id;
  },
  removeEventMessage: (id) =>
    set((state) => ({
      eventMessages: state.eventMessages.filter((entry) => entry.id !== id)
    })),
  addJournalEntry: (entry) => {
    const journalEntry = toJournalEntry(entry);
    set((state) => {
      const existingIndex = state.journalEntries.findIndex((current) => current.message === journalEntry.message);
      if (existingIndex === -1) {
        return {
          journalEntries: [journalEntry, ...state.journalEntries].slice(0, 24),
          journalRevealTick: state.journalRevealTick + 1
        };
      }

      const existingEntry = state.journalEntries[existingIndex];
      if (!journalEntry.highlights || journalEntry.highlights.length === 0) {
        return {
          journalEntries: state.journalEntries
        };
      }

      const nextEntries = [...state.journalEntries];
      nextEntries[existingIndex] = {
        ...existingEntry,
        highlights: journalEntry.highlights
      };

      return {
        journalEntries: nextEntries,
        journalRevealTick: state.journalRevealTick + 1
      };
    });
  },
  openDialogue: (dialogueBox) => set({ dialogueBox }),
  closeDialogue: () => set({ dialogueBox: null })
}));
