# UI/UX Direction — v0.1

**Inspiration:** Yoshi's Crafted World, as catalogued on the [Game UI Database](https://www.gameuidatabase.com/gameData.php?id=297).

**Scope:** this file covers layout, components and motion for the menus and race display. Colors, the font and the 3D look come from `STYLE_GUIDE.md`, and where the two disagree, the style guide wins.

> **Style reference, not a clone target.** Don't copy Nintendo or Yoshi assets, fonts, characters, layouts, colors, or the cardboard and felt textures. Borrow the *principles* only.

---

## 1. Why this reference

Crafted World keeps its interface clear on top of busy, colorful scenes, and it does so with warmth: things feel handmade, bouncy and tactile. We have the same problem in miniature. A warm diorama sits behind small numbers that have to be readable at a glance on a phone. We borrow the clarity and the warmth, not the craft theme.

## 2. Principles

1. **Layered paper construction.** Each panel is a base shape with a darker, offset shape behind it, so it looks like a cutout sitting a few millimeters above the scene.
2. **Numbers stand on their own.** Race numbers are big, bold and rounded, with a dark outline and a soft shadow, so they read over the scene without a backing box.
3. **Keep the race display minimal.** Each corner holds an icon plus a number, and nothing else. The race is the show.
4. **Chunky, matte icons.** Thick, rounded, two-tone shapes that echo the low-poly look. No gloss and no bevels (see Style Guide §2).
5. **Springy motion.** Interface elements overshoot slightly and settle. Nothing moves at a harsh constant speed. The 3D scene itself stays calm.
6. **Big moments get a stage.** Finishing the race and setting a personal best pop in like a card on a little stage, not a box fading in.
7. **The run is a path.** The run's progress (start → laps 1–4 → finish) is drawn as a literal dotted path with stops along it.

## 3. Screens

| Screen | What's on it | Notes |
|---|---|---|
| **Title** | Logo, Play, Leaderboard | Diorama visible behind it. Logo in Baloo 2 800, cream with a dark outline. |
| **Choice round** | Run path strip + 3 choice cards | Before the race and after laps 1–3. See §5. |
| **Race display** | Laps, clock, position, kick | See §4. |
| **Results** | Place, time, PB check | Uses the Big Moment modal (§8). |
| **Leaderboard** | Personal bests over time | Dark panel list. Rows ≥ 44px. Your rows get a You-green left bar, and the PB row gets a gold star. |

## 4. Race display

**Layout (844 × 390 landscape):**
- **Top-left:** 4 lap pips (●●○○) with the current pip pulsing gently, "LAP 2/4", and the race clock.
- **Top-right:** your position in large type ("3rd") with a small "/8" beside it.
- **Bottom-center:** a gold "KICK" chip, shown only while the kick is active. It matches the gold glow on your runner.
- Everything else stays clear. Respect `env(safe-area-inset-*)` so nothing hides under a notch.
- If numbers get hard to read over bright parts of the scene, add a soft dark radial glow behind the cluster. Don't add a box.

**Numbers:**
```css
.hud-num {
  font: 800 30px/1 'Baloo 2', system-ui, sans-serif;  /* clock 28–32px, lap/position 22–26px */
  color: var(--cream);
  -webkit-text-stroke: 6px var(--panel-deep);
  paint-order: stroke fill;               /* keeps the stroke outside the letter */
  text-shadow: 0 3px 6px rgba(20, 37, 37, .35);
  font-variant-numeric: tabular-nums;
}
```
- Check on iOS Safari. If the stroke looks off there, fall back to an outline built from `text-shadow`.
- Make sure the clock digits don't shift sideways as they tick. If Baloo 2 lacks fixed-width digits, give each digit its own fixed-width box.

## 5. Choice cards

- **Layout:** three cards in a row, about 230 × 280px each with 16px gaps. Above them sits the **run path strip**: Start → Lap 1 → Lap 2 → Lap 3 → Lap 4 → Finish, drawn as a dotted cream path with chunky stops. The current stop pulses gently.
- **Card anatomy:** a category chip, an icon, a title (20–22px, weight 700), and an effect line (15px, weight 500, two lines max).
- **Cards are cream paper** (cream background with ink text) laid on top of the dark scene, so they read like physical cards.
- **Interaction:** tap to select. The selected card lifts 6px and gets a gold outline while the others dim to 60%. Then tap **Continue** to confirm, which prevents accidental picks.
- **Category colors** (if choices have categories): chips in `oak`, `plum`, `navy` or `sky`. **Never use You green or gold**, since those already mean "you" and "kicking."
- **Entrance:** cards pop in one after another, 60ms apart, with the spring easing.

## 6. Panels and buttons

```css
:root {
  --spring: cubic-bezier(.34, 1.56, .64, 1);  /* overshoot, then settle */
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --t-fast: 120ms; --t-med: 260ms; --t-big: 420ms;
}

.panel {                                  /* dark panel with a paper layer */
  background: var(--panel);
  color: var(--cream);
  border-radius: var(--radius);
  box-shadow: 0 5px 0 var(--panel-deep), 0 10px 20px rgba(20, 37, 37, .25);
  outline: 2px dashed rgba(244, 236, 216, .25);   /* "lane marking" stitch */
  outline-offset: -8px;
}

.card {                                   /* cream paper card */
  background: var(--cream);
  color: var(--ink);
  border-radius: var(--radius);
  box-shadow: 0 6px 0 #CDBB98, 0 12px 20px rgba(20, 37, 37, .2);
}

.btn {                                    /* primary pill */
  min-height: 44px; padding: 0 22px;
  border-radius: var(--pill);
  background: var(--gold); color: var(--ink); font-weight: 700;
  box-shadow: 0 4px 0 #B8913F;            /* brass offset layer */
  transition: transform var(--t-fast) var(--spring), box-shadow var(--t-fast) var(--spring);
}
.btn:active { transform: translateY(3px) scale(.96); box-shadow: 0 1px 0 #B8913F; }
```

- The dashed inner outline stands in for the reference's stitched edges, reworked as track lane markings.
- Secondary buttons use the same pill shape with a transparent fill and a 2px cream border.

## 7. Motion

- **Entrances:** scale from 0.9 to 1 with `--spring`, over `--t-med`. Big moments use `--t-big`.
- **Exits:** faster than entrances, using `--ease-out` with no overshoot.
- **Presses:** a quick squash to 96%, then spring back.
- **Numbers that land** (final time, position): tick up, then land with a small 1.08 → 1 bounce.
- **Reduced motion:** when `prefers-reduced-motion` is set, replace scaling and bouncing with simple fades.
- The 3D scene follows Style Guide §9. The springiness lives in the interface only.

## 8. Big Moment modal

One reusable component, used for the **race result** and **New Personal Best** (and later for medals or unlocks).

- A cream card on a dark scrim. It pops in with `--spring` over `--t-big`.
- A ribbon or podium motif built as inline SVG, using original shapes only.
- **Confetti:** 20–30 small paper pieces done in DOM/CSS, in `cream`, `gold`, `track` and `lavender`. They fall for about 1.2s, then the modal holds with a Continue button.
- This is a second exception to the "calm, no particles" rule. **Add it to Style Guide §9** alongside the kick.

## 9. Icons

- Use inline SVG, original art only. The starter set is a stopwatch, a lap flag, a medal ribbon, a running shoe (for the kick) and a card.
- Build them from thick rounded shapes in two flat tones: a base plus one darker facet, echoing the low-poly look.
- Cream on dark panels, ink on cream cards. Minimum size 20px in the race display and 24px in menus.

## 10. Don't

- Copy Nintendo or Yoshi assets, fonts, characters, layouts, colors, or cardboard and felt textures.
- Use glossy or beveled icons. Everything stays matte.
- Use red, yellow or green meters, because green means you and gold means kicking.
- Put opaque bars across the race display.
- Use linear motion anywhere in the interface.
