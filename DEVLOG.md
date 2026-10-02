# Dev Log

Short entries, every session. This becomes the portfolio and essay material.

## Credits and Tools
- **Design, cards, race model:** ______
- **Build:** ______, using Claude Code (Anthropic) as an AI coding assistant
- **Code written by hand:** _list systems_
- **Assets:** _list kits and authors (e.g., Kenney, Quaternius, Mixamo)_

---

## Entry Template
**Date:**
**Worked on:**
**Decisions made (and why):**
**What I learned:**
**Playtest notes (who played, what they said):**
**What I changed because of feedback:**
**Screenshot / clip:** _before and after if something changed_
**Next:**

---

## 2026-09-26: Race rules decided, sim project started
**Worked on:** Reviewed the spec with Claude, answered 22 open questions, set up the text-only sim project (PLAN step 3, sub-step 1).
**Decisions made (and why):**
- **0 stamina:** pace drops 10% per second down to 50% of normal speed. Going out too fast should really hurt.
- **Pacing:** running style sets the planned pace, Race IQ decides how well the runner sticks to it. The player gets a **Kick button**: hold it to speed up to top speed, let go to return to planned pace.
- **Card numbers:** kept as written for now; we tune after playtesting. Bonuses **add** (+10% and +5% = +15%). "Calculated last" cards go after everything else.
- **+Speed** raises average pace *and* top speed. Some cards raise top speed only. **Kick** only changes with kick bonuses. Stamina drain grows as you get closer to top speed.
- **Determination:** below 25% stamina, roll every 5 seconds; chance = Determination stat; success gives 5 + Determination/10 stamina; max one success per lap; can go above 100.
- **Race IQ:** simple version (boxed-in chance, extra meters when passing wide, steadier laps). **Drafting:** a very small stamina saving.
- **No rarity:** every card is equally likely, except unique and rivalry cards, which are rarer. No duplicate cards in a pick or in a race. Cards last all race unless they say otherwise. Trip and Fall costs 1–2 seconds.
- **One condition per race**, shown before picking a runner. Rain: Race IQ ends at +5%. Rivalry: a random CPU runner is tagged as the rival.
- **Runners:** the player has 3 runners with fixed styles and picks one per race. CPUs get no cards but improve with you; 1–2 are always better than you.
- **Tech:** Node.js in the terminal (same language as Three.js, so the race code carries over). Cards in one editable file. Seeded randomness so any race can be replayed.
- **Stat follow-ups:** 150 stat points (max 35 in one stat). With 0 points, average pace is 7:15 and top speed pace is 6:15. Each Speed point takes 1 s off both; each Top Speed point takes 1 s off top speed only. Kick starts at 0.4 mph/s. Each Stamina point leaves 0.75 spare stamina over a race, so drain per lap = 25 + 0.0625 per Stamina point. That lets stamina matter later in the game without letting anyone sprint two laps.
- **Kick button in the terminal:** press K to start kicking, K again to stop. Running styles still do their own surges automatically.
- All race numbers live in `data/tuning.js` so we can tune without touching the code.
**What I learned:** A "seed" makes random numbers repeatable, so the same seed always gives the same race. The sim runs like a flip-book: every 0.1 seconds it moves each runner forward a bit and takes away some stamina.
- **Step 3, Determination (built by Claude):** below 25% stamina, roll every 5 s; success gives 5 + Determination/10 stamina, max once per lap. After getting stamina back, the runner speeds back up at their Kick rate.
- **Playtest finding:** with 15+ Determination, sprinting lap 1 at top speed matches or beats even pace (Det 35: 6:38.9 vs 6:51.0), because each recovery pushes the fade later. Decide whether that's a feature (a risky strategy for gritty runners) or needs tuning.
- **Step 4, live race (built by Claude):** the race plays out in the terminal about 7× faster than real life, and K turns the kick on and off. Kick turns itself off when stamina runs out. On Windows, commands use `npm.cmd` because PowerShell blocks `npm`.
- **Running style rules (for the styles step):**
  - *Front Runner:* lap 1 runs halfway between average and top speed (costs stamina). Higher Race IQ makes that opening surge smaller. When passed, tries to take the lead back; high Race IQ makes them more likely to let it go.
  - *Pacer:* 10% less stamina drain at normal pace, always-steady laps, kick 25% weaker.
  - *Closer:* runs about 95% of normal pace early to save stamina, then gets +10% top speed on the last lap.
  - *Competitor:* +5% speed within 10 m behind someone; −5% speed when leading or 20+ m from everyone.
  - *Computer runners* each kick once on the last lap. Better stats mean a better kick.
- **Build order change:** the full field of 8 comes before running styles, because 3 of the 4 styles react to other runners.
- **Full field of 8 (built by Claude):** 7 computer runners scaled to you (1–2 have 5–15 more stat points, the rest 0–20 fewer), names from `data/names.js`. Passing is announced, drafting within 2 m saves 3% stamina, and computer runners kick once on the last lap, timed by how much stamina they have left (Race IQ makes the timing more accurate).
- **Playtest finding:** seed 12345 without kicking finishes 5th. Kicking with 270 m left wins. The timing of your kick already decides races.
- **Running styles + picking 1 of 3 runners (built by Claude):** your 3 runners each have a different style, and you pick one before the race. Style numbers live in `data/styles.js`. Style speed bonuses don't cost extra stamina; pace changes (hanging back, surging) do.
- **Bug found by simulation:** two Competitors kept leapfrogging each other (1,283 passes per race). Fix: within 2 m of someone, a Competitor tucks in and runs normally. The "leading" penalty only applies once 2 m clear. Now about 16 passes per race.
- **Balance finding (300 simulated races, computer runners):** Front Runner avg 3.2nd place (26% wins), Pacer 3.9 (17%), Competitor 4.0 (10%), Closer 5.8 (3%). Closers lose about 16 s hanging back but only save enough stamina for about 45 m more sprinting. Best option tested: 97% early pace + 20% top speed (Closer 4.7, 12% wins).
- **Decision:** Closers now run 97% pace early and get +20% top speed on the last lap (option D), because it was the most balanced option while keeping the "hang back, then explode" feel.
- **Race conditions (built by Claude):** one random condition per race, shown before you pick your runner, affecting every runner. Numbers live in `data/conditions.js`. Rain's "all stats −5%" lowers top speed by 5% through Speed (not 10%). Windy = tailwind on the first 200 m of each lap, headwind on the second 200 m. Rivalry tags a random computer runner as your rival.
- **Bonus system:** styles, conditions and (later) cards all feed one list of percentage bonuses per stat, which add together.
- **Balance finding (200 races per condition):** Hot (+5 s winning time) and Rain (+23 s) change results and hurt Closers most. Windy, Fast Track and Rivalry barely change anything, and Front Runners are the best style in every condition. Also: rain makes a personal best much harder to set.
- **Condition changes:**
  - *Hot Day:* Pacer's stamina saving doubles to 20%. Pacer avg place improved from 4.2 to 3.6, so the Pacer is now a real pick on hot days.
  - *Fast Track:* also +5% top speed. Winning times are about 3 s faster.
  - *Windy:* drafting saves 3× the stamina, and runners within 5 m behind someone block 80% of the headwind. Only a small effect at ±5% wind (Closer 4.84 → 4.66). At ±10% wind, Windy becomes Closer weather (4.44).
  - *Rain:* marked for a separate personal best, to be built with saving (PLAN step 4).
- **Decision:** wind raised from ±5% (original spec) to ±10%, so windy days reward sheltering in the pack.
- **Two more swap-loop bugs found by simulation and fixed:**
  - *Wind shelter:* sheltered runners kept passing the runner shielding them (2,876 passes per race). Now the shelter only lets you keep up, and runners move front to back each tick so followers react to the leader's new speed.
  - *Front Runner duels:* two Front Runners kept fighting back against each other (79 swaps in one race). Now a Front Runner fights until 3 m clear, then won't fight again for 30 s.
  - Result: about 12–15 passes per race in every condition, never more than about 10 swaps between one pair. A test now guards against this.
**Next:** Cards.

## 2026-09-26 (later): Race IQ and cards
**Decisions made (and why):**
- **Card speed costs stamina** (the runner pushes harder), except "Put these on quick" (new shoes). Top speed cards stay free.
- **Race IQ now matters for every runner:** low Race IQ means a wobbly pace (up to ±5%), getting boxed in when stuck in a pack (10% slower for 3 s), and extra stamina spent swinging wide when passing. 0 → 50 Race IQ is worth about 4 s and 1 place (Front Runners excepted, because Race IQ also shrinks their lap-1 surge).
- **Settle-in rule:** after being passed, a runner settles in behind for 15 s instead of passing straight back. This ended the last swap loop.
- **Cards (built by Claude):** all 23 cards from the spec are in `data/cards.js`, checked at startup with plain-English errors. You pick 1 of 3 before the race and after laps 1–3 (the live race pauses). Unique and rivalry cards appear a third as often, and no card repeats in a race. Card offers use their own random numbers per pick, so the same seed always offers the same cards (fair Daily Race).
**Playtest finding (150 simulated races per card, card given alone):** speed cards dominate. The Shoes and Coach Pep-Talk save ~34 s (1st place almost every time), other speed cards save 13–21 s, and Race IQ and Determination cards save under 1 s. "I won't stop here" costs ~34 s because its −10% includes speed. Choices don't matter yet, so card numbers need a rethink.
- **Decision: card numbers are now stat points**, the same currency as training. Speed cards were halved: +10% became +20 Speed points (about 20 s instead of about 38 s). Other stats keep their number as points (+10% Race IQ became +10 Race IQ). "Double" cards really multiply. Stamina drain stays a percent. "I won't stop here" no longer cuts speed.
- **Result (150 races per card):** Shoes and Coach Pep-Talk now save ~19 s (was ~34 s). Other speed cards save 7–14 s. "I won't stop here" costs ~1.5 s (was ~34 s). Race IQ and Determination cards still save under 1 s.
- **Root cause found:** the stats themselves are unequal. With smart kick timing, +10 points is worth: Speed 9.5 s, Stamina 3.3 s, Top Speed 1.5 s, Race IQ 0.7 s, Determination 0.5 s, Kick 0.4 s. Cards for weak stats can't matter until the stats are rebalanced. This also affects random runners and training.
- **Stat rebalance (designers asked: nerf Speed more, buff everything else, but don't make everything the same):**
  - Speed point: 1 s → 0.55 s. Top Speed point: 1 s → 2 s. Stamina point: 1 → 1.25 tank (1 spare stamina per point).
  - Kick: base 0.4 → 0.25 mph/s, per point 0.02 → 0.04. **New Kick effect:** each Kick point makes sprinting burn less stamina (2.5× normal drain at top speed, minus 0.02× per Kick point), because acceleration alone was cancelled out by stamina.
  - Determination: rolls start below 35% stamina (was 25%), and the bonus is 5 + 0.6 per point (was 0.1).
  - Race IQ mistakes cost more: pace wobble ±10%, boxed in 25% slower for 4 s, swinging wide costs 10 stamina.
  - Card speed now costs a clear 3% more stamina per 1% faster (the old stamina-curve cost dropped to about 1 stamina after the rebalance).
  - Front Runner lap-1 surge 0.5 → 0.2. Wider top speeds had made them win far too often (average place 2.4 vs ~4.5).
- **Result:** +10 points is now worth Speed 4.2 s, Top Speed 4.3 s, Stamina 1.4 s, Kick 1.4 s, Determination 1.3 s, Race IQ 1.0 s (was 9.5 / 1.5 / 3.3 / 0.4 / 0.5 / 0.7). The best card is now "Less than a lap left!" (11.7 s). Speed cards are 4–10 s. Race IQ cards are still weakest (0.5–1.1 s). Front Runners are still the strongest style (avg place ~2.9 vs ~4.0–4.9).
- **New tool:** `npm run balance` prints both tables, and `--try '{...}'` tests tuning numbers without editing files.
**Next:** Playtest. Possibly buff Race IQ cards and look at why Front Runners win (leading avoids traffic mistakes).

## 2026-09-26 (evening): Front Runner fix, card bug
**Playtest bug:** "I want you on his back!" was offered while in 1st, where it does nothing (nobody ahead to follow). It now requires 2nd or worse, and a test guards it.
**Front Runner investigation:** racing the same runner as each style showed the lap-1 surge was almost the entire Front Runner edge (6.6 s with it, 0.6 s without). Traffic mistakes and fighting back barely mattered. The surge was nearly free: after the rebalance, top speed sits ~45% above normal pace, and the stamina curve only charges for closeness to top speed, so a 6% surge cost under 1 stamina. The other styles all have a real downside, but the Front Runner's (fighting back) rarely triggered because nobody passes the leader. Several guesses were tested and ruled out along the way (leftover stamina, Determination refunds, curve shape).
**Fix:**
- New rule: running above normal pace **without kicking** (surging, fighting back, drifting fast from low Race IQ) costs 6% more stamina per 1% faster. Full sprints count as kicks.
- Front Runner lap-1 surge 0.2 → 0.07 (about 2% faster).
- Result for your runner (same stats, only the style changes): Front Runner 6:42.4, Pacer 6:42.6, Competitor 6:43.5, Closer 6:43.9, all within 1.5 s (was an 8 s Front Runner edge). Computer Front Runners average 3.4–3.8 place vs 3.6–4.9 for the others. Hot days still favor Pacers and windy days Closers. Passing stays healthy (no loops).
- Side effect: drifting fast now costs stamina, so Race IQ is worth more. +10 points now = Speed 4.8 s, Top Speed 2.7 s, Race IQ 2.7 s, Determination 2.7 s, Kick 1.9 s, Stamina 1.5 s. Winning times are ~9 s slower (~6:34).
**Next:** Playtest. Closers are the weakest style in most conditions; Stamina is now the weakest stat.

## 2026-09-26 (night): PLAN step 4, training and saving
**Decisions made (and why):**
- **Training points:** every finished career race earns 1 training point. Spend it on **any** of your 3 runners (the designers' idea, so you can build up a runner you don't race yet), or bank it for later.
- **Sessions:** spending a point offers 3 random sessions from `data/training.js` (10 starter sessions by Claude, covering all 6 stats, one with a tradeoff). Each gives about +3 stat points, with a 15% chance of a +2 Determination bonus. Training can push stats past the starting cap of 35.
- **Saving:** your career (3 runners, every race, training history, banked points) is saved in `save/career.json`, which stays on your computer (ignored by git). `--new` starts over and keeps the old career as a backup file.
- **Personal bests:** overall, per runner, and a separate rain best.
- **Career vs practice:** a plain `npm.cmd run race` is a saved career race. A seed, `--instant`, or testing flags make it a practice race that isn't saved, so testing never affects your career.
- **`npm.cmd run career`:** shows your runners, personal bests and recent races, and lets you spend banked points.
**Next:** Play a few career races and see how fast personal bests come.

## 2026-09-26 (late): PLAN step 5 started, 3D race view
**Decisions made (and why):**
- **Look and feel (SPEC section 9 filled in):** a sunny school meet. Palette: track red #C8553D, infield green #5FA04E, sky blue #8EC9F0, lane white #F7F4EA, gold #F2B33D (your runner), navy #1F2A44. Font: Baloo 2. Mood: bright, energetic, friendly. "Straight track" meant a normal 400 m oval.
- **Phone held sideways (landscape).** The whole game moves to the browser in this step with plain menus; step 6 makes them pretty.
- **Tools:** Three.js (3D) and Vite (runs it in the browser), both free and open source.
- **Part 1 built:** a 400 m track with real proportions (two 84.39 m straights and two bends), built from code with no downloads: lane lines, finish line, stands with a blocky crowd, trees. Placeholder runners (drawn 3.5x life size so you can see them) move exactly where the race sim says, and spread across lanes when bunched. The camera fits the whole track on any screen. **Hold-to-kick finally works** (Space, K, or holding the screen), since a browser can tell when you let go.
- Same race sim as the terminal version, so balance changes apply to both.
**Polish list for step 6:** finished runners jog past the line instead of stopping on it.

**Playtest feedback on part 1 (designers):** runner size, camera angle and race speed are good. Changes:
- **Your runner is green** (#2EE66B, the universal "this is me" color), not gold. Green was removed from the computer runners' colors. SPEC section 9 updated.
- **Kick needs nitro-style feedback:** now there's a gold glow and streaking speed lines around the screen edges, your runner glows, sparks trail behind it, and the kick button lights up.
- **The pack didn't look realistic** (fanned out wide like racing horses). Now runners hug the inside lane in a line, step out to lane 2-3 only to pass, change lanes gradually, and are never more than 3 wide. Bounce reduced.
- **Card choices were missing:** moved up from part 3. The race now pauses for a card pick before the start and after laps 1-3.
- **Mood:** fine for now, but the real assets should feel **cozy**. Reference images coming.
**Part 2 built:** the race display (lap, time, position with gaps, stamina bar, pace, splits, cards held), pop-up messages (passes, boxed in, Determination), a big hold-to-kick button for phones, and a results screen. Finished runners jog past the line. Checked at phone size held sideways.
**Card fix (designers):** "Team Pep-Talk" was building up (+10, +20, +30, +40 Determination). It should be +10 on every lap without building up, so it's now a flat +10 Determination.
**Next:** part 3, menus for conditions, runner choice and training, plus saving in the browser.

## 2026-09-28: PLAN step 5, part 3, career in the browser
**Built:**
- **Home screen:** personal best, rain best, races run, training points, and Race / Train / New career buttons. The first visit creates your 3 runners with a welcome message.
- **Race day:** today's conditions, then pick 1 of your 3 runners (stats, paces, style, and each runner's best), then the pre-race card.
- **After the race:** results, whether you set a personal best (overall, per runner, or rain), and your training point, with Train now / Race again / Home.
- **Training:** pick any runner, then 1 of 3 sessions, with the same 15% Determination bonus chance. Points can be saved for later.
- **Saving:** the career is saved in the browser (local storage), separate from the terminal save file. New career keeps the old one as a backup. If the browser blocks saving, the home screen says so.
- **Shared rules:** the career rules moved into `src/careerCore.js`, used by both the terminal and the browser, so they can't drift apart.
- **Testing tip:** add `?speed=10` to the address to run races 10x faster.
**Next:** part 4, real runner models (with the cozy look, once reference images arrive).

## 2026-10-01: Art style guide, and the cozy look (step 5, part 4a)
**Decisions made (and why):**
- **Art style guide v0.2** (`docs/STYLE_GUIDE.md`), written by the designers with Whistlevale as the feel reference: "a warm, hand-built tabletop model of a track meet on a late afternoon." It's now the single source of truth for the look; SPEC section 9 points to it. Decided: a diorama base (yes), a terracotta track, evening mode later, tilt-shift blur only after the phone test.
- Added `docs/style-refs/` for reference screenshots and `CREDITS.md` for every outside asset, font, and library.
**Built (all in code, no downloads):**
- The guide's warm palette (`web/colors.js`), with one shared matte material per color (`web/materials.js`). Your runner's material is its own copy, so only you glow when kicking.
- Warm side lighting (one sun about 45° up, a warm sky light), neutral tone mapping, warm haze, and a CSS backdrop behind a transparent canvas.
- **A floating diorama slab:** sandy top, 4 terraced earth bands, an oak rim. It reaches further on the far side than the near side. The camera now measures the slab's outline and backs off until all of it fits on any screen.
- **The main stand moved to the far side, facing the camera:** from the near side you only saw its roof. Cream steps, oak benches, a brass rail, a green roof on posts, and a crowd of capsules with ball heads that bob gently out of sync (2 draw calls).
- Chunky trees (canopy lumps on trunks) in calm zones, pines along the back edge.
- Runners in the guide's kit colors with darker shorts, warm blob shadows nudged away from the sun, and a You-green ring under your runner.
- **Kick restyle:** your runner's gold glow, a few warm glowing motes instead of box sparks, a soft gold edge vignette, faint cream speed lines.
- **UI:** dark green panels with cream text, cream cards with ink text, gold pill buttons, the guide's type sizes, touch targets of at least 44px. On short (phone) screens the menus tighten so 3 cards fit without scrolling. At most 2 pop-up messages show at once, with no repeats within 3 seconds.
**Still to check:** draw calls and frame rate on a real phone (rough count: about 80 draw calls, under the guide's 100). Static scenery could be merged further if needed.
**Next:** the Quaternius runner models (part 4b), then the phone test.

## 2026-10-01 (later): The real high school, from the air
**Designer asks:** a more colorful, detailed track; UI that matches its colors (with a new `docs/UI_DIRECTION.md` inspired by Yoshi's Crafted World); and the track set in the stepson's actual high school instead of floating in space, seen from the sky.
**Decisions made (and why):**
- **Match the real school**, from aerial photos: red track, green turf, navy end zones, white field border, gray walkway. These replace the terracotta track (style guide v0.3). Navy and green track options were previewed first: a green track hid your green runner, and a navy one hid the navy and charcoal kits.
- **No floating slab.** The campus runs past the screen edges into hazy chaparral hills, like a view from the sky. (Style guide §8 updated.)
- **No school name, mascot, or logo for now**, because the repo and game are public and it would tie the game to where a student goes to school. The end zones, press box and scoreboard stay plain until the designers decide.
**Built (all low-poly, in code):** the stadium (lane lines, exchange-zone marks, the 1600 m start arc, the football field with stripes, yard lines and numbers, navy end zones and team areas, goal posts, long jump runways and sand pits, a shot put circle), home bleachers with the press box (north), visitor bleachers (south), light poles, a scoreboard (east). The campus in `web/campus.js`: portables, the main buildings with roof units, the pool, 8 tennis courts, parking lots with cars, the road down the east side, baseball and softball diamonds, palms, scrub, and hills. The camera frames the whole stadium plus the front of the school.
**Trade-off noticed:** showing the campus makes the runners a bit smaller than before. Still readable at phone size; check on a real phone in part 5.
**Next:** the UI direction (layered paper panels, outlined numbers, run-path strip, select-then-Continue cards, Big Moment results, springy motion) in the school's colors, then the runner models.

## 2026-10-01 (evening): Tigers, the big T, and the real campus layout
**Designer asks:** show a team name and the big T (leave the school's own name out); put the big T on the hill like the real one; make the campus closer to the real school. The designers sent Google Maps screenshots (top-down and tilted).
**Decisions made (and why):**
- **"TIGERS" everywhere the real school shows its name**: both end zones, the press box ("TIGERS FOOTBALL"), the scoreboard, and the building facing the stadium. The big T at midfield and on the hill. We first used the real team name, then switched to a made-up one that starts with T, so the big T still fits. Neither the school's name nor its real team name appears anywhere. Tigers is one of the most common team names, so it doesn't point to any one school.
- **Lettering is drawn from shapes** (`web/lettering.js`), not a font: chunky, low-poly, and original, with no font license to track.
- **Two camera views.** The hill T is northwest of the stadium, outside the race view. Zooming the race camera out would shrink the runners, so the menus get a wider view (campus and hill T) and the camera glides in when the race starts. The race view is now slightly closer than before, so the runners are a little bigger.
- **Campus laid out from the screenshots** (style guide §8 lists what's where). The hill T is about four times its real size so it reads from the air.
- **The 10° turn:** the real stadium sits about 10° off east-west. The buildings line up with the track; the hills, roads and ball fields are turned to match.
- **Stands match the photos:** the home side is 64 m long, just east of center; the visitor side is 50 m long, west of center, with its own little press box. Long jump runways were added in the east curve, and the west curve is paved red for the high jump. These replace the shot put circle, which isn't in the photos.
**Next:** the designers check the new layout, then the UI direction.

## 2026-10-01 (night): The race screen, in the school colors (UI direction, part 1)
**Built:** the race display from `docs/UI_DIRECTION.md` §4. The interface panels switch from dark green to the school navy.
- **Top-left:** lap dots (finished laps filled, the current one pulsing), LAP 2/4, and the clock in big outlined numbers. Each digit sits in a fixed-width box so the clock doesn't wobble.
- **Top-right:** your place ("1st /8"), which lands with a little bounce when it changes.
- **Bottom-right:** the kick button with your stamina as a ring around it (approved earlier). The ring is cream, turns gold while you kick, pulses below 25%, and is dashed when Flow State hides it. The button turns gray when you're too tired.
- **Bottom-middle:** a gold KICK chip that springs in while you kick.
- **Bottom-left:** today's conditions, your style, and your cards as small tags.
- **Icons:** original two-tone icons (stopwatch, lap flag, medal, running shoe) in `web/icons.js`.
- **Reduced motion:** pulsing and bouncing switch off when the device asks for less motion.

**Decisions made (and why):**
- **Kept a few small readouts the guide would leave out:** pace (the HotIce card scrambles it, so it has to be on screen) and the gaps to the runners just ahead and behind (rival tracking). They're small outlined text, not boxes. The designers can drop them.
- **Lap splits moved** from a list on screen to a pop-up as each lap finishes; the full splits are on the results screen.

**Next:** card picks (run path strip, select then Continue), then the menus and the Big Moment results.

## 2026-10-01 (night, later): Card picks (UI direction, part 2)
**Built:** `docs/UI_DIRECTION.md` §5 for every choice screen (card picks, runner pick, training).
- **Select, then Continue:** tap a card and it lifts with a gold edge while the others dim; then tap Continue. This stops accidental picks mid-race. On a keyboard: press 1-3 to select, then Enter (or the same number again).
- **Run path strip** on card picks: Start → Lap 1 → Lap 2 → Lap 3 → Finish, with passed stops filled and the current one pulsing.
- **Cards:** cream paper on a darker paper layer, a colored type chip, a two-tone icon, a bigger title, and the effect text. They spring in one after another.
- **One color and icon per card type:** Preparation navy clipboard, Strategy sky route, Encouragement plum heart, Pacing oak stopwatch, Push red bolt, Unique lavender star. Runners get a shoe and training gets a dumbbell. Green and gold are never used, since they mean "you" and "kicking".
- **Buttons:** pills on a darker offset layer that squash when pressed. Gold for the main action, navy for the rest.

**Decisions made (and why):**
- **The run path has 5 stops, not 6.** The guide lists "Lap 4" and "Finish" separately, but they're the same moment (the end of lap 4).
- **Unpicked cards dim by darkening, not by fading.** See-through cards let the stadium show through and looked messy.
- **On phone-size screens** the card icon moves up next to the number, so all three runner cards and the Continue button fit without scrolling.

## 2026-10-01 (night, latest): Menus and the Big Moment (UI direction, part 3)
**Built:**
- **Paper panels** for the home screen and confirmations: navy, a deeper navy layer offset below, a dashed inner outline like a lane marking, and a little spring when they appear. The home panel has the "1600m" logo in big outlined letters and four stat tiles (personal best, rain best, races run, training points).
- **The Big Moment results card** (`docs/UI_DIRECTION.md` §8): a cream card with a red ribbon showing your place ("4th of 8"), your time counting up and landing with a bounce, a gold badge for a new personal best (or a runner best), and a real results table. Your row has a You-green bar and your rival's has a red one. On phone-size screens it splits into two columns, with your result on the left and the table on the right.
- **Confetti** for a win or a new personal best: paper pieces in cream, gold, red and lavender, falling once. It's added to the style guide §9 as the second exception to "calm, no particles", after the kick.

**Decisions made (and why):**
- **One card for results and personal bests**, not two pop-ups in a row. The personal best is a badge on the results card, so you see everything at once.
- **Browser wording for the personal best line.** The badge already says "New personal best!", so the line under it adds the detail ("25.9s faster than your old best, 7:08.5"). The terminal keeps its own wording.

**Next:** the designers try it. After that: the Quaternius runner models (part 4b) and the real-phone test (part 5).

## 2026-10-02: First playtest, and the balance fixes it led to
**Designer feedback:** races are far too easy (winning by about 30 seconds); stats need explaining (on the menu, and a ? on cards); Determination is broken when you build it (kicked all race and never dropped below about 20% stamina); the UI should feel more like running (white lane lines on the kick button and cards).

**What the simulations showed** (a new playtest script, 100–150 races per row):
- **Kicking the whole race was the best strategy.** A kick cost only 2.5× normal stamina, so a full tank lasted about 2.6 laps of sprinting. Kicking all race won 73% of races with no cards, and 96% with random cards (68 s ahead on average).
- **Determination rerolled every 5 seconds while you were low,** so a "35% chance" was really about 90% per lap, refilling up to 26 stamina. A Determination-35 build kicking all race won 100% of races, with its lowest stamina around 16–24% (matching the playtest).
- **Cards were most of the easy wins:** a smart player with no cards won 15–22%; with random cards about 70%. Computer runners never got cards.

**Decisions made (designers picked from simulated options):**
- **Kicks cost 4× stamina** (was 2.5×). A full tank now lasts about 1.5 laps of kicking. Kicking all race went from 73% wins to 0%.
- **Determination rolls once per lap**, the first time you're low that lap, so 35 Determination is a real 35% chance. The refill is halved: 5 + 0.3 per point (35 → +15.5 stamina). Stacked Determination builds that kick all race now win about 0–1%.
- **Computer runners get 4 cards like you** (one before the race, one after each of laps 1–3): a random card with no special rules. This is the hard option. A player picking cards at random wins about 13% (average 4th place); good picks and a well-timed kick should win more. The gentler option was 2 cards (about 27%).

**UI from the feedback:**
- **"How stats work"** on the home screen, explaining all six stats in plain words (`data/statHelp.js`, editable text).
- **A ? on every card** (card picks, runners, training) that opens a bubble explaining the stats that card touches, plus a note that card speed costs stamina. Tapping the ? never picks the card.
- **Running-track touches:**
  - card numbers painted like red lane numbers;
  - a small red track bend with white lane lines in the corner of cards and panels;
  - a white lane line inside panels;
  - the stamina ring drawn as a two-lane red track with a white start line.
- **Small fixes:** cards are now divs (so the ? can sit inside them); pressing Enter on the picked card confirms it.

**Next:** the designers play a few races at the new difficulty. If it's too hard, the quickest dial is how many cards computer runners get.

## 2026-10-02 (later): Second playtest tweaks
**Designer asks:** nerf Speed by about 5% on all cards; slightly buff the stamina Determination gives.
**Changed:**
- **Every card's Speed is about 5% weaker:** +20 → +19, +10 → +9.5, +30 → +28.5. For +15 the exact 5% would be +14.25, so it became +14.5 to keep the card text tidy. Top Speed cards are unchanged.
- **Determination refill: 5 + 0.4 per point** (was 0.3): 35 Determination → +19 stamina (was +15.5; before the first playtest it was +26). Still one roll per lap.

**Simulated (150 races):** about the same as before.

## 2026-10-02 (evening): Real runners, late-90s RPG style (step 5, part 4b)
**Designer decision:** runner models inspired by Final Fantasy VII-era low-poly characters, instead of the planned Quaternius downloads. We borrow the style only, never FF7's characters or assets.

**Built** (`web/runnerModel.js`):
- **Construction:** runners made of rigid segments (hips, torso, head, upper arms, forearms, thighs, shins, shoes) joined at the joints, in flat colors with five-sided faceted limbs.
- **Look:** a big head with a pointed chin and dark block eyes, big hands, chunky shoes with dark soles, a singlet with a race bib, and shorts. Five hair styles (spiky, ponytail, buzz, bun, crop).
- **Variety:** kits set the shirt and shorts; skin, hair and shoe colors vary per runner (`RUNNER_LOOKS` in `web/colors.js`). Your runner keeps the You-green kit.
- **The stride:**
  - legs swing and knees fold through the swing;
  - arms pump against the legs, with the shoulders twisting against the hips;
  - the body leans forward and bobs twice per stride, and ponytails swing.
  - Kicking (or surging) lengthens the stride, pumps the arms harder and leans in more.
  - Finished runners jog to a stop.
- **Performance:** each runner is built from small pieces, then each segment is baked into one vertex-colored mesh. That's 13–14 draw calls and about 400–470 triangles per runner (budget: 3,000). The kick glow still lights up only you (your runner has its own copy of the material).
- **A close-up viewer** at `/dev/runners.html` on the dev server shows all eight runners running in place (keys 0–3 change the pace; drag to turn).

**Decisions made (and why):**
- **The stride rate follows effort, not true foot speed.** The race plays about 7× faster than real life, so feet matching the ground would be a blur. A readable stride matters more from the stadium camera.
- **The style guide** now records the runner style and the "inspired by, never copied" rule.

**Designer tweaks, same day:**
- **Heads more head-shaped:** a faceted round skull with an angular jaw, a nose and ears (was a wedge). Hair now hugs the skull as a cap, with each style's spikes, tail or bun on top.
- **Bigger, spikier shoulders:** a wider chest, and big angular shoulder caps with two spikes each (out-and-up, and a smaller out-and-back).
- **Shoe-shaped shoes:** a wedge with a taller heel sloping down to a lower, narrower toe, an ankle collar, and a dark sole.
- Now about 650–710 triangles per runner, still 13–14 draw calls. The viewer can zoom (scroll).

**Second round of tweaks:**
- Pointed elbows (a small spike out the back of each arm).
- Shoes less blocky: a firm heel, a rounded toe box and an oval sole.
- A smaller nose.
- A sixth hair style, **sweatband**: a band round the forehead (bib-white) with a tuft standing straight up.
- Fixed: the old style picker would have used only 3 of 6 styles; the new `hairStyleFor` spreads all 6 across the field.
- About 880–960 triangles per runner (the rounded shoes), still 13–14 draw calls; budget is 3,000.

**Next:** the designers check the runners in a race (they're small from the race camera, so overall shape and motion matter most).

## 2026-10-02 (night): Front Runner nerf and the race camera
**Designer asks:** Front Runner is a little too strong at the beginning (reduce by about 5%?); a race camera on your runner's shoulder.

**Front Runner (simulated first, 300 races of computer runners):** Front Runners were usually near the front after lap 1 (2.75th on average) but finished mid-pack (4.0th) and won 16%, about an even share. Pacers are actually the strongest finishers (22% wins).
- Cutting the surge by exactly 5% changed nothing visible.
- **Decision: halve the lap 1 surge** (effort 0.07 → 0.035, so about 1% faster than their pace instead of 2%). Simulated: they sit 3.1st after lap 1 and win 14%, an even share.
- The style test now compares a Front Runner's lap 1 with the same runner as a Pacer (lap 1 also includes the standing start).

**Race camera:**
- A camera button (above the kick button) or the C key switches between the stadium view and a camera over your runner's right shoulder, looking up the track.
- It follows smoothly through the bends, glides in and out (about 0.9 s), and widens the lens up close. The arrow over your runner hides while it's on.
- The menus always use the stadium view. Your choice is remembered in this browser.
- Settings (distance, height, lens) are at the top of the race camera code in `web/main.js`.

**Also:** the fans in the stands are 50% bigger, so they read from the stadium camera (`CROWD_SCALE` in `web/stadium.js`). The seat spacing already had room, so they don't overlap.

**Card peek (designer ask):** tap any tag in the lower left of the race display (your cards, today's conditions, or your running style) and a small card pops up above the tags with its full text. Tap it, tap the tag again, or tap anywhere to close. A tap on the track that closes it doesn't also start a kick. The card-type icons moved to `web/icons.js` (`TYPE_ICONS`) so the card picks and the race display share them.

**Next:** the designers try the race camera in a full race. Then: rarity colors and sounds (step 6), or deploy (step 8). A player picking cards at random wins about 10% (average 4th). Computer runners use the same cards, so the Speed nerf hits them too. Stacked Determination builds that kick all race win 1–4%, so the buff doesn't bring back the old exploit.

---

## Milestones
- [ ] Spec written
- [ ] Text-only race sim working
- [ ] First 20 cards written
- [ ] 3D race view working
- [ ] Leaderboard live
- [ ] First outside playtest (e.g., team)
- [ ] Changes made from playtest
- [ ] Public link shared
