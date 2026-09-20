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

export function drawGuard(ctx, guard) {
  const { width, height } = CONFIG.guard;
  const c = CONFIG.colors;

  const left = Math.round(guard.x - width / 2);
  const top = Math.round(guard.y - height);
  const facingRight = guard.facing >= 0;

  drawFootShadow(ctx, guard.x, guard.y, 12);

  // Boots
  ctx.fillStyle = c.guardBoot;
  if (facingRight) {
    ctx.fillRect(left + 2, top + 23, 4, 3);
    ctx.fillRect(left + 7, top + 23, 5, 3);
  } else {
    ctx.fillRect(left + 1, top + 23, 5, 3);
    ctx.fillRect(left + 7, top + 23, 4, 3);
  }

  // Legs
  ctx.fillStyle = c.guardUniformDark;
  ctx.fillRect(left + 3, top + 18, 3, 5);
  ctx.fillRect(left + 7, top + 18, 3, 5);

  // Torso
  ctx.fillStyle = c.guardUniform;
  ctx.fillRect(left + 2, top + 9, 9, 9);

  // Belt
  ctx.fillStyle = c.guardCap;
  ctx.fillRect(left + 2, top + 17, 9, 2);

  // Badge on the chest, on whichever side he's turned toward
  ctx.fillStyle = c.machineTrim;
  ctx.fillRect(facingRight ? left + 4 : left + 7, top + 11, 2, 2);

  // Head
  ctx.fillStyle = c.guardSkin;
  ctx.fillRect(left + 4, top + 3, 6, 6);

  // Cap. The brim points the way he's facing — at this size it's the clearest
  // signal of which direction he's turned.
  ctx.fillStyle = c.guardCap;
  ctx.fillRect(left + 3, top, 7, 3);
  ctx.fillRect(facingRight ? left + 10 : left, top + 2, 3, 1);

  drawArmAndGun(ctx, guard);
}

// The shooting arm, drawn fresh every frame pointing at your mouse.
//
// Rather than rotating a picture of an arm — fiddly and blurry at this size —
// we just work out where the hand ends up and draw a short line of chunky
// pixels out to it. At 13 pixels tall that reads perfectly.
function drawArmAndGun(ctx, guard) {
  const c = CONFIG.colors;
  const { armLength } = CONFIG.guard;
  const { barrelLength } = CONFIG.weapon;

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

  drawPixelLine(ctx, shoulder, hand, c.guardUniform);
  drawPixelLine(ctx, hand, muzzle, c.gunMetal);

  ctx.fillStyle = c.guardSkin;
  ctx.fillRect(Math.round(hand.x) - 1, Math.round(hand.y) - 1, 2, 2);
}
