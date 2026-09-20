// =============================================================================
// machine.js — the vending machine. The thing you are protecting.
//
// Its stock of packs is your second health bar. Scalpers who reach it buy
// those packs one at a time, and when the last one goes, you've lost the
// night. The packs behind the glass ARE the stock — what you see is what
// you have left.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawHealthBar } from '../pixel.js';
import { SCALPER_STATE, isInFrontOfMachine } from './scalper.js';
import { GAME_STATE } from '../world.js';
import { playGameOver } from '../audio.js';

// -----------------------------------------------------------------------------
// BEING ROBBED
// -----------------------------------------------------------------------------

export function updateMachine(world, deltaSeconds) {
  const buyers = countBuyers(world);
  if (buyers === 0) return;

  // Every scalper at the machine buys at the same rate, so the crowd drains
  // your stock in proportion to its size. That's the whole reason a comeback
  // is possible: drop half the crowd and the bleeding halves with it.
  const packsPerSecond = buyers / CONFIG.machine.packPurchaseSeconds;
  world.machine.purchaseProgress += packsPerSecond * deltaSeconds;

  // A busy crowd can finish more than one pack in a single frame, so this
  // loops rather than just checking once.
  while (world.machine.purchaseProgress >= 1 && world.machine.packsRemaining > 0) {
    world.machine.purchaseProgress -= 1;
    world.machine.packsRemaining -= 1;
  }

  if (world.machine.packsRemaining <= 0) {
    world.machine.packsRemaining = 0;
    world.machine.purchaseProgress = 0;
    endTheNight(world);
  }
}

// Only scalpers standing in FRONT of the machine can take anything from it.
// The glass and the dispenser are on the front face, so anyone stuck at its
// flank is queueing, not buying — they cost you nothing until they get round.
function countBuyers(world) {
  let count = 0;

  for (const scalper of world.scalpers) {
    if (scalper.state !== SCALPER_STATE.AT_MACHINE) continue;
    if (!isInFrontOfMachine(scalper)) continue;
    count++;
  }

  return count;
}

function endTheNight(world) {
  playGameOver();
  world.state = GAME_STATE.GAME_OVER;
  world.gameOverCountdown = CONFIG.gameOver.restartDelaySeconds;

  // Snapshot the numbers now, so the game over screen isn't reading from a
  // world that's about to be thrown away and replaced.
  world.finalStats = {
    scalpersStopped: world.scalpersStopped,
    secondsSurvived: world.elapsedSeconds,
    scalpersOnFloor: world.scalpers.length,
    barricadeHeld: !world.barricade.isBroken,
  };
}

export function drawMachine(ctx, machine) {
  const { x, width, height, footY } = CONFIG.machine;
  const c = CONFIG.colors;

  const top = footY - height;
  const right = x + width;

  // Dark outline behind everything, so the machine reads as a solid object
  // against the busy floor tiles.
  ctx.fillStyle = c.machineDark;
  ctx.fillRect(x - 1, top - 1, width + 2, height + 2);

  // Main red cabinet
  ctx.fillStyle = c.machineBody;
  ctx.fillRect(x, top, width, height);

  // Cream sign band across the top
  ctx.fillStyle = c.machineTrim;
  ctx.fillRect(x + 2, top + 2, width - 4, 10);

  // Three chunky marks on the sign, standing in for a logo until real art lands
  ctx.fillStyle = c.machineBody;
  ctx.fillRect(x + 6, top + 5, 4, 4);
  ctx.fillRect(x + 14, top + 5, 4, 4);
  ctx.fillRect(x + 22, top + 5, 4, 4);

  drawGlassAndPacks(ctx, x, top, machine);
  drawControlColumn(ctx, x, top);
  drawDispenserSlot(ctx, x, top);

  // Floor shadow so it doesn't look like it's hovering
  ctx.fillStyle = c.floorContactShadow;
  ctx.fillRect(x - 2, footY, width + 4, 2);

  drawStockBar(ctx, machine);
}

// A bar above the machine showing how much stock is left, matching the one
// over the barricade. The packs behind the glass say the same thing, but at
// this size a bar is readable from the far end of the floor.
function drawStockBar(ctx, machine) {
  const cfg = CONFIG.machine;
  const fraction = machine.packsRemaining / cfg.packCount;

  const barX = Math.round(cfg.x + cfg.width / 2 - cfg.stockBarWidth / 2);
  const barY = cfg.footY - cfg.height - cfg.stockBarOffsetY;

  drawHealthBar(ctx, barX, barY, cfg.stockBarWidth, cfg.stockBarHeight, fraction);
}

// The glass front, with rows of colourful card packs behind it.
function drawGlassAndPacks(ctx, x, top, machine) {
  const c = CONFIG.colors;

  const glassX = x + 4;
  const glassY = top + 14;
  const glassW = 32;
  const glassH = 40;

  ctx.fillStyle = c.machineGlass;
  ctx.fillRect(glassX, glassY, glassW, glassH);

  // The packs: 3 columns, 4 rows. Only the ones still in stock get drawn, so
  // the machine visibly empties from the bottom up as the crowd buys it out.
  // This is the honest version of a stock counter — you watch it go.
  let packIndex = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      if (packIndex < machine.packsRemaining) {
        ctx.fillStyle = c.packColors[packIndex % c.packColors.length];
        ctx.fillRect(glassX + 2 + col * 10, glassY + 2 + row * 10, 8, 8);
      }
      packIndex++;
    }
  }

  // A diagonal shine streak across the glass, so it reads as glass and not a hole.
  ctx.fillStyle = c.machineGlassShine;
  for (let i = 0; i < 14; i++) {
    ctx.fillRect(glassX + 4 + i, glassY + glassH - 6 - i, 2, 2);
  }
}

// The keypad / coin slot strip down the right-hand side.
function drawControlColumn(ctx, x, top) {
  const c = CONFIG.colors;

  const colX = x + 38;
  const colY = top + 14;

  ctx.fillStyle = c.machineDark;
  ctx.fillRect(colX, colY, 10, 40);

  // Keypad buttons
  ctx.fillStyle = c.machineTrim;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillRect(colX + 2 + col * 4, colY + 3 + row * 5, 2, 3);
    }
  }

  // Coin slot
  ctx.fillStyle = c.machineSlot;
  ctx.fillRect(colX + 3, colY + 26, 4, 2);
}

// The tray at the bottom where packs drop out.
function drawDispenserSlot(ctx, x, top) {
  const c = CONFIG.colors;

  ctx.fillStyle = c.machineSlot;
  ctx.fillRect(x + 4, top + 58, 42, 6);

  ctx.fillStyle = c.machineDark;
  ctx.fillRect(x + 4, top + 58, 42, 1);
}
