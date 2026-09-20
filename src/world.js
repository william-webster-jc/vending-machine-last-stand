// =============================================================================
// world.js — everything the game currently knows about, in one object.
//
// THE BIG IDEA here is game state: the game is always in exactly one named
// mode, and it behaves completely differently in each. Right now that's
// PLAYING or GAME_OVER. The title screen and the shop add more in M7 and M8.
//
// Keeping the whole world in one object built by one function has a very
// practical payoff: restarting is just building a fresh one. There's no list
// of things to remember to reset, so there's no way to forget one.
// =============================================================================

import { CONFIG } from './config.js';
import { createBarricade } from './entities/barricade.js';

export const GAME_STATE = {
  PLAYING: 'playing',
  GAME_OVER: 'game-over',
};

export function createWorld() {
  return {
    state: GAME_STATE.PLAYING,

    // How long this night has lasted. M6 turns this into the sunrise timer.
    elapsedSeconds: 0,

    guard: {
      x: CONFIG.guard.startX,
      y: CONFIG.guard.startY,

      // Which way he's turned (1 right, -1 left) and the angle he's aiming.
      facing: 1,
      aimAngle: 0,

      // Counts down to zero between shots. See updateFiring in guard.js.
      fireCooldown: 0,
      hasFiredThisClick: false,
    },

    // Every bullet currently in the air.
    bullets: [],

    // Every scalper on the floor right now.
    scalpers: [],

    // Counts down to the next scalper arriving. M6 replaces this with waves.
    scalperSpawnCountdown: CONFIG.scalper.spawnIntervalSeconds,

    // Running tally of how many you've put down tonight.
    scalpersStopped: 0,

    // The wall's health, and whether it's been smashed open.
    barricade: createBarricade(),

    machine: {
      // Packs left inside. Hits zero and the night is over.
      packsRemaining: CONFIG.machine.packCount,

      // How far through buying the CURRENT pack the crowd is, from 0 to 1.
      purchaseProgress: 0,
    },

    // Filled in when you lose, so the game over screen has something to show.
    finalStats: null,
  };
}
