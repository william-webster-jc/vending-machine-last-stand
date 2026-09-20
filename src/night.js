// =============================================================================
// night.js — the shift clock, and the waves scheduled inside it.
//
// A night runs for a fixed length of time and ends at sunrise, whether or not
// you've cleared the floor. Waves are slotted into that window rather than
// waiting to be cleared, and that's deliberate: it's what lets the SKY act as
// the clock. If the night ended when you finished killing things, the sunrise
// could never mean anything.
// =============================================================================

import { CONFIG } from './config.js';
import { spawnScalper } from './entities/scalper.js';
import { GAME_STATE } from './world.js';
import { calculatePay } from './shop.js';

// How far through the night we are, from 0 at dusk to 1 at full sunrise.
export function getNightProgress(world) {
  return Math.min(world.elapsedSeconds / CONFIG.night.durationSeconds, 1);
}

export function updateNight(world, deltaSeconds) {
  world.elapsedSeconds += deltaSeconds;

  if (world.waveBannerTimer > 0) {
    world.waveBannerTimer -= deltaSeconds;
  }

  updateWaves(world, deltaSeconds);

  if (getNightProgress(world) >= 1) {
    surviveTheNight(world);
  }
}

// -----------------------------------------------------------------------------
// WAVES
// -----------------------------------------------------------------------------

function updateWaves(world, deltaSeconds) {
  const slotSeconds = CONFIG.night.durationSeconds / CONFIG.night.wavesPerNight;

  // Which slot of the night we're in. Clamped so the very last instant of the
  // night doesn't tip over into a wave that doesn't exist.
  const waveIndex = Math.min(
    Math.floor(world.elapsedSeconds / slotSeconds),
    CONFIG.night.wavesPerNight - 1,
  );

  if (waveIndex !== world.waveIndex) {
    world.waveIndex = waveIndex;
    startWave(world, waveIndex);
  }

  releaseScalpers(world, deltaSeconds);
}

function startWave(world, waveIndex) {
  const count = getWaveSize(world.day, waveIndex);

  world.scalpersLeftInWave = count;

  // Spread the wave evenly across its spawn window, so they trickle in over
  // the whole phase rather than all appearing at once.
  world.spawnGapSeconds = CONFIG.night.waveSpawnSeconds / count;
  world.spawnCountdown = 0;

  world.waveBannerTimer = CONFIG.night.waveBannerSeconds;
}

function releaseScalpers(world, deltaSeconds) {
  if (world.scalpersLeftInWave <= 0) return;

  world.spawnCountdown -= deltaSeconds;
  if (world.spawnCountdown > 0) return;

  spawnScalper(world, getSpeedMultiplier(world.day, world.waveIndex));
  world.scalpersLeftInWave -= 1;
  world.spawnCountdown = world.spawnGapSeconds;
}

// Waves grow through the night AND across nights, so night three opens
// harder than night one ever got.
export function getWaveSize(day, waveIndex) {
  const cfg = CONFIG.night;

  return (
    cfg.firstWaveSize +
    waveIndex * cfg.waveSizeGrowth +
    (day - 1) * cfg.waveSizeGrowthPerDay
  );
}

function getSpeedMultiplier(day, waveIndex) {
  const cfg = CONFIG.night;

  return 1 + waveIndex * cfg.speedGrowthPerWave + (day - 1) * cfg.speedGrowthPerDay;
}

// -----------------------------------------------------------------------------
// SUNRISE
// -----------------------------------------------------------------------------

function surviveTheNight(world) {
  world.state = GAME_STATE.NIGHT_SURVIVED;
  world.gameOverCountdown = CONFIG.gameOver.restartDelaySeconds;

  world.finalStats = {
    scalpersStopped: world.scalpersStopped,
    secondsSurvived: world.elapsedSeconds,
    scalpersOnFloor: world.scalpers.length,
    barricadeHeld: !world.barricade.isBroken,
    packsSaved: world.machine.packsRemaining,
  };

  // The payslip is worked out at sunrise and kept, so the screen shows what
  // you actually earned rather than recalculating from a world that's about
  // to be replaced.
  world.payslip = calculatePay(world.finalStats);
}

// -----------------------------------------------------------------------------
// THE SKY
// -----------------------------------------------------------------------------

// Work out what the sky looks like right now by finding which pair of stages
// we're between, and blending across them.
export function getSkyState(nightProgress) {
  const { stages } = CONFIG.sky;

  let earlier = stages[0];
  let later = stages[stages.length - 1];

  for (let i = 0; i < stages.length - 1; i++) {
    if (nightProgress >= stages[i].at && nightProgress <= stages[i + 1].at) {
      earlier = stages[i];
      later = stages[i + 1];
      break;
    }
  }

  const span = later.at - earlier.at;
  const blend = span === 0 ? 0 : (nightProgress - earlier.at) / span;

  return {
    earlierColor: earlier.color,
    laterColor: later.color,
    blend,
    starVisibility:
      earlier.starVisibility + (later.starVisibility - earlier.starVisibility) * blend,
  };
}

// 1 when the moon is fully up, 0 once it has set.
export function getMoonVisibility(nightProgress) {
  const setsAt = CONFIG.sky.moonSetsAt;
  return Math.min(Math.max(1 - nightProgress / setsAt, 0), 1);
}

// 0 before the sun starts climbing, 1 when it's fully up.
export function getSunRise(nightProgress) {
  const risesAt = CONFIG.sky.sunRisesAt;
  if (nightProgress <= risesAt) return 0;

  return Math.min((nightProgress - risesAt) / (1 - risesAt), 1);
}

// How strongly the warm dawn light washes over the mall interior.
export function getDawnWashAlpha(nightProgress) {
  const { dawnWashStartsAt, dawnWashMaxAlpha } = CONFIG.sky;
  if (nightProgress <= dawnWashStartsAt) return 0;

  const through = (nightProgress - dawnWashStartsAt) / (1 - dawnWashStartsAt);
  return Math.min(through, 1) * dawnWashMaxAlpha;
}
