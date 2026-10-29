# Current project state

Updated 2026-10-20 after user rejected the hair visual pass.

## Active milestone

[Authored hero hair](./milestones/02-authored-hero-hair.md) is active. The user rejected the previous visual result and approved a locally authored hybrid groom, browser/WebGPU motion, and desktop-fidelity priority. The first hero groom is a bob; it is a vertical slice pending artist review, not an AAA acceptance claim.

## Delivered and known limits

- Existing feasibility grooms generate up to 9,600 strands and 960 guides but visibly expose scalp and look noisy in close-up. Their visual acceptance is superseded by milestone 02.
- User approved an authored hybrid groom plus WebGPU motion, desktop fidelity first, and a locally authored first hero groom without an external asset dependency.
- Blender is unavailable and no hair source assets were inventoried. No external hair asset has been selected or licensed.
- Previous public asset export used current body sources: male/female meshes have 50,621 / 50,635 vertices and 100,224 / 100,666 triangles.

## Verification baseline

- Previous feasibility baseline: `npm.cmd test` passed 22; build and asset export passed.
- The user-provided close-up is the visual failure reference: exposed scalp and noisy thin ribbons. Do not cite previous local FPS or visual checks as AAA evidence.

## Next work

- Write milestone 02 tests first, then implement the bob clump/fine-strand representation and motion.
- Run browser checks front/side/back in idle/walk/turn; then ask the user to judge the hero-groom vertical slice.
- Calibrate performance and memory on an agreed target device before claiming R-002 acceptance; extend styles only after visual direction is approved.
- Keep production anatomy/groom assets and remaining M0/M6 requirements open as documented in [STATUS](./STATUS.md) and [VERIFICATION](./VERIFICATION.md).

## Facial repair update — 2026-10-21

Blink uses fitted curved eyelids; mouth has recessed walls and CC0 upper/lower teeth. Removed gum bridges, separated inner-mouth material from skin, and smoothed lip boundaries. Both meshes pass 15 focused facial/lipsync/skinning tests and the browser facial check (front/side/back, posed turn, audio/cues). Final mouth corners and lip contact still show visible topology limitations, especially the female upper lip: realistic visual acceptance remains open in milestone 03. Preserve the separate active hair milestone. Full suite: 25/26 passed; bob detailed collision test failed. General browser check timed out waiting for the resource-cycle download.

