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

export class Game {
  private readonly renderer: Renderer;
  private readonly world: World;
  private readonly input = new InputManager();
  private readonly player = new Player(DUNGEON_CONFIG.startPosition);
  private readonly collisionWorld = new CollisionWorld();
  private readonly loop: GameLoop;
  private readonly raycastInteractor = new RaycastInteractor();
  private readonly eventTimers = new Map<number, number>();
  private controller: FirstPersonController;
  private interactionSystem?: InteractionSystem;
  private levelLoader?: LevelLoader;
  private northYaw = 0;

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
              if (!useUiStore.getState().dialogueBox) {
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
                if (!useUiStore.getState().dialogueBox) {
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
    useGameStore.getState().setMaxHealth(this.player.stats.health);
    useGameStore.getState().setHealth(this.player.stats.health);
    this.northYaw = this.world.camera.rotation.y;
    useGameStore.getState().setCompassHeading(0);
    useUiStore.getState().addJournalEntry(DISPLAY_TEXT.ui.log.welcome);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
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
  }

  private update(delta: number): void {
    const dialogueBox = useUiStore.getState().dialogueBox;
    const isDialogueOpen = Boolean(dialogueBox);

    if (!isDialogueOpen) {
      this.controller.update(delta);
    }

    this.levelLoader?.update(delta);

    if (this.interactionSystem && !isDialogueOpen) {
      const focused = this.raycastInteractor.pick(
        this.world.camera,
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

    const dialogueBox = useUiStore.getState().dialogueBox;
    if (dialogueBox?.mode === 'acknowledgment' && event.code === DISPLAY_TEXT.ui.prompt.acknowledgeKeyCode) {
      event.preventDefault();
      dialogueBox.onConfirm?.();
      useUiStore.getState().closeDialogue();
      return;
    }

    if (event.code === 'KeyE') {
      this.interactionSystem?.tryInteract();
      return;
    }

    if (event.code === 'KeyI') {
      event.preventDefault();
      useUiStore.getState().toggleInventory();
      return;
    }

    if (event.code === 'Escape') {
      useUiStore.getState().closeInventory();
      useUiStore.getState().closeDialogue();
      this.controller.requestPointerLock();
    }
  };
}