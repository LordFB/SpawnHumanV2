# Milestone 01: Hair render quality

## Status

superseded for visual acceptance by [Milestone 02](./02-authored-hero-hair.md); technical tests remain delivered

## Objective

Make the existing strand-based groom substantially denser and more lifelike in motion and lighting, while preserving deterministic recipes, bounded CPU/GPU resources, and the current WebGPU ribbon architecture.

## Scope

- Raise the maximum groom size from 2,400 to 9,600 strands and simulate 960 guides.
- Distribute every render root over the scalp independently of its motion guide; update only the visible strand prefix.
- Improve ribbon taper, strand-to-strand color variation, and anisotropic hair highlights.
- Improve fixed-step guide dynamics with head-motion inertia, gravity/wind response, length constraints, and head/shoulder collision.
- Update all groom generators, renderer resource sizing, benchmark reporting, and quality documentation.

## Out of scope

- Replacing diagnostic procedural characters with production hair assets.
- GPU compute simulation, external hair/rendering dependencies, or GPU readback.
- Re-authoring scalp topology, groom styles, or recipe controls.

## Dependencies

- **Depends on:** ADR 0001
- **Blocks:** none

## Acceptance criteria

- [x] Character generation produces 9,600 strands and 960 simulation guides for non-bald grooms; max hair position buffer is 1,036,800 bytes — test: `tests/runtime.test.ts::hair groom density and guide count meet the quality target`
- [x] Fixed-step motion stays finite and bounded, preserves guide segment lengths within tolerance, responds to head motion, and reset restores the exact rest groom — test: `tests/runtime.test.ts::hair simulation remains stable, responsive, deterministic, and resettable`
- [ ] Hair-specific luster, finer tapered ribbons, and dense coverage render without WebGPU validation or console errors — verified by user playtest
- [ ] Browser close-up and walk screenshots show the denser groom from front, side, and back without unacceptable scalp/shoulder intersections — verified by user playtest

## Exit condition

User selects a non-bald groom and previews the character from front, side, and back while walking → observes fuller coverage and visible secondary strand motion without hair instability or GPU errors.

## Test plan

- Add the density/guide-count and simulation stability tests before implementation; verify the density test fails because the existing groom is limited to 2,400 strands.
- Run `npm.cmd test` and `npm.cmd run build`.
- Run `node scripts/browser-check.mjs` with the Vite server active and inspect its hair and walk screenshots, browser console, and resource report.
- User playtest: inspect front/side/back close-ups, all groom styles, idle/walk/turn/crouch, and Reset hair; note visible intersections and perceived motion.
- Target hardware remains uncalibrated; do not infer production performance acceptance from the existing feasibility capture.

## Notes

- Preserve strand-based rendering and the fixed CPU guide solver; no renderer architecture change is planned.
- Render six ribbon segments from the eight-point simulated curves to reduce vertex work; guides retain all eight segments.
- Record actual generated strand count and allocated hair buffer size in verification notes after implementation.
- Implementation tests, production build, asset export, and browser rendering passed for this feasibility pass. The attached user reference demonstrates that visual acceptance was not achieved: scalp is exposed and the silhouette reads as noisy thin ribbons. The prior local FPS observation is not target-hardware calibration. Continue visual work under Milestone 02 rather than treating the earlier pass as AAA quality.
