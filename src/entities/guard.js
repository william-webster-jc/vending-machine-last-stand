// =============================================================================
// guard.js — you, the mall security guard.
//
// Drawn in side profile facing right, toward the barricade, because that's
// where the threat is. Shooting arrives in M3.
//
// IMPORTANT: guard.y is his FEET, not his head. Everything that touches the
// floor is measured from the feet, which makes depth sorting simple later.
// =============================================================================

import { CONFIG } from '../config.js';
import { getMoveDirection } from '../input.js';

// -----------------------------------------------------------------------------
// MOVEMENT
// -----------------------------------------------------------------------------

export function updateGuard(guard, deltaSeconds) {
  const { speed, verticalSpeedFactor } = CONFIG.guard;
  const direction = getMoveDirection();

  // Standing still. Nothing to do.
  if (direction.x === 0 && direction.y === 0) return;

  // Holding W and D together gives a direction of (1, -1). Left as-is, that
  // arrow is about 1.41 units long instead of 1, so diagonal movement would be
  // 41% faster than walking straight. Dividing by the arrow's own length
  // shrinks it back to exactly 1, which is what keeps every direction equal.
  const arrowLength = Math.hypot(direction.x, direction.y);
  const unitX = direction.x / arrowLength;
  const unitY = direction.y / arrowLength;

  // Multiplying by deltaSeconds is what makes this "pixels per second" rather
  // than "pixels per frame" — so the guard walks at the same real-world pace
  // on a 60Hz screen and a 144Hz one.
  guard.x += unitX * speed * deltaSeconds;
  guard.y += unitY * speed * verticalSpeedFactor * deltaSeconds;

  keepGuardInPatrolArea(guard);
}

// The rectangle of floor the guard is allowed to stand on: hemmed in by the
// vending machine on the left, the barricade on the right, and the back and
// front edges of the walkable floor band.
//
// These are worked out from wherever the machine and barricade actually are,
// rather than being typed in as fixed numbers. That means if you move the
// barricade in config.js, your patrol area moves with it automatically.
export function getPatrolArea() {
  const { width, clearance } = CONFIG.guard;
  const halfWidth = width / 2;

  const machineRightEdge = CONFIG.machine.x + CONFIG.machine.width;
  const barricadeLeftEdge = CONFIG.barricade.x;

  return {
    minX: machineRightEdge + clearance + halfWidth,
    maxX: barricadeLeftEdge - clearance - halfWidth,
    minY: CONFIG.world.walkTopY,
    maxY: CONFIG.world.walkBottomY,
  };
}

// Shove the guard back inside the patrol area if he just stepped out of it.
// Clamping after moving (rather than refusing the move) is what makes him
// slide cleanly along a wall instead of sticking to it.
function keepGuardInPatrolArea(guard) {
  const area = getPatrolArea();

  guard.x = Math.min(Math.max(guard.x, area.minX), area.maxX);
  guard.y = Math.min(Math.max(guard.y, area.minY), area.maxY);
}

// -----------------------------------------------------------------------------
// DRAWING
// -----------------------------------------------------------------------------

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
