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
import { getScalperHitBox } from './scalper.js';

// Create one bullet, travelling outward from (x, y) in the given direction.
// The angle is in radians — 0 points right, and it goes clockwise from there.
export function spawnBullet(world, x, y, angle) {
  world.bullets.push({
    x,
    y,
    // We work out the horizontal and vertical speed ONCE, here at birth,
    // instead of recalculating the angle every frame for every bullet.
    velocityX: Math.cos(angle) * CONFIG.bullet.speed,
    velocityY: Math.sin(angle) * CONFIG.bullet.speed,
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
    if (hitAScalper(bullet, world)) {
      bullets.splice(i, 1);
    }
  }
}

// Check this bullet against every scalper on the floor. Comparing everything
// to everything like this is the simplest way to do collisions, and at a few
// dozen of each it costs nothing. If we ever had thousands we'd need to be
// cleverer, but we won't.
function hitAScalper(bullet, world) {
  for (const scalper of world.scalpers) {
    if (scalper.health <= 0) continue;

    if (isOverlapping(bullet, getScalperHitBox(scalper))) {
      scalper.health -= world.stats.bulletDamage;
      return true;
    }
  }

  return false;
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
