export class CollisionWorld {
  readonly groundY = 0;

  clampToGround(playerHeight: number, y: number): { y: number; grounded: boolean } {
    if (y <= this.groundY + playerHeight) {
      return { y: this.groundY + playerHeight, grounded: true };
    }

    return { y, grounded: false };
  }
}
