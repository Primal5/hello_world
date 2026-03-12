import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { itemData } from '../../data/items';
import { DISPLAY_TEXT, toDisplayUpper } from '../../text/DisplayText';

export function InventoryPanel(): JSX.Element | null {
  const isOpen = useUiStore((state) => state.isInventoryOpen);
  const itemIds = useGameStore((state) => state.inventory);

  if (!isOpen) return null;

  const items = itemIds
    .map((id) => itemData.find((item) => item.id === id))
    .filter((item): item is (typeof itemData)[number] => Boolean(item));

  return (
    <aside className="inventory-panel" aria-label={DISPLAY_TEXT.ui.inventory.ariaLabel}>
      <div className="inventory-panel__header">
        <div>
          <p className="inventory-panel__eyebrow">{toDisplayUpper(DISPLAY_TEXT.ui.inventory.equipment)}</p>
          <h3>{DISPLAY_TEXT.ui.inventory.title}</h3>
        </div>
        <span className="inventory-panel__count">{DISPLAY_TEXT.ui.inventory.itemCount(items.length)}</span>
      </div>

      {items.length === 0 ? (
        <div className="inventory-panel__empty">
          <p>{DISPLAY_TEXT.ui.inventory.emptyBag}</p>
          <p className="hint">{DISPLAY_TEXT.ui.inventory.emptyHint}</p>
        </div>
      ) : (
        <ul className="inventory-panel__list">
          {items.map((item) => (
            <li key={item.id} className="inventory-panel__item">
              <div className="inventory-panel__icon" aria-hidden="true">
                {item.id === 'rusty_key' ? 'K' : '•'}
              </div>
              <div className="inventory-panel__body">
                <div className="inventory-panel__meta">
                  <strong>{item.name}</strong>
                  {item.category ? <span>{item.category}</span> : null}
                </div>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">{DISPLAY_TEXT.ui.inventory.closeHint}</p>
    </aside>
  );
}
