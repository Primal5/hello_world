export type TickFn = (delta: number) => void;

export class GameLoop {
  private running = false;
  private previousTime = 0;

  constructor(private readonly onTick: TickFn) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.previousTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
  }

  private loop = (time: number): void => {
    if (!this.running) return;

    const delta = Math.min((time - this.previousTime) / 1000, 0.05);
    this.previousTime = time;
    this.onTick(delta);

    requestAnimationFrame(this.loop);
  };
}
