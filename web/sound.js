// Sounds, made in code with the browser's Web Audio (no sound files, nothing to license), plus the
// designers' music tracks (public/music/).
// Kept soft and few, to match the calm look (STYLE_GUIDE.md §9): a starting gun, a last-lap bell, a whoosh
// when you kick, little ticks for card picks, and a fanfare for a win or a personal best.
// (A crowd murmur made from noise was tried, but it sounded like static, so the music carries the mood.)
//
// Browsers only allow sound after the player has tapped or pressed a key, so audio starts on the first
// tap. Mute with M (or the button on the home screen); the choice is remembered in this browser.

const MUTE_KEY = "1600m.muted";
const VOLUME = 0.5; // everything at once; each sound sets its own level under this

let ctx = null;
let master = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch {
  // storage blocked: sound starts on
}

// The audio graph, made on the first tap or key press.
function start() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume();
    startMusic();
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return; // very old browser: the game just runs silent
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(ctx.destination);
  startMusic();
}
window.addEventListener("pointerdown", start);
window.addEventListener("keydown", start);

// Go quiet when the game isn't on screen (another tab or app, or the phone is locked), and pick up again
// when it comes back.
document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) {
    ctx.suspend();
    if (music) for (const track of [music.base, music.intense]) track.audio.pause();
  } else {
    ctx.resume();
    if (music) for (const track of [music.base, music.intense]) track.audio.play().catch(() => {});
  }
});

const ready = () => ctx !== null && ctx.state === "running";
export const audioState = () => ctx?.state ?? "not started yet"; // for checking: "running" once a tap unlocks it

// One second of white noise, reused by the noisy sounds (the gun's crack, the kick whoosh).
let noiseBuffer = null;
function noise() {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  return source;
}

// A gain that rises fast and fades out: the shape of most short sounds.
function envelope(peak, attack, decay, when = ctx.currentTime) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  return gain;
}

// A short tone (sine or triangle).
function tone(frequency, { type = "sine", peak = 0.2, attack = 0.005, decay = 0.25, when = ctx.currentTime } = {}) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  const gain = envelope(peak, attack, decay, when);
  osc.connect(gain).connect(master);
  osc.start(when);
  osc.stop(when + attack + decay + 0.05);
}

// --- The sounds ---

// The starting gun: a sharp crack and a low thump.
export function startGun() {
  if (!ready()) return;
  const crack = noise();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1200;
  crack.connect(filter).connect(envelope(0.9, 0.002, 0.35)).connect(master);
  crack.start();
  crack.stop(ctx.currentTime + 0.45);
  const thump = ctx.createOscillator();
  thump.frequency.setValueAtTime(140, ctx.currentTime);
  thump.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.25);
  thump.connect(envelope(0.6, 0.003, 0.3)).connect(master);
  thump.start();
  thump.stop(ctx.currentTime + 0.4);
}

// The last-lap bell: a few rings of a bright, slightly clangy bell.
export function lastLapBell() {
  if (!ready()) return;
  for (let ring = 0; ring < 3; ring++) {
    const when = ctx.currentTime + ring * 0.32;
    for (const [ratio, peak] of [[1, 0.16], [2.76, 0.07], [5.4, 0.04]]) tone(1250 * ratio, { peak, decay: 0.6, when });
  }
}

// The kick: a short rising whoosh.
export function kickWhoosh() {
  if (!ready()) return;
  const source = noise();
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(300, ctx.currentTime);
  band.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.35);
  source.connect(band).connect(envelope(0.35, 0.06, 0.35)).connect(master);
  source.start();
  source.stop(ctx.currentTime + 0.5);
}

// Card picks: a soft tick when you select one, a two-note chime when you confirm.
export function tick() {
  if (!ready()) return;
  tone(880, { type: "triangle", peak: 0.12, decay: 0.08 });
}
export function confirm() {
  if (!ready()) return;
  tone(660, { type: "triangle", peak: 0.12, decay: 0.15 });
  tone(990, { type: "triangle", peak: 0.12, decay: 0.25, when: ctx.currentTime + 0.09 });
}

// A win or a personal best: a quick rising fanfare.
export function fanfare() {
  if (!ready()) return;
  [523, 659, 784, 1047].forEach((frequency, i) => {
    const when = ctx.currentTime + i * 0.11;
    tone(frequency, { type: "triangle", peak: 0.16, decay: i === 3 ? 0.7 : 0.18, when });
  });
}

// --- Music (the designers' tracks, in public/music/) ---
// The base track plays in the menus and the race; the more intense version takes over for the last lap.
// Both start on the first tap and loop (the intense one silent until needed, which also keeps phones happy
// about playing it later). Switching lines the incoming track up with the outgoing one (they're versions
// of the same song) and crossfades.

const TRACKS = { base: "/music/MainRaceMusic.mp3", intense: "/music/SlightlyMoreIntenseRaceMusic.mp3" };
const MUSIC_LEVEL = 0.55; // music volume, under the overall volume
const CROSSFADE_SECONDS = 2.5;
const MUSIC_KEY = "1600m.music";
let musicOn = true;
try {
  musicOn = localStorage.getItem(MUSIC_KEY) !== "off";
} catch {
  // storage blocked: music starts on
}
let music = null; // { bus, base: { audio, gain }, intense: { audio, gain }, playing: "base" | "intense" }

function startMusic() {
  if (music || !ctx) return;
  const bus = ctx.createGain();
  bus.gain.value = musicOn ? MUSIC_LEVEL : 0;
  bus.connect(master);
  const track = (src, level) => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    const gain = ctx.createGain();
    gain.gain.value = level;
    ctx.createMediaElementSource(audio).connect(gain).connect(bus);
    audio.play().catch(() => {}); // a missing file just means no music
    return { audio, gain };
  };
  music = { bus, base: track(TRACKS.base, 1), intense: track(TRACKS.intense, 0), playing: "base" };
}

// true = the intense version (last lap), false = the base track.
export function musicIntensity(intense) {
  if (!music) return;
  const want = intense ? "intense" : "base";
  if (music.playing === want) return;
  const from = music[music.playing];
  const to = music[want];
  if (Number.isFinite(to.audio.duration) && to.audio.duration > 0) to.audio.currentTime = from.audio.currentTime % to.audio.duration;
  const now = ctx.currentTime;
  for (const [track, level] of [[from, 0], [to, 1]]) {
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setValueAtTime(track.gain.gain.value, now);
    track.gain.gain.linearRampToValueAtTime(level, now + CROSSFADE_SECONDS);
  }
  music.playing = want;
}

export const isMusicOn = () => musicOn;
// For checking: which track is up, and whether each one is playing and where.
export const musicState = () =>
  music && {
    playing: music.playing,
    base: { paused: music.base.audio.paused, at: music.base.audio.currentTime.toFixed(1), level: music.base.gain.gain.value.toFixed(2) },
    intense: { paused: music.intense.audio.paused, at: music.intense.audio.currentTime.toFixed(1), level: music.intense.gain.gain.value.toFixed(2) },
  };
export function toggleMusic() {
  musicOn = !musicOn;
  try {
    localStorage.setItem(MUSIC_KEY, musicOn ? "on" : "off");
  } catch {
    // fine: it just won't be remembered
  }
  if (music) music.bus.gain.setTargetAtTime(musicOn ? MUSIC_LEVEL : 0, ctx.currentTime, 0.2);
  return musicOn;
}

// --- Mute ---

export const isMuted = () => muted;
const muteListeners = []; // things to update when sound turns on or off (the speaker button)
export const onMuteChange = (listener) => muteListeners.push(listener);
export function toggleMute() {
  muted = !muted;
  for (const listener of muteListeners) listener(muted);
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // fine: it just won't be remembered
  }
  if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.05);
  return muted;
}
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyM" && !event.repeat) toggleMute();
});
