// =============================================================================
// scalper-art.js — what each kind of scalper looks like.
//
// One drawing, four looks. The shapes are identical; what changes is the size
// it's drawn at, the colours, and a couple of extra bits on top. That's what
// keeps four enemy types from being four piles of artwork to maintain.
//
// Everything here is drawn in a 13x26 "sprite space" and then scaled to the
// scalper's real size, so a Bulk Buyer at 1.5x uses the exact same picture as
// a Line Runner at 0.78x.
//
// They face LEFT, because that's the way they're heading.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawFootShadow, drawHealthBar } from '../pixel.js';
import { SCALPER_STATE, getScalperType } from './scalper.js';
import { settings } from '../settings.js';

const SPRITE_WIDTH = 13;
const SPRITE_HEIGHT = 26;

// Colours for each type, so you can tell what's coming across the room.
function getPalette(typeId) {
  const c = CONFIG.colors;

  switch (typeId) {
    case 'bulkbuyer':
      return { hoodie: c.bruteHoodie, hoodieDark: c.bruteHoodieDark, pack: c.bruteBackpack };
    case 'runner':
      return { hoodie: c.runnerHoodie, hoodieDark: c.runnerHoodieDark, pack: c.runnerBackpack };
    case 'armored':
      return { hoodie: c.armorPlateDark, hoodieDark: c.armorPlateDark, pack: c.armorPlate };
    default:
      return { hoodie: c.scalperHoodie, hoodieDark: c.scalperHoodieDark, pack: c.scalperBackpack };
  }
}

export function drawScalper(ctx, scalper) {
  const c = CONFIG.colors;
  const type = getScalperType(scalper.typeId);
  const palette = getPalette(scalper.typeId);
  const scale = scalper.sizeScale || 1;

  const left = Math.round(scalper.x - scalper.width / 2);
  const top = Math.round(scalper.y - scalper.height);

  // Draws one rectangle from sprite space into the scalper's real size.
  // Rounding every edge is what keeps the pixels square at any scale.
  const put = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      left + Math.round(x * scale),
      top + Math.round(y * scale),
      Math.max(1, Math.round(w * scale)),
      Math.max(1, Math.round(h * scale)),
    );
  };

  // A hit flashes the whole figure white, which is the clearest possible
  // answer to "did that connect?".
  const flashing = scalper.hitFlash > 0;
  const paint = (color) => (flashing ? '#ffffff' : color);

  const isStepping = Math.floor(scalper.walkCycle) % 2 === 0;

  drawFootShadow(ctx, scalper.x, scalper.y, Math.round(12 * scale));

  drawLegs(put, paint, isStepping);
  drawBackpack(put, paint, palette);
  drawBody(put, paint, palette);
  drawHead(put, paint, palette, scalper, type);
  drawArm(put, paint, palette, scalper, isStepping);

  if (settings.showScalperHealth) {
    drawScalperHealthBar(ctx, scalper, top, scale);
  }
}

function drawLegs(put, paint, isStepping) {
  const c = CONFIG.colors;

  if (isStepping) {
    put(2, 18, 3, 5, paint(c.scalperPants));
    put(7, 18, 3, 5, paint(c.scalperPants));
    put(1, 23, 4, 3, paint(c.scalperShoe));
    put(7, 23, 4, 3, paint(c.scalperShoe));
  } else {
    put(4, 18, 3, 5, paint(c.scalperPants));
    put(8, 18, 3, 5, paint(c.scalperPants));
    put(3, 23, 4, 3, paint(c.scalperShoe));
    put(8, 23, 4, 3, paint(c.scalperShoe));
  }
}

// Worn on the back, which is the RIGHT of the sprite since they face left.
function drawBackpack(put, paint, palette) {
  put(9, 9, 4, 8, paint(palette.pack));
  put(9, 12, 4, 1, paint(palette.hoodieDark));
}

function drawBody(put, paint, palette) {
  put(2, 9, 9, 9, paint(palette.hoodie));
  put(3, 14, 5, 3, paint(palette.hoodieDark));
}

function drawHead(put, paint, palette, scalper, type) {
  const c = CONFIG.colors;

  // A riot plate covers the chest and shoulder. It's deliberately obvious —
  // it's the thing telling you to aim high.
  if (type.armored) {
    put(1, 9, 7, 8, paint(c.armorPlate));
    put(1, 9, 7, 1, paint(c.armorPlateDark));
    put(1, 13, 7, 1, paint(c.armorPlateDark));
  }

  put(3, 2, 6, 7, paint(c.scalperSkin));

  // Armoured ones go BARE-HEADED on purpose. Everything below the neck is
  // plated grey, so an uncovered head is the one soft thing on them — and
  // you can see that from across the room without being told.
  if (type.armored) {
    put(2, 4, 2, 2, paint(c.armorVisor));
    put(3, 1, 6, 1, paint(c.armorPlateDark));
    return;
  }

  // Everyone else wears a cap, brim pointing left — the clearest signal of
  // which way they're going.
  put(3, 0, 7, 3, paint(palette.hoodieDark));
  put(0, 2, 3, 1, paint(palette.hoodieDark));
}

// The forward arm, holding a phone. When they're on the barricade it swings,
// which sells "tearing at it" without needing new artwork.
function drawArm(put, paint, palette, scalper, isStepping) {
  const c = CONFIG.colors;
  const isAttacking = scalper.state === SCALPER_STATE.ATTACKING_BARRICADE;
  const swing = isAttacking && isStepping ? 2 : 0;

  put(0 - swing, 11, 4, 3, paint(palette.hoodie));
  put(-2 - swing, 11, 2, 3, paint(c.scalperSkin));
  put(-4 - swing, 10, 2, 4, paint(c.scalperPhone));
}

// A small health bar over the head. Switchable from the options screen.
function drawScalperHealthBar(ctx, scalper, top, scale) {
  const barWidth = Math.max(10, Math.round(14 * scale));
  const barHeight = 2;

  const x = Math.round(scalper.x - barWidth / 2);
  const y = top - 5;
  const fraction = scalper.health / scalper.maxHealth;

  drawHealthBar(ctx, x, y, barWidth, barHeight, fraction);
}
