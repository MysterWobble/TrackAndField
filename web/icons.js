// Chunky two-tone icons, drawn as inline SVG (docs/UI_DIRECTION.md §9). Original shapes only: a light base,
// one darker facet, and a dark outline so they read over the 3D scene without a box behind them.
// The colors come from CSS: --icon-base, --icon-facet and --icon-line (see style.css).

const svg = (body) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><g stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
const base = 'fill="var(--icon-base)" stroke="var(--icon-line)" stroke-width="2.4" paint-order="stroke"';
const facet = 'fill="var(--icon-facet)"';
const line = 'fill="none" stroke="var(--icon-line)" stroke-width="2"';

export const ICONS = {
  // A stopwatch: round face, a button on top, one hand.
  stopwatch: svg(`
    <rect x="9.5" y="1.8" width="5" height="3.2" rx="1.2" ${base}/>
    <circle cx="12" cy="13.5" r="8.3" ${base}/>
    <path d="M12 13.5 L20.3 13.5 A8.3 8.3 0 0 1 12 21.8 Z" ${facet}/>
    <path d="M12 13.5 L12 8.6" ${line}/>`),
  // A lap flag on a pole, with two darker checks.
  flag: svg(`
    <rect x="3.6" y="2.5" width="2.6" height="19.5" rx="1.2" ${base}/>
    <path d="M6.2 3.6 H19.6 L16.8 8 L19.6 12.4 H6.2 Z" ${base}/>
    <path d="M6.2 3.6 H10.6 V8 H6.2 Z M10.6 8 H15 V12.4 H10.6 Z" ${facet}/>`),
  // A medal on a ribbon, for your place.
  medal: svg(`
    <path d="M7 2.5 H11 L13.5 9 H9.5 Z M17 2.5 H13 L10.5 9 H14.5 Z" ${base}/>
    <circle cx="12" cy="15" r="6.6" ${base}/>
    <path d="M12 15 L18.6 15 A6.6 6.6 0 0 1 12 21.6 Z" ${facet}/>`),
  // A running shoe, for the kick (and runners).
  shoe: svg(`
    <path d="M2.6 17.6 V10.4 Q2.6 8 5 8 H8.6 L10.8 11.2 L15.4 12.4 Q21.4 13.6 21.4 17.6 Z" ${base}/>
    <rect x="2.6" y="17.2" width="18.8" height="3.6" rx="1.6" ${base}/>
    <path d="M2.6 10.4 Q2.6 8 5 8 H6.4 V17.6 H2.6 Z" ${facet}/>`),

  // A camera, for switching views.
  camera: svg(`
    <rect x="2.5" y="7" width="19" height="13" rx="2.5" ${base}/>
    <path d="M8 7 L9.6 3.8 H14.4 L16 7 Z" ${base}/>
    <circle cx="12" cy="13.5" r="4.2" ${base}/>
    <circle cx="12" cy="13.5" r="2" ${facet}/>`),

  // A speaker with sound waves (sound on), and with an X (sound off).
  speaker: svg(`
    <path d="M3 9 H7 L12.5 4.5 V19.5 L7 15 H3 Z" ${base}/>
    <path d="M3 9 H7 V15 H3 Z" ${facet}/>
    <path d="M15.5 9 Q17.5 12 15.5 15 M18.5 6.5 Q22 12 18.5 17.5" ${line}/>`),
  speakerOff: svg(`
    <path d="M3 9 H7 L12.5 4.5 V19.5 L7 15 H3 Z" ${base}/>
    <path d="M3 9 H7 V15 H3 Z" ${facet}/>
    <path d="M15.5 9 L21 15 M21 9 L15.5 15" ${line}/>`),

  // Card types (one icon each), and training.
  // Preparation: a clipboard checklist.
  clipboard: svg(`
    <rect x="4" y="3.5" width="16" height="18.5" rx="2" ${base}/>
    <path d="M4 15 H20 V20 A2 2 0 0 1 18 22 H6 A2 2 0 0 1 4 20 Z" ${facet}/>
    <rect x="8.5" y="1.8" width="7" height="4" rx="1.2" ${base}/>
    <path d="M7.4 10.6 L9.2 12.2 L12 9.2 M13.6 10.8 H16.6" ${line}/>`),
  // Strategy: a dotted route between two stops.
  route: svg(`
    <path d="M6.5 18 C 6.5 11, 17.5 13.5, 17.5 6.5" fill="none" stroke="var(--icon-line)" stroke-width="2.4" stroke-dasharray="0.1 3.6"/>
    <circle cx="6.5" cy="18.5" r="3.2" ${base}/>
    <circle cx="17.5" cy="5.5" r="3.2" ${base}/>
    <circle cx="17.5" cy="5.5" r="1.4" ${facet}/>`),
  // Encouragement: a heart.
  heart: svg(`
    <path d="M12 21 C 5 16, 2.5 12.5, 2.5 8.6 C 2.5 5.6, 4.8 3.5, 7.5 3.5 C 9.4 3.5, 11 4.6, 12 6.2 C 13 4.6, 14.6 3.5, 16.5 3.5 C 19.2 3.5, 21.5 5.6, 21.5 8.6 C 21.5 12.5, 19 16, 12 21 Z" ${base}/>
    <path d="M12 6.2 C 13 4.6, 14.6 3.5, 16.5 3.5 C 19.2 3.5, 21.5 5.6, 21.5 8.6 C 21.5 12.5, 19 16, 12 21 Z" ${facet}/>`),
  // Push: a lightning bolt.
  bolt: svg(`
    <path d="M13.8 2 L4.6 13.6 H11.2 L9.6 22 L19.4 9.8 H12.8 Z" ${base}/>
    <path d="M12.6 9.8 H19.4 L9.6 22 L11.2 13.6 Z" ${facet}/>`),
  // Unique: a star.
  star: svg(`<path d="${starPath(12, 12.6, 10.2, 4.6)}" ${base}/><path d="${starPath(12, 12.6, 10.2, 4.6, true)}" ${facet}/>`),
  // Training: a dumbbell.
  dumbbell: svg(`
    <rect x="6" y="10.8" width="12" height="2.4" rx="1" ${base}/>
    <rect x="2.4" y="6.5" width="4.4" height="11" rx="1.6" ${base}/>
    <rect x="17.2" y="6.5" width="4.4" height="11" rx="1.6" ${base}/>
    <rect x="2.4" y="12.5" width="4.4" height="5" rx="1.6" ${facet}/>
    <rect x="17.2" y="12.5" width="4.4" height="5" rx="1.6" ${facet}/>`),
};

// One icon per card type (card picks, and the card peek in the race display).
export const TYPE_ICONS = { Preparation: "clipboard", Strategy: "route", Encouragement: "heart", Pacing: "stopwatch", Push: "bolt", Unique: "star" };

// A five-pointed star as an SVG path. With `rightHalf`, just the right half (for the darker facet).
function starPath(cx, cy, outer, inner, rightHalf = false) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  const list = rightHalf ? [[cx, cy - outer], ...points.slice(1, 6), [cx, cy + inner]] : points;
  return `M${list.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L")} Z`;
}
