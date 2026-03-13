import { itemData } from '../../data/items';
import { ItemVisualsService } from '../../gameplay/items/ItemVisuals';
import { DISPLAY_TEXT } from '../../text/DisplayText';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';

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
        <h3>{DISPLAY_TEXT.ui.inventory.title}</h3>
        <span className="inventory-panel__count">{DISPLAY_TEXT.ui.inventory.itemCount(items.length)}</span>
      </div>

      {items.length === 0 ? (
        <div className="inventory-panel__empty">
          <p>{DISPLAY_TEXT.ui.inventory.emptyBag}</p>
        </div>
      ) : (
        <ul className="inventory-panel__list">
          {items.map((item) => {
            const rarityTheme = ItemVisualsService.getRarityTheme(item.rarity);
            const categoryTheme = ItemVisualsService.getCategoryTheme(item.category);

            return (
              <li key={item.id} className="inventory-panel__item">
                <div
                  className={["inventory-panel__icon", "inventory-panel__icon--rarity"].join(' ')}
                  style={ItemVisualsService.toCssVariables(rarityTheme)}
                  aria-hidden="true"
                  title={rarityTheme.label}
                >
                  {item.id === 'rusty_key' ? 'K' : '\u2022'}
                </div>
                <div className="inventory-panel__body">
                  <div className="inventory-panel__meta">
                    <strong
                      className="inventory-panel__name"
                      style={{ color: rarityTheme.color }}
                      title={rarityTheme.label}
                    >
                      {item.name}
                    </strong>
                    {item.category ? (
                      <span
                        className="inventory-panel__category"
                        style={
                          categoryTheme
                            ? ItemVisualsService.toCssVariables(categoryTheme)
                            : undefined
                        }
                      >
                        {item.category}
                      </span>
                    ) : null}
                  </div>
                  <p>{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="hint">{DISPLAY_TEXT.ui.inventory.closeHint}</p>
    </aside>
  );
}