import * as THREE from 'three';
import type { Interactable } from '../gameplay/interaction/Interactable';

export class RaycastInteractor {
  private readonly raycaster = new THREE.Raycaster();

  pick(camera: THREE.Camera, interactables: Interactable[], maxDistance: number): Interactable | null {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const hits = this.raycaster.intersectObjects(
      interactables.map((interactable) => interactable.object3D),
      true
    );

    for (const hit of hits) {
      if (hit.distance > maxDistance) continue;

      const owner = interactables.find((interactable) => this.belongsTo(hit.object, interactable.object3D));
      if (owner) {
        return owner;
      }
    }

    return null;
  }

  private belongsTo(object: THREE.Object3D, candidateRoot: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current === candidateRoot) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}
