// =============================================================================
// scalper-art.js — what each kind of scalper looks like.
//
// THE RULE that shapes everything here: at this size a SILHOUETTE reads across
// a busy room long before a colour does. So every type gets its own outline —
// a bulk, a lean, a shield, a hunch — and its own prop held out in front.
// That's how Plants vs Zombies tells a cone-head from a bucket-head at a
// glance, and it's why you'll know what's coming before you can see its face.
//
// They're people, not zombies. Hoodies, phones, tote bags, cardboard signs.
// The threat is that they're going to BUY something.
//
// Everything is drawn in an 18x36 sprite space and scaled to the scalper's
// real size, so one drawing serves all four types at four different scales.
//
// They face LEFT, because that's the way they're heading.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawFootShadow, drawHealthBar } from '../pixel.js';
import { SCALPER_STATE, getScalperType } from './scalper.js';
import { settings } from '../settings.js';

const SPRITE_WIDTH = 18;
const SPRITE_HEIGHT = 36;

function getPalette(typeId) {
  const c = CONFIG.colors;

  switch (typeId) {
    case 'bulkbuyer':
      return { top: c.bruteHoodie, topDark: c.bruteHoodieDark, trim: c.bruteTrim };
    case 'runner':
      return { top: c.runnerHoodie, topDark: c.runnerHoodieDark, trim: c.runnerTrim };
    case 'armored':
      return { top: c.armorPlateDark, topDark: c.armorPlateDark, trim: c.armorPlate };
    default:
      return { top: c.scalperHoodie, topDark: c.scalperHoodieDark, trim: c.scalperBackpack };
  }
}

export function drawScalper(ctx, scalper) {
  const type = getScalperType(scalper.typeId);
  const palette = getPalette(scalper.typeId);
  const scale = (scalper.width || SPRITE_WIDTH) / SPRITE_WIDTH;

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

  // A hit flashes the whole figure white — the clearest possible answer to
  // "did that connect?".
  const flashing = scalper.hitFlash > 0;
  const paint = (color) => (flashing ? '#ffffff' : color);

  const stepping = Math.floor(scalper.walkCycle) % 2 === 0;

  drawFootShadow(ctx, scalper.x, scalper.y, Math.round(14 * scale));

  switch (scalper.typeId) {
    case 'bulkbuyer': drawBulkBuyer(put, paint, palette, scalper, stepping); break;
    case 'runner': drawLineRunner(put, paint, palette, scalper, stepping); break;
    case 'armored': drawRiotBuyer(put, paint, palette, scalper, stepping); break;
    default: drawShopper(put, paint, palette, scalper, stepping); break;
  }

  drawScalperHealthBar(ctx, scalper);
}

// -----------------------------------------------------------------------------
// SHARED PARTS
// -----------------------------------------------------------------------------

function legs(put, paint, stepping, hipY, width, spread) {
  const c = CONFIG.colors;
  const shift = stepping ? 0 : spread;

  put(4 - shift, hipY, width, 9, paint(c.scalperDenim));
  put(9 + shift, hipY, width, 9, paint(c.scalperDenimDark));
  put(3 - shift, hipY + 9, width + 2, 3, paint(c.scalperShoe));
  put(9 + shift, hipY + 9, width + 2, 3, paint(c.scalperShoe));
}

// The arm that reaches for your barricade. It swings on the beat when they're
// attacking, which sells "tearing at it" without any new artwork.
function reachingArm(put, paint, color, y, stepping, attacking) {
  const swing = attacking && stepping ? 3 : 0;
  put(-swing, y, 5, 4, paint(color));
  put(-2 - swing, y, 3, 4, paint(CONFIG.colors.scalperSkin));
  return -4 - swing;
}

function isAttacking(scalper) {
  return scalper.state === SCALPER_STATE.ATTACKING_BARRICADE;
}

// -----------------------------------------------------------------------------
// THE BASELINE SCALPER
// Lean, hoodie up, phone out. The one you see most of.
// -----------------------------------------------------------------------------

function drawShopper(put, paint, palette, scalper, stepping) {
  const c = CONFIG.colors;

  legs(put, paint, stepping, 22, 5, 1);

  // Tote bag slung on the back, already full.
  put(13, 14, 5, 10, paint(palette.trim));
  put(13, 17, 5, 1, paint(palette.topDark));

  // Hoodie.
  put(3, 12, 12, 12, paint(palette.top));
  put(3, 12, 12, 2, paint(palette.topDark));
  put(4, 18, 6, 4, paint(palette.topDark));

  // Head, with the hood up behind it.
  put(4, 4, 8, 8, paint(c.scalperSkin));
  put(3, 2, 10, 4, paint(palette.topDark));
  put(1, 5, 3, 3, paint(palette.topDark));

  const handX = reachingArm(put, paint, palette.top, 15, stepping, isAttacking(scalper));

  // Phone, screen toward you, already scanning for stock.
  put(handX, 13, 3, 6, paint(c.scalperPhone));
  put(handX, 14, 2, 3, paint(c.phoneGlow));

}

// -----------------------------------------------------------------------------
// BULK BUYER
// Wide, heavy, stooped under a loaded trolley. Slowest thing on the floor and
// the widest silhouette by a mile.
// -----------------------------------------------------------------------------

function drawBulkBuyer(put, paint, palette, scalper, stepping) {
  const c = CONFIG.colors;

  legs(put, paint, stepping, 24, 6, 1);

  // Huge torso, filling nearly the whole sprite. This is the read: BULK.
  put(1, 11, 16, 14, paint(palette.top));
  put(1, 11, 16, 3, paint(palette.topDark));
  put(2, 20, 9, 4, paint(palette.topDark));

  // High-vis stripe across the belly. A big bright band on a big body.
  put(1, 17, 16, 2, paint(palette.trim));

  // Small head on big shoulders, which exaggerates the bulk.
  put(6, 4, 7, 8, paint(c.scalperSkin));
  put(5, 2, 9, 3, paint(palette.topDark));
  put(4, 4, 2, 2, paint(palette.topDark));

  // Shopping trolley shoved out in front, piled high.
  const attacking = isAttacking(scalper);
  const shove = attacking && stepping ? 2 : 0;

  put(-7 - shove, 18, 8, 8, paint(c.trolleyMetal));
  put(-7 - shove, 20, 8, 1, paint(c.scalperDenimDark));
  put(-7 - shove, 23, 8, 1, paint(c.scalperDenimDark));
  put(-6 - shove, 26, 2, 2, paint(c.scalperDenimDark));
  put(-2 - shove, 26, 2, 2, paint(c.scalperDenimDark));

  // The haul stacked above the basket.
  put(-6 - shove, 14, 3, 4, paint(c.packColors[0]));
  put(-3 - shove, 13, 3, 5, paint(c.packColors[4]));

  // Arm gripping the handle.
  put(-1 - shove, 16, 3, 3, paint(palette.top));

}

// -----------------------------------------------------------------------------
// LINE RUNNER
// Small, forward-leaning, mid-sprint. Reads as motion even standing still.
// -----------------------------------------------------------------------------

function drawLineRunner(put, paint, palette, scalper, stepping) {
  const c = CONFIG.colors;

  // Sprinting legs: one thrown forward, one trailing far back.
  put(stepping ? 2 : 6, 24, 4, 8, paint(c.scalperDenim));
  put(stepping ? 10 : 7, 26, 4, 6, paint(c.scalperDenimDark));
  put(stepping ? 1 : 5, 31, 5, 3, paint(c.scalperShoe));
  put(stepping ? 10 : 7, 31, 5, 3, paint(c.scalperShoe));

  // Narrow torso, LEANING FORWARD — the whole silhouette tips left.
  put(4, 14, 9, 11, paint(palette.top));
  put(3, 14, 10, 2, paint(palette.topDark));

  // Runner's number bib. Small bright square, unmistakable.
  put(5, 18, 5, 4, paint(palette.trim));

  // Head thrust forward ahead of the body.
  put(2, 6, 7, 8, paint(c.scalperSkin));

  // Backwards cap — the brim points the WRONG way, which is the tell.
  put(2, 4, 8, 3, paint(palette.topDark));
  put(9, 5, 3, 2, paint(palette.topDark));

  // Both arms pumping.
  const attacking = isAttacking(scalper);
  const swing = attacking && stepping ? 2 : 0;
  put(-2 - swing, 15, 5, 3, paint(palette.top));
  put(-4 - swing, 15, 2, 3, paint(c.scalperSkin));
  put(12, 17, 4, 3, paint(palette.top));

}

// -----------------------------------------------------------------------------
// RIOT BUYER
// Plated from the neck down, behind a shield. Bare head on purpose: it is the
// one soft thing on it, and you can see that from across the room.
// -----------------------------------------------------------------------------

function drawRiotBuyer(put, paint, palette, scalper, stepping) {
  const c = CONFIG.colors;

  legs(put, paint, stepping, 23, 5, 1);

  // Plated torso.
  put(3, 12, 12, 12, paint(c.armorPlateDark));
  put(4, 13, 10, 4, paint(c.armorPlate));
  put(4, 18, 10, 3, paint(c.armorPlate));

  // BARE HEAD. Everything below the neck is armour, so an uncovered head is
  // the obvious weak point without a word of explanation.
  put(5, 3, 8, 9, paint(c.scalperSkin));
  put(5, 2, 8, 2, paint(c.armorPlateDark));
  put(4, 6, 3, 2, paint(c.armorVisor));

  // Riot shield held out front — tall, flat, and the thing your bullets are
  // bouncing off.
  const attacking = isAttacking(scalper);
  const shove = attacking && stepping ? 2 : 0;

  put(-5 - shove, 9, 5, 20, paint(c.armorPlate));
  put(-5 - shove, 9, 5, 2, paint(c.armorPlateDark));
  put(-5 - shove, 27, 5, 2, paint(c.armorPlateDark));
  put(-3 - shove, 16, 2, 6, paint(c.armorPlateDark));

  // Arm behind the shield.
  put(-1 - shove, 16, 4, 4, paint(c.armorPlateDark));

}

// -----------------------------------------------------------------------------

// Health bars are drawn outside the sprite space, because they shouldn't
// scale with the body — a Bulk Buyer's bar being 50% longer than everyone
// else's would read as "more health remaining", not "bigger character".
export function drawScalperHealthBar(ctx, scalper) {
  if (!settings.showScalperHealth) return;

  const barWidth = 16;
  const barHeight = 2;
  const x = Math.round(scalper.x - barWidth / 2);
  const y = Math.round(scalper.y - scalper.height) - 5;

  drawHealthBar(ctx, x, y, barWidth, barHeight, scalper.health / scalper.maxHealth);
}
