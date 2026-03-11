import { dialogueData } from '../../data/dialogues';

export class DialogueSystem {
  getLine(dialogueId: string): string {
    return dialogueData[dialogueId] ?? '...';
  }
}
