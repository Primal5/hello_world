import type * as THREE from 'three';
import type { InteractionContext } from './InteractionSystem';

export interface Interactable {
  id: string;
  label: string;
  object3D: THREE.Object3D;
  canInteract: (context: InteractionContext) => boolean;
  interact: (context: InteractionContext) => void;
}
