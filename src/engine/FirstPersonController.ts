import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Config';
import { InputManager } from '../core/InputManager';
import type { Player } from '../gameplay/player/Player';
import { useUiStore } from '../ui/store/uiStore';
import { CollisionWorld } from './CollisionWorld';

export class FirstPersonController {
  private yaw: number;
  private pitch: number;
  private readonly up = new THREE.Vector3(0, 1, 0);
  private pointerLocked = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly player: Player,
    private readonly input: InputManager,
    private readonly collisionWorld: CollisionWorld,
    private readonly canvas: HTMLCanvasElement,
    initialYaw = 0,
    initialPitch = 0
  ) {
    this.yaw = initialYaw;
    this.pitch = initialPitch;
    this.bindPointerLock();
    this.camera.rotation.order = 'YXZ';
    this.syncCameraTransform();
  }

  dispose(): void {
    this.canvas.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
  }

  update(delta: number): void {
    const moveDir = new THREE.Vector3();
    if (this.input.isPressed('KeyW')) moveDir.z -= 1;
    if (this.input.isPressed('KeyS')) moveDir.z += 1;
    if (this.input.isPressed('KeyA')) moveDir.x -= 1;
    if (this.input.isPressed('KeyD')) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3().crossVectors(forward, this.up).normalize();
      const movement = new THREE.Vector3()
        .addScaledVector(forward, -moveDir.z)
        .addScaledVector(right, moveDir.x)
        .multiplyScalar(GAME_CONFIG.player.moveSpeed * delta);

      const nextPosition = this.collisionWorld.move(this.player.position, movement, GAME_CONFIG.player.radius, GAME_CONFIG.player.height);
      this.player.position.copy(nextPosition);
    }

    if (this.input.isPressed('Space') && this.player.isGrounded) {
      this.player.velocity.y = GAME_CONFIG.player.jumpVelocity;
      this.player.isGrounded = false;
    }

    this.player.velocity.y -= GAME_CONFIG.player.gravity * delta;
    this.player.position.y += this.player.velocity.y * delta;

    const clamped = this.collisionWorld.clampVertical(
      this.player.position.y,
      GAME_CONFIG.player.height,
      this.player.position.x,
      this.player.position.z,
      GAME_CONFIG.player.radius
    );
    this.player.position.y = clamped.y;
    if (clamped.hitCeiling && this.player.velocity.y > 0) {
      this.player.velocity.y = 0;
    }

    if (clamped.grounded) {
      this.player.velocity.y = 0;
      this.player.isGrounded = true;
    } else if (!clamped.hitCeiling) {
      this.player.isGrounded = false;
    }

    this.syncCameraTransform();
  }

  requestPointerLock(): void {
    if (document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock();
    }
  }

  exitPointerLock(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  private syncCameraTransform(): void {
    this.camera.position.copy(this.player.position);
    this.camera.position.y += GAME_CONFIG.player.eyeOffset;
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private bindPointerLock(): void {
    this.canvas.addEventListener('click', this.onCanvasClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  private readonly onCanvasClick = (): void => {
    if (useUiStore.getState().dialogueBox) {
      return;
    }

    this.requestPointerLock();
  };

  private readonly onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.yaw -= event.movementX * 0.002;
    this.pitch -= event.movementY * 0.002;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
  };
}

