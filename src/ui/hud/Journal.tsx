import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { DISPLAY_TEXT } from '../../text/DisplayText';
import { useUiStore, type JournalEntry, type JournalHighlight } from '../store/uiStore';
import { requestJournalClose } from './journalEvents';

const JOURNAL_VISIBLE_DURATION_MS = 5000;

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

export function Journal(): JSX.Element | null {
  const entries = useUiStore((state) => state.journalEntries);
  const journalRevealTick = useUiStore((state) => state.journalRevealTick);
  const isHistoryOpen = useUiStore((state) => state.isJournalOpen);
  const npcPrefix = `${DISPLAY_TEXT.world.npc.prefix} :`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const entryRefs = useRef<Array<HTMLLIElement | null>>([]);
  const hideTimerRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(entries.length);

  useEffect(() => {
    if (journalRevealTick === 0) {
      return;
    }

    setIsVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      hideTimerRef.current = null;
    }, JOURNAL_VISIBLE_DURATION_MS);

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [journalRevealTick]);

  useLayoutEffect(() => {
    const measureVisibleEntries = (): void => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const computedStyle = window.getComputedStyle(container);
      const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
      const containerBottom = container.getBoundingClientRect().bottom - paddingBottom + 0.5;
      let nextVisibleCount = 0;

      for (let index = 0; index < entries.length; index += 1) {
        const element = entryRefs.current[index];
        if (!element) {
          break;
        }

        if (element.getBoundingClientRect().bottom > containerBottom) {
          break;
        }

        nextVisibleCount += 1;
      }

      setVisibleCount(nextVisibleCount);
    };

    setVisibleCount(entries.length);
    if (measureFrameRef.current !== null) {
      window.cancelAnimationFrame(measureFrameRef.current);
    }
    measureFrameRef.current = window.requestAnimationFrame(measureVisibleEntries);

    const container = containerRef.current;
    if (!container) {
      return () => {
        if (measureFrameRef.current !== null) {
          window.cancelAnimationFrame(measureFrameRef.current);
          measureFrameRef.current = null;
        }
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      setVisibleCount(entries.length);
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
      }
      measureFrameRef.current = window.requestAnimationFrame(measureVisibleEntries);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    };
  }, [entries, isVisible, isHistoryOpen]);

  entryRefs.current.length = entries.length;

  if (entries.length === 0 && !isHistoryOpen) {
    return null;
  }

  return (
    <>
      {!isHistoryOpen ? (
        <div className={isVisible ? 'event-log event-log--visible' : 'event-log'} ref={containerRef}>
          <h3>Journal</h3>
          <ul>
            {entries.slice(0, visibleCount).map((entry, index) => (
              <li
                ref={(element) => {
                  entryRefs.current[index] = element;
                }}
                className={entry.message.startsWith(npcPrefix) ? 'event-log__entry event-log__entry--dialogue' : 'event-log__entry'}
                key={`${entry.message}-${index}`}
              >
                {renderEntry(entry)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isHistoryOpen ? (
        <aside className="journal-history" aria-label={DISPLAY_TEXT.ui.journal.title}>
          <div className="inventory-panel__header">
            <h3>Journal</h3>
            <div className="inventory-panel__header-actions">
              <button
                aria-label={DISPLAY_TEXT.ui.journal.closeButtonLabel}
                className="inventory-panel__close"
                onClick={requestJournalClose}
                type="button"
              >
                {'\u00d7'}
              </button>
            </div>
          </div>
          <ul className="journal-history__list">
            {entries.map((entry, index) => (
              <li
                className={entry.message.startsWith(npcPrefix) ? 'event-log__entry event-log__entry--dialogue' : 'event-log__entry'}
                key={`${entry.message}-${index}`}
              >
                {renderEntry(entry)}
              </li>
            ))}
          </ul>
          <p className="hint">{DISPLAY_TEXT.ui.journal.closeHint}</p>
        </aside>
      ) : null}
    </>
  );
}
