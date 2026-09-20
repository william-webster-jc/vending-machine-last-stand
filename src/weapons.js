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

export function getWeapon(id) {
  return CONFIG.weapons.find((weapon) => weapon.id === id) || CONFIG.weapons[0];
}

export function getStartingWeaponId() {
  return CONFIG.weapons[0].id;
}

// Weapons you've bought, plus the one you always have. Ordered the same way as
// config, so the number key for a weapon never moves around on you.
export function getOwnedWeapons(profile) {
  return CONFIG.weapons.filter(
    (weapon) => weapon.cost === 0 || profile.ownedWeapons.includes(weapon.id),
  );
}

export function ownsWeapon(profile, id) {
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

export function getRoundsLeft(guard) {
  return guard.magazines[guard.weaponId];
}

export function isReloading(guard) {
  return guard.reloadTimer > 0;
}

// Start a reload, unless one is already running or the magazine is already
// full. Returns true if a reload actually began.
export function beginReload(guard) {
  const weapon = getWeapon(guard.weaponId);

  if (isReloading(guard)) return false;
  if (getRoundsLeft(guard) >= weapon.magazineSize) return false;

  guard.reloadTimer = weapon.reloadSeconds;
  return true;
}

export function updateReload(guard, deltaSeconds) {
  if (!isReloading(guard)) return;

  guard.reloadTimer -= deltaSeconds;
  if (guard.reloadTimer > 0) return;

  guard.reloadTimer = 0;
  guard.magazines[guard.weaponId] = getWeapon(guard.weaponId).magazineSize;
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
