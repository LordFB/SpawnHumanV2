# ADR 0002: Authored hybrid hair grooms

## Status

Accepted for the first hero-groom vertical slice; production approval remains open.

## Date

2026-10-20

## Context

The 9,600 independent thin-ribbon feasibility groom exposes the scalp and reads as noisy fibers in close-up. Increasing its strand count or applying cosmetic shader changes does not address the missing hairstyle silhouette or coherent lock structure. The user set a high-end close-up hair and dynamics ambition, selected an authored hybrid groom, desktop fidelity first, and chose a locally authored bob as the first vertical slice. No hair assets or Blender installation are available in the workspace.

## Decision

- Define versioned, locally authored clump-flow guides as the source of hairstyle silhouette, parting, lock direction, and width.
- Distribute deterministic scalp-anchored fine strands into those clumps; retain individual strand rendering and do not replace the groom with an opaque hair cap.
- Simulate coherent clump guides with the existing bounded fixed-step solver; derive fine-strand follower motion from the clumps.
- Render clump structure and fine strand detail through the project's raw WebGPU/WGSL renderer. Keep CPU asset generation deterministic and offline; add no external runtime dependency.
- Build the bob as a vertical slice. Do not claim AAA acceptance until the user/artist approves its close-up appearance and motion on an agreed desktop target.

## Consequences

### Positive

- Explicit style authoring can control silhouette and coverage instead of relying on random scalp samples.
- Fine fibers preserve the strand-based requirement while clump motion supplies secondary dynamics at a manageable guide count.
- The asset representation remains local, versionable, deterministic, and independent of a runtime library.

### Negative

- Hand-authored groom descriptions require per-style content and art iteration.
- CPU guide simulation may not meet the chosen desktop-fidelity profile at higher authored guide counts; profiling may require a later GPU-compute decision.
- The first project-authored groom is not a substitute for artist-authored production assets or approval.

## Alternatives considered

- **Increase independent procedural strands:** rejected; the user reference shows scalp exposure and noisy appearance despite increased density.
- **Opaque scalp/hair cap:** rejected; strand hair remains a product constraint and cap-only rendering would hide the failure rather than solve it.
- **External runtime hair dependency:** rejected for this slice; raw WebGPU and local operation remain the project's architecture.
- **Download a third-party groom:** not selected; no compatible source/license was identified and the user chose a local first groom.

## Related

- [Milestone 02: Authored hero hair](../milestones/02-authored-hero-hair.md)
- [ADR 0001](./0001-engine-and-stack.md)
- [SPEC.md](../../SPEC.md)
