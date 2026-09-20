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
import { getShopRows } from './shop.js';
import { mixColors } from './pixel.js';
import {
  getNightProgress,
  getSkyState,
  getMoonVisibility,
  getSunRise,
  getDawnWashAlpha,
  getAssaultSize,
} from './night.js';

export function drawScene(ctx, world, fps) {
  const nightProgress = getNightProgress(world);

  drawBackWall(ctx, nightProgress);
  drawFloor(ctx);

  drawMachine(ctx, world.machine);
  drawBarricade(ctx, world.barricade);
  drawCharacters(ctx, world);

  // Bullets go on top of the barricade, because you're shooting OVER your own
  // wall at whatever is on the far side of it.
  drawBullets(ctx, world);

  // Warm dawn light over the whole mall, so the room brightens along with the
  // sky instead of staying pitch dark behind a sunrise-coloured window.
  drawDawnWash(ctx, nightProgress);

  if (world.nightBannerTimer > 0 && world.state === GAME_STATE.PLAYING) {
    drawNightBanner(ctx, world);
  }

  if (world.state === GAME_STATE.SHOP) {
    drawShopScreen(ctx, world);
    drawCrosshair(ctx);
  } else if (world.state === GAME_STATE.NIGHT_SURVIVED) {
    drawNightSurvivedScreen(ctx, world);
  } else if (world.state === GAME_STATE.GAME_OVER) {
    drawGameOverScreen(ctx, world);
  } else {
    drawCrosshair(ctx);
  }

  // The corner readouts would sit on top of the menu screens, so they're only
  // drawn while you're actually playing.
  if (CONFIG.debug.showDebug && world.state === GAME_STATE.PLAYING) {
    drawDebugReadout(ctx, world, fps);
  }
}

// The mall's back wall, with windows showing the night sky outside.
function drawBackWall(ctx, nightProgress) {
  const { width } = CONFIG.screen;
  const { horizonY } = CONFIG.world;
  const c = CONFIG.colors;

  ctx.fillStyle = c.wallBack;
  ctx.fillRect(0, 0, width, horizonY);

  // Trim band along the top of the wall
  ctx.fillStyle = c.wallTrimUpper;
  ctx.fillRect(0, 0, width, 8);

  drawWindows(ctx, nightProgress);

  // Baseboard where the wall meets the floor
  ctx.fillStyle = c.wallBaseboard;
  ctx.fillRect(0, horizonY - 6, width, 6);
}

// Evenly spaced windows. Each one is a dark frame around a patch of night sky.
function drawWindows(ctx, nightProgress) {
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

  const sky = getSkyState(nightProgress);
  const skyColor = mixColors(sky.earlierColor, sky.laterColor, sky.blend);
  const moonVisibility = getMoonVisibility(nightProgress);
  const sunRise = getSunRise(nightProgress);

  // Stars and the moon fade by being mixed TOWARD the sky behind them, rather
  // than by going transparent. At this size that reads better, and it keeps
  // everything to flat opaque pixels like the rest of the game.
  const starColor = mixColors(skyColor, c.star, sky.starVisibility);
  const moonColor = mixColors(skyColor, c.moon, moonVisibility);

  for (let i = 0; i < windowCount; i++) {
    const x = startX + i * step;
    if (x + windowWidth < 0 || x > width) continue;

    // Frame
    ctx.fillStyle = c.windowFrame;
    ctx.fillRect(x - 2, windowY - 2, windowWidth + 4, windowHeight + 4);

    // The sky itself — this is the clock.
    ctx.fillStyle = skyColor;
    ctx.fillRect(x, windowY, windowWidth, windowHeight);

    // Stars, placed by a fixed pattern so they don't flicker between frames.
    if (sky.starVisibility > 0.02) {
      ctx.fillStyle = starColor;
      ctx.fillRect(x + 6 + (i % 3) * 5, windowY + 8, 1, 1);
      ctx.fillRect(x + 22 - (i % 2) * 6, windowY + 17, 1, 1);
      ctx.fillRect(x + 12 + (i % 4) * 3, windowY + 31, 1, 1);
    }

    // The moon sits in one window only, and sets as the night wears on.
    if (i === 1 && moonVisibility > 0.02) {
      ctx.fillStyle = moonColor;
      ctx.fillRect(x + 22, windowY + 6, 6, 6);
      ctx.fillStyle = skyColor;
      ctx.fillRect(x + 20, windowY + 5, 4, 5);
    }

    // The sun climbs in a different window, late on. Seeing it clear the sill
    // is how you know you're nearly through the shift.
    if (i === 4 && sunRise > 0) {
      drawRisingSun(ctx, x, windowY, windowWidth, windowHeight, sunRise);
    }

    // Window cross-bars
    ctx.fillStyle = c.windowFrame;
    ctx.fillRect(x + windowWidth / 2 - 1, windowY, 2, windowHeight);
    ctx.fillRect(x, windowY + windowHeight / 2 - 1, windowWidth, 2);
  }
}

function drawRisingSun(ctx, x, windowY, windowWidth, windowHeight, rise) {
  const c = CONFIG.colors;

  const sunRadius = 5;
  const centerX = Math.round(x + windowWidth / 2);

  // Starts below the sill and climbs to the upper third of the window.
  const bottom = windowY + windowHeight + sunRadius;
  const top = windowY + windowHeight * 0.3;
  const centerY = Math.round(bottom + (top - bottom) * rise);

  ctx.fillStyle = c.sunGlow;
  ctx.fillRect(centerX - sunRadius - 1, centerY - sunRadius + 1, sunRadius * 2 + 2, sunRadius * 2 - 2);
  ctx.fillRect(centerX - sunRadius + 1, centerY - sunRadius - 1, sunRadius * 2 - 2, sunRadius * 2 + 2);

  ctx.fillStyle = c.sun;
  ctx.fillRect(centerX - sunRadius + 1, centerY - sunRadius + 2, sunRadius * 2 - 2, sunRadius * 2 - 4);
  ctx.fillRect(centerX - sunRadius + 2, centerY - sunRadius + 1, sunRadius * 2 - 4, sunRadius * 2 - 2);

  // Clip anything that would spill below the sill, so it genuinely rises
  // out of the horizon rather than floating in front of the frame.
  ctx.fillStyle = CONFIG.colors.wallBack;
  ctx.fillRect(x - 2, windowY + windowHeight, windowWidth + 4, sunRadius + 3);
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

// Warm light spilling over the mall as the sun comes up.
function drawDawnWash(ctx, nightProgress) {
  const alpha = getDawnWashAlpha(nightProgress);
  if (alpha <= 0) return;

  ctx.fillStyle = `rgba(${CONFIG.sky.dawnWashColor}, ${alpha})`;
  ctx.fillRect(0, 0, CONFIG.screen.width, CONFIG.screen.height);
}

// "NIGHT 3" across the middle of the screen as a shift begins, with how many
// are coming. Fades out rather than snapping away mid-fight.
function drawNightBanner(ctx, world) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;

  const fadeOverSeconds = 0.8;
  const fade = Math.min(world.nightBannerTimer / fadeOverSeconds, 1);

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // A hard offset shadow, which is how 8-bit games made text readable over a
  // busy background without any blurring.
  ctx.font = '16px monospace';
  ctx.fillStyle = c.waveBannerShadow;
  ctx.fillText(`NIGHT ${world.day}`, width / 2 + 1, 53);
  ctx.fillStyle = c.waveBanner;
  ctx.fillText(`NIGHT ${world.day}`, width / 2, 52);

  ctx.font = '8px monospace';
  ctx.fillStyle = c.gameOverText;
  ctx.fillText(`${getAssaultSize(world.day)} SCALPERS INCOMING`, width / 2, 68);

  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// The screen you earn by surviving until sunrise.
function drawNightSurvivedScreen(ctx, world) {
  const { width, height } = CONFIG.screen;
  const c = CONFIG.colors;
  const stats = world.finalStats;

  ctx.fillStyle = c.sunriseVeil;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '16px monospace';
  ctx.fillStyle = c.sunriseTitle;
  ctx.fillText('NIGHT SURVIVED', width / 2, 64);

  ctx.font = '8px monospace';
  ctx.fillStyle = c.gameOverText;
  ctx.fillText(`THE SUN IS UP. SHIFT ${world.day} IS OVER.`, width / 2, 84);

  // The payslip, itemised, so you can see exactly what playing well earned.
  const payLines = world.payslip.lines.map(([label, amount]) => [label, `${amount}`]);
  drawStatLines(ctx, payLines);

  const totalY = 106 + payLines.length * 12 + 6;
  ctx.fillStyle = c.cash;
  ctx.fillText(`TONIGHT'S PAY   ${world.payslip.total}`, width / 2, totalY);

  if (world.gameOverCountdown <= 0) {
    ctx.fillStyle = c.gameOverHint;
    ctx.fillText('PRESS ANY KEY TO COLLECT', width / 2, 176);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// The shop. Spend the night's pay before clocking on again.
//
// Every row is worked out by shop.js, not here — so what the screen shows and
// what a purchase actually does can never drift apart.
function drawShopScreen(ctx, world) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;
  const profile = world.profile;

  ctx.fillStyle = c.shopVeil;
  ctx.fillRect(0, 0, width, CONFIG.screen.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '8px monospace';
  ctx.fillStyle = c.gameOverDim;
  ctx.fillText(`DAY ${profile.day} - THE MALL IS OPEN`, width / 2, 14);

  ctx.font = '16px monospace';
  ctx.fillStyle = c.shopName;
  ctx.fillText('SUPPLY RUN', width / 2, 30);

  ctx.font = '8px monospace';
  ctx.fillStyle = c.cash;
  ctx.fillText(`CASH  ${profile.cash}`, width / 2, 46);

  const rows = getShopRows(profile);
  rows.forEach((row, index) => drawShopRow(ctx, row, index, world));

  ctx.fillStyle = c.gameOverHint;
  ctx.fillText('CLICK OR PRESS 1-5 TO BUY', width / 2, 188);
  ctx.fillStyle = c.gameOverText;
  ctx.fillText(`ENTER - START NIGHT ${profile.day}`, width / 2, 200);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// Where each shop row sits. The drawing code and the click handling both call
// this, so a row can never be drawn somewhere you can't click it.
export function getShopRowBox(index) {
  return {
    x: 46,
    y: 58 + index * 24,
    width: CONFIG.screen.width - 92,
    height: 21,
  };
}

function drawShopRow(ctx, row, index, world) {
  const c = CONFIG.colors;
  const box = getShopRowBox(index);
  const isHovered = world.hoveredShopRow === index;

  ctx.fillStyle = c.shopPanelEdge;
  ctx.fillRect(box.x - 1, box.y - 1, box.width + 2, box.height + 2);
  ctx.fillStyle = isHovered && row.affordable ? c.shopRowHighlight : c.shopPanel;
  ctx.fillRect(box.x, box.y, box.width, box.height);

  ctx.textAlign = 'left';

  // The number you'd press for this row.
  ctx.fillStyle = c.gameOverDim;
  ctx.fillText(`${index + 1}`, box.x + 4, box.y + 7);

  ctx.fillStyle = row.maxed ? c.shopMaxed : c.shopName;
  ctx.fillText(row.name, box.x + 14, box.y + 7);

  ctx.fillStyle = c.shopBlurb;
  ctx.fillText(row.detail, box.x + 14, box.y + 16);

  // Price on the right, red when you can't afford it.
  ctx.textAlign = 'right';
  if (row.maxed) {
    ctx.fillStyle = c.shopMaxed;
    ctx.fillText(row.maxedLabel, box.x + box.width - 5, box.y + 11);
  } else {
    ctx.fillStyle = row.affordable ? c.cash : c.cashShort;
    ctx.fillText(`${row.cost}`, box.x + box.width - 5, box.y + 11);
  }

  ctx.textAlign = 'center';
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
    ctx.fillText(
      `night ${world.day}  ${Math.round(getNightProgress(world) * 100)}%  in ${world.scalpersSpawnedTonight}/${getAssaultSize(world.day)}  $${world.profile.cash}`,
      4,
      64,
    );
  }

  ctx.textBaseline = 'bottom';
  ctx.fillStyle = c.debugLabel;
  ctx.fillText(CONFIG.debug.buildLabel, 4, height - 3);
}
