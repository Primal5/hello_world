export const MODEL_REGISTRY = {
  chest: '/assets/models/chest.glb',
  door: '/assets/models/door.glb',
  npc: '/assets/models/npc.glb'
} as const;

export type ModelKey = keyof typeof MODEL_REGISTRY;
