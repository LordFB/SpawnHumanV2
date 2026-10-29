# ADR 0001: Private browser runtime and hybrid character pipeline

## Status

Accepted — records the implemented feasibility stack; production asset acceptance remains open.

## Date

2026-10-20

## Context

The project requires a private, local-first character creator and a reusable runtime, with deterministic recipes, interactive editing, animation preview, and strand hair. The source specification selects a hybrid pipeline: authored deformation-ready topology and rigging combined with procedural shape, surface variation, and hair. Existing code is a feasibility implementation and does not satisfy production asset or visual acceptance gates.

## Decision

Use TypeScript ES modules, Vite, vanilla browser UI, raw WebGPU/WGSL, IndexedDB for local saves, and JSON for portable recipes. Keep the public character runtime independent of DOM/editor state. Use a hybrid authored-and-procedural character pipeline, preserving strand-based hair rather than substituting opaque hair masses.

## Consequences

### Positive

- Local authoring and a second viewer can share the same versioned runtime and recipe contract.
- Raw WebGPU keeps rendering and GPU resource ownership explicit.
- Deterministic versioned recipes support reproducibility and regression tests.

### Negative

- WebGPU limits browser and hardware support to compatible devices.
- The team owns rendering, simulation, and resource management.
- Diagnostic procedural assets are not a substitute for accepted production topology, rigs, garments, and groom authoring.

## Alternatives considered

- **External game engine:** not selected; the project contract specifies a small browser character tool and reusable runtime.
- **Opaque hair volume instead of strands:** rejected because the specification explicitly requires strand hair.
- **Server-backed authoring:** rejected for the private, local-first MVP.

## Related

- [SPEC.md](../../SPEC.md)
- [docs/gameplan.md](../gameplan.md)
- [docs/tech.md](../tech.md)
