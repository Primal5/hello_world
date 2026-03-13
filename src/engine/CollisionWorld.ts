import * as THREE from 'three';

interface CollisionRect {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export class CollisionWorld {
  readonly groundY = 0;
  private ceilingY = 4;
  private readonly obstacles = new Map<string, CollisionRect>();

  setCeiling(y: number): void {
    this.ceilingY = y;
  }

  setObstacle(id: string, center: THREE.Vector3, size: THREE.Vector3): void {
    this.obstacles.set(id, {
      id,
      minX: center.x - size.x / 2,
      maxX: center.x + size.x / 2,
      minY: center.y - size.y / 2,
      maxY: center.y + size.y / 2,
      minZ: center.z - size.z / 2,
      maxZ: center.z + size.z / 2
    });
  }

  removeObstacle(id: string): void {
    this.obstacles.delete(id);
  }

  move(position: THREE.Vector3, movement: THREE.Vector3, radius: number, playerHeight: number): THREE.Vector3 {
    const next = position.clone();

    const candidateX = next.x + movement.x;
    if (!this.collides(candidateX, next.z, next.y, radius, playerHeight)) {
      next.x = candidateX;
    }

    const candidateZ = next.z + movement.z;
    if (!this.collides(next.x, candidateZ, next.y, radius, playerHeight)) {
      next.z = candidateZ;
    }

    return next;
  }

  clampVertical(
    y: number,
    playerHeight: number,
    x: number,
    z: number,
    radius: number
  ): { y: number; grounded: boolean; hitCeiling: boolean } {
    if (y <= this.groundY) {
      return { y: this.groundY, grounded: true, hitCeiling: false };
    }

    let maxFeetY = this.ceilingY - playerHeight;

    for (const obstacle of this.obstacles.values()) {
      if (!this.intersectsCircle(x, z, radius, obstacle)) {
        continue;
      }

      // If the player is below an overhang, its underside becomes the local ceiling.
      if (y < obstacle.minY && y + playerHeight > obstacle.minY) {
        maxFeetY = Math.min(maxFeetY, obstacle.minY - playerHeight);
      }
    }

    if (y >= maxFeetY) {
      return { y: maxFeetY, grounded: false, hitCeiling: true };
    }

    return { y, grounded: false, hitCeiling: false };
  }

  private collides(x: number, z: number, y: number, radius: number, playerHeight: number): boolean {
    for (const obstacle of this.obstacles.values()) {
      if (!this.intersectsCircle(x, z, radius, obstacle)) {
        continue;
      }

      if (this.overlapsVertical(y, playerHeight, obstacle)) {
        return true;
      }
    }

    return false;
  }

  private overlapsVertical(y: number, playerHeight: number, obstacle: CollisionRect): boolean {
    const minY = y;
    const maxY = y + playerHeight;
    return maxY > obstacle.minY && minY < obstacle.maxY;
  }

  private intersectsCircle(x: number, z: number, radius: number, obstacle: CollisionRect): boolean {
    const closestX = Math.max(obstacle.minX, Math.min(x, obstacle.maxX));
    const closestZ = Math.max(obstacle.minZ, Math.min(z, obstacle.maxZ));
    const dx = x - closestX;
    const dz = z - closestZ;
    return dx * dx + dz * dz < radius * radius;
  }
}
