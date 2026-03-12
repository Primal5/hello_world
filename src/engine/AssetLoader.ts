import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface CachedModel {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export class AssetLoader {
  private readonly gltfLoader = new GLTFLoader();
  private readonly modelCache = new Map<string, Promise<CachedModel>>();

  async loadModel(path: string): Promise<THREE.Object3D> {
    try {
      const cached = await this.loadAndCache(path);
      return clone(cached.scene);
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

  private loadAndCache(path: string): Promise<CachedModel> {
    const cached = this.modelCache.get(path);
    if (cached) {
      return cached;
    }

    const pending = this.gltfLoader.loadAsync(path).then((gltf) => {
      this.prepareScene(gltf.scene);
      return {
        scene: gltf.scene,
        animations: gltf.animations
      };
    });

    this.modelCache.set(path, pending);
    return pending;
  }

  private prepareScene(root: THREE.Object3D): void {
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        this.prepareMaterial(material);
      }
    });
  }

  private prepareMaterial(material: THREE.Material): void {
    const standardMaterial = material as THREE.MeshStandardMaterial;

    if (standardMaterial.map) {
      standardMaterial.map.colorSpace = THREE.SRGBColorSpace;
    }

    if (standardMaterial.emissiveMap) {
      standardMaterial.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    }

    material.needsUpdate = true;
  }
}
