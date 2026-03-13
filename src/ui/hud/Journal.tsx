import { Fragment, type ReactNode } from 'react';
import { DISPLAY_TEXT } from '../../text/DisplayText';
import { useUiStore, type JournalEntry, type JournalHighlight } from '../store/uiStore';

function renderEntry(entry: JournalEntry): ReactNode {
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
  });

  if (cursor < entry.message.length) {
    parts.push(<Fragment key="tail">{entry.message.slice(cursor)}</Fragment>);
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