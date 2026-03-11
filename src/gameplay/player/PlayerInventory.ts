export class PlayerInventory {
  private readonly itemIds: string[] = [];

  add(itemId: string): boolean {
    if (this.itemIds.includes(itemId)) {
      return false;
    }
    this.itemIds.push(itemId);
    return true;
  }

  has(itemId: string): boolean {
    return this.itemIds.includes(itemId);
  }

  getAll(): string[] {
    return [...this.itemIds];
  }
}
