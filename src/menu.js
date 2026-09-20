// =============================================================================
// menu.js — one menu, used by every screen that has one.
//
// A menu is a list of rows you can move through with the keyboard or point at
// with the mouse. Writing that once means the title screen, the options screen
// and anything added later all behave identically, and fixing a quirk fixes it
// everywhere at once.
// =============================================================================

import { CONFIG } from './config.js';
import { drawText } from './font.js';

const ROW_HEIGHT = 16;

// Where a menu row sits on screen. Both the drawing and the mouse handling
// call this, so a row can never be drawn somewhere you can't click it.
export function getMenuRowBox(index, topY) {
  return {
    x: 86,
    y: topY + index * ROW_HEIGHT,
    width: CONFIG.screen.width - 172,
    height: ROW_HEIGHT - 3,
  };
}

// Which row the mouse is over, or -1.
export function findMenuRowAt(point, rowCount, topY) {
  for (let index = 0; index < rowCount; index++) {
    const box = getMenuRowBox(index, topY);

    const inside =
      point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;

    if (inside) return index;
  }

  return -1;
}

// Each item is { label, value }. `value` is optional and drawn on the right,
// which is what turns the same menu into a settings list.
export function drawMenu(ctx, items, topY, selectedIndex) {
  const c = CONFIG.colors;

  items.forEach((item, index) => {
    const box = getMenuRowBox(index, topY);
    const isSelected = index === selectedIndex;

    if (isSelected) {
      drawText(ctx, '>', box.x - 10, box.y + 3, { color: c.menuPointer });
    }

    drawText(ctx, item.label, box.x, box.y + 3, {
      color: isSelected ? c.menuItemSelected : c.menuItem,
    });

    if (item.value !== undefined) {
      drawText(ctx, item.value, box.x + box.width, box.y + 3, {
        color: isSelected ? c.menuItemSelected : c.menuItem,
        align: 'right',
      });
    }
  });
}

// Move the highlight, wrapping top to bottom. The double modulo keeps a
// backwards step from the first row landing on a negative index.
export function moveSelection(current, delta, count) {
  return ((current + delta) % count + count) % count;
}
