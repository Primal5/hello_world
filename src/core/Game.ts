import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { CollisionWorld } from '../engine/CollisionWorld';
import { FirstPersonController } from '../engine/FirstPersonController';
import { LevelLoader } from '../engine/LevelLoader';
import { RaycastInteractor } from '../engine/RaycastInteractor';
import { Renderer } from '../engine/Renderer';
import { World } from '../engine/World';
import { Player } from '../gameplay/player/Player';
import { InteractionSystem } from '../gameplay/interaction/InteractionSystem';
import { ItemDatabase } from '../gameplay/items/ItemDatabase';
import { DialogueSystem } from '../gameplay/dialogue/DialogueSystem';
import { useGameStore } from '../ui/store/gameStore';
import {
  useUiStore,
  type DialogueChoice,
  type EventMessageInput,
  type JournalEntryInput,
  type JournalHighlight
} from '../ui/store/uiStore';
import { AssetLoader } from '../engine/AssetLoader';
import { DUNGEON_CONFIG } from '../engine/DungeonGenerator';
import { DISPLAY_TEXT } from '../text/DisplayText';
import { addInventoryCloseRequestListener, removeInventoryCloseRequestListener } from '../ui/inventory/inventoryEvents';
import { addJournalCloseRequestListener, removeJournalCloseRequestListener } from '../ui/hud/journalEvents';
import { PauseController } from './PauseController';

const HEALTH_REGEN_AMOUNT = 1;
const HEALTH_REGEN_INTERVAL_SECONDS = 2;

export class Game {
  private readonly renderer: Renderer;
  private readonly world: World;
  private readonly input = new InputManager();
  private readonly player = new Player(DUNGEON_CONFIG.startPosition);
  private readonly collisionWorld = new CollisionWorld();
  private readonly loop: GameLoop;
  private readonly pauseController = new PauseController();
  private readonly raycastInteractor = new RaycastInteractor();
  private readonly eventTimers = new Map<number, number>();
  private controller: FirstPersonController;
  private interactionSystem?: InteractionSystem;
  private levelLoader?: LevelLoader;
  private northYaw = 0;
  private healthRegenElapsed = 0;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.world = new World(container.clientWidth / container.clientHeight);
    this.controller = new FirstPersonController(
      this.world.camera,
      this.player,
      this.input,
      this.collisionWorld,
      this.renderer.instance.domElement,
      DUNGEON_CONFIG.startYaw
    );
    this.loop = new GameLoop((delta) => this.update(delta));
  }

  async init(): Promise<void> {
    const itemDb = new ItemDatabase();
    const dialogueSystem = new DialogueSystem();
    const levelLoader = new LevelLoader(
      this.world.scene,
      new AssetLoader(this.renderer.instance.capabilities.getMaxAnisotropy()),
      itemDb,
      dialogueSystem,
      this.collisionWorld
    );

    this.levelLoader = levelLoader;

    const context = {
      player: this.player,
      dialogueSystem,
      event: (entry: EventMessageInput) => {
        const store = useUiStore.getState();
        const id = store.pushEventMessage(entry);
        const timer = window.setTimeout(() => {
          useUiStore.getState().removeEventMessage(id);
          this.eventTimers.delete(id);
        }, 3200);
        this.eventTimers.set(id, timer);
      },
      journal: (entry: JournalEntryInput) => useUiStore.getState().addJournalEntry(entry),
      acknowledge: (
        speaker: string,
        message: string,
        onConfirm?: () => void,
        highlights?: JournalHighlight[]
      ) => {
        this.input.clear();
        this.controller.exitPointerLock();
        useUiStore.getState().openDialogue({
          speaker,
          message,
          highlights,
          mode: 'acknowledgment',
          confirmLabel: DISPLAY_TEXT.ui.prompt.acknowledgeLabel,
          onConfirm: () => {
            onConfirm?.();
            queueMicrotask(() => {
              const uiState = useUiStore.getState();
              if (!uiState.dialogueBox && !uiState.isInventoryOpen && !uiState.isJournalOpen) {
                this.controller.requestPointerLock();
              }
            });
          }
        });
      },
      choose: (
        speaker: string,
        message: string,
        choices: DialogueChoice[],
        highlights?: JournalHighlight[]
      ) => {
        this.input.clear();
        this.controller.exitPointerLock();
        useUiStore.getState().openDialogue({
          speaker,
          message,
          highlights,
          mode: 'choice',
          choices: choices.map((choice) => ({
            ...choice,
            onSelect: () => {
              choice.onSelect();
              queueMicrotask(() => {
                const uiState = useUiStore.getState();
                if (!uiState.dialogueBox && !uiState.isInventoryOpen && !uiState.isJournalOpen) {
                  this.controller.requestPointerLock();
                }
              });
            }
          }))
        });
      }
    };

    const interactables = await levelLoader.load(context);
    this.interactionSystem = new InteractionSystem(interactables, context);

    useGameStore.getState().setInventory(this.player.inventory.getAll());
    useGameStore.getState().setMaxHealth(this.player.stats.maxHealth);
    useGameStore.getState().setHealth(this.player.stats.health);
    this.northYaw = this.world.camera.rotation.y;
    useGameStore.getState().setCompassHeading(0);
    useUiStore.getState().addJournalEntry(DISPLAY_TEXT.ui.log.welcome);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    addInventoryCloseRequestListener(this.onInventoryCloseRequested);
    addJournalCloseRequestListener(this.onJournalCloseRequested);
    this.player.isGrounded = true;
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.controller.dispose();
    this.renderer.dispose();
    for (const timer of this.eventTimers.values()) {
      window.clearTimeout(timer);
    }
    this.eventTimers.clear();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    removeInventoryCloseRequestListener(this.onInventoryCloseRequested);
    removeJournalCloseRequestListener(this.onJournalCloseRequested);
  }

  private update(delta: number): void {
    const uiState = useUiStore.getState();
    const dialogueBox = uiState.dialogueBox;
    const isDialogueOpen = Boolean(dialogueBox);
    const isInventoryOpen = uiState.isInventoryOpen;
    const isJournalOpen = uiState.isJournalOpen;
    const isUiBlocking = isDialogueOpen || isInventoryOpen || isJournalOpen;
    const isGamePaused = uiState.isPaused;

    if (!isUiBlocking && !isGamePaused) {
      this.controller.update(delta);
    } else {
      this.interactionSystem?.setFocused(null);
    }

    if (isGamePaused) {
      return;
    }

    this.regenerateHealth(delta);
    this.levelLoader?.update(delta);

    if (this.interactionSystem && !isUiBlocking) {
      const focused = this.raycastInteractor.pick(
        this.world.camera,
        this.world.scene,
        this.interactionSystem.interactables,
        this.interactionSystem.maxDistance
      );
      this.interactionSystem.setFocused(focused);
    }

    const heading = THREE.MathUtils.euclideanModulo(
      THREE.MathUtils.radToDeg(this.northYaw - this.world.camera.rotation.y),
      360
    );
    useGameStore.getState().setCompassHeading(heading);

    this.renderer.render(this.world.scene, this.world.camera);
  }

  private regenerateHealth(delta: number): void {
    const missingHealth = this.player.stats.maxHealth - this.player.stats.health;
    if (missingHealth <= 0) {
      this.healthRegenElapsed = 0;
      return;
    }

    this.healthRegenElapsed += delta;
    const restoredTicks = Math.min(
      Math.floor(this.healthRegenElapsed / HEALTH_REGEN_INTERVAL_SECONDS),
      Math.ceil(missingHealth / HEALTH_REGEN_AMOUNT)
    );

    if (restoredTicks <= 0) {
      return;
    }

    this.healthRegenElapsed -= restoredTicks * HEALTH_REGEN_INTERVAL_SECONDS;
    this.player.stats.health = Math.min(
      this.player.stats.health + restoredTicks * HEALTH_REGEN_AMOUNT,
      this.player.stats.maxHealth
    );
    useGameStore.getState().setHealth(this.player.stats.health);
  }

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.resize(width, height);
    this.world.resize(width / height);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    const uiState = useUiStore.getState();
    const dialogueBox = uiState.dialogueBox;
    if (dialogueBox?.mode === 'acknowledgment' && event.code === DISPLAY_TEXT.ui.prompt.acknowledgeKeyCode) {
      event.preventDefault();
      dialogueBox.onConfirm?.();
      useUiStore.getState().closeDialogue();
      return;
    }

    if (event.code === 'KeyE') {
      if (uiState.isInventoryOpen || uiState.isJournalOpen || uiState.isPaused) {
        return;
      }

      this.interactionSystem?.tryInteract();
      return;
    }

    if (DISPLAY_TEXT.ui.pause.toggleKeyCodes.some((code) => code === event.code)) {
      event.preventDefault();
      if (dialogueBox || uiState.isInventoryOpen || uiState.isJournalOpen) {
        return;
      }

      this.input.clear();
      if (this.pauseController.hasReason('manual')) {
        this.pauseController.deactivate('manual');
        this.controller.requestPointerLock();
        return;
      }

      this.controller.exitPointerLock();
      useUiStore.getState().setInteractionPrompt(null);
      this.pauseController.activate('manual');
      return;
    }

    if (DISPLAY_TEXT.ui.prompt.inventoryKeyCodes.some((code) => code === event.code)) {
      event.preventDefault();
      if (dialogueBox) {
        return;
      }

      if (this.pauseController.hasReason('manual')) {
        return;
      }

      if (uiState.isInventoryOpen) {
        this.input.clear();
        useUiStore.getState().closeInventory();
        this.pauseController.deactivate('inventory');
        if (!useUiStore.getState().dialogueBox && !useUiStore.getState().isJournalOpen && !this.pauseController.isPaused()) {
          this.controller.requestPointerLock();
        }
        return;
      }

      if (uiState.isJournalOpen) {
        useUiStore.getState().closeJournal();
        this.pauseController.deactivate('journal');
      }

      this.input.clear();
      this.controller.exitPointerLock();
      useUiStore.getState().setInteractionPrompt(null);
      this.pauseController.activate('inventory');
      useUiStore.getState().toggleInventory();
      return;
    }

    if (DISPLAY_TEXT.ui.journal.toggleKeyCodes.some((code) => code === event.code)) {
      event.preventDefault();
      if (dialogueBox) {
        return;
      }

      if (this.pauseController.hasReason('manual')) {
        return;
      }

      if (uiState.isJournalOpen) {
        this.input.clear();
        useUiStore.getState().closeJournal();
        this.pauseController.deactivate('journal');
        if (!useUiStore.getState().dialogueBox && !useUiStore.getState().isInventoryOpen && !this.pauseController.isPaused()) {
          this.controller.requestPointerLock();
        }
        return;
      }

      if (uiState.isInventoryOpen) {
        useUiStore.getState().closeInventory();
        this.pauseController.deactivate('inventory');
      }

      this.input.clear();
      this.controller.exitPointerLock();
      useUiStore.getState().setInteractionPrompt(null);
      this.pauseController.activate('journal');
      useUiStore.getState().toggleJournal();
      return;
    }

    if (event.code === 'Escape') {
      this.input.clear();
      if (uiState.isInventoryOpen) {
        this.pauseController.deactivate('inventory');
      }
      if (uiState.isJournalOpen) {
        this.pauseController.deactivate('journal');
      }
      useUiStore.getState().closeInventory();
      useUiStore.getState().closeJournal();
      useUiStore.getState().closeDialogue();
      if (!this.pauseController.isPaused()) {
        this.controller.requestPointerLock();
      }
    }
  };

  private onInventoryCloseRequested = (): void => {
    const uiState = useUiStore.getState();
    if (!uiState.isInventoryOpen) {
      return;
    }

    this.input.clear();
    useUiStore.getState().closeInventory();
    this.pauseController.deactivate('inventory');
    if (!useUiStore.getState().dialogueBox && !useUiStore.getState().isJournalOpen && !this.pauseController.isPaused()) {
      this.controller.requestPointerLock();
    }
  };

  private onJournalCloseRequested = (): void => {
    const uiState = useUiStore.getState();
    if (!uiState.isJournalOpen) {
      return;
    }

    this.input.clear();
    useUiStore.getState().closeJournal();
    this.pauseController.deactivate('journal');
    if (!useUiStore.getState().dialogueBox && !useUiStore.getState().isInventoryOpen && !this.pauseController.isPaused()) {
      this.controller.requestPointerLock();
    }
  };
}
