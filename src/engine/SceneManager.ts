import * as THREE from 'three';

export class SceneManager {
  readonly scene = new THREE.Scene();

  constructor() {
    this.scene.background = new THREE.Color('#7aa2cc');
    this.setupLights();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    this.scene.add(ambient, sun);
  }
}
