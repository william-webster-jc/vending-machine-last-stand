// =============================================================================
// main.js — the heartbeat.
//
// This file starts the game and keeps it alive. Everything else in the project
// hangs off the loop at the bottom of this file.
//
// THE BIG IDEA: a game is not a thing that happens once. It's a thing that
// redraws itself about 60 times a second, forever. Each redraw is a "frame".
// Move something 1 pixel per frame and your eye sees it gliding.
// =============================================================================

import { CONFIG } from './config.js';
import { drawScene } from './render.js';
import { updateGuard } from './entities/guard.js';
import { updateBullets } from './entities/bullet.js';
import { updateGrenades } from './entities/grenade.js';
import { updateHires } from './entities/hire.js';
import { updateTech } from './entities/tech.js';
import { updateJuice } from './juice.js';
import { getOwnedWeapons, beginReload, switchWeapon } from './weapons.js';
import { updateScalpers } from './entities/scalper.js';
import { updateMachine } from './entities/machine.js';
import { createWorld, GAME_STATE } from './world.js';
import { updateNight } from './night.js';
import { createProfile, getShopRows, buyUpgrade } from './shop.js';
import {
  getShopRowBox,
  getDevRowBox,
  TITLE_MENU,
  TITLE_MENU_TOP_Y,
  PAUSE_MENU,
  PAUSE_MENU_TOP_Y,
  OPTIONS_MENU_TOP_Y,
  getOptionsMenuItems,
} from './render.js';
import { findMenuRowAt, moveSelection } from './menu.js';
import { settings, cycleDifficulty } from './settings.js';
import { getDevRows, applyDevAction, DEV_COMMAND } from './dev.js';
import {
  setVolume,
  playMenuMove,
  playMenuConfirm,
  playPurchase,
  playDenied,
  playNightStart,
} from './audio.js';
import {
  attachMouseTo,
  consumeAnyPress,
  clearPendingPress,
  consumeClick,
  consumeDigits,
  getMousePosition,
  consumeConfirm,
  consumeMenuActions,
  consumeReload,
  consumeDevPanel,
} from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// The canvas draws at this small size. It gets blown up to fill your window
// further down, in fitCanvasToWindow().
canvas.width = CONFIG.screen.width;
canvas.height = CONFIG.screen.height;
ctx.imageSmoothingEnabled = false;

// -----------------------------------------------------------------------------
// THE WORLD — everything the game currently knows about. Built in world.js.
//
// `let` rather than `const` because losing a night throws this whole object
// away and builds a fresh one — which is the entire restart mechanism.
// -----------------------------------------------------------------------------
// Your career: day count, cash, upgrades, and how battered the wall is. This
// is the only thing that survives a night.
let profile = createProfile();
let world = createWorld(profile);

// The game opens on the title screen, not mid-shift.
world.state = GAME_STATE.TITLE;

// The mouse needs to know about the canvas so it can convert screen positions
// into the game's own coordinates.
attachMouseTo(canvas);

// -----------------------------------------------------------------------------
// SCALING
// We only ever scale by whole numbers (2x, 3x, 4x...). Scaling by something like
// 2.7x would land pixels on half-pixels and make everything look fuzzy.
// -----------------------------------------------------------------------------
function fitCanvasToWindow() {
  const widthScale = Math.floor(window.innerWidth / CONFIG.screen.width);
  const heightScale = Math.floor(window.innerHeight / CONFIG.screen.height);
  const scale = Math.max(1, Math.min(widthScale, heightScale));

  canvas.style.width = `${CONFIG.screen.width * scale}px`;
  canvas.style.height = `${CONFIG.screen.height * scale}px`;
}

window.addEventListener('resize', fitCanvasToWindow);
fitCanvasToWindow();

// -----------------------------------------------------------------------------
// FRAME RATE READOUT
// Counts how many frames happened over half a second, then works out the rate.
// Measuring over a window instead of every frame stops the number flickering.
// -----------------------------------------------------------------------------
let framesThisSample = 0;
let secondsThisSample = 0;
let framesPerSecond = 0;

function measureFrameRate(deltaSeconds) {
  framesThisSample += 1;
  secondsThisSample += deltaSeconds;

  if (secondsThisSample >= CONFIG.debug.fpsSampleSeconds) {
    framesPerSecond = Math.round(framesThisSample / secondsThisSample);
    framesThisSample = 0;
    secondsThisSample = 0;
  }
}

// -----------------------------------------------------------------------------
// UPDATE — where everything thinks and moves, once per frame.
// Every new thing we build gets one line here.
// -----------------------------------------------------------------------------
function update(deltaSeconds) {
  measureFrameRate(deltaSeconds);

  // Each game state does a completely different job. Splitting them like this
  // is what stops "is the game over?" checks leaking into every other file.
  if (world.state === GAME_STATE.PLAYING) {
    updatePlaying(deltaSeconds);
    return;
  }

  switch (world.state) {
    case GAME_STATE.TITLE:
      updateTitle();
      return;
    case GAME_STATE.PAUSED:
      updatePaused();
      return;
    case GAME_STATE.DEV_PANEL:
      updateDevPanel();
      return;
    case GAME_STATE.INSTRUCTIONS:
      updateInstructions();
      return;
    case GAME_STATE.OPTIONS:
      updateOptions();
      return;
    case GAME_STATE.SHOP:
      updateShop();
      return;
    default:
      updateBetweenNights(deltaSeconds);
  }
}

// -----------------------------------------------------------------------------
// MENUS
// -----------------------------------------------------------------------------

// Every menu works the same way: arrows move the highlight, the mouse points
// at a row, and Enter or a click picks it. This handles that shared part and
// hands back what the caller has to act on.
//
// onNudge fires once per LEFT or RIGHT press. It's a callback rather than a
// returned value on purpose: if two presses land between frames, storing one
// number would quietly throw the second away, and the setting would only move
// once. Calling back per press can't lose any.
function runMenu(rowCount, topY, onNudge) {
  const result = { chosen: -1, wentBack: false };

  for (const action of consumeMenuActions()) {
    if (action === 'menuUp') {
      world.menuIndex = moveSelection(world.menuIndex, -1, rowCount);
      playMenuMove();
    }
    if (action === 'menuDown') {
      world.menuIndex = moveSelection(world.menuIndex, 1, rowCount);
      playMenuMove();
    }
    if (action === 'back') result.wentBack = true;

    if (onNudge && (action === 'menuLeft' || action === 'menuRight')) {
      onNudge(action === 'menuRight' ? 1 : -1);
    }
  }

  // Pointing at a row selects it, so keyboard and mouse never disagree about
  // which row is live.
  const hovered = findMenuRowAt(getMousePosition(), rowCount, topY);
  if (hovered >= 0) world.menuIndex = hovered;

  const click = consumeClick();
  if (click) {
    const clicked = findMenuRowAt(click, rowCount, topY);
    if (clicked >= 0) result.chosen = clicked;
  }

  if (consumeConfirm()) result.chosen = world.menuIndex;

  if (result.chosen >= 0) playMenuConfirm();

  return result;
}

// Number keys pick a weapon, R reloads. Only weapons you own are in the list,
// so the numbers never leave a gap.
// A boss on zero health is done: clear him off the floor once, and remember
// it so the bounty gets paid and he doesn't walk back on tonight.
function retireBossIfDown(world) {
  if (!world.boss || world.boss.health > 0) return;

  world.boss = null;
  world.bossDefeated = true;
}

function handleWeaponControls() {
  if (consumeReload()) {
    beginReload(world.guard);
  }

  const owned = getOwnedWeapons(profile);
  for (const digit of consumeDigits()) {
    const weapon = owned[digit - 1];
    if (weapon) switchWeapon(world.guard, weapon.id);
  }
}

function pauseShift() {
  world.state = GAME_STATE.PAUSED;
  world.menuIndex = 0;
  clearPendingPress();
}

// Nothing in the world updates while paused, so the shift is exactly where
// you left it.
function updatePaused() {
  const { chosen, wentBack } = runMenu(PAUSE_MENU.length, PAUSE_MENU_TOP_Y);

  if (wentBack) {
    resumeShift();
    return;
  }

  if (chosen === 0) {
    resumeShift();
  } else if (chosen === 1) {
    world.optionsCameFrom = GAME_STATE.PAUSED;
    goToMenu(GAME_STATE.OPTIONS);
  } else if (chosen === 2) {
    // Walking out mid-shift earns nothing — no payslip, no cash, career over.
    profile = createProfile();
    world = createWorld(profile);
    world.state = GAME_STATE.TITLE;
    clearPendingPress();
  }
}

function resumeShift() {
  world.state = GAME_STATE.PLAYING;
  clearPendingPress();
}

function goToMenu(state) {
  world.state = state;
  world.menuIndex = 0;
  clearPendingPress();
}

function updateTitle() {
  const { chosen } = runMenu(TITLE_MENU.length, TITLE_MENU_TOP_Y);
  if (chosen < 0) return;

  if (chosen === 0) {
    startFreshCareer();
  } else if (chosen === 1) {
    goToMenu(GAME_STATE.INSTRUCTIONS);
  } else {
    world.optionsCameFrom = GAME_STATE.TITLE;
    goToMenu(GAME_STATE.OPTIONS);
  }
}

function updateInstructions() {
  const { chosen, wentBack } = runMenu(1, -999);
  if (chosen >= 0 || wentBack || consumeAnyPress()) {
    goToMenu(GAME_STATE.TITLE);
  }
}

// -----------------------------------------------------------------------------
// DEVELOPER PANEL
// -----------------------------------------------------------------------------

function updateDevPanel() {
  const rows = getDevRows(world, profile);

  // ` closes it again, same key that opened it.
  if (consumeDevPanel()) {
    closeDevPanel();
    return;
  }

  let command = DEV_COMMAND.NONE;

  for (const action of consumeMenuActions()) {
    if (action === 'menuUp') world.menuIndex = moveSelection(world.menuIndex, -1, rows.length);
    if (action === 'menuDown') world.menuIndex = moveSelection(world.menuIndex, 1, rows.length);
    if (action === 'back') { closeDevPanel(); return; }

    if (action === 'menuLeft' || action === 'menuRight') {
      const result = applyDevAction(world, profile, rows[world.menuIndex].id, action === 'menuRight' ? 1 : -1);
      if (result) command = result;
    }
  }

  const clicked = findDevRowAt(getMousePosition(), rows.length, consumeClick());
  if (clicked >= 0) world.menuIndex = clicked;

  // Enter, or a click, confirms the highlighted row. Direction 0 means
  // "do the thing" rather than "nudge it up or down".
  if (consumeConfirm() || clicked >= 0) {
    const result = applyDevAction(world, profile, rows[world.menuIndex].id, 0);
    if (result) command = result;
  }

  if (command === DEV_COMMAND.CLOSE) {
    closeDevPanel();
    return;
  }

  // Upgrades and crew are baked into the world when a night is built, so
  // changing them has to rebuild it. The panel stays open, and the night
  // restarts from the top.
  if (command === DEV_COMMAND.REBUILD_NIGHT) {
    const keepIndex = world.menuIndex;
    const keepSpawnIndex = world.devSpawnIndex;
    world = createWorld(profile);
    world.state = GAME_STATE.DEV_PANEL;
    world.menuIndex = keepIndex;
    world.devSpawnIndex = keepSpawnIndex;
  }
}

function closeDevPanel() {
  world.state = GAME_STATE.PLAYING;
  clearPendingPress();
}

function findDevRowAt(point, rowCount, click) {
  const target = click || point;

  for (let index = 0; index < rowCount; index++) {
    const box = getDevRowBox(index);

    const inside =
      target.x >= box.x - 2 &&
      target.x <= box.x + box.width + 2 &&
      target.y >= box.y - 1 &&
      target.y <= box.y + box.height;

    if (inside) return click ? index : -1;
  }

  return -1;
}

const OPTION_ROW_DIFFICULTY = 0;
const OPTION_ROW_VOLUME = 1;
const OPTION_ROW_HEALTH_BARS = 2;
const OPTION_ROW_DEV_MODE = 3;
const OPTION_ROW_BACK = 4;

function updateOptions() {
  const items = getOptionsMenuItems();

  // Left/right changes the row you're sitting on, without leaving it.
  const { chosen, wentBack } = runMenu(items.length, OPTIONS_MENU_TOP_Y, (direction) =>
    changeOption(world.menuIndex, direction),
  );

  if (wentBack) {
    leaveOptions();
    return;
  }

  // Picking a row (Enter or a click) does the same thing as nudging it right.
  if (chosen < 0) return;

  if (chosen === OPTION_ROW_BACK) {
    leaveOptions();
    return;
  }

  changeOption(chosen, 1);
}

// Back to whichever screen opened the options — the title, or the shift you
// paused. Without this, tweaking a setting mid-shift would dump you out of
// your run.
function leaveOptions() {
  if (world.optionsCameFrom === GAME_STATE.PAUSED) {
    world.state = GAME_STATE.PAUSED;
    world.menuIndex = 0;
    clearPendingPress();
    return;
  }

  goToMenu(GAME_STATE.TITLE);
}

function changeOption(rowIndex, direction) {
  if (rowIndex === OPTION_ROW_DIFFICULTY) {
    cycleDifficulty(direction);
  } else if (rowIndex === OPTION_ROW_VOLUME) {
    setVolume(settings.volume + direction * 0.1);
    playMenuConfirm();
  } else if (rowIndex === OPTION_ROW_HEALTH_BARS) {
    settings.showScalperHealth = !settings.showScalperHealth;
  } else if (rowIndex === OPTION_ROW_DEV_MODE) {
    settings.devMode = !settings.devMode;
  }
}

function updatePlaying(deltaSeconds) {
  // ` opens the developer panel, but only if you turned it on yourself.
  if (consumeDevPanel() && settings.devMode) {
    world.state = GAME_STATE.DEV_PANEL;
    world.menuIndex = 0;
    clearPendingPress();
    return;
  }

  // ESC pauses. Checked before anything else moves, so the frame you pause on
  // is the frame you come back to.
  if (consumeMenuActions().includes('back')) {
    pauseShift();
    return;
  }

  handleWeaponControls();

  updateNight(world, deltaSeconds);

  updateGuard(world.guard, world, deltaSeconds);
  updateHires(world, deltaSeconds);
  updateTech(world, deltaSeconds);
  retireBossIfDown(world);
  updateScalpers(world, deltaSeconds);
  updateBullets(world, deltaSeconds);
  updateGrenades(world, deltaSeconds);
  updateMachine(world, deltaSeconds);
  updateJuice(world, deltaSeconds);

  // The night can end inside updateNight or updateMachine. If it just did,
  // swallow whatever was being pressed at that moment, so the shot that lost
  // you the night doesn't immediately skip the screen you just earned.
  if (world.state !== GAME_STATE.PLAYING) {
    clearPendingPress();
  }
}

// Shared by both endings. The world is frozen — nothing moves, nothing spawns.
// All that ticks is the short delay before continuing is allowed.
function updateBetweenNights(deltaSeconds) {
  world.gameOverCountdown -= deltaSeconds;

  if (world.gameOverCountdown > 0) {
    clearPendingPress();
    return;
  }

  if (!consumeAnyPress()) return;

  if (world.state === GAME_STATE.NIGHT_SURVIVED) {
    collectPayAndOpenShop();
  } else {
    startFreshCareer();
  }
}

// Sunrise: bank the wages, remember how battered the wall is, and open the
// shop. The day only ticks over once you clock on again.
function collectPayAndOpenShop() {
  profile.cash += world.payslip.total;

  // A crew you can't pay doesn't stay. Rather than letting you run a negative
  // balance, the most recent hire walks — which is exactly the pressure that
  // makes staffing up a real decision rather than a free upgrade.
  if (profile.cash < 0) {
    profile.cash = 0;
    if (profile.hiredGuards > 0) {
      profile.hiredGuards -= 1;
      world.someoneQuit = true;
    }
  }

  profile.totalScalpersStopped += world.finalStats.scalpersStopped;
  profile.nightsSurvived += 1;

  // Carry the damage. This is what gives 'repair' its bite.
  profile.barricadeHealth = world.barricade.health;
  profile.day += 1;

  world.state = GAME_STATE.SHOP;
  world.hoveredShopRow = -1;
  clearPendingPress();
}

function startFreshCareer() {
  profile = createProfile();
  world = createWorld(profile);
  clearPendingPress();
  playNightStart();
}

// -----------------------------------------------------------------------------
// THE SHOP
// Nothing in the world moves here; it's all reading clicks and keys.
// -----------------------------------------------------------------------------

function updateShop() {
  const rows = getShopRows(profile);

  trackHoveredRow(rows);

  // Number keys.
  for (const digit of consumeDigits()) {
    const row = rows[digit - 1];
    if (row) reportPurchase(buyUpgrade(profile, row.id));
  }

  // Clicks on a row.
  const click = consumeClick();
  if (click) {
    const index = findRowAt(click, rows.length);
    if (index >= 0) reportPurchase(buyUpgrade(profile, rows[index].id));
  }

  if (consumeConfirm()) {
    clearPendingPress();
    playNightStart();
    world = createWorld(profile);
  }
}

// A chime when money changes hands, a buzz when it can't.
function reportPurchase(succeeded) {
  if (succeeded) playPurchase();
  else playDenied();
}

function trackHoveredRow(rows) {
  world.hoveredShopRow = findRowAt(getMousePosition(), rows.length);
}

function findRowAt(point, rowCount) {
  for (let index = 0; index < rowCount; index++) {
    const box = getShopRowBox(index);

    const inside =
      point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;

    if (inside) return index;
  }

  return -1;
}

// -----------------------------------------------------------------------------
// THE GAME LOOP
// requestAnimationFrame asks the browser to call us again just before it next
// repaints the screen. We call it again at the end of every frame, which is
// what makes the loop go round forever.
// -----------------------------------------------------------------------------
let lastFrameTime = performance.now();

function gameLoop(now) {
  // How much real time passed since the last frame, in seconds. Everything that
  // moves will be multiplied by this, so the game runs at the same speed
  // whether your screen is 60Hz or 144Hz.
  const rawDelta = (now - lastFrameTime) / 1000;
  const deltaSeconds = Math.min(rawDelta, CONFIG.loop.maxDeltaSeconds);
  lastFrameTime = now;

  update(deltaSeconds);
  drawScene(ctx, world, framesPerSecond);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
