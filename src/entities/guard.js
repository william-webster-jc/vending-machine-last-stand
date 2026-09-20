// =============================================================================
// guard.js — you, the mall security guard.
//
// Drawn in side profile facing right, toward the barricade. Movement arrives
// in M2 and shooting in M3; for now he just stands his post.
//
// IMPORTANT: guard.y is his FEET, not his head. Everything that touches the
// floor is measured from the feet, which makes depth sorting simple later.
// =============================================================================

import { CONFIG } from '../config.js';

export function drawGuard(ctx, guard) {
  const { width, height } = CONFIG.guard;
  const c = CONFIG.colors;

  const left = Math.round(guard.x - width / 2);
  const top = Math.round(guard.y - height);

  drawShadow(ctx, guard);

  // Boots
  ctx.fillStyle = c.guardBoot;
  ctx.fillRect(left + 2, top + 23, 4, 3);
  ctx.fillRect(left + 7, top + 23, 5, 3);

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

  // Badge on the chest
  ctx.fillStyle = c.machineTrim;
  ctx.fillRect(left + 4, top + 11, 2, 2);

  // Head
  ctx.fillStyle = c.guardSkin;
  ctx.fillRect(left + 4, top + 3, 6, 6);

  // Cap, with a brim pointing right — this is what tells you which way he faces.
  ctx.fillStyle = c.guardCap;
  ctx.fillRect(left + 3, top, 7, 3);
  ctx.fillRect(left + 10, top + 2, 3, 1);

  drawArmAndGun(ctx, left, top);
}

// The right arm held out with the pistol, aimed toward the barricade.
function drawArmAndGun(ctx, left, top) {
  const c = CONFIG.colors;

  // Arm
  ctx.fillStyle = c.guardUniform;
  ctx.fillRect(left + 10, top + 11, 4, 3);

  // Hand
  ctx.fillStyle = c.guardSkin;
  ctx.fillRect(left + 13, top + 11, 2, 3);

  // Pistol
  ctx.fillStyle = c.gunMetal;
  ctx.fillRect(left + 15, top + 11, 4, 2);
  ctx.fillRect(left + 15, top + 13, 2, 2);
}

// A soft oval-ish shadow under the feet, so he's planted on the floor.
function drawShadow(ctx, guard) {
  const c = CONFIG.colors;
  const centerX = Math.round(guard.x);
  const y = Math.round(guard.y);

  ctx.fillStyle = c.floorContactShadow;
  ctx.fillRect(centerX - 6, y, 12, 2);
  ctx.fillRect(centerX - 4, y - 1, 8, 1);
}
