import { Fragment, type ReactNode } from 'react';
import { DISPLAY_TEXT } from '../../text/DisplayText';
import { useUiStore, type JournalEntry, type JournalHighlight } from '../store/uiStore';

function renderEntry(entry: JournalEntry): ReactNode {
  if (!entry.highlights || entry.highlights.length === 0) {
    return entry.message;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  const matchedHighlights = new Set<number>();

  entry.highlights.forEach((highlight: JournalHighlight, index: number) => {
    const start = entry.message.indexOf(highlight.text, cursor);
    if (start === -1) {
      return;
    }

    if (start > cursor) {
      parts.push(
        <Fragment key={`text-${index}`}>
          {entry.message.slice(cursor, start)}
        </Fragment>
      );
    }

    parts.push(
      <span className="event-log__highlight" key={`highlight-${index}`} style={{ color: highlight.color }}>
        {highlight.text}
      </span>
    );

    cursor = start + highlight.text.length;
    matchedHighlights.add(index);
  });

  if (cursor < entry.message.length) {
    parts.push(<Fragment key="tail">{entry.message.slice(cursor)}</Fragment>);
  }

  const missingHighlights = entry.highlights.filter((_, index) => !matchedHighlights.has(index));
  if (missingHighlights.length > 0) {
    if (parts.length === 0) {
      parts.push(<Fragment key="full-message">{entry.message}</Fragment>);
    }

    parts.push(<Fragment key="fallback-gap"> </Fragment>);
    missingHighlights.forEach((highlight, index) => {
      parts.push(
        <span
          className="event-log__highlight"
          key={`fallback-highlight-${index}-${highlight.text}`}
          style={{ color: highlight.color }}
        >
          {highlight.text}
        </span>
      );
    });
  }

  return parts;
}

export function Journal(): JSX.Element {
  const entries = useUiStore((state) => state.journalEntries);
  const npcPrefix = `${DISPLAY_TEXT.world.npc.prefix} :`;

  return (
    <div className="event-log">
      <h3>Journal</h3>
      <ul>
        {entries.map((entry, index) => (
          <li
            className={entry.message.startsWith(npcPrefix) ? 'event-log__entry event-log__entry--dialogue' : 'event-log__entry'}
            key={`${entry.message}-${index}`}
          >
            {renderEntry(entry)}
          </li>
        ))}
      </ul>
    </div>
  );
}
