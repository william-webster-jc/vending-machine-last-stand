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

  // Short, thick legs set wide — he's braced, not walking.
  const shift = stepping ? 0 : 1;
  put(3 - shift, 26, 6, 7, paint(c.scalperDenim));
  put(10 + shift, 26, 6, 7, paint(c.scalperDenimDark));
  put(2 - shift, 32, 8, 3, paint(c.scalperShoe));
  put(10 + shift, 32, 8, 3, paint(c.scalperShoe));

  // Torso wider than the sprite box and HUNCHED — it overhangs the legs,
  // which is what makes him read as heavy rather than merely tall.
  put(-1, 10, 20, 17, paint(palette.top));
  put(-1, 10, 20, 3, paint(palette.topDark));
  put(0, 22, 11, 5, paint(palette.topDark));

  // High-vis stripe across the belly. A big bright band on a big body.
  put(-1, 17, 20, 3, paint(palette.trim));

  // Tiny head sunk between the shoulders. The size difference between head
  // and body is doing most of the work here.
  put(7, 5, 6, 6, paint(c.scalperSkin));
  put(6, 3, 8, 3, paint(palette.topDark));
  put(5, 5, 2, 2, paint(palette.topDark));

  // Shopping trolley shoved out in front, piled high.
  const attacking = isAttacking(scalper);
  const shove = attacking && stepping ? 2 : 0;

  put(-11 - shove, 17, 11, 11, paint(c.trolleyMetal));
  put(-11 - shove, 20, 11, 1, paint(c.scalperDenimDark));
  put(-11 - shove, 24, 11, 1, paint(c.scalperDenimDark));
  put(-10 - shove, 28, 2, 3, paint(c.scalperDenimDark));
  put(-3 - shove, 28, 2, 3, paint(c.scalperDenimDark));

  // The haul, stacked well above the basket and piled higher than his head.
  put(-10 - shove, 11, 4, 6, paint(c.packColors[0]));
  put(-6 - shove, 8, 4, 9, paint(c.packColors[4]));
  put(-2 - shove, 12, 3, 5, paint(c.packColors[2]));

  // Arm gripping the handle.
  put(-2 - shove, 15, 4, 4, paint(palette.top));

}

// -----------------------------------------------------------------------------
// LINE RUNNER
// Small, forward-leaning, mid-sprint. Reads as motion even standing still.
// -----------------------------------------------------------------------------

function drawLineRunner(put, paint, palette, scalper, stepping) {
  const c = CONFIG.colors;

  // A full sprint stride: front leg thrown right out, back leg trailing
  // almost off the sprite. The gap between them IS the speed.
  put(stepping ? -1 : 4, 25, 5, 7, paint(c.scalperDenim));
  put(stepping ? 12 : 8, 27, 5, 6, paint(c.scalperDenimDark));
  put(stepping ? -2 : 3, 31, 6, 3, paint(c.scalperShoe));
  put(stepping ? 13 : 9, 32, 6, 3, paint(c.scalperShoe));

  // Torso raked hard forward — each band sits further left than the one
  // below it, so the whole body leans into the run.
  put(6, 20, 9, 6, paint(palette.top));
  put(4, 16, 10, 5, paint(palette.top));
  put(3, 13, 10, 4, paint(palette.topDark));

  // Race bib.
  put(6, 18, 5, 4, paint(palette.trim));

  // Head thrust right out in front of the shoulders.
  put(0, 5, 7, 8, paint(c.scalperSkin));

  // Backwards cap — the brim points the WRONG way, which is the tell.
  put(0, 3, 8, 3, paint(palette.topDark));
  put(7, 4, 4, 2, paint(palette.topDark));

  // Both arms pumping, one forward and one flung back.
  const attacking = isAttacking(scalper);
  const swing = attacking && stepping ? 3 : 0;
  put(-4 - swing, 13, 6, 3, paint(palette.top));
  put(-6 - swing, 13, 2, 3, paint(c.scalperSkin));
  put(13, 18, 6, 3, paint(palette.top));

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

  put(-7 - shove, 5, 7, 27, paint(c.armorPlate));
  put(-7 - shove, 5, 7, 2, paint(c.armorPlateDark));
  put(-7 - shove, 30, 7, 2, paint(c.armorPlateDark));
  put(-5 - shove, 15, 3, 8, paint(c.armorPlateDark));
  put(-7 - shove, 17, 7, 1, paint(c.armorPlateDark));

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
