import * as THREE from 'three';

export class Renderer {
  readonly instance: THREE.WebGLRenderer;

  constructor(private readonly container: HTMLElement) {
    this.instance = new THREE.WebGLRenderer({ antialias: true });
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.instance.setSize(container.clientWidth, container.clientHeight);
    this.instance.shadowMap.enabled = true;
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1;
    container.appendChild(this.instance.domElement);
  }

  resize(width: number, height: number): void {
    this.instance.setSize(width, height);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.render(scene, camera);
  }

  dispose(): void {
    this.instance.dispose();
    this.instance.domElement.remove();
  }
}
