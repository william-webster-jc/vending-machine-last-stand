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

export const SCALPER_STATE = {
  APPROACHING: 'approaching',       // walking in from the right
  ATTACKING_BARRICADE: 'attacking', // chewing through the wall
  HEADING_FOR_MACHINE: 'heading',   // wall is down, rounding to the machine front
  AT_MACHINE: 'at-machine',         // in front of the glass, buying packs
};

// -----------------------------------------------------------------------------
// SPAWNING
// -----------------------------------------------------------------------------

export function spawnScalper(world, speedMultiplier = 1) {
  const { width, height, speed, speedVariation, spawnMargin, maxHealth } = CONFIG.scalper;
  const { walkTopY, walkBottomY } = CONFIG.world;

  // A random speed nudge, so a group arrives as a ragged line rather than a
  // marching block. Small touches like this are most of what makes a crowd
  // read as a crowd.
  const variation = 1 + (Math.random() * 2 - 1) * speedVariation;

  world.scalpers.push({
    x: CONFIG.screen.width + spawnMargin,
    y: walkTopY + Math.random() * (walkBottomY - walkTopY),
    width,
    height,
    speed: speed * variation * speedMultiplier,
    health: maxHealth,
    state: SCALPER_STATE.APPROACHING,

    // Used only for the walk animation — counts up as they move.
    walkCycle: Math.random() * 10,

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

  if (world.barricade.health <= 0) {
    world.barricade.health = 0;
    world.barricade.isBroken = true;
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
