// =============================================================================
// bullet.js — the things that come out of your gun.
//
// THE BIG IDEA of this file is spawning and despawning. Bullets aren't part of
// the scene the way the vending machine is. They pop into existence, do one
// job, and then have to be thrown away again.
//
// Getting the throwing-away part right is what stops a game slowly dying. Fire
// ten bullets a second for two minutes and you've created 1,200 of them. If
// nothing ever removed them, the game would be dragging 1,200 invisible
// objects around off-screen forever, and it would get slower and slower.
// =============================================================================

import { CONFIG } from '../config.js';
import { getScalperHitBox, getScalperHeadBox } from './scalper.js';
import { getBossHitBox, getWeakPointBox, damageBoss } from './boss.js';
import { addShake, spawnHitSparks } from '../juice.js';

// Create one bullet, travelling outward from (x, y) in the given direction.
// The angle is in radians — 0 points right, and it goes clockwise from there.
export function spawnBullet(world, x, y, angle, damage, speed = CONFIG.bullet.speed) {
  world.bullets.push({
    x,
    y,
    // We work out the horizontal and vertical speed ONCE, here at birth,
    // instead of recalculating the angle every frame for every bullet.
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,

    // Carried on the bullet rather than looked up on impact, so a round fired
    // from the shotgun still does shotgun damage after you've swapped guns.
    damage,
  });
}

export function updateBullets(world, deltaSeconds) {
  const { bullets } = world;

  // Walking the list BACKWARDS matters. If you remove item 3 while going
  // forwards, everything shuffles down a slot, item 4 becomes item 3, and the
  // loop skips straight past it. Going backwards, anything that shuffles has
  // already been dealt with.
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];

    bullet.x += bullet.velocityX * deltaSeconds;
    bullet.y += bullet.velocityY * deltaSeconds;

    if (hasLeftTheScreen(bullet)) {
      bullets.splice(i, 1);
      continue;
    }

    // A bullet that connects is used up, whether or not the hit was fatal.
    // The boss is checked first: he's the biggest thing on the floor and
    // standing in front of his own crowd, so shots should land on him.
    if (hitTheBoss(bullet, world) || hitAScalper(bullet, world)) {
      bullets.splice(i, 1);
    }
  }
}

function hitTheBoss(bullet, world) {
  const boss = world.boss;
  if (!boss || boss.health <= 0) return false;
  if (!isOverlapping(bullet, getBossHitBox(boss))) return false;

  const hitWeakPoint = isOverlapping(bullet, getWeakPointBox(boss));
  damageBoss(boss, bullet.damage, hitWeakPoint);

  spawnHitSparks(world, bullet.x, bullet.y, getBulletAngle(bullet));
  addShake(
    world,
    hitWeakPoint ? CONFIG.juice.shakeOnWeakPointHit : CONFIG.juice.shakeOnBulletHit,
  );
  return true;
}

function getBulletAngle(bullet) {
  return Math.atan2(bullet.velocityY, bullet.velocityX);
}

// Check this bullet against every scalper on the floor. Comparing everything
// to everything like this is the simplest way to do collisions, and at a few
// dozen of each it costs nothing. If we ever had thousands we'd need to be
// cleverer, but we won't.
function hitAScalper(bullet, world) {
  for (const scalper of world.scalpers) {
    if (scalper.health <= 0) continue;
    if (!isOverlapping(bullet, getScalperHitBox(scalper))) continue;

    scalper.health -= getDamageDealt(bullet, scalper);
    scalper.hitFlash = CONFIG.scalper.hitFlashSeconds;

    // Shove them back along the line of the shot. Small, and it decays fast,
    // but it's the difference between a bullet landing and a bullet hitting.
    const angle = getBulletAngle(bullet);
    scalper.knockback = Math.min(
      CONFIG.juice.knockbackMax,
      scalper.knockback + CONFIG.juice.knockbackPerHit,
    );

    spawnHitSparks(world, bullet.x, bullet.y, angle);
    addShake(world, CONFIG.juice.shakeOnBulletHit);
    return true;
  }

  return false;
}

// How much of a shot actually lands.
//
// A riot plate covers the body, so body shots barely scratch one — the head
// is the way in. Everyone else takes the full hit wherever you connect, so
// you're not asked to aim precisely at things that don't require it.
function getDamageDealt(bullet, scalper) {
  if (!scalper.armored) return bullet.damage;

  const head = getScalperHeadBox(scalper);
  if (isOverlapping(bullet, head)) {
    scalper.lastHitWasHeadshot = true;
    return bullet.damage;
  }

  scalper.lastHitWasHeadshot = false;
  return Math.max(1, Math.round(bullet.damage * CONFIG.armorDamageFactor));
}

// Two rectangles overlap unless one is entirely past the other on some side.
// It's easier to prove they DON'T touch and flip the answer than to check all
// the ways they might.
function isOverlapping(bullet, box) {
  const bulletRight = bullet.x + CONFIG.bullet.width;
  const bulletBottom = bullet.y + CONFIG.bullet.height;

  return !(
    bulletRight < box.left ||
    bullet.x > box.right ||
    bulletBottom < box.top ||
    bullet.y > box.bottom
  );
}

function hasLeftTheScreen(bullet) {
  const margin = CONFIG.bullet.despawnMargin;

  return (
    bullet.x < -margin ||
    bullet.x > CONFIG.screen.width + margin ||
    bullet.y < -margin ||
    bullet.y > CONFIG.screen.height + margin
  );
}

export function drawBullets(ctx, world) {
  const { width, height } = CONFIG.bullet;
  const c = CONFIG.colors;

  for (const bullet of world.bullets) {
    const x = Math.round(bullet.x);
    const y = Math.round(bullet.y);

    // A darker outline first, then a bright core on top. Two tones is what
    // keeps something this small visible against the busy floor tiles.
    ctx.fillStyle = c.bulletEdge;
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);

    ctx.fillStyle = c.bulletCore;
    ctx.fillRect(x, y, width, height);
  }
}
