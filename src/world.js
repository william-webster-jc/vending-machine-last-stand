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
import { getStats } from './shop.js';
import { createMagazines, getStartingWeaponId } from './weapons.js';
import { createHires } from './entities/hire.js';
import { createJuice } from './juice.js';

export const GAME_STATE = {
  TITLE: 'title',
  INSTRUCTIONS: 'instructions',
  OPTIONS: 'options',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game-over',
  NIGHT_SURVIVED: 'night-survived',
  SHOP: 'shop',
};

// A night is built FROM your profile. Your day count, your upgrades and how
// battered the wall is all come from there; everything else starts fresh.
export function createWorld(profile) {
  const stats = getStats(profile);

  return {
    state: GAME_STATE.PLAYING,

    // Your career. Kept on the world so screens can read your cash and
    // upgrades without every one of them being handed it separately.
    profile,

    // Which night of the job this is. Night one is day 1.
    day: profile.day,

    // What your upgrades add up to. Worked out once here rather than being
    // recalculated by every file that needs a number.
    stats,

    // How far into tonight's shift we are. Sunrise is at night.durationSeconds.
    elapsedSeconds: 0,

    // The assault, driven by night.js. spawnBudget is a running fraction of
    // a scalper: when it passes 1, one walks in.
    scalpersSpawnedTonight: 0,
    spawnBudget: 0,
    nightBannerTimer: CONFIG.night.nightBannerSeconds,

    guard: {
      x: CONFIG.guard.startX,
      y: CONFIG.guard.startY,

      // Which way he's turned (1 right, -1 left) and the angle he's aiming.
      facing: 1,
      aimAngle: 0,

      // Counts down to zero between shots. See updateFiring in guard.js.
      fireCooldown: 0,
      hasFiredThisClick: false,

      // Which gun is in your hands, how many rounds are in each weapon's
      // magazine, and how long is left on a reload. Every weapon starts the
      // night loaded.
      weaponId: getStartingWeaponId(),
      magazines: createMagazines(),
      reloadTimer: 0,

      // Counts down after a shot, so we can draw the flash at the barrel.
      muzzleFlash: 0,
    },

    // Every bullet currently in the air.
    bullets: [],

    // THE RESELLER, once he's turned up. null on ordinary nights.
    boss: null,
    bossDefeated: false,

    // The guards you've taken on, stood at their posts.
    hires: createHires(profile.hiredGuards),

    // Screen shake and particles. Feel, not rules.
    juice: createJuice(),

    // Grenades in the air, and the blasts they leave behind.
    grenades: [],
    explosions: [],

    // Every scalper on the floor right now.
    scalpers: [],

    // Running tally of how many you've put down tonight.
    scalpersStopped: 0,

    // The wall's health, and whether it's been smashed open. Damage carries
    // over from last night unless you paid to have it repaired.
    barricade: createBarricade(stats.barricadeMaxHealth, profile.barricadeHealth),

    machine: {
      // Packs left inside. Hits zero and the night is over.
      packsRemaining: CONFIG.machine.packCount,

      // How far through buying the CURRENT pack the crowd is, from 0 to 1.
      purchaseProgress: 0,
    },

    // Filled in when you lose, so the game over screen has something to show.
    finalStats: null,

    // Which menu row is highlighted, on whichever menu is showing.
    menuIndex: 0,

    // Where ESC should send you back to when you leave the options screen.
    // Options can be opened from the title OR from a paused shift, and it
    // has to return to whichever one you came from.
    optionsCameFrom: GAME_STATE.TITLE,
  };
}
