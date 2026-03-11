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

    const match = hits.find((hit) => hit.distance <= maxDistance);
    if (!match) return null;

    const owner = interactables.find(
      (interactable) =>
        interactable.object3D === match.object || interactable.object3D.children.includes(match.object)
    );

    return owner ?? null;
  }
}
