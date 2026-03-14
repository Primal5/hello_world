import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { ActionStateIcon, type ActionStateIconName } from './ActionStateIcon';

export function ActionBar(): JSX.Element {
  const dialogueBox = useUiStore((state) => state.dialogueBox);
  const isPaused = useUiStore((state) => state.isPaused);
  const isJumping = useGameStore((state) => state.isJumping);
  const isCrouching = useGameStore((state) => state.isCrouching);
  const isSprinting = useGameStore((state) => state.isSprinting);
  const slots = ['\u00B9', '\u00B2', '\u00B3', '\u2074', '\u2075', '\u2076', '\u2077', '\u2078', '\u2079', '\u2070'];
  let statusIcon: ActionStateIconName | null = null;

  if (dialogueBox) {
    statusIcon = 'dialogue';
  } else if (isPaused) {
    statusIcon = 'pause';
  } else if (isJumping) {
    statusIcon = 'jump';
  } else if (isCrouching) {
    statusIcon = 'crouch';
  } else if (isSprinting) {
    statusIcon = 'sprint';
  }

  return (
    <div className="action-bar" aria-label="Barre d'action">
      <div
        className={`action-bar__slot action-bar__slot--status${statusIcon ? ' action-bar__slot--status-active' : ''}`}
        aria-hidden={true}
      >
        {statusIcon ? <ActionStateIcon icon={statusIcon} /> : null}
      </div>
      {slots.map((slot, index) => (
        <div className="action-bar__slot" key={`${slot}-${index}`}>
          <span className="action-bar__key">{slot}</span>
        </div>
      ))}
    </div>
  );
}
