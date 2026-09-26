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
**What I learned:** A "seed" makes random numbers repeatable, so the same seed always gives the same race.
**Next:** Answer the stat-math follow-ups, then step 2 (one runner, alone, splits and finish time).

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
