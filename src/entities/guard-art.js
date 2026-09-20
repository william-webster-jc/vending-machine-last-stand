// =============================================================================
// guard-art.js — what the security guard looks like.
//
// Kept separate from guard.js so "how he behaves" and "how he looks" don't
// tangle together. When your real pixel art arrives, this is the only file
// that has to change.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawPixelLine, drawFootShadow } from '../pixel.js';
import { getShoulderPosition } from './guard.js';

// The colours a guard is painted in. Hired help uses exactly the same
// drawing with a different set, so they read as colleagues in a different
// uniform rather than as a different kind of thing entirely.
export function getGuardPalette() {
  const c = CONFIG.colors;
  return {
    uniform: c.guardUniform,
    uniformDark: c.guardUniformDark,
    cap: c.guardCap,
    skin: c.guardSkin,
    boot: c.guardBoot,
    badge: c.machineTrim,
    gun: c.gunMetal,
  };
}

export function getHirePalette() {
  const c = CONFIG.colors;
  return {
    uniform: c.hireUniform,
    uniformDark: c.hireUniformDark,
    cap: c.hireCap,
    skin: c.guardSkin,
    boot: c.guardBoot,
    badge: c.machineTrim,
    gun: c.gunMetal,
  };
}

export function drawGuard(ctx, guard, palette = null) {
  const { width, height } = CONFIG.guard;
  const c = CONFIG.colors;
  const paint = palette || getGuardPalette();

  const left = Math.round(guard.x - width / 2);
  const top = Math.round(guard.y - height);
  const facingRight = guard.facing >= 0;

  drawFootShadow(ctx, guard.x, guard.y, 12);

  // Boots
  ctx.fillStyle = paint.boot;
  if (facingRight) {
    ctx.fillRect(left + 2, top + 23, 4, 3);
    ctx.fillRect(left + 7, top + 23, 5, 3);
  } else {
    ctx.fillRect(left + 1, top + 23, 5, 3);
    ctx.fillRect(left + 7, top + 23, 4, 3);
  }

  // Legs
  ctx.fillStyle = paint.uniformDark;
  ctx.fillRect(left + 3, top + 18, 3, 5);
  ctx.fillRect(left + 7, top + 18, 3, 5);

  // Torso
  ctx.fillStyle = paint.uniform;
  ctx.fillRect(left + 2, top + 9, 9, 9);

  // Belt
  ctx.fillStyle = paint.cap;
  ctx.fillRect(left + 2, top + 17, 9, 2);

  // Badge on the chest, on whichever side he's turned toward
  ctx.fillStyle = paint.badge;
  ctx.fillRect(facingRight ? left + 4 : left + 7, top + 11, 2, 2);

  // Head
  ctx.fillStyle = paint.skin;
  ctx.fillRect(left + 4, top + 3, 6, 6);

  // Cap. The brim points the way he's facing — at this size it's the clearest
  // signal of which direction he's turned.
  ctx.fillStyle = paint.cap;
  ctx.fillRect(left + 3, top, 7, 3);
  ctx.fillRect(facingRight ? left + 10 : left, top + 2, 3, 1);

  drawArmAndGun(ctx, guard, paint);
}

// The shooting arm, drawn fresh every frame pointing at your mouse.
//
// Rather than rotating a picture of an arm — fiddly and blurry at this size —
// we just work out where the hand ends up and draw a short line of chunky
// pixels out to it. At 13 pixels tall that reads perfectly.
function drawArmAndGun(ctx, guard, paint) {
  const { armLength } = CONFIG.guard;
  const { barrelLength } = CONFIG.guard;

  const shoulder = getShoulderPosition(guard);
  const aimX = Math.cos(guard.aimAngle);
  const aimY = Math.sin(guard.aimAngle);

  const hand = {
    x: shoulder.x + aimX * armLength,
    y: shoulder.y + aimY * armLength,
  };
  const muzzle = {
    x: shoulder.x + aimX * (armLength + barrelLength),
    y: shoulder.y + aimY * (armLength + barrelLength),
  };

  drawPixelLine(ctx, shoulder, hand, paint.uniform);
  drawPixelLine(ctx, hand, muzzle, paint.gun);

  ctx.fillStyle = paint.skin;
  ctx.fillRect(Math.round(hand.x) - 1, Math.round(hand.y) - 1, 2, 2);

  drawMuzzleFlash(ctx, guard, muzzle, aimX, aimY);
}

// A brief burst at the end of the barrel. It lasts well under a tenth of a
// second on purpose — any longer and it stops reading as a bang and starts
// reading as a lamp.
function drawMuzzleFlash(ctx, guard, muzzle, aimX, aimY) {
  if (!guard.muzzleFlash || guard.muzzleFlash <= 0) return;

  const c = CONFIG.colors;
  const x = Math.round(muzzle.x + aimX * 2);
  const y = Math.round(muzzle.y + aimY * 2);

  ctx.fillStyle = c.sparkCool;
  ctx.fillRect(x - 2, y - 2, 5, 5);
  ctx.fillStyle = c.sparkHot;
  ctx.fillRect(x - 1, y - 1, 3, 3);

  // A short spit of flame along the aim line.
  ctx.fillRect(Math.round(x + aimX * 3) - 1, Math.round(y + aimY * 3) - 1, 2, 2);
}
