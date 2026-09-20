// =============================================================================
// weapons.js — which gun you're holding, and how much is left in it.
//
// THE BIG IDEA here is data-driven design. Every weapon is an entry in a list
// in config.js. This file knows how to read that list and track your ammo, but
// it knows nothing about what a shotgun IS. Adding a fifth weapon means adding
// a fifth entry — not writing any new code.
//
// The same applies to reloading: the rule is "you can't shoot while reloading",
// written once, and every weapon obeys it because they all go through here.
// =============================================================================

import { CONFIG } from './config.js';
import { settings } from './settings.js';

export function getWeapon(id) {
  return CONFIG.weapons.find((weapon) => weapon.id === id) || CONFIG.weapons[0];
}

export function getStartingWeaponId() {
  return CONFIG.weapons[0].id;
}

// Weapons you've bought, plus the one you always have. Ordered the same way as
// config, so the number key for a weapon never moves around on you.
export function getOwnedWeapons(profile) {
  return CONFIG.weapons.filter((weapon) => ownsWeapon(profile, weapon.id));
}

export function ownsWeapon(profile, id) {
  // Developer mode hands you the whole arsenal straight away — that's the
  // main reason to switch it on, so you shouldn't have to go and ask for it.
  //
  // It's answered here rather than by writing the weapons into your save, so
  // switching developer mode off gives you your real progress back untouched.
  if (settings.devMode) return true;

  return getWeapon(id).cost === 0 || profile.ownedWeapons.includes(id);
}

// -----------------------------------------------------------------------------
// AMMO
// -----------------------------------------------------------------------------

// Every weapon starts the night with a full magazine.
export function createMagazines() {
  const magazines = {};

  for (const weapon of CONFIG.weapons) {
    magazines[weapon.id] = weapon.magazineSize;
  }

  return magazines;
}

// And a night's worth of spare rounds behind it, scaled by your ammo belt.
//
// Reserves refill every night — they're a budget for tonight, not a resource
// to hoard across a career. That keeps a bad night from crippling the next
// one, while still making you think about whether this crowd is worth the
// railgun.
export function createReserves(ammoBeltLevel = 0) {
  const reserves = {};
  const item = CONFIG.economy.items.find((entry) => entry.id === 'ammobelt');
  const bonus = 1 + ammoBeltLevel * (item ? item.effectPerLevel : 0);

  for (const weapon of CONFIG.weapons) {
    reserves[weapon.id] = weapon.reserveAmmo === Infinity
      ? Infinity
      : Math.round(weapon.reserveAmmo * bonus);
  }

  return reserves;
}

export function getReserveLeft(guard) {
  return guard.reserves[guard.weaponId];
}

export function hasAnyAmmo(guard) {
  return getRoundsLeft(guard) > 0 || getReserveLeft(guard) > 0;
}

export function getRoundsLeft(guard) {
  return guard.magazines[guard.weaponId];
}

export function isReloading(guard) {
  return guard.reloadTimer > 0;
}

// Start a reload, unless one is already running, the magazine is already
// full, or there's nothing left to load. Returns true if one actually began.
export function beginReload(guard) {
  const weapon = getWeapon(guard.weaponId);

  if (isReloading(guard)) return false;
  if (getRoundsLeft(guard) >= weapon.magazineSize) return false;
  if (getReserveLeft(guard) <= 0) return false;

  guard.reloadTimer = weapon.reloadSeconds;
  return true;
}

export function updateReload(guard, deltaSeconds) {
  if (!isReloading(guard)) return;

  guard.reloadTimer -= deltaSeconds;
  if (guard.reloadTimer > 0) return;

  guard.reloadTimer = 0;

  // Take from the reserve to top up the magazine — and only as much as is
  // actually there, so the last reload of the night can be a partial one.
  const weapon = getWeapon(guard.weaponId);
  const room = weapon.magazineSize - guard.magazines[weapon.id];
  const reserve = guard.reserves[weapon.id];

  if (reserve === Infinity) {
    guard.magazines[weapon.id] = weapon.magazineSize;
    return;
  }

  const taken = Math.min(room, reserve);
  guard.magazines[weapon.id] += taken;
  guard.reserves[weapon.id] -= taken;
}

// How far through a reload we are, 0 to 1. Used to draw the progress bar.
export function getReloadProgress(guard) {
  if (!isReloading(guard)) return 1;

  const total = getWeapon(guard.weaponId).reloadSeconds;
  return 1 - guard.reloadTimer / total;
}

// Swapping weapons cancels a reload rather than pausing it. Otherwise you
// could start a slow shotgun reload, switch to the pistol to keep shooting,
// and switch back to a free full magazine.
export function switchWeapon(guard, id) {
  if (guard.weaponId === id) return false;

  guard.weaponId = id;
  guard.reloadTimer = 0;
  guard.fireCooldown = Math.max(guard.fireCooldown, CONFIG.weaponSwapSeconds || 0.18);
  return true;
}
