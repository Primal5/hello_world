export const DISPLAY_TEXT = {
  ui: {
    inventory: {
      ariaLabel: 'Inventaire du joueur',
      equipment: 'Équipement',
      title: 'Inventaire',
      closeButtonLabel: "Fermer l'inventaire",
      currency: {
        goldShort: 'PO',
        silverShort: 'PA',
        copperShort: 'PC'
      },
      emptyBag: 'Votre sac est vide.',
      emptyHint: "Trouvez les coffres pour récupérer les clés de progression.",
      closeHint: 'Appuyez sur I ou Tab pour fermer.',
      itemCount: (count: number) => `${count} objet${count > 1 ? 's' : ''}`
    },
    pause: {
      label: 'En pause',
      toggleKeyCodes: ['KeyP', 'Pause']
    },
    prompt: {
      interact: (label: string) => `Appuyez sur E pour ${label}`,
      openInventory: "Appuyez sur I ou Tab pour ouvrir l'inventaire.",
      inventoryKeyCodes: ['KeyI', 'Tab'],
      acknowledgeKeyCode: 'Enter',
      acknowledgeLabel: 'Compris !'
    },
    log: {
      welcome: 'Bienvenue dans la démo FPS/RPG.'
    },
    hud: {
      healthAria: (current: number, max: number) => `Points de vie : ${current} sur ${max}`,
      healthShort: 'PV'
    }
  },
  world: {
    chest: {
      interactLabel: 'ouvrir le coffre',
      empty: 'Le coffre est vide.',
      obtainedItem: (name: string) => `Vous obtenez : ${name}.`
    },
    item: {
      used: (name: string) => `${name} utilisée.`,
      usedOnDoor: (name: string, doorName: string) => `${name} utilisée sur la ${doorName}.`
    },
    npc: {
      interactLabel: 'parler au garde du didacticiel',
      prefix: 'Garde du didacticiel'
    },
    door: {
      entranceInteractLabel: "ouvrir ou fermer l'entrée",
      interactLabel: 'ouvrir ou fermer la porte',
      interactNamedLabel: (doorName: string) => `ouvrir ou fermer la ${doorName}`,
      entranceLocked: "L'entrée est verrouillée. Il faut une clé.",
      entranceLockedItem: (name: string) => `L'entrée est verrouillée. Il faut ${name}.`,
      locked: 'La porte est verrouillée.',
      lockedNamedItem: (doorName: string, itemName: string) => `La ${doorName} est verrouillée. Il faut ${itemName}.`,
      entranceClosing: "L'entrée se referme.",
      closing: 'La porte se referme.',
      closingNamed: (doorName: string) => `La ${doorName} se referme.`,
      entranceOpening: "L'entrée s'ouvre.",
      opening: "La porte s'ouvre.",
      openingNamed: (doorName: string) => `La ${doorName} s'ouvre.`
    }
  },
  items: {
    rustyKey: {
      name: 'Clé rouillée',
      description: "Ouvre la porte d'entrée vers le secteur de départ.",
      category: 'Objet de quête'
    },
    bronzeKey: {
      name: 'Clé de bronze',
      description: 'Ouvre la porte vers le secteur bronze.',
      category: 'Objet de quête'
    },
    silverKey: {
      name: "Clé d'argent",
      description: 'Ouvre la porte vers la zone argent.',
      category: 'Objet de quête'
    },
    goldKey: {
      name: "Clé d'or",
      description: 'Ouvre la porte vers la zone or.',
      category: 'Objet de quête'
    }
  },
  dialogues: {
    npcGuardHint: (itemName: string) => `Il vous faut ${itemName} pour ouvrir la porte d'entrée.\nElle se trouve dans le coffre.`
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
