# Implementation status

## Current mesh and speech integration (2026-10-20)

The renderer now uses the CC0 Blender realistic male/female body bases. The latest asset export contains 50,797 male vertices / 99,966 triangles and 50,825 female vertices / 100,408 triangles, including fitted eyes. A fitted 11-bone armature, Blender heat weights and four normalized influences replace rigid skinning for these bodies. The original diagnostic body remains available for existing recipes. Body and face sliders use localized procedural warps, with arm exclusion for waist/hips and a smooth neck transition. Breast/butt volume and four additional mouth controls are available.

Fifteen CC0 MakeHuman Visemes 02 targets and seven Faceunits 01 expression targets have been automatically retargeted by nearest-surface barycentrics to each body. Sparse position/normal morphs render before skinning. The Face panel provides manual speech poses, a test sequence, timed Oculus/Rhubarb cue import and matching local audio playback. There is no audio-to-phoneme recognition. Exported GLBs contain the skin and named morph targets. Licenses and original source assets are retained under assets/sources/.

This is an integrated base and speech prototype, not an artist-approved realistic facial rig: extreme lip contact, detailed tongue anatomy, skin textures, garment assets, facial correctives and pose review remain open. The automatic transfer can visibly stretch mouth interior topology in open poses. The earlier feasibility inventory and coverage below describe the initial delivery and are superseded by this integration where explicitly stated. SPEC.md and production acceptance gates are unchanged.

## Contract status

SPEC.md now records the user-approved AAA close-up hair ambition. This delivery is a feasibility implementation and editor/runtime foundation, **not M6 complete**. The spec requires R-001/R-002 to be resolved before dependent production. No authored hair source assets are present and Blender is not installed. Original procedural meshes and grooms are implemented to make the system runnable and expose the remaining quality problems. They must not be presented as production assets. Human AS-001 acceptance is pending.

## Inventory and provenance (2026-10-20)

- Initial repository: SPEC.md only; no Git metadata, instructions, source assets, textures, rigs, licenses, or experiments.
- Toolchain: Windows, Node 22.14.0, npm 10.9.2. Local Chrome and Edge available. Npm PowerShell script is execution-policy restricted, so instructions use npm.cmd.
- Pinned TypeScript, Vite, WebGPU types, tsx, and Playwright Core installed; lockfile retained. No runtime dependencies or external assets.
- Art source: original `src/deformation.ts` ring profiles, limb geometry, rig landmarks, groom curves. Generated diagnostic assets carry CC0-1.0 in the manifest; application source is not assigned an open-source license.
- Headless Chrome WebGPU adapter probe detected NVIDIA / Pascal. Chrome software adapter can be explicitly selected with `--use-webgpu-adapter=swiftshader`; ordinary `--use-angle=swiftshader` returned no adapter. A production target device/model and calibrated quality preset are still unspecified. No general GPU support or speed claim is made.

## Requirement coverage

| Requirement | Delivered / remaining |
|---|---|
| FR-001 | Three shared-model presets, seeded generation, independent shape/style randomizers, canonical CPU identity. |
| FR-002 | Eight body and eight facial parameters with bounds/default reset. Production anatomy, meaningful paired-extreme visual validation, authored blend targets and correctives remain open. |
| FR-003 | Neutral-pose projected rig-region picking, highlights, symmetric directional sculpting, atomic gesture history, Escape cancellation, sliders/numeric fields. Projection is approximate; silhouette triangle picking and human interaction review remain open. |
| FR-004 | Shared skin colors/variation, eye/hair colors, three strand grooms + bald, two lighting modes. Stylized shading only; cross-region surface and lighting review pending. |
| FR-005 | Deterministic mesh triangle/barycentric roots, fixed-step guide solver, followers, bounded head/shoulder approximation, strand ribbons, alpha-to-coverage, rest reset. Followers can intersect the scalp; guide distribution, tip collision, close-up coverage and head-motion human review remain open. |
| FR-006 | Two explicit outfit identities represented by fitted colored covered-body surfaces on the same rig. **Not separate authored garment assets.** Layered garment fit targets, hidden-body masks and penetration-free pose suite are not delivered. |
| FR-007 | Neutral/idle/walk/turn/crouch transforms, six expression controls, pause/scrub. Animation is procedural rigid skinning with approximate shader face displacements. Authored clips, smooth weights, teeth, robust facial morphs and pose correctives remain open. |
| FR-008 | Bounded undo/redo, named IndexedDB snapshots, committed autosave, duplicate, atomic validated import/export, storage failure reporting. |
| FR-009 | DOM-free public runtime and separate viewer; identical build path and geometry hash. Runtime package source is local; standalone library distribution is not published. |
| FR-010 | Wireframe, region/rigid-weight color, joints/attachments, analytic proxies, buffer/FPS display, GPU errors and recovery button. Actual device-loss injection remains unverified. |
| NFR-001 | Exact schema/generator/manifest checks, default expansion, strict fields, seeded PRNG, retained version-1 fixtures. No legacy migrations or cross-device dynamic hair identity claims. |
| NFR-002 | Browser diagnostics implement 60s orbit + walk capture. Binding calibration and prescribed 1080p target-device run remain open. |
| NFR-003 | Fixed hair buffer ceiling; explicit buffer/texture destruction; 20-cycle report. No per-frame neutral mesh rebuild/readback. Application buffer accounting excludes texture/driver residency. Full resource validation pending. |
| NFR-004 | Local IndexedDB/files, no accounts, no runtime network, visible keyboard focus, native labeled sliders/numeric fields, viewport keyboard camera. Full accessibility audit pending. |

## M0 findings and remaining gates

The primitive topology is useful for mechanics, but is not a deformation-ready production adult. Shoulder/hip junctions and crouch can expose gaps, faces have simplified protruding eyes and nose, hands have no fingers, and garment representation is diagnostic. R-001 remains open. Minimum source asset inventory (proper continuous topology, authored morphs, eyes/teeth, smooth shared skinning, clips, garments) is not satisfied by the diagnostic GLB.

R-002's feasibility implementation has a 9,600-strand capacity (7,200 at default density), 960 fixed-step guides, independently sampled scalp roots, tapered ribbons, deterministic strand shade variation, and hair-specific highlights. This is not AAA quality: the user-provided close-up shows exposed scalp and noisy isolated ribbons. Milestone 02 replaces that appearance path with an authored clump/fine-strand hero groom. Collision behavior, target-hardware performance, artist approval, and human R-002 acceptance remain open.

Production M2–M4 and release M6 cannot be certified while these gates remain open. M1 runtime foundations and substantial M3/M5 editor/persistence mechanisms are implemented independently, as permitted by the contract. This is not a revision waiving the production requirements.

## Resource contract

Current quality uses ≤9,600 strands × 9 points and a 1,036,800-byte fixed hair-position buffer, plus a 768-byte bone buffer and 256-byte scene uniform. Body meshes have a fixed topology, generated only on edits. Replaced vertex/index/wireframe buffers are destroyed and removed from the tracking registry. Canvas resolution is capped at 1.5 device pixel ratio. The renderer allocates one 4× MSAA color and depth target and resolves to the presentation texture. At 1920×1080 those two targets are approximately 64 MiB combined, plus presentation/driver resources; the 256 MiB ceiling must be verified on a calibrated target. No texture assets are resident.

## Required next production work

1. Resolve M0 art direction and topology acceptance, create licensed editable continuous human mesh, skin weights, authored body/face targets, eyes/teeth and pose correctives, then export versioned production GLBs.
2. Implement shared morph deformation and real separate garments with exposed-skin masks. Validate parameter extremes across every pose and narrow ranges where needed.
3. Complete Milestone 02's authored hero bob groom, then extend accepted authoring and simulation to crop/curls. Refine scalp/follower collision, groom silhouettes and alpha coverage with front/side/back close-ups and head motion. Record the R-002 decision.
4. Complete human AS-001 with three edited characters, screenshots, exported recipes, exact reload hashes, observed defects and explicit acceptance. Run calibrated performance and residency capture and real device-loss recovery.

See README for exact commands. Automated verification results are recorded separately in `docs/VERIFICATION.md`; no human pass is inferred from them.

