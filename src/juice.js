// =============================================================================
// juice.js — screen shake and particles.
//
// Nothing in this file changes what the game DOES. A bullet already took
// health off a scalper long before any of this existed.
//
// What it didn't do was TELL you. In the half second after you pull the
// trigger, you want an answer to "did that connect?" — and sparks, a shove,
// a flash and a thump in the screen are that answer. Getting it instant and
// unmissable is most of what makes shooting feel good rather than merely work.
// =============================================================================

import { CONFIG } from './config.js';

export function createJuice() {
  return {
    shake: 0,
    particles: [],
  };
}

// -----------------------------------------------------------------------------
// SCREEN SHAKE
// -----------------------------------------------------------------------------

// Shakes stack up and then drain away, so a grenade landing in a crowd hits
// harder than any one thing in it would.
export function addShake(world, amount) {
  world.juice.shake = Math.min(CONFIG.juice.shakeMax, world.juice.shake + amount);
}

// How far to shove the whole picture this frame. A fresh random offset every
// frame is what reads as a rattle rather than a slide.
export function getShakeOffset(world) {
  const shake = world.juice.shake;
  if (shake <= 0.05) return { x: 0, y: 0 };

  return {
    x: Math.round((Math.random() - 0.5) * 2 * shake),
    y: Math.round((Math.random() - 0.5) * 2 * shake),
  };
}

// -----------------------------------------------------------------------------
// PARTICLES
// -----------------------------------------------------------------------------

function addParticle(world, particle) {
  const list = world.juice.particles;

  // Hard cap. Dropping the oldest keeps a chaotic moment from quietly
  // becoming a frame rate problem.
  if (list.length >= CONFIG.juice.maxParticles) list.shift();

  list.push(particle);
}

function makeParticle(x, y, velocityX, velocityY, life, color, size, gravity) {
  return { x, y, velocityX, velocityY, life, totalLife: life, color, size, gravity };
}

// Bright sparks flying back the way the bullet came.
export function spawnHitSparks(world, x, y, incomingAngle) {
  const c = CONFIG.colors;
  const away = incomingAngle + Math.PI;

  for (let i = 0; i < CONFIG.juice.sparksPerHit; i++) {
    const angle = away + (Math.random() - 0.5) * 1.6;
    const speed = 40 + Math.random() * 90;

    addParticle(
      world,
      makeParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.12 + Math.random() * 0.12,
        Math.random() < 0.5 ? c.sparkHot : c.sparkCool,
        1,
        120,
      ),
    );
  }
}

// What a scalper leaves behind: the cards they came for, scattered.
export function spawnDeathBurst(world, x, y) {
  const c = CONFIG.colors;

  for (let i = 0; i < CONFIG.juice.cardsPerDeath; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const speed = 30 + Math.random() * 70;

    addParticle(
      world,
      makeParticle(
        x, y - 10,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.5 + Math.random() * 0.4,
        c.packColors[Math.floor(Math.random() * c.packColors.length)],
        2,
        220,
      ),
    );
  }
}

// A spent case tumbling out of the gun. Pure decoration, and the cheapest
// possible reminder that you just fired.
export function spawnCasing(world, x, y, facing) {
  addParticle(
    world,
    makeParticle(
      x, y,
      -facing * (20 + Math.random() * 25),
      -40 - Math.random() * 30,
      0.45,
      CONFIG.colors.casing,
      1,
      260,
    ),
  );
}

export function spawnSplinters(world, x, y) {
  for (let i = 0; i < CONFIG.juice.splintersPerBarricadeHit; i++) {
    const angle = Math.PI + (Math.random() - 0.5) * 2;
    const speed = 25 + Math.random() * 55;

    addParticle(
      world,
      makeParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.3 + Math.random() * 0.3,
        CONFIG.colors.splinter,
        1,
        200,
      ),
    );
  }
}

export function spawnSmoke(world, x, y, radius) {
  const c = CONFIG.colors;

  for (let i = 0; i < CONFIG.juice.smokePerExplosion; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 10 + Math.random() * radius * 1.6;

    addParticle(
      world,
      makeParticle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed * 0.6,
        0.3 + Math.random() * 0.4,
        Math.random() < 0.4 ? c.sparkCool : c.smokePuff,
        2,
        -20,
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// TICK
// -----------------------------------------------------------------------------

export function updateJuice(world, deltaSeconds) {
  world.juice.shake = Math.max(
    0,
    world.juice.shake - CONFIG.juice.shakeDecayPerSecond * deltaSeconds,
  );

  const particles = world.juice.particles;

  // Backwards, because dead particles get removed as we go.
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];

    particle.velocityY += particle.gravity * deltaSeconds;
    particle.x += particle.velocityX * deltaSeconds;
    particle.y += particle.velocityY * deltaSeconds;
    particle.life -= deltaSeconds;

    if (particle.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx, world) {
  for (const particle of world.juice.particles) {
    // Shrink as they die rather than fading. Flat opaque pixels shrinking to
    // nothing reads as 8-bit; a soft fade does not.
    const remaining = particle.life / particle.totalLife;
    const size = remaining > 0.4 ? particle.size : Math.max(1, particle.size - 1);

    ctx.fillStyle = particle.color;
    ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
  }
}
