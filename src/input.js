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
import { wakeAudio } from './audio.js';

// Each action lists every key that triggers it, so WASD and the arrow keys both
// work without the rest of the game needing to care which one you used.
const KEY_BINDINGS = {
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],

  // Menu confirm.
  confirm: ['Enter', 'NumpadEnter', 'Space'],

  // Menu navigation. Kept separate from movement so a menu can't be driven
  // by the same held key that's walking the guard around.
  menuUp: ['ArrowUp', 'KeyW'],
  menuDown: ['ArrowDown', 'KeyS'],
  menuLeft: ['ArrowLeft', 'KeyA'],
  menuRight: ['ArrowRight', 'KeyD'],
  back: ['Escape'],

  // Manual reload. You rarely need it, because running dry reloads for you,
  // but topping up during a lull is the mark of someone who's paying attention.
  reload: ['KeyR'],

  // Opens the developer panel, when developer mode is switched on. F1 is what
  // the game tells you to press; backtick also works for anyone used to it.
  devPanel: ['Backquote', 'F1'],
};

// Every key currently being held down, by its physical position on the keyboard.
const heldKeys = new Set();

// Set by any keypress or click. Read (and cleared) by consumeAnyPress below,
// which is what "press any key to continue" screens use.
let anyPressSinceLastCheck = false;

// Where the most recent unhandled click landed, in game coordinates, or null.
// Menus need "was there a click, and where?" rather than "is the button down?".
let pendingClick = null;

// Digit keys pressed since the last check, for menu shortcuts.
const pendingDigits = [];

// Menu keypresses waiting to be handled, oldest first.
const MENU_ACTIONS = ['menuUp', 'menuDown', 'menuLeft', 'menuRight', 'back'];
const pendingMenuActions = [];

// Reload presses since the last check.
let reloadPresses = 0;

// Developer panel key presses since the last check.
let devPanelPresses = 0;

// Confirm presses since the last check.
//
// Menus need the moment a key GOES DOWN, not whether it's still down. The key
// you pressed to leave one screen is very often still held when the next one
// appears, and "is it held" would have that single press skip both.
let confirmPresses = 0;

// Keys whose normal browser behaviour we need to cancel — otherwise the arrow
// keys scroll the page underneath the game while you're trying to walk.
const KEYS_TO_SWALLOW = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
]);

window.addEventListener('keydown', (event) => {
  // Browsers won't make a sound until the player has actually interacted with
  // the page, so this is the earliest honest moment to start the audio.
  wakeAudio();

  if (KEYS_TO_SWALLOW.has(event.code)) {
    event.preventDefault();
  }
  heldKeys.add(event.code);
  anyPressSinceLastCheck = true;

  // Digit1..Digit9 -> 1..9
  if (event.code.startsWith('Digit')) {
    const digit = Number(event.code.slice(5));
    if (digit >= 1 && digit <= 9) pendingDigits.push(digit);
  }

  if (KEY_BINDINGS.confirm.includes(event.code)) {
    confirmPresses += 1;
  }

  if (KEY_BINDINGS.reload.includes(event.code)) {
    reloadPresses += 1;
  }

  if (KEY_BINDINGS.devPanel.includes(event.code)) {
    devPanelPresses += 1;
    event.preventDefault();
  }

  // Menus need the MOMENT a key goes down, so they're queued up here rather
  // than read from the held-keys set.
  for (const action of MENU_ACTIONS) {
    if (KEY_BINDINGS[action].includes(event.code)) {
      pendingMenuActions.push(action);
    }
  }
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
    wakeAudio();
    updateMousePosition(canvas, event);
    mouse.isDown = true;
    anyPressSinceLastCheck = true;
    pendingClick = { x: mouse.x, y: mouse.y };
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

// =============================================================================
// "PRESS ANY KEY"
//
// Menus want a different question from gameplay. Gameplay asks "is W held down
// right now?"; a game over screen asks "has anything been pressed since I last
// looked?". This answers the second one, and forgets the press once it's been
// read so a single tap can't trigger two different things.
// =============================================================================

export function consumeAnyPress() {
  const wasPressed = anyPressSinceLastCheck;
  anyPressSinceLastCheck = false;
  return wasPressed;
}

// Forget any press that happened while the game wasn't listening — otherwise
// a click from three seconds ago instantly skips the screen you just reached.
export function clearPendingPress() {
  anyPressSinceLastCheck = false;
  pendingClick = null;
  pendingDigits.length = 0;
  pendingMenuActions.length = 0;
  confirmPresses = 0;
  reloadPresses = 0;
  devPanelPresses = 0;
}

// True if the developer panel key was pressed. Reading it takes it.
export function consumeDevPanel() {
  const pressed = devPanelPresses > 0;
  devPanelPresses = 0;
  return pressed;
}

// Menu keypresses since last asked, oldest first. Reading them takes them.
export function consumeMenuActions() {
  const actions = pendingMenuActions.slice();
  pendingMenuActions.length = 0;
  return actions;
}

// True if confirm was pressed since last asked. Reading it takes it.
// True if reload was pressed since last asked. Reading it takes it.
export function consumeReload() {
  const pressed = reloadPresses > 0;
  reloadPresses = 0;
  return pressed;
}

export function consumeConfirm() {
  const pressed = confirmPresses > 0;
  confirmPresses = 0;
  return pressed;
}

// Where a fresh click landed, in game coordinates, or null if there wasn't
// one. Reading it takes it, so one click can't trigger two purchases.
export function consumeClick() {
  const click = pendingClick;
  pendingClick = null;
  return click;
}

// Digit keys pressed since last asked, oldest first.
export function consumeDigits() {
  const digits = pendingDigits.slice();
  pendingDigits.length = 0;
  return digits;
}
