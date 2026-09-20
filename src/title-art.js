// =============================================================================
// title-art.js — the box art.
//
// Modelled on the DOOM cover, which is a very specific piece of composition:
//
//   1. The hero is dead centre, low down, seen from slightly BELOW so he
//      towers. He is mid-action, not posing.
//   2. He is BACKLIT — a hot glow behind him throws his outline forward, which
//      is what makes one figure read against a crowd.
//   3. The horde comes from the BOTTOM EDGE, reaching up into frame. You are
//      looking at him from where they are.
//   4. Everything he's protecting is behind him, lit, and slightly smaller.
//
// So: guard centre, gun up, backlit by the one working light over the vending
// machine. Crew behind him. Scalpers clawing in from the bottom corners.
// =============================================================================

import { CONFIG } from './config.js';

// The composition, top to bottom. Everything reads these rather than each
// function guessing, so moving the baseline moves the whole scene together.
const HERO_SCALE = 2.8;
const FLOOR_Y = 158;
const GLOW_X = 210;
const GLOW_Y = 106;

export function drawTitleScene(ctx, seconds) {
  drawBackdrop(ctx, seconds);
  drawCrew(ctx);
  drawTheMachine(ctx, seconds);
  drawHero(ctx, seconds);
  drawHorde(ctx, seconds);
  drawVignette(ctx);
}

// -----------------------------------------------------------------------------
// BACKGROUND
// -----------------------------------------------------------------------------

// A dark store with one hot light behind the machine. The glow is drawn as
// concentric bands rather than a gradient, because banding IS the look — a
// smooth gradient would stop it reading as pixel art.
function drawBackdrop(ctx, seconds) {
  const { width, height } = CONFIG.screen;
  const c = CONFIG.colors;

  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, width, height);

  const glowX = GLOW_X;
  const glowY = GLOW_Y;

  // A slow flicker, so the store feels like it's barely holding on.
  const flicker = 1 + Math.sin(seconds * 7.3) * 0.04 + Math.sin(seconds * 2.1) * 0.03;

  const bands = [
    { radius: 128, color: '#1a1526' },
    { radius: 104, color: '#2a1c33' },
    { radius: 82, color: '#48263a' },
    { radius: 62, color: '#7a3a3a' },
    { radius: 44, color: '#b05a32' },
    { radius: 28, color: '#d98a3a' },
    { radius: 15, color: '#f0c05a' },
  ];

  for (const band of bands) {
    drawPixelDisc(ctx, glowX, glowY, Math.round(band.radius * flicker), band.color);
  }

  // Shelving silhouettes down both sides, so it still reads as a store.
  ctx.fillStyle = '#0d1018';
  for (let x = 0; x < 60; x += 16) {
    ctx.fillRect(x, 40, 11, FLOOR_Y - 40);
  }
  for (let x = width - 60; x < width; x += 16) {
    ctx.fillRect(x, 40, 11, FLOOR_Y - 40);
  }

  // Floor.
  ctx.fillStyle = '#080a0f';
  ctx.fillRect(0, FLOOR_Y, width, height - FLOOR_Y);
  ctx.fillStyle = '#141824';
  ctx.fillRect(0, FLOOR_Y, width, 2);
}

// A filled circle made of horizontal bars — chunky on purpose.
function drawPixelDisc(ctx, centreX, centreY, radius, color) {
  ctx.fillStyle = color;

  for (let y = -radius; y <= radius; y += 2) {
    const half = Math.round(Math.sqrt(Math.max(0, radius * radius - y * y)));
    if (half <= 0) continue;
    ctx.fillRect(centreX - half, centreY + y, half * 2, 2);
  }
}

// -----------------------------------------------------------------------------
// THE THING HE'S PROTECTING
// -----------------------------------------------------------------------------

function drawTheMachine(ctx, seconds) {
  const c = CONFIG.colors;
  const x = 108;
  const y = FLOOR_Y - 74;
  const w = 44;
  const h = 74;

  ctx.fillStyle = '#12151d';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = c.machineDark;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c.machineBody;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

  // Lit sign band.
  ctx.fillStyle = c.machineTrim;
  ctx.fillRect(x + 4, y + 4, w - 8, 8);

  // Glass full of packs, glowing from inside.
  ctx.fillStyle = '#0d1426';
  ctx.fillRect(x + 4, y + 15, 26, 52);

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const pulse = Math.sin(seconds * 3 + row + col) * 0.5 + 0.5;
      ctx.fillStyle = c.packColors[(row * 3 + col) % c.packColors.length];
      ctx.fillRect(x + 6 + col * 8, y + 17 + row * 10, 6, 8);
      if (pulse > 0.7) {
        ctx.fillStyle = c.packFoilShine;
        ctx.fillRect(x + 6 + col * 8, y + 17 + row * 10, 6, 1);
      }
    }
  }

  ctx.fillStyle = c.machineDark;
  ctx.fillRect(x + 33, y + 15, 8, 52);
}

// -----------------------------------------------------------------------------
// THE CREW
// Two of them, well behind and deliberately dim. They're support, and the
// composition only works if exactly one figure is fully lit.
// -----------------------------------------------------------------------------

function drawCrew(ctx) {
  drawBackFigure(ctx, 76, FLOOR_Y - 4, '#1e3a48');
  drawBackFigure(ctx, 306, FLOOR_Y - 6, '#1e3a48');
}

function drawBackFigure(ctx, x, footY, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 6, footY - 26, 13, 16);
  ctx.fillRect(x - 5, footY - 10, 4, 10);
  ctx.fillRect(x + 2, footY - 10, 4, 10);
  ctx.fillRect(x - 4, footY - 34, 9, 9);
  ctx.fillStyle = '#2d5a6e';
  ctx.fillRect(x - 3, footY - 31, 7, 2);

  // Rifle held across the body.
  ctx.fillStyle = '#12151d';
  ctx.fillRect(x - 10, footY - 22, 14, 2);
}

// -----------------------------------------------------------------------------
// THE HERO
// Braced, gun up, seen from slightly below. Drawn in a 26x40 sprite space and
// scaled up, so he's the biggest thing on the screen by a distance.
// -----------------------------------------------------------------------------

function drawHero(ctx, seconds) {
  const c = CONFIG.colors;
  const baseX = 210;
  const footY = FLOOR_Y + 2;

  const put = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(baseX + x * HERO_SCALE),
      Math.round(footY + y * HERO_SCALE),
      Math.max(1, Math.round(w * HERO_SCALE)),
      Math.max(1, Math.round(h * HERO_SCALE)),
    );
  };

  // A hard black keyline around the whole figure, which is what separates him
  // from the glow behind.
  const ink = '#08090d';

  // Legs, planted wide and braced.
  put(-7, -13, 5, 13, ink);
  put(2, -13, 5, 13, ink);
  put(-6, -13, 3, 12, c.guardUniformDark);
  put(3, -13, 3, 12, c.guardUniformDark);
  put(-8, -3, 7, 3, ink);
  put(2, -3, 7, 3, ink);
  put(-7, -3, 5, 2, c.guardBoot);
  put(3, -3, 5, 2, c.guardBoot);

  // Torso, wide at the shoulders and tapering down.
  put(-8, -27, 16, 15, ink);
  put(-7, -26, 14, 13, c.guardUniform);

  // Plate carrier.
  put(-6, -25, 12, 9, c.guardVest);
  put(-6, -25, 12, 1, c.guardVestDark);
  put(-6, -21, 12, 1, c.guardVestDark);
  put(-5, -24, 2, 2, c.guardBadge);

  // Shoulder plates, which is most of what makes the silhouette wide.
  put(-10, -26, 4, 6, ink);
  put(8, -26, 4, 6, ink);
  put(-9, -25, 3, 5, c.guardVestDark);
  put(9, -25, 3, 5, c.guardVestDark);

  // Head and helmet.
  put(-5, -37, 10, 11, ink);
  put(-4, -36, 8, 9, c.guardSkin);
  put(-5, -37, 10, 5, c.guardCap);
  put(-6, -34, 2, 4, c.guardCap);
  put(4, -34, 2, 4, c.guardCap);

  // Visor, pulsing. The one properly bright thing on him.
  const visorPulse = Math.sin(seconds * 4) * 0.5 + 0.5;
  put(-4, -32, 8, 2, visorPulse > 0.5 ? c.guardVisor : '#3aa87c');

  // Right arm raised, gun up and firing.
  put(6, -30, 4, 8, ink);
  put(7, -29, 3, 7, c.guardUniform);
  put(9, -34, 3, 6, ink);
  put(9, -33, 2, 5, c.gunMetal);

  drawMuzzleBlast(ctx, baseX + 10 * HERO_SCALE, footY - 34 * HERO_SCALE, seconds);

  // Left arm down, second weapon at the hip.
  put(-11, -24, 4, 7, ink);
  put(-10, -23, 3, 6, c.guardUniform);
  put(-15, -20, 5, 3, ink);
  put(-14, -19, 4, 2, c.gunMetal);
}

// The flash at the end of the raised weapon, flickering frame to frame.
function drawMuzzleBlast(ctx, x, y, seconds) {
  const c = CONFIG.colors;
  const beat = Math.floor(seconds * 14) % 3;
  const size = 5 + beat * 3;

  ctx.fillStyle = c.sparkCool;
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
  ctx.fillStyle = c.sparkHot;
  ctx.fillRect(x - size + 3, y - size + 3, size * 2 - 6, size * 2 - 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 2, y - 2, 5, 5);
}

// -----------------------------------------------------------------------------
// THE HORDE
// Coming up out of the bottom edge, in silhouette. You are looking at the
// guard from where they are.
// -----------------------------------------------------------------------------

function drawHorde(ctx, seconds) {
  const { width, height } = CONFIG.screen;

  // Back rank: small, far apart, barely more than heads and hands.
  for (let i = 0; i < 10; i++) {
    const x = 8 + i * 42;
    const bob = Math.sin(seconds * 2 + i) * 2;
    drawHordeFigure(ctx, x, 182 + bob, 0.85, '#181c2a', '#33384a');
  }

  // Front rank: bigger, overlapping, clawing up out of the bottom edge.
  for (let i = 0; i < 8; i++) {
    const x = -14 + i * 58;
    const bob = Math.sin(seconds * 2.6 + i * 1.7) * 3;
    drawHordeFigure(ctx, x, 202 + bob, 1.35, '#07080e', '#4a3040');
  }
}

function drawHordeFigure(ctx, x, footY, scale, color, rim) {
  const s = (v) => Math.round(v * scale);

  // A RIM LIGHT along the top of every shape, picking out the edge facing the
  // glow. Without it a black silhouette on a near-black floor disappears; with
  // it you read a crowd of shoulders and raised hands.
  const parts = [
    [x - s(7), footY - s(26), s(14), s(20)],   // body
    [x - s(5), footY - s(36), s(10), s(11)],   // head
    [x - s(13), footY - s(40), s(5), s(16)],   // left arm
    [x + s(8), footY - s(38), s(5), s(15)],    // right arm
    [x - s(14), footY - s(45), s(6), s(6)],    // left hand
    [x + s(8), footY - s(43), s(6), s(6)],     // right hand
  ];

  ctx.fillStyle = rim;
  for (const [px, py, pw, ph] of parts) {
    ctx.fillRect(px, py - 1, pw, ph + 1);
  }

  ctx.fillStyle = color;
  for (const [px, py, pw, ph] of parts) {
    ctx.fillRect(px, py, pw, ph);
  }
}

// A dark frame around the edges, which pushes your eye to the middle.
function drawVignette(ctx) {
  const { width, height } = CONFIG.screen;

  ctx.fillStyle = 'rgba(5, 6, 10, 0.55)';
  ctx.fillRect(0, 0, width, 10);
  ctx.fillRect(0, 0, 14, height);
  ctx.fillRect(width - 14, 0, 14, height);

  ctx.fillStyle = 'rgba(5, 6, 10, 0.3)';
  ctx.fillRect(0, 10, width, 6);
  ctx.fillRect(14, 0, width - 28, 4);
}
