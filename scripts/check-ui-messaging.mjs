import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assertContains(content, needle, message, failures) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
}

const app = read('src/ui/App.tsx');
const prompt = read('src/ui/hud/InteractionPrompt.tsx');
const actionBar = read('src/ui/hud/ActionBar.tsx');
const eventFeed = read('src/ui/hud/EventFeed.tsx');
const dialogueWindow = read('src/ui/hud/DialogueWindow.tsx');
const journal = read('src/ui/hud/Journal.tsx');
const store = read('src/ui/store/uiStore.ts');
const interactionSystem = read('src/gameplay/interaction/InteractionSystem.ts');
const game = read('src/core/Game.ts');
const levelLoader = read('src/engine/LevelLoader.ts');
const css = read('src/styles/ui.css');

const failures = [];

assertContains(app, '<InteractionPrompt />', 'App must render InteractionPrompt.', failures);
assertContains(app, '<ActionBar />', 'App must render ActionBar.', failures);
assertContains(app, '<EventFeed />', 'App must render EventFeed.', failures);
assertContains(app, '<DialogueWindow />', 'App must render DialogueWindow.', failures);
assertContains(app, '<Journal />', 'App must render Journal.', failures);
assertContains(actionBar, 'aria-label="Barre d\'action"', 'ActionBar must expose the action bar label.', failures);
assertContains(actionBar, "'\\u2070'", 'ActionBar must keep the 0 superscript slot.', failures);
assertContains(prompt, 'interaction-prompt', 'InteractionPrompt must keep its HUD hook.', failures);
assertContains(store, 'eventMessages:', 'UI store must expose ephemeral event messages.', failures);
assertContains(store, 'journalEntries:', 'UI store must expose permanent journal entries.', failures);
assertContains(store, 'dialogueBox:', 'UI store must expose the dialogue box state.', failures);
assertContains(store, "mode: 'acknowledgment' | 'choice'", 'Dialogue box must support acknowledgment and choice modes.', failures);
assertContains(store, 'pushEventMessage', 'UI store must expose pushEventMessage.', failures);
assertContains(store, 'addJournalEntry', 'UI store must expose addJournalEntry.', failures);
assertContains(store, 'openDialogue', 'UI store must expose openDialogue.', failures);
assertContains(game, 'event: (entry:', 'Game must route gameplay feedback to the event feed.', failures);
assertContains(game, 'journal: (entry:', 'Game must route permanent discoveries to the journal.', failures);
assertContains(game, 'acknowledge: (', 'Game must support acknowledgment dialogue mode.', failures);
assertContains(game, 'choose: (', 'Game must support choice dialogue mode.', failures);
assertContains(game, 'this.controller.exitPointerLock();', 'Choice dialogues must release pointer lock.', failures);
assertContains(game, "dialogueBox?.mode === 'acknowledgment'", 'Acknowledgment mode must be confirmable from keyboard flow.', failures);
assertContains(interactionSystem, 'if (useUiStore.getState().dialogueBox)', 'Interaction system must block gameplay interactions while dialogue is open.', failures);
assertContains(levelLoader, 'context.event(', 'Gameplay consequences must use the event feed.', failures);
assertContains(levelLoader, 'context.acknowledge(', 'Narrative PNJ interactions must use the dialogue box.', failures);
assertContains(levelLoader, 'context.journal(', 'Important discoveries must be copied to the journal.', failures);
assertContains(eventFeed, 'event-feed__message', 'EventFeed must render event feed messages.', failures);
assertContains(eventFeed, 'event-feed__highlight', 'EventFeed must support highlighted item names.', failures);
assertContains(dialogueWindow, 'dialogue-window__button', 'DialogueWindow must render acknowledgment actions.', failures);
assertContains(dialogueWindow, 'dialogue-window__choice', 'DialogueWindow must render choice actions.', failures);
assertContains(dialogueWindow, 'dialogue-window__highlight', 'DialogueWindow must support highlighted item names.', failures);
assertContains(journal, '<h3>Journal</h3>', 'Journal component must keep the Journal heading.', failures);
assertContains(css, '.event-feed', 'CSS must style the event feed.', failures);
assertContains(css, '.event-feed__highlight', 'CSS must style highlighted event item names.', failures);
assertContains(css, '@keyframes event-message-fade', 'CSS must animate ephemeral event messages.', failures);
assertContains(css, '.dialogue-window__choices', 'CSS must style dialogue choices.', failures);
assertContains(css, '.dialogue-window__highlight', 'CSS must style highlighted dialogue item names.', failures);
assertContains(css, '.event-log__entry--dialogue', 'CSS must highlight journal dialogue reminders.', failures);
assertContains(css, '.action-bar', 'CSS must style the action bar.', failures);

if (failures.length > 0) {
  console.error('UI messaging regression check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('UI messaging regression check passed.');
