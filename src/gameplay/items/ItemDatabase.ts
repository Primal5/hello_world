import type { Item } from './Item';
import { itemData } from '../../data/items';

export class ItemDatabase {
  private readonly items: Map<string, Item>;

  constructor() {
    this.items = new Map(itemData.map((item) => [item.id, item]));
  }

  getById(id: string): Item | undefined {
    return this.items.get(id);
  }
}
