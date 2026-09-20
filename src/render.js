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
import { drawGrenades, drawExplosions } from './entities/grenade.js';
import { getWeapon, getRoundsLeft, isReloading, getReloadProgress } from './weapons.js';
import { getMousePosition } from './input.js';
import { GAME_STATE } from './world.js';
import { getShopRows } from './shop.js';
import { drawText, drawTextWithShadow } from './font.js';
import { drawMenu } from './menu.js';
import { settings, getDifficulty } from './settings.js';
import { mixColors } from './pixel.js';
import {
  getNightProgress,
  getSkyState,
  getMoonVisibility,
  getSunRise,
  getDawnWashAlpha,
  getAssaultSize,
} from './night.js';

export const TITLE_MENU = ['START SHIFT', 'INSTRUCTIONS', 'OPTIONS'];
export const PAUSE_MENU = ['RESUME SHIFT', 'OPTIONS', 'ABANDON SHIFT'];
export const PAUSE_MENU_TOP_Y = 104;
export const OPTIONS_MENU_TOP_Y = 96;
export const TITLE_MENU_TOP_Y = 128;

export function drawScene(ctx, world, fps) {
  const nightProgress = getNightProgress(world);

  drawBackWall(ctx, nightProgress);
  drawFloor(ctx);

  drawMachine(ctx, world.machine);
  drawBarricade(ctx, world.barricade);
  drawCharacters(ctx, world);

  // Bullets go on top of the barricade, because you're shooting OVER your own
  // wall at whatever is on the far side of it.
  drawGrenades(ctx, world);
  drawBullets(ctx, world);
  drawExplosions(ctx, world);

  // Warm dawn light over the whole mall, so the room brightens along with the
  // sky instead of staying pitch dark behind a sunrise-coloured window.
  drawDawnWash(ctx, nightProgress);

  if (world.state === GAME_STATE.PLAYING || world.state === GAME_STATE.PAUSED) {
    drawAmmoReadout(ctx, world);
  }

  if (world.nightBannerTimer > 0 && world.state === GAME_STATE.PLAYING) {
    drawNightBanner(ctx, world);
  }

  if (world.state === GAME_STATE.PAUSED) {
    drawPauseScreen(ctx, world);
    drawCrosshair(ctx);
  } else if (world.state === GAME_STATE.TITLE) {
    drawTitleScreen(ctx, world);
    drawCrosshair(ctx);
  } else if (world.state === GAME_STATE.INSTRUCTIONS) {
    drawInstructionsScreen(ctx);
    drawCrosshair(ctx);
  } else if (world.state === GAME_STATE.OPTIONS) {
    drawOptionsScreen(ctx, world);
    drawCrosshair(ctx);
  } else if (world.state === GAME_STATE.SHOP) {
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

  drawText(ctx, `NIGHT ${world.day}`, width / 2, 46, {
    color: c.waveBanner,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 3,
    align: 'center',
  });

  drawText(ctx, `${getAssaultSize(world.day)} SCALPERS INCOMING`, width / 2, 74, {
    color: c.gameOverText,
    outlineColor: c.inkOutline,
    align: 'center',
  });

  ctx.restore();
}

// The screen you earn by surviving until sunrise.
function drawNightSurvivedScreen(ctx, world) {
  const { width, height } = CONFIG.screen;
  const c = CONFIG.colors;
  const stats = world.finalStats;

  ctx.fillStyle = c.sunriseVeil;
  ctx.fillRect(0, 0, width, height);

  drawText(ctx, 'NIGHT SURVIVED', width / 2, 50, {
    color: c.sunriseTitle,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 2,
    align: 'center',
  });

  drawText(ctx, `THE SUN IS UP. SHIFT ${world.day} IS OVER.`, width / 2, 76, {
    color: c.gameOverText,
    align: 'center',
  });

  // The payslip, itemised, so you can see exactly what playing well earned.
  const payLines = world.payslip.lines.map(([label, amount]) => [label, `${amount}`]);
  drawStatLines(ctx, payLines);

  const totalY = STAT_FIRST_LINE_Y + payLines.length * STAT_LINE_SPACING + 6;
  drawText(ctx, `TONIGHT'S PAY`, STAT_LABEL_RIGHT, totalY, {
    color: c.cash,
    align: 'right',
  });
  drawText(ctx, `${world.payslip.total}`, STAT_VALUE_LEFT, totalY, {
    color: c.cash,
  });

  if (world.gameOverCountdown <= 0) {
    drawText(ctx, 'PRESS ANY KEY TO COLLECT', width / 2, 176, {
      color: c.gameOverHint,
      align: 'center',
    });
  }
}

// =============================================================================
// TITLE, PAUSE, INSTRUCTIONS AND OPTIONS
// =============================================================================

// The gun in your hands and what's left in it, bottom right.
//
// Rounds are drawn as individual ticks rather than a number, because at a
// glance "nearly empty" is what matters, not the exact count. Above about
// twenty rounds that stops being readable, so those fall back to a figure.
function drawAmmoReadout(ctx, world) {
  const { width, height } = CONFIG.screen;
  const c = CONFIG.colors;
  const guard = world.guard;
  const weapon = getWeapon(guard.weaponId);
  const rounds = getRoundsLeft(guard);

  const right = width - 5;
  const baseY = height - 22;

  drawText(ctx, weapon.name, right, baseY, {
    color: c.ammoFull,
    outlineColor: c.inkOutline,
    bold: true,
    align: 'right',
  });

  if (isReloading(guard)) {
    const barWidth = 46;
    const barX = right - barWidth;
    const barY = baseY + 11;

    ctx.fillStyle = c.inkOutline;
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, 5);
    ctx.fillStyle = c.reloadBarTrack;
    ctx.fillRect(barX, barY, barWidth, 3);
    ctx.fillStyle = c.reloadBar;
    ctx.fillRect(barX, barY, Math.round(barWidth * getReloadProgress(guard)), 3);

    drawText(ctx, 'RELOADING', right - barWidth - 4, baseY + 9, {
      color: c.reloadBar,
      outlineColor: c.inkOutline,
      align: 'right',
    });
    return;
  }

  const lowThreshold = Math.max(1, Math.ceil(weapon.magazineSize * 0.25));
  const color = rounds === 0 ? c.ammoEmpty : rounds <= lowThreshold ? c.ammoLow : c.ammoFull;

  if (weapon.magazineSize <= 20) {
    for (let i = 0; i < weapon.magazineSize; i++) {
      const x = right - 3 - i * 4;
      ctx.fillStyle = c.inkOutline;
      ctx.fillRect(x - 1, baseY + 10, 4, 7);
      ctx.fillStyle = i < rounds ? color : c.reloadBarTrack;
      ctx.fillRect(x, baseY + 11, 2, 5);
    }
  } else {
    drawText(ctx, `${rounds} / ${weapon.magazineSize}`, right, baseY + 11, {
      color,
      outlineColor: c.inkOutline,
      bold: true,
      align: 'right',
    });
  }
}

// Menu screens get their own backdrop — a checked field, like the reference —
// rather than a dimmed view of the mall. A menu should read as a menu, not as
// the game with the lights turned down.
function drawMenuBackdrop(ctx) {
  const { width, height } = CONFIG.screen;
  const c = CONFIG.colors;
  const tile = 12;

  ctx.fillStyle = c.menuBackdrop;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = c.menuBackdropAlt;
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      if ((x / tile + y / tile) % 2 === 0) {
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }
}

// Paused mid-shift. Drawn over the frozen scene rather than replacing it, so
// you can still see exactly what you're going back to.
function drawPauseScreen(ctx, world) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;

  ctx.fillStyle = c.gameOverVeil;
  ctx.fillRect(0, 0, width, CONFIG.screen.height);

  drawText(ctx, 'PAUSED', width / 2, 48, {
    color: c.titleMain,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 3,
    align: 'center',
  });

  drawText(ctx, `NIGHT ${world.day} - ${Math.round(getNightProgress(world) * 100)}% THROUGH`, width / 2, 80, {
    color: c.gameOverDim,
    align: 'center',
  });

  drawMenu(
    ctx,
    PAUSE_MENU.map((label) => ({ label })),
    PAUSE_MENU_TOP_Y,
    world.menuIndex,
  );

  drawText(ctx, 'ABANDONING LOSES TONIGHT\'S PAY', width / 2, 172, {
    color: c.cashShort,
    align: 'center',
  });
  drawText(ctx, 'ESC TO RESUME', width / 2, 190, {
    color: c.gameOverHint,
    align: 'center',
  });
}

function drawTitleScreen(ctx, world) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;

  drawMenuBackdrop(ctx);

  // ---------------------------------------------------------------------
  // YOUR SPLASH ART GOES HERE.
  //
  // Drop a PNG into assets/sprites/ and this block becomes one drawImage
  // call filling roughly x 0-384, y 10-110. Everything below stays as it is.
  // Until then, the title is drawn in the game's own pixel font.
  // ---------------------------------------------------------------------
  drawText(ctx, 'VENDING MACHINE', width / 2, 26, {
    color: c.titleMain,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 3,
    align: 'center',
  });

  drawText(ctx, 'LAST STAND', width / 2, 54, {
    color: c.titleSub,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 4,
    align: 'center',
  });

  drawText(ctx, 'NOBODY TOUCHES THE PACKS', width / 2, 100, {
    color: c.menuItem,
    outlineColor: c.inkOutline,
    align: 'center',
  });

  drawMenu(
    ctx,
    TITLE_MENU.map((label) => ({ label })),
    TITLE_MENU_TOP_Y,
    world.menuIndex,
  );

  drawText(ctx, 'ARROWS + ENTER, OR CLICK', width / 2, 198, {
    color: c.gameOverDim,
    align: 'center',
  });
}

const INSTRUCTION_LINES = [
  ['', ''],
  ['YOU ARE MALL SECURITY ON THE NIGHT SHIFT.', ''],
  ['CARD SCALPERS COME FROM THE RIGHT TO BUY', ''],
  ['OUT THE VENDING MACHINE. HOLD THEM OFF', ''],
  ['UNTIL THE SUN COMES UP.', ''],
  ['', ''],
  ['WASD / ARROWS', 'MOVE'],
  ['MOUSE', 'AIM'],
  ['HOLD LEFT CLICK', 'FIRE'],
  ['', ''],
  ['THE BARRICADE IS YOUR HEALTH BAR.', ''],
  ['WHEN IT FALLS THEY WALK TO THE MACHINE -', ''],
  ['CLEAR THEM OFF IT AND YOU SURVIVE ANYWAY.', ''],
  ['', ''],
  ['DAMAGE TO THE WALL CARRIES TO TOMORROW.', ''],
];

function drawInstructionsScreen(ctx) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;

  drawMenuBackdrop(ctx);

  drawText(ctx, 'INSTRUCTIONS', width / 2, 14, {
    color: c.titleMain,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 2,
    align: 'center',
  });

  INSTRUCTION_LINES.forEach(([text, value], index) => {
    const y = 38 + index * 10;
    if (!text) return;

    // Lines with a value are control bindings, so they get two columns.
    if (value) {
      drawText(ctx, text, 150, y, { color: c.menuItemSelected, align: 'right' });
      drawText(ctx, value, 162, y, { color: c.menuItem });
    } else {
      drawText(ctx, text, width / 2, y, { color: c.menuItem, align: 'center' });
    }
  });

  drawText(ctx, 'ESC OR ENTER TO GO BACK', width / 2, 198, {
    color: c.gameOverHint,
    align: 'center',
  });
}

export function getOptionsMenuItems() {
  const difficulty = getDifficulty();

  return [
    { label: 'DIFFICULTY', value: difficulty.name },
    { label: 'SCALPER HEALTH BARS', value: settings.showScalperHealth ? 'ON' : 'OFF' },
    { label: 'BACK', value: '' },
  ];
}

function drawOptionsScreen(ctx, world) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;

  drawMenuBackdrop(ctx);

  drawText(ctx, 'OPTIONS', width / 2, 22, {
    color: c.titleMain,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 2,
    align: 'center',
  });

  drawMenu(ctx, getOptionsMenuItems(), OPTIONS_MENU_TOP_Y, world.menuIndex);

  // The blurb under the list explains whichever row you're sitting on.
  const difficulty = getDifficulty();
  const blurb = world.menuIndex === 0
    ? difficulty.blurb
    : world.menuIndex === 1
      ? 'LITTLE BARS OVER SCALPERS. HANDY WHEN TUNING.'
      : 'RETURN TO THE TITLE SCREEN.';

  drawText(ctx, blurb, width / 2, 158, { color: c.gameOverDim, align: 'center' });

  drawText(ctx, 'LEFT / RIGHT OR CLICK TO CHANGE', width / 2, 186, {
    color: c.gameOverHint,
    align: 'center',
  });
  drawText(ctx, 'ESC TO GO BACK', width / 2, 198, {
    color: c.gameOverDim,
    align: 'center',
  });
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

  drawText(ctx, 'SUPPLY RUN', width / 2, 6, {
    color: c.titleMain,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 2,
    align: 'center',
  });

  drawText(ctx, `DAY ${profile.day}`, 30, 24, {
    color: c.gameOverDim,
    outlineColor: c.inkOutline,
  });
  drawText(ctx, `CASH ${profile.cash}`, width - 30, 24, {
    color: c.cash,
    outlineColor: c.inkOutline,
    bold: true,
    align: 'right',
  });

  const rows = getShopRows(profile);
  rows.forEach((row, index) => drawShopRow(ctx, row, index, world));

  const lastRow = getShopRowBox(rows.length - 1);
  drawText(ctx, `CLICK OR PRESS 1-${rows.length} TO BUY`, width / 2, lastRow.y + 24, {
    color: c.gameOverHint,
    outlineColor: c.inkOutline,
    align: 'center',
  });
  drawText(ctx, `ENTER - START NIGHT ${profile.day}`, width / 2, lastRow.y + 34, {
    color: c.gameOverText,
    outlineColor: c.inkOutline,
    align: 'center',
  });
}

// Where each shop row sits. The drawing code and the click handling both call
// this, so a row can never be drawn somewhere you can't click it.
// The shop now lists repair, three weapons and four upgrades, so rows are
// tight. Both the drawing and the clicking read these same numbers.
const SHOP_ROW_TOP = 36;
const SHOP_ROW_SPACING = 20;

export function getShopRowBox(index) {
  return {
    x: 30,
    y: SHOP_ROW_TOP + index * SHOP_ROW_SPACING,
    width: CONFIG.screen.width - 60,
    height: 18,
  };
}

function drawShopRow(ctx, row, index, world) {
  const c = CONFIG.colors;
  const box = getShopRowBox(index);
  const isSelected = world.hoveredShopRow === index;

  // Selected rows sit on a bright bar; the rest on the dark panel. Same idea
  // as the menus — a solid block of colour reads instantly.
  ctx.fillStyle = c.shopPanelEdge;
  ctx.fillRect(box.x - 1, box.y - 1, box.width + 2, box.height + 2);
  ctx.fillStyle = isSelected ? c.menuHighlightBar : c.shopPanel;
  ctx.fillRect(box.x, box.y, box.width, box.height);

  const nameColor = isSelected ? '#ffffff' : row.maxed ? c.shopMaxed : c.shopName;
  const detailColor = isSelected ? '#ffd8e8' : c.shopBlurb;

  // The number you'd press for this row.
  drawText(ctx, `${index + 1}`, box.x + 3, box.y + 1, {
    color: isSelected ? '#ffffff' : c.gameOverDim,
    outlineColor: c.inkOutline,
  });

  drawText(ctx, row.name, box.x + 12, box.y + 1, {
    color: nameColor,
    outlineColor: c.inkOutline,
    bold: true,
  });

  drawText(ctx, row.detail, box.x + 12, box.y + 10, { color: detailColor });

  // Price on the right, red when you can't afford it.
  const priceX = box.x + box.width - 4;
  const priceText = row.maxed ? row.maxedLabel : `${row.cost}`;
  const priceColor = row.maxed
    ? c.shopMaxed
    : row.affordable
      ? c.cash
      : c.cashShort;

  drawText(ctx, priceText, priceX, box.y + 5, {
    color: isSelected && !row.maxed ? '#ffffff' : priceColor,
    outlineColor: c.inkOutline,
    bold: true,
    align: 'right',
  });
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

  drawText(ctx, 'GAME OVER', width / 2, 50, {
    color: c.gameOverTitle,
    outlineColor: c.inkOutline,
    bold: true,
    scale: 2,
    align: 'center',
  });

  drawText(ctx, 'THEY BOUGHT OUT THE MACHINE', width / 2, 76, {
    color: c.gameOverText,
    align: 'center',
  });

  drawStatLines(ctx, [
    ['SCALPERS STOPPED', `${stats.scalpersStopped}`],
    ['YOU LASTED', formatDuration(stats.secondsSurvived)],
    ['STILL ON THE FLOOR', `${stats.scalpersOnFloor}`],
    ['BARRICADE', stats.barricadeHeld ? 'HELD' : 'BREACHED'],
  ]);

  // The prompt only appears once restarting actually works, so it never
  // invites a press the game is going to ignore.
  if (world.gameOverCountdown <= 0) {
    drawText(ctx, 'PRESS ANY KEY TO WORK ANOTHER NIGHT', width / 2, 172, {
      color: c.gameOverHint,
      align: 'center',
    });
  }
}

// Labels and values in two tidy columns.
//
// Centring each whole line individually — the obvious first attempt — makes
// the columns wander, because a longer value drags its label leftward. Pinning
// the labels' right edge and the values' left edge to fixed positions instead
// keeps them in line whatever they say.
const STAT_LABEL_RIGHT = 206;
const STAT_VALUE_LEFT = 218;
const STAT_FIRST_LINE_Y = 100;
const STAT_LINE_SPACING = 12;

function drawStatLines(ctx, lines) {
  const color = CONFIG.colors.gameOverDim;

  lines.forEach(([label, value], index) => {
    const y = STAT_FIRST_LINE_Y + index * STAT_LINE_SPACING;

    drawText(ctx, label, STAT_LABEL_RIGHT, y, { color, align: 'right' });
    drawText(ctx, value, STAT_VALUE_LEFT, y, { color });
  });
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

  const lines = [`${fps} FPS`];

  if (CONFIG.debug.showPosition) {
    lines.push(`X ${Math.round(world.guard.x)} Y ${Math.round(world.guard.y)}`);
  }
  if (CONFIG.debug.showBulletCount) {
    lines.push(`BULLETS ${world.bullets.length}`);
  }
  if (CONFIG.debug.showScalperCount) {
    lines.push(`SCALPERS ${world.scalpers.length}`);
    lines.push(`STOPPED ${world.scalpersStopped}`);
    lines.push(`PACKS ${world.machine.packsRemaining}`);
    lines.push(
      `NIGHT ${world.day} ${Math.round(getNightProgress(world) * 100)}% IN ${world.scalpersSpawnedTonight}/${getAssaultSize(world.day)} $${world.profile.cash}`,
    );
  }

  lines.forEach((line, index) => {
    drawText(ctx, line, 4, 4 + index * 9, { color: c.debugText });
  });

  drawText(ctx, CONFIG.debug.buildLabel, 4, height - 11, { color: c.debugLabel });
}
