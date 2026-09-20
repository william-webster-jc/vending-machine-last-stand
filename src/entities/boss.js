// =============================================================================
// boss.js — THE RESELLER.
//
// THE BIG IDEA here is the telegraph: a scripted, readable, learnable pattern.
//
// He is not a scalper with a bigger health bar. His plating shrugs off ordinary
// fire, so chipping him down doesn't work. Instead he periodically REARS BACK
// to charge your barricade, and while he's winding up a weak point opens on
// his chest. Land enough damage on it in that window and the charge is broken
// and he goes down hard. Miss and he smashes through.
//
// So the fight has a rhythm you can learn: survive, watch for the wind-up,
// take the shot. It's the drama a quick-time event is reaching for, answered
// with the gun you've been holding all night.
// =============================================================================

import { CONFIG } from '../config.js';
import { spawnScalper } from './scalper.js';
import { addShake, spawnSplinters } from '../juice.js';
import { damageBarricade } from './barricade.js';
import { playWeakPointOpen, playBossStaggered, playBossSlam } from '../audio.js';

export const BOSS_STATE = {
  ARRIVING: 'arriving',       // walking in from off-screen
  ADVANCING: 'advancing',     // closing on the barricade, calling in help
  WINDING_UP: 'winding-up',   // reared back, WEAK POINT OPEN
  CHARGING: 'charging',       // the window was missed; here he comes
  SLAMMING: 'slamming',       // hitting the barricade after a charge
  STAGGERED: 'staggered',     // interrupted, face down, fully vulnerable
  ATTACKING: 'attacking',     // stood at the wall tearing at it
};

const SPRITE_WIDTH = 20;
const SPRITE_HEIGHT = 34;

export function createBoss(day) {
  const cfg = CONFIG.boss;
  const health = cfg.healthPerNight * day;

  return {
    x: CONFIG.screen.width + 40,
    y: CONFIG.world.walkBottomY - 8,

    width: Math.round(SPRITE_WIDTH * cfg.sizeScale),
    height: Math.round(SPRITE_HEIGHT * cfg.sizeScale),

    health,
    maxHealth: health,

    state: BOSS_STATE.ARRIVING,
    stateTimer: 0,

    // Counts down to the next wind-up, and to the next batch of summons.
    windupCountdown: cfg.windupEverySeconds,
    summonCountdown: cfg.summonEverySeconds,

    // Damage landed on the weak point during the CURRENT window only. Resets
    // every time a window opens, so you can't chip across several windows.
    windowDamage: 0,

    enraged: false,
    hitFlash: 0,

    // Set for one frame when something worth announcing happens, so the
    // renderer can shout about it.
    announcement: null,
    announcementTimer: 0,
  };
}

export function isBossAlive(world) {
  return world.boss !== null && world.boss.health > 0;
}

// -----------------------------------------------------------------------------
// HITBOXES
// -----------------------------------------------------------------------------

export function getBossHitBox(boss) {
  const halfWidth = boss.width / 2;

  return {
    left: boss.x - halfWidth,
    right: boss.x + halfWidth,
    top: boss.y - boss.height,
    bottom: boss.y,
  };
}

// The chest plate that swings open while he winds up. Generous on purpose —
// the challenge is the timing, not threading a needle.
export function getWeakPointBox(boss) {
  const body = getBossHitBox(boss);
  const width = boss.width * 0.42;
  const height = boss.height * 0.2;

  return {
    left: boss.x - width / 2,
    right: boss.x + width / 2,
    top: body.top + boss.height * 0.32,
    bottom: body.top + boss.height * 0.32 + height,
  };
}

export function isWeakPointOpen(boss) {
  return boss.state === BOSS_STATE.WINDING_UP || boss.state === BOSS_STATE.STAGGERED;
}

// -----------------------------------------------------------------------------
// TAKING DAMAGE
// -----------------------------------------------------------------------------

// Returns how much actually landed, so the caller can decide what to show.
export function damageBoss(boss, amount, hitWeakPoint) {
  const cfg = CONFIG.boss;
  boss.hitFlash = CONFIG.scalper.hitFlashSeconds;

  // Face down after an interrupt: everything lands in full, wherever it hits.
  if (boss.state === BOSS_STATE.STAGGERED) {
    boss.health -= amount;
    return amount;
  }

  if (hitWeakPoint && boss.state === BOSS_STATE.WINDING_UP) {
    const dealt = amount * cfg.weakPointMultiplier;
    boss.health -= dealt;
    boss.windowDamage += dealt;
    return dealt;
  }

  // Everything else just rattles off the plating.
  const dealt = Math.max(1, Math.round(amount * cfg.armorDamageFactor));
  boss.health -= dealt;
  return dealt;
}

// -----------------------------------------------------------------------------
// BEHAVIOUR
// -----------------------------------------------------------------------------

export function updateBoss(world, deltaSeconds) {
  const boss = world.boss;
  if (!boss || boss.health <= 0) return;

  if (boss.hitFlash > 0) boss.hitFlash -= deltaSeconds;
  if (boss.announcementTimer > 0) boss.announcementTimer -= deltaSeconds;

  boss.stateTimer += deltaSeconds;
  checkEnrage(boss);

  switch (boss.state) {
    case BOSS_STATE.ARRIVING:
      arrive(boss, deltaSeconds);
      break;
    case BOSS_STATE.ADVANCING:
      advance(boss, world, deltaSeconds);
      break;
    case BOSS_STATE.WINDING_UP:
      windUp(boss, deltaSeconds);
      break;
    case BOSS_STATE.CHARGING:
      charge(boss, world, deltaSeconds);
      break;
    case BOSS_STATE.SLAMMING:
      slam(boss, deltaSeconds);
      break;
    case BOSS_STATE.STAGGERED:
      stagger(boss, deltaSeconds);
      break;
    case BOSS_STATE.ATTACKING:
      attackBarricade(boss, world, deltaSeconds);
      break;
  }
}

function setState(boss, state, announcement = null) {
  boss.state = state;
  boss.stateTimer = 0;

  if (announcement) {
    boss.announcement = announcement;
    boss.announcementTimer = 1.4;
  }
}

// Halfway down he gets faster wind-ups and calls in more help. A second gear
// rather than a second boss.
function checkEnrage(boss) {
  if (boss.enraged) return;
  if (boss.health > boss.maxHealth * CONFIG.boss.enragedAtHealthFraction) return;

  boss.enraged = true;
  boss.announcement = 'ENRAGED';
  boss.announcementTimer = 1.6;
}

function arrive(boss, deltaSeconds) {
  boss.x -= CONFIG.boss.advanceSpeed * 2 * deltaSeconds;

  if (boss.x <= CONFIG.screen.width - 40) {
    setState(boss, BOSS_STATE.ADVANCING);
  }
}

function advance(boss, world, deltaSeconds) {
  moveToward(boss, getBarricadeStopLine(boss), CONFIG.boss.advanceSpeed, deltaSeconds);

  boss.summonCountdown -= deltaSeconds;
  if (boss.summonCountdown <= 0) {
    summonHelp(boss, world);
  }

  boss.windupCountdown -= deltaSeconds;
  if (boss.windupCountdown <= 0) {
    beginWindup(boss);
    return;
  }

  if (boss.x <= getBarricadeStopLine(boss) + 0.5) {
    setState(boss, BOSS_STATE.ATTACKING);
  }
}

function beginWindup(boss) {
  boss.windowDamage = 0;
  setState(boss, BOSS_STATE.WINDING_UP, 'WEAK POINT OPEN');

  // A rising sting, so you can react to the window without having to be
  // looking at him at that exact moment.
  playWeakPointOpen();
}

function windUp(boss, deltaSeconds) {
  const cfg = CONFIG.boss;
  const window = boss.enraged ? cfg.windupSecondsEnraged : cfg.windupSeconds;

  // Enough on the weak point and the charge never happens.
  if (boss.windowDamage >= cfg.interruptDamage) {
    playBossStaggered();
    setState(boss, BOSS_STATE.STAGGERED, 'STAGGERED');
    return;
  }

  if (boss.stateTimer >= window) {
    setState(boss, BOSS_STATE.CHARGING, 'INCOMING');
  }
}

function charge(boss, world, deltaSeconds) {
  const stopLine = getBarricadeStopLine(boss);
  moveToward(boss, stopLine, CONFIG.boss.chargeSpeed, deltaSeconds);

  if (boss.x <= stopLine + 0.5) {
    damageBarricade(world, CONFIG.boss.slamDamage);

    // The whole room jumps. A charge that connects should be the loudest
    // thing that happens all night.
    addShake(world, CONFIG.juice.shakeOnBossSlam);
    playBossSlam();
    for (let i = 0; i < 6; i++) {
      spawnSplinters(world, CONFIG.barricade.x + CONFIG.barricade.width, boss.y - 20 - i * 6);
    }

    setState(boss, BOSS_STATE.SLAMMING);
  }
}

function slam(boss, deltaSeconds) {
  if (boss.stateTimer < 0.7) return;

  boss.windupCountdown = CONFIG.boss.windupEverySeconds;
  setState(boss, BOSS_STATE.ADVANCING);
}

function stagger(boss, deltaSeconds) {
  if (boss.stateTimer < CONFIG.boss.staggerSeconds) return;

  boss.windupCountdown = CONFIG.boss.windupEverySeconds;
  setState(boss, BOSS_STATE.ADVANCING);
}

function attackBarricade(boss, world, deltaSeconds) {
  if (world.barricade.isBroken) {
    setState(boss, BOSS_STATE.ADVANCING);
    return;
  }

  damageBarricade(world, CONFIG.boss.attackDamagePerSecond * deltaSeconds);

  // He still winds up while chewing, so the fight never becomes a stalemate.
  boss.windupCountdown -= deltaSeconds;
  if (boss.windupCountdown <= 0) {
    beginWindup(boss);
  }
}

function summonHelp(boss, world) {
  const cfg = CONFIG.boss;
  const count = boss.enraged ? cfg.summonCount + 1 : cfg.summonCount;

  for (let i = 0; i < count; i++) {
    spawnScalper(world, 1);
  }

  boss.summonCountdown = boss.enraged ? cfg.summonEverySeconds * 0.6 : cfg.summonEverySeconds;
  boss.announcement = 'CALLING FRIENDS';
  boss.announcementTimer = 1.1;
}

function moveToward(boss, targetX, speed, deltaSeconds) {
  const step = speed * deltaSeconds;
  boss.x = Math.max(targetX, boss.x - step);
}

function getBarricadeStopLine(boss) {
  const barricadeRight = CONFIG.barricade.x + CONFIG.barricade.width;
  return barricadeRight + 4 + boss.width / 2;
}

export function getSpriteSize() {
  return { width: SPRITE_WIDTH, height: SPRITE_HEIGHT };
}
