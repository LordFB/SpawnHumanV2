# Tongue target control

- [ ] Smooth tapered tongue with a dorsal groove and closed surface.
- [ ] Three-bone chain follows the jaw; its root stays fixed while the tip follows a bounded 3D target.
- [ ] Face panel offers left/right, up/down and in/out target controls with reset.
- [ ] Runtime target control, GPU skinning and GLB skin share the same chain.
- [ ] Solver, reset and jaw attachment tests; front/side browser inspection.
- [ ] User visual acceptance of tongue shape and motion.

Target coordinates are transient pose offsets in jaw-local meters, not saved identity parameters. Full tongue/teeth collision and speech-specific tongue articulation are outside this first control pass.
