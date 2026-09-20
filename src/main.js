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
import { updateScalpers } from './entities/scalper.js';
import { updateMachine } from './entities/machine.js';
import { createWorld, GAME_STATE } from './world.js';
import { updateNight } from './night.js';
import { createProfile, getShopRows, buyUpgrade } from './shop.js';
import { getShopRowBox } from './render.js';
import {
  attachMouseTo,
  consumeAnyPress,
  clearPendingPress,
  consumeClick,
  consumeDigits,
  getMousePosition,
  consumeConfirm,
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

  if (world.state === GAME_STATE.SHOP) {
    updateShop();
    return;
  }

  updateBetweenNights(deltaSeconds);
}

function updatePlaying(deltaSeconds) {
  updateNight(world, deltaSeconds);

  updateGuard(world.guard, world, deltaSeconds);
  updateScalpers(world, deltaSeconds);
  updateBullets(world, deltaSeconds);
  updateMachine(world, deltaSeconds);

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
    if (row) buyUpgrade(profile, row.id);
  }

  // Clicks on a row.
  const click = consumeClick();
  if (click) {
    const index = findRowAt(click, rows.length);
    if (index >= 0) buyUpgrade(profile, rows[index].id);
  }

  if (consumeConfirm()) {
    clearPendingPress();
    world = createWorld(profile);
  }
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
