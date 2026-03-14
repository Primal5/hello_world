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
  private isCrouching = false;
  private isSprinting = false;
  private playerHeight: number = GAME_CONFIG.player.height;
  private eyeOffset: number = GAME_CONFIG.player.eyeOffset;

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
    this.updateCrouchState();
    this.isSprinting = false;

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
      const isSprinting =
        !this.isCrouching &&
        (this.input.isPressed('ShiftLeft') || this.input.isPressed('ShiftRight'));
      this.isSprinting = isSprinting;
      const moveSpeed = this.isCrouching
        ? GAME_CONFIG.player.crouchMoveSpeed
        : isSprinting
          ? GAME_CONFIG.player.sprintSpeed
          : GAME_CONFIG.player.moveSpeed;

      const right = new THREE.Vector3().crossVectors(forward, this.up).normalize();
      const movement = new THREE.Vector3()
        .addScaledVector(forward, -moveDir.z)
        .addScaledVector(right, moveDir.x)
        .multiplyScalar(moveSpeed * delta);

      const nextPosition = this.collisionWorld.move(
        this.player.position,
        movement,
        GAME_CONFIG.player.radius,
        this.playerHeight
      );
      this.player.position.copy(nextPosition);
    }

    if (!this.isCrouching && this.input.isPressed('Space') && this.player.isGrounded) {
      this.player.velocity.y = GAME_CONFIG.player.jumpVelocity;
      this.player.isGrounded = false;
    }

    this.player.velocity.y -= GAME_CONFIG.player.gravity * delta;
    this.player.position.y += this.player.velocity.y * delta;

    const clamped = this.collisionWorld.clampVertical(
      this.player.position.y,
      this.playerHeight,
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

    this.syncCameraTransform(delta);
  }

  getIsSprinting(): boolean {
    return this.isSprinting;
  }

  getIsCrouching(): boolean {
    return this.isCrouching;
  }

  getIsJumping(): boolean {
    return !this.player.isGrounded;
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

  private syncCameraTransform(delta = 1): void {
    const targetEyeOffset = this.isCrouching
      ? GAME_CONFIG.player.crouchEyeOffset
      : GAME_CONFIG.player.eyeOffset;
    const interpolation = Math.min(1, delta * GAME_CONFIG.player.crouchTransitionSpeed);
    this.eyeOffset = THREE.MathUtils.lerp(this.eyeOffset, targetEyeOffset, interpolation);
    this.camera.position.copy(this.player.position);
    this.camera.position.y += this.eyeOffset;
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private updateCrouchState(): void {
    const wantsCrouch =
      this.input.isPressed('ControlLeft') || this.input.isPressed('ControlRight');
    const canStand = this.collisionWorld.canOccupy(
      this.player.position.x,
      this.player.position.z,
      this.player.position.y,
      GAME_CONFIG.player.radius,
      GAME_CONFIG.player.height
    );

    this.isCrouching = wantsCrouch || !canStand;
    this.playerHeight = this.isCrouching
      ? GAME_CONFIG.player.crouchHeight
      : GAME_CONFIG.player.height;
  }

  private bindPointerLock(): void {
    this.canvas.addEventListener('click', this.onCanvasClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  private readonly onCanvasClick = (): void => {
    const uiState = useUiStore.getState();
    if (uiState.dialogueBox || uiState.isInventoryOpen || uiState.isJournalOpen || uiState.isPaused) {
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

