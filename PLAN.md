# Build Plan

## Tools
| Purpose | Tool | Link |
|---|---|---|
| Build | Claude Code (Opus 5.5) | https://docs.claude.com |
| Setup | Node.js, Git, GitHub | https://nodejs.org · https://github.com |
| Engine | Three.js | https://threejs.org |
| Scaffold | Vite | https://vite.dev |
| 3D assets | Kenney (CC0) | https://kenney.nl/assets |
| Animated characters | Quaternius (CC0) | https://quaternius.com |
| Run animations | Mixamo | https://www.mixamo.com |
| Model tweaks (optional) | Blender + Blender MCP | https://www.blender.org · https://github.com/ahujasid/blender-mcp |
| Hosting (own URL) | Vercel | https://vercel.com |
| Leaderboard | Supabase | https://supabase.com |
| Extra distribution (later) | Wavedash | https://wavedash.com/developers |

Project folder: `~/Projects/game-name` (Mac) or `C:\Users\you\Projects\game-name` (Windows). Avoid iCloud- or OneDrive-synced folders.

## Steps
1. **Setup (about 30 minutes).** Install Node, Git, and Claude Code. Create the project folder and a public GitHub repo. Add SPEC.md, PLAN.md, and DEVLOG.md.
2. **Finish the spec together.** Fill the blanks. Your stepson writes the first 20 cards.
3. **Text-only race sim.** Claude Code builds the race math and card system with no graphics. Play it 20+ times and tune the numbers until choices clearly matter. He writes or co-writes this part.
4. **Training + save.** Add training between races and save progress on the device.
5. **3D race view.** Low-poly stadium, fixed angled camera, animated runners following the track path. Add the HUD (lap, position, splits, stamina).
6. **Card UI + polish.** Clean card design, rarity colors, a PB celebration, simple sound.
7. **Leaderboard.** Supabase for personal best history, global top 10, and the Daily Race.
8. **Ship.** Deploy to Vercel and test on phones.
9. **Playtest.** Have his team play it. Log feedback in DEVLOG.md, make changes, redeploy.

**Tomorrow's target:** steps 1–3, and step 4 if time allows. A fun text-only race is the real milestone. Everything after is presentation.
