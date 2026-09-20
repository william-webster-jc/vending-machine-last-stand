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

// How wide a line of text will be once drawn, in game pixels.
export function measureText(text, scale = 1) {
  if (text.length === 0) return 0;
  return (text.length * (GLYPH_WIDTH + LETTER_SPACING) - LETTER_SPACING) * scale;
}

export function getTextHeight(scale = 1) {
  return GLYPH_HEIGHT * scale;
}

// Draw a line of text. `y` is the TOP of the letters, not their baseline —
// tops are easier to line things up against when you're placing by hand.
//
// align: 'left' (default), 'center' or 'right', relative to x.
export function drawText(ctx, text, x, y, options = {}) {
  const { color = '#ffffff', scale = 1, align = 'left' } = options;
  const upper = String(text).toUpperCase();

  let drawX = Math.round(x);
  if (align === 'center') drawX = Math.round(x - measureText(upper, scale) / 2);
  if (align === 'right') drawX = Math.round(x - measureText(upper, scale));

  const drawY = Math.round(y);
  ctx.fillStyle = color;

  for (let i = 0; i < upper.length; i++) {
    const glyph = GLYPHS[upper[i]] || MISSING_GLYPH;
    drawGlyph(ctx, glyph, drawX + i * (GLYPH_WIDTH + LETTER_SPACING) * scale, drawY, scale);
  }
}

// Draws one letter.
//
// Rather than one fillRect per pixel, this finds RUNS of neighbouring pixels in
// each row and draws each run as a single rectangle. A letter is typically 5-10
// rectangles instead of 35, which matters when a menu holds a few hundred
// letters and we're redrawing the lot sixty times a second.
function drawGlyph(ctx, glyph, x, y, scale) {
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
          (col - runStart) * scale,
          scale,
        );
        runStart = -1;
      }
    }
  }
}

// Text with a hard one-pixel shadow behind it. No blurring — this is exactly
// how 8-bit games made text readable over a busy background.
export function drawTextWithShadow(ctx, text, x, y, options = {}) {
  const { shadowColor = '#000000', scale = 1 } = options;

  drawText(ctx, text, x + scale, y + scale, { ...options, color: shadowColor });
  drawText(ctx, text, x, y, options);
}
