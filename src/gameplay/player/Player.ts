import * as THREE from 'three';
import { PlayerInventory } from './PlayerInventory';
import { defaultPlayerStats, type PlayerStats } from './PlayerStats';

export class Player {
  readonly position: THREE.Vector3;
  readonly velocity = new THREE.Vector3();
  readonly inventory = new PlayerInventory();
  readonly stats: PlayerStats;
  isGrounded = false;

  constructor(startPosition: THREE.Vector3) {
    this.position = startPosition.clone();
    this.stats = { ...defaultPlayerStats };
  }
}
