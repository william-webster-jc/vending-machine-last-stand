// =============================================================================
// guard-art.js — what the security guard looks like.
//
// Mall security kitted out like a marine: olive fatigues, a plate carrier, and
// a visored helmet with a green glow behind it. DOOM by way of a staff room.
//
// Drawn in an 18x36 sprite space. Hired crew run through the exact same code
// with a different palette, so they read as colleagues rather than as a
// different species.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawPixelLine, drawFootShadow } from '../pixel.js';
import { getShoulderPosition } from './guard.js';

const SPRITE_WIDTH = 18;
const SPRITE_HEIGHT = 36;

export function getGuardPalette() {
  const c = CONFIG.colors;
  return {
    uniform: c.guardUniform,
    uniformDark: c.guardUniformDark,
    vest: c.guardVest,
    vestDark: c.guardVestDark,
    visor: c.guardVisor,
    helmet: c.guardCap,
    skin: c.guardSkin,
    boot: c.guardBoot,
    badge: c.guardBadge,
    gun: c.gunMetal,
    gunDark: c.gunMetalDark,
  };
}

export function getHirePalette() {
  const c = CONFIG.colors;
  return {
    ...getGuardPalette(),
    uniform: c.hireUniform,
    uniformDark: c.hireUniformDark,
    helmet: c.hireCap,
    visor: '#6fb8e0',
  };
}

export function drawGuard(ctx, guard, palette = null) {
  const paint = palette || getGuardPalette();
  const scale = (CONFIG.guard.width || SPRITE_WIDTH) / SPRITE_WIDTH;

  const left = Math.round(guard.x - CONFIG.guard.width / 2);
  const top = Math.round(guard.y - CONFIG.guard.height);

  const put = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      left + Math.round(x * scale),
      top + Math.round(y * scale),
      Math.max(1, Math.round(w * scale)),
      Math.max(1, Math.round(h * scale)),
    );
  };

  const facingRight = guard.facing >= 0;

  drawFootShadow(ctx, guard.x, guard.y, Math.round(14 * scale));

  drawLegs(put, paint, facingRight);
  drawTorso(put, paint, facingRight);
  drawHelmet(put, paint, facingRight);
  drawArmAndGun(ctx, guard, paint);
}

// Combat trousers bloused into boots.
function drawLegs(put, paint, facingRight) {
  put(4, 23, 5, 9, paint.uniform);
  put(9, 23, 5, 9, paint.uniformDark);

  put(3, 30, 6, 4, paint.boot);
  put(9, 30, 6, 4, paint.boot);

  // Toe cap points the way he's facing.
  put(facingRight ? 14 : 2, 32, 2, 2, paint.boot);
}

// Fatigues under a plate carrier. The vest is the darkest block on him, which
// is what gives the silhouette its weight.
function drawTorso(put, paint, facingRight) {
  put(3, 12, 12, 12, paint.uniform);
  put(3, 12, 12, 2, paint.uniformDark);

  // Plate carrier.
  put(4, 14, 10, 8, paint.vest);
  put(4, 14, 10, 1, paint.vestDark);
  put(4, 18, 10, 1, paint.vestDark);

  // Shoulder plates.
  put(2, 13, 3, 4, paint.vestDark);
  put(13, 13, 3, 4, paint.vestDark);

  // Badge on the chest, on whichever side he's turned toward.
  put(facingRight ? 5 : 11, 15, 2, 2, paint.badge);
}

// Helmet with a visor slot. The glow is the only bright thing on his head,
// so it's what your eye tracks when he's in a crowd.
function drawHelmet(put, paint, facingRight) {
  put(5, 3, 9, 9, paint.skin);

  put(4, 1, 11, 5, paint.helmet);
  put(4, 6, 2, 4, paint.helmet);
  put(13, 6, 2, 4, paint.helmet);

  // Visor slot.
  const visorX = facingRight ? 6 : 5;
  put(visorX, 6, 7, 2, paint.visor);

  // Brim juts the way he's facing.
  put(facingRight ? 14 : 2, 4, 3, 2, paint.helmet);
}

// The shooting arm, drawn fresh every frame pointing at your mouse.
//
// Rather than rotating a picture of an arm — fiddly and blurry at this size —
// we work out where the hand ends up and draw a short line of chunky pixels
// out to it. It reads perfectly and stays crisp at every angle.
function drawArmAndGun(ctx, guard, paint) {
  const { armLength, barrelLength } = CONFIG.guard;

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

  // A darker underline along the barrel gives it thickness.
  drawPixelLine(
    ctx,
    { x: hand.x, y: hand.y + 1 },
    { x: muzzle.x, y: muzzle.y + 1 },
    paint.gunDark,
  );

  ctx.fillStyle = paint.skin;
  ctx.fillRect(Math.round(hand.x) - 1, Math.round(hand.y) - 1, 3, 3);

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
  ctx.fillRect(x - 3, y - 3, 7, 7);
  ctx.fillStyle = c.sparkHot;
  ctx.fillRect(x - 2, y - 2, 5, 5);
  ctx.fillRect(Math.round(x + aimX * 4) - 1, Math.round(y + aimY * 4) - 1, 3, 3);
}
