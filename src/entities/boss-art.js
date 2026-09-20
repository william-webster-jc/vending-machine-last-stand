// =============================================================================
// boss-art.js — what THE RESELLER looks like.
//
// Drawn in a 20x34 sprite space and scaled up, same trick as the scalpers.
//
// The important job here isn't the figure — it's the WEAK POINT. It has to be
// obviously shut most of the time and obviously open during a wind-up, from
// across a busy screen, with no text. That's the whole fight.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawFootShadow } from '../pixel.js';
import { BOSS_STATE, isWeakPointOpen, getSpriteSize } from './boss.js';

export function drawBoss(ctx, boss) {
  const c = CONFIG.colors;
  const sprite = getSpriteSize();
  const scale = boss.width / sprite.width;

  const left = Math.round(boss.x - boss.width / 2);
  const top = Math.round(boss.y - boss.height);

  // Winding up, he rears BACK — leaning away, which is the silhouette cue
  // that something is coming even before you spot the glow.
  const lean = boss.state === BOSS_STATE.WINDING_UP ? 3 : 0;
  const crouch = boss.state === BOSS_STATE.STAGGERED ? 6 : 0;

  const put = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      left + Math.round((x + lean) * scale),
      top + Math.round((y + crouch) * scale),
      Math.max(1, Math.round(w * scale)),
      Math.max(1, Math.round(h * scale)),
    );
  };

  const flashing = boss.hitFlash > 0;
  const paint = (color) => (flashing ? '#ffffff' : color);

  drawFootShadow(ctx, boss.x, boss.y, Math.round(24 * scale));

  drawLegs(put, paint);
  drawCase(put, paint);
  drawCoat(put, paint);
  drawWeakPoint(put, boss);
  drawHead(put, paint, boss);
}

function drawLegs(put, paint) {
  const c = CONFIG.colors;

  put(4, 25, 4, 7, paint(c.bossCoatDark));
  put(12, 25, 4, 7, paint(c.bossCoatDark));
  put(3, 32, 6, 2, paint(c.scalperShoe));
  put(11, 32, 6, 2, paint(c.scalperShoe));
}

// A briefcase in the trailing hand. Sells 'reseller' in one object.
function drawCase(put, paint) {
  const c = CONFIG.colors;

  put(16, 18, 6, 7, paint(c.bossCase));
  put(16, 20, 6, 1, paint(c.bossCoatDark));
  put(18, 16, 2, 2, paint(c.bossCoatDark));
}

function drawCoat(put, paint) {
  const c = CONFIG.colors;

  // Long coat over plated shoulders.
  put(2, 11, 16, 15, paint(c.bossCoat));
  put(2, 11, 16, 2, paint(c.bossPlateDark));
  put(1, 12, 4, 6, paint(c.bossPlate));
  put(15, 12, 4, 6, paint(c.bossPlate));
  put(2, 24, 16, 2, paint(c.bossCoatDark));

  // Forward arm, reaching for your barricade.
  put(-2, 15, 5, 4, paint(c.bossCoat));
  put(-4, 15, 3, 4, paint(c.bossSkin));
}

// The chest plate. Shut it's a dull dark slot; open it's a bright glowing
// target with a ring around it. Deliberately the loudest thing on screen.
function drawWeakPoint(put, boss) {
  const c = CONFIG.colors;
  const open = isWeakPointOpen(boss);

  if (!open) {
    put(7, 15, 6, 4, c.weakPointIdle);
    put(7, 15, 6, 1, c.bossPlateDark);
    return;
  }

  put(6, 14, 8, 6, c.weakPointGlow);
  put(7, 15, 6, 4, c.weakPointOpen);
  put(8, 16, 4, 2, c.weakPointGlow);
}

function drawHead(put, paint, boss) {
  const c = CONFIG.colors;

  put(6, 3, 8, 8, paint(c.bossSkin));

  // Slicked hair and shades. No cap — he's management.
  put(5, 1, 10, 3, paint(c.bossCoatDark));
  put(5, 5, 9, 2, paint(c.bossShades));

  // Face down while staggered.
  if (boss.state === BOSS_STATE.STAGGERED) {
    put(6, 8, 8, 2, paint(c.bossCoatDark));
  }
}
