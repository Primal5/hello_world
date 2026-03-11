import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { itemData } from '../../data/items';

export function InventoryPanel(): JSX.Element | null {
  const isOpen = useUiStore((state) => state.isInventoryOpen);
  const itemIds = useGameStore((state) => state.inventory);

  if (!isOpen) return null;

  const items = itemIds
    .map((id) => itemData.find((item) => item.id === id))
    .filter((item): item is (typeof itemData)[number] => Boolean(item));

  return (
    <div className="inventory-panel">
      <h3>Inventaire</h3>
      {items.length === 0 ? (
        <p>Vide</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong> — {item.description}
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Appuyez sur I pour fermer.</p>
    </div>
  );
}
