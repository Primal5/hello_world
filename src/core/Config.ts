export const GAME_CONFIG = {
  player: {
    height: 1.7,
    crouchHeight: 1.05,
    radius: 0.35,
    moveSpeed: 4.5,
    crouchMoveSpeed: 2.6,
    sprintSpeed: 6.5,
    jumpVelocity: 6,
    gravity: 16,
    eyeOffset: 1.6,
    crouchEyeOffset: 0.96,
    crouchTransitionSpeed: 14
  },
  interaction: {
    maxDistance: 3.2
  }
} as const;
