import { GAME_CONFIG } from '../../core/Config';
import { useGameStore } from '../../ui/store/gameStore';
import {
  useUiStore,
  type DialogueChoice,
  type EventMessageInput,
  type JournalEntryInput,
  type JournalHighlight
} from '../../ui/store/uiStore';
import { DISPLAY_TEXT } from '../../text/DisplayText';
import type { DialogueSystem } from '../dialogue/DialogueSystem';
import type { Player } from '../player/Player';
import type { Interactable } from './Interactable';

export interface InteractionContext {
  player: Player;
  dialogueSystem: DialogueSystem;
  event: (entry: EventMessageInput) => void;
  journal: (entry: JournalEntryInput) => void;
  acknowledge: (
    speaker: string,
    message: string,
    onConfirm?: () => void,
    highlights?: JournalHighlight[]
  ) => void;
  choose: (
    speaker: string,
    message: string,
    choices: DialogueChoice[],
    highlights?: JournalHighlight[]
  ) => void;
}

export class InteractionSystem {
  private focus: Interactable | null = null;

  constructor(
    private readonly _interactables: Interactable[],
    private readonly context: InteractionContext
  ) {}

  get interactables(): Interactable[] {
    return this._interactables;
  }

  setFocused(interactable: Interactable | null): void {
    this.focus = interactable;

    const uiState = useUiStore.getState();
    const { setInteractionPrompt } = uiState;
    if (!interactable || uiState.dialogueBox || uiState.isInventoryOpen || uiState.isJournalOpen || uiState.isPaused) {
      setInteractionPrompt(null);
      return;
    }

    const canInteract = interactable.canInteract(this.context);
    const label = typeof interactable.label === 'function'
      ? interactable.label(this.context)
      : interactable.label;
    setInteractionPrompt(canInteract ? DISPLAY_TEXT.ui.prompt.interact(label) : null);
  }

  tryInteract(): void {
    if (useUiStore.getState().dialogueBox) {
      return;
    }

    const uiState = useUiStore.getState();
    if (uiState.isInventoryOpen || uiState.isJournalOpen || uiState.isPaused) {
      return;
    }

    if (!this.focus) return;
    if (!this.focus.canInteract(this.context)) return;

    this.focus.interact(this.context);
    useGameStore.getState().setInventory(this.context.player.inventory.getAll());
  }

  get maxDistance(): number {
    return GAME_CONFIG.interaction.maxDistance;
  }
}
