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
