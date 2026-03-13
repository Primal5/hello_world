export function ActionBar(): JSX.Element {
  const slots = ['\u00B9', '\u00B2', '\u00B3', '\u2074', '\u2075', '\u2076', '\u2077', '\u2078', '\u2079', '\u2070'];

  return (
    <div className="action-bar" aria-label="Barre d'action">
      {slots.map((slot, index) => (
        <div className="action-bar__slot" key={`${slot}-${index}`}>
          <span className="action-bar__key">{slot}</span>
        </div>
      ))}
    </div>
  );
}
