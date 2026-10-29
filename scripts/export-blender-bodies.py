"""Run with Blender 4.2+: blender --background --factory-startup --python this-file.

Extracts only the CC0 realistic bodies and their fitted eyes, fits an 11-bone
armature, computes Blender heat weights, and retains four normalized influences.
The source library is never saved or modified.
"""
import bpy, json, math, base64, struct, os
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/sources/blender-human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend'
NAMES = ['pelvis', 'spine', 'head', 'upperArm.L', 'forearm.L', 'upperArm.R', 'forearm.R', 'thigh.L', 'shin.L', 'thigh.R', 'shin.R']
PARENTS = [-1, 0, 1, 1, 3, 1, 5, 0, 7, 0, 9]

def packed(fmt, values):
    return base64.b64encode(struct.pack('<' + fmt * len(values), *values)).decode('ascii')

def export(sex):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    prefix = 'GEO-body_' + sex + '_realistic'
    with bpy.data.libraries.load(str(SOURCE), link=False) as (src, dst):
        dst.objects = [prefix, prefix + '.eye.L', prefix + '.eye.R']
    objects = [o for o in dst.objects if o]
    assert len(objects) == 3, 'Missing body or fitted eyes'
    for obj in objects:
        bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.update()
    body = bpy.data.objects[prefix]
    world = [body.matrix_world @ v.co for v in body.data.vertices]
    bottom = min(v.z for v in world)
    height = max(v.z for v in world) - bottom
    center_x = (min(v.x for v in world) + max(v.x for v in world)) / 2
    scale = 1.72 / height
    # Blender Z-up/-Y-forward -> runtime Y-up/+Z-forward; rotation preserves winding.
    convert = lambda v: Vector(((v.x-center_x)*scale, (v.z-bottom)*scale, -v.y*scale))
    eyes = []
    for obj in objects:
        transform = obj.matrix_world.copy()
        points = [convert(transform @ v.co) for v in obj.data.vertices]
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        for v, point in zip(obj.data.vertices, points):
            v.co = point
        for modifier in list(obj.modifiers):
            obj.modifiers.remove(modifier)
        if obj != body:
            eyes.append(sum(points, Vector()) / len(points))
    eye_y = sum(p.y for p in eyes)/2
    joints = [[0,.88,0],[0,1.06,0],[0,eye_y-.105,0],[-.185,1.40,0],[-.292,1.145,0],[.185,1.40,0],[.292,1.145,0],[-.087,.88,0],[-.09,.46,.012],[.087,.88,0],[.09,.46,.012]]
    tails = [[0,1.06,0],[0,eye_y-.105,0],[0,1.71,0],joints[4],[-.388,.87,.015],joints[6],[.388,.87,.015],joints[8],[-.09,.07,.015],joints[10],[.09,.07,.015]]
    armature = bpy.data.armatures.new('Runtime skeleton')
    rig = bpy.data.objects.new('Runtime skeleton', armature)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for i, name in enumerate(NAMES):
        bone = armature.edit_bones.new(name)
        bone.head, bone.tail = joints[i], tails[i]
        if PARENTS[i] >= 0:
            bone.parent = armature.edit_bones[NAMES[PARENTS[i]]]
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    # Subdivision interpolates both surface positions and heat weights.
    for modifier in list(body.modifiers):
        body.modifiers.remove(modifier)
    subdiv = body.modifiers.new('Runtime subdivision', 'SUBSURF')
    subdiv.levels = 1
    subdiv.render_levels = 1
    positions, normals, influences, weights, kinds, indices = [], [], [], [], [], []
    for obj in objects:
        bpy.context.view_layer.update()
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        offset = len(kinds)
        groups = {g.index:NAMES.index(g.name) for g in obj.vertex_groups if g.name in NAMES}
        center = sum((v.co for v in mesh.vertices), Vector())/len(mesh.vertices)
        for v in mesh.vertices:
            positions.extend(round(c*100000) for c in v.co)
            normals.extend(round(c*32767) for c in v.normal)
            if obj == body:
                pairs = sorted([(groups[g.group], g.weight) for g in v.groups if g.group in groups and g.weight > 1e-6], key=lambda p:-p[1])[:4]
                # Ease the neck into a rigid face/scalp rather than switching
                # influences abruptly at a single vertex row.
                blend = max(0, min(1, (v.co.y-(eye_y-.15))/.065))
                blend = blend*blend*(3-2*blend)
                if blend > 0:
                    combined = {j:w*(1-blend) for j,w in pairs}
                    combined[2] = combined.get(2,0)+blend
                    pairs = sorted([(j,w) for j,w in combined.items() if w>1e-6], key=lambda p:-p[1])[:4]
                assert pairs, 'Heat weighting left an unweighted vertex'
                kind = 0
            else:
                pairs = [(2,1)]
                radial = math.hypot(v.co.x-center.x, v.co.y-center.y)
                kind = 3 if v.co.z>center.z and radial<.003 else 2 if v.co.z>center.z and radial<.006 else 1
            total = sum(w for _,w in pairs)
            ids = [j for j,_ in pairs] + [0]*(4-len(pairs))
            quantized = [round(w/total*255) for _,w in pairs]
            quantized[0] += 255-sum(quantized)
            influences.extend(ids)
            weights.extend(quantized+[0]*(4-len(pairs)))
            kinds.append(kind)
        for triangle in mesh.loop_triangles:
            indices.extend(offset+i for i in triangle.vertices)
        evaluated.to_mesh_clear()
    result = dict(source=prefix, vertexCount=len(kinds), triangleCount=len(indices)//3,
                  rig=joints, eyes=[list(p) for p in eyes],
                  positions=packed('i',positions), normals=packed('h',normals),
                  joints=packed('B',influences), weights=packed('B',weights),
                  kinds=packed('B',kinds), indices=packed('I',indices))
    print('EXPORTED', sex, result['vertexCount'], result['triangleCount'], flush=True)
    return result

result = {sex:export(sex) for sex in ['male','female']}
target = ROOT / os.environ.get('BODY_EXPORT_PATH','src/assets/blender-bodies.json')
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(result,separators=(',',':')))
print('WROTE', target, flush=True)
