export type ItemRarity = 'junk' | 'common' | 'magic' | 'rare' | 'epic' | 'legendary' | 'artifact' | 'quest';

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  category?: string;
}