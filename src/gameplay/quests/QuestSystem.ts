export class QuestSystem {
  private activeQuests = new Set<string>();

  startQuest(id: string): void {
    this.activeQuests.add(id);
  }

  hasQuest(id: string): boolean {
    return this.activeQuests.has(id);
  }
}
