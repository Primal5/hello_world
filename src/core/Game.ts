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
import { useUiStore } from '../ui/store/uiStore';
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
  private controller: FirstPersonController;
  private interactionSystem?: InteractionSystem;
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
      new AssetLoader(),
      itemDb,
      dialogueSystem,
      this.collisionWorld
    );

    const context = {
      player: this.player,
      dialogueSystem,
      log: (message: string) => useUiStore.getState().addLog(message)
    };

    const interactables = await levelLoader.load(context);
    this.interactionSystem = new InteractionSystem(interactables, context);

    useGameStore.getState().setInventory(this.player.inventory.getAll());
    useGameStore.getState().setMaxHealth(this.player.stats.health);
    useGameStore.getState().setHealth(this.player.stats.health);
    this.northYaw = this.world.camera.rotation.y + Math.PI;
    useGameStore.getState().setCompassHeading(0);
    useUiStore.getState().addLog(DISPLAY_TEXT.ui.prompt.openInventory);

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
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private update(delta: number): void {
    this.controller.update(delta);

    if (this.interactionSystem) {
      const focused = this.raycastInteractor.pick(
        this.world.camera,
        this.interactionSystem.interactables,
        this.interactionSystem.maxDistance
      );
      this.interactionSystem.setFocused(focused);
    }

    const heading = THREE.MathUtils.euclideanModulo(
      THREE.MathUtils.radToDeg(this.world.camera.rotation.y - this.northYaw),
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
    }
  };
}
