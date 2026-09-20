// =============================================================================
// night.js — the shift clock, and the assault that runs the length of it.
//
// A NIGHT IS A WAVE. Night one is wave one. There are no sub-waves and no rest
// breaks: scalpers pour in continuously from dusk to dawn, and the stream gets
// heavier as the night wears on.
//
// The night runs for a fixed length of time and ends at sunrise whether or not
// you've cleared the floor. That's deliberate — it's what lets the SKY be the
// clock. If the night ended when you finished killing things, the sunrise
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

  if (world.nightBannerTimer > 0) {
    world.nightBannerTimer -= deltaSeconds;
  }

  updateAssault(world, deltaSeconds);

  if (getNightProgress(world) >= 1) {
    surviveTheNight(world);
  }
}

// -----------------------------------------------------------------------------
// THE ASSAULT
// -----------------------------------------------------------------------------

// How many scalpers turn up over the whole of a given night.
export function getAssaultSize(day) {
  const cfg = CONFIG.night;
  return cfg.assaultSizeOnNightOne + (day - 1) * cfg.assaultGrowthPerNight;
}

// How hard they're coming RIGHT NOW, relative to the night's average.
//
// This climbs steadily from a gentle opening to a frantic finish. Working in
// "relative to average" rather than raw numbers is what lets the total for the
// night stay exactly what getAssaultSize promised, whatever shape the curve is.
function getPressure(nightProgress) {
  const buildUp = CONFIG.night.pressureBuildUp;

  const pressureNow = 1 + (buildUp - 1) * nightProgress;
  const averagePressure = (1 + buildUp) / 2;

  return pressureNow / averagePressure;
}

function updateAssault(world, deltaSeconds) {
  const total = getAssaultSize(world.day);
  if (world.scalpersSpawnedTonight >= total) return;

  const progress = getNightProgress(world);
  const perSecond = (total / CONFIG.night.durationSeconds) * getPressure(progress);

  // Arrivals are counted up as a running fraction rather than on a timer.
  // When the fraction passes 1, someone walks in. That keeps the stream smooth
  // at any rate, and handles rates above one per frame without dropping anyone.
  world.spawnBudget += perSecond * deltaSeconds;

  while (world.spawnBudget >= 1 && world.scalpersSpawnedTonight < total) {
    spawnScalper(world, getSpeedMultiplier(world.day));
    world.spawnBudget -= 1;
    world.scalpersSpawnedTonight += 1;
  }
}

function getSpeedMultiplier(day) {
  return 1 + (day - 1) * CONFIG.night.speedGrowthPerNight;
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
