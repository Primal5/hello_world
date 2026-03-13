import { DISPLAY_TEXT } from '../text/DisplayText';

export const itemData = [
  {
    id: 'rusty_key',
    name: DISPLAY_TEXT.items.rustyKey.name,
    description: DISPLAY_TEXT.items.rustyKey.description,
    rarity: 'quest',
    category: DISPLAY_TEXT.items.rustyKey.category
  },
  {
    id: 'bronze_key',
    name: DISPLAY_TEXT.items.bronzeKey.name,
    description: DISPLAY_TEXT.items.bronzeKey.description,
    rarity: 'quest',
    category: DISPLAY_TEXT.items.bronzeKey.category
  },
  {
    id: 'silver_key',
    name: DISPLAY_TEXT.items.silverKey.name,
    description: DISPLAY_TEXT.items.silverKey.description,
    rarity: 'quest',
    category: DISPLAY_TEXT.items.silverKey.category
  },
  {
    id: 'gold_key',
    name: DISPLAY_TEXT.items.goldKey.name,
    description: DISPLAY_TEXT.items.goldKey.description,
    rarity: 'quest',
    category: DISPLAY_TEXT.items.goldKey.category
  }
] as const;
