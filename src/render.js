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
import { drawGuard, getHirePalette } from './entities/guard-art.js';
import { drawScalper } from './entities/scalper-art.js';
import { drawBoss } from './entities/boss-art.js';
import { BOSS_STATE, isWeakPointOpen } from './entities/boss.js';
import { drawBullets } from './entities/bullet.js';
import { drawGrenades, drawExplosions } from './entities/grenade.js';
import {
  getWeapon,
  getRoundsLeft,
  isReloading,
  getReloadProgress,
  ownsWeapon,
} from './weapons.js';
import { drawWeaponIcon, getIconSize } from './weapon-icons.js';
import { getShakeOffset, drawParticles } from './juice.js';
import { getDevRows } from './dev.js';
import { getMousePosition } from './input.js';
import { GAME_STATE } from './world.js';
import { getShopRows } from './shop.js';
import { drawText, drawTextWithShadow } from './font.js';
import { drawMenu, getMenuRowBox } from './menu.js';
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

// The developer panel packs a lot of rows in, so it uses its own tight layout
// rather than the shared menu spacing.
export const DEV_ROW_TOP = 28;
export const DEV_ROW_SPACING = 13;

export function getDevRowBox(index) {
  return {
    x: 34,
    y: DEV_ROW_TOP + index * DEV_ROW_SPACING,
    width: CONFIG.screen.width - 68,
    height: 11,
  };
}
export const OPTIONS_MENU_TOP_Y = 74;
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
    drawWeaponBar(ctx, world);

    if (world.boss && world.boss.health > 0) {
      drawBossBar(ctx, world.boss);
    }
  }

  if (world.nightBannerTimer > 0 && world.state === GAME_STATE.PLAYING) {
    drawNightBanner(ctx, world);
  }

  if (world.state === GAME_STATE.DEV_PANEL) {
    drawDevPanel(ctx, world);
    drawCrosshair(ctx);
  } else if (world.state === GAME_STATE.PAUSED) {
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

  // BLEED is how far the background is drawn past the edge of the screen.
  // Without it, screen shake would slide the picture over and reveal bare
  // canvas along the edges.
  const bleed = CONFIG.juice.shakeMax + 2;

  ctx.fillStyle = c.wallBack;
  ctx.fillRect(-bleed, -bleed, width + bleed * 2, horizonY + bleed);

  // Trim band along the top of the wall
  ctx.fillStyle = c.wallTrimUpper;
  ctx.fillRect(-bleed, -bleed, width + bleed * 2, 8 + bleed);

  drawWindows(ctx, nightProgress);

  // Baseboard where the wall meets the floor
  ctx.fillStyle = c.wallBaseboard;
  ctx.fillRect(-bleed, horizonY - 6, width + bleed * 2, 6);
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

  const bleed = CONFIG.juice.shakeMax + 2;

  for (let y = horizonY; y < height + bleed; y += tileSize) {
    for (let x = -tileSize; x < width + bleed; x += tileSize) {
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
  ctx.fillRect(-bleed, horizonY, width + bleed * 2, 3);
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

  if (world.boss && world.boss.health > 0) {
    everyone.push({ y: world.boss.y, draw: () => drawBoss(ctx, world.boss) });
  }

  // Hired guards are drawn by the exact same code as you, just handed a
  // different set of colours.
  const hirePalette = getHirePalette();
  for (const hire of world.hires) {
    everyone.push({ y: hire.y, draw: () => drawGuard(ctx, hire, hirePalette) });
  }

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

// THE RESELLER's health, across the top, plus whatever he's about to do.
//
// The state caption matters more than the bar. A health bar tells you how the
// fight is going; the caption tells you what to do in the next second.
function drawBossBar(ctx, boss) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;

  const barWidth = 230;
  const barHeight = 7;
  const barX = Math.round((width - barWidth) / 2);
  const barY = 14;

  drawText(ctx, CONFIG.boss.name, width / 2, barY - 9, {
    color: boss.enraged ? c.weakPointOpen : c.ammoFull,
    outlineColor: c.inkOutline,
    bold: true,
    align: 'center',
  });

  ctx.fillStyle = c.bossBarEdge;
  ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
  ctx.fillStyle = c.bossBarTrack;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const fraction = Math.max(0, boss.health / boss.maxHealth);
  ctx.fillStyle = c.bossBarFill;
  ctx.fillRect(barX, barY, Math.round(barWidth * fraction), barHeight);

  // The halfway mark, so you can see the second gear coming.
  ctx.fillStyle = c.bossBarEdge;
  ctx.fillRect(barX + Math.round(barWidth * CONFIG.boss.enragedAtHealthFraction), barY, 1, barHeight);

  drawBossCaption(ctx, boss, barY + barHeight + 4);
}

function drawBossCaption(ctx, boss, y) {
  const { width } = CONFIG.screen;
  const c = CONFIG.colors;

  const caption = getBossCaption(boss);
  if (!caption) return;

  drawText(ctx, caption.text, width / 2, y, {
    color: caption.color,
    outlineColor: c.inkOutline,
    bold: caption.loud,
    align: 'center',
  });

  // While the window is open, a countdown bar shows exactly how long is left.
  // Knowing you have half a second rather than 'some time' is the difference
  // between committing to the shot and dithering.
  if (boss.state !== BOSS_STATE.WINDING_UP) return;

  const window = boss.enraged
    ? CONFIG.boss.windupSecondsEnraged
    : CONFIG.boss.windupSeconds;
  const left = Math.max(0, 1 - boss.stateTimer / window);

  const barWidth = 70;
  const barX = Math.round((width - barWidth) / 2);

  ctx.fillStyle = c.inkOutline;
  ctx.fillRect(barX - 1, y + 10, barWidth + 2, 5);
  ctx.fillStyle = c.bossBarTrack;
  ctx.fillRect(barX, y + 11, barWidth, 3);
  ctx.fillStyle = c.weakPointGlow;
  ctx.fillRect(barX, y + 11, Math.round(barWidth * left), 3);
}

function getBossCaption(boss) {
  const c = CONFIG.colors;

  switch (boss.state) {
    case BOSS_STATE.WINDING_UP:
      return { text: 'SHOOT THE WEAK POINT', color: c.weakPointGlow, loud: true };
    case BOSS_STATE.CHARGING:
      return { text: 'INCOMING', color: c.weakPointOpen, loud: true };
    case BOSS_STATE.STAGGERED:
      return { text: 'STAGGERED - HIT HIM', color: c.cash, loud: true };
    case BOSS_STATE.ATTACKING:
      return { text: 'HE IS ON THE BARRICADE', color: c.ammoLow, loud: false };
    default:
      return boss.enraged
        ? { text: 'ENRAGED', color: c.weakPointOpen, loud: false }
        : null;
  }
}

// The weapon bar, bottom right: one slot per weapon in the game, always all
// of them. Locked slots stay visible and empty so you can see what there is
// to buy and which number it'll be — the numbers never shuffle around as you
// unlock things.
function drawWeaponBar(ctx, world) {
  const { width, height } = CONFIG.screen;
  const guard = world.guard;

  const slotWidth = 18;
  const slotHeight = 15;
  const gap = 2;

  const totalWidth = CONFIG.weapons.length * slotWidth + (CONFIG.weapons.length - 1) * gap;
  const startX = width - 4 - totalWidth;
  const slotY = height - 4 - slotHeight;

  CONFIG.weapons.forEach((weapon, index) => {
    const x = startX + index * (slotWidth + gap);
    const owned = ownsWeapon(world.profile, weapon.id);
    const active = guard.weaponId === weapon.id;

    drawWeaponSlot(ctx, weapon, x, slotY, slotWidth, slotHeight, index, owned, active);
  });

  drawAmmoReadout(ctx, world, width - 4, slotY - 11);
}

function drawWeaponSlot(ctx, weapon, x, y, slotWidth, slotHeight, index, owned, active) {
  const c = CONFIG.colors;

  ctx.fillStyle = active ? c.slotEdgeActive : c.slotEdge;
  ctx.fillRect(x - 1, y - 1, slotWidth + 2, slotHeight + 2);

  ctx.fillStyle = owned ? c.slotFilled : c.slotEmpty;
  ctx.fillRect(x, y, slotWidth, slotHeight);

  drawText(ctx, `${index + 1}`, x + 2, y + 2, {
    color: active ? c.slotNumberActive : c.slotNumber,
  });

  // Empty slots stay empty. Seeing a blank 3 and 4 is what tells you there's
  // more to buy without spoiling what it looks like.
  if (!owned) return;

  const icon = getIconSize();
  drawWeaponIcon(
    ctx,
    weapon.id,
    x + Math.round((slotWidth - icon.width) / 2) + 1,
    y + Math.round((slotHeight - icon.height) / 2),
  );
}

// What's left in the gun you're holding, sitting just above the slots.
//
// Rounds are drawn as individual ticks rather than a number, because at a
// glance "nearly empty" is what matters, not the exact count. Above about
// twenty rounds that stops being readable, so those fall back to a figure.
function drawAmmoReadout(ctx, world, right, baseY) {
  const c = CONFIG.colors;
  const guard = world.guard;
  const weapon = getWeapon(guard.weaponId);
  const rounds = getRoundsLeft(guard);

  if (isReloading(guard)) {
    const barWidth = 52;
    const barX = right - barWidth;

    ctx.fillStyle = c.inkOutline;
    ctx.fillRect(barX - 1, baseY + 1, barWidth + 2, 6);
    ctx.fillStyle = c.reloadBarTrack;
    ctx.fillRect(barX, baseY + 2, barWidth, 4);
    ctx.fillStyle = c.reloadBar;
    ctx.fillRect(barX, baseY + 2, Math.round(barWidth * getReloadProgress(guard)), 4);

    drawText(ctx, 'RELOADING', barX - 4, baseY, {
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
      ctx.fillRect(x - 1, baseY, 4, 8);
      ctx.fillStyle = i < rounds ? color : c.reloadBarTrack;
      ctx.fillRect(x, baseY + 1, 2, 6);
    }
    return;
  }

  drawText(ctx, `${rounds} / ${weapon.magazineSize}`, right, baseY + 1, {
    color,
    outlineColor: c.inkOutline,
    bold: true,
    align: 'right',
  });
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

// The developer panel. Deliberately plain and unlovely — it's a workbench,
// not part of the game, and it should never be mistaken for one.
function drawDevPanel(ctx, world) {
  const { width, height } = CONFIG.screen;
  const c = CONFIG.colors;

  ctx.fillStyle = 'rgba(6, 10, 18, 0.94)';
  ctx.fillRect(0, 0, width, height);

  drawText(ctx, 'DEVELOPER PANEL', width / 2, 8, {
    color: c.debugText,
    outlineColor: c.inkOutline,
    bold: true,
    align: 'center',
  });

  drawText(ctx, 'NOTHING HERE IS EARNED', width / 2, 18, {
    color: c.gameOverDim,
    align: 'center',
  });

  const rows = getDevRows(world, world.profile);

  rows.forEach((row, index) => {
    const box = getDevRowBox(index);
    const selected = index === world.menuIndex;

    if (selected) {
      ctx.fillStyle = c.debugText;
      ctx.fillRect(box.x - 2, box.y - 1, box.width + 4, box.height);
    }

    drawText(ctx, row.label, box.x, box.y + 1, {
      color: selected ? '#0a1208' : c.menuItem,
    });

    if (row.value) {
      drawText(ctx, row.value, box.x + box.width, box.y + 1, {
        color: selected ? '#0a1208' : c.cash,
        align: 'right',
      });
    }
  });

  drawText(ctx, 'LEFT/RIGHT CHANGE   ENTER APPLY   F1 CLOSE', width / 2, height - 12, {
    color: c.gameOverHint,
    align: 'center',
  });
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
    { label: 'VOLUME', value: formatVolume(settings.volume) },
    { label: 'SCALPER HEALTH BARS', value: settings.showScalperHealth ? 'ON' : 'OFF' },
    { label: 'DEVELOPER MODE', value: settings.devMode ? 'ON' : 'OFF' },
    { label: 'BACK', value: '' },
  ];
}

// Volume as a row of blocks rather than a number — you're setting a feeling,
// not entering a value.
function formatVolume(volume) {
  const steps = 10;
  const filled = Math.round(volume * steps);
  return '|'.repeat(filled) + '.'.repeat(steps - filled);
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

  const items = getOptionsMenuItems();
  drawMenu(ctx, items, OPTIONS_MENU_TOP_Y, world.menuIndex);

  // The blurb under the list explains whichever row you're sitting on.
  const difficulty = getDifficulty();
  const blurbs = [
    difficulty.blurb,
    'HOW LOUD. ZERO IS SILENT.',
    'LITTLE BARS OVER SCALPERS. HANDY WHEN TUNING.',
    'EVERY WEAPON UNLOCKED, PLUS A CHEAT PANEL ON F1.',
    'RETURN TO THE TITLE SCREEN.',
  ];
  const blurb = blurbs[world.menuIndex] || '';

  // The description sits BELOW the last row, worked out from where that row
  // actually is rather than from a number typed in here. Adding the volume
  // row pushed the menu down into a hardcoded 158 and the two overlapped —
  // measuring from the list means that can't happen again.
  const lastRow = getMenuRowBox(items.length - 1, OPTIONS_MENU_TOP_Y);
  const blurbY = lastRow.y + lastRow.height + 9;

  drawText(ctx, blurb, width / 2, blurbY, { color: c.gameOverDim, align: 'center' });

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

  // You only find out someone walked when you get here, because that's when
  // payroll actually ran.
  if (world.someoneQuit) {
    drawText(ctx, 'COULDNT MAKE PAYROLL - A GUARD QUIT', width / 2, 24, {
      color: c.cashShort,
      align: 'center',
    });
  }
  drawText(ctx, `CASH ${profile.cash}`, width - 30, 24, {
    color: c.cash,
    outlineColor: c.inkOutline,
    bold: true,
    align: 'right',
  });

  const rows = getShopRows(profile);
  rows.forEach((row, index) => drawShopRow(ctx, row, index, world));

  const lastRow = getShopRowBox(rows.length - 1);
  drawText(ctx, `CLICK OR PRESS 1-${rows.length} TO BUY`, width / 2, lastRow.y + 22, {
    color: c.gameOverHint,
    outlineColor: c.inkOutline,
    align: 'center',
  });
  drawText(ctx, `ENTER - START NIGHT ${profile.day}`, width / 2, lastRow.y + 32, {
    color: c.gameOverText,
    outlineColor: c.inkOutline,
    align: 'center',
  });
}

// Where each shop row sits. The drawing code and the click handling both call
// this, so a row can never be drawn somewhere you can't click it.
// The shop now lists repair, three weapons and four upgrades, so rows are
// tight. Both the drawing and the clicking read these same numbers.
const SHOP_ROW_TOP = 34;
const SHOP_ROW_SPACING = 18;

export function getShopRowBox(index) {
  return {
    x: 30,
    y: SHOP_ROW_TOP + index * SHOP_ROW_SPACING,
    width: CONFIG.screen.width - 60,
    height: 16,
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

  drawText(ctx, row.detail, box.x + 12, box.y + 9, { color: detailColor });

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
