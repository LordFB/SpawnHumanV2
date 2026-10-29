# Verification record — 2026-10-20

This record verifies a feasibility build, not M6/human acceptance. Commands ran in `E:\SpawnHumanV2` on Windows with Node 22.14.0.

| Command/check | Actual result |
|---|---|
| `npm.cmd run assets` | Passed. Original diagnostic GLB, manifest, groom description and three recipe fixtures exported. 7,872 vertices, 14,400 triangles, default neutral geometry hash `97631e47`. |
| `npm.cmd test` | Passed: 5 tests, 0 failures. Deterministic canonical/geometry output, rejected imports preserve state, defaults and independent seeded randomizers, atomic history/restoration, stale async build protection. |
| `npm.cmd run build` | Passed: TypeScript check and both Vite production entrypoints. Initial production build exposed an unsupported default JS target for top-level await; target was explicitly set to ES2022 and the affected check rerun successfully. |
| `node scripts/browser-check.mjs` | Passed in headless Chrome: edit → undo → redo → named IndexedDB save → export → autosave reload; invalid import leaves controls intact; independent viewer has identical canonical recipe and geometry hashes. No page/console errors. Screenshots retained in `artifacts/`. |
| 20 load/reset cycles | Passed for tracked application buffers: exactly 1,124,864 bytes in every cycle. No increasing buffer registry. This does not measure driver memory retention or all resident GPU resources. |
| 60s orbit + walk at 1920×1080 | Captured; see hardware/performance notes below. Not a binding calibrated target or support claim. |

## Hardware/performance notes

Headless Chrome 155 on Windows exposes a WebGPU NVIDIA / Pascal adapter; privacy limits do not provide a specific model. A Windows CIM device-model query was denied, so model/driver are not inferred. Browser API limits reported 268,435,456-byte maxBufferSize and 134,217,728-byte maxStorageBufferBindingSize. The capture below is a historical pre-hair-quality baseline: one default character, 1,560 rendered strands, 240 guides, eight segments, 4× MSAA alpha-to-coverage, and no production textures. It does not verify the later 9,600-strand quality configuration.

The first 60.005-second capture recorded 3,590 frames: median 59.88 FPS and p95 16.8 ms at an actual 1920×1080 canvas. Tracked buffers: 1,124,864 bytes. Full MSAA/depth/presentation and driver residency are excluded from that buffer number. Frame timing is requestAnimationFrame timing and includes CPU/browser scheduling; it is not GPU timestamp instrumentation. See `artifacts/benchmark.json` for the retained final capture. Target hardware, edit-latency p95 and quality acceptance remain uncalibrated.

## Visual inspection and pending acceptance

Screenshots inspected during implementation showed face-covering long strands, missing mouth visibility, open shoulder ends and expensive per-strand CPU simulation. The implementation moved front scalp roots upward, swept front strands aside, attached roots through actual mesh triangles/barycentrics, moved lips outside the face surface, capped shoulders, and switched to guides/followers. These are engineering observations, not a human acceptance pass.

Current visible limitations include simplified anatomy and hands, rigid limb junctions, approximate facial displacements, non-production garments and groom intersections. Three distinct presets and motion screenshots exist in `artifacts/`; they do not establish the mandatory human AS-001. See STATUS.md for the remaining production requirements.

Real device-loss injection/recovery, calibrated memory residency, full paired-extreme motion review, production garment penetration review, and human direct-manipulation review remain unverified. There is no claim of M4/M6 completion.

## Hair quality implementation — 2026-10-20

| Command/check | Actual result |
|---|---|
| `npm.cmd run assets` | Passed. Refreshed the manifest, groom metadata, GLBs, and recipe fixtures using the currently approved body sources: diagnostic 7,872 vertices / 14,400 triangles; male 50,621 / 100,224; female 50,635 / 100,666. |
| `npm.cmd test` | Passed: 22 tests, 0 failures, including 9,600-strand/960-guide density, root coverage and determinism, and stable/resettable fixed-step simulation. |
| `npm.cmd run build` | Passed TypeScript and Vite production build. Vite reports the existing large renderer bundle warning (>500 kB). |
| Browser preview | Front, side, and rear head close-ups inspected while walking at full density. No console or page errors; the local preview reported 60 FPS at 7,200 default-density strands. This is an uncalibrated browser observation, not a target-device performance claim. |

The close-up still shows visible frontal scalp, and shoulder/head intersections and human appearance acceptance remain open. Target-hardware performance and memory residency are uncalibrated; see the milestone acceptance criteria.

## Facial repair � 2026-10-21

- Focused facial, lip-sync and skinning suite: 15 passed, 0 failed.
- Facial browser check: both bodies, blink/jaw-open, front/side/back, turn pose, phonetic controls, cue import and audio clock passed without page/console errors. Screenshots: artifacts/facial/.
- Full suite: 25/26 passed; bob detailed head collision assertion failed in separate hair work.
- General browser check: timed out at resource-cycle download. Do not report full acceptance.
- Visible limitation: mouth corners and upper lip contact still require topology/art cleanup. Hollow mouth and teeth are implemented; realistic facial quality is not accepted.

