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
import { drawGuard } from './entities/guard-art.js';
import { drawScalper } from './entities/scalper-art.js';
import { drawBullets } from './entities/bullet.js';
import { getMousePosition } from './input.js';
import { GAME_STATE } from './world.js';

export function drawScene(ctx, world, fps) {
  drawBackWall(ctx);
  drawFloor(ctx);

  drawMachine(ctx, world.machine);
  drawBarricade(ctx, world.barricade);
  drawCharacters(ctx, world);

  // Bullets go on top of the barricade, because you're shooting OVER your own
  // wall at whatever is on the far side of it.
  drawBullets(ctx, world);

  if (world.state === GAME_STATE.GAME_OVER) {
    drawGameOverScreen(ctx, world);
  } else {
    drawCrosshair(ctx);
  }

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

// Everybody standing on the floor, drawn back-to-front.
//
// Sorting by y before drawing is what makes depth work: whoever is nearer the
// camera (larger y) gets painted last, so they appear in front. Without this,
// a scalper standing behind you could be drawn on top of you.
function drawCharacters(ctx, world) {
  const everyone = [
    { y: world.guard.y, draw: () => drawGuard(ctx, world.guard) },
  ];

  for (const scalper of world.scalpers) {
    everyone.push({ y: scalper.y, draw: () => drawScalper(ctx, scalper) });
  }

  everyone.sort((a, b) => a.y - b.y);
  for (const character of everyone) {
    character.draw();
  }
}

// An 8-bit crosshair drawn where your mouse is. The real cursor is hidden by
// CSS, so this is the only pointer you see over the game.
function drawCrosshair(ctx) {
  const mouse = getMousePosition();
  const x = Math.round(mouse.x);
  const y = Math.round(mouse.y);

  ctx.fillStyle = CONFIG.colors.crosshair;

  // Four short ticks with a gap in the middle, so the thing you're aiming at
  // stays visible instead of being covered by your own crosshair.
  ctx.fillRect(x - 5, y, 3, 1);
  ctx.fillRect(x + 3, y, 3, 1);
  ctx.fillRect(x, y - 5, 1, 3);
  ctx.fillRect(x, y + 3, 1, 3);
}

// The screen you earn by losing.
//
// It's drawn OVER the frozen scene rather than replacing it, so you can still
// see the crowd standing around your emptied machine. Being shown exactly how
// you lost lands better than a blank screen does.
function drawGameOverScreen(ctx, world) {
  const { width, height } = CONFIG.screen;
  const c = CONFIG.colors;
  const stats = world.finalStats;

  ctx.fillStyle = c.gameOverVeil;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '16px monospace';
  ctx.fillStyle = c.gameOverTitle;
  ctx.fillText('GAME OVER', width / 2, 64);

  ctx.font = '8px monospace';
  ctx.fillStyle = c.gameOverText;
  ctx.fillText('THEY BOUGHT OUT THE MACHINE', width / 2, 84);

  drawStatLines(ctx, [
    ['SCALPERS STOPPED', `${stats.scalpersStopped}`],
    ['YOU LASTED', formatDuration(stats.secondsSurvived)],
    ['STILL ON THE FLOOR', `${stats.scalpersOnFloor}`],
    ['BARRICADE', stats.barricadeHeld ? 'HELD' : 'BREACHED'],
  ]);

  // The prompt only appears once restarting actually works, so it never
  // invites a press the game is going to ignore.
  if (world.gameOverCountdown <= 0) {
    ctx.fillStyle = c.gameOverHint;
    ctx.fillText('PRESS ANY KEY TO WORK ANOTHER NIGHT', width / 2, 172);
  }

  // Put the canvas back how we found it, so the next frame's debug text isn't
  // mysteriously centred.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// Labels and values in two tidy columns.
//
// Centring each whole line individually — the obvious first attempt — makes
// the columns wander, because a longer value drags its label leftward. Pinning
// the labels' right edge and the values' left edge to fixed positions instead
// keeps them in line whatever they say.
function drawStatLines(ctx, lines) {
  const labelRightEdge = 210;
  const valueLeftEdge = 222;
  const firstLineY = 106;
  const lineSpacing = 12;

  ctx.fillStyle = CONFIG.colors.gameOverDim;

  lines.forEach(([label, value], index) => {
    const y = firstLineY + index * lineSpacing;

    ctx.textAlign = 'right';
    ctx.fillText(label, labelRightEdge, y);

    ctx.textAlign = 'left';
    ctx.fillText(value, valueLeftEdge, y);
  });

  ctx.textAlign = 'center';
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

  if (CONFIG.debug.showBulletCount) {
    ctx.fillText(`bullets ${world.bullets.length}`, 4, 24);
  }

  if (CONFIG.debug.showScalperCount) {
    ctx.fillText(`scalpers ${world.scalpers.length}`, 4, 34);
    ctx.fillText(`stopped ${world.scalpersStopped}`, 4, 44);
    ctx.fillText(`packs ${world.machine.packsRemaining}`, 4, 54);
  }

  ctx.textBaseline = 'bottom';
  ctx.fillStyle = c.debugLabel;
  ctx.fillText(CONFIG.debug.buildLabel, 4, height - 3);
}
