# AGENTS.md

> Read this file first in every session. This project follows the `make-game` workflow; run its session-start pipeline before other work.

## Project overview

- **Title:** Private Procedural Human System
- **Pitch:** A local browser character lab and reusable runtime for creating, editing, animating, and saving reproducible human characters, including strand hair.
- **Type:** Browser-based 3D character creator/runtime (not a conventional game).
- **Engine:** Custom WebGPU runtime; no game engine.
- **Language:** TypeScript and WGSL.
- **Target:** Desktop browsers with WebGPU; hardware target uncalibrated.

## Source of truth

Read `docs/STATE.md`, `docs/gameplan.md`, `docs/tech.md`, `docs/milestones/`, `docs/architectural-decisions/`, and `docs/backlog.md` when present. `SPEC.md` defines product requirements. Keep `docs/STATUS.md` and `docs/VERIFICATION.md` honest about feasibility versus production acceptance.

## Architecture rules

- `src/character-core.ts` owns versioned recipe validation, canonicalization, and deterministic randomization.
- `src/deformation.ts` owns character geometry, rig construction, attachments, and build lifecycle; `src/runtime.ts` is the DOM-free public API.
- `src/webgpu-renderer.ts` owns WebGPU shader, pipeline, buffer, and device lifecycle; release replaced GPU buffers explicitly.
- Hair stays strand-based. `src/hair.ts` simulates a bounded set of guides at fixed steps; render strands follow guide motion. Do not read positions back from the GPU or rebuild hair geometry in the animation loop.
- Keep recipe/schema/generator/asset versions explicit and preserve deterministic CPU geometry behavior.
- Use meters, Y-up, +Z forward. Do not claim production asset, visual, performance, or memory acceptance from feasibility checks alone.

## Commands

- **Dev server:** `npm.cmd run dev`
- **Tests:** `npm.cmd test`
- **Build:** `npm.cmd run build`
- **Asset export:** `npm.cmd run assets`
- **Browser verification:** `node scripts/browser-check.mjs` (dev server should be running on port 5173)
- **Lint/format:** n/a (not configured)

## Verification after code changes

Run focused tests and `npm.cmd run build`. For renderer/visual changes, also launch the local app, check browser console/errors, inspect screenshots from front/side/back and motion, and run the browser check when applicable. Confirm the dev server is responsive; do not assume game-specific `render_game_to_text()` or `advanceTime()` hooks exist. Report any unverified human visual or target-hardware acceptance explicitly.

## Workflow

- Follow the `make-game` session-start and development pipelines. Add a focused milestone before new feature work, document checkable acceptance criteria, and write tests before implementation when applicable. Visual-feel criteria must be marked for user playtest.
- Preserve unrelated work and existing behavior. Avoid unrequested asset/dependency/tooling changes.
- Update `docs/STATE.md` after work that changes code or project docs.

## Last regenerated

2026-10-20 by Copilot SDK in VS Code (documentation backfill)
