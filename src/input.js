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
