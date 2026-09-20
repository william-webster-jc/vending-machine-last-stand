// =============================================================================
// settings.js — player preferences that outlive everything else.
//
// Your profile is wiped when a career ends. These aren't: difficulty and the
// display toggles are choices about how you want to play, not progress, so
// they survive losing. M20 will save them to disk; for now they last as long
// as the tab is open.
// =============================================================================

import { CONFIG } from './config.js';

export const settings = {
  difficultyId: 'nightshift',

  // Little health bars over scalpers' heads. Handy while tuning, noisy once
  // you're just playing.
  showScalperHealth: true,
};

export function getDifficulty() {
  const found = CONFIG.difficulty.presets.find((p) => p.id === settings.difficultyId);
  return found || CONFIG.difficulty.presets[1];
}

export function cycleDifficulty(direction = 1) {
  const { presets } = CONFIG.difficulty;
  const current = presets.findIndex((p) => p.id === settings.difficultyId);

  // Wrapping with a double modulo so going backwards from the first entry
  // lands on the last rather than on a negative index.
  const next = ((current + direction) % presets.length + presets.length) % presets.length;
  settings.difficultyId = presets[next].id;
}
