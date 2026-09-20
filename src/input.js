// =============================================================================
// input.js — remembers which keys are currently held down.
//
// THE BIG IDEA: a game never asks "was a key just pressed?" It asks "is this key
// being held right now?", every single frame. That's what makes holding W walk
// you smoothly across the room instead of taking one step per press.
//
// So this file's whole job is to keep an up-to-date list of held keys, and let
// the rest of the game ask questions about it.
// =============================================================================

import { CONFIG } from './config.js';

// Each action lists every key that triggers it, so WASD and the arrow keys both
// work without the rest of the game needing to care which one you used.
const KEY_BINDINGS = {
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
};

// Every key currently being held down, by its physical position on the keyboard.
const heldKeys = new Set();

// Keys whose normal browser behaviour we need to cancel — otherwise the arrow
// keys scroll the page underneath the game while you're trying to walk.
const KEYS_TO_SWALLOW = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
]);

window.addEventListener('keydown', (event) => {
  if (KEYS_TO_SWALLOW.has(event.code)) {
    event.preventDefault();
  }
  heldKeys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  heldKeys.delete(event.code);
});

// If you tab away or click another window mid-stride, the browser never sends
// the matching "key released" event. Without this, the guard would keep walking
// forever the moment you came back. Clearing everything on blur fixes it.
window.addEventListener('blur', () => {
  heldKeys.clear();
});

// Ask whether an action is being held right now, e.g. isHeld('moveLeft').
export function isHeld(action) {
  const keys = KEY_BINDINGS[action];
  if (!keys) return false;

  return keys.some((key) => heldKeys.has(key));
}

// Returns which way you're being told to go, as two numbers from -1 to 1.
// (-1, 0) is "left". (1, -1) is "up and to the right". (0, 0) is "stand still".
export function getMoveDirection() {
  let x = 0;
  let y = 0;

  if (isHeld('moveLeft')) x -= 1;
  if (isHeld('moveRight')) x += 1;
  if (isHeld('moveUp')) y -= 1;
  if (isHeld('moveDown')) y += 1;

  return { x, y };
}

// =============================================================================
// MOUSE
//
// The tricky part: the browser tells us where the mouse is in SCREEN pixels,
// but the game thinks in its own tiny 384x216 pixels. Since the canvas is blown
// up to fill your window, those two numbers are wildly different — so every
// mouse position has to be converted before the game can use it.
// =============================================================================

const mouse = {
  // Where the mouse is, in the game's own coordinates.
  x: CONFIG.screen.width / 2,
  y: CONFIG.screen.height / 2,
  isDown: false,
};

export function attachMouseTo(canvas) {
  canvas.addEventListener('mousemove', (event) => {
    updateMousePosition(canvas, event);
  });

  canvas.addEventListener('mousedown', (event) => {
    updateMousePosition(canvas, event);
    mouse.isDown = true;
    event.preventDefault();
  });

  // Listening for the release on the whole window, not just the canvas, means
  // letting go of the button outside the game still counts as letting go.
  // Otherwise the gun would keep firing forever.
  window.addEventListener('mouseup', () => {
    mouse.isDown = false;
  });

  window.addEventListener('blur', () => {
    mouse.isDown = false;
  });

  // Stop the right-click menu appearing over the game.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

function updateMousePosition(canvas, event) {
  // How big the canvas currently is on your actual screen.
  const bounds = canvas.getBoundingClientRect();

  // Where the mouse is inside that box, as a fraction from 0 to 1...
  const fractionAcross = (event.clientX - bounds.left) / bounds.width;
  const fractionDown = (event.clientY - bounds.top) / bounds.height;

  // ...then scaled into the game's own coordinates. Working in fractions like
  // this means it stays correct at any window size or zoom level, for free.
  mouse.x = fractionAcross * CONFIG.screen.width;
  mouse.y = fractionDown * CONFIG.screen.height;
}

export function getMousePosition() {
  return mouse;
}

export function isFireHeld() {
  return mouse.isDown;
}
