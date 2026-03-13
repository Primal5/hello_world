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

  remove(itemId: string): boolean {
    const index = this.itemIds.indexOf(itemId);
    if (index === -1) {
      return false;
    }

    this.itemIds.splice(index, 1);
    return true;
  }

  getAll(): string[] {
    return [...this.itemIds];
  }
}