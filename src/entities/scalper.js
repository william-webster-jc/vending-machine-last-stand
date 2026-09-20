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
  HEADING_FOR_MACHINE: 'heading',   // wall is down, going for the packs
  AT_MACHINE: 'at-machine',         // arrived (M5 makes this matter)
};

// -----------------------------------------------------------------------------
// SPAWNING
// -----------------------------------------------------------------------------

export function spawnScalper(world) {
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
    speed: speed * variation,
    health: maxHealth,
    state: SCALPER_STATE.APPROACHING,

    // Used only for the walk animation — counts up as they move.
    walkCycle: Math.random() * 10,

    // How far back from the machine this one settles once the wall is down.
    // Giving everyone their own number is what turns a queue into a mob.
    crowdOffset: Math.random() * CONFIG.scalper.crowdSpread,
  });
}

// TEMPORARY for M4: a steady trickle, so there's always something to shoot at.
// M6 replaces this entirely with real waves that build through the night.
export function updateScalperSpawning(world, deltaSeconds) {
  world.scalperSpawnCountdown -= deltaSeconds;

  if (world.scalperSpawnCountdown <= 0) {
    spawnScalper(world);
    world.scalperSpawnCountdown = CONFIG.scalper.spawnIntervalSeconds;
  }
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
      // M5 gives this meaning: they start buying packs and you start losing.
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
  walkLeft(scalper, deltaSeconds);

  const target = getMachineCrowdSpot(scalper);
  if (scalper.x <= target) {
    scalper.x = target;
    scalper.state = SCALPER_STATE.AT_MACHINE;
  }
}

// Where this scalper is trying to stand once it reaches the machine.
//
// The machine is an object on the floor, not a wall — same rule the guard
// plays by. Anyone walking along the front of it can get right up to the
// glass. Anyone level with it has to stop at its side. That difference is
// what makes the crowd wrap around the front instead of forming a flat line.
function getMachineCrowdSpot(scalper) {
  const machineFrontY = CONFIG.machine.footY + 4;
  const isInFrontOfMachine = scalper.y > machineFrontY;

  const base = isInFrontOfMachine
    ? CONFIG.machine.x + scalper.width / 2
    : CONFIG.machine.x + CONFIG.machine.width + scalper.width / 2;

  return base + scalper.crowdOffset;
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
