import { CompassRose } from './hud/CompassRose';
import { Crosshair } from './hud/Crosshair';
import { EventLog } from './hud/EventLog';
import { HealthOrb } from './hud/HealthOrb';
import { InteractionPrompt } from './hud/InteractionPrompt';
import { InventoryPanel } from './inventory/InventoryPanel';

export function App(): JSX.Element {
  return (
    <>
      <CompassRose />
      <Crosshair />
      <InteractionPrompt />
      <InventoryPanel />
      <HealthOrb />
      <EventLog />
    </>
  );
}