// =============================================================================
// weapon-icons.js — little pictures of each gun for the slot bar.
//
// Drawn the same way as the font: the picture IS the source. Each character
// is one pixel, and the letter says which colour it is. You can redraw a gun
// by editing its picture here, without touching any drawing code.
//
//   .  nothing (see-through)
//   M  metal
//   L  metal highlight
//   D  metal shadow
//   W  wood / grip
//   G  grenade green
//   Y  brass / pin
// =============================================================================

import { CONFIG } from './config.js';

const ICON_WIDTH = 14;
const ICON_HEIGHT = 9;

const ICONS = {
  pistol: [
    '..............',
    '......LLLLL...',
    '.....MMMMMM...',
    '.....MMDD.....',
    '....WWM.......',
    '....WWW.......',
    '.....WW.......',
    '..............',
    '..............',
  ],

  shotgun: [
    '..............',
    '..LLLLLLLLLL..',
    '..MMMMMMMMMM..',
    '.MMMMMMMMMM...',
    '..DD..MM......',
    '.WWW..........',
    'WWW...........',
    '..............',
    '..............',
  ],

  uzi: [
    '..............',
    '....LLLLLLL...',
    '...MMMMMMMMM..',
    '...MMMDDDD....',
    '...WWM........',
    '...WWM........',
    '...MMM........',
    '...MMM........',
    '....M.........',
  ],

  grenades: [
    '......YY......',
    '.....YYYY.....',
    '....GGGGGG....',
    '...GGGLGGGG...',
    '...GGGGGGGG...',
    '....GGGGGG....',
    '.....GGGG.....',
    '..............',
    '..............',
  ],
};

function getPaletteColor(key) {
  const c = CONFIG.colors;

  switch (key) {
    case 'M': return c.iconMetal;
    case 'L': return c.iconMetalLight;
    case 'D': return c.iconMetalDark;
    case 'W': return c.iconGrip;
    case 'G': return c.grenadeBody;
    case 'Y': return c.iconBrass;
    default: return null;
  }
}

export function getIconSize() {
  return { width: ICON_WIDTH, height: ICON_HEIGHT };
}

// Draw a weapon icon with its top-left corner at (x, y).
//
// `tint` overrides every colour, which is how a locked slot draws the same
// picture as a flat silhouette.
export function drawWeaponIcon(ctx, weaponId, x, y, tint = null) {
  const icon = ICONS[weaponId];
  if (!icon) return;

  for (let row = 0; row < ICON_HEIGHT; row++) {
    const pixels = icon[row];

    for (let col = 0; col < ICON_WIDTH; col++) {
      const color = tint || getPaletteColor(pixels[col]);
      if (!color || pixels[col] === '.') continue;

      ctx.fillStyle = color;
      ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}
