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

  // Lit sign band across the top
  ctx.fillStyle = c.machineTrim;
  ctx.fillRect(x + 2, top + 2, width - 4, 12);

  // Chunky marks standing in for a logo until real art lands.
  ctx.fillStyle = c.machineBody;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 6 + i * 11, top + 5, 5, 6);
  }

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

// The glass front, and the booster packs racked behind it.
function drawGlassAndPacks(ctx, x, top, machine) {
  const c = CONFIG.colors;

  const glassX = x + 5;
  const glassY = top + 16;
  const glassW = 40;
  const glassH = 58;

  ctx.fillStyle = c.machineGlass;
  ctx.fillRect(glassX, glassY, glassW, glassH);

  drawPackRacks(ctx, glassX, glassY, glassW, glassH, machine);

  // A diagonal shine across the glass, so it reads as glass and not a hole.
  ctx.fillStyle = c.machineGlassShine;
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(glassX + 5 + i, glassY + glassH - 8 - i, 2, 1);
  }
}

// Three columns, four rows. Only the packs still in stock get drawn, so the
// machine visibly empties from the bottom up as the crowd buys it out.
function drawPackRacks(ctx, glassX, glassY, glassW, glassH, machine) {
  const c = CONFIG.colors;

  const columns = 3;
  const rows = 4;
  const packW = 11;
  const packH = 13;

  const spacingX = Math.floor((glassW - columns * packW) / (columns + 1));
  const spacingY = Math.floor((glassH - rows * packH) / (rows + 1));

  let packIndex = 0;
  for (let row = 0; row < rows; row++) {
    // The wire rack each row sits on.
    const rackY = glassY + spacingY + row * (packH + spacingY) + packH;
    ctx.fillStyle = c.shelfFrameDark;
    ctx.fillRect(glassX + 2, rackY, glassW - 4, 1);

    for (let col = 0; col < columns; col++) {
      if (packIndex < machine.packsRemaining) {
        drawBoosterPack(
          ctx,
          glassX + spacingX + col * (packW + spacingX),
          glassY + spacingY + row * (packH + spacingY),
          packW,
          packH,
          c.packColors[packIndex % c.packColors.length],
        );
      }
      packIndex++;
    }
  }
}

// One booster pack.
//
// The shape is the whole point: a foil wrapper with a HANG TAB punched at the
// top, a bright art panel filling the middle, a title stripe across it and a
// dark sealed foot. That silhouette is what makes it read as a trading card
// pack rather than a coloured rectangle — it's the same outline as the packs
// on a real hook at the till.
function drawBoosterPack(ctx, x, y, width, height, artColor) {
  const c = CONFIG.colors;

  // Foil body with a dark keyline.
  ctx.fillStyle = c.packEdge;
  ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
  ctx.fillStyle = c.packFoil;
  ctx.fillRect(x, y, width, height);

  // The hang tab: a narrower strip at the top with a punched hole.
  ctx.fillStyle = c.packTab;
  ctx.fillRect(x + 2, y, width - 4, 3);
  ctx.fillStyle = c.packEdge;
  ctx.fillRect(x + Math.floor(width / 2) - 1, y + 1, 2, 1);

  // Art panel — the character on the front.
  ctx.fillStyle = artColor;
  ctx.fillRect(x + 1, y + 4, width - 2, height - 8);

  // A lighter shape inside it, so the art panel isn't a flat block.
  ctx.fillStyle = c.packFoilShine;
  ctx.fillRect(x + 3, y + 6, 2, 2);
  ctx.fillRect(x + width - 5, y + 8, 2, 3);

  // Title stripe across the lower art, like every pack has.
  ctx.fillStyle = c.packStripe;
  ctx.fillRect(x + 1, y + height - 7, width - 2, 2);

  // Sealed foot.
  ctx.fillStyle = c.packEdge;
  ctx.fillRect(x, y + height - 4, width, 4);
  ctx.fillStyle = c.packStripe;
  ctx.fillRect(x + 1, y + height - 3, width - 2, 1);
}

// The keypad, card reader and coin slot down the right-hand side.
function drawControlColumn(ctx, x, top) {
  const c = CONFIG.colors;

  const colX = x + 48;
  const colY = top + 16;

  ctx.fillStyle = c.machineDark;
  ctx.fillRect(colX, colY, 12, 58);

  // Keypad
  ctx.fillStyle = c.machineTrim;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillRect(colX + 2 + col * 5, colY + 4 + row * 6, 3, 4);
    }
  }

  // Card reader and coin slot
  ctx.fillStyle = c.machineSlot;
  ctx.fillRect(colX + 2, colY + 38, 8, 3);
  ctx.fillRect(colX + 4, colY + 46, 4, 2);
}

// The tray at the bottom where packs drop out.
function drawDispenserSlot(ctx, x, top) {
  const c = CONFIG.colors;

  ctx.fillStyle = c.machineSlot;
  ctx.fillRect(x + 5, top + 78, 40, 8);

  ctx.fillStyle = c.machineDark;
  ctx.fillRect(x + 5, top + 78, 40, 1);
}
