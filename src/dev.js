// =============================================================================
// dev.js — the developer panel.
//
// A cheat menu. It exists so you can try the shotgun, a full crew, night nine
// or a boss fight WITHOUT first earning any of it, which is the difference
// between tuning a number in thirty seconds and tuning it in twenty minutes.
//
// It's switched on from the options screen and opened with F1 during a shift.
// Nothing in here is reachable unless you deliberately turn it on.
// =============================================================================

import { CONFIG } from './config.js';
import { settings } from './settings.js';
import { getUpgradeLevel } from './shop.js';
import { ownsWeapon } from './weapons.js';
import { spawnScalper } from './entities/scalper.js';
import { createBoss } from './entities/boss.js';

// What a row's action wants the game to do afterwards.
export const DEV_COMMAND = {
  NONE: null,
  REBUILD_NIGHT: 'rebuild-night',
  CLOSE: 'close',
};

const CASH_STEP = 250;

export function getDevRows(world, profile) {
  const rows = [];

  rows.push({ id: 'cash', label: 'CASH', value: `${profile.cash}` });

  rows.push({
    id: 'weapons',
    label: 'ALL WEAPONS',
    value: ownsEverything(profile) ? 'UNLOCKED' : 'LOCKED',
  });

  for (const item of CONFIG.economy.items) {
    rows.push({
      id: `upgrade:${item.id}`,
      label: item.name,
      value: `${getUpgradeLevel(profile, item.id)} / ${item.maxLevel}`,
    });
  }

  rows.push({ id: 'crew', label: 'CREW', value: `${profile.hiredGuards} / ${CONFIG.help.maxHires}` });
  rows.push({ id: 'night', label: 'NIGHT', value: `${profile.day}` });

  rows.push({
    id: 'invincible',
    label: 'INVINCIBLE WALL',
    value: settings.devInvincibleWall ? 'ON' : 'OFF',
  });

  rows.push({ id: 'restock', label: 'REPAIR + RESTOCK', value: 'GO' });
  rows.push({ id: 'spawn', label: `SPAWN ${getSpawnTypeName(world)}`, value: 'GO' });
  rows.push({ id: 'boss', label: 'SPAWN THE RESELLER', value: 'GO' });
  rows.push({ id: 'close', label: 'CLOSE', value: '' });

  return rows;
}

function ownsEverything(profile) {
  return CONFIG.weapons.every((weapon) => ownsWeapon(profile, weapon.id));
}

function getSpawnTypeName(world) {
  const index = world.devSpawnIndex || 0;
  return CONFIG.scalperTypes[index % CONFIG.scalperTypes.length].name;
}

// -----------------------------------------------------------------------------
// ACTIONS
//
// `direction` is -1 for left, +1 for right or a confirm. Rows that are really
// buttons ignore it.
// -----------------------------------------------------------------------------

export function applyDevAction(world, profile, rowId, direction) {
  if (rowId === 'close') return DEV_COMMAND.CLOSE;

  if (rowId === 'cash') {
    profile.cash = Math.max(0, profile.cash + direction * CASH_STEP);
    return DEV_COMMAND.NONE;
  }

  if (rowId === 'weapons') {
    toggleAllWeapons(profile);
    return DEV_COMMAND.NONE;
  }

  if (rowId.startsWith('upgrade:')) {
    stepUpgrade(profile, rowId.slice(8), direction);

    // Upgrades feed into stats, which are worked out once when a night is
    // built — so the night has to be rebuilt for a change to take effect.
    return DEV_COMMAND.REBUILD_NIGHT;
  }

  if (rowId === 'crew') {
    profile.hiredGuards = clamp(profile.hiredGuards + direction, 0, CONFIG.help.maxHires);
    return DEV_COMMAND.REBUILD_NIGHT;
  }

  if (rowId === 'night') {
    profile.day = Math.max(1, profile.day + direction);
    return DEV_COMMAND.REBUILD_NIGHT;
  }

  if (rowId === 'invincible') {
    settings.devInvincibleWall = !settings.devInvincibleWall;
    return DEV_COMMAND.NONE;
  }

  if (rowId === 'restock') {
    world.barricade.health = world.barricade.maxHealth;
    world.barricade.isBroken = false;
    world.machine.packsRemaining = CONFIG.machine.packCount;
    world.machine.purchaseProgress = 0;
    return DEV_COMMAND.NONE;
  }

  if (rowId === 'spawn') {
    // Left and right cycle which type; confirming drops one on the floor.
    if (direction === 0) {
      const type = CONFIG.scalperTypes[(world.devSpawnIndex || 0) % CONFIG.scalperTypes.length];
      spawnScalper(world, 1, type.id);
    } else {
      const count = CONFIG.scalperTypes.length;
      world.devSpawnIndex = (((world.devSpawnIndex || 0) + direction) % count + count) % count;
    }
    return DEV_COMMAND.NONE;
  }

  if (rowId === 'boss') {
    world.boss = createBoss(profile.day);
    world.bossDefeated = false;
    return DEV_COMMAND.NONE;
  }

  return DEV_COMMAND.NONE;
}

function toggleAllWeapons(profile) {
  if (ownsEverything(profile)) {
    profile.ownedWeapons = [];
    return;
  }

  profile.ownedWeapons = CONFIG.weapons.filter((w) => w.cost > 0).map((w) => w.id);
}

function stepUpgrade(profile, id, direction) {
  const item = CONFIG.economy.items.find((entry) => entry.id === id);
  if (!item) return;

  const level = getUpgradeLevel(profile, id);
  profile.upgradeLevels[id] = clamp(level + direction, 0, item.maxLevel);
}

function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high);
}
