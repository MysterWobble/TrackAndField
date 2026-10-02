# Art Style Guide — v0.4

**Reference:** Whistlevale (whistlevale.com), a cozy low-poly diorama. We borrow the *feel*, not its assets or layouts.

**North star:** a warm, hand-built tabletop model of a track meet on a late afternoon. It should feel soft, chunky, calm and easy to read.

This file is the **single source of truth** for the look. SPEC §9 points here; `web/colors.js` and `web/style.css` implement it.

All values below are **starting points**. Tune them by putting a render next to a reference screenshot, not by looking at swatches.

---

## 1. Hard limits

- Three.js r186 on WebGL, running at 60 fps on a mid-range phone with 8 runners on screen.
- Runners are **≤ ~3k triangles** each. No real-time shadows. No post-processing by default.
- No detailed textures. The only image allowed is a single palette swatch image (a Kenney `colormap.png`) when a kit uses one.
- **No AI-generated art.** Use original art or credited CC0 kits (Quaternius, Kenney) only, and log each one in `CREDITS.md`.
- The UI must read at **844 × 390** landscape.

## 2. Rules

**Do**
1. Use flat-shaded low-poly shapes, with one solid color per face.
2. Keep the palette warm and slightly desaturated. The one reserved saturated accent is **You green**.
3. Make everything matte, with no shine and no specular highlights.
4. Simplify natural things into chunky blobs. A tree is 3–6 canopy lumps on a plain trunk; a crowd member is a capsule with a ball head.
5. Prefer bold silhouettes and big color blocks over small details, because everything is seen from high up.
6. Light with one warm sun plus a warm sky light. Shadows are soft, warm-dark blobs, never black.
7. Group props into zones with bare ground between them. Calm beats busy.
8. Let the distance fade into **warm haze**, not blue-grey.

**Avoid:** detailed textures (wood grain, fabric, fur); neon or fully saturated colors (except You green); pure `#FFFFFF` and pure `#000000`; black outlines or toon strokes; glossy materials; real-time shadows; bloom; cluttered set dressing.

## 3. Palette

Colors are sRGB hex values, entered as-is into `THREE.Color`. They are base material colors, so expect them to look slightly darker once lit.

### Scene

| Token | Hex | Use | Replaces |
|---|---|---|---|
| `track` | `#C0654A` | track surface | track red (warmed toward terracotta) |
| `trackEdge` | `#9E4F39` | curbs, inner edge | — |
| `lane` | `#F2EBDA` | lane lines, start/finish | lane white (cream, never pure white) |
| `infield` | `#8CA65A` | infield grass | infield green (shifted toward sage) |
| `infieldStripe` | `#7F9A4F` | mowing stripes (optional) | — |
| `ground` | `#D4C48A` | outer ground, paths | — |
| `standCream` | `#E3D6B8` | stand concrete | — |
| `oak` / `oakDark` | `#8B5A2B` / `#6B4226` | seating, wood / trim, posts | — |
| `brass` | `#B8913F` | railings, small metal accents | — |
| `roof` | `#2E4A3C` | stand roofs, awnings | — |
| `canopy` / `canopyDark` | `#8BAE56` / `#6E8F45` | tree canopies | — |
| `pine` | `#2F5D55` | background conifers | — |
| `trunk` | `#7A5534` | tree trunks | — |
| `earth1` / `2` / `3` | `#B8A788` / `#A08F70` / `#85765A` | diorama base bands (see §8) | — |
| `backdrop` / `backdropEdge` | `#EFE6D0` / `#CDBB98` | CSS backdrop behind the canvas (center / edges) | sky blue |
| `haze` | `#EADFC6` | fog | — |
| `sun` | `#FFE3B5` | sun light color | — |
| `shadow` | `#3A3326` @ 35% | blob shadows | — |

### Runners

| Token | Hex | Notes |
|---|---|---|
| `you` | `#34B98A` | **Your runner only.** The only saturated color in the scene. |
| `kit1` | `#EFE6D2` | cream, with charcoal shorts |
| `kit2` | `#2F4A7A` | navy |
| `kit3` | `#B39CD0` | lavender |
| `kit4` | `#7A4E7E` | plum |
| `kit5` | `#6FA8D6` | sky |
| `kit6` | `#3B3A3F` | charcoal, with cream shorts |
| `kit7` | `#E39FAE` | rose |

Kit rules:
- No reds or oranges, because they disappear against the track. No greens, because green is reserved for you. No yellows, because gold means kicking.
- Shorts are one step darker than the shirt, or a neutral cream or charcoal.
- **Grayscale test:** take a screenshot of all 8 runners, convert it to grayscale, and check that you can still see at least 4 distinct light/dark groups.

### UI

| Token | Hex | Use | Replaces |
|---|---|---|---|
| `gold` | `#E8B84B` | highlights, active states, medals | gold |
| `ink` | `#22304A` | text on light cards | navy |
| `panel` / `panelDeep` | `#1E3A33` / `#142525` | dark panels | — |
| `cream` | `#F4ECD8` | text on dark panels, light cards | — |

```js
// web/colors.js — proposed values; map these onto the existing keys
export const COLORS = {
  track: 0xC0654A, trackEdge: 0x9E4F39, lane: 0xF2EBDA,
  infield: 0x8CA65A, infieldStripe: 0x7F9A4F, ground: 0xD4C48A,
  standCream: 0xE3D6B8, oak: 0x8B5A2B, oakDark: 0x6B4226, brass: 0xB8913F, roof: 0x2E4A3C,
  canopy: 0x8BAE56, canopyDark: 0x6E8F45, pine: 0x2F5D55, trunk: 0x7A5534,
  earth1: 0xB8A788, earth2: 0xA08F70, earth3: 0x85765A,
  haze: 0xEADFC6, sun: 0xFFE3B5, shadow: 0x3A3326,
  you: 0x34B98A,
  kits: [0xEFE6D2, 0x2F4A7A, 0xB39CD0, 0x7A4E7E, 0x6FA8D6, 0x3B3A3F, 0xE39FAE],
  gold: 0xE8B84B, ink: 0x22304A,
};
```

## 4. Materials

```js
const cache = new Map();
export function mat(hex) {
  if (!cache.has(hex)) {
    cache.set(hex, new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  }
  return cache.get(hex);
}
```

- Use **Lambert, not Standard**. It's cheaper and matte by default.
- Share one material per color (the cache above), and merge static meshes by material.
- **Never change a shared material at runtime.** Anything that changes gets its own material: your runner's materials are cloned (`mat(hex).clone()`) so the kick glow lights up only you.
- **Fake the soft shading in creases:** give undersides, bases and corners a color one step darker instead of computing it in real time.

## 5. Lighting and atmosphere

```js
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // transparent, so the CSS backdrop shows
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;   // keeps palette hues honest
renderer.shadowMap.enabled = false;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

scene.add(new THREE.HemisphereLight(0xF3E7CC, 0x8A7A55, 1.5)); // warm sky, olive bounce
const sun = new THREE.DirectionalLight(COLORS.sun, 2.0);
sun.position.set(-1, 1.1, 0.6).multiplyScalar(50);            // ~45° up, from the side
scene.add(sun);

scene.fog = new THREE.Fog(COLORS.haze, NEAR, FAR);              // light: only the far edge of the slab softens
// No scene.background. It would cover the CSS backdrop.
```

- **The sun comes from the side, not from overhead.** Every runner and stand then has a lit side and a shaded side, and that contrast is what makes flat shading read.
- The shaded side should come out warm olive-brown. If it looks grey, warm up the hemisphere's ground color before raising any intensity.
- **Blob shadows:** a `CircleGeometry` in `shadow` at about 35% opacity with `depthWrite: false`, nudged slightly away from the sun. **Your runner's blob gets a You-green ring.**
- **Backdrop:** there's no sky, because the camera looks steeply down. Behind the transparent canvas, use a soft warm vignette in CSS, which costs nothing:
  `background: radial-gradient(ellipse at 50% 45%, #EFE6D0 0%, #E3D5B8 60%, #CDBB98 100%);`
- **The fog won't match the CSS exactly.** Tone mapping shifts the fog color slightly but not the CSS behind the canvas. Tune the fog color by eye until the slab's far edge melts into the backdrop.

## 6. Shapes and budgets

| Asset | Build | Budget |
|---|---|---|
| Track | code: flat ring, lane lines as thin geometry | merged |
| Stands | code: stepped boxes, oak seats, green roof | merged per material |
| Crowd | `InstancedMesh`: capsule body + ball head, 4–5 muted palette colors | 1–2 draw calls |
| Trees | `IcosahedronGeometry(r, 0)` × 3–6 lumps + cylinder trunk, merged then instanced | ~100 tris each |
| Runners | Quaternius GLB | ≤ 3k tris |
| Props | Kenney GLB or code | small, grouped into zones |

- **Whole scene:** aim for fewer than ~100 draw calls and ~150k triangles. These are rough targets, so check `renderer.info` on a real phone.
- **Edges:** terrain, track and rocks have sharp facets. Built objects (stands, hurdles, signs) can have a single bevel or rounded corner.
- **Proportions:** slightly chunky and toylike. Where models allow, favor thick limbs and big heads over realism.

## 7. Imported assets

```js
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  console.log(o.material.name);  // log names once, then fill in PALETTE_MAP
  o.material = mat(PALETTE_MAP[o.material.name] ?? COLORS.standCream);
  o.castShadow = o.receiveShadow = false;
});
```

- **Quaternius:** map each named material (skin, hair, shirt, shorts, shoes) to the palette. Kits change only the shirt and shorts colors.
- **Kenney:** many kits color their models from a shared `colormap.png`. Replacing the material with one solid color would flatten every part into that color. For those kits, recolor the PNG once to match our palette. Only use the override above on kits that have a separate material per part.
- Normalize scale when loading. All runners use one shared scale constant.
- Don't mix palettes. Every imported asset gets remapped before it ships.

## 8. Camera, composition and the campus setting

- The camera stays fixed and steep, with the whole oval in frame plus a margin. **Runner readability beats showing a horizon.**
- **Two views (v0.4).** *Race view:* the whole stadium just fits, so the runners stay as big as possible. *Menu view:* pulled back to show the campus and the big T on the hill. The camera glides between them (about 1.6 s, eased) when a race starts or ends.
- **Campus setting (v0.3: replaces the diorama base).** The stadium is part of the real high school, seen from the air: the campus runs past the edges of the screen and the surrounding hills fade into warm haze. Nothing floats.
  - Laid out from the designers' Google Maps screenshots (used as a guide only; no map imagery goes in the game), simplified into low-poly shapes. North of the home stands: sand volleyball and basketball courts, the two-story TIGERS building, the pool, and the main buildings. Northeast: 8 tennis courts and a lot under solar canopies. West: a big lot with solar canopies, lacrosse portables, and the baseball field with a navy outfield wall. Northwest: the hill with the big T. Southwest and south: a big lawn with a softball diamond, and a second softball field. East: the native plant garden, the road (which turns into a path), and the parkway cut into the hill.
  - The real campus sits about 10° off the track's line; the hills, roads and ball fields are turned to match, while the buildings line up with the track.
  - **Team name and T (v0.4):** "TIGERS" and the big T are shown (end zones, midfield, press box, scoreboard, the TIGERS building, the hill). **The school's own name is never shown.** All lettering is original block letters built from shapes in `web/lettering.js`, not a font.
  - The hill T is about four times its real size so it reads from the air.
  - The race view includes the front of the TIGERS building so the scene reads as the school, not just a track.
  - `earth1`–`3` are no longer used (they were for the slab's sides).
- Use a moderate field of view of about 35–45°, then tune it against the reference.
- Keep clear zones: track, infield, stands, campus, with open ground between them.

## 9. Motion

- **Tie the run cycle to ground speed** (`action.timeScale = speed / clipSpeed`) so feet don't slide.
- Everything eases: camera moves, UI panels, finish-line moments. Nothing snaps.
- Background life is small and slow. The crowd bobs a few centimeters each, out of sync with each other; trees may sway slightly. Keep it cheap by doing it in the vertex shader or updating the instances a few times a second.
- The baseline pace is calm, like a toy train. No screen shake.
- **The one exception is your kick.** It's the single loud moment, restyled to fit:
  - **Glow:** your runner turns emissive `gold`, using its own material (see §4).
  - **Sparks** become a handful of soft warm motes: short-lived additive sprites or `Points`.
  - **Speed lines** in `cream` at low opacity.
  - **Edge glow** is a soft gold vignette in CSS over the canvas, which costs nothing.

## 10. UI (HTML/CSS)

```css
:root {
  --panel: #1E3A33; --panel-deep: #142525;
  --cream: #F4ECD8; --ink: #22304A;
  --gold: #E8B84B; --olive: #8A9A5B; --you: #34B98A;
  --radius: 16px; --pill: 999px;
  --shadow: 0 4px 14px rgba(20, 37, 37, .35);
  font-family: 'Baloo 2', system-ui, sans-serif;
}
```

- **Panels:** dark green rounded cards with cream text and a soft shadow. Light cards use a cream background with ink text.
- **Buttons:** pill shaped. Selected = 2px gold outline. Primary action = gold fill with ink text.
- **Toggles:** olive track with a cream knob. **Icons:** simple cream line icons with a ~2px stroke.
- **Type sizes at 844 × 390:** headings 22–26px at weight 700, body 15–16px at weight 500, labels 12px at weight 600. Nothing goes smaller than 12px.
- Touch targets are at least 44px. Respect `env(safe-area-inset-left/right)` so nothing hides under a notch in landscape.
- **The race display** switches from light panels to the same dark panels with cream text.
- Copy is warm, short and a little playful.

## 11. Reference images

Put these in `docs/style-refs/`:

| File | Used to match |
|---|---|
| `01-wide-afternoon.png` | overall palette and haze |
| `02-closeup-terrain.png` | facet size, edge treatment |
| `03-closeup-trees.png` | how canopies are simplified |
| `04-lamplight.png` | evening mode (later) |
| `05-ui-panel.png` | panel, button and toggle styling |

**How to match:** render the same kind of shot, put it next to the reference, and adjust the base colors and lights until they're close.

## 12. Decisions

| Decision | Status |
|---|---|
| Diorama base | **Replaced (v0.3)** by the campus setting: the real high school from the air. See §8. |
| Track color | **The school's colors (v0.3):** red track `#C8544A`, green turf `#6C9E47`, navy end zones `#2C3E73`, white field border, gray walkway. Defined as `TRACK` and `CAMPUS` in `web/colors.js`; they replace `track`/`trackEdge`/`infield` in §3. |
| School name and logo | **Team name and T shown (v0.4):** "TIGERS" and the big T, never the school's own name. |
| Evening race mode | **Later.** It could arrive as a race condition: navy sky, glowing floodlight bulbs with soft additive halos, no bloom pass. |
| Tilt-shift blur | **Wait** for the phone test (part 5), and only ever behind a quality toggle. |
