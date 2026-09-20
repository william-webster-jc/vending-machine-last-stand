// =============================================================================
// guard.js — you, the mall security guard.
//
// He walks (M2) and now he aims and shoots (M3). He faces wherever your mouse
// is, so you can walk one way while covering another.
//
// IMPORTANT: guard.y is his FEET, not his head. Everything that touches the
// floor is measured from the feet, which makes depth sorting simple later.
// =============================================================================

import { CONFIG } from '../config.js';
import { getMoveDirection, getMousePosition, isFireHeld } from '../input.js';
import { spawnBullet } from './bullet.js';

export function updateGuard(guard, world, deltaSeconds) {
  updateAim(guard);
  updateMovement(guard, deltaSeconds);
  updateFiring(guard, world, deltaSeconds);
}

// -----------------------------------------------------------------------------
// AIMING
// -----------------------------------------------------------------------------

// Work out the angle from the guard's shoulder to the mouse, and which way
// he's turned. Stored on the guard so the drawing code and the firing code
// both read the same answer.
function updateAim(guard) {
  const mouse = getMousePosition();
  const shoulder = getShoulderPosition(guard);

  // atan2 answers the question "what angle points from here to there?".
  // 0 is straight right, and it increases clockwise (because on a screen,
  // y counts downward rather than upward).
  guard.aimAngle = Math.atan2(mouse.y - shoulder.y, mouse.x - shoulder.x);

  // 1 means turned right, -1 means turned left.
  guard.facing = mouse.x >= guard.x ? 1 : -1;
}

function getShoulderPosition(guard) {
  return {
    x: guard.x,
    y: guard.y - CONFIG.guard.shoulderHeight,
  };
}

// Where the tip of the barrel is. Bullets are born here so they appear to
// leave the gun rather than sprouting out of his chest.
function getMuzzlePosition(guard) {
  const shoulder = getShoulderPosition(guard);
  const reach = CONFIG.guard.armLength + CONFIG.weapon.barrelLength;

  return {
    x: shoulder.x + Math.cos(guard.aimAngle) * reach,
    y: shoulder.y + Math.sin(guard.aimAngle) * reach,
  };
}

// -----------------------------------------------------------------------------
// FIRING
// -----------------------------------------------------------------------------

// A cooldown is just a small countdown. Every shot sets it, every frame ticks
// it down, and you can't fire again until it reaches zero. That's what stops a
// held mouse button spawning a bullet on every single frame — which at 120fps
// would be 120 bullets a second.
function updateFiring(guard, world, deltaSeconds) {
  guard.fireCooldown -= deltaSeconds;

  if (!isFireHeld()) {
    guard.hasFiredThisClick = false;
    return;
  }

  // With autoFire off, one click means exactly one bullet no matter how long
  // you hold the button down.
  if (!CONFIG.weapon.autoFire && guard.hasFiredThisClick) return;

  if (guard.fireCooldown > 0) return;

  const muzzle = getMuzzlePosition(guard);
  spawnBullet(world, muzzle.x, muzzle.y, guard.aimAngle);

  guard.fireCooldown = CONFIG.weapon.fireIntervalSeconds;
  guard.hasFiredThisClick = true;
}

// -----------------------------------------------------------------------------
// MOVEMENT
// -----------------------------------------------------------------------------

function updateMovement(guard, deltaSeconds) {
  const { speed, verticalSpeedFactor } = CONFIG.guard;
  const direction = getMoveDirection();

  // Standing still. Nothing to do.
  if (direction.x === 0 && direction.y === 0) return;

  // Holding W and D together gives a direction of (1, -1). Left as-is, that
  // arrow is about 1.41 units long instead of 1, so diagonal movement would be
  // 41% faster than walking straight. Dividing by the arrow's own length
  // shrinks it back to exactly 1, which is what keeps every direction equal.
  const arrowLength = Math.hypot(direction.x, direction.y);

  // Multiplying by deltaSeconds is what makes this "pixels per second" rather
  // than "pixels per frame" — so the guard walks at the same real-world pace
  // on a 60Hz screen and a 144Hz one.
  const stepX = (direction.x / arrowLength) * speed * deltaSeconds;
  const stepY = (direction.y / arrowLength) * speed * verticalSpeedFactor * deltaSeconds;

  // Move one axis at a time, checking for obstacles after each. Handling them
  // separately is what lets you slide along a wall: if left/right is blocked,
  // your up/down still goes through instead of the whole step being cancelled.
  moveHorizontally(guard, stepX);
  moveVertically(guard, stepY);
}

// The patch of floor the vending machine physically takes up, expressed as the
// range the guard's CENTRE is not allowed to enter.
//
// The key thing: the machine is an object standing on the floor, not a wall.
// Its floor space ends at its base (footY). Walk further forward than that —
// closer to the camera — and you're in front of it, free to pass by.
function getMachineFloorSpace() {
  const { width: guardWidth, clearance } = CONFIG.guard;
  const halfWidth = guardWidth / 2;

  return {
    // Blocked all the way to the left screen edge. There's no useful floor
    // behind the machine, and leaving a sliver there would let you tuck into
    // a dead-end pocket beside it.
    left: 0,
    right: CONFIG.machine.x + CONFIG.machine.width + clearance + halfWidth,
    front: CONFIG.machine.footY + clearance,
  };
}

// Left/right movement, then push back out of anything we walked into.
function moveHorizontally(guard, stepX) {
  const halfWidth = CONFIG.guard.width / 2;
  const { clearance } = CONFIG.guard;

  guard.x += stepX;

  // The barricade is a real wall — it blocks you no matter how far forward you
  // stand. That's the whole point of it.
  const barricadeLimit = CONFIG.barricade.x - clearance - halfWidth;
  guard.x = Math.min(guard.x, barricadeLimit);

  // The screen's left edge.
  guard.x = Math.max(guard.x, halfWidth + 2);

  // The machine only stops you if you're level with it or behind it. You can
  // only ever approach it from the right, so push back out that way.
  //
  // The comparison is deliberately strict: standing exactly on the machine's
  // front line counts as being IN FRONT of it, so you're free to walk past.
  // Using <= here would shove you sideways the instant you stepped onto that
  // line while walking around it.
  const machine = getMachineFloorSpace();
  const isLevelWithMachine = guard.y < machine.front;
  if (isLevelWithMachine && guard.x < machine.right) {
    guard.x = machine.right;
  }
}

// Up/down movement, then push back out of anything we walked into.
function moveVertically(guard, stepY) {
  guard.y += stepY;

  // Front and back edges of the walkable floor band.
  guard.y = Math.min(Math.max(guard.y, CONFIG.world.walkTopY), CONFIG.world.walkBottomY);

  // If you're standing in front of the machine and try to back up into it,
  // stop at its base. You can only reach this spot from the front, so that's
  // the direction to push back out.
  const machine = getMachineFloorSpace();
  if (guard.x < machine.right && guard.y < machine.front) {
    guard.y = machine.front;
  }
}

// -----------------------------------------------------------------------------
// DRAWING
// -----------------------------------------------------------------------------

export function drawGuard(ctx, guard) {
  const { width, height } = CONFIG.guard;
  const c = CONFIG.colors;

  const left = Math.round(guard.x - width / 2);
  const top = Math.round(guard.y - height);
  const facingRight = guard.facing >= 0;

  drawShadow(ctx, guard);

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

// Draws a chunky 2x2 line between two points by stepping along it.
function drawPixelLine(ctx, from, to, color) {
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

// A soft oval-ish shadow under the feet, so he's planted on the floor.
function drawShadow(ctx, guard) {
  const c = CONFIG.colors;
  const centerX = Math.round(guard.x);
  const y = Math.round(guard.y);

  ctx.fillStyle = c.floorContactShadow;
  ctx.fillRect(centerX - 6, y, 12, 2);
  ctx.fillRect(centerX - 4, y - 1, 8, 1);
}
