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
    maxHealth: 200,

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

    // How many bullets it takes to drop one, on night one, with the pistol
    // you start with. Their actual health is worked out from this and the
    // base bullet damage, so these numbers mean what they say.
    bulletsToKillOnNightOne: 3,

    // Scalpers get tougher every night: night 2 takes 4 bullets, night 3
    // takes 5, and so on. Buying HEAVIER ROUNDS is what claws that back.
    extraBulletsPerNight: 1,

    // Each scalper gets its own walking speed somewhere in this range, in
    // pixels per second. A WIDE range is what makes a crowd read as a crowd:
    // stragglers you can ignore for a moment, and runners you have to deal
    // with right now.
    //
    // The approach runway is about 207px, so a slow one takes ~10 seconds to
    // cross it and a fast one about 4.
    speedMin: 20,
    speedMax: 52,

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

    // How far off the right edge they appear, so they walk into view rather
    // than blinking into existence. How MANY arrive is set by night.js now.
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

    // How far past the hand the barrel sticks out. Shots are born here, so
    // they appear to leave the gun rather than the guard's chest.
    barrelLength: 5,
  },

  // ---------------------------------------------------------------------------
  // THE WEAPON — the pistol you start the night with. More guns arrive in M15.
  // ---------------------------------------------------------------------------
  // A short delay after swapping weapons, so you can't dodge a reload by
  // flicking between two guns.
  weaponSwapSeconds: 0.22,

  // ---------------------------------------------------------------------------
  // WEAPONS
  //
  // Every gun is an entry in this list. Adding a fifth one is a new entry and
  // nothing else — no new code. The tradeoffs come entirely from these
  // numbers, so this is where you balance the whole arsenal.
  //
  //   magazineSize        rounds before you have to reload
  //   reloadSeconds       how long that takes, stood there defenceless
  //   fireIntervalSeconds delay between shots
  //   damage              PER PELLET, before your damage upgrade
  //   pelletsPerShot      shotguns fire several at once
  //   spreadDegrees       how wide the cone is; accuracy, basically
  // ---------------------------------------------------------------------------
  weapons: [
    {
      id: 'pistol',
      name: 'PISTOL',
      blurb: 'RELIABLE. NEVER LEAVES YOU.',
      magazineSize: 12,
      reloadSeconds: 1.1,
      fireIntervalSeconds: 0.16,
      damage: 10,
      pelletsPerShot: 1,
      spreadDegrees: 2,
      bulletSpeed: 420,
      autoFire: true,
      cost: 0,
      kind: 'gun',
    },
    {
      id: 'shotgun',
      name: 'SHOTGUN',
      blurb: 'CLEARS THE BARRICADE',
      magazineSize: 6,
      reloadSeconds: 1.9,
      fireIntervalSeconds: 0.62,
      damage: 8,
      pelletsPerShot: 6,
      spreadDegrees: 18,
      bulletSpeed: 370,
      autoFire: false,
      cost: 220,
      kind: 'gun',
    },
    {
      id: 'uzi',
      name: 'UZI',
      blurb: 'FAST AND SLOPPY',
      magazineSize: 32,
      reloadSeconds: 2.3,
      fireIntervalSeconds: 0.055,
      damage: 5,
      pelletsPerShot: 1,
      spreadDegrees: 11,
      bulletSpeed: 460,
      autoFire: true,
      cost: 260,
      kind: 'gun',
    },
    {
      id: 'grenades',
      name: 'GRENADES',
      blurb: 'LOBBED. HITS A WHOLE CROWD.',
      magazineSize: 3,
      reloadSeconds: 3.4,
      fireIntervalSeconds: 0.9,
      damage: 30,
      pelletsPerShot: 1,
      spreadDegrees: 0,
      autoFire: false,
      cost: 300,
      kind: 'grenade',

      // Grenade-only. It's lobbed rather than fired, so it travels at a
      // throwable pace, arcs through the air, and goes off on a fuse.
      throwSpeed: 165,
      fuseSeconds: 0.9,
      blastRadius: 34,
      arcHeight: 22,
      explosionSeconds: 0.28,
    },
  ],

  // ---------------------------------------------------------------------------
  // BULLETS
  // ---------------------------------------------------------------------------
  bullet: {
    // Pixels per second. The screen is only 384 wide, so 420 crosses it in
    // under a second — fast, but you can still see it travel.
    speed: 420,

    width: 4,
    height: 2,

    // The REFERENCE damage used to work out how much health a scalper has.
    // It matches the starting pistol, which is what 'three bullets to kill'
    // is measured against. Each weapon carries its own real damage.
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

    // Title and menus — bright fills over a heavy black keyline, the way a
    // Scott Pilgrim menu is built.
    titleVeil: 'rgba(10, 7, 20, 0.92)',
    inkOutline: '#0d0a14',
    titleMain: '#3fb4f0',
    titleSub: '#ec3b46',
    titleRule: '#2a2340',

    menuItem: '#3fb4f0',
    menuItemSelected: '#ffffff',

    // The selected row sits on a solid bar rather than just changing colour.
    // The bar is the bright one: against a dark screen a black bar vanishes,
    // so the colour has to come from the highlight itself.
    menuHighlightBar: '#f0408a',
    menuHighlightEdge: '#8a1a4c',
    menuHighlightAccent: '#ffe27a',

    // Menu screens get their own patterned backdrop rather than a dimmed
    // view of the mall, so a menu reads as a menu.
    menuBackdrop: '#16224a',
    menuBackdropAlt: '#1b2a58',

    // Shop
    shopVeil: 'rgba(14, 10, 24, 0.94)',
    shopPanel: '#1b2a52',
    shopPanelEdge: '#e8ecf5',
    shopName: '#f4f0e4',
    shopBlurb: '#9a93ad',
    cash: '#7ae06a',
    cashShort: '#e06a6a',
    shopMaxed: '#6ad0e0',

    // Night survived screen
    sunriseTitle: '#ffd479',
    sunriseVeil: 'rgba(24, 14, 30, 0.74)',

    // Sun and wave banner
    sun: '#ffe9a8',
    sunGlow: '#ffb45e',
    waveBanner: '#ffe27a',
    waveBannerShadow: '#301a2a',

    // Game over screen
    gameOverVeil: 'rgba(12, 8, 20, 0.78)',
    gameOverTitle: '#ff5d5d',
    gameOverText: '#f4f0e4',
    gameOverDim: '#9a93ad',
    gameOverHint: '#7ae0b0',

    // Hired guards — same uniform, different colours, so they read as
    // colleagues rather than as a different species.
    hireUniform: '#2f7a5c',
    hireUniformDark: '#1d5440',
    hireCap: '#14382c',

    // Weapon slot bar
    slotEmpty: '#14182c',
    slotFilled: '#232a4a',
    slotEdge: '#3a4470',
    slotEdgeActive: '#ffe27a',
    slotNumber: '#6d779e',
    slotNumberActive: '#ffe27a',
    iconMetal: '#8a93ad',
    iconMetalLight: '#ccd3e5',
    iconMetalDark: '#525a78',
    iconGrip: '#8a5a32',
    iconBrass: '#e0b040',

    // Ammo readout and grenades
    ammoFull: '#e8ecf5',
    ammoLow: '#f0a03c',
    ammoEmpty: '#e05454',
    reloadBar: '#3fb4f0',
    reloadBarTrack: '#1b2a52',
    grenadeBody: '#4a7a3a',
    grenadeTop: '#2e4d28',
    blastInner: '#fff3c4',
    blastOuter: '#f08a3c',

    // Bullets and crosshair
    bulletCore: '#fff3a8',
    bulletEdge: '#f2913c',
    crosshair: '#f4f0d8',

    // Debug readout
    debugText: '#9dff7a',
    debugLabel: '#7a7a96',
  },

  // ---------------------------------------------------------------------------
  // THE NIGHT
  //
  // A shift runs for a fixed length of time and ends at sunrise. Waves are
  // scheduled inside that window rather than waiting for you to clear them,
  // which is what lets the sky double as the clock.
  // ---------------------------------------------------------------------------
  night: {
    // How long one night lasts, in seconds. This is the single biggest dial
    // on the whole game — it sets how long a run takes and how much
    // punishment a night adds up to.
    durationSeconds: 120,

    // How many scalpers turn up over the whole of night one.
    //
    // They arrive as ONE CONTINUOUS ASSAULT, not as separate waves with rests
    // in between. A night is a wave. Night one is wave one.
    assaultSizeOnNightOne: 80,

    // Added to the assault for every night you survive. Night three brings
    // 140 of them.
    assaultGrowthPerNight: 30,

    // How much denser the end of the night is than the start. At 3, the last
    // scalpers pour in three times as fast as the first ones trickled.
    //
    // This is the shape of the pressure: a manageable opening that builds
    // into something you're barely holding as the sun comes up.
    pressureBuildUp: 3,

    // Scalpers get faster every night.
    speedGrowthPerNight: 0.08,

    // How long the "NIGHT 3" banner stays up when a shift begins.
    nightBannerSeconds: 2.4,
  },

  // ---------------------------------------------------------------------------
  // THE SKY
  //
  // The clock you read by looking up. Each stage is a point in the night, the
  // sky colour there, and how visible the stars are. Everything between two
  // stages is blended, so the change is continuous rather than snapping.
  // ---------------------------------------------------------------------------
  sky: {
    stages: [
      { at: 0.00, color: '#161634', starVisibility: 1.00 },
      { at: 0.50, color: '#1f1f45', starVisibility: 0.95 },
      { at: 0.72, color: '#3b3163', starVisibility: 0.45 },
      { at: 0.86, color: '#7e4f7c', starVisibility: 0.10 },
      { at: 0.94, color: '#c9707a', starVisibility: 0.00 },
      { at: 0.98, color: '#e8a068', starVisibility: 0.00 },
      { at: 1.00, color: '#ffd9a2', starVisibility: 0.00 },
    ],

    // When the moon has fully set and when the sun starts to climb.
    moonSetsAt: 0.70,
    sunRisesAt: 0.80,

    // A warm wash over the whole mall as dawn arrives, so the room lights up
    // with the sky instead of staying pitch dark behind a bright window.
    dawnWashStartsAt: 0.74,
    dawnWashMaxAlpha: 0.30,
    dawnWashColor: '255, 190, 120',
  },

  // ---------------------------------------------------------------------------
  // DIFFICULTY
  //
  // The dials you've been editing by hand, packaged into choices a player can
  // make from the options screen. Each is a multiplier on the real numbers.
  // ---------------------------------------------------------------------------
  difficulty: {
    presets: [
      {
        id: 'quiet',
        name: 'QUIET SHIFT',
        blurb: 'FEWER, SLOWER, STURDIER WALL',
        assaultScale: 0.65,
        speedScale: 0.85,
        wallScale: 1.35,
      },
      {
        id: 'nightshift',
        name: 'NIGHT SHIFT',
        blurb: 'THE JOB AS ADVERTISED',
        assaultScale: 1,
        speedScale: 1,
        wallScale: 1,
      },
      {
        id: 'blackfriday',
        name: 'BLACK FRIDAY',
        blurb: 'MORE, FASTER, WEAKER WALL',
        assaultScale: 1.45,
        speedScale: 1.15,
        wallScale: 0.8,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // PAY AND UPGRADES
  //
  // What you earn for a night's work, and what you can spend it on the next
  // day. Every effect is a number here, so the whole economy is yours to bend.
  // ---------------------------------------------------------------------------
  economy: {
    // Flat pay for turning up and surviving.
    basePayPerNight: 40,

    // Piece rate, so playing well pays better than merely surviving.
    payPerScalperStopped: 3,
    payPerPackSaved: 6,

    // A bonus for never letting the wall fall. This is what makes repairing
    // compete with upgrading — a strong wall keeps paying you back.
    barricadeHeldBonus: 30,

    // What it costs to put one point of health back into the barricade.
    // Damage carries over between nights, so this bill follows you.
    repairCostPerPoint: 0.55,

    // Each upgrade is just an entry in this list. Adding a new one is a new
    // entry plus a line in getStats() — no new systems.
    items: [
      {
        id: 'reinforce',
        name: 'REINFORCE WALL',
        blurb: 'MAX BARRICADE',
        effectPerLevel: 40,
        maxLevel: 5,
        baseCost: 70,
        costGrowth: 45,
      },
      {
        id: 'damage',
        name: 'HEAVIER ROUNDS',
        blurb: 'BULLET DAMAGE',
        // A PERCENTAGE rather than a flat bonus, so it helps every weapon
        // equally. A flat +4 would be a 40% boost to the pistol and an 80%
        // boost to the uzi's weaker rounds.
        effectPerLevel: 0.18,
        maxLevel: 5,
        baseCost: 60,
        costGrowth: 40,
      },
      {
        id: 'firerate',
        name: 'FASTER TRIGGER',
        blurb: 'SHOTS PER SECOND',
        // A multiplier on the delay between shots, so each level shaves 12%
        // off. Multiplying rather than subtracting stops it ever reaching a
        // delay of zero, which would fire infinite bullets in one frame.
        effectPerLevel: 0.88,
        maxLevel: 5,
        baseCost: 65,
        costGrowth: 45,
      },
      {
        id: 'boots',
        name: 'BETTER BOOTS',
        blurb: 'MOVE SPEED',
        effectPerLevel: 12,
        maxLevel: 4,
        baseCost: 50,
        costGrowth: 35,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // HIRED HELP
  //
  // Guards you interview and take on. They hold a post and shoot on their own.
  //
  // The tension is the wages: they cost money up front AND every night after,
  // so a big crew eats the paycheck that would have bought you upgrades. Hire
  // too many and you can't afford to keep them.
  // ---------------------------------------------------------------------------
  help: {
    maxHires: 4,

    // The first interview is cheap; each one after costs more, because good
    // people are harder to find at 2am.
    hireBaseCost: 170,
    hireCostGrowth: 130,

    // Paid out of every night's wages, per guard, forever.
    wagePerNight: 42,

    // They're worse shots than you: less damage, slower, sloppier. They're
    // extra bodies, not a replacement for playing well.
    damage: 7,
    fireIntervalSeconds: 0.62,
    // Far enough that a guard posted at the back of the floor can still cover
    // the barricade. Any shorter and the rear posts never fire.
    range: 175,
    bulletSpeed: 380,
    spreadDegrees: 7,

    // How long after spotting someone before they open fire, so a fresh
    // target isn't hit the instant it walks into range.
    reactionSeconds: 0.25,
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
    buildLabel: 'WEAPONS + RELOAD',

    // Shows your exact position on screen. Handy while testing movement.
    showPosition: true,

    // Shows how many bullets are alive right now. If this number climbs and
    // never comes back down, bullets aren't being cleaned up properly.
    showBulletCount: true,

    // Shows how many scalpers are on the floor.
    showScalperCount: true,

  },
};
