import { Crosshair } from './hud/Crosshair';
import { EventLog } from './hud/EventLog';
import { InteractionPrompt } from './hud/InteractionPrompt';
import { InventoryPanel } from './inventory/InventoryPanel';

export function App(): JSX.Element {
  return (
    <>
      <Crosshair />
      <InteractionPrompt />
      <InventoryPanel />
      <EventLog />
    </>
  );
}
