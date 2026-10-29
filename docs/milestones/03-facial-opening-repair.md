# Facial opening repair

Fix blink collapse and the sealed mouth on both CC0 body meshes.

- [x] Blink deforms fitted eyelids only; eye globes, brows and mouth stay fixed (facial geometry tests).
- [x] Mouth includes recessed cavity, fixed upper teeth and moving lower teeth.
- [x] Upper/lower gum faces cannot bridge the moving jaw (regression assertion).
- [x] Browser review of final inner-mouth material boundary, both bodies and views (no runtime errors; visual limitations below).
- [ ] Realistic appearance and lip contact accepted by user visual review.

This repair does not claim production facial anatomy or realistic skin shading acceptance.

Remaining visual issue: mouth corners and female upper-lip contact still expose topology limitations at full opening. Hollow mouth, teeth and localized blink are functional, but realistic facial appearance remains unaccepted.
