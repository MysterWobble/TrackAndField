// ALL THE CARDS. Add, remove, or change cards here.
//
// Every card is one block between { and }, with a comma after the closing }.
// The game checks this file every time it starts, and tells you in plain English if something's wrong.
//
// name      What the card says (the quote). Must be different from every other card's name.
// type      One of: "Preparation", "Pacing", "Encouragement", "Strategy", "Push", "Unique"
// when      When it can show up: "pre-race", "after lap 1-3", "after lap 2-3", or "after lap 3"
// text      What the card does, in plain words. This is what the player reads.
// effects   Stat changes for the rest of the race, in STAT POINTS, the same as training:
//           { speed: 20 } means +20 Speed points. 1 Speed point = about 1 second faster over the race.
//           You can use: speed, topSpeed, stamina, kick, determination, raceIQ, staminaDrain
//             speed         = cruising speed (also raises top speed). Costs stamina, because you're pushing harder.
//             topSpeed      = top speed only (a faster kick)
//             stamina       = bigger stamina tank (same as a Stamina point from training)
//             determination = +1 point = +1% chance to recover stamina when you're running low
//             raceIQ        = fewer mistakes (boxed in, swinging wide, wobbly pace); 50 = no mistakes
//             staminaDrain  = the one PERCENT setting: how fast stamina gets used (+15 = 15% faster, -20 = 20% slower)
//
// Optional settings:
// multiply: { determination: 2 }   Multiplies a stat (2 = double, 0.5 = half). Works on stamina, kick, determination, raceIQ.
// freeSpeed: true           The speed boost doesn't cost extra stamina (like new shoes).
// rivalryOnly: true         Only shows up in a Rivalry Race. (Rivalry and Unique cards show up less often.)
// minPosition: 4            Only shows up when you're 4th or worse.
// requires: "..."           A special condition (see src/cards.js): "samePositionTwoLaps" or "backAndForth"
// special: "..."            A special behavior written in code (see src/cards.js), like "until you pass two runners"

export const CARDS = [
  // ---------- PRE-RACE ----------
  {
    name: "Put these on quick",
    type: "Preparation",
    when: "pre-race",
    text: "New racing shoes! +20 Speed, and it doesn't cost extra stamina.",
    effects: { speed: 20 },
    freeSpeed: true,
  },
  {
    name: "Could I get some of that?",
    type: "Preparation",
    when: "pre-race",
    text: "Some HotIce©: stamina drains 20% slower all race, but your pace readout becomes unreliable (up to 30 seconds off).",
    effects: { staminaDrain: -20 },
    special: "hotIce",
  },
  {
    name: "Did you prep well, have some…",
    type: "Preparation",
    when: "pre-race",
    text: "+15 Race IQ, +5 Stamina and +5 Kick.",
    effects: { raceIQ: 15, stamina: 5, kick: 5 },
  },
  {
    name: "Coach Pep-Talk",
    type: "Preparation",
    when: "pre-race",
    text: "+20 Speed and +10 Stamina.",
    effects: { speed: 20, stamina: 10 },
  },
  {
    name: "Team Pep-Talk",
    type: "Preparation",
    when: "pre-race",
    text: "+10 Determination on every lap.",
    effects: { determination: 10 },
  },

  // ---------- AFTER A LAP ----------
  {
    name: "You gotta keep up with that guy!",
    type: "Pacing",
    when: "after lap 1-3",
    text: "+20 Speed until you pass the next two runners. Only when you're 4th or worse.",
    effects: { speed: 20 },
    minPosition: 4,
    special: "keepUpWithThatGuy",
  },
  {
    name: "Remember why you do this!",
    type: "Encouragement",
    when: "after lap 1-3",
    text: "Double Determination, until it gives you bonus stamina.",
    multiply: { determination: 2 },
    special: "rememberWhy",
  },
  {
    name: "You've got people watching you!",
    type: "Encouragement",
    when: "after lap 1-3",
    text: "50% chance: +50% Determination for the race. 25%: nothing. 25%: -30% Determination.",
    special: "peopleWatching",
  },
  {
    name: "Less than a lap left!",
    type: "Push",
    when: "after lap 3",
    text: "+30 Top Speed and +15 Kick, but stamina drains 15% faster.",
    effects: { topSpeed: 30, kick: 15, staminaDrain: 15 },
  },
  {
    name: "Don't focus on the pain!",
    type: "Strategy",
    when: "after lap 1-3",
    text: "+10 Speed, +5 Stamina, Kick and Determination, but -10 Race IQ.",
    effects: { speed: 10, stamina: 5, kick: 5, determination: 5, raceIQ: -10 },
  },
  {
    name: "I won't stop here",
    type: "Encouragement",
    when: "after lap 1-3",
    text: "Trip and fall (lose a second or two), then get up with double Determination. Stamina, Kick and Race IQ -10%, applied after every other card.",
    multiply: { determination: 2 },
    special: "tripAndFall",
  },
  {
    name: "I can't let them down",
    type: "Push",
    when: "after lap 1-3",
    text: "Under the gaze of a loved one: +20 Top Speed.",
    effects: { topSpeed: 20 },
  },
  {
    name: "Tuck in your arms, don't bob your head",
    type: "Strategy",
    when: "after lap 1-3",
    text: "+10 Race IQ.",
    effects: { raceIQ: 10 },
  },
  {
    name: "I Recognize him.",
    type: "Push",
    when: "after lap 3",
    text: "Your rival is right there: double Kick, but -15 Race IQ.",
    effects: { raceIQ: -15 },
    multiply: { kick: 2 },
    rivalryOnly: true,
  },
  {
    name: "You gotta get back on pace!",
    type: "Pacing",
    when: "after lap 1-3",
    text: "+15 Speed, +8 Stamina, -5 Determination.",
    effects: { speed: 15, stamina: 8, determination: -5 },
  },
  {
    name: "I want you on his back!",
    type: "Pacing",
    when: "after lap 1-3",
    text: "Match the speed of the runner ahead, even past your top speed (never slower than your normal pace). Ends when your stamina runs out. Only when you're 2nd or worse.",
    rivalryOnly: true,
    minPosition: 2,
    special: "onHisBack",
  },
  {
    name: "You're losing your form!",
    type: "Strategy",
    when: "after lap 1-3",
    text: "Resets Race IQ to your base Race IQ +5, ignoring every other Race IQ change.",
    special: "losingForm",
  },
  {
    name: "You're our scorer!",
    type: "Encouragement",
    when: "after lap 1-3",
    text: "+5 Determination every time you pass a runner.",
    special: "scorer",
  },
  {
    name: "Flow State",
    type: "Unique",
    when: "after lap 2-3",
    text: "+30 Speed and +15 Stamina, Kick, Determination and Race IQ, but your stats become hidden. Only if you've held the same position for two laps, 4th or worse.",
    effects: { speed: 30, stamina: 15, kick: 15, determination: 15, raceIQ: 15 },
    minPosition: 4,
    requires: "samePositionTwoLaps",
    special: "flowState",
  },
  {
    name: "He thinks he can beat you!",
    type: "Unique",
    when: "after lap 1-3",
    text: "Gain two random cards (not rivalry or unique). Only after you and one runner have passed each other twice each, 3rd or worse.",
    minPosition: 3,
    requires: "backAndForth",
    special: "heThinks",
  },
  {
    name: "Remember your pace in the last race!",
    type: "Pacing",
    when: "after lap 1-3",
    text: "+20 Speed.",
    effects: { speed: 20 },
  },
  {
    name: "Stop landing on your heels!",
    type: "Strategy",
    when: "after lap 1-3",
    text: "+15 Race IQ, -5 Determination.",
    effects: { raceIQ: 15, determination: -5 },
  },
  {
    name: "If you win here we will make it to state!",
    type: "Encouragement",
    when: "after lap 1-3",
    text: "+25 Determination and +10 Speed, but -5 Determination every time you get passed.",
    effects: { determination: 25, speed: 10 },
    special: "state",
  },
];
