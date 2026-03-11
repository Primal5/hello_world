import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
  private gltfLoader = new GLTFLoader();

  async loadModel(path: string): Promise<THREE.Object3D> {
    try {
      const gltf = await this.gltfLoader.loadAsync(path);
      return gltf.scene;
    } catch {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: '#b56d3b' })
      );
      fallback.castShadow = true;
      fallback.receiveShadow = true;
      return fallback;
    }
  }
}
