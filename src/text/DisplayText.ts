export const DISPLAY_TEXT = {
  ui: {
    inventory: {
      ariaLabel: 'Inventaire du joueur',
      equipment: 'Équipement',
      title: 'Inventaire',
      emptyBag: 'Votre sac est vide.',
      emptyHint: "Fouillez le coffre près de l'entrée pour récupérer la clé.",
      closeHint: 'Appuyez sur I ou Échap pour fermer.',
      itemCount: (count: number) => `${count} objet${count > 1 ? 's' : ''}`
    },
    prompt: {
      interact: (label: string) => `Appuyez sur E pour ${label}`,
      openInventory: "Appuyez sur I pour ouvrir l'inventaire."
    },
    log: {
      welcome: 'Bienvenue dans la démo FPS/RPG !'
    },
    hud: {
      healthAria: (current: number, max: number) => `Points de vie : ${current} sur ${max}`,
      healthShort: 'PV'
    }
  },
  world: {
    chest: {
      interactLabel: 'ouvrir le coffre',
      obtainedItem: (name: string) => `Vous obtenez : ${name}`
    },
    npc: {
      interactLabel: 'parler au PNJ',
      prefix: 'PNJ'
    },
    door: {
      entranceInteractLabel: "ouvrir ou fermer l'entrée",
      interactLabel: 'ouvrir ou fermer la porte',
      entranceLocked: "L'entrée est verrouillée. Il faut une clé.",
      locked: 'La porte est verrouillée.',
      entranceClosing: "L'entrée se referme.",
      closing: 'La porte se referme.',
      entranceOpening: "L'entrée s'ouvre.",
      opening: 'La porte s\'ouvre.'
    }
  },
  items: {
    rustyKey: {
      name: 'Clé rouillée',
      description: 'Une vieille clé qui semble ouvrir une porte ancienne.',
      category: 'Objet de quête'
    }
  },
  dialogues: {
    npcGuardHint: 'La clé ouvre la vieille porte.'
  }
} as const;

export function toDisplayText(value: string): string {
  return value.normalize('NFC');
}

export function toDisplayUpper(value: string): string {
  return toDisplayText(value).toLocaleUpperCase('fr-FR');
}

export function toDisplayLower(value: string): string {
  return toDisplayText(value).toLocaleLowerCase('fr-FR');
}
