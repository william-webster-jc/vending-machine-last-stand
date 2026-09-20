// =============================================================================
// barricade.js — the boarded-up wall between the scalpers and the machine.
//
// This is effectively your health bar. Right now it only draws itself; health,
// damage and breaking open arrive in M4.
//
// It's drawn deliberately scrappy — planks of uneven length, nailed on at an
// angle — because a tidy wall reads as architecture, and this is something a
// security guard threw together in a hurry.
// =============================================================================

import { CONFIG } from '../config.js';

// How far each plank juts out past the edge of the wall, in pixels. Cycling
// through a fixed list (rather than using random numbers) means the barricade
// looks the same every frame instead of jittering.
const PLANK_OVERHANG = [0, 3, 1, 0, 2, 0, 3, 1, 2, 0, 1, 3];

export function drawBarricade(ctx) {
  const { x, width, topY, bottomY, plankHeight } = CONFIG.barricade;
  const c = CONFIG.colors;

  // Dark backing, so the seams between planks read as shadow rather than holes.
  ctx.fillStyle = c.barricadeWoodDark;
  ctx.fillRect(x - 2, topY, width + 4, bottomY - topY);

  drawPlanks(ctx, x, width, topY, bottomY, plankHeight);
  drawDiagonalBrace(ctx, x, width, topY, bottomY);
  drawUprightPosts(ctx, x, width, topY, bottomY);

  // Floor shadow at the base
  ctx.fillStyle = c.floorContactShadow;
  ctx.fillRect(x - 4, bottomY, width + 8, 3);
}

// Horizontal planks stacked all the way up, alternating shade so each one reads
// separately, with uneven ends for that thrown-together look.
function drawPlanks(ctx, x, width, topY, bottomY, plankHeight) {
  const c = CONFIG.colors;
  let plankIndex = 0;

  for (let y = topY; y < bottomY; y += plankHeight) {
    const thisHeight = Math.min(plankHeight - 1, bottomY - y);
    if (thisHeight <= 0) break;

    const leftOverhang = PLANK_OVERHANG[plankIndex % PLANK_OVERHANG.length];
    const rightOverhang = PLANK_OVERHANG[(plankIndex + 5) % PLANK_OVERHANG.length];
    const plankX = x - leftOverhang;
    const plankWidth = width + leftOverhang + rightOverhang;

    ctx.fillStyle = plankIndex % 2 === 0 ? c.barricadeWood : c.barricadeWoodLight;
    ctx.fillRect(plankX, y, plankWidth, thisHeight);

    // A darker line along the bottom edge gives each plank thickness.
    ctx.fillStyle = c.barricadeWoodDark;
    ctx.fillRect(plankX, y + thisHeight - 1, plankWidth, 1);

    // Wood grain: a short scratch across the middle.
    ctx.fillRect(plankX + 4, y + 3, plankWidth - 10, 1);

    plankIndex++;
  }
}

// One long support board running corner to corner. This is the single detail
// that stops the whole thing reading as a ladder.
function drawDiagonalBrace(ctx, x, width, topY, bottomY) {
  const c = CONFIG.colors;
  const height = bottomY - topY;
  const braceThickness = 5;

  for (let step = 0; step < height; step++) {
    const progress = step / height;
    const braceX = Math.round(x + progress * (width - braceThickness));
    const braceY = bottomY - 1 - step;

    ctx.fillStyle = c.barricadeWoodLight;
    ctx.fillRect(braceX, braceY, braceThickness, 1);

    // Shade the lower edge of the brace so it sits on top of the planks.
    ctx.fillStyle = c.barricadeWoodDark;
    ctx.fillRect(braceX, braceY + 1, braceThickness, 1);
  }
}

// Two vertical posts the planks are nailed to, one at each edge.
function drawUprightPosts(ctx, x, width, topY, bottomY) {
  const c = CONFIG.colors;
  const postWidth = 4;

  for (const postX of [x, x + width - postWidth]) {
    ctx.fillStyle = c.barricadeWood;
    ctx.fillRect(postX, topY, postWidth, bottomY - topY);

    ctx.fillStyle = c.barricadeWoodDark;
    ctx.fillRect(postX + postWidth - 1, topY, 1, bottomY - topY);

    // Nails down the post, one every other plank.
    ctx.fillStyle = c.barricadeNail;
    for (let y = topY + 4; y < bottomY - 2; y += CONFIG.barricade.plankHeight * 2) {
      ctx.fillRect(postX + 1, y, 2, 2);
    }
  }
}
