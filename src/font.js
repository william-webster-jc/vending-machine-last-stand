// =============================================================================
// font.js — a hand-drawn pixel font.
//
// WHY THIS EXISTS: the browser's own text drawing smooths every letter's edges,
// producing grey half-pixels. That looks fine at normal size, but this game is
// drawn tiny and then blown up 3 or 4 times — so those soft grey edges get
// blown up too, and the text goes blurry.
//
// The fix is to stop asking the browser for text at all and draw the letters
// ourselves, one solid pixel at a time. Every letter below is literally drawn
// in the source: '#' is a pixel, a space is empty. You can edit a letter by
// editing its picture.
//
// Each glyph is 5 pixels wide and 7 tall.
// =============================================================================

const GLYPH_WIDTH = 5;
const GLYPH_HEIGHT = 7;
const LETTER_SPACING = 1;

const GLYPHS = {
  A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
  C: [' ### ', '#   #', '#    ', '#    ', '#    ', '#   #', ' ### '],
  D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
  F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
  G: [' ### ', '#   #', '#    ', '#  ##', '#   #', '#   #', ' ### '],
  H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  I: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '#####'],
  J: ['    #', '    #', '    #', '    #', '#   #', '#   #', ' ### '],
  K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '#   #', '#   #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #', '#   #', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
  S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '#   #', '#   #', '# # #', '## ##', '#   #'],
  X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
  Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],

  0: [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  1: ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  2: [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  3: ['#####', '   # ', '  #  ', '   # ', '    #', '#   #', ' ### '],
  4: ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
  5: ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
  6: ['  ## ', ' #   ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  7: ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  8: [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  9: [' ### ', '#   #', '#   #', ' ####', '    #', '   # ', ' ##  '],

  ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
  '.': ['     ', '     ', '     ', '     ', '     ', ' ##  ', ' ##  '],
  ',': ['     ', '     ', '     ', '     ', ' ##  ', ' ##  ', ' #   '],
  ':': ['     ', ' ##  ', ' ##  ', '     ', ' ##  ', ' ##  ', '     '],
  '-': ['     ', '     ', '     ', '#####', '     ', '     ', '     '],
  '/': ['    #', '    #', '   # ', '  #  ', ' #   ', '#    ', '#    '],
  '!': ['  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '     ', '  #  '],
  '?': [' ### ', '#   #', '    #', '   # ', '  #  ', '     ', '  #  '],
  "'": ['  #  ', '  #  ', '     ', '     ', '     ', '     ', '     '],
  '$': ['  #  ', ' ####', '#  # ', ' ### ', '  # #', '#### ', '  #  '],
  '%': ['#   #', '   # ', '   # ', '  #  ', ' #   ', ' #   ', '#   #'],
  '(': ['   # ', '  #  ', ' #   ', ' #   ', ' #   ', '  #  ', '   # '],
  ')': [' #   ', '  #  ', '   # ', '   # ', '   # ', '  #  ', ' #   '],
  '+': ['     ', '  #  ', '  #  ', '#####', '  #  ', '  #  ', '     '],
  '|': ['  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  '>': ['#    ', ' #   ', '  #  ', '   # ', '  #  ', ' #   ', '#    '],
  '<': ['    #', '   # ', '  #  ', ' #   ', '  #  ', '   # ', '    #'],
};

// A box we can't draw, so unknown characters show up as an obvious mistake
// rather than silently vanishing.
const MISSING_GLYPH = ['#####', '#   #', '#   #', '#   #', '#   #', '#   #', '#####'];

// Bold thickens every stroke by one pixel to the right, so letters need one
// extra pixel of room between them to stop them fusing together.
function getAdvance(scale, bold) {
  return (GLYPH_WIDTH + LETTER_SPACING + (bold ? 1 : 0)) * scale;
}

// How wide a line of text will be once drawn, in game pixels.
export function measureText(text, scale = 1, bold = false) {
  if (text.length === 0) return 0;
  const advance = getAdvance(scale, bold);
  return text.length * advance - (LETTER_SPACING + (bold ? 1 : 0)) * scale;
}

export function getTextHeight(scale = 1) {
  return GLYPH_HEIGHT * scale;
}

// Every direction a keyline has to be painted in to surround a letter.
const OUTLINE_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// Draw a line of text. `y` is the TOP of the letters, not their baseline —
// tops are easier to line things up against when you're placing by hand.
//
// options:
//   color       the fill
//   scale       1 for body text, 2-4 for headings
//   align       'left' (default), 'center' or 'right', relative to x
//   bold        thickens every stroke by a pixel
//   outlineColor  paints a keyline all the way round the letters
//
// The keyline is what gives that chunky sticker look: a heavy black edge
// around bright letters, so they read cleanly over any background.
export function drawText(ctx, text, x, y, options = {}) {
  const {
    color = '#ffffff',
    scale = 1,
    align = 'left',
    bold = false,
    outlineColor = null,
  } = options;

  const upper = String(text).toUpperCase();
  const advance = getAdvance(scale, bold);

  let drawX = Math.round(x);
  if (align === 'center') drawX = Math.round(x - measureText(upper, scale, bold) / 2);
  if (align === 'right') drawX = Math.round(x - measureText(upper, scale, bold));

  const drawY = Math.round(y);

  // The keyline goes down first, in every direction, so the fill lands on top
  // of it rather than being eaten by it.
  if (outlineColor) {
    ctx.fillStyle = outlineColor;
    for (const [offsetX, offsetY] of OUTLINE_OFFSETS) {
      drawLine(ctx, upper, drawX + offsetX * scale, drawY + offsetY * scale, scale, bold, advance);
    }
  }

  ctx.fillStyle = color;
  drawLine(ctx, upper, drawX, drawY, scale, bold, advance);
}

function drawLine(ctx, upper, x, y, scale, bold, advance) {
  for (let i = 0; i < upper.length; i++) {
    const glyph = GLYPHS[upper[i]] || MISSING_GLYPH;
    drawGlyph(ctx, glyph, x + i * advance, y, scale, bold);
  }
}

// Draws one letter.
//
// Rather than one fillRect per pixel, this finds RUNS of neighbouring pixels in
// each row and draws each run as a single rectangle. A letter is typically 5-10
// rectangles instead of 35, which matters when a menu holds a few hundred
// letters and we're redrawing the lot sixty times a second.
function drawGlyph(ctx, glyph, x, y, scale, bold = false) {
  const boldExtra = bold ? scale : 0;
  for (let row = 0; row < GLYPH_HEIGHT; row++) {
    const pixels = glyph[row];
    let runStart = -1;

    for (let col = 0; col <= GLYPH_WIDTH; col++) {
      const isOn = col < GLYPH_WIDTH && pixels[col] === '#';

      if (isOn && runStart === -1) {
        runStart = col;
      } else if (!isOn && runStart !== -1) {
        ctx.fillRect(
          x + runStart * scale,
          y + row * scale,
          (col - runStart) * scale + boldExtra,
          scale,
        );
        runStart = -1;
      }
    }
  }
}

// Text with a hard offset shadow behind it, on top of any keyline. Used for
// big headings where the keyline alone isn't enough weight.
export function drawTextWithShadow(ctx, text, x, y, options = {}) {
  const { shadowColor = '#000000', scale = 1 } = options;

  drawText(ctx, text, x + scale * 2, y + scale * 2, {
    ...options,
    color: shadowColor,
    outlineColor: null,
  });
  drawText(ctx, text, x, y, options);
}
