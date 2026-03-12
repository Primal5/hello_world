import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ENABLE_SHADOWS } from './lighting';

interface CachedModel {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export class AssetLoader {
  private readonly gltfLoader = new GLTFLoader();
  private readonly modelCache = new Map<string, Promise<CachedModel>>();

  constructor(private readonly maxAnisotropy = 1) {}

  async loadModel(path: string): Promise<THREE.Object3D> {
    try {
      const cached = await this.loadAndCache(path);
      return clone(cached.scene);
    } catch {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: '#b56d3b' })
      );
      fallback.castShadow = ENABLE_SHADOWS;
      fallback.receiveShadow = ENABLE_SHADOWS;
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

      mesh.castShadow = ENABLE_SHADOWS;
      mesh.receiveShadow = ENABLE_SHADOWS;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        this.prepareMaterial(material);
      }
    });
  }

  private prepareMaterial(material: THREE.Material): void {
    const standardMaterial = material as THREE.MeshStandardMaterial;

    this.prepareTexture(standardMaterial.map, { colorTexture: true });
    this.prepareTexture(standardMaterial.emissiveMap, { colorTexture: true });
    this.prepareTexture(standardMaterial.normalMap);
    this.prepareTexture(standardMaterial.metalnessMap);
    this.prepareTexture(standardMaterial.roughnessMap);
    this.prepareTexture(standardMaterial.aoMap);
    this.prepareTexture(standardMaterial.alphaMap);
    this.prepareTexture(standardMaterial.bumpMap);

    material.needsUpdate = true;
  }

  private prepareTexture(
    texture: THREE.Texture | null,
    options: { colorTexture?: boolean } = {}
  ): void {
    if (!texture) {
      return;
    }

    if (options.colorTexture) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }

    texture.anisotropy = this.maxAnisotropy;

    const image = texture.image as {
      width?: number;
      height?: number;
      videoWidth?: number;
      videoHeight?: number;
    } | undefined;
    const width = image?.width ?? image?.videoWidth;
    const height = image?.height ?? image?.videoHeight;

    if (!width || !height) {
      return;
    }

    const isPowerOfTwo = THREE.MathUtils.isPowerOfTwo(width) && THREE.MathUtils.isPowerOfTwo(height);
    if (!isPowerOfTwo) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
    }
  }
}
