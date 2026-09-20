// =============================================================================
// hire.js — the guards you interview and take on.
//
// THE BIG IDEA here is simple AI: a character that picks its own target and
// acts without you. It runs on exactly the same bullets, the same collision
// and the same damage as your own gun — the only difference is that something
// other than a mouse decides when to pull the trigger.
//
// That's usually how game AI works. It isn't a separate system; it's a
// different thing pressing the same buttons.
// =============================================================================

import { CONFIG } from '../config.js';
import { spawnBullet } from './bullet.js';
import { getScalperHitBox } from './scalper.js';

// Where each hire stands. Spread across the patrol floor so they cover
// different depths rather than bunching on one line.
const POST_SPOTS = [
  { acrossFloor: 0.78, depth: 0.22 },
  { acrossFloor: 0.30, depth: 0.72 },
  { acrossFloor: 0.92, depth: 0.88 },
  { acrossFloor: 0.10, depth: 0.38 },
];

export function createHires(count) {
  const hires = [];

  for (let i = 0; i < count; i++) {
    const spot = POST_SPOTS[i % POST_SPOTS.length];
    hires.push({
      x: getPostX(spot.acrossFloor),
      y: getPostY(spot.depth),
      facing: 1,
      aimAngle: 0,
      fireCooldown: 0,
      reactionTimer: 0,
    });
  }

  return hires;
}

function getPostX(acrossFloor) {
  const left = CONFIG.machine.x + CONFIG.machine.width + 10;
  const right = CONFIG.barricade.x - 12;
  return left + (right - left) * acrossFloor;
}

function getPostY(depth) {
  const { walkTopY, walkBottomY } = CONFIG.world;
  return walkTopY + (walkBottomY - walkTopY) * depth;
}

// -----------------------------------------------------------------------------
// BEHAVIOUR
// -----------------------------------------------------------------------------

export function updateHires(world, deltaSeconds) {
  for (const hire of world.hires) {
    updateOneHire(hire, world, deltaSeconds);
  }
}

function updateOneHire(hire, world, deltaSeconds) {
  hire.fireCooldown -= deltaSeconds;

  const target = findNearestScalper(hire, world);

  // Nothing in range: lower the gun and forget what you were doing, so the
  // reaction delay applies again next time someone appears.
  if (!target) {
    hire.reactionTimer = 0;
    return;
  }

  const shoulder = getHireShoulder(hire);
  hire.aimAngle = Math.atan2(target.y - shoulder.y, target.x - shoulder.x);
  hire.facing = target.x >= hire.x ? 1 : -1;

  // A beat between spotting someone and firing. Without it they snap onto a
  // target and hit it the instant it crosses the range line, which reads as
  // inhuman rather than as a colleague.
  hire.reactionTimer += deltaSeconds;
  if (hire.reactionTimer < CONFIG.help.reactionSeconds) return;

  if (hire.fireCooldown > 0) return;

  fire(hire, world, shoulder);
}

// Nearest living scalper inside range. Nearest rather than weakest or most
// dangerous, because that's what a person watching a doorway would do.
function findNearestScalper(hire, world) {
  const rangeSquared = CONFIG.help.range * CONFIG.help.range;

  let best = null;
  let bestDistanceSquared = rangeSquared;

  for (const scalper of world.scalpers) {
    if (scalper.health <= 0) continue;

    const box = getScalperHitBox(scalper);
    const centerX = (box.left + box.right) / 2;
    const centerY = (box.top + box.bottom) / 2;

    const distanceSquared = (centerX - hire.x) ** 2 + (centerY - hire.y) ** 2;
    if (distanceSquared < bestDistanceSquared) {
      best = { x: centerX, y: centerY };
      bestDistanceSquared = distanceSquared;
    }
  }

  return best;
}

function fire(hire, world, shoulder) {
  const cfg = CONFIG.help;

  const spread = (cfg.spreadDegrees * Math.PI) / 180;
  const angle = hire.aimAngle + (Math.random() - 0.5) * spread;

  const reach = CONFIG.guard.armLength + CONFIG.guard.barrelLength;
  const muzzleX = shoulder.x + Math.cos(angle) * reach;
  const muzzleY = shoulder.y + Math.sin(angle) * reach;

  // Hires benefit from your damage upgrades too — you're buying better ammo
  // for the whole team, not just your own gun.
  const damage = Math.round(cfg.damage * world.stats.damageMultiplier);

  spawnBullet(world, muzzleX, muzzleY, angle, damage, cfg.bulletSpeed);
  hire.fireCooldown = cfg.fireIntervalSeconds;
}

export function getHireShoulder(hire) {
  return {
    x: hire.x,
    y: hire.y - CONFIG.guard.shoulderHeight,
  };
}
