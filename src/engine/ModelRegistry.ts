export interface ModelDefinition {
  path: string;
  scale?: [number, number, number];
  rotation?: [number, number, number];
  offset?: [number, number, number];
  center?: boolean;
  placeOnGround?: boolean;
}

export const MODEL_REGISTRY = {
  chest: {
    path: '/assets/models/meshy/Meshy_AI_Wooden_chest_0311192334_texture.glb',
    scale: [0.5, 0.5, 0.5],
    placeOnGround: true
  },
  door: {
    path: '/assets/models/meshy/Wooden_Door_0311191301_texture.glb',
    placeOnGround: true
  },
  npc: {
    path: '/assets/models/meshy/pnj/Gerard.glb',
    scale: [1, 1, 1],
    rotation: [0, Math.PI, 0],
    placeOnGround: true
  }
} as const satisfies Record<string, ModelDefinition>;

export type ModelKey = keyof typeof MODEL_REGISTRY;
