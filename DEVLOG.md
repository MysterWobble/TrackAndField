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
**Next:** Running styles (rules above), then race conditions. Runners with the same pace currently run side by side; styles and Race IQ should spread them out.

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
