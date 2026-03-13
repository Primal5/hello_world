import { create } from 'zustand';
import { DISPLAY_TEXT } from '../../text/DisplayText';

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
  interactionPrompt: string | null;
  eventMessages: UiEventMessage[];
  journalEntries: JournalEntry[];
  dialogueBox: DialogueBoxState | null;
  toggleInventory: () => void;
  closeInventory: () => void;
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
  interactionPrompt: null,
  eventMessages: [],
  journalEntries: [toJournalEntry(DISPLAY_TEXT.ui.log.welcome)],
  dialogueBox: null,
  toggleInventory: () => set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),
  closeInventory: () => set({ isInventoryOpen: false }),
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
    set((state) => ({
      journalEntries: state.journalEntries.some((current) => current.message === journalEntry.message)
        ? state.journalEntries
        : [journalEntry, ...state.journalEntries].slice(0, 24)
    }));
  },
  openDialogue: (dialogueBox) => set({ dialogueBox }),
  closeDialogue: () => set({ dialogueBox: null })
}));