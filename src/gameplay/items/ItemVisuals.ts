import type { CSSProperties } from 'react';
import type { ItemRarity } from './Item';

interface ItemTone {
  color: string;
  borderColor: string;
  background: string;
}

interface ItemRarityTheme extends ItemTone {
  label: string;
}

const ITEM_RARITY_THEMES: Record<ItemRarity, ItemRarityTheme> = {
  junk: {
    label: 'Dechets',
    color: '#8d99ae',
    borderColor: 'rgba(141, 153, 174, 0.34)',
    background: 'linear-gradient(180deg, rgba(80, 86, 98, 0.22), rgba(36, 40, 48, 0.18))'
  },
  common: {
    label: 'Commun',
    color: '#f5f7fb',
    borderColor: 'rgba(245, 247, 251, 0.32)',
    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(140, 149, 168, 0.10))'
  },
  magic: {
    label: 'Magique',
    color: '#72b8ff',
    borderColor: 'rgba(114, 184, 255, 0.36)',
    background: 'linear-gradient(180deg, rgba(57, 112, 197, 0.26), rgba(17, 37, 69, 0.18))'
  },
  rare: {
    label: 'Rare',
    color: '#ffd76a',
    borderColor: 'rgba(255, 215, 106, 0.36)',
    background: 'linear-gradient(180deg, rgba(167, 125, 28, 0.28), rgba(72, 49, 10, 0.18))'
  },
  epic: {
    label: 'Epique',
    color: '#be8cff',
    borderColor: 'rgba(190, 140, 255, 0.38)',
    background: 'linear-gradient(180deg, rgba(100, 54, 169, 0.30), rgba(44, 21, 77, 0.20))'
  },
  legendary: {
    label: 'Legendaire',
    color: '#ff9b47',
    borderColor: 'rgba(255, 155, 71, 0.40)',
    background: 'linear-gradient(180deg, rgba(166, 84, 19, 0.30), rgba(75, 34, 9, 0.20))'
  },
  artifact: {
    label: 'Artefact',
    color: '#ff6b5f',
    borderColor: 'rgba(255, 107, 95, 0.42)',
    background: 'linear-gradient(180deg, rgba(165, 39, 28, 0.32), rgba(88, 18, 14, 0.22))'
  },
  quest: {
    label: 'Objet de quete',
    color: '#4ef2d2',
    borderColor: 'rgba(78, 242, 210, 0.42)',
    background: 'linear-gradient(180deg, rgba(28, 130, 120, 0.28), rgba(11, 51, 48, 0.20))'
  }
};

const QUEST_CATEGORY_TONE: ItemTone = ITEM_RARITY_THEMES.quest;

export class ItemVisualsService {
  static getRarityTheme(rarity: ItemRarity): ItemRarityTheme {
    return ITEM_RARITY_THEMES[rarity];
  }

  static getCategoryTheme(category?: string): ItemTone | null {
    if (!category) {
      return null;
    }

    const normalized = category.trim().toLocaleLowerCase('fr-FR');
    if (normalized.includes('quete')) {
      return QUEST_CATEGORY_TONE;
    }

    return null;
  }

  static toCssVariables(tone: ItemTone): CSSProperties {
    return {
      '--item-accent': tone.color,
      '--item-accent-border': tone.borderColor,
      '--item-accent-bg': tone.background
    } as CSSProperties;
  }
}