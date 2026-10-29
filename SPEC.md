# Private Procedural Human System

## 1. Contract

Build a private, browser-based WebGPU character lab and reusable character runtime. A developer selects a preset or seed, shapes a human through a Sims 4–style creator, changes appearance, previews animation, and saves/reloads a reproducible recipe. Hybrid generation combines authored deformation-ready topology and rigging with procedural shape variation, surface variation, and strand hair.

User constraints: private system first; possible Spawn.co port later; hybrid generation; creator-based visual validation. Sims 4 is an interaction reference, not a requirement to reproduce its assets or every feature. The confirmed scope includes body/face variation, skin, hair, clothing, shared rig, animation, and recipes.

MVP success: a person can create three visibly distinct adult characters, inspect them from all angles and in motion, undo edits, and restore their exact recipe state without broken anatomy, attachments, or lost edits. Strand hair must be demonstrated; silently replacing it with opaque hair masses does not satisfy scope.

Non-goals: implementing the private development harness, Spawn integration, multiplayer transport, photo reconstruction, automatic animation-ready retopology, children, arbitrary garment generation, full cloth simulation, crowds, or guaranteed photorealism for the full character. Hair has a separate high-end close-up quality target: a coherent authored groom silhouette, dense strand detail, and visible secondary motion are required before hair quality can be accepted. Implement through M6 only. Future adapters must not dictate today's editor.

## 2. Requirements

| ID | Required behavior and acceptance |
| --- | --- |
| FR-001 | Create from curated presets or seed; separate randomize-shape and randomize-style actions. Identical recipe and asset versions produce identical canonical parameters and CPU geometry. |
| FR-002 | Edit stature, build, torso/limb proportions and head shape; edit jaw, chin, cheeks, nose, eyes, brows and mouth through bounded parameters. Each exposed control visibly affects its named region; reset restores its default. |
| FR-003 | Offer selectable body/face regions with hover highlight and directional drag editing, plus equivalent labeled sliders. Camera orbit never edits anatomy; one drag produces one undo entry. |
| FR-004 | Edit skin tone and surface variation, eye color, hairstyle, hair color and groom parameters. Appearance remains coherent across face, neck and hands under neutral and directional lights. |
| FR-005 | Generate scalp-anchored strand hair with adjustable density, length, curl and clumping within groom-specific limits; authored clump guides shape the close-up silhouette and bind fine render strands into coherent locks. Demonstrate head-motion response, bounded secondary motion, and scalp/body collision approximations. Reset simulation reproduces the rest groom. Hair-specific close-up quality requires human visual acceptance; density alone is insufficient. |
| FR-006 | Fit curated clothing to the edited body using the same deformation model and rig. Supported combinations pass the pose suite without visible exposed-body penetration; reject unsupported combinations explicitly. |
| FR-007 | Preview idle, walk, turn and crouch in place, plus neutral, smile, frown, surprise, blink and jaw-open facial states. Pause, scrub and return to neutral without changing the recipe. |
| FR-008 | Undo/redo shape and style changes; save named recipes, autosave committed edits, export/import JSON, and duplicate characters. Reload restores controls and asset identities; invalid imports leave the current character intact. |
| FR-009 | Package runtime independently of editor state and DOM. A minimal second viewer loads an exported recipe through the public API and produces the same character parameters and neutral geometry. |
| FR-010 | Expose wireframe, joints, weights, attachment points, collision proxies and performance diagnostics. Unsupported WebGPU or missing assets produce actionable errors rather than blank output. |
| NFR-001 | Version schemas, generator, rig and asset manifest; unknown versions fail explicitly. A seeded PRNG must replace ambient randomness during generation. Cross-device pixel identity and dynamic hair bit-identity are not required. |
| NFR-002 | Proposed M0 targets: one character at 1080p, median ≥30 FPS, p95 frame time ≤50 ms; edit-to-preview p95 ≤100 ms after loading. Measure over 60 seconds of orbit plus animation on the recorded target device and quality preset. Targets become binding only after M0 calibration. |
| NFR-003 | No unbounded buffer allocation or per-frame mesh rebuilding. Repeated edits, hairstyle changes and 20 load/reset cycles stay within the documented resource budget without monotonically retained GPU resources. |
| NFR-004 | Work locally without accounts; after dependencies/assets are installed, authoring and save/load need no network. Provide keyboard-accessible controls, visible focus and numeric alternatives to dragging. |

AS-001: create three characters using direct edits and style changes; animate each, undo/redo a feature change, export, reload, and compare canonical recipe plus neutral geometry hashes. Human appearance review is mandatory.

## 3. Architecture and contracts

Engineering choice: TypeScript ES modules, Vite, vanilla DOM/CSS, raw WebGPU/WGSL, IndexedDB for local drafts and named recipes, JSON for portable recipes. No backend required. Pin dependencies during implementation. Existing experiments are unverified inputs until inspected and executed.

Modules: `character-core` owns schema, constraints, deterministic generation and immutable committed recipes; `assets` owns versioned manifests and loading; `deformation` owns morphs, corrective shapes and rig fitting; `appearance` owns material parameters; `hair` owns grooming and simulation; `webgpu-renderer` owns device/resources; `creator` owns selections, gestures and history. Only the renderer and GPU hair backend depend on WebGPU. Asset generation scripts remain separate from runtime.

Recipe contract: `{schemaVersion, generatorVersion, assetManifestVersion, seed, bodyBaseId, shape, face, skin, eyes, hair:{groomId, parameters, color}, clothing:[{slot, assetId, parameters}]}`. Values use named keys, finite numbers and documented units/ranges. Resolve omitted defaults before canonical serialization; sort keys for hashing. Asset IDs are stable, never array indices. Save migrations are explicit and tested against retained fixtures; unsupported imports never partially apply.

Public boundary: `validateRecipe`, `resolveRecipe`, `buildCharacter(recipe, manifest)`, `setPose`, and `dispose`. Build returns geometry/material descriptors, rig, attachments and hair description; editor APIs are excluded. Async builds carry a generation token so stale results cannot replace newer edits. On failure retain the last valid preview and report the rejected operation.

Hybrid deformation order: base mesh → bounded body/head morphs → joint placement and bind-pose recomputation → garment fitting → animation skinning → pose correctives → hair root transforms and dynamics. Body and face use a continuous surface where possible; modular boundaries must share positional and normal deformation. Define meters, Y-up, character-forward convention and bone names once in the asset contract. Teeth, eyes and scalp anchors follow designated landmarks. Joint fitting must update inverse bind matrices; do not scale limbs independently of their rig.

Use authored blend targets and landmark constraints for shape; sculpting arbitrary vertex neighborhoods is outside MVP. Direct manipulation maps region, view and drag axis to a small documented parameter set, with symmetry enabled by default. During drag preview transient values; commit atomically on release and cancel on Escape. Restrict invalid combinations before deformation; never silently corrupt saved values.

Garments share shape parameters and authored fit targets; use limited normal offsets and hidden-body masks for covered regions. Masks must preserve exposed skin. Head and body extremes require authored correctives where deformation alone fails.

Hair: authored clump-flow guides define style, silhouette, parting and lock widths; deterministic fine render strands are distributed around those guides and anchored by scalp triangle IDs and barycentric coordinates. Evaluate roots on the deformed/skinned scalp. Simulate clump guides with fixed substeps, length constraints, damping, bounded catch-up and scalp/body collision; interpolate fine-strand followers afterward. Use layered camera-facing clump and strand ribbons with tangent shading, alpha coverage and an explicit transparency strategy validated in M0. Stable strand IDs and density subsets prevent random popping. Rendering may simplify at distance; the close-up groom remains visibly strand-based. Never read back all strands each frame.

Device loss pauses preview, retains the CPU recipe and rebuilds GPU resources through one recovery path. Dispose replaced assets explicitly; publish readiness only after all required resources exist.

## 4. Design and assets

Studio composition: large central character viewport, narrow region toolbar, contextual property panel, bottom preset/animation strip. Neutral charcoal UI, restrained cyan selection, consistent spacing and labeled controls; no decorative dashboard. Provide full-body, head and selected-region framing, front/side/back views, zoom, neutral lighting and a second directional lighting preset.

Flow: preset/seed → body → face → skin/eyes → hair → clothing → motion review → save/export. Selecting a region frames it without losing camera history. Keep dirty, saving, saved, loading, invalid-edit and asset-error states distinct. Turn off autonomous idle head movement during precise face editing. Show min/default/max and reset for each parameter; coarse and fine editing share values.

Minimum asset inventory, an engineering scope assumption: one continuous adult body/head topology with two body presets, four face presets, bald plus three strand grooms, two fitted clothing sets, eyes/teeth, one shared rig, four animation clips and six facial targets. Presets must be starting points on a shared parameter model, not disconnected character swaps.

Implementing developer supplies or creates licensed source assets and generation scripts; availability is unknown. Retain editable source and versioned runtime assets. Use GLB for skinned meshes/morphs/animations, textures with declared color spaces, and versioned groom data. No paid assets or network-fetched assets assumed. Diagnostic placeholders are allowed in M0–M1, not at visual acceptance.

Provisional high-quality ceilings: 100k body/head triangles, 60k garment triangles, 64 MB resident character textures, 50k render strands with ≤12 segments each, 256 MB total character GPU allocation. These are ceilings for calibration, not fidelity promises; M0 records actual counts and lower presets before assets are finalized.

## 5. Milestones and verification

First action: inspect available repository instructions, sources and assets; record provenance, usable licenses, browser/GPU and limits. Do not claim reuse or performance from historical descriptions.

| Gate | Capability, dependencies and observable exit |
| --- | --- |
| M0 | Feasibility and budgets: probe morph/skinning order, rig refit, scalp anchors and strand transparency with a moving head. Record device, counts, timings and asset gaps. Resolve R-001/R-002 before dependent production. Covers NFR-002/003, FR-005/010. |
| M1 | Recipe/runtime skeleton after M0: versioned schema, manifest, deterministic parameter resolution and neutral viewer. Same fixture yields identical canonical recipe and CPU geometry hashes; malformed input preserves current state. FR-001/009, NFR-001. |
| M2 | Hybrid anatomy after M1: body/head controls, joint refitting and pose correctives. Min/default/max and selected paired extremes survive the motion suite without detached parts or inverted geometry. FR-002/007. |
| M3 | Creator after M2: region picking, drag mapping, slider equivalents, camera rules, undo/redo and framing. Human completes shape editing without accidental camera/edit conflicts. FR-003, NFR-004. |
| M4 | Appearance after M2/M3: coherent skin/eyes, production strand grooms, clothing fitting and animation/facial controls. Front/side/back close-ups and motion pass human inspection. FR-004–007. |
| M5 | Persistence/integration after M4: named saves, autosave, import/export, failure recovery, diagnostic views and independent viewer. Reload and adapter parity checks pass; device-resource rebuilding is demonstrated or pending hardware validation is stated. FR-008–010, NFR-001/003/004. |
| M6 | MVP release after M5: run AS-001, calibrated performance capture and resource-cycle check; resolve defects and deliver sources, assets, runtime, creator and installation/use instructions. All requirements covered; human acceptance remains pending until reported. |

Validation split: automated checks only for determinism/schema rejection, stale-build protection, save/import restoration and runtime/editor parity; one targeted browser E2E covers edit → undo → save → reload. Human validation uses the creator to make a lean angular character, a broad rounded character and a third distinct face/body combination; inspect neutral and animated views, hair silhouettes and exposed garment edges. Pass requires predictable local edits, distinct results, coherent anatomy, no visible seams/penetration in supported poses, and exact restoration of edited controls. Record screenshots, recipes and observed defects; no human pass may be inferred from test success. Commands are established from the actual repository, not invented here.

## 6. Risks and decision gates

| ID | Impact / likelihood; early signal | Mitigation and gate |
| --- | --- | --- |
| R-001 | High / unknown: suitable licensed topology, morphs or animation assets absent. | Inventory in M0. Create/obtain assets before M2; source procurement blocks production visuals, not schema/editor work. |
| R-002 | High / unknown: strand overlap, scalp visibility or GPU cost defeats close-up review. | M0 moving-head groom test; tune coverage, strand counts and transparency. Revisit rendering architecture if it cannot pass the recorded budget; do not substitute solid hair silently. |
| R-003 | High / plausible: combined proportion edits break joints and garment fits. | M2 paired-extreme pose checks; constrain ranges and author correctives. Narrow supported ranges explicitly before expanding asset inventory. |
| R-004 | Medium / plausible: direct dragging feels unpredictable. | M3 human editing task; reduce parameter coupling and improve axis cues. Keep sliders available; direct manipulation must still pass before M6. |
| R-005 | Medium / plausible: version changes alter saved identities. | M1 canonical fixtures and immutable manifests; explicit migration or clear unsupported-version error, never silent substitution. |

## 7. Assumptions and open decisions

- Character visual target remains coherent stylized/semi-realistic adults; Sims 4 defines creator interaction. Hair has a separate AAA-quality ambition for close-up groom shape, coverage, shading and secondary motion. The first local-authored bob is a vertical slice, not an accepted production asset; artist review and a target device are still required.
- Target benchmark hardware and browser are unspecified. Blocking for binding performance claims, resolved in M0; no GTX/iGPU support claim is implied.
- Existing source and asset locations are unspecified. Inventory is the first implementation action; asset availability blocks M2 production only.
- Exact parameter ranges and calibrated quality presets are engineering decisions fixed by M0/M2 evidence and recorded in the manifest. UI must expose only validated ranges.
- Mesh/animation GLB export from the creator is deferred; source/runtime asset GLBs and JSON character recipes are required. Spawn adapter, SDK support and feature parity are future decisions.
- No other scope blockers. Local reversible implementation choices may proceed within these contracts; failed feasibility gates require an explicit contract revision.
