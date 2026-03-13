import { Fragment, type ReactNode } from 'react';
import { useUiStore, type JournalHighlight } from '../store/uiStore';

function renderDialogueMessage(message: string, highlights?: JournalHighlight[]): ReactNode {
  if (!highlights || highlights.length === 0) {
    return message;
  }

  const segments: ReactNode[] = [];
  let cursor = 0;
  const matchedHighlights = new Set<number>();

  for (const [highlightIndex, highlight] of highlights.entries()) {
    const index = message.indexOf(highlight.text, cursor);
    if (index === -1) {
      continue;
    }

    if (index > cursor) {
      segments.push(<Fragment key={`text-${cursor}`}>{message.slice(cursor, index)}</Fragment>);
    }

    const end = index + highlight.text.length;
    segments.push(
      <span
        className="dialogue-window__highlight"
        key={`highlight-${index}-${highlight.text}`}
        style={{ color: highlight.color }}
      >
        {highlight.text}
      </span>
    );
    cursor = end;
    matchedHighlights.add(highlightIndex);
  }

  if (cursor < message.length) {
    segments.push(<Fragment key={`text-${cursor}`}>{message.slice(cursor)}</Fragment>);
  }

  const missingHighlights = highlights.filter((_, index) => !matchedHighlights.has(index));
  if (missingHighlights.length > 0) {
    if (segments.length === 0) {
      segments.push(<Fragment key="text-full">{message}</Fragment>);
    }

    segments.push(<Fragment key="fallback-gap"> </Fragment>);
    missingHighlights.forEach((highlight, index) => {
      segments.push(
        <span
          className="dialogue-window__highlight"
          key={`fallback-highlight-${index}-${highlight.text}`}
          style={{ color: highlight.color }}
        >
          {highlight.text}
        </span>
      );
    });
  }

  return segments;
}

export function DialogueWindow(): JSX.Element | null {
  const dialogueBox = useUiStore((state) => state.dialogueBox);
  const closeDialogue = useUiStore((state) => state.closeDialogue);

  if (!dialogueBox) {
    return null;
  }

  const handleConfirm = (): void => {
    dialogueBox.onConfirm?.();
    closeDialogue();
  };

  const handleChoice = (onSelect: () => void): void => {
    onSelect();
    closeDialogue();
  };

  return (
    <section className="dialogue-window" aria-label="Fenetre de discussion en cours">
      <p className="dialogue-window__speaker">{dialogueBox.speaker}</p>
      <p className="dialogue-window__message">
        {renderDialogueMessage(dialogueBox.message, dialogueBox.highlights)}
      </p>
      {dialogueBox.mode === 'acknowledgment' ? (
        <div className="dialogue-window__actions">
          <button
            className="dialogue-window__button dialogue-window__button--acknowledge"
            onClick={handleConfirm}
            type="button"
          >
            {dialogueBox.confirmLabel ?? 'OK'}
          </button>
        </div>
      ) : (
        <div className="dialogue-window__choices">
          {dialogueBox.choices?.map((choice) => (
            <button
              className="dialogue-window__choice"
              key={choice.id}
              onClick={() => handleChoice(choice.onSelect)}
              type="button"
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
