# Game Spec: 1600m Roguelike (working title: \-0-)

Starter answers are filled in. Change anything that's wrong. Blanks are yours to fill. Mark guesses with **(?)**.

## 1\. The Game in One Sentence

You manage a runner through a 4-lap 1600m race, making roguelike choices before the race and after each lap, and try to set new personal bests.

## 2\. Inspiration 

- **Backseat Champions:** you manage the race instead of controlling the racer; pick upgrades mid-race; pre-race strategy with tradeoffs; changing race conditions; short races.  
- **Umamusume:** visible runner stats; running styles; skills that trigger at key moments; training between races.  
- **Real track:** tactics like negative splits, drafting, going out too fast, and the final kick.

## 3\. Race Flow

1. **Race conditions revealed** \[e.g., hot day (Stamina drain increased by 10%), windy (Half of the track speeds up runners by 5%, the other half slows runners by said amount) fast track (Kick increased by 5%), Rivalry Race (Determination for all runners is increased by 10%, certain cards unlock), Rainy weather (All stats decrease by 5%, Race IQ increases by 5%)\]  
2. **Pre-race: pick 1 of 3** (strategy, gear, warm-up)  
3. **Lap 1 plays** → pick 1 of 3  
4. **Lap 2 plays** → pick 1 of 3  
5. **Lap 3 plays** → pick 1 of 3  
6. **Lap 4 plays** → finish, results, leaderboard  
7. **Between races:** training (see section 7\)  
- **Watch time per lap:** about 15 seconds  
- **Times shown in real race time** (e.g., 5:12.4)  
- **Field size:** you \+ 7 CPU runners *(suggested: 7\)*

## 4\. Runner Stats & Base Runners

Starter set. Rename or cut.

- **Speed:** The current rate at which a runner is going in MPH  
- **Top Speed**: The highest speed at which a certain runner can run  
- **Stamina:** A resource that depletes at a rate according to speed, (how long you can run, depending on your speed)  
- **Kick:** The rate at which you speed up (Ex: 5MPH/1Sec)  
- **Determination:** The chance to gain bonus stamina when reaching low stamina (one roll per lap, the first time you're low that lap)  
- **Race IQ:** better positioning and strategy (Ex. Less time a runner spends boxed in, better consistent pace for the whole race, less time runners spend running on an outside lane.  
- **Starting 1600 time for a new runner:** 7:00 *(suggested: around 6:00)*

The Player will be given 3 runners when they start the game, each with their own running style. These runners have a total stat point value of 150, this means 180 stat points spread randomly across all stats of one runner (for the sake of balancing, no runner can have over 35 points in a single stat). Before a race, the player will be given the conditions of the race, and the option to choose which of their 3 runners to use. 

**Stat Calculation**: Each runner starts at a 7:00 average mile pace, with a top speed 30 seconds faster than that, each speed stat point decreases this average mile pace. And therefore top speed, by 1 second. Each Top speed point decreases the top speed time by 1 second. Next up is stamina, each runner has 100 stamina base, and each stat point increases that base stamina by 1\. The calculation of stamina loss whilst running is (25 \+ 0.125 per stamina point past 100\) stamina lost per lap on average pace. This stamina loss increases as a runner reaches their top speed.  Next up is kick: kick is the rate at which a runner speeds up, naturally \+1MPH/sec, increasing by 0.05 per stat point in kick. Determination is explained in the answered questions. Race IQ is how smart the runner CPU is, whether they run on the outside, stay boxed in. More points in Race IQ increases this smartness.

## 5\. Running Styles

Used by you and CPU runners. Each CPU runner gets a style and a name.

- **Front Runner:** Speed Boost at the start of the race (First lap), automatically tries to keep up that position the entire run (Race IQ fights against this)  
- **Pacer:** even splits, steady, slow kick speed, and low difference between natural top speed and average speed.  
- **Closer:** sits behind leaders and majority of runner for majority of the race (Three laps), speeds up massively to a high top speed near the end of the race (Last Lap)  
- **Competitor:** Has a speed bonus whenever close behind another runner, Slows down severely when in 1st, or far away from other runners

## 6\. Choices (The Heart of the Game)

Each pick is 1 of 3 cards. Cards have a **rarity** (common / rare / epic) and a **tradeoff** where possible. Cards are picked After each lap, or at the start of the race (Cards at the start of a race have a much greater effect). Computer runners pick cards at the same moments (a random card with no special rules), so the field plays by the same rules as you.

| When | Card type | Card Effects |
| :---- | :---- | :---- |
| Pre-race | Preparation | Placeholder |
| After lap 1–3 | Encouragement (Determination), Strategy (Race IQ), Pacing (Speed, Stamina), Push (Top Speed, Kick) | Placeholder  |
|  |  |  |
| Pre-Race | Preparation | “Put these on quick” New Racing Shoes\! Provides a 10% speed bonus ignoring stamina loss. |
| After lap 1-3 | Pacing | “You gotta keep up with that guy\!”  Gain a 10% Speed boost until the next two people ahead are passed (cannot gain this card in 3rd, 2nd, and 1st place) |
| After lap 1-3 | Encouragement | “Remember why you do this\!” Double determination stat until bonus stamina is gained. |
| Pre-Race | Preparation | “Could I get some of that?” Use some HotIce© to decrease stamina drain by 20% for the whole race, Mile Pace becomes unreliable, showing a pace 30 seconds slower to 30 seconds faster than the real time |
| After lap 1-3 | Encouragement | “You’ve got people watching you\!” 50% Chance to increase determination by 50% for the whole race, 25% to do nothing, 25% chance to decrease determination by 30%. |
| After lap 3 | Push | “Less than a lap left\!” Increases top speed and kick by 15%, increases stamina drain by 15%. |
| After lap 1-3 | Strategy | “Don’t focus on the pain\!” Boost all stats by 5%, decrease Race IQ by 10% |
| Pre-Race | Prep | “Did you prep well, have some…” Boost race IQ by 15%, and stamina \+ kick by 5% |
| After lap 1-3 | Encouragement | “I won’t stop here” Trip and Fall, picking yourself back up for a permanent 100% determination boost for the race, lowering all other stats by 10%. This 10% loss is calculated after all other cards |
| After lap 1-3 | Push | “I can’t let them down” Under the gaze of a loved one, push yourself to increase your top speed by 10% |
| Pre-Race | Prep | “Coach Pep-Talk” Increases your speed and stamina during the race by 10% |
| Pre-Race | Prep | “Team Pep-Talk” Increases your determination by 10% per lap.  |
| After lap 1-3 | Strategy | “Tuck in your arms, don’t bob your head” Increases Race IQ  by 10% |
| After lap 3, in a Rivalry Race | Push | “I Recognize him.” When faced with a previous rival, increase kick by 100%, but race IQ decreases by 15% |
| After Lap 1-3 | Pacing | “You gotta get back on pace\!” Increases speed and stamina by 7.5%, decreases determination by 5% |
| After Lap 1-3, in a Rivalry Race | Pacing | “I want you on his back\!” Automatically match the speed of the person ahead of you, no matter if it’s above your top speed. Stamina reaching 0 will end this card’s effect. Will not match a slower speed than a runners average pace |
| After Lap 1-3 | Strategy | “You’re losing your form\!” Resets Race IQ back to the base stat \#, adding a bonus 5% to that number. This card bonus is calculated last. |
| After Lap 1-3 | Encouragement | “You’re our scorer\!” Increases Determination by 5% whenever passing a runner |
| After lap 2-3, after maintaining the same position for two laps (Must be below 3rd place) | Unique | “Flow State” Increases all stats by 15%, however all stats become unseeable.  |
| After lap 1-3, when passing and getting passed by the same runner two or more times (must be 3rd place or below) | Unique | “He thinks he can beat you\!” Randomly Gain two cards (excluding rivalry, and unique cards) |
| After lap 1-3 | Pacing | “Remember your pace in the last race\!” Increases speed by 10% |
| After lap 1-3 | Strategy | “Stop landing on your heels\!” Increases race IQ by 15%, decrease determination by 5% |
| After lap 1-3 | Encouragement  | “If you win here we will make it to state\!” Increases determination by 25%, speed by 5%, if getting passed however,  lose 5% determination |
|  |  |  |

- **Target number of cards for v1:** \_\_\_ *(suggested: 20–30)*  
- **Cards written by:** \_\_\_

## 7\. Between Races (Training)

Fixes the PB plateau: training permanently raises your baseline.

- After each race, pick **1 of 3 training sessions** (e.g., track workout \= \+kick, long run \= \+stamina, hill repeats \= \+stamina, Mile repeats \= \+speed)  
- EVERY TRAINING SESSION HAS A SMALL CHANCE TO PROVIDE A SMALL DETERMINATION BOOST  
- **Progress saved:** on device for v1

## 8\. Score and Leaderboard

- **Score:** 1600m finish time, lower is better  
- **Personal:** best time \+ PB history chart over time  
- **Global:** top 10 best times  
- **Daily Race:** same conditions and cards for everyone that day (seeded), so the global board is a fair skill contest  
- **Player name:** typed name, no accounts in v1

## 9\. Look and Feel

**The full look is defined in [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md), the single source of truth.** The lines below are a summary.

- **Style:** cozy low-poly, on a late afternoon: the stadium of the designers' real high school, seen from the sky, with the campus and hills around it. A fixed, steep camera frames the track during races and pulls back for the menus.  
- **Palette:** the school's colors: red track #C8544A, green turf #6C9E47, navy #2C3E73, cream lines #F2EBDA, warm haze #EADFC6. **You green #34B98A** is the only saturated color (your runner only). Gold #E8B84B means highlights and kicking. Full palette in the style guide.  
- **School name:** "TIGERS" and the big T are shown, never the school's own name.  
- **Typeface:** Baloo 2 (Google Fonts, rounded and bold)  
- **Mood in three words:** soft, chunky, calm  
- **Reference images:** Whistlevale (whistlevale.com) for the feel; screenshots go in [docs/style-refs/](docs/style-refs/)  
- **Do NOT want:** detailed textures, neon or fully saturated colors (except You green), pure white or black, black outlines, glossy materials, real-time shadows, bloom, cluttered set dressing  
- **Theme:** a normal 400 m oval track for v1. Zombie version maybe later (same mechanics, new models and card names).

## 10\. Screens for Version 1

- [ ] Title  
- [ ] Race conditions \+ pre-race pick  
- [ ] Race view (runners, lap, position, splits, stamina bar)  
- [ ] Mid-race card pick (after laps 1–3)  
- [ ] Results (splits, finish time, PB or not)  
- [ ] Training pick  
- [ ] Leaderboard (personal \+ global \+ daily)

## 11\. Scope for Version 1

- **In:** 1 track, 1 runner, 4 running styles, \~20 cards, training, leaderboard  
- **Out (later):** zombies, multiple tracks, character select, sound design, accounts  
- **Done means:** a teammate can play 3 races on their phone, beat their PB, and see it on the board.

## 12\. Tech (Pre-Filled)

- Three.js \+ Vite  
- Assets: Kenney / Quaternius (CC0, credited in game), Mixamo run animations  
- No AI-generated art; original art or credited kits only  
- Hosting: Vercel (own URL) · Leaderboard: Supabase · Code: public GitHub repo  
- Seeded random number generator for the Daily Race  
- Basic server-side sanity check on submitted times  
- Target 60 fps on a mid-range phone

## 13\. Instructions for Opus

1. Read this spec. Before writing code, list anything unclear or risky and ask about it.  
2. Propose a build plan in small, testable steps.  
3. **Build the race as a text-only simulation first:** pick cards, see splits and a finish time. No graphics until the choices feel meaningful.  
4. **Teach as you go.** Explain each system in plain language. When asked, let us write parts of the code ourselves and review it.  
5. Keep all card data in one simple data file so non-programmers can add and edit cards.  
6. After each step, tell us how to test it and wait for feedback.  
7. Keep section 9's style locked. Flag anything that breaks it.