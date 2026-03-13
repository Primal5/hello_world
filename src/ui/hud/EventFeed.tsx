import { Fragment, type ReactNode } from 'react';
import { useUiStore, type JournalHighlight, type UiEventMessage } from '../store/uiStore';

function renderEventMessage(entry: UiEventMessage): ReactNode {
  if (!entry.highlights || entry.highlights.length === 0) {
    return entry.message;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;

  entry.highlights.forEach((highlight: JournalHighlight, index: number) => {
    const start = entry.message.indexOf(highlight.text, cursor);
    if (start === -1) {
      return;
    }

    if (start > cursor) {
      parts.push(<Fragment key={`text-${index}`}>{entry.message.slice(cursor, start)}</Fragment>);
    }

    parts.push(
      <span className="event-feed__highlight" key={`highlight-${index}`} style={{ color: highlight.color }}>
        {highlight.text}
      </span>
    );

    cursor = start + highlight.text.length;
  });

  if (cursor < entry.message.length) {
    parts.push(<Fragment key="tail">{entry.message.slice(cursor)}</Fragment>);
  }

  return parts;
}

export function EventFeed(): JSX.Element | null {
  const eventMessages = useUiStore((state) => state.eventMessages);

  if (eventMessages.length === 0) {
    return null;
  }

  return (
    <div className="event-feed" aria-live="polite">
      {eventMessages.map((entry) => (
        <div className="event-feed__message" key={entry.id}>
          {renderEventMessage(entry)}
        </div>
      ))}
    </div>
  );
}