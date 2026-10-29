# Blender Human Base Meshes v1.4.1

Retrieved 2026-10-20 from Blender's official download server.

- Publisher: Blender Studio and community contributors.
- Official listing and CC0 declaration: https://www.blender.org/download/demo-files/#assets
- Original archive: https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip
- License: CC0-1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
- Archive size: 50,643,039 bytes.
- Archive SHA-256: `811F43ACCBB31A88266D932F8F5563B2D13586FCA0BA2693AAD1F5FE582B3515`

The original ZIP and extracted Blender asset library are retained here. No source assets have been modified. The license declaration is verified against the official bundle listing; it is not inferred from the availability of a free download. This directory's asset license does not change the application code license.

## Selected candidates

The library `human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend` contains the full-body realistic male and female candidates. Included thumbnails `realistic_body_male.png` and `realistic_body_female.png` were visually inspected: both show anatomical full-body quad meshes in relaxed arm poses with separate fingers. These are the realistic body assets, rather than the separate primitive or stylized assets in the same bundle.

The bundle also includes realistic eye, hand, foot, jaw, sculpting-head and animation-head assets. Blender documents quad subdivision topology, UV maps, face sets, and multiresolution details for realistic assets: https://developer.blender.org/docs/release_notes/3.6/asset_bundles/

These are source modeling assets, not validated drop-in runtime characters. Exact vertex/face counts, rigging, morph availability, topology compatibility between bodies, UV/material layout, and full-resolution anatomy have not yet been inspected in Blender. No claim of production deformation readiness or visual acceptance is made. Blender 4.2 LTS or newer is required according to the official listing; Blender was not found on the current PATH or in its standard installation directory.

## Integration work remaining

Inspect both bodies in Blender, choose runtime topology/subdivision levels, prepare smooth skin weights and body/face targets, export versioned runtime geometry, and adapt the raw WebGPU loader and vertex format. The current application still generates its original diagnostic mesh; it does not load this library. Skin textures and shading, garment fit, groom anchoring and pose extremes require their own validation.

## Alternative for parametric generation

MakeHuman / MPFB core meshes, targets and skins are also explicitly CC0. This may be a better source if a compatible body/face target system is the priority:

- https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md
- https://static.makehumancommunity.org/mpfb/faq/can_i_sell_models.html

Third-party community assets must be checked individually; their license need not match the bundled core assets. No MakeHuman assets have been downloaded here.

## Integration update (2026-10-20)

Both realistic bodies and fitted eyes are now extracted by `scripts/export-blender-bodies.py`, normalized to 1.72 m, subdivided once, fitted to an 11-bone rig and heat-weighted in Blender. Each runtime body has 43,434 vertices / 86,856 triangles. Derived data is in `src/assets/blender-bodies.json`. The WebGPU runtime and independent viewer use both bodies, with four normalized influences per vertex and refitted inverse binds. `scripts/retarget-speech.py` transfers separately verified CC0 MakeHuman speech targets; see the speech provenance document. The earlier inspection/integration notes above record the download-stage state.
