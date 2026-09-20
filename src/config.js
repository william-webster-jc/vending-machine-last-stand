// =============================================================================
// config.js — EVERY tunable number in the game lives in this one file.
//
// This is your design dashboard. Change a number here, refresh the browser,
// and the game looks or feels different. You never have to open a logic file
// to re-balance or re-colour anything.
//
// Nothing in here "does" anything. It's just a list of settings that the rest
// of the game reads from.
// =============================================================================

export const CONFIG = {

  // ---------------------------------------------------------------------------
  // SCREEN
  // The game is drawn at this deliberately tiny size, then scaled up by a whole
  // number (2x, 3x, 4x...) to fill your window. Scaling by whole numbers is what
  // keeps the pixels sharp and square instead of smeared. That's the 8-bit look.
  // ---------------------------------------------------------------------------
  screen: {
    width: 384,
    height: 216,
  },

  // ---------------------------------------------------------------------------
  // THE MALL
  // horizonY is where the back wall meets the floor.
  // walkTopY / walkBottomY are how far "back" and "forward" the guard's feet can
  // go. That gap is your roomy patrol band — the space you back up and strafe
  // inside while shooting. Widen it to give yourself more room to maneuver.
  // ---------------------------------------------------------------------------
  world: {
    horizonY: 118,
    walkTopY: 134,
    walkBottomY: 202,
    tileSize: 16,
  },

  // ---------------------------------------------------------------------------
  // THE VENDING MACHINE — the thing you're protecting. Sits on the far left.
  // footY is where its base rests on the floor.
  // ---------------------------------------------------------------------------
  machine: {
    x: 20,
    width: 50,
    height: 66,
    footY: 146,

    // How many packs are inside. This is your SECOND health bar: scalpers who
    // reach the machine buy them one at a time, and when the last one goes,
    // the night is lost. It's also how many packs are drawn behind the glass,
    // so the stock you see is the stock you have.
    packCount: 12,

    // How long ONE scalper takes to buy ONE pack. Two scalpers empty it twice
    // as fast, ten of them ten times as fast — so thinning the crowd genuinely
    // buys you time, which is what makes a comeback possible.
    // Drop this to 0.2 and reaching the machine is close to instant death.
    packPurchaseSeconds: 2.2,

    stockBarWidth: 44,
    stockBarHeight: 4,
    stockBarOffsetY: 10,
  },

  // ---------------------------------------------------------------------------
  // THE BARRICADE — your health bar, in wall form. Scalpers stop here and chew
  // through it. You can never walk past it.
  // ---------------------------------------------------------------------------
  barricade: {
    // Lined up with the gap between the 3rd and 4th windows.
    x: 149,
    width: 28,
    topY: 92,
    bottomY: 210,
    plankHeight: 9,

    // How much punishment the wall takes before it breaks open. This is
    // effectively your health bar for the whole night.
    maxHealth: 120,

    // Keeps YOU penned in even after the wall is smashed. Scalpers always come
    // through a breach; this is only about whether you can push forward onto
    // their side of it. Set false to let yourself advance into the rubble.
    blocksGuardWhenBroken: true,

    healthBarWidth: 40,
    healthBarHeight: 4,
    healthBarOffsetY: 12,
  },

  // ---------------------------------------------------------------------------
  // SCALPERS — they walk in from the right and tear at the barricade.
  // Different scalper types arrive in M14; for now they're all the same.
  // ---------------------------------------------------------------------------
  scalper: {
    width: 13,
    height: 26,

    maxHealth: 20,

    // Pixels per second walking left. The approach runway is about 207px, so
    // at 26 they take roughly 8 seconds to reach the wall — long enough to
    // watch them come and decide what to do about it.
    speed: 26,

    // Each scalper's speed is nudged up or down by up to this fraction, so a
    // group spreads out into a ragged line instead of marching in lockstep.
    speedVariation: 0.3,

    // How much barricade health they chew through per second, once they're on
    // it. At 6, a single scalper takes 20 seconds to break a full wall.
    attackDamagePerSecond: 6,

    // Scalpers shove each other apart rather than standing in the same spot.
    // separationY is how close in DEPTH two of them have to be before they
    // count as sharing a spot at all — stand far enough apart front-to-back
    // and you can overlap on screen quite happily.
    separationX: 9,
    separationY: 7,

    // Once the wall is down they mob the FRONT of the machine — that's where
    // the glass and the dispenser are, so it's the only place you can
    // actually buy anything. Each one picks a spot up to this many pixels
    // forward of the machine's base, giving the crowd depth instead of one
    // flat line pressed against the glass.
    crowdSpread: 44,

    // How close they get before they stop and start attacking.
    attackReach: 3,

    // TEMPORARY for M4: a steady trickle so there's something to shoot.
    // The real wave system replaces this in M6.
    spawnIntervalSeconds: 3.2,
    spawnMargin: 20,
  },

  // ---------------------------------------------------------------------------
  // THE GUARD — you. startX/startY is where you begin the night. y is your FEET,
  // not your head, because feet are what touch the floor.
  // ---------------------------------------------------------------------------
  guard: {
    startX: 110,
    startY: 180,
    width: 13,
    height: 26,

    // How fast you walk, in pixels per second. Higher = faster.
    // The patrol strip is roughly 110 pixels wide, so at 82 it takes you a
    // little over a second to cross it end to end.
    speed: 82,

    // Moving up and down is slower than moving left and right, because in a
    // side-on view "up" means walking deeper into the screen, which covers
    // less ground than walking across it. Set this to 1 for equal speed.
    verticalSpeedFactor: 0.7,

    // How much breathing room to leave between you and the machine or the
    // barricade, so you stop just short instead of clipping into them.
    clearance: 5,

    // How high up the body the shooting arm comes out of, measured up from
    // the feet. Bigger = the gun sits higher on his chest.
    shoulderHeight: 15,

    // How far the arm reaches out from the shoulder, in pixels.
    armLength: 6,
  },

  // ---------------------------------------------------------------------------
  // THE WEAPON — the pistol you start the night with. More guns arrive in M15.
  // ---------------------------------------------------------------------------
  weapon: {
    // Seconds between shots. Smaller = faster gun. 0.16 is about 6 shots a
    // second, which is fast enough to feel good and slow enough to aim.
    fireIntervalSeconds: 0.16,

    // Hold the mouse button to keep firing. Set to false and every shot needs
    // its own click.
    autoFire: true,

    // How far past the hand the barrel sticks out — bullets are born here, so
    // they appear to leave the gun rather than the guard's chest.
    barrelLength: 5,
  },

  // ---------------------------------------------------------------------------
  // BULLETS
  // ---------------------------------------------------------------------------
  bullet: {
    // Pixels per second. The screen is only 384 wide, so 420 crosses it in
    // under a second — fast, but you can still see it travel.
    speed: 420,

    width: 4,
    height: 2,

    // How much health one bullet takes off a scalper. At 10 against 20 health,
    // every scalper needs exactly two hits.
    damage: 10,

    // How far off-screen a bullet gets before we throw it away. A little
    // margin stops them visibly blinking out right at the edge.
    despawnMargin: 12,
  },

  // ---------------------------------------------------------------------------
  // PALETTE — bright, saturated, cartoon. Scott Pilgrim / Plants vs Zombies.
  // Swap any of these hex codes to re-skin the whole game instantly.
  // ---------------------------------------------------------------------------
  colors: {
    // Night sky seen through the mall windows
    skyNight: '#1b1b3a',
    star: '#f4f0d8',
    moon: '#f7f3d9',

    // Mall interior back wall
    wallBack: '#3c3556',
    wallTrimUpper: '#4e4670',
    wallBaseboard: '#2a2440',
    windowFrame: '#241f38',

    // Floor tiles
    floorLight: '#cba97c',
    floorDark: '#b08f63',
    floorGrout: '#93785a',
    floorContactShadow: '#7d654a',

    // Vending machine
    machineBody: '#d6403f',
    machineDark: '#8d2020',
    machineTrim: '#f4f1e4',
    machineGlass: '#27375c',
    machineGlassShine: '#4d6da0',
    machineSlot: '#1a1626',
    packColors: ['#f3c44f', '#4fcbb0', '#e46fa9', '#6aa8f4', '#f58d4f', '#b581ef'],

    // Barricade
    barricadeWood: '#8c5c33',
    barricadeWoodLight: '#ab7342',
    barricadeWoodDark: '#5f3d21',
    barricadeNail: '#43342a',

    // Security guard
    guardUniform: '#2e4d91',
    guardUniformDark: '#1e3365',
    guardSkin: '#eab58d',
    guardCap: '#17253f',
    guardBoot: '#2b2b35',
    gunMetal: '#4d4d59',

    // Scalpers — bright and cartoonish, never menacing
    scalperHoodie: '#8a54e0',
    scalperHoodieDark: '#6234b4',
    scalperSkin: '#d99a6c',
    scalperPants: '#39394d',
    scalperShoe: '#ececf2',
    scalperBackpack: '#e0547a',
    scalperPhone: '#5ad6e8',

    // Health bars
    healthBarOutline: '#1a1522',
    healthBarEmpty: '#453a4d',
    healthBarGood: '#5fd65f',
    healthBarWarning: '#e8c34a',
    healthBarCritical: '#e05454',

    // Game over screen
    gameOverVeil: 'rgba(12, 8, 20, 0.78)',
    gameOverTitle: '#ff5d5d',
    gameOverText: '#f4f0e4',
    gameOverDim: '#9a93ad',
    gameOverHint: '#7ae0b0',

    // Bullets and crosshair
    bulletCore: '#fff3a8',
    bulletEdge: '#f2913c',
    crosshair: '#f4f0d8',

    // Debug readout
    debugText: '#9dff7a',
    debugLabel: '#7a7a96',
  },

  // ---------------------------------------------------------------------------
  // GAME OVER
  // ---------------------------------------------------------------------------
  gameOver: {
    // A short pause before the restart works, so the click you were firing
    // with doesn't skip straight past the screen you just earned.
    restartDelaySeconds: 1.2,
  },

  // ---------------------------------------------------------------------------
  // GAME LOOP
  // maxDeltaSeconds stops the game lurching if you tab away and come back —
  // without it, the game would try to catch up on all the missed time at once.
  // ---------------------------------------------------------------------------
  loop: {
    maxDeltaSeconds: 0.05,
  },

  // ---------------------------------------------------------------------------
  // DEBUG
  // Set showDebug to false to hide the corner readouts.
  // ---------------------------------------------------------------------------
  debug: {
    showDebug: true,
    fpsSampleSeconds: 0.5,
    buildLabel: 'M5 - THE BREACH',

    // Shows your exact position on screen. Handy while testing movement.
    showPosition: true,

    // Shows how many bullets are alive right now. If this number climbs and
    // never comes back down, bullets aren't being cleaned up properly.
    showBulletCount: true,

    // Shows how many scalpers are on the floor.
    showScalperCount: true,

    // A little health bar over every scalper's head, so you can watch damage
    // land while testing. Turn off for a clean-looking game.
    showScalperHealth: true,
  },
};
