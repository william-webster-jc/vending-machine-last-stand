# VENDING MACHINE LAST STAND — Game Plan

**The pitch:** 8-bit top-down arena. You defend a vending machine from waves of card
scalpers who want to loot it. Survive as long as you can. Get stronger between waves.

**Stack:** HTML5 Canvas + vanilla JavaScript (ES modules), served locally with
`python3 -m http.server`. No installs, no build step. See CLAUDE.md for the rules
of how we work.

---

## How to read this plan

Every milestone is a **playable build**. Not "the movement system" — an actual thing
you open in a browser and mess with. If a milestone ends and you can't play it, it
was scoped wrong and we split it.

Each milestone lists:
- **You get:** what's new and playable
- **Feels done when:** the specific thing you check to call it finished
- **Plain-English concept:** the one new idea introduced (so the game teaches you code)

Milestones are ordered so the game is *fun* as early as possible — the core loop
lands at M6, and everything after that is depth.

Placeholder art (colored rectangles) is used until you drop in real sprites. Art can
arrive at ANY point — M8 is where we wire in the sprite system, but you can swap art
in and out forever after that.

---

# PHASE 1 — A GAME EXISTS
*Goal: from empty folder to "I am shooting things."*

### M1 — Black screen, beating heart
**You get:** A web page with a black game area that says the frame count. That's it.
**Feels done when:** The number climbs smoothly and doesn't stutter.
**Plain-English concept:** The *game loop* — the game redraws itself ~60 times a second,
forever. Every single thing later hangs off this one heartbeat.

### M2 — You, and you can walk
**You get:** A player square you move with WASD/arrows, top-down, 8 directions.
**Feels done when:** Movement feels *immediate* — no slide, no delay, no getting stuck
on edges. Diagonal isn't faster than straight.
**Plain-English concept:** *Input state* and *delta time* — we track which keys are
held down, and we move by "how much time passed," so the game runs the same speed on
any computer.

### M3 — The vending machine
**You get:** The machine in the center of the arena, with a health bar. Walls you
can't walk through. A camera-free fixed arena screen.
**Feels done when:** You can't walk through the machine or off the map.
**Plain-English concept:** *Collision* — two rectangles overlapping, and what to do
about it.

### M4 — Scalpers
**You get:** Enemies that spawn at the map edges and walk straight at the vending
machine. They chip its health. If it hits zero, "GAME OVER" and you can restart.
**Feels done when:** You can lose. Losing feels bad in a good way.
**Plain-English concept:** *Entities and a game state machine* — a list of things that
each update themselves, and the game knowing whether it's in PLAYING or GAME_OVER.

### M5 — Fight back
**You get:** Aim with the mouse, click to shoot. Bullets kill scalpers.
**Feels done when:** You can hold off a trickle of enemies indefinitely by playing well.
**Plain-English concept:** *Spawning and despawning* — things enter the world, do their
job, and get cleaned up so the game doesn't slowly choke.

### M6 — WAVES — **the game is now a game**
**You get:** Wave 1, 2, 3... each with more/faster scalpers. A breather between waves.
Wave counter on screen. Your score = waves survived.
**Feels done when:** You *want to beat your last run.* If you don't, we tune numbers
before moving on — this is the most important checkpoint in the whole plan.
**Plain-English concept:** *Tuning data* — enemy counts and speeds live in one settings
file you can edit yourself without touching game logic. This is where you start
designing, not just watching.

---

# PHASE 2 — IT LOOKS AND FEELS GOOD
*Goal: the thing that separates a prototype from a game.*

### M7 — Juice
**You get:** Screen shake on hits. Enemies flash white and knock back. Hit sparks.
Muzzle flash. A satisfying death pop.
**Feels done when:** Shooting one enemy feels good with your eyes closed to everything
else.
**Plain-English concept:** *Game feel* — tiny visual lies that make impacts read.
This is genuinely most of what "polish" means.

### M8 — Real pixel art
**You get:** Your sprites replace every rectangle. Walk animations. Proper 8-bit
palette. Crisp nearest-neighbour scaling (no blur).
**Feels done when:** It looks like the game in your head.
**Plain-English concept:** *Sprite sheets* — one PNG with animation frames in a grid,
and the code picks which square to draw.

### M9 — Sound
**You get:** Shoot, hit, death, wave-start, machine-damaged sounds. A loopable track.
Mute key.
**Feels done when:** Turning sound off makes the game feel noticeably worse.
**Plain-English concept:** *Audio pooling* — playing the same sound 12 times at once
without it popping or lagging.

### M10 — HUD & menus
**You get:** Title screen, pause, game over with stats, restart. Clean HUD: machine
health, wave, ammo, score.
**Feels done when:** You never see a raw browser refresh to start a new run.
**Plain-English concept:** *Scenes* — the game swapping between whole modes cleanly.

---

# PHASE 3 — DEPTH (the ambitious part)
*Goal: reasons to play the 40th run.*

### M11 — Scalper archetypes
**You get:** Distinct enemy types, each demanding a different response:
- **Camper** — slow, high HP, soaks damage
- **Sniper Bot** — stops at range and shoots you
- **Runner** — fast, fragile, beelines the machine
- **Bulk Buyer** — huge, shoves you, drains the machine fast
- **Bot Swarm** — many tiny ones at once
**Feels done when:** A wave's *composition* changes how you play it, not just its size.
**Plain-English concept:** *Shared behaviour with variations* — one enemy blueprint,
many configurations.

### M12 — Currency & the shop
**You get:** Scalpers drop cash. Between waves, spend it at the vending machine:
fire rate, damage, move speed, max machine health, reload speed.
**Feels done when:** You feel torn about what to buy.
**Plain-English concept:** *Persistent run state* — numbers that survive between waves
and feed back into your stats.

### M13 — Weapons
**You get:** Multiple weapons with real tradeoffs — pistol (infinite), shotgun (crowds),
SMG (dps, ammo hungry), railgun (pierces a line). Swap with number keys. Ammo + reload.
**Feels done when:** You have a favourite and an opinion about the others.
**Plain-English concept:** *Data-driven design* — a new weapon is a new entry in a list,
not new code.

### M14 — Defenses
**You get:** Place things between waves — barricades, auto-turrets, trip mines, a
repair drone. They cost cash and can be destroyed.
**Feels done when:** Your arena layout is a strategy, and you have a favourite layout.
**Plain-English concept:** *Placement mode* — the game entering a different interaction
state with its own rules and preview.

### M15 — Boss waves
**You get:** Every 5th wave, a named boss with a telegraphed attack pattern and a phase
change at half health. e.g. **THE RESELLER** — summons bots, charges the machine.
**Feels done when:** You lose to a boss and immediately hit restart.
**Plain-English concept:** *Attack patterns and telegraphs* — scripted, readable,
learnable sequences. Fair difficulty.

### M16 — Perks / draft
**You get:** Every few waves, pick 1 of 3 run-altering perks. Ricochet bullets.
Explosive scalpers. Vampiric machine. Double cash, half health.
**Feels done when:** Two runs feel like different games.
**Plain-English concept:** *Modifier stacking* — perks that change core rules without
core code knowing about each perk.

---

# PHASE 4 — A REAL PRODUCT
*Goal: something you can hand to someone.*

### M17 — Meta-progression
**You get:** Saves between sessions. Unlock weapons/perks permanently. High score table.
Stats screen. "You've killed 4,182 scalpers."
**Plain-English concept:** *Local save data* — writing to the browser's storage and
reading it back safely, including when it's missing or corrupt.

### M18 — Difficulty & endless scaling
**You get:** Difficulty modes. Endless mode with real scaling past wave 30. Daily
challenge seed (everyone gets the same run).
**Plain-English concept:** *Seeded randomness* — controllable, repeatable chaos.

### M19 — Accessibility & controls
**You get:** Gamepad support. Remappable keys. Screen-shake slider. Colorblind-safe
palette check. Pause-safe everything.
**Plain-English concept:** *Input abstraction* — the game asks "is FIRE pressed,"
not "is the mouse clicked."

### M20 — Ship it
**You get:** A single folder you can upload to itch.io. Loading screen. Mobile/touch
fallback if we want it. Credits. A real title.
**Plain-English concept:** *Packaging* — asset preloading and making it work on
someone else's machine.

---

## Stretch ideas (unscheduled, on purpose)
Keep adding to this list. Nothing here blocks anything.

- Two-player local co-op
- Multiple arenas — mall food court, convention hall, parking garage
- A story crawl between boss waves
- Weather/time-of-day passes over the arena
- Destructible environment
- Combo/multiplier scoring for style
- Scalper "leaders" that buff nearby enemies
- A rival defender NPC who competes for kills

---

## Status

Nothing built yet. Next up: **M1**.

| Milestone | Status |
|---|---|
| M1 Game loop | ☐ |
| M2 Player movement | ☐ |
| M3 Vending machine + walls | ☐ |
| M4 Scalpers + losing | ☐ |
| M5 Shooting | ☐ |
| M6 Waves (core loop) | ☐ |
| M7–M20 | ☐ |
