import { GAME_CONFIG } from '../../core/Config';
import { useGameStore } from '../../ui/store/gameStore';
import { useUiStore } from '../../ui/store/uiStore';
import type { DialogueSystem } from '../dialogue/DialogueSystem';
import type { Player } from '../player/Player';
import type { Interactable } from './Interactable';

export interface InteractionContext {
  player: Player;
  dialogueSystem: DialogueSystem;
  log: (message: string) => void;
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

    const { setInteractionPrompt } = useUiStore.getState();
    if (!interactable) {
      setInteractionPrompt(null);
      return;
    }

    const canInteract = interactable.canInteract(this.context);
    setInteractionPrompt(canInteract ? `Appuyez sur E pour ${interactable.label}` : null);
  }

  tryInteract(): void {
    if (!this.focus) return;
    if (!this.focus.canInteract(this.context)) return;

    this.focus.interact(this.context);
    useGameStore.getState().setInventory(this.context.player.inventory.getAll());
  }

  get maxDistance(): number {
    return GAME_CONFIG.interaction.maxDistance;
  }
}
