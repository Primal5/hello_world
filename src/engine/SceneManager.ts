import * as THREE from 'three';
import { ENABLE_SHADOWS } from './lighting';

export class SceneManager {
  readonly scene = new THREE.Scene();

  constructor() {
    const skyColor = new THREE.Color('#7aa2cc');
    const fogColor = new THREE.Color('#000000');
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(fogColor, 0.072);
    this.setupLights();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 5);
    sun.castShadow = ENABLE_SHADOWS;
    this.scene.add(ambient, sun);
  }
}
