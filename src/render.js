// =============================================================================
// render.js — draws one complete frame of the game.
//
// The order things are drawn in matters: each thing paints over whatever was
// drawn before it. Back wall first, floor next, then the objects standing on
// the floor, then the debug readout on top of everything.
// =============================================================================

import { CONFIG } from './config.js';
import { drawMachine } from './entities/machine.js';
import { drawBarricade } from './entities/barricade.js';
import { drawGuard } from './entities/guard.js';

export function drawScene(ctx, world, fps) {
  drawBackWall(ctx);
  drawFloor(ctx);

  drawMachine(ctx);
  drawBarricade(ctx);
  drawGuard(ctx, world.guard);

  if (CONFIG.debug.showDebug) {
    drawDebugReadout(ctx, world, fps);
  }
}

// The mall's back wall, with windows showing the night sky outside.
function drawBackWall(ctx) {
  const { width } = CONFIG.screen;
  const { horizonY } = CONFIG.world;
  const c = CONFIG.colors;

  ctx.fillStyle = c.wallBack;
  ctx.fillRect(0, 0, width, horizonY);

  // Trim band along the top of the wall
  ctx.fillStyle = c.wallTrimUpper;
  ctx.fillRect(0, 0, width, 8);

  drawWindows(ctx);

  // Baseboard where the wall meets the floor
  ctx.fillStyle = c.wallBaseboard;
  ctx.fillRect(0, horizonY - 6, width, 6);
}

// Evenly spaced windows. Each one is a dark frame around a patch of night sky.
function drawWindows(ctx) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;

  const windowWidth = 34;
  const windowHeight = 44;
  const windowY = 22;
  const gap = 24;
  const step = windowWidth + gap;

  // Start far enough left that the row looks centred across the screen.
  const windowCount = Math.floor(width / step) + 1;
  const rowWidth = windowCount * step - gap;
  const startX = Math.round((width - rowWidth) / 2);

  for (let i = 0; i < windowCount; i++) {
    const x = startX + i * step;
    if (x + windowWidth < 0 || x > width) continue;

    // Frame
    ctx.fillStyle = c.windowFrame;
    ctx.fillRect(x - 2, windowY - 2, windowWidth + 4, windowHeight + 4);

    // Night sky
    ctx.fillStyle = c.skyNight;
    ctx.fillRect(x, windowY, windowWidth, windowHeight);

    // A couple of stars, placed by a fixed pattern so they don't flicker
    // around between frames.
    ctx.fillStyle = c.star;
    ctx.fillRect(x + 6 + (i % 3) * 5, windowY + 8, 1, 1);
    ctx.fillRect(x + 22 - (i % 2) * 6, windowY + 17, 1, 1);
    ctx.fillRect(x + 12 + (i % 4) * 3, windowY + 31, 1, 1);

    // The moon sits in one window only.
    if (i === 1) {
      ctx.fillStyle = c.moon;
      ctx.fillRect(x + 22, windowY + 6, 6, 6);
      ctx.fillStyle = c.skyNight;
      ctx.fillRect(x + 20, windowY + 5, 4, 5);
    }

    // Window cross-bars
    ctx.fillStyle = c.windowFrame;
    ctx.fillRect(x + windowWidth / 2 - 1, windowY, 2, windowHeight);
    ctx.fillRect(x, windowY + windowHeight / 2 - 1, windowWidth, 2);
  }
}

// Checkerboard mall tiles.
function drawFloor(ctx) {
  const { width, height } = CONFIG.screen;
  const { horizonY, tileSize } = CONFIG.world;
  const c = CONFIG.colors;

  for (let y = horizonY; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      const tileRow = Math.floor((y - horizonY) / tileSize);
      const tileCol = Math.floor(x / tileSize);
      const isDarkTile = (tileRow + tileCol) % 2 === 0;

      ctx.fillStyle = isDarkTile ? c.floorDark : c.floorLight;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Grout line along the top and left edge of each tile
      ctx.fillStyle = c.floorGrout;
      ctx.fillRect(x, y, tileSize, 1);
      ctx.fillRect(x, y, 1, tileSize);
    }
  }

  // Darker band right at the wall, so the floor looks like it recedes into
  // shadow rather than stopping dead.
  ctx.fillStyle = c.floorContactShadow;
  ctx.fillRect(0, horizonY, width, 3);
}

// Small corner readouts. These are for you, not the player — they get switched
// off with CONFIG.debug.showDebug.
function drawDebugReadout(ctx, world, fps) {
  const { height } = CONFIG.screen;
  const c = CONFIG.colors;

  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';

  ctx.fillStyle = c.debugText;
  ctx.fillText(`${fps} fps`, 4, 4);

  if (CONFIG.debug.showPosition) {
    const x = Math.round(world.guard.x);
    const y = Math.round(world.guard.y);
    ctx.fillText(`x ${x}  y ${y}`, 4, 14);
  }

  ctx.textBaseline = 'bottom';
  ctx.fillStyle = c.debugLabel;
  ctx.fillText(CONFIG.debug.buildLabel, 4, height - 3);
}
