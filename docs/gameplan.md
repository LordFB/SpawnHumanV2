# Private Procedural Human System

## Pitch

A local browser-based character lab for creating, editing, animating, and saving reproducible human characters. A hybrid authored-and-procedural pipeline provides body and face variation, appearance controls, and scalp-anchored strand hair.

## Core user flow

Choose a curated preset or seed, edit body and face proportions, change skin, eyes, hair, and clothing, inspect the character from all angles and in motion, then undo, save, export, and restore the exact recipe.

## Product rules

- Recipes use versioned schemas and stable asset IDs; identical versions produce identical canonical parameters and CPU geometry.
- Edits are bounded and resettable. Invalid imports must not partially change the active character.
- Hair remains strand-based, scalp-anchored, adjustable, and responsive to head motion; opaque hair masses are not a substitute.
- Hair quality is judged by authored silhouette, coverage, strand breakup, shading, and secondary motion in close-up; raw strand count is not an acceptance proxy.
- The creator and public runtime share the same character-generation path.
- The system works locally without accounts or runtime network requests after setup.

## Success condition

A person can create three visibly distinct adult characters, inspect them from all angles and in motion, undo edits, and restore their exact recipe state without broken anatomy, attachments, or lost edits. Human visual review is required; automated hashes alone do not establish visual acceptance.

## Art direction

Three-dimensional human characters rendered in a local WebGPU character editor. The creator interaction is informed by The Sims 4, without copying its assets or requiring feature parity. The current procedural meshes and grooms are diagnostic feasibility assets, not accepted production art. Hair has a distinct AAA-quality ambition for close-up silhouette, scalp coverage, strand shading, and secondary motion; this is a quality target, not a claim of photorealism for the full character. The first locally authored bob groom is only a vertical slice pending artist review.

## Audio direction

Not specified; audio is outside the current product scope.

## Goals

- Create distinct characters from presets or deterministic seeds.
- Edit bounded body and face parameters and appearance.
- Preview poses and facial states without changing the recipe.
- Save, export, reload, and compare reproducible character state.
- Keep strand hair, local authoring, a DOM-free runtime API, and a high-quality close-up hero groom.

## Anti-goals

Spawn.co integration, multiplayer, photo reconstruction, automatic animation-ready retopology, children, arbitrary garment generation, full cloth simulation, and guaranteed photorealism are outside the current scope.

## References

- SPEC.md is the authoritative requirements and architecture contract.
- The Sims 4 is an interaction reference only.

## Open questions

- Production topology, authored morph targets, rigging, garments, and hair authoring remain unaccepted. The hero bob groom is an unapproved vertical slice only.
- Target hardware and calibrated visual/performance quality presets remain unspecified.
- Scalp/follower collision, close-up strand coverage, and human visual acceptance remain open.
