import * as THREE from 'three';
import { SceneManager } from './SceneManager';

export class World {
  readonly sceneManager = new SceneManager();
  readonly camera: THREE.PerspectiveCamera;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 200);
  }

  get scene(): THREE.Scene {
    return this.sceneManager.scene;
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
