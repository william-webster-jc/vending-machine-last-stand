// =============================================================================
// grenade.js — lobbed explosives.
//
// Different from a bullet in three ways: it arcs through the air rather than
// flying flat, it goes off on a fuse rather than on contact, and when it does
// it hurts EVERYTHING nearby rather than one thing.
//
// That last part is what makes it worth carrying. A shotgun clears the front
// of a queue; a grenade clears the whole queue.
// =============================================================================

import { CONFIG } from '../config.js';
import { getScalperHitBox } from './scalper.js';
import { getBossHitBox, getWeakPointBox, damageBoss } from './boss.js';
import { addShake, spawnSmoke } from '../juice.js';

const EXPLOSION_SECONDS = CONFIG.weapons.find((w) => w.id === 'grenades').explosionSeconds;

// Lob a grenade AT A POINT — normally wherever your crosshair is.
//
// The obvious version gives every grenade the same fuse and lets it fly, but
// then it always lands the same distance away no matter where you aimed, and
// you can't place it at all. Instead the fuse is worked out from how far the
// target is, so it goes off exactly when it gets there.
//
// Beyond the weapon's range it falls short rather than refusing to throw,
// which is what your arm would do.
export function throwGrenade(world, x, y, targetX, targetY, weapon, damage) {
  const toTargetX = targetX - x;
  const toTargetY = targetY - y;

  const distanceToTarget = Math.max(1, Math.hypot(toTargetX, toTargetY));
  const maxRange = weapon.throwSpeed * weapon.fuseSeconds;
  const travel = Math.min(distanceToTarget, maxRange);

  const fuse = travel / weapon.throwSpeed;

  world.grenades.push({
    x,
    y,
    velocityX: (toTargetX / distanceToTarget) * weapon.throwSpeed,
    velocityY: (toTargetY / distanceToTarget) * weapon.throwSpeed,

    fuse,
    totalFuse: fuse,
    damage,
    blastRadius: weapon.blastRadius,

    // A short throw arcs less than a long one, so it looks thrown rather than
    // launched.
    arcHeight: weapon.arcHeight * (travel / maxRange),
  });
}

export function updateGrenades(world, deltaSeconds) {
  const { grenades, explosions } = world;

  for (let i = grenades.length - 1; i >= 0; i--) {
    const grenade = grenades[i];

    grenade.x += grenade.velocityX * deltaSeconds;
    grenade.y += grenade.velocityY * deltaSeconds;
    grenade.fuse -= deltaSeconds;

    if (grenade.fuse <= 0) {
      explode(world, grenade);
      grenades.splice(i, 1);
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life -= deltaSeconds;
    if (explosions[i].life <= 0) explosions.splice(i, 1);
  }
}

function explode(world, grenade) {
  // A grenade landing on the boss counts as a weak point hit if the blast
  // reaches the open plate — lobbing one into a wind-up is a legitimate,
  // and very satisfying, way to break a charge.
  const boss = world.boss;
  if (boss && boss.health > 0) {
    const body = getBossHitBox(boss);
    const centerX = (body.left + body.right) / 2;
    const centerY = (body.top + body.bottom) / 2;

    if (Math.hypot(centerX - grenade.x, centerY - grenade.y) <= grenade.blastRadius + boss.width / 3) {
      const weak = getWeakPointBox(boss);
      const weakX = (weak.left + weak.right) / 2;
      const weakY = (weak.top + weak.bottom) / 2;
      const reachedWeakPoint =
        Math.hypot(weakX - grenade.x, weakY - grenade.y) <= grenade.blastRadius;

      damageBoss(boss, grenade.damage, reachedWeakPoint);
    }
  }

  // Everything inside the blast takes the full hit. Falling off with distance
  // would be more realistic and much harder to read — at this size you want
  // "was it close enough or not", not a damage gradient.
  for (const scalper of world.scalpers) {
    if (scalper.health <= 0) continue;

    const box = getScalperHitBox(scalper);
    const centerX = (box.left + box.right) / 2;
    const centerY = (box.top + box.bottom) / 2;

    const distance = Math.hypot(centerX - grenade.x, centerY - grenade.y);
    if (distance <= grenade.blastRadius) {
      scalper.health -= grenade.damage;
    }
  }

  addShake(world, CONFIG.juice.shakeOnExplosion);
  spawnSmoke(world, grenade.x, grenade.y, grenade.blastRadius);

  world.explosions.push({
    x: grenade.x,
    y: grenade.y,
    radius: grenade.blastRadius,
    life: EXPLOSION_SECONDS,
    totalLife: EXPLOSION_SECONDS,
  });
}

// How high off the floor a grenade is drawn, as it arcs up and back down.
//
// This is purely visual — the blast still happens at its floor position. A
// real height would mean tracking a third dimension through every collision
// check, for something the player reads as "it went up and came down".
function getArcHeight(grenade) {
  const through = 1 - grenade.fuse / grenade.totalFuse;

  // A simple up-and-down curve: zero at both ends, highest in the middle.
  return Math.sin(through * Math.PI) * grenade.arcHeight;
}

export function drawGrenades(ctx, world) {
  const c = CONFIG.colors;

  for (const grenade of world.grenades) {
    const x = Math.round(grenade.x);
    const groundY = Math.round(grenade.y);
    const y = groundY - Math.round(getArcHeight(grenade));

    // A shadow on the floor underneath, which is what tells you where it's
    // actually going to land.
    ctx.fillStyle = c.floorContactShadow;
    ctx.fillRect(x - 2, groundY, 5, 2);

    ctx.fillStyle = c.grenadeBody;
    ctx.fillRect(x - 2, y - 3, 5, 5);
    ctx.fillStyle = c.grenadeTop;
    ctx.fillRect(x - 1, y - 5, 3, 2);
  }
}

export function drawExplosions(ctx, world) {
  const c = CONFIG.colors;

  for (const blast of world.explosions) {
    const through = 1 - blast.life / blast.totalLife;

    // The ring rushes outward and the bright core shrinks behind it.
    const outer = Math.round(blast.radius * (0.45 + through * 0.55));
    const inner = Math.round(outer * (1 - through) * 0.8);

    drawRing(ctx, blast.x, blast.y, outer, c.blastOuter);
    if (inner > 1) drawRing(ctx, blast.x, blast.y, inner, c.blastInner);
  }
}

// A chunky pixel circle, drawn as one horizontal bar per row.
function drawRing(ctx, centerX, centerY, radius, color) {
  ctx.fillStyle = color;

  for (let offsetY = -radius; offsetY <= radius; offsetY += 2) {
    const halfWidth = Math.round(Math.sqrt(Math.max(0, radius * radius - offsetY * offsetY)));
    if (halfWidth <= 0) continue;

    ctx.fillRect(
      Math.round(centerX - halfWidth),
      Math.round(centerY + offsetY),
      halfWidth * 2,
      2,
    );
  }
}
