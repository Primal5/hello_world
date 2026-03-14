export interface ModelDefinition {
  path: string;
  scale?: [number, number, number];
  rotation?: [number, number, number];
  offset?: [number, number, number];
  center?: boolean;
  placeOnGround?: boolean;
  materialStyle?: {
    color?: string;
    emissive?: string;
    metalness?: number;
    roughness?: number;
  };
}

export const MODEL_REGISTRY = {
  chest: {
    path: '/assets/models/meshy/Meshy_AI_Wooden_chest_0311192334_texture.glb',
    scale: [0.5, 0.5, 0.5],
    placeOnGround: true
  },
  door: {
    path: '/assets/models/meshy/Wooden_Door.glb',
    placeOnGround: true
  },
  Wooden_Door: {
    path: '/assets/models/meshy/Wooden_Door.glb',
    placeOnGround: true
  },
  Bronze_Door: {
    path: '/assets/models/meshy/Wooden_Door.glb',
    materialStyle: {
      color: '#b87333',
      emissive: '#4a2310',
      metalness: 0.45,
      roughness: 0.5
    },
    placeOnGround: true
  },
  Silver_Door: {
    path: '/assets/models/meshy/Wooden_Door.glb',
    materialStyle: {
      color: '#c0c0c0',
      emissive: '#4f5966',
      metalness: 0.55,
      roughness: 0.3
    },
    placeOnGround: true
  },
  Gold_Door: {
    path: '/assets/models/meshy/Wooden_Door.glb',
    materialStyle: {
      color: '#d4af37',
      emissive: '#5f4b12',
      metalness: 0.5,
      roughness: 0.35
    },
    placeOnGround: true
  },
  npc: {
    path: '/assets/models/meshy/Pnj/Gerard.glb',
    scale: [1, 1, 1],
    rotation: [0, Math.PI, 0],
    placeOnGround: true
  }
} as const satisfies Record<string, ModelDefinition>;

export type ModelKey = keyof typeof MODEL_REGISTRY;
