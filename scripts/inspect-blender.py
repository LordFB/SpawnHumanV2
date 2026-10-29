import bpy, json, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = root / 'assets/sources/blender-human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
report = []
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    report.append(dict(name=obj.name, vertices=len(obj.data.vertices), polygons=len(obj.data.polygons),
                       bounds=[list(obj.matrix_world @ __import__('mathutils').Vector(c)) for c in obj.bound_box],
                       modifiers=[dict(name=m.name, type=m.type) for m in obj.modifiers],
                       groups=[g.name for g in obj.vertex_groups],
                       materials=[m.name if m else None for m in obj.data.materials]))
(root / 'artifacts/blender-inventory.json').write_text(json.dumps(report, indent=2))
print('INVENTORY WRITTEN', len(report))
