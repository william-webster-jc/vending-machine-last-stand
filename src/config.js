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
  },

  // ---------------------------------------------------------------------------
  // THE BARRICADE — your health bar, in wall form. Scalpers stop here and chew
  // through it. You can never walk past it.
  // ---------------------------------------------------------------------------
  barricade: {
    x: 204,
    width: 28,
    topY: 92,
    bottomY: 210,
    plankHeight: 9,
  },

  // ---------------------------------------------------------------------------
  // THE GUARD — you. startX/startY is where you begin the night. y is your FEET,
  // not your head, because feet are what touch the floor.
  // ---------------------------------------------------------------------------
  guard: {
    startX: 140,
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

    // Debug readout
    debugText: '#9dff7a',
    debugLabel: '#7a7a96',
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
    buildLabel: 'M2 - WALK THE BEAT',

    // Shows your exact position on screen. Handy while testing movement.
    showPosition: true,
  },
};
