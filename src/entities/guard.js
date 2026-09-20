// =============================================================================
// guard.js — how the security guard behaves. What he LOOKS like is in
// guard-art.js next door.
//
// He walks (M2), aims and shoots (M3). He faces wherever your mouse is, so you
// can walk one way while covering another.
//
// IMPORTANT: guard.y is his FEET, not his head. Everything that touches the
// floor is measured from the feet, which makes depth sorting simple later.
// =============================================================================

import { CONFIG } from '../config.js';
import { getMoveDirection, getMousePosition, isFireHeld } from '../input.js';
import { spawnBullet } from './bullet.js';
import { throwGrenade } from './grenade.js';
import { getBarricadeBlockLine } from './barricade.js';
import { spawnCasing } from '../juice.js';
import {
  getWeapon,
  getRoundsLeft,
  isReloading,
  beginReload,
  updateReload,
} from '../weapons.js';

export function updateGuard(guard, world, deltaSeconds) {
  updateAim(guard);
  updateMovement(guard, world, deltaSeconds);
  updateReload(guard, deltaSeconds);
  updateFiring(guard, world, deltaSeconds);

  if (guard.muzzleFlash > 0) guard.muzzleFlash -= deltaSeconds;
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

export function getShoulderPosition(guard) {
  return {
    x: guard.x,
    y: guard.y - CONFIG.guard.shoulderHeight,
  };
}

// Where the tip of the barrel is. Bullets are born here so they appear to
// leave the gun rather than sprouting out of his chest.
function getMuzzlePosition(guard) {
  const shoulder = getShoulderPosition(guard);
  const reach = CONFIG.guard.armLength + CONFIG.guard.barrelLength;

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

  const weapon = getWeapon(guard.weaponId);

  if (!isFireHeld()) {
    guard.hasFiredThisClick = false;
    return;
  }

  // Semi-automatic weapons need a fresh click per shot. The shotgun and the
  // grenades are deliberately not something you can hold down.
  if (!weapon.autoFire && guard.hasFiredThisClick) return;

  if (isReloading(guard)) return;
  if (guard.fireCooldown > 0) return;

  // Out of ammo: pulling the trigger starts a reload instead of firing. It's
  // what you'd do anyway, and it saves you fumbling for the key mid-fight.
  if (getRoundsLeft(guard) <= 0) {
    beginReload(guard);
    guard.hasFiredThisClick = true;
    return;
  }

  fireOnce(guard, world, weapon);
}

function fireOnce(guard, world, weapon) {
  const muzzle = getMuzzlePosition(guard);
  const damage = Math.round(weapon.damage * world.stats.damageMultiplier);

  if (weapon.kind === 'grenade') {
    // Thrown AT the crosshair, not merely in its direction.
    const target = getMousePosition();
    throwGrenade(world, muzzle.x, muzzle.y, target.x, target.y, weapon, damage);
  } else {
    // A shotgun is just several bullets fired at once, each nudged off the
    // aim line by a random amount. That's the whole difference between it and
    // the pistol — no separate shotgun code anywhere.
    for (let i = 0; i < weapon.pelletsPerShot; i++) {
      spawnBullet(world, muzzle.x, muzzle.y, applySpread(guard.aimAngle, weapon), damage);
    }
  }

  guard.magazines[guard.weaponId] -= 1;
  guard.fireCooldown = weapon.fireIntervalSeconds * world.stats.fireIntervalMultiplier;
  guard.hasFiredThisClick = true;

  guard.muzzleFlash = CONFIG.juice.muzzleFlashSeconds;
  if (weapon.kind !== 'grenade') {
    spawnCasing(world, muzzle.x, muzzle.y - 2, guard.facing);
  }

  // Firing the last round starts the reload straight away, so the delay
  // begins immediately rather than waiting for you to notice.
  if (getRoundsLeft(guard) <= 0) {
    beginReload(guard);
  }
}

// Nudge a shot off the aim line by a random amount inside the weapon's cone.
// Spread is what makes the uzi a close-range tool and the pistol a precise one.
function applySpread(aimAngle, weapon) {
  if (weapon.spreadDegrees <= 0) return aimAngle;

  const spreadRadians = (weapon.spreadDegrees * Math.PI) / 180;
  return aimAngle + (Math.random() - 0.5) * spreadRadians;
}

// -----------------------------------------------------------------------------
// MOVEMENT
// -----------------------------------------------------------------------------

function updateMovement(guard, world, deltaSeconds) {
  const { verticalSpeedFactor } = CONFIG.guard;

  // Move speed comes from your boots upgrade, not straight from config.
  const speed = world.stats.moveSpeed;
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
  moveHorizontally(guard, world, stepX);
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
function moveHorizontally(guard, world, stepX) {
  const halfWidth = CONFIG.guard.width / 2;
  const { clearance } = CONFIG.guard;

  guard.x += stepX;

  // The barricade is a real wall — it blocks you no matter how far forward you
  // stand. That's the whole point of it. Once it's smashed open it may stop
  // blocking, depending on CONFIG.barricade.blocksGuardWhenBroken.
  const barricadeLimit = getBarricadeBlockLine(world.barricade) - clearance - halfWidth;
  guard.x = Math.min(guard.x, barricadeLimit);

  // Don't let a broken barricade push you off the right of the screen.
  guard.x = Math.min(guard.x, CONFIG.screen.width - halfWidth - 2);

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
