// =============================================================================
// scalper.js — the people trying to buy out your vending machine.
//
// THE BIG IDEA of this file is entities. A scalper isn't hand-placed in the
// scene like the vending machine is. It's one item in a list, and every item
// in that list knows how to update itself.
//
// That's what makes a hundred scalpers exactly as much code as one. The game
// loop just says "everybody take your turn", and each of them does.
//
// Each scalper carries a `state` — what it's currently trying to do. Walk to
// the wall, chew on the wall, or head for the machine. Giving a character a
// named state like this is how you keep behaviour readable as it grows.
// =============================================================================

import { CONFIG } from '../config.js';
import { addShake, spawnDeathBurst, spawnSplinters } from '../juice.js';

export const SCALPER_STATE = {
  APPROACHING: 'approaching',       // walking in from the right
  ATTACKING_BARRICADE: 'attacking', // chewing through the wall
  HEADING_FOR_MACHINE: 'heading',   // wall is down, rounding to the machine front
  AT_MACHINE: 'at-machine',         // in front of the glass, buying packs
};

// -----------------------------------------------------------------------------
// SPAWNING
// -----------------------------------------------------------------------------

// How much health a scalper has on a given night.
//
// Expressed in BULLETS rather than raw health, and measured against the
// STARTING pistol damage — not your upgraded damage. That's deliberate: it
// means "3 bullets on night one" stays true as a design statement, and buying
// HEAVIER ROUNDS genuinely claws bullets back off the count instead of being
// cancelled out by scalpers scaling with you.
export function getScalperHealth(day) {
  const cfg = CONFIG.scalper;
  const bullets = cfg.bulletsToKillOnNightOne + (day - 1) * cfg.extraBulletsPerNight;

  return bullets * CONFIG.bullet.damage;
}

// -----------------------------------------------------------------------------
// WHO TURNS UP
// -----------------------------------------------------------------------------

export function getScalperType(id) {
  return CONFIG.scalperTypes.find((type) => type.id === id) || CONFIG.scalperTypes[0];
}

// Types are introduced over several nights rather than all at once, so you
// get to learn each one against a crowd you already understand.
function getTypesAvailableOn(day) {
  return CONFIG.scalperTypes.filter((type) => day >= type.firstNight);
}

// Pick a type at random, but weighted — plain scalpers are the bulk of any
// crowd and the specials are the punctuation.
//
// The trick is to imagine all the weights laid end to end as one long line,
// drop a pin anywhere on it, and see whose stretch it landed in. Bigger
// weight, longer stretch, more likely to be picked.
function pickType(day) {
  const available = getTypesAvailableOn(day);
  const totalWeight = available.reduce((sum, type) => sum + type.spawnWeight, 0);

  let pin = Math.random() * totalWeight;
  for (const type of available) {
    pin -= type.spawnWeight;
    if (pin <= 0) return type;
  }

  return available[available.length - 1];
}

export function spawnScalper(world, speedMultiplier = 1) {
  const { width, height, spawnMargin } = CONFIG.scalper;
  const { walkTopY, walkBottomY } = CONFIG.world;

  const type = pickType(world.day);

  // Each one picks its own pace from its type's range, so even a group of the
  // same type arrives as a ragged line rather than a marching block.
  const ownSpeed = type.speedMin + Math.random() * (type.speedMax - type.speedMin);
  const health = Math.round(getScalperHealth(world.day) * type.healthScale);

  world.scalpers.push({
    typeId: type.id,
    armored: type.armored,
    sizeScale: type.sizeScale,

    x: CONFIG.screen.width + spawnMargin,
    y: walkTopY + Math.random() * (walkBottomY - walkTopY),
    width: Math.round(width * type.sizeScale),
    height: Math.round(height * type.sizeScale),
    speed: ownSpeed * speedMultiplier,
    health,
    maxHealth: health,
    state: SCALPER_STATE.APPROACHING,

    // Used only for the walk animation — counts up as they move.
    walkCycle: Math.random() * 10,

    // Counts down after being shot, so we can flash them white.
    hitFlash: 0,
    lastHitWasHeadshot: false,

    // How hard they're currently being shoved backwards. Decays every frame.
    knockback: 0,

    // The exact spot in front of the machine this one is making for. Assigned
    // the moment it starts heading there, so it doesn't wander frame to frame.
    machineTarget: null,
  });
}

// -----------------------------------------------------------------------------
// BEHAVIOUR
// -----------------------------------------------------------------------------

export function updateScalpers(world, deltaSeconds) {
  const { scalpers } = world;

  // Backwards, because dead scalpers get removed from this list as we go.
  for (let i = scalpers.length - 1; i >= 0; i--) {
    const scalper = scalpers[i];

    if (scalper.health <= 0) {
      spawnDeathBurst(world, scalper.x, scalper.y);
      addShake(world, CONFIG.juice.shakeOnScalperDeath);

      scalpers.splice(i, 1);
      world.scalpersStopped += 1;
      continue;
    }

    updateOneScalper(scalper, world, deltaSeconds);
  }

  separateScalpers(scalpers);
}

// Stop scalpers standing inside each other.
//
// Without this, everyone walking to the same place ends up at the exact same
// spot, and a crowd renders as one smeared blob. Nudging overlapping pairs
// apart turns that blob into a queue jostling for position — which is both
// clearer to look at and closer to how a real crowd behaves.
//
// Only pairs at a similar DEPTH are separated. Two scalpers far apart
// front-to-back can overlap on screen without it looking wrong, because one
// is genuinely standing behind the other.
function separateScalpers(scalpers) {
  const { separationX, separationY } = CONFIG.scalper;

  for (let i = 0; i < scalpers.length; i++) {
    for (let j = i + 1; j < scalpers.length; j++) {
      const a = scalpers[i];
      const b = scalpers[j];

      const gapX = b.x - a.x;
      const gapY = b.y - a.y;

      const overlapX = separationX - Math.abs(gapX);
      const overlapY = separationY - Math.abs(gapY);

      // Not actually sharing a spot — nothing to do.
      if (overlapX <= 0 || overlapY <= 0) continue;

      // Shove them apart along whichever axis they're LEAST wedged on, since
      // that's the shortest way out. Always pushing sideways would flatten a
      // crowd into a single line; this lets it bulge into a proper mob.
      // Each one moves half the overlap, so neither bullies the other.
      if (overlapX / separationX <= overlapY / separationY) {
        const push = (overlapX / 2) * (gapX >= 0 ? 1 : -1);
        a.x -= push;
        b.x += push;
      } else {
        const push = (overlapY / 2) * (gapY >= 0 ? 1 : -1);
        a.y -= push;
        b.y += push;
        keepOnFloor(a);
        keepOnFloor(b);
      }
    }
  }
}

function updateOneScalper(scalper, world, deltaSeconds) {
  if (scalper.hitFlash > 0) scalper.hitFlash -= deltaSeconds;
  applyKnockback(scalper, deltaSeconds);

  switch (scalper.state) {
    case SCALPER_STATE.APPROACHING:
      approachBarricade(scalper, world, deltaSeconds);
      break;

    case SCALPER_STATE.ATTACKING_BARRICADE:
      attackBarricade(scalper, world, deltaSeconds);
      break;

    case SCALPER_STATE.HEADING_FOR_MACHINE:
      headForMachine(scalper, deltaSeconds);
      break;

    case SCALPER_STATE.AT_MACHINE:
      // Being jostled by the crowd can shove someone back out of the buying
      // zone. Rather than leaving them stranded at the side doing nothing,
      // send them round to the front again.
      if (!isInFrontOfMachine(scalper)) {
        scalper.machineTarget = null;
        scalper.state = SCALPER_STATE.HEADING_FOR_MACHINE;
      }
      break;
  }
}

function approachBarricade(scalper, world, deltaSeconds) {
  // If the wall is already down, don't bother stopping at it.
  if (world.barricade.isBroken) {
    scalper.state = SCALPER_STATE.HEADING_FOR_MACHINE;
    return;
  }

  walkLeft(scalper, deltaSeconds);

  const stopLine = getBarricadeStopLine(scalper);
  if (scalper.x <= stopLine) {
    scalper.x = stopLine;
    scalper.state = SCALPER_STATE.ATTACKING_BARRICADE;
  }
}

function attackBarricade(scalper, world, deltaSeconds) {
  if (world.barricade.isBroken) {
    scalper.state = SCALPER_STATE.HEADING_FOR_MACHINE;
    return;
  }

  // Damage is applied per SECOND, not per frame. Multiplying by deltaSeconds
  // is what stops the wall dying four times faster on a 240Hz monitor.
  world.barricade.health -= CONFIG.scalper.attackDamagePerSecond * deltaSeconds;

  // Keep the animation ticking so they visibly swing at it.
  scalper.walkCycle += deltaSeconds * 6;

  // Splinters fly on the beat of the swing, not every frame.
  if (Math.floor(scalper.walkCycle) !== Math.floor(scalper.walkCycle - deltaSeconds * 6)) {
    spawnSplinters(world, CONFIG.barricade.x + CONFIG.barricade.width, scalper.y - 12);
  }

  if (world.barricade.health <= 0) {
    world.barricade.health = 0;
    world.barricade.isBroken = true;
    addShake(world, CONFIG.juice.shakeOnBarricadeBreak);
  }
}

function headForMachine(scalper, deltaSeconds) {
  if (!scalper.machineTarget) {
    scalper.machineTarget = pickSpotInFrontOfMachine();
  }

  walkToward(scalper, scalper.machineTarget, deltaSeconds);

  const distanceToSpot = Math.hypot(
    scalper.machineTarget.x - scalper.x,
    scalper.machineTarget.y - scalper.y,
  );

  if (distanceToSpot < 1.5 && isInFrontOfMachine(scalper)) {
    scalper.state = SCALPER_STATE.AT_MACHINE;
  }
}

// A spot on the floor in front of the machine — spread across its face and
// scattered forward, so the crowd fills the space rather than forming a line.
function pickSpotInFrontOfMachine() {
  const machine = CONFIG.machine;

  return {
    x: machine.x + 3 + Math.random() * (machine.width - 6),
    y: Math.min(
      machine.footY + 3 + Math.random() * CONFIG.scalper.crowdSpread,
      CONFIG.world.walkBottomY,
    ),
  };
}

// Standing somewhere you could actually buy from: in FRONT of the machine's
// face, not beside it. The glass and the dispenser are on the front, so it's
// the only side a pack can come out of. Anyone stuck at the machine's flank
// is just queueing.
export function isInFrontOfMachine(scalper) {
  const machine = CONFIG.machine;
  const halfWidth = scalper.width / 2;

  return (
    scalper.y > machine.footY + 2 &&
    scalper.x > machine.x - halfWidth &&
    scalper.x < machine.x + machine.width + halfWidth
  );
}

// Move toward a point in any direction, rather than only leftward.
//
// The machine is solid, so anyone still level with it stops at its flank and
// has to keep coming forward before they can round the corner to the front.
// That's exactly the rule the guard plays by.
function walkToward(scalper, target, deltaSeconds) {
  const toTargetX = target.x - scalper.x;
  const toTargetY = target.y - scalper.y;
  const distance = Math.hypot(toTargetX, toTargetY);
  if (distance < 0.01) return;

  // Never overshoot the target in a single frame.
  const step = Math.min(scalper.speed * deltaSeconds, distance);
  scalper.x += (toTargetX / distance) * step;
  scalper.y += (toTargetY / distance) * step;

  const machineFlank = CONFIG.machine.x + CONFIG.machine.width + scalper.width / 2;
  const isLevelWithMachine = scalper.y <= CONFIG.machine.footY + 2;
  if (isLevelWithMachine && scalper.x < machineFlank) {
    scalper.x = machineFlank;
  }

  scalper.walkCycle += deltaSeconds * scalper.speed * 0.25;
}

// Being shot shoves you backwards for a moment. It decays fast, so it reads
// as a flinch rather than as being pushed around the room.
function applyKnockback(scalper, deltaSeconds) {
  if (scalper.knockback <= 0) return;

  scalper.x += scalper.knockback * deltaSeconds * 12;
  scalper.knockback = Math.max(
    0,
    scalper.knockback - CONFIG.juice.knockbackDecayPerSecond * deltaSeconds,
  );
}

function walkLeft(scalper, deltaSeconds) {
  scalper.x -= scalper.speed * deltaSeconds;
  scalper.walkCycle += deltaSeconds * scalper.speed * 0.25;
}

function getBarricadeStopLine(scalper) {
  const barricadeRightEdge = CONFIG.barricade.x + CONFIG.barricade.width;
  return barricadeRightEdge + CONFIG.scalper.attackReach + scalper.width / 2;
}

// Being shoved around by the crowd must never push anyone off the walkable
// floor band.
function keepOnFloor(scalper) {
  const { walkTopY, walkBottomY } = CONFIG.world;
  scalper.y = Math.min(Math.max(scalper.y, walkTopY), walkBottomY);
}

// The rectangle a bullet has to touch to count as a hit.
export function getScalperHitBox(scalper) {
  const halfWidth = scalper.width / 2;

  return {
    left: scalper.x - halfWidth,
    right: scalper.x + halfWidth,
    top: scalper.y - scalper.height,
    bottom: scalper.y,
  };
}

// The head, as a share of the whole sprite. Scales with the body, so a Bulk
// Buyer's head is a bigger target than a Line Runner's — which is fair, since
// the big one is the easy shot and the small one isn't.
export function getScalperHeadBox(scalper) {
  const body = getScalperHitBox(scalper);
  const headHeight = scalper.height * 0.35;
  const headInset = scalper.width * 0.2;

  return {
    left: body.left + headInset,
    right: body.right - headInset,
    top: body.top,
    bottom: body.top + headHeight,
  };
}
