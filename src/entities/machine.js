// =============================================================================
// machine.js — the vending machine. The thing you are protecting.
//
// Right now it only knows how to draw itself. Health and the "scalpers buying
// packs" meter arrive in M5.
// =============================================================================

import { CONFIG } from '../config.js';

export function drawMachine(ctx) {
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

  drawGlassAndPacks(ctx, x, top);
  drawControlColumn(ctx, x, top);
  drawDispenserSlot(ctx, x, top);

  // Floor shadow so it doesn't look like it's hovering
  ctx.fillStyle = c.floorContactShadow;
  ctx.fillRect(x - 2, footY, width + 4, 2);
}

// The glass front, with rows of colourful card packs behind it.
function drawGlassAndPacks(ctx, x, top) {
  const c = CONFIG.colors;

  const glassX = x + 4;
  const glassY = top + 14;
  const glassW = 32;
  const glassH = 40;

  ctx.fillStyle = c.machineGlass;
  ctx.fillRect(glassX, glassY, glassW, glassH);

  // The packs: 3 columns, 4 rows of little coloured rectangles.
  let packIndex = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.fillStyle = c.packColors[packIndex % c.packColors.length];
      ctx.fillRect(glassX + 2 + col * 10, glassY + 2 + row * 10, 8, 8);
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
