// =============================================================================
// tech-art.js — what the barricade tech looks like.
//
// All three have to read instantly from across the floor: a turret should
// obviously be a gun, an armed mine should obviously be dangerous, and the
// drone should obviously be helping. None of them get more than a dozen
// pixels to do it in.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawPixelLine } from '../pixel.js';

export function drawTech(ctx, world) {
  drawMines(ctx, world);
  drawTurrets(ctx, world);
  drawDrone(ctx, world);
  drawMineBlasts(ctx, world);
}

// Squat housings bolted along the top of the wall, with a barrel that tracks
// whatever they're shooting at.
function drawTurrets(ctx, world) {
  const c = CONFIG.colors;

  for (const turret of world.tech.turrets) {
    const x = Math.round(turret.x);
    const y = Math.round(turret.y);

    // Mount.
    ctx.fillStyle = c.turretBodyDark;
    ctx.fillRect(x - 5, y - 3, 10, 7);
    ctx.fillStyle = c.turretBody;
    ctx.fillRect(x - 4, y - 2, 8, 5);

    // Barrel, pointing wherever it's aiming.
    const aimX = Math.cos(turret.aimAngle);
    const aimY = Math.sin(turret.aimAngle);

    drawPixelLine(
      ctx,
      { x: turret.x, y: turret.y },
      { x: turret.x + aimX * 9, y: turret.y + aimY * 9 },
      c.turretBarrel,
    );

    // Housing highlight.
    ctx.fillStyle = c.turretBarrel;
    ctx.fillRect(x - 3, y - 2, 6, 1);
  }
}

// A dark puck with a blinking light. The blink is the whole design: a mine
// you can't see is a mine that feels unfair when it goes off.
function drawMines(ctx, world) {
  const c = CONFIG.colors;

  for (const mine of world.tech.mines) {
    const x = Math.round(mine.x);
    const y = Math.round(mine.y);

    ctx.fillStyle = c.floorContactShadow;
    ctx.fillRect(x - 4, y, 8, 2);

    ctx.fillStyle = c.mineBody;
    ctx.fillRect(x - 3, y - 3, 7, 4);
    ctx.fillStyle = c.turretBodyDark;
    ctx.fillRect(x - 3, y - 1, 7, 1);

    // Armed mines blink slowly. A triggered one blinks fast, which is your
    // half-second of warning to get clear.
    const rate = mine.armed ? 1 : 6;
    const lit = Math.sin(mine.blinkPhase * rate) > 0;

    ctx.fillStyle = lit ? c.mineLight : c.mineLightDim;
    ctx.fillRect(x - 1, y - 5, 2, 2);
  }
}

function drawMineBlasts(ctx, world) {
  const c = CONFIG.colors;

  for (const blast of world.tech.blasts) {
    const through = 1 - blast.life / blast.totalLife;
    const radius = Math.round(blast.radius * (0.4 + through * 0.6));

    ctx.fillStyle = through < 0.5 ? c.blastInner : c.blastOuter;
    for (let offsetY = -radius; offsetY <= radius; offsetY += 2) {
      const half = Math.round(Math.sqrt(Math.max(0, radius * radius - offsetY * offsetY)));
      if (half <= 0) continue;
      ctx.fillRect(Math.round(blast.x - half), Math.round(blast.y + offsetY), half * 2, 2);
    }
  }
}

// A small quadcopter bobbing behind the wall, with a repair beam down to it
// whenever it's actually working.
function drawDrone(ctx, world) {
  const drone = world.tech.drone;
  if (!drone) return;

  const c = CONFIG.colors;
  const bob = Math.sin(drone.driftPhase) * 3;
  const x = Math.round(drone.x);
  const y = Math.round(drone.y + bob);

  // The beam, only while it has something to mend.
  const barricade = world.barricade;
  const working = !barricade.isBroken && barricade.health < barricade.maxHealth;

  if (working) {
    ctx.fillStyle = c.droneBeam;
    for (let step = 0; step < 10; step++) {
      if (step % 2 === 0) continue;
      ctx.fillRect(x + 4 + step, y + 2 + step, 2, 1);
    }
  }

  // Body.
  ctx.fillStyle = c.droneBodyDark;
  ctx.fillRect(x - 4, y - 2, 9, 5);
  ctx.fillStyle = c.droneBody;
  ctx.fillRect(x - 3, y - 1, 7, 3);

  // A lit eye, so you can tell it apart from a floating box.
  ctx.fillStyle = c.droneBeam;
  ctx.fillRect(x + 2, y, 2, 1);

  // Rotors, flickering between two poses so they look like they're spinning.
  ctx.fillStyle = c.droneRotor;
  const spin = Math.floor(drone.driftPhase * 9) % 2 === 0;
  ctx.fillRect(x - 6, y - 3, spin ? 5 : 3, 1);
  ctx.fillRect(x + 2, y - 3, spin ? 5 : 3, 1);
}
