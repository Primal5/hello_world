import * as THREE from 'three';
import { baseLevel } from '../data/level';
import type { DialogueSystem } from '../gameplay/dialogue/DialogueSystem';
import type { Interactable } from '../gameplay/interaction/Interactable';
import type { InteractionContext } from '../gameplay/interaction/InteractionSystem';
import type { ItemDatabase } from '../gameplay/items/ItemDatabase';
import { AssetLoader } from './AssetLoader';
import { MODEL_REGISTRY, type ModelKey } from './ModelRegistry';

export class LevelLoader {
  constructor(
    private readonly scene: THREE.Scene,
    private readonly assetLoader: AssetLoader,
    private readonly itemDb: ItemDatabase,
    private readonly dialogueSystem: DialogueSystem
  ) {}

  async load(context: InteractionContext): Promise<Interactable[]> {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: '#4f7048' })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: '#757575' })
    );
    stone.position.set(-4, 0.6, -2);
    this.scene.add(stone);

    const interactables: Interactable[] = [];

    for (const entity of baseLevel) {
      const object = await this.loadWithFallback(entity.type);
      object.position.copy(entity.position);
      this.scene.add(object);

      if (entity.type === 'chest') {
        let opened = false;
        interactables.push({
          id: entity.id,
          label: opened ? 'examiner le coffre vide' : 'ouvrir le coffre',
          object3D: object,
          canInteract: () => !opened,
          interact: () => {
            if (opened) return;
            opened = true;
            const item = this.itemDb.getById('rusty_key');
            if (item && context.player.inventory.add(item.id)) {
              context.log(`Vous obtenez : ${item.name}`);
              object.rotation.y += Math.PI / 2;
            }
          }
        });
      }

      if (entity.type === 'door') {
        let isOpen = false;
        interactables.push({
          id: entity.id,
          label: 'ouvrir la porte',
          object3D: object,
          canInteract: () => !isOpen,
          interact: () => {
            if (isOpen) return;
            if (!context.player.inventory.has('rusty_key')) {
              context.log('La porte est verrouillée. Il faut une clé.');
              return;
            }

            isOpen = true;
            object.rotation.y -= Math.PI / 2;
            context.log('La porte grince et s’ouvre.');
          }
        });
      }

      if (entity.type === 'npc') {
        interactables.push({
          id: entity.id,
          label: 'parler au PNJ',
          object3D: object,
          canInteract: () => true,
          interact: () => {
            const line = this.dialogueSystem.getLine('npc_guard_hint');
            context.log(`PNJ: ${line}`);
          }
        });
      }
    }

    return interactables;
  }

  private async loadWithFallback(type: ModelKey): Promise<THREE.Object3D> {
    const model = await this.assetLoader.loadModel(MODEL_REGISTRY[type]);

    if (model instanceof THREE.Mesh || model instanceof THREE.Group) {
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
    }

    if (type === 'door' && model instanceof THREE.Mesh) {
      model.scale.set(1.2, 2, 0.2);
    }

    if (type === 'npc' && model instanceof THREE.Mesh) {
      model.scale.set(0.9, 1.8, 0.9);
      model.material = new THREE.MeshStandardMaterial({ color: '#4b6cb7' });
    }

    return model;
  }
}
