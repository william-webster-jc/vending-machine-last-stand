# VENDING MACHINE LAST STAND — Game Plan

**The pitch:** You're a mall security guard working the night shift. Card scalpers
come in from the right, tear down your barricade, and try to reach the vending
machine to buy out every pack inside. Hold them off until sunrise. Get paid. Upgrade.
Do it again, harder.

**Inspiration:** *The Last Stand* for the structure (barricade, night shift, survive
till dawn, spend the day preparing). *Scott Pilgrim* and *Plants vs Zombies* for the
look — bright 8-bit, cartoon energy, zero horror. Shooting should feel like a arcade
cabinet, not a survival sim. DOOM-inspired 8-bit splash art on the title screen.

**Stack:** HTML5 Canvas + vanilla JavaScript (ES modules), served locally with
`python3 -m http.server`. No installs, no build step. See CLAUDE.md for how we work.

---

## Design pillars

These are the decisions everything else answers to. If a feature fights one of these,
the feature loses.

1. **The barricade is your health bar.** You have no personal health. Scalpers can't
   hurt you. The barricade is the only thing standing between them and the machine,
   and watching it splinter is the whole tension of the game.
2. **Breach is not death.** When the barricade falls, scalpers start walking toward
   the machine. You still have a window. Clearing them out after a breach is the
   most exciting thing that can happen in a run, and the game must always allow it.
3. **You can see them coming.** Side-on view, scalpers enter from the right edge with
   room to read their speed and type before they arrive. Never a surprise from
   off-screen — difficulty comes from volume and composition, not ambush.
4. **Bright, not scary.** 8-bit, saturated palette. Scalpers pop into scattered cards
   and coins, not gore.
5. **Every number lives in `config.js`.** Jace redesigns the game's feel by editing
   one file, without touching logic.

---

## The view (settled)

**Flat side-on.** You see the mall in profile, like a stage.

```
   [ sky / windows — brightens toward sunrise ]

   ┌─ machine ─┐      ║ barricade ║
   │  VENDING  │  🧍  ║▓▓▓▓▓▓▓▓▓║   🧟 🧟   🧟        ← scalpers enter here
   │           │ guard║▓▓▓▓▓▓▓▓▓║
   └───────────┘      ║▓▓▓▓▓▓▓▓▓║
   ═══════════════════════════════════════════  mall floor
        ↑ you can never cross to this side →
```

- The machine is on the **left**, solid, behind you.
- The **barricade** is a single wall spanning the screen's height, in front of you.
- **You** patrol a **roomy floor band** between them — full WASD, 8 directions.
- **Scalpers** stream in from the **right** edge.

**Confirmed:** the space behind the barricade is large enough to actually maneuver
in — back up, strafe, reposition, and keep shooting the whole time. This isn't a
tightrope; it's a real patrol area. Side-on profile sprites, full 8-direction
movement, bounded by the machine behind you and the barricade in front.

---

## How to read this plan

Every milestone is **a build you open in a browser and mess with.** Not "the movement
system" — an actual playable thing. If a milestone ends and you can't play it, it was
scoped wrong and we split it.

Each one lists **what you get**, **how you'll know it's done**, and **the one new idea**
it teaches — so the game teaches you code as it gets built.

Placeholder art (colored rectangles) carries us until your sprites arrive. Art can
land at **any** point; M11 is where the sprite system gets wired in properly, but
swapping art in and out is forever after that.

---

# PHASE 1 — A COMPLETE, REPLAYABLE GAME
*Goal: something you could hand a friend and they'd play three runs.*

### M1 — The scene
**You get:** The mall at night. Floor, vending machine, barricade, security guard,
sky. Nothing moves yet — but it's your game, on screen, in your browser. A small
frame-rate number sits in the corner as a debug readout.
**Done when:** It looks like the diagram above and the corner number sits steady
around 60.
**The one new idea:** The *game loop* — the heartbeat that redraws the screen ~60
times a second, forever. Everything in every later milestone hangs off this one thing.

### M2 — Walk the beat
**You get:** WASD/arrows move the guard in 8 directions. The machine is solid. The
barricade is solid. You can't leave the screen, and you can't get past the barricade.
**Done when:** Movement feels *immediate* — no slide, no delay. Diagonal isn't faster
than straight. You bump off the barricade cleanly instead of sticking to it.
**The one new idea:** *Delta time* — we move by "how much time has passed" rather than
"once per frame," so the game runs at the same speed on any computer.

### M3 — Draw your weapon
**You get:** Mouse aims, click fires. Bullets leave the gun, travel, and disappear
off-screen. Nothing to shoot yet — this milestone exists purely to get the *feel*
of firing right before anything depends on it.
**Done when:** Clicking feels punchy and responsive, and you can spray bullets for a
minute straight with no slowdown.
**The one new idea:** *Spawning and despawning* — things enter the world, do a job,
and get cleaned up, so the game doesn't slowly choke on its own leftovers.

### M4 — Scalpers and the barricade
**You get:** Scalpers stream in from the right, walk left, reach the barricade and
start tearing it apart. Barricade health bar. Your bullets drop them. When barricade
health hits 0, it **breaks open** — and they start walking past it toward the machine.
**Done when:** You can hold a small group off indefinitely by shooting well, and you
can watch the barricade lose a fight when you don't.
**The one new idea:** *Entities* — a list of things that each know how to update
themselves, so adding a hundred scalpers is the same code as adding one.

### M5 — The breach, and losing the machine
**You get:** A scalper that reaches the vending machine starts **buying packs** — a
visible purchase meter. Meter completes → **GAME OVER** with your stats → restart.
Kill them off the machine before it fills and you're still alive.
**Done when:** You've lost a run, *and* you've had at least one run where the
barricade fell and you cleared the floor anyway. That comeback has to feel great.
**The one new idea:** *Game states* — the game knowing whether it's PLAYING or
GAME_OVER, and behaving completely differently in each.

> **Tuning note:** how long a purchase takes is a number in `config.js`
> (`packPurchaseSeconds`). Set it to ~2s and reaching the machine is nearly fatal.
> Set it to 0 and touching the machine ends the run instantly. You'll decide by feel.

### M6 — Survive the night
**You get:** A night timer. The sky slowly lightens from black toward dawn, so you
can always tell how much is left without reading a clock. Waves scale up as the night
goes on. Sun fully up → **NIGHT SURVIVED**. Day counter increments.
**Done when:** You *want to beat your last night.* If you don't, we stop and tune
`config.js` before building anything else. **This is the most important checkpoint in
the entire plan.**
**The one new idea:** *Tuning data* — wave sizes, speeds, and spawn timing live in one
settings file you edit yourself. This is where you stop watching and start designing.

### M7 — Paycheck and upgrades
**You get:** You're paid for the night's work. A between-days screen where you spend
it: **repair barricade**, barricade max health, weapon damage, fire rate, reload
speed, move speed. Then START NIGHT, and tonight is harder than last night.
**Done when:** You feel genuinely torn about what to buy. Repairing the barricade
should compete with getting stronger, every single time.
**The one new idea:** *Persistent run state* — numbers that survive between nights
and feed back into how the next night plays.

### M8 — Title screen
**You get:** **START**, **INSTRUCTIONS**, **OPTIONS**. Instructions explains the
controls and the goal. Options holds volume and a couple of toggles. Placeholder
8-bit art now — your DOOM-inspired splash drops straight in whenever it's ready.
**Done when:** You never hit browser-refresh to start a new run again.
**The one new idea:** *Scenes* — the game swapping cleanly between whole modes
(title, playing, shop, game over) without them tripping over each other.

### M9 — Interviews: hire help
**You get:** Spend paycheck on **interviews** to hire fellow guards. Hired help holds
position and shoots scalpers on their own. They cost money up front and wages each
night, so staffing up competes with upgrading yourself.
**Done when:** You've run a night where your hires carried a wave you'd have lost
alone — and a night where you overhired and couldn't afford repairs.
**The one new idea:** *Simple AI* — a character that picks its own target and acts
without you, using the exact same shooting code you do.

**End of Phase 1: a complete game with a real reason to replay it.**

---

# PHASE 2 — IT LOOKS AND FEELS GOOD
*Goal: the gap between a prototype and a game.*

### M10 — Juice
Screen shake. Scalpers flash white and stagger backward when hit. Hit sparks, muzzle
flash, shell casings, a satisfying death pop into scattered cards. Barricade visibly
splinters as its health drops.
**Done when:** Shooting one scalper feels good in total isolation.
**The one new idea:** *Game feel* — small visual lies that make impacts read. This is
genuinely most of what "polish" means.

### M11 — Real pixel art
Your sprites replace every rectangle. Walk cycles, shoot poses, scalper animations,
barricade damage states, mall background layers. Crisp nearest-neighbour scaling, no
blur.
**The one new idea:** *Sprite sheets* — one PNG holding animation frames in a grid,
with the code picking which square to draw each frame.

### M12 — Sound
Gunshot, hit, scalper death, barricade crunch, wave incoming, breach alarm, sunrise
fanfare, cash register for the shop. A loopable night-shift track. Mute key.
**The one new idea:** *Audio pooling* — firing the same sound twelve times at once
without it popping or lagging.

### M13 — HUD, pause, options
Clean HUD: barricade health, night progress, cash, ammo, day count. Pause that
actually pauses. Working options menu. A game-over screen with real stats.
**The one new idea:** *UI state* — interface that reads from the game without the
game needing to know the interface exists.

---

# PHASE 3 — DEPTH
*Goal: reasons to play the 40th night.*

### M14 — Scalper archetypes
Distinct types, each demanding a different response:
- **Camper** — slow, high HP, parks at the barricade and grinds
- **Runner** — fast, fragile, first to the breach
- **Bulk Buyer** — huge, shoves through, buys packs alarmingly fast
- **Bot Swarm** — many tiny ones at once
- **Line Cutter** — shoves other scalpers ahead of it, disrupting your aim priority
**Done when:** A wave's *composition* changes how you play it, not just its size.

### M15 — Weapons
Pistol (infinite), shotgun (crowds at the barricade), SMG (dps, ammo hungry), railgun
(pierces a whole line of them). Number keys to swap. Ammo and reload become real.
**Done when:** You have a favourite and strong opinions about the others.
**The one new idea:** *Data-driven design* — a new weapon is a new entry in a list,
not new code.

### M16 — Barricade tech and traps
Spend on the barricade itself: reinforced plating, auto-turrets mounted on top, trip
mines in the breach zone, a repair drone that patches it mid-night.
**Done when:** Your setup is a strategy, and you have a favourite one.

### M17 — Boss nights
Every 5th night, a named boss with a telegraphed attack pattern and a phase change at
half health. **THE RESELLER** — summons bot swarms, charges the barricade, and will
absolutely buy out the machine if you let it through.
**Done when:** You lose to a boss and immediately hit restart.
**The one new idea:** *Attack patterns and telegraphs* — scripted, readable, learnable
sequences. Hard but fair.

### M18 — Perks
Every few nights, pick 1 of 3 run-altering perks. Ricochet rounds. Explosive scalpers.
Barricade that heals on kills. Double pay, half barricade health.
**Done when:** Two runs feel like different games.

### M19 — Deeper economy
Overtime bonuses, risk/reward night contracts, staff that gain experience and get
better (or quit), equipment that wears out.

---

# PHASE 4 — A REAL PRODUCT
*Goal: something you can hand to strangers.*

### M20 — Meta-progression
Saves between sessions. Permanent unlocks. High score table. Stats screen —
*"You've stopped 4,182 scalpers."*

### M21 — Difficulty and endless
Difficulty modes. Real scaling past night 30. A daily challenge seed, where everyone
plays the identical night.
**The one new idea:** *Seeded randomness* — controllable, repeatable chaos.

### M22 — Accessibility and controls
Gamepad support. Remappable keys. Screen-shake slider. Colorblind-safe palette pass.

### M23 — Ship it
A folder you upload to itch.io. Loading screen, credits, a real title. It works on
someone else's machine.

---

## Stretch ideas (unscheduled, on purpose)
Nothing here blocks anything. Keep adding.

- Two-player local co-op — one on the gun, one repairing the barricade mid-night
- Different malls — food court, convention hall, parking garage
- A story crawl between boss nights
- Destructible mall scenery
- Combo/style scoring for consecutive hits
- Scalper "leaders" that buff the group around them
- A rival security guard NPC competing with you for the bonus
- Multiple vending machines to defend at once

---

## Open questions

Nothing blocking. Noted here so they don't get lost:

- How long a pack purchase takes (`packPurchaseSeconds`) — decided by feel at M5
- Whether ammo/reload exists before M15, or the pistol stays infinite through Phase 1
  *(current plan: infinite pistol through Phase 1, reload arrives with weapons)*

---

## Status

Nothing built yet. Next up: **M1 — The scene**.

| Milestone | Status |
|---|---|
| M1 The scene | ☐ |
| M2 Walk the beat | ☐ |
| M3 Draw your weapon | ☐ |
| M4 Scalpers and the barricade | ☐ |
| M5 The breach | ☐ |
| M6 Survive the night | ☐ |
| M7 Paycheck and upgrades | ☐ |
| M8 Title screen | ☐ |
| M9 Interviews: hire help | ☐ |
| M10–M23 | ☐ |
