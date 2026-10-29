# Milestone 02: Authored hero hair

## Status

in-progress

## Objective

Replace the visibly inadequate independent-ribbon bob with a locally authored hybrid hero groom. Authored clump-flow shapes establish scalp coverage, hairstyle silhouette and coherent locks; fine strands provide strand breakup and luster; clump guides drive secondary motion. This is a vertical slice toward the user's AAA hair ambition, not a production/AAA acceptance claim.

## Scope

- Define versioned deterministic authored clump guides and width/flow profiles for the bob.
- Anchor guide roots to the scalp and distribute fine render strands coherently within authored clumps.
- Render continuous clump structure plus finer strand detail and anisotropic luster through raw WebGPU.
- Drive clump secondary motion with bounded fixed-step simulation, scalp/head/shoulder collision, and follower strands.
- Preserve recipe identity, local-only operation, current renderer ownership, and existing bald/crop/curls behavior.

## Out of scope

- Artist approval or a claim of production AAA quality before user playtest.
- Re-authoring crop and curls; extend the authoring pipeline to those styles after this hero slice is reviewed.
- A full DCC groom authoring tool, external hair runtime, or GPU compute simulation unless desktop profiling shows the CPU solver cannot meet the chosen target.
- Redesign of body assets, scalp topology, or unrelated appearance systems.

## Dependencies

- **Depends on:** Milestone 01 technical foundation; ADR 0001; ADR 0002
- **Blocks:** production hair acceptance and conversion of remaining non-bald grooms

## Acceptance criteria

- [ ] The bob groom exposes stable authored clump IDs, root anchors, center curves, widths, and flow metadata; repeated builds are bit-deterministic — test: `tests/runtime.test.ts::authored bob groom is structured and deterministic`
- [ ] Fine strands are spatially assigned to authored clumps, cover the authored scalp regions, and retain deterministic root anchors — test: `tests/runtime.test.ts::bob strands form coherent scalp-anchored clumps`
- [ ] Clump motion responds to head movement with bounded, deterministic secondary motion; followers preserve their clump-relative offsets and reset to the exact authored rest groom — test: `tests/runtime.test.ts::bob clump dynamics preserve coherent followers`
- [ ] The WebGPU close-up draws authored clumps and fine strand detail without shader/device errors — verified by browser smoke test and user playtest
- [ ] Front, side, and rear close-ups show an intentional bob silhouette without exposed scalp patches or noisy ribbon artifacts; idle, walk, and turn show visible but stable secondary motion — verified by user playtest

## Exit condition

User previews the bob in front, side, and rear close-up views while walking → observes continuous scalp coverage, deliberate lock/clump shapes, fine strand detail, and stable secondary motion, then decides whether this authored direction is worth extending to the other styles.

## Test plan

- Add the authored-groom data, coherent-strand assignment, and clump simulation tests before implementation; verify they fail on the current independent-ribbon representation.
- Run `npm.cmd test` and `npm.cmd run build`.
- Run the creator in WebGPU Chrome/Edge; inspect console/device errors, then capture front/side/rear close-ups during idle, walk, and turn.
- User playtest the vertical slice; visual quality and motion remain human acceptance criteria. Record device, resolution, frame time, and any scalp/collision artifacts; do not call an uncalibrated result AAA.
- No Git repository is present, so the red-to-green test transition cannot be committed/staged in this workspace.

## Notes

- User approved authored hybrid groom + WebGPU motion, desktop fidelity first, and a local first hero groom without external asset dependency.
- Blender is not installed; the first groom must be described in versioned project-authored data unless the user later provides a DCC asset.
- Hair runtime still uses CPU simulation pending profiling; GPU compute is a future decision, not an assumed requirement.
