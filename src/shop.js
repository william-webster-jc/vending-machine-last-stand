// =============================================================================
// shop.js — your paycheck, and what you spend it on.
//
// THE BIG IDEA here is persistent run state: numbers that OUTLIVE a night.
// Everything else in the game is thrown away and rebuilt every shift. These
// few numbers aren't, and that's the whole reason to come back tomorrow.
//
// The profile is deliberately tiny — a day count, some cash, a level per
// upgrade, and how battered the barricade is. Small enough to save to disk in
// one line when M20 adds saving.
// =============================================================================

import { CONFIG } from './config.js';
import { getDifficulty } from './settings.js';
import { getWeapon, ownsWeapon } from './weapons.js';

export function createProfile() {
  return {
    day: 1,
    cash: 0,

    // upgrade id -> how many levels you've bought.
    upgradeLevels: {},

    // Weapons you've bought. The pistol isn't in here — you always have it.
    ownedWeapons: [],

    // How many guards are on the payroll.
    hiredGuards: 0,

    // Barricade tech: turret / mines / drone, each with a level.
    techLevels: {},

    // How much barricade health you carry INTO tonight. null means "full",
    // which is how a brand new career starts.
    //
    // Damage persisting between nights is what gives repair its bite: a wall
    // you limped home on is a wall you have to pay for before it fails.
    barricadeHealth: null,

    // Career totals, for the stats screen.
    totalScalpersStopped: 0,
    nightsSurvived: 0,
  };
}

// What the next interview costs. Each hire is dearer than the last.
export function getHireCost(profile) {
  const cfg = CONFIG.help;
  return cfg.hireBaseCost + profile.hiredGuards * cfg.hireCostGrowth;
}

export function getNightlyWages(profile) {
  return profile.hiredGuards * CONFIG.help.wagePerNight;
}

export function getUpgradeLevel(profile, id) {
  return profile.upgradeLevels[id] || 0;
}

export function getTechLevel(profile, id) {
  return profile.techLevels[id] || 0;
}

export function getTechCost(profile, id) {
  const tech = CONFIG.tech[id];
  return tech.baseCost + getTechLevel(profile, id) * tech.costGrowth;
}

// -----------------------------------------------------------------------------
// WHAT YOUR UPGRADES ACTUALLY DO
//
// One place that turns "I own 3 levels of Heavier Rounds" into the numbers the
// rest of the game reads. Nothing else ever looks at upgrade levels, so there's
// exactly one place to look when a stat seems wrong.
// -----------------------------------------------------------------------------

export function getStats(profile) {
  const effect = (id) => findItem(id).effectPerLevel;
  const level = (id) => getUpgradeLevel(profile, id);

  return {
    barricadeMaxHealth: Math.round(
      (CONFIG.barricade.maxHealth + level('reinforce') * effect('reinforce')) *
        getDifficulty().wallScale,
    ),

    // A multiplier every weapon's own damage is scaled by, rather than a flat
    // bonus that would help the uzi's weak rounds far more than the pistol's.
    damageMultiplier: 1 + level('damage') * effect('damage'),

    // A multiplier on whatever weapon you're holding, rather than one fixed
    // delay — the uzi and the shotgun fire at wildly different rates, so the
    // upgrade has to scale each of them rather than replace them.
    //
    // Multiplied, not subtracted, so it can never reach zero and fire an
    // infinite number of rounds in a single frame.
    fireIntervalMultiplier: Math.pow(effect('firerate'), level('firerate')),

    moveSpeed: CONFIG.guard.speed + level('boots') * effect('boots'),
  };
}

function findItem(id) {
  return CONFIG.economy.items.find((item) => item.id === id);
}

// -----------------------------------------------------------------------------
// PAY
// -----------------------------------------------------------------------------

// Work out the night's wages, itemised so the payslip can show its working.
export function calculatePay(stats, wages = 0) {
  const cfg = CONFIG.economy;

  const lines = [
    ['SHIFT PAY', cfg.basePayPerNight],
    ['SCALPERS STOPPED', stats.scalpersStopped * cfg.payPerScalperStopped],
    ['PACKS SAVED', stats.packsSaved * cfg.payPerPackSaved],
  ];

  if (stats.barricadeHeld) {
    lines.push(['BARRICADE HELD', cfg.barricadeHeldBonus]);
  }

  if (stats.bossDefeated) {
    lines.push(['RESELLER BOUNTY', CONFIG.boss.bounty]);
  }

  // Wages come straight off the top. A crew you can't afford is the whole
  // tension of hiring.
  if (wages > 0) {
    lines.push(['WAGES', -wages]);
  }

  const total = lines.reduce((sum, [, amount]) => sum + amount, 0);
  return { lines, total };
}

// -----------------------------------------------------------------------------
// BUYING THINGS
// -----------------------------------------------------------------------------

// Each level costs more than the last, so you can't simply max one thing out
// and ignore the rest.
export function getUpgradeCost(profile, item) {
  const level = getUpgradeLevel(profile, item.id);
  return item.baseCost + level * item.costGrowth;
}

export function getRepairCost(profile) {
  const stats = getStats(profile);
  const current = profile.barricadeHealth === null
    ? stats.barricadeMaxHealth
    : profile.barricadeHealth;

  const missing = Math.max(0, stats.barricadeMaxHealth - current);
  return Math.ceil(missing * CONFIG.economy.repairCostPerPoint);
}

// Everything you can buy right now, as rows the shop screen can just draw.
// Working this out here rather than in the drawing code means the screen can't
// disagree with what a purchase actually does.
export function getShopRows(profile) {
  const stats = getStats(profile);
  const rows = [];

  const repairCost = getRepairCost(profile);
  const currentHealth = profile.barricadeHealth === null
    ? stats.barricadeMaxHealth
    : Math.round(profile.barricadeHealth);

  rows.push({
    id: 'repair',
    name: 'REPAIR BARRICADE',
    detail: `${currentHealth} / ${Math.round(stats.barricadeMaxHealth)}`,
    cost: repairCost,
    maxed: repairCost === 0,
    maxedLabel: 'INTACT',
    affordable: repairCost > 0 && profile.cash >= repairCost,
  });

  // Barricade tech. Listed before the interviews because it's the thing that
  // keeps paying without wages.
  for (const id of ['turret', 'mines', 'drone']) {
    const tech = CONFIG.tech[id];
    const level = getTechLevel(profile, id);
    const cost = getTechCost(profile, id);
    const maxed = level >= tech.maxLevel;

    rows.push({
      id: `tech:${id}`,
      name: tech.name,
      detail: `${tech.blurb}  ${'|'.repeat(level)}${'.'.repeat(tech.maxLevel - level)}`,
      cost,
      maxed,
      maxedLabel: 'MAXED',
      affordable: !maxed && profile.cash >= cost,
    });
  }

  // Interviews.
  const hireCost = getHireCost(profile);
  const atMaxCrew = profile.hiredGuards >= CONFIG.help.maxHires;

  rows.push({
    id: 'hire',
    name: 'INTERVIEW A GUARD',
    detail: atMaxCrew
      ? `CREW OF ${profile.hiredGuards} - FULL`
      : `CREW ${profile.hiredGuards}/${CONFIG.help.maxHires}   WAGES ${getNightlyWages(profile) + CONFIG.help.wagePerNight}/NIGHT`,
    cost: hireCost,
    maxed: atMaxCrew,
    maxedLabel: 'FULL',
    affordable: !atMaxCrew && profile.cash >= hireCost,
  });

  // Weapons you don't own yet, offered for sale.
  for (const weapon of CONFIG.weapons) {
    if (weapon.cost === 0) continue;

    const owned = ownsWeapon(profile, weapon.id);
    rows.push({
      id: `weapon:${weapon.id}`,
      name: weapon.name,
      detail: weapon.blurb,
      cost: weapon.cost,
      maxed: owned,
      maxedLabel: 'OWNED',
      affordable: !owned && profile.cash >= weapon.cost,
    });
  }

  for (const item of CONFIG.economy.items) {
    const level = getUpgradeLevel(profile, item.id);
    const cost = getUpgradeCost(profile, item);
    const maxed = level >= item.maxLevel;

    rows.push({
      id: item.id,
      name: item.name,
      detail: `${item.blurb}  ${'|'.repeat(level)}${'.'.repeat(item.maxLevel - level)}`,
      cost,
      maxed,
      maxedLabel: 'MAXED',
      affordable: !maxed && profile.cash >= cost,
    });
  }

  return rows;
}

// Try to buy row `id`. Returns true if money actually changed hands, so the
// caller knows whether to play a sound or shake the screen.
export function buyUpgrade(profile, id) {
  if (id === 'repair') return buyRepair(profile);
  if (id === 'hire') return hireGuard(profile);
  if (id.startsWith('tech:')) return buyTech(profile, id.slice(5));
  if (id.startsWith('weapon:')) return buyWeapon(profile, id.slice(7));

  const item = findItem(id);
  if (!item) return false;

  const level = getUpgradeLevel(profile, item.id);
  if (level >= item.maxLevel) return false;

  const cost = getUpgradeCost(profile, item);
  if (profile.cash < cost) return false;

  profile.cash -= cost;
  profile.upgradeLevels[item.id] = level + 1;

  // Reinforcing raises the ceiling but doesn't patch the holes — the new
  // health has to be repaired like any other missing health. Otherwise
  // reinforcing would quietly be a free repair too.
  return true;
}

function buyTech(profile, id) {
  const tech = CONFIG.tech[id];
  if (!tech) return false;

  const level = getTechLevel(profile, id);
  if (level >= tech.maxLevel) return false;

  const cost = getTechCost(profile, id);
  if (profile.cash < cost) return false;

  profile.cash -= cost;
  profile.techLevels[id] = level + 1;
  return true;
}

function hireGuard(profile) {
  if (profile.hiredGuards >= CONFIG.help.maxHires) return false;

  const cost = getHireCost(profile);
  if (profile.cash < cost) return false;

  profile.cash -= cost;
  profile.hiredGuards += 1;
  return true;
}

function buyWeapon(profile, weaponId) {
  const weapon = getWeapon(weaponId);

  if (ownsWeapon(profile, weaponId)) return false;
  if (profile.cash < weapon.cost) return false;

  profile.cash -= weapon.cost;
  profile.ownedWeapons.push(weaponId);
  return true;
}

function buyRepair(profile) {
  const cost = getRepairCost(profile);
  if (cost <= 0 || profile.cash < cost) return false;

  profile.cash -= cost;
  profile.barricadeHealth = null;
  return true;
}
