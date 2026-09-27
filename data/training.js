// TRAINING SESSIONS. After a career race you earn a training point. Spend it on any of your
// runners: the game offers 3 of these sessions at random, and you pick one.
//
// name      What the session is called. Must be different from every other session's name.
// text      What it does, in plain words. This is what the player reads.
// effects   Permanent stat points: { speed: 3 } means +3 Speed points forever.
//           You can use: speed, topSpeed, stamina, kick, determination, raceIQ
//           A minus number takes points away (for sessions with a tradeoff).
//
// Every session also has a small chance of a small Determination boost (see data/tuning.js).

export const TRAINING = [
  {
    name: "Mile repeats",
    text: "Run hard miles with short rests. +3 Speed.",
    effects: { speed: 3 },
  },
  {
    name: "Track workout",
    text: "Fast 400s on the track, finishing each one strong. +3 Kick.",
    effects: { kick: 3 },
  },
  {
    name: "Long run",
    text: "A long, easy run to build your engine. +3 Stamina.",
    effects: { stamina: 3 },
  },
  {
    name: "Hill repeats",
    text: "Charge up a steep hill again and again. +2 Stamina, +1 Top Speed.",
    effects: { stamina: 2, topSpeed: 1 },
  },
  {
    name: "Sprint drills",
    text: "Short, all-out sprints with full rest. +3 Top Speed.",
    effects: { topSpeed: 3 },
  },
  {
    name: "Race film study",
    text: "Watch old races and learn where you lost ground. +3 Race IQ.",
    effects: { raceIQ: 3 },
  },
  {
    name: "Tempo run",
    text: "Comfortably hard for 20 minutes. +2 Speed, +1 Stamina.",
    effects: { speed: 2, stamina: 1 },
  },
  {
    name: "Team time trial",
    text: "Race your teammates in practice. +2 Determination, +1 Race IQ.",
    effects: { determination: 2, raceIQ: 1 },
  },
  {
    name: "Fartlek",
    text: "Mix fast and slow running as you feel it. +1 Speed, +1 Kick, +1 Race IQ.",
    effects: { speed: 1, kick: 1, raceIQ: 1 },
  },
  {
    name: "Double session",
    text: "Two hard workouts in one day. +4 Top Speed, but you're worn down: -1 Stamina.",
    effects: { topSpeed: 4, stamina: -1 },
  },
];
