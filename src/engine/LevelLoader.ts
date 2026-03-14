import * as THREE from 'three';
import type { DialogueSystem } from '../gameplay/dialogue/DialogueSystem';
import type { Interactable } from '../gameplay/interaction/Interactable';
import type { InteractionContext } from '../gameplay/interaction/InteractionSystem';
import type { ItemDatabase } from '../gameplay/items/ItemDatabase';
import { AssetLoader } from './AssetLoader';
import { ENABLE_SHADOWS } from './lighting';
import { CollisionWorld } from './CollisionWorld';
import {
  DUNGEON_CONFIG,
  generateDungeonLayout,
  getMirroredRoomWorldBounds,
  type DungeonDoorDefinition,
  type DungeonLayout,
  type DungeonWallSegment
} from './DungeonGenerator';
import { MODEL_REGISTRY, type ModelDefinition, type ModelKey } from './ModelRegistry';
import { DISPLAY_TEXT } from '../text/DisplayText';
import { ItemVisualsService } from '../gameplay/items/ItemVisuals';
import type { LoadedModel } from './AssetLoader';
import { createGroundMaterialSet } from './ProceduralGround';

interface WallEndBehavior {
  trimStart: boolean;
  trimEnd: boolean;
  extendStart: boolean;
  extendEnd: boolean;
}

interface HingedModelOptions {
  hinge: 'left' | 'right';
  view: 'left' | 'right';
}

const DOOR_MODEL_SIZE = {
  thickness: 0.21565186977386475,
  height: 2.000000298023224,
  width: 1.4043151140213013
} as const;
const SPAWN_THRESHOLD_HEIGHT = 0.0225;
const SPAWN_THRESHOLD_Y_OFFSET = 0.008;

export class LevelLoader {
  private readonly wallTexture = this.createWallTexture();
  private readonly thresholdWoodTexture = this.createThresholdWoodTexture();
  private readonly animationMixers: THREE.AnimationMixer[] = [];
  private readonly animationUpdaters: Array<(delta: number) => void> = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly assetLoader: AssetLoader,
    private readonly itemDb: ItemDatabase,
    private readonly dialogueSystem: DialogueSystem,
    private readonly collisionWorld: CollisionWorld
  ) {}

  update(delta: number): void {
    for (const mixer of this.animationMixers) {
      mixer.update(delta);
    }

    for (const updater of this.animationUpdaters) {
      updater(delta);
    }
  }

  async load(context: InteractionContext): Promise<Interactable[]> {
    const layout = generateDungeonLayout();
    this.collisionWorld.setCeiling(DUNGEON_CONFIG.ceilingY);

    await this.addDungeonShell(layout);
    this.addWalls(layout.wallSegments);

    const interactables: Interactable[] = [];

    for (const chestDefinition of layout.chests) {
      const chest = await this.loadWithFallback('chest');
      this.placeObject(chest, chestDefinition.position);
      this.scene.add(chest);

      let chestOpened = false;
      interactables.push({
        id: chestDefinition.id,
        label: DISPLAY_TEXT.world.chest.interactLabel,
        object3D: chest,
        canInteract: () => true,
        interact: () => {
          if (chestOpened) {
            context.event(DISPLAY_TEXT.world.chest.empty);
            return;
          }

          chestOpened = true;
          const item = this.itemDb.getById(chestDefinition.itemId);
          if (item && context.player.inventory.add(item.id)) {
            const message = DISPLAY_TEXT.world.chest.obtainedItem(item.name);
            const rarityTheme = ItemVisualsService.getRarityTheme(item.rarity);
            const highlights = [{ text: item.name, color: rarityTheme.color }];
            context.event({
              message,
              highlights
            });
            context.journal({
              message,
              highlights
            });
          }
        }
      });
    }

    const { root: npc, greet: greetNpc } = await this.loadNpc();
    this.placeObject(npc, layout.npcPosition);
    npc.rotation.y = Math.PI;
    this.scene.add(npc);
    interactables.push({
      id: 'entrance_npc',
      label: DISPLAY_TEXT.world.npc.interactLabel,
      object3D: npc,
      canInteract: () => true,
      interact: () => {
        greetNpc();
        const requiredItem = this.itemDb.getById('rusty_key');
        const line = this.dialogueSystem.getLine('npc_guard_hint');
        const highlights = requiredItem
          ? [{
              text: requiredItem.name,
              color: ItemVisualsService.getRarityTheme(requiredItem.rarity).color
            }]
          : undefined;
        context.acknowledge(DISPLAY_TEXT.world.npc.prefix, line, () => {
          context.journal({
            message: `${DISPLAY_TEXT.world.npc.prefix} : ${line}`,
            highlights
          });
        }, highlights);
      }
    });

    for (const doorDefinition of layout.doors) {
      const { root, pivot, obstacleSize } = await this.createDoor(doorDefinition);
      this.scene.add(root);
      this.collisionWorld.setObstacle(doorDefinition.obstacleId, doorDefinition.center, obstacleSize);

      let isOpen = false;
      let isUnlocked = !doorDefinition.locked;
      interactables.push({
        id: doorDefinition.id,
        label: doorDefinition.doorName
          ? DISPLAY_TEXT.world.door.interactNamedLabel(doorDefinition.doorName)
          : doorDefinition.entrance
            ? DISPLAY_TEXT.world.door.entranceInteractLabel
            : DISPLAY_TEXT.world.door.interactLabel,
        object3D: root,
        canInteract: () => true,
        interact: () => {
          if (!isUnlocked) {
            const requiredItemId = doorDefinition.requiredItemId;
            if (!requiredItemId || !context.player.inventory.has(requiredItemId)) {
              if (doorDefinition.doorName && requiredItemId) {
                const requiredItem = this.itemDb.getById(requiredItemId);
                if (requiredItem) {
                  const rarityTheme = ItemVisualsService.getRarityTheme(requiredItem.rarity);
                  context.event({
                    message: DISPLAY_TEXT.world.door.lockedNamedItem(doorDefinition.doorName, requiredItem.name),
                    highlights: [{ text: requiredItem.name, color: rarityTheme.color }]
                  });
                } else {
                  context.event(DISPLAY_TEXT.world.door.locked);
                }
              } else if (doorDefinition.entrance) {
                const requiredItem = requiredItemId ? this.itemDb.getById(requiredItemId) : undefined;
                if (requiredItem) {
                  const rarityTheme = ItemVisualsService.getRarityTheme(requiredItem.rarity);
                  context.event({
                    message: DISPLAY_TEXT.world.door.entranceLockedItem(requiredItem.name),
                    highlights: [{ text: requiredItem.name, color: rarityTheme.color }]
                  });
                } else {
                  context.event(DISPLAY_TEXT.world.door.entranceLocked);
                }
              } else {
                context.event(DISPLAY_TEXT.world.door.locked);
              }
              return;
            }

            if (requiredItemId) {
              context.player.inventory.remove(requiredItemId);
            }
            const usedItem = requiredItemId ? this.itemDb.getById(requiredItemId) : undefined;
            if (usedItem) {
              const rarityTheme = ItemVisualsService.getRarityTheme(usedItem.rarity);
              const keyUsageEvent = {
                message: doorDefinition.doorName
                  ? DISPLAY_TEXT.world.item.usedOnDoor(usedItem.name, doorDefinition.doorName)
                  : DISPLAY_TEXT.world.item.used(usedItem.name),
                highlights: [{ text: usedItem.name, color: rarityTheme.color }]
              };
              context.event(keyUsageEvent);
              context.journal(keyUsageEvent);
            }
            isUnlocked = true;
            return;
          }

          if (isOpen) {
            isOpen = false;
            pivot.rotation.y = 0;
            this.collisionWorld.setObstacle(doorDefinition.obstacleId, doorDefinition.center, obstacleSize);
            context.event(
              doorDefinition.doorName
                ? DISPLAY_TEXT.world.door.closingNamed(doorDefinition.doorName)
                : doorDefinition.entrance
                  ? DISPLAY_TEXT.world.door.entranceClosing
                  : DISPLAY_TEXT.world.door.closing
            );
            return;
          }

          isOpen = true;
          pivot.rotation.y = this.getDoorOpenAngle(doorDefinition, context.player.position);
          this.collisionWorld.removeObstacle(doorDefinition.obstacleId);
          context.event(
            doorDefinition.doorName
              ? DISPLAY_TEXT.world.door.openingNamed(doorDefinition.doorName)
              : doorDefinition.entrance
                ? DISPLAY_TEXT.world.door.entranceOpening
                : DISPLAY_TEXT.world.door.opening
          );
        }
      });
    }

    return interactables;
  }
  private async addDungeonShell(layout: DungeonLayout): Promise<void> {
    const { floorCenter, ceilingCenter, floorSize: size } = layout;
    const worldOffset = new THREE.Vector2(
      floorCenter.x - size.x / 2,
      floorCenter.z - size.y / 2
    );
    const groundMaterials = await createGroundMaterialSet(
      size,
      this.assetLoader.getMaxAnisotropy(),
      {
        albedoPath: '/assets/textures/floors/pierre/Dalles_Claires.jpg',
        worldOffset
      }
    );

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y), groundMaterials.baseMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.copy(floorCenter);
    floor.receiveShadow = ENABLE_SHADOWS;
    this.scene.add(floor);

    const floorVariation = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x, size.y),
      groundMaterials.variationMaterial
    );
    floorVariation.rotation.x = -Math.PI / 2;
    floorVariation.position.copy(floorCenter);
    floorVariation.position.y += 0.01;
    floorVariation.receiveShadow = ENABLE_SHADOWS;
    floorVariation.renderOrder = 1;
    this.scene.add(floorVariation);

    const spawnRoom = layout.graph.rooms.find((room) => room.id === 'spawn');
    if (spawnRoom) {
      const spawnBounds = getMirroredRoomWorldBounds(spawnRoom);
      const spawnSize = new THREE.Vector2(
        spawnBounds.xMax - spawnBounds.xMin,
        spawnBounds.zMax - spawnBounds.zMin
      );
      const spawnCenter = new THREE.Vector3(
        (spawnBounds.xMin + spawnBounds.xMax) / 2,
        floorCenter.y + 0.02,
        (spawnBounds.zMin + spawnBounds.zMax) / 2
      );
      const spawnOffset = new THREE.Vector2(spawnBounds.xMin, spawnBounds.zMin);
      const spawnMaterials = await createGroundMaterialSet(
        spawnSize,
        this.assetLoader.getMaxAnisotropy(),
        {
          albedoPath: '/assets/textures/floors/pierre/Pierre_Claire.jpg',
          worldOffset: spawnOffset
        }
      );

      const spawnFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(spawnSize.x, spawnSize.y),
        spawnMaterials.baseMaterial
      );
      spawnFloor.rotation.x = -Math.PI / 2;
      spawnFloor.position.copy(spawnCenter);
      spawnFloor.receiveShadow = ENABLE_SHADOWS;
      spawnFloor.renderOrder = 2;
      this.scene.add(spawnFloor);

      const spawnVariation = new THREE.Mesh(
        new THREE.PlaneGeometry(spawnSize.x, spawnSize.y),
        spawnMaterials.variationMaterial
      );
      spawnVariation.rotation.x = -Math.PI / 2;
      spawnVariation.position.copy(spawnCenter);
      spawnVariation.position.y += 0.01;
      spawnVariation.receiveShadow = ENABLE_SHADOWS;
      spawnVariation.renderOrder = 3;
      this.scene.add(spawnVariation);
    }

    const spawnEntranceDoor = layout.doors.find((door) => door.entrance);
    if (spawnEntranceDoor) {
      this.addSpawnThreshold(spawnEntranceDoor, floorCenter.y);
    }

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x, size.y),
      new THREE.MeshStandardMaterial({ color: '#7f7a70', side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.copy(ceilingCenter);
    ceiling.receiveShadow = ENABLE_SHADOWS;
    this.scene.add(ceiling);
  }

  private addSpawnThreshold(door: DungeonDoorDefinition, floorY: number): void {
    const thresholdSize = new THREE.Vector2(
      door.width,
      door.depth / 4
    );
    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(thresholdSize.x, SPAWN_THRESHOLD_HEIGHT, thresholdSize.y),
      this.createThresholdWoodMaterial(thresholdSize)
    );
    threshold.rotation.y = door.rotationY;
    threshold.position.set(
      door.center.x,
      floorY + SPAWN_THRESHOLD_Y_OFFSET + SPAWN_THRESHOLD_HEIGHT / 2,
      door.center.z
    );
    threshold.castShadow = ENABLE_SHADOWS;
    threshold.receiveShadow = ENABLE_SHADOWS;
    threshold.renderOrder = 4;
    this.scene.add(threshold);
  }

  private createThresholdWoodMaterial(size: THREE.Vector2): THREE.MeshStandardMaterial[] {
    const topTexture = this.thresholdWoodTexture.clone();
    topTexture.needsUpdate = true;
    topTexture.wrapS = THREE.RepeatWrapping;
    topTexture.wrapT = THREE.RepeatWrapping;
    topTexture.repeat.set(Math.max(size.x / 0.45, 1), 1);
    topTexture.anisotropy = this.assetLoader.getMaxAnisotropy();

    const sideTexture = this.thresholdWoodTexture.clone();
    sideTexture.needsUpdate = true;
    sideTexture.wrapS = THREE.RepeatWrapping;
    sideTexture.wrapT = THREE.RepeatWrapping;
    sideTexture.repeat.set(Math.max(size.x / 0.55, 1), 1);
    sideTexture.anisotropy = this.assetLoader.getMaxAnisotropy();

    return [
      new THREE.MeshStandardMaterial({ color: '#6b4727', map: sideTexture }),
      new THREE.MeshStandardMaterial({ color: '#6b4727', map: sideTexture }),
      new THREE.MeshStandardMaterial({ color: '#8b5a2b', map: topTexture }),
      new THREE.MeshStandardMaterial({ color: '#5c3d21' }),
      new THREE.MeshStandardMaterial({ color: '#744b29', map: sideTexture }),
      new THREE.MeshStandardMaterial({ color: '#744b29', map: sideTexture })
    ];
  }

  private addExteriorGroundRing(center: THREE.Vector3, outerSize: THREE.Vector2, innerSize: number): void {
    const halfOuterWidth = outerSize.x / 2;
    const halfOuterDepth = outerSize.y / 2;
    const halfInner = innerSize / 2;
    const ringMaterial = new THREE.MeshStandardMaterial({ color: '#6e6756' });

    const sections = [
      {
        size: new THREE.Vector2(outerSize.x, halfOuterDepth - halfInner),
        offset: new THREE.Vector3(0, 0, -(halfInner + (halfOuterDepth - halfInner) / 2))
      },
      {
        size: new THREE.Vector2(outerSize.x, halfOuterDepth - halfInner),
        offset: new THREE.Vector3(0, 0, halfInner + (halfOuterDepth - halfInner) / 2)
      },
      {
        size: new THREE.Vector2(halfOuterWidth - halfInner, innerSize),
        offset: new THREE.Vector3(-(halfInner + (halfOuterWidth - halfInner) / 2), 0, 0)
      },
      {
        size: new THREE.Vector2(halfOuterWidth - halfInner, innerSize),
        offset: new THREE.Vector3(halfInner + (halfOuterWidth - halfInner) / 2, 0, 0)
      }
    ];

    for (const section of sections) {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(section.size.x, section.size.y),
        ringMaterial.clone()
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.copy(center).add(section.offset);
      ground.position.y = center.y;
      ground.receiveShadow = ENABLE_SHADOWS;
      this.scene.add(ground);
    }
  }

  private addExteriorBounds(center: THREE.Vector3, size: THREE.Vector2): void {
    const boundaryThickness = 1;
    const boundaryHeight = DUNGEON_CONFIG.height;
    const halfWidth = size.x / 2;
    const halfDepth = size.y / 2;

    const bounds = [
      {
        id: 'exterior_bound_north',
        center: new THREE.Vector3(center.x, boundaryHeight / 2, center.z - halfDepth),
        size: new THREE.Vector3(size.x, boundaryHeight, boundaryThickness)
      },
      {
        id: 'exterior_bound_south',
        center: new THREE.Vector3(center.x, boundaryHeight / 2, center.z + halfDepth),
        size: new THREE.Vector3(size.x, boundaryHeight, boundaryThickness)
      },
      {
        id: 'exterior_bound_west',
        center: new THREE.Vector3(center.x - halfWidth, boundaryHeight / 2, center.z),
        size: new THREE.Vector3(boundaryThickness, boundaryHeight, size.y)
      },
      {
        id: 'exterior_bound_east',
        center: new THREE.Vector3(center.x + halfWidth, boundaryHeight / 2, center.z),
        size: new THREE.Vector3(boundaryThickness, boundaryHeight, size.y)
      }
    ];

    for (const bound of bounds) {
      this.collisionWorld.setObstacle(bound.id, bound.center, bound.size);
    }
  }

  private addWalls(wallSegments: DungeonWallSegment[]): void {
    const behaviors = this.resolveWallBehaviors(wallSegments);

    for (const segment of wallSegments) {
      const behavior = behaviors.get(segment.id) ?? {
        trimStart: false,
        trimEnd: false,
        extendStart: false,
        extendEnd: false
      };
      const rendered = this.getRenderedWall(segment, behavior);
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(rendered.size.x, rendered.size.y, rendered.size.z),
        this.createWallMaterial(rendered.center, rendered.size)
      );
      wall.position.copy(rendered.center);
      wall.castShadow = ENABLE_SHADOWS;
      wall.receiveShadow = ENABLE_SHADOWS;
      this.scene.add(wall);
      this.collisionWorld.setObstacle(segment.id, rendered.center, rendered.size);
    }
  }

  private resolveWallBehaviors(wallSegments: DungeonWallSegment[]): Map<string, WallEndBehavior> {
    const behaviors = new Map<string, WallEndBehavior>();
    const joinSegments = wallSegments.filter((segment) => segment.affectsJoins);

    for (const segment of wallSegments) {
      if (segment.axis === 'x') {
        behaviors.set(segment.id, {
          trimStart: false,
          trimEnd: false,
          extendStart: this.hasSecondaryCornerAt(segment, segment.start.x, joinSegments),
          extendEnd: this.hasSecondaryCornerAt(segment, segment.end.x, joinSegments)
        });
        continue;
      }

      behaviors.set(segment.id, {
        trimStart: this.hasPrimaryJunction(segment, segment.start.y, joinSegments),
        trimEnd: this.hasPrimaryJunction(segment, segment.end.y, joinSegments),
        extendStart: false,
        extendEnd: false
      });
    }

    return behaviors;
  }

  private hasSecondaryCornerAt(segment: DungeonWallSegment, pointOnAxis: number, wallSegments: DungeonWallSegment[]): boolean {
    const epsilon = 0.001;
    let endpointTouches = 0;

    for (const candidate of wallSegments) {
      if (candidate.axis !== 'z' || candidate.priority >= segment.priority) {
        continue;
      }

      if (Math.abs(candidate.line - pointOnAxis) > epsilon) {
        continue;
      }

      const crossesThrough = candidate.start.y < segment.line - epsilon && candidate.end.y > segment.line + epsilon;
      if (crossesThrough) {
        return false;
      }

      const touchesAtStart = Math.abs(candidate.start.y - segment.line) <= epsilon;
      const touchesAtEnd = Math.abs(candidate.end.y - segment.line) <= epsilon;
      if (touchesAtStart || touchesAtEnd) {
        endpointTouches += 1;
      }
    }

    return endpointTouches === 1;
  }

  private hasPrimaryJunction(segment: DungeonWallSegment, pointOnAxis: number, wallSegments: DungeonWallSegment[]): boolean {
    const epsilon = 0.001;
    return wallSegments.some((candidate) => {
      if (candidate.axis !== 'x' || candidate.priority <= segment.priority) {
        return false;
      }

      if (Math.abs(candidate.line - pointOnAxis) > epsilon) {
        return false;
      }

      return candidate.start.x - epsilon <= segment.line && candidate.end.x + epsilon >= segment.line;
    });
  }

  private getRenderedWall(segment: DungeonWallSegment, behavior: WallEndBehavior): {
    center: THREE.Vector3;
    size: THREE.Vector3;
  } {
    const trim = segment.thickness / 2;

    if (segment.axis === 'x') {
      let start = segment.start.x;
      let end = segment.end.x;

      if (behavior.extendStart) {
        start -= trim;
      }

      if (behavior.extendEnd) {
        end += trim;
      }

      return {
        center: new THREE.Vector3((start + end) / 2, segment.center.y, segment.line),
        size: new THREE.Vector3(end - start, segment.height, segment.thickness)
      };
    }

    let start = segment.start.y;
    let end = segment.end.y;

    if (behavior.trimStart) {
      start += trim;
    }

    if (behavior.trimEnd) {
      end -= trim;
    }

    return {
      center: new THREE.Vector3(segment.line, segment.center.y, (start + end) / 2),
      size: new THREE.Vector3(segment.thickness, segment.height, end - start)
    };
  }
  private getDoorOpenAngle(definition: DungeonDoorDefinition, playerPosition: THREE.Vector3): number {
    const facing = new THREE.Vector3(Math.sin(definition.rotationY), 0, Math.cos(definition.rotationY));
    const playerOffset = playerPosition.clone().sub(definition.center);
    return playerOffset.dot(facing) <= 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  private createWallMaterial(center: THREE.Vector3, size: THREE.Vector3): THREE.MeshStandardMaterial[] {
    const faceXTexture = this.createRepeatedWallTexture(
      size.z,
      size.y,
      center.z - size.z / 2,
      center.y - size.y / 2
    );
    const faceYTexture = this.createRepeatedWallTexture(
      size.x,
      size.z,
      center.x - size.x / 2,
      center.z - size.z / 2,
      2,
      2
    );
    const faceZTexture = this.createRepeatedWallTexture(
      size.x,
      size.y,
      center.x - size.x / 2,
      center.y - size.y / 2
    );

    return [
      new THREE.MeshStandardMaterial({ map: faceXTexture, color: '#ffffff' }),
      new THREE.MeshStandardMaterial({
        map: this.createRepeatedWallTexture(size.z, size.y, center.z - size.z / 2, center.y - size.y / 2),
        color: '#ffffff'
      }),
      new THREE.MeshStandardMaterial({ map: faceYTexture, color: '#f2f2f2' }),
      new THREE.MeshStandardMaterial({
        map: this.createRepeatedWallTexture(size.x, size.z, center.x - size.x / 2, center.z - size.z / 2, 2, 2),
        color: '#ebebeb'
      }),
      new THREE.MeshStandardMaterial({ map: faceZTexture, color: '#ffffff' }),
      new THREE.MeshStandardMaterial({
        map: this.createRepeatedWallTexture(size.x, size.y, center.x - size.x / 2, center.y - size.y / 2),
        color: '#ffffff'
      })
    ];
  }

  private createRepeatedWallTexture(
    width: number,
    height: number,
    offsetU = 0,
    offsetV = 0,
    tileWidth = 2,
    tileHeight = 1
  ): THREE.Texture {
    const texture = this.wallTexture.clone();
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(Math.max(width / tileWidth, 0.01), Math.max(height / tileHeight, 0.01));
    texture.offset.set(
      THREE.MathUtils.euclideanModulo(offsetU / tileWidth, 1),
      THREE.MathUtils.euclideanModulo(offsetV / tileHeight, 1)
    );
    texture.anisotropy = this.assetLoader.getMaxAnisotropy();
    return texture;
  }

  private createWallTexture(): THREE.Texture {
    const texture = new THREE.TextureLoader().load('/assets/textures/walls/clairs/Dalles_Claires.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = this.assetLoader.getMaxAnisotropy();
    texture.needsUpdate = true;
    return texture;
  }

  private createThresholdWoodTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallback = new THREE.Texture();
      fallback.needsUpdate = true;
      return fallback;
    }

    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, '#7a512e');
    gradient.addColorStop(0.24, '#9a6a3a');
    gradient.addColorStop(0.5, '#6c4526');
    gradient.addColorStop(0.76, '#8b5a30');
    gradient.addColorStop(1, '#5c3a20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 22; index += 1) {
      const x = (index / 22) * canvas.width;
      ctx.fillStyle = index % 3 === 0 ? 'rgba(55,28,12,0.16)' : 'rgba(255,230,180,0.07)';
      ctx.fillRect(x, 0, 3 + (index % 4), canvas.height);
    }

    for (let index = 0; index < 80; index += 1) {
      const x = (index * 31) % canvas.width;
      const y = (index * 17) % canvas.height;
      const width = 10 + (index % 7) * 8;
      const height = 1 + (index % 3);
      ctx.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(45,20,8,0.08)';
      ctx.fillRect(x, y, width, height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = this.assetLoader.getMaxAnisotropy();
    texture.needsUpdate = true;
    return texture;
  }

  private async createDoor(definition: DungeonDoorDefinition): Promise<{
    root: THREE.Group;
    pivot: THREE.Group;
    obstacleSize: THREE.Vector3;
  }> {
    const root = new THREE.Group();
    root.name = definition.id;
    root.position.copy(definition.center);
    root.rotation.y = definition.rotationY;

    const pivot = new THREE.Group();
    pivot.position.x = definition.width / 2;
    root.add(pivot);

    const modelDefinition = this.getDoorModelDefinition(definition);
    const panel = await this.assetLoader.loadModel(modelDefinition.path);
    this.applyModelMaterialStyle(panel, modelDefinition);
    this.enableShadows(panel);

    panel.scale.set(
      -(definition.depth / DOOR_MODEL_SIZE.thickness),
      definition.height / DOOR_MODEL_SIZE.height,
      definition.width / DOOR_MODEL_SIZE.width
    );
    panel.rotation.y = Math.PI / 2;
    panel.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(panel);
    const center = box.getCenter(new THREE.Vector3());
    panel.position.x -= box.max.x;
    panel.position.y -= box.min.y;
    panel.position.z -= center.z;
    pivot.add(panel);

    const obstacleSize = Math.abs(Math.sin(definition.rotationY)) > 0.5
      ? new THREE.Vector3(definition.depth, definition.height, definition.width)
      : new THREE.Vector3(definition.width, definition.height, definition.depth);
    return { root, pivot, obstacleSize };
  }

  private getDoorModelDefinition(definition: DungeonDoorDefinition): ModelDefinition {
    if (definition.requiredItemId === 'bronze_key') {
      return MODEL_REGISTRY.Bronze_Door;
    }

    if (definition.requiredItemId === 'silver_key') {
      return MODEL_REGISTRY.Silver_Door;
    }

    if (definition.requiredItemId === 'gold_key') {
      return MODEL_REGISTRY.Gold_Door;
    }

    return MODEL_REGISTRY.Wooden_Door;
  }

  private attachHingedModel(
    model: THREE.Object3D,
    definition: DungeonDoorDefinition,
    options: HingedModelOptions
  ): void {
    this.enableShadows(model);

    const scaleX =
      (options.view === 'left' ? -1 : 1) * (definition.depth / DOOR_MODEL_SIZE.thickness);
    model.scale.set(
      scaleX,
      definition.height / DOOR_MODEL_SIZE.height,
      definition.width / DOOR_MODEL_SIZE.width
    );
    model.rotation.y = options.view === 'left' ? Math.PI / 2 : -Math.PI / 2;
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= options.hinge === 'left' ? box.max.x : box.min.x;
    model.position.y -= box.min.y;
    model.position.z -= center.z;
  }
  private async loadNpc(): Promise<{ root: THREE.Group; greet: () => void }> {
    const asset = await this.assetLoader.loadModelAsset(MODEL_REGISTRY.npc.path);
    const root = this.createModelRoot(asset.scene, MODEL_REGISTRY.npc, 'npc');
    const greet = this.configureNpcAnimations(asset, root);
    return { root, greet };
  }

  private configureNpcAnimations(asset: LoadedModel, root: THREE.Group): () => void {
    const mixer = new THREE.AnimationMixer(asset.scene);
    this.animationMixers.push(mixer);

    const idleClip = asset.animations.find((clip: THREE.AnimationClip) => clip.name === 'Running');
    const greetClip = asset.animations.find((clip: THREE.AnimationClip) => clip.name === 'Idle_6');

    const idleAction = idleClip ? mixer.clipAction(idleClip) : null;
    if (idleAction) {
      idleAction.setLoop(THREE.LoopRepeat, Infinity);
      idleAction.enabled = true;
      idleAction.play();
    }

    if (!greetClip) {
      return () => undefined;
    }

    const greetAction = mixer.clipAction(greetClip);
    greetAction.setLoop(THREE.LoopOnce, 1);
    greetAction.clampWhenFinished = true;

    mixer.addEventListener('finished', (event) => {
      if (event.action !== greetAction || !idleAction) {
        return;
      }

      idleAction.reset();
      idleAction.enabled = true;
      idleAction.fadeIn(0.2).play();
    });

    return () => {
      greetAction.stop();
      greetAction.reset();
      greetAction.enabled = true;
      greetAction.setEffectiveTimeScale(1);
      greetAction.setEffectiveWeight(1);
      if (idleAction) {
        idleAction.fadeOut(0.15);
      }
      greetAction.play();
    };
  }
  private async loadWithFallback(type: ModelKey): Promise<THREE.Object3D> {
    const definition = MODEL_REGISTRY[type];
    const model = await this.assetLoader.loadModel(definition.path);
    return this.createModelRoot(model, definition, type);
  }

  private createModelRoot(
    model: THREE.Object3D,
    definition: ModelDefinition,
    type: ModelKey
  ): THREE.Group {
    this.enableShadows(model);

    if (model instanceof THREE.Mesh) {
      this.applyTypeStyle(model, type);
    }

    this.applyBaseTransform(model, definition);
    this.centerModelOnFootprint(model, definition);
    this.applyOffset(model, definition);

    const root = new THREE.Group();
    root.name = `${type}_root`;
    root.add(model);

    return root;
  }

  private placeObject(object: THREE.Object3D, position: THREE.Vector3): void {
    object.position.copy(position);
  }

  private enableShadows(root: THREE.Object3D): void {
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = ENABLE_SHADOWS;
        mesh.receiveShadow = ENABLE_SHADOWS;
      }
    });
  }
  private applyBaseTransform(model: THREE.Object3D, definition: ModelDefinition): void {
    if (definition.scale) {
      model.scale.set(...definition.scale);
    }

    if (definition.rotation) {
      model.rotation.set(...definition.rotation);
    }
  }

  private centerModelOnFootprint(model: THREE.Object3D, definition: ModelDefinition): void {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) {
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;

    if (definition.placeOnGround !== false) {
      model.position.y -= box.min.y;
    }
  }

  private applyOffset(model: THREE.Object3D, definition: ModelDefinition): void {
    if (definition.offset) {
      model.position.add(new THREE.Vector3(...definition.offset));
    }
  }

  private applyModelMaterialStyle(model: THREE.Object3D, definition: ModelDefinition): void {
    const style = definition.materialStyle;
    if (!style) {
      return;
    }

    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => this.createStyledMaterial(material, style));
        return;
      }

      mesh.material = this.createStyledMaterial(mesh.material, style);
    });
  }

  private createStyledMaterial(
    material: THREE.Material,
    style: NonNullable<ModelDefinition['materialStyle']>
  ): THREE.Material {
    const styledMaterial = material.clone() as THREE.MeshStandardMaterial;

    if (style.color) {
      styledMaterial.color?.set(style.color);
    }

    if (style.emissive) {
      styledMaterial.emissive?.set(style.emissive);
    }

    if (typeof style.metalness === 'number') {
      styledMaterial.metalness = style.metalness;
    }

    if (typeof style.roughness === 'number') {
      styledMaterial.roughness = style.roughness;
    }

    styledMaterial.needsUpdate = true;
    return styledMaterial;
  }

  private applyTypeStyle(mesh: THREE.Mesh, type: ModelKey): void {
    if (type === 'chest') {
      mesh.scale.set(1.2, 0.8, 0.8);
      mesh.material = new THREE.MeshStandardMaterial({ color: '#8f5a2f' });
      return;
    }

    if (type === 'npc') {
      mesh.scale.set(0.9, 1.8, 0.9);
      mesh.material = new THREE.MeshStandardMaterial({ color: '#4b6cb7' });
    }
  }
}





























