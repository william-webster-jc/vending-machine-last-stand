// =============================================================================
// barricade.js — the boarded-up wall between the scalpers and the machine.
//
// This is your health bar, in wall form. You have none of your own; everything
// the scalpers do, they do to this.
//
// It's drawn deliberately scrappy — planks of uneven length, nailed on at an
// angle — because a tidy wall reads as architecture, and this is something a
// security guard threw together in a hurry.
// =============================================================================

import { CONFIG } from '../config.js';
import { drawHealthBar } from '../pixel.js';

// How far each plank juts out past the edge of the wall. Cycling through a
// fixed list (rather than using random numbers) means the barricade looks the
// same every frame instead of jittering.
const PLANK_OVERHANG = [0, 3, 1, 0, 2, 0, 3, 1, 2, 0, 1, 3];

export function createBarricade(maxHealth, carriedHealth = null) {
  // null means "arrive at full strength" — a fresh career, or a wall you paid
  // to have repaired during the day.
  const health = carriedHealth === null
    ? maxHealth
    : Math.min(carriedHealth, maxHealth);

  return {
    maxHealth,
    health,
    isBroken: health <= 0,
  };
}

// Where the guard is stopped. Normally the wall itself; once it's smashed
// open, this depends on whether you're allowed to push forward into it.
export function getBarricadeBlockLine(barricade) {
  if (barricade.isBroken && !CONFIG.barricade.blocksGuardWhenBroken) {
    return CONFIG.screen.width;
  }
  return CONFIG.barricade.x;
}

// -----------------------------------------------------------------------------
// DRAWING
// -----------------------------------------------------------------------------

export function drawBarricade(ctx, barricade) {
  const { x, width, topY, bottomY, plankHeight } = CONFIG.barricade;
  const c = CONFIG.colors;

  if (barricade.isBroken) {
    drawRubble(ctx);
    return;
  }

  // Dark backing, so gaps between planks — and holes smashed through them —
  // read as shadow rather than as see-through nothing.
  ctx.fillStyle = c.barricadeWoodDark;
  ctx.fillRect(x - 2, topY, width + 4, bottomY - topY);

  drawPlanks(ctx, barricade, x, width, topY, bottomY, plankHeight);
  drawDiagonalBrace(ctx, x, width, topY, bottomY);
  drawUprightPosts(ctx, x, width, topY, bottomY);

  ctx.fillStyle = c.floorContactShadow;
  ctx.fillRect(x - 4, bottomY, width + 8, 3);

  drawBarricadeHealthBar(ctx, barricade);
}

// Horizontal planks stacked all the way up, alternating shade so each one
// reads separately, with uneven ends for that thrown-together look.
//
// As health drops, planks go missing from the MIDDLE outward — that's where
// the scalpers are hitting it — so a hole opens up and widens. You can read
// how close the wall is to failing without looking at the health bar at all.
function drawPlanks(ctx, barricade, x, width, topY, bottomY, plankHeight) {
  const c = CONFIG.colors;

  const plankCount = Math.ceil((bottomY - topY) / plankHeight);
  const middlePlank = (plankCount - 1) / 2;
  const healthFraction = barricade.health / barricade.maxHealth;
  const holeRadius = (1 - healthFraction) * (plankCount / 2);

  let plankIndex = 0;
  for (let y = topY; y < bottomY; y += plankHeight) {
    const thisHeight = Math.min(plankHeight - 1, bottomY - y);
    if (thisHeight <= 0) break;

    const distanceFromMiddle = Math.abs(plankIndex - middlePlank);
    const isSmashedOut = distanceFromMiddle < holeRadius;

    if (!isSmashedOut) {
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

      // Planks about to go show a crack, so damage creeps in gradually rather
      // than whole boards blinking out of existence.
      if (distanceFromMiddle < holeRadius + 1) {
        ctx.fillRect(plankX + 6, y, 2, thisHeight - 1);
        ctx.fillRect(plankX + Math.floor(plankWidth * 0.6), y, 1, thisHeight - 1);
      }
    }

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

    ctx.fillStyle = c.barricadeNail;
    for (let y = topY + 4; y < bottomY - 2; y += CONFIG.barricade.plankHeight * 2) {
      ctx.fillRect(postX + 1, y, 2, 2);
    }
  }
}

// What's left once it fails: two broken stumps and a scatter of planks on the
// floor. Low enough that scalpers clearly walk straight over it.
function drawRubble(ctx) {
  const { x, width, bottomY } = CONFIG.barricade;
  const c = CONFIG.colors;

  // Splintered stumps of the two upright posts
  ctx.fillStyle = c.barricadeWoodDark;
  ctx.fillRect(x, bottomY - 14, 4, 14);
  ctx.fillRect(x + width - 4, bottomY - 10, 4, 10);

  ctx.fillStyle = c.barricadeWood;
  ctx.fillRect(x, bottomY - 12, 3, 12);
  ctx.fillRect(x + width - 4, bottomY - 8, 3, 8);

  // Planks fallen flat across the floor
  ctx.fillStyle = c.barricadeWoodLight;
  ctx.fillRect(x - 6, bottomY - 5, width + 10, 3);
  ctx.fillStyle = c.barricadeWood;
  ctx.fillRect(x - 2, bottomY - 2, width + 6, 3);

  ctx.fillStyle = c.floorContactShadow;
  ctx.fillRect(x - 8, bottomY + 1, width + 14, 2);
}

function drawBarricadeHealthBar(ctx, barricade) {
  const cfg = CONFIG.barricade;
  const fraction = barricade.health / barricade.maxHealth;

  const barX = Math.round(cfg.x + cfg.width / 2 - cfg.healthBarWidth / 2);
  const barY = cfg.topY - cfg.healthBarOffsetY;

  drawHealthBar(ctx, barX, barY, cfg.healthBarWidth, cfg.healthBarHeight, fraction);
}
