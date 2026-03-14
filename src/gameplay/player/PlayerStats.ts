export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
}

export const defaultPlayerStats: PlayerStats = {
  health: 24,
  maxHealth: 100,
  stamina: 100
};
