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

export function createProfile() {
  return {
    day: 1,
    cash: 0,

    // upgrade id -> how many levels you've bought.
    upgradeLevels: {},

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

export function getUpgradeLevel(profile, id) {
  return profile.upgradeLevels[id] || 0;
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

    bulletDamage: CONFIG.bullet.damage + level('damage') * effect('damage'),

    // Multiplied, not subtracted — see the note in config.js.
    fireIntervalSeconds:
      CONFIG.weapon.fireIntervalSeconds * Math.pow(effect('firerate'), level('firerate')),

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
export function calculatePay(stats) {
  const cfg = CONFIG.economy;

  const lines = [
    ['SHIFT PAY', cfg.basePayPerNight],
    ['SCALPERS STOPPED', stats.scalpersStopped * cfg.payPerScalperStopped],
    ['PACKS SAVED', stats.packsSaved * cfg.payPerPackSaved],
  ];

  if (stats.barricadeHeld) {
    lines.push(['BARRICADE HELD', cfg.barricadeHeldBonus]);
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

function buyRepair(profile) {
  const cost = getRepairCost(profile);
  if (cost <= 0 || profile.cash < cost) return false;

  profile.cash -= cost;
  profile.barricadeHealth = null;
  return true;
}
