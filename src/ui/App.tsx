import { CompassRose } from './hud/CompassRose';
import { Crosshair } from './hud/Crosshair';
import { DialogueWindow } from './hud/DialogueWindow';
import { EventFeed } from './hud/EventFeed';
import { HealthOrb } from './hud/HealthOrb';
import { InteractionPrompt } from './hud/InteractionPrompt';
import { Journal } from './hud/Journal';
import { ActionBar } from './hud/ActionBar';
import { PauseOverlay } from './hud/PauseOverlay';
import { InventoryPanel } from './inventory/InventoryPanel';

export function App(): JSX.Element {
  return (
    <>
      <CompassRose />
      <Crosshair />
      <InteractionPrompt />
      <PauseOverlay />
      <InventoryPanel />
      <HealthOrb />
      <Journal />
      <EventFeed />
      <DialogueWindow />
      <ActionBar />
    </>
  );
}
