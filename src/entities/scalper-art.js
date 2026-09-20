// =============================================================================
// scalper-art.js — what a scalper looks like.
//
// Kept separate from scalper.js so "how they behave" and "how they look" don't
// tangle together. When your real pixel art arrives, this is the only file
// that has to change.
//
// They face LEFT, because that's the way they're heading. Bright purple hoodie,
// cap, backpack, phone in hand — a shopper in a hurry, not a monster.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawFootShadow, drawHealthBar } from '../pixel.js';
import { SCALPER_STATE } from './scalper.js';
import { settings } from '../settings.js';

export function drawScalper(ctx, scalper) {
  const c = CONFIG.colors;

  const left = Math.round(scalper.x - scalper.width / 2);
  const top = Math.round(scalper.y - scalper.height);

  // A two-frame leg shuffle. Flipping between two poses is the whole of 8-bit
  // walk animation — it reads as walking because the position is changing too.
  const isStepping = Math.floor(scalper.walkCycle) % 2 === 0;

  drawFootShadow(ctx, scalper.x, scalper.y, 12);

  drawLegs(ctx, left, top, isStepping);
  drawBackpack(ctx, left, top);
  drawBody(ctx, left, top);
  drawHead(ctx, left, top);
  drawArm(ctx, left, top, scalper, isStepping);

  if (settings.showScalperHealth) {
    drawScalperHealthBar(ctx, scalper, top);
  }
}

// A small health bar over the head. Switchable from the options screen, so
// you can turn it off once M10's hit flash makes it unnecessary.
function drawScalperHealthBar(ctx, scalper, top) {
  const barWidth = 14;
  const barHeight = 2;

  const x = Math.round(scalper.x - barWidth / 2);
  const y = top - 5;
  const fraction = scalper.health / CONFIG.scalper.maxHealth;

  drawHealthBar(ctx, x, y, barWidth, barHeight, fraction);
}

function drawLegs(ctx, left, top, isStepping) {
  const c = CONFIG.colors;

  ctx.fillStyle = c.scalperPants;
  if (isStepping) {
    ctx.fillRect(left + 2, top + 18, 3, 5);
    ctx.fillRect(left + 7, top + 18, 3, 5);
  } else {
    ctx.fillRect(left + 4, top + 18, 3, 5);
    ctx.fillRect(left + 8, top + 18, 3, 5);
  }

  // Bright trainers — the one loud detail that reads at this size.
  ctx.fillStyle = c.scalperShoe;
  if (isStepping) {
    ctx.fillRect(left + 1, top + 23, 4, 3);
    ctx.fillRect(left + 7, top + 23, 4, 3);
  } else {
    ctx.fillRect(left + 3, top + 23, 4, 3);
    ctx.fillRect(left + 8, top + 23, 4, 3);
  }
}

// Worn on the back, which is the RIGHT side of the sprite since they face left.
function drawBackpack(ctx, left, top) {
  const c = CONFIG.colors;

  ctx.fillStyle = c.scalperBackpack;
  ctx.fillRect(left + 9, top + 9, 4, 8);

  ctx.fillStyle = c.scalperHoodieDark;
  ctx.fillRect(left + 9, top + 12, 4, 1);
}

function drawBody(ctx, left, top) {
  const c = CONFIG.colors;

  ctx.fillStyle = c.scalperHoodie;
  ctx.fillRect(left + 2, top + 9, 9, 9);

  // Hoodie pocket
  ctx.fillStyle = c.scalperHoodieDark;
  ctx.fillRect(left + 3, top + 14, 5, 3);
}

function drawHead(ctx, left, top) {
  const c = CONFIG.colors;

  ctx.fillStyle = c.scalperSkin;
  ctx.fillRect(left + 3, top + 3, 6, 6);

  // Cap, brim pointing left — the clearest signal of which way they're headed.
  ctx.fillStyle = c.scalperHoodieDark;
  ctx.fillRect(left + 3, top, 7, 3);
  ctx.fillRect(left, top + 2, 3, 1);
}

// The forward arm, holding a phone. When they're on the barricade it swings,
// which is what sells "tearing at it" without needing new artwork.
function drawArm(ctx, left, top, scalper, isStepping) {
  const c = CONFIG.colors;
  const isAttacking = scalper.state === SCALPER_STATE.ATTACKING_BARRICADE;

  const swing = isAttacking && isStepping ? 2 : 0;

  ctx.fillStyle = c.scalperHoodie;
  ctx.fillRect(left - swing, top + 11, 4, 3);

  ctx.fillStyle = c.scalperSkin;
  ctx.fillRect(left - 2 - swing, top + 11, 2, 3);

  // The phone they're about to check out with.
  ctx.fillStyle = c.scalperPhone;
  ctx.fillRect(left - 4 - swing, top + 10, 2, 4);
}
