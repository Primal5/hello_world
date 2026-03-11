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

export class Game {
  private readonly renderer: Renderer;
  private readonly world: World;
  private readonly input = new InputManager();
  private readonly player = new Player(new THREE.Vector3(0, 0.01, 2));
  private readonly collisionWorld = new CollisionWorld();
  private readonly loop: GameLoop;
  private readonly raycastInteractor = new RaycastInteractor();
  private controller: FirstPersonController;
  private interactionSystem?: InteractionSystem;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.world = new World(container.clientWidth / container.clientHeight);
    this.controller = new FirstPersonController(
      this.world.camera,
      this.player,
      this.input,
      this.collisionWorld,
      this.renderer.instance.domElement
    );
    this.loop = new GameLoop((delta) => this.update(delta));
  }

  async init(): Promise<void> {
    const itemDb = new ItemDatabase();
    const dialogueSystem = new DialogueSystem();
    const levelLoader = new LevelLoader(this.world.scene, new AssetLoader(), itemDb, dialogueSystem);

    const context = {
      player: this.player,
      dialogueSystem,
      log: (message: string) => useUiStore.getState().addLog(message)
    };

    const interactables = await levelLoader.load(context);
    this.interactionSystem = new InteractionSystem(interactables, context);

    useGameStore.getState().setInventory(this.player.inventory.getAll());

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
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

    this.renderer.render(this.world.scene, this.world.camera);
  }

  private onResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.resize(width, height);
    this.world.resize(width / height);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyE') {
      this.interactionSystem?.tryInteract();
    }

    if (event.code === 'KeyI') {
      useUiStore.getState().toggleInventory();
    }
  };
}
