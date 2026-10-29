# Human / Private character lab

A local TypeScript + raw WebGPU feasibility implementation of [SPEC.md](SPEC.md). No accounts, backend, CDN assets, telemetry, or runtime network requests. **This is not the accepted M6 release.** Production asset and visual gates remain open; see [status and requirement coverage](docs/STATUS.md).

## Run

Use Node 22 or later, Chrome/Edge with WebGPU and hardware acceleration:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173. Dependencies are pinned in the lockfile. After installation, authoring works locally without Internet. `npm.cmd run build` creates `dist/`; serve it from localhost, not `file://`. `viewer.html` is the independent recipe viewer. IndexedDB is scoped to the browser profile and origin, so export JSON before changing ports or browsers. Clearing browser data deletes local saves.

## Use

Choose Alex, Mara, or Jules, or select the Male/Female Blender CC0 body base. Breast and butt size controls change local volume; waist and hip edits exclude the arms. Body and face sliders share the seed/preset model. Each has a numeric field, min/max, and default reset. Randomize shape and style independently. Use full body/head framing, front/side/back, drag to orbit, and wheel to zoom. The viewport supports arrow-key orbit and +/− zoom.

Enable Sculpt while in the neutral pose to highlight and drag regions. Horizontal/upward drags affect waist/stature, jaw/chin, arms/shoulders, or hips/legs. One released gesture makes one history entry. Escape cancels. Camera orbit is separate from sculpt mode; motion preview disables sculpt picking. Ctrl+Z and Ctrl+Shift+Z undo/redo outside text fields. Sliders are the precise editing alternative.

Face controls include mouth width, upper/lower lip fullness, mouth height and corner lift. In the Face panel, Speech preview provides 15 phonetic poses and a test sequence. Import matching local audio and a timed viseme JSON array (`{start,end,viseme,weight?}` per cue) or Rhubarb `mouthCues` JSON for playback synchronized to the audio clock. Files stay local. This is cue-driven playback, not audio-to-phoneme recognition. Speech and expression previews do not modify recipes. Pause and scrub, or choose neutral. Select a groom and adjust density, length (meters), curl, clumping, and color. Reset hair returns the simulation to its stored rest geometry. Diagnostic controls show wireframe, region/rigid-weight colors, labeled rig/attachments, and analytic collision proxies.

Committed edits autosave. Save character creates a named snapshot; Load restores it, Duplicate saves another name. Export/import carries versioned JSON. Invalid files retain the current recipe. Storage failure is reported; export remains available. CPU recipes survive GPU loss; Recover GPU recreates resources.

## Runtime

`src/runtime.ts` has no DOM/editor dependencies:

```ts
import { resolveRecipe, buildCharacter, manifest, setPose, dispose } from './src/runtime';
const recipe = resolveRecipe(JSON.parse(json));
const character = buildCharacter(recipe, manifest);
const boneMatrices = setPose(character, 'walk', 0.5);
console.log(character.geometryHash, character.mesh, character.rig);
dispose(character);
```

Coordinates are meters, Y-up, +Z forward. Use `mesh.vertexStride`: Blender bodies have 20 floats per vertex (position xyz, normal xyz, color rgb, dominant bone, region, four bone indices, four normalized weights, sparse morph row). Legacy diagnostic bodies retain their 11-float layout. The renderer applies speech/expression position and normal morphs before smooth bone skinning. Bone transforms are absolute neutral-to-posed matrices, inverse binds refit with shape. CPU geometry hashes use FNV-1a for regression identity, not cryptographic integrity. Canonical recipes expand defaults, validate, and sort object keys. Schema/generator/asset versions are exact; there are no legacy migrations because only version 1 exists. Unknown fields and asset IDs are rejected. Retained fixtures live in `fixtures/`.

Hair density follows `manifest.quality.maxStrands` (9,600 strands, 7,200 at the default density), with one simulated guide per ten render strands and eight simulation points per strand. Roots independently sample scalp triangles by area, while nearby guides carry follower motion. Guide dynamics use fixed 120 Hz steps, a four-step catch-up cap, damped inertial springs, head-motion response, subtle deterministic wind, five length-constraint passes, and analytic head/shoulder collisions. Cached rest lengths and allocation-free guide transforms keep the CPU solver responsive. GPU camera-facing ribbons use six tapered render segments, per-strand color variation, anisotropic dual-lobe highlights, 4× MSAA alpha-to-coverage, depth writes, and no per-frame readback. Density chooses a stable prefix; CPU groom geometry is generated only on character builds, never in the animation loop. The updated close-up appearance and performance still require human review on target hardware.

## Verification and assets

```powershell
npm.cmd run assets
npm.cmd test
npm.cmd run build
node scripts/browser-check.mjs
```

The browser check expects the dev server on port 5173 and Chrome at the standard Windows path. It runs edit → undo → redo → save → reload, rejects a malformed import, exports JSON, and loads it in the second viewer. Screenshots and results go to ignored `artifacts/`. These checks do not grant human visual acceptance.

Asset export generates male/female skinned GLBs with named speech/expression morph targets, the legacy diagnostic GLB, a manifest/groom description, and recipe fixtures. Blender body source and verified CC0 provenance live in `assets/sources/blender-human-base-meshes/`; CC0 MakeHuman visemes and provenance live in `assets/sources/makehuman-speech/`. The runtime bundles derived graphical data locally. Using Blender 4.2 or newer, regenerate in this order: `export-blender-bodies.py`, `retarget-speech.py` (initial transfer), `prepare-facial-geometry.py`, `add-fitted-eyelids.py`, `node scripts/smooth-mouth-boundary.mjs`, then `retarget-speech.py` again. All scripts live in `scripts/`. This opens the sealed lip seam, builds recessed mouth walls, fits the CC0 jaw/teeth and curved eyelids, then generates the final morph atlas. These automatically weighted/retargeted meshes still require artistic facial cleanup, oral anatomy, skin textures, separate garments and pose correctives; they are not a production-quality certification.

Diagnostics include a 60-second orbit/walk capture and a 20 load/reset cycle resource report. Downloads record adapter information, actual canvas resolution, sample percentiles, and tracked buffer bytes. Targets are uncalibrated. GPU budget must include MSAA/depth textures and driver overhead, not just tracked buffers. See `docs/STATUS.md` for hardware evidence and open gates.

