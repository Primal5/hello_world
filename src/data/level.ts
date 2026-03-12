import * as THREE from 'three';

export interface LevelEntity {
  id: string;
  type: 'chest' | 'door' | 'npc';
  position: THREE.Vector3;
}

export const baseLevel: LevelEntity[] = [
  { id: 'starter_chest', type: 'chest', position: new THREE.Vector3(-2, 0, -4) },
  { id: 'old_door', type: 'door', position: new THREE.Vector3(0, 0, -8) },
  { id: 'village_npc', type: 'npc', position: new THREE.Vector3(2, 0, -4) }
];

