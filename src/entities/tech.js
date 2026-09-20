// =============================================================================
// tech.js — the things bolted to the barricade.
//
// A turret that fires on its own, mines laid in the approach, and a drone that
// patches the wall while you fight.
//
// What they all have in common, and the reason they're worth money: they work
// while you are looking somewhere else. Your attention is the scarcest thing
// you have in a bad night, and this is how you buy some back.
//
// None of them draw wages. Unlike a hire, you pay once — which makes them the
// long-term investment your crew isn't.
// =============================================================================

import { CONFIG } from '../config.js';
import { spawnBullet } from './bullet.js';
import { getScalperHitBox } from './scalper.js';
import { damageBarricade } from './barricade.js';
import { addShake, spawnSmoke } from '../juice.js';
import { playExplosion } from '../audio.js';

// -----------------------------------------------------------------------------
// SETUP
// -----------------------------------------------------------------------------

export function createTech(profile) {
  return {
    turrets: createTurrets(profile.techLevels.turret || 0),
    mines: layMines(profile.techLevels.mines || 0),
    drone: createDrone(profile.techLevels.drone || 0),
    blasts: [],
  };
}

// Guns spaced down the height of the barricade, so more of them means more
// of the floor is covered rather than the same spot covered harder.
function createTurrets(level) {
  const turrets = [];
  const cfg = CONFIG.barricade;

  for (let i = 0; i < level; i++) {
    const depth = (i + 1) / (level + 1);
    turrets.push({
      x: cfg.x + cfg.width / 2,
      y: cfg.topY + (cfg.bottomY - cfg.topY) * depth,
      fireCooldown: i * 0.3,
      aimAngle: 0,
    });
  }

  return turrets;
}

// Mines go on the FAR side of the wall, scattered across the approach, so
// they catch the crowd before it arrives rather than after.
function layMines(level) {
  const mines = [];
  const count = level * CONFIG.tech.mines.perLevel;

  const nearEdge = CONFIG.barricade.x + CONFIG.barricade.width + 24;
  const farEdge = CONFIG.screen.width - 20;
  const { walkTopY, walkBottomY } = CONFIG.world;

  for (let i = 0; i < count; i++) {
    mines.push({
      x: nearEdge + Math.random() * (farEdge - nearEdge),
      y: walkTopY + Math.random() * (walkBottomY - walkTopY),
      armed: true,
      fuse: 0,
      blinkPhase: Math.random() * 6,
    });
  }

  return mines;
}

function createDrone(level) {
  if (level <= 0) return null;

  return {
    level,
    x: CONFIG.barricade.x - 16,
    y: CONFIG.barricade.topY + 20,
    driftPhase: 0,
  };
}

// -----------------------------------------------------------------------------
// TICK
// -----------------------------------------------------------------------------

export function updateTech(world, deltaSeconds) {
  updateTurrets(world, deltaSeconds);
  updateMines(world, deltaSeconds);
  updateDrone(world, deltaSeconds);
  updateBlasts(world, deltaSeconds);
}

function updateTurrets(world, deltaSeconds) {
  const cfg = CONFIG.tech.turret;

  for (const turret of world.tech.turrets) {
    turret.fireCooldown -= deltaSeconds;

    const target = findNearest(world, turret, cfg.range);
    if (!target) continue;

    turret.aimAngle = Math.atan2(target.y - turret.y, target.x - turret.x);
    if (turret.fireCooldown > 0) continue;

    const spread = (cfg.spreadDegrees * Math.PI) / 180;
    const angle = turret.aimAngle + (Math.random() - 0.5) * spread;

    spawnBullet(
      world,
      turret.x + Math.cos(angle) * 8,
      turret.y + Math.sin(angle) * 8,
      angle,
      Math.round(cfg.damage * world.stats.damageMultiplier),
      cfg.bulletSpeed,
    );

    turret.fireCooldown = cfg.fireIntervalSeconds;
  }
}

function updateMines(world, deltaSeconds) {
  const cfg = CONFIG.tech.mines;

  for (let i = world.tech.mines.length - 1; i >= 0; i--) {
    const mine = world.tech.mines[i];
    mine.blinkPhase += deltaSeconds * 4;

    // Already triggered: count down and go off.
    if (!mine.armed) {
      mine.fuse -= deltaSeconds;
      if (mine.fuse <= 0) {
        detonate(world, mine, cfg);
        world.tech.mines.splice(i, 1);
      }
      continue;
    }

    // Armed: wait for someone to tread on it.
    if (isSomeoneStandingOn(world, mine, cfg.triggerRadius)) {
      mine.armed = false;
      mine.fuse = cfg.fuseSeconds;
    }
  }
}

function detonate(world, mine, cfg) {
  const damage = Math.round(cfg.damage * world.stats.damageMultiplier);

  for (const scalper of world.scalpers) {
    if (scalper.health <= 0) continue;

    const box = getScalperHitBox(scalper);
    const centerX = (box.left + box.right) / 2;
    const centerY = (box.top + box.bottom) / 2;

    if (Math.hypot(centerX - mine.x, centerY - mine.y) <= cfg.blastRadius) {
      scalper.health -= damage;
      scalper.hitFlash = CONFIG.scalper.hitFlashSeconds;
    }
  }

  addShake(world, CONFIG.juice.shakeOnExplosion * 0.7);
  spawnSmoke(world, mine.x, mine.y, cfg.blastRadius);
  playExplosion();

  world.tech.blasts.push({
    x: mine.x,
    y: mine.y,
    radius: cfg.blastRadius,
    life: 0.24,
    totalLife: 0.24,
  });
}

// The drone patches the wall, but only while there IS a wall. Once it's
// down it stays down until morning — otherwise a breach would quietly heal
// itself and the whole tension of a breach would evaporate.
function updateDrone(world, deltaSeconds) {
  const drone = world.tech.drone;
  if (!drone) return;

  drone.driftPhase += deltaSeconds * 1.6;

  const barricade = world.barricade;
  if (barricade.isBroken) return;
  if (barricade.health >= barricade.maxHealth) return;

  const repair = CONFIG.tech.drone.repairPerSecond * drone.level * deltaSeconds;
  barricade.health = Math.min(barricade.maxHealth, barricade.health + repair);
}

function updateBlasts(world, deltaSeconds) {
  for (let i = world.tech.blasts.length - 1; i >= 0; i--) {
    world.tech.blasts[i].life -= deltaSeconds;
    if (world.tech.blasts[i].life <= 0) world.tech.blasts.splice(i, 1);
  }
}

// -----------------------------------------------------------------------------

function findNearest(world, from, range) {
  let best = null;
  let bestDistanceSquared = range * range;

  for (const scalper of world.scalpers) {
    if (scalper.health <= 0) continue;

    const box = getScalperHitBox(scalper);
    const centerX = (box.left + box.right) / 2;
    const centerY = (box.top + box.bottom) / 2;

    const distanceSquared = (centerX - from.x) ** 2 + (centerY - from.y) ** 2;
    if (distanceSquared < bestDistanceSquared) {
      best = { x: centerX, y: centerY };
      bestDistanceSquared = distanceSquared;
    }
  }

  return best;
}

function isSomeoneStandingOn(world, mine, radius) {
  for (const scalper of world.scalpers) {
    if (scalper.health <= 0) continue;
    if (Math.hypot(scalper.x - mine.x, scalper.y - mine.y) <= radius) return true;
  }

  // The boss sets them off too, and it's one of the few things that actually
  // hurts him outside a wind-up.
  const boss = world.boss;
  if (boss && boss.health > 0) {
    if (Math.hypot(boss.x - mine.x, boss.y - mine.y) <= radius + boss.width / 3) return true;
  }

  return false;
}
