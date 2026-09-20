// =============================================================================
// pixel.js — small drawing helpers shared by everything on screen.
//
// These live here rather than inside one character's file because the guard,
// the scalpers and the barricade all want them. One copy, used everywhere.
// =============================================================================

import { CONFIG } from './config.js';

// Draws a chunky 2-pixel-wide line between two points by stepping along it.
// Used for arms and gun barrels, which point in any direction and would turn
// to mush if we tried to rotate a picture at this size.
export function drawPixelLine(ctx, from, to, color) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance));

  ctx.fillStyle = color;
  for (let step = 0; step <= steps; step++) {
    const progress = step / steps;
    const x = Math.round(from.x + (to.x - from.x) * progress);
    const y = Math.round(from.y + (to.y - from.y) * progress);
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}

// A small shadow under a character's feet, so they look planted on the floor
// instead of floating above it.
export function drawFootShadow(ctx, x, y, width = 12) {
  const half = Math.round(width / 2);

  ctx.fillStyle = CONFIG.colors.floorContactShadow;
  ctx.fillRect(Math.round(x) - half, Math.round(y), width, 2);
  ctx.fillRect(Math.round(x) - half + 2, Math.round(y) - 1, width - 4, 1);
}

// A health bar. Used for the barricade now, and for bosses later.
//
// The colour shifts from green through yellow to red as it empties, so you can
// read how much trouble you're in out of the corner of your eye without having
// to actually look at it.
export function drawHealthBar(ctx, x, y, width, height, fraction) {
  const c = CONFIG.colors;
  const safeFraction = Math.min(Math.max(fraction, 0), 1);

  // Dark outline and empty track
  ctx.fillStyle = c.healthBarOutline;
  ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
  ctx.fillStyle = c.healthBarEmpty;
  ctx.fillRect(x, y, width, height);

  if (safeFraction <= 0) return;

  let fillColor = c.healthBarGood;
  if (safeFraction < 0.3) {
    fillColor = c.healthBarCritical;
  } else if (safeFraction < 0.6) {
    fillColor = c.healthBarWarning;
  }

  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, Math.round(width * safeFraction), height);
}
