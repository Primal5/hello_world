import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function assertContains(content, needle, message, failures) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
}

const itemVisuals = read('src/gameplay/items/ItemVisuals.ts');
const inventoryPanel = read('src/ui/inventory/InventoryPanel.tsx');
const levelLoader = read('src/engine/LevelLoader.ts');
const eventFeed = read('src/ui/hud/EventFeed.tsx');
const journal = read('src/ui/hud/Journal.tsx');
const dialogueWindow = read('src/ui/hud/DialogueWindow.tsx');
const uiStore = read('src/ui/store/uiStore.ts');
const css = read('src/styles/ui.css');
const dialogues = read('src/data/dialogues.ts');

const failures = [];
const rarityColors = {
  junk: '#8d99ae',
  common: '#f5f7fb',
  magic: '#72b8ff',
  rare: '#ffd76a',
  epic: '#be8cff',
  legendary: '#ff9b47',
  artifact: '#ff6b5f',
  quest: '#4ef2d2'
};

assertContains(
  itemVisuals,
  'const ITEM_RARITY_THEMES: Record<ItemRarity, ItemRarityTheme> = {',
  'Item visuals must define rarity themes from the shared rarity map.',
  failures
);
for (const [rarity, color] of Object.entries(rarityColors)) {
  assertContains(
    itemVisuals,
    `${rarity}: {`,
    `Item visuals must keep the ${rarity} rarity theme.`,
    failures
  );
  assertContains(
    itemVisuals,
    `color: '${color}'`,
    `The ${rarity} rarity color must stay aligned with the applied UI color code.`,
    failures
  );
}
assertContains(
  itemVisuals,
  "return ITEM_RARITY_THEMES[rarity];",
  'Item visuals service must keep rarity lookup centralized.',
  failures
);
assertContains(
  itemVisuals,
  "'--item-accent': tone.color",
  'Item visuals service must keep exporting the rarity accent color to CSS variables.',
  failures
);
assertContains(
  itemVisuals,
  "'--item-accent-border': tone.borderColor",
  'Item visuals service must keep exporting the rarity border color to CSS variables.',
  failures
);
assertContains(
  itemVisuals,
  "'--item-accent-bg': tone.background",
  'Item visuals service must keep exporting the rarity background to CSS variables.',
  failures
);

assertContains(
  inventoryPanel,
  'const rarityTheme = ItemVisualsService.getRarityTheme(item.rarity);',
  'Inventory panel must use the rarity theme for item colors.',
  failures
);
assertContains(
  inventoryPanel,
  'style={ItemVisualsService.toCssVariables(rarityTheme)}',
  'Inventory panel icon must be styled with the rarity theme.',
  failures
);
assertContains(
  inventoryPanel,
  'style={{ color: rarityTheme.color }}',
  'Inventory panel item name must use the rarity theme color.',
  failures
);
assertContains(
  inventoryPanel,
  '? ItemVisualsService.toCssVariables(categoryTheme)',
  'Inventory panel category badges must keep using the shared visual theme pipeline.',
  failures
);

assertContains(
  levelLoader,
  'const rarityTheme = ItemVisualsService.getRarityTheme(item.rarity);',
  'Chest rewards must use rarity highlight colors.',
  failures
);
assertContains(
  levelLoader,
  'color: ItemVisualsService.getRarityTheme(requiredItem.rarity).color',
  'NPC hint highlights must use rarity colors.',
  failures
);
assertContains(
  dialogues,
  'DISPLAY_TEXT.dialogues.npcGuardHint(DISPLAY_TEXT.items.rustyKey.name)',
  'NPC hint text must reference the rusty key to match the highlighted required item.',
  failures
);
assertContains(
  levelLoader,
  'context.journal({',
  'NPC and item journal entries must preserve highlight payloads.',
  failures
);
assertContains(
  uiStore,
  'highlights: journalEntry.highlights',
  'Journal duplicates must be able to recover highlight colors.',
  failures
);
assertContains(
  levelLoader,
  'const rarityTheme = ItemVisualsService.getRarityTheme(usedItem.rarity);',
  'Used item journal entries must use rarity highlight colors.',
  failures
);
assertContains(
  levelLoader,
  'highlights: [{ text: usedItem.name, color: rarityTheme.color }]',
  'Used item journal entries must preserve rarity highlight colors.',
  failures
);

assertContains(
  uiStore,
  'color: string;',
  'UI highlight payloads must preserve color information.',
  failures
);
assertContains(
  eventFeed,
  'style={{ color: highlight.color }}',
  'Event feed must render highlight colors.',
  failures
);
assertContains(
  journal,
  'style={{ color: highlight.color }}',
  'Journal must render highlight colors.',
  failures
);
assertContains(
  dialogueWindow,
  'style={{ color: highlight.color }}',
  'Dialogue window must render highlight colors.',
  failures
);
assertContains(
  eventFeed,
  "className=\"event-feed__highlight\"",
  'Event feed must keep dedicated markup for colored item highlights.',
  failures
);
assertContains(
  journal,
  "className=\"event-log__highlight\"",
  'Journal must keep dedicated markup for colored item highlights.',
  failures
);
assertContains(
  dialogueWindow,
  "className=\"dialogue-window__highlight\"",
  'Dialogue window must keep dedicated markup for colored item highlights.',
  failures
);
assertContains(
  dialogueWindow,
  'const missingHighlights = highlights.filter((_, index) => !matchedHighlights.has(index));',
  'Dialogue window must keep a fallback path when a highlight cannot be matched in the message.',
  failures
);
assertContains(
  journal,
  'const missingHighlights = entry.highlights.filter((_, index) => !matchedHighlights.has(index));',
  'Journal must keep a fallback path when a highlight cannot be matched in the message.',
  failures
);
assertContains(
  css,
  '.dialogue-window__highlight {',
  'Dialogue window highlight styling must exist.',
  failures
);
assertContains(
  css,
  '.event-log__highlight {',
  'Journal highlight styling must exist.',
  failures
);
assertContains(
  css,
  'text-shadow: 0 0 12px currentColor;',
  'Highlight styling must keep visible glow in journal and dialogue UI.',
  failures
);

if (failures.length > 0) {
  console.error('Item UI color regression check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Item UI color regression check passed.');
