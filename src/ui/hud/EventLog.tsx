import { useUiStore } from '../store/uiStore';

export function EventLog(): JSX.Element {
  const logs = useUiStore((state) => state.eventLog);
  return (
    <div className="event-log">
      <h3>Journal</h3>
      <ul>
        {logs.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}
