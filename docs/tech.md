# Tech stack

## Engine / runtime

- **Engine:** Custom browser character runtime using raw WebGPU and WGSL; no game engine.
- **Language(s):** TypeScript ES modules and WGSL shaders.
- **Target platforms:** Desktop browsers with WebGPU (Chrome/Edge); target hardware is not yet calibrated.

## Libraries / frameworks

| Library | Version | Purpose |
|---------|---------|---------|
| TypeScript | 5.7.2 | Type checking and application/runtime code |
| Vite | 6.4.4 | Local development server and production bundling |
| `@webgpu/types` | 0.1.64 | WebGPU TypeScript definitions |
| `tsx` | 4.19.3 | TypeScript test and asset-script execution |
| `playwright-core` | 1.58.2 | Browser automation for verification |

The runtime has no application dependencies beyond browser APIs.

## Tooling

- **Package manager:** npm; use `npm.cmd` in Windows PowerShell.
- **Build:** `npm.cmd run build` (TypeScript check followed by Vite production build).
- **Testing:** `npm.cmd test` (Node test runner via `tsx`); `node scripts/browser-check.mjs` for browser integration checks.
- **Linting / formatting:** n/a; no lint or format script is configured.
- **Assets:** `npm.cmd run assets` exports the diagnostic GLB, manifest, groom data, and fixtures. Generated diagnostic assets are CC0-1.0; application source is private by default.

## Project layout

- `src/character-core.ts`: recipe schema, validation, deterministic randomization, manifest.
- `src/deformation.ts`: procedural geometry, rig, attachments, and character construction.
- `src/hair.ts`: fixed-step CPU guide simulation and follower interpolation.
- `src/webgpu-renderer.ts`: WebGPU device, shaders, ribbon rendering, and GPU resource lifecycle.
- `src/creator.ts`, `src/state.ts`: editor UI, history, and persistence.
- `src/runtime.ts`: DOM-free public runtime exports.
- `src/viewer.ts`: independent recipe viewer.
- `tests/`: Node test-runner tests.
- `scripts/`: asset export and browser/performance diagnostics.
- `public/assets/`: generated versioned diagnostic runtime assets.
- `fixtures/`: retained recipe fixtures.
- `docs/`: requirements status, verification, and project workflow context.

## Conventions

- **Coordinates:** meters, Y-up, +Z forward.
- **Recipe identity:** resolve defaults and validate exact versions before canonical serialization; asset IDs are stable identifiers.
- **Runtime boundary:** keep `src/runtime.ts` free of DOM/editor dependencies; GPU-facing code stays in the renderer.
- **Hair:** authored per-style clump-flow guides; deterministic scalp-anchored render strands grouped around guides; bounded clump solver with fixed substeps; fine strands follow clump displacement; CPU positions are uploaded to the GPU without readback.
- **Verification:** run targeted tests and build; visual changes also require a browser screenshot/runtime check. A measured feasibility result is not production visual acceptance.

## Hair quality and limits

The existing feasibility grooms use up to 9,600 render strands (7,200 at default density), eight simulated segments per strand, and a fixed 1,036,800-byte position storage buffer. The accepted direction is an authored-clump/fine-strand hybrid: artist-authored flow and width guides define the hairstyle, deterministic strands fill those clumps, and simulation acts on coherent clump guides before followers are evaluated. The first locally authored bob groom is a vertical slice. Keep GPU rendering in WGSL; retain the fixed CPU guide solver until profiling on the selected desktop target justifies GPU compute. Hair asset identity is versioned with the manifest. Close-up visual quality, collisions, and performance on target hardware require human review.

## Out-of-scope dependencies

No backend, account system, CDN assets, analytics, runtime network requests, or external application runtime dependencies.
