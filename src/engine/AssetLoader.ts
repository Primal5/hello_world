import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface CachedModel {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export interface AssetLoaderOptions {
  maxAnisotropy?: number;
  isWebGL2?: boolean;
}

export class AssetLoader {
  private readonly gltfLoader = new GLTFLoader();
  private readonly modelCache = new Map<string, Promise<CachedModel>>();
  private readonly maxAnisotropy: number;
  private readonly isWebGL2: boolean;

  constructor(options: AssetLoaderOptions | number = {}) {
    const normalizedOptions =
      typeof options === 'number'
        ? { maxAnisotropy: options }
        : options;

    this.maxAnisotropy = Number.isFinite(normalizedOptions.maxAnisotropy)
      ? Math.max(1, Math.floor(normalizedOptions.maxAnisotropy ?? 1))
      : 1;
    this.isWebGL2 = normalizedOptions.isWebGL2 ?? false;
  }

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
