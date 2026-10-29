"""Preserve the authored oral cavity and fit the CC0 dental arches.
Run after export-blender-bodies.py, before rig-face.py.
"""
import bpy,json,base64,struct,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent.parent
def unpack(fmt,value):
    data=base64.b64decode(value);return list(struct.unpack('<'+fmt*(len(data)//struct.calcsize(fmt)),data))
def pack(fmt,values):return base64.b64encode(struct.pack('<'+fmt*len(values),*values)).decode()
path=ROOT/'src/assets/blender-bodies.json'
bodies=json.loads(path.read_text())
source=ROOT/'assets/sources/blender-human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend'
with bpy.data.libraries.load(str(source),link=False) as (src,dst):dst.objects=['Jaw - Realistic']
jaw=dst.objects[0];jaw.data.calc_loop_triangles()
neighbors=[[] for v in jaw.data.vertices]
for edge in jaw.data.edges:
    a,b=edge.vertices;neighbors[a].append(b);neighbors[b].append(a)
components=[-1]*len(neighbors);component=0
for i in range(len(neighbors)):
    if components[i]>=0:continue
    stack=[i];components[i]=component
    while stack:
        for other in neighbors[stack.pop()]:
            if components[other]<0:components[other]=component;stack.append(other)
    component+=1
component_upper={c:sum(v.co.z for v in jaw.data.vertices if components[v.index]==c)/sum(1 for v in jaw.data.vertices if components[v.index]==c)>0 for c in range(component)}
for sex,body in bodies.items():
    if body.get('oralPrepared'):raise RuntimeError('Re-export the raw bodies before preparing oral geometry again.')
    pos=unpack('i',body['positions']);nor=unpack('h',body['normals']);kinds=unpack('B',body['kinds']);joints=unpack('B',body['joints']);weights=unpack('B',body['weights']);indices=unpack('I',body['indices'])
    points=[Vector(tuple(pos[i*3+k]/1e5 for k in range(3))) for i in range(body['vertexCount'])]
    # These CC0 meshes already contain an oral cavity. Preserve that authored
    # topology; a horizontal face cut creates a second mouth on the female.
    mouth_y=(points[8004].y+points[7986].y)/2
    kept=indices.copy()
    oral_parents={};oral_parts={}
    def add(p,kind,parent=-1):
        i=len(points);points.append(Vector(p));pos.extend(round(c*1e5) for c in p);nor.extend([0,0,32767]);kinds.append(kind);joints.extend([2,0,0,0]);weights.extend([255,0,0,0]);oral_parents[str(i)]=parent;oral_parts[str(i)]=kind;return i
    tooth_upper=[v.co for v in jaw.data.vertices if components[v.index]!=0 and component_upper[components[v.index]]]
    tooth_lower=[v.co for v in jaw.data.vertices if components[v.index]!=0 and not component_upper[components[v.index]]]
    upper_shift=mouth_y+.001-min(p.z for p in tooth_upper)*.56
    lower_shift=mouth_y-.001-max(p.z for p in tooth_lower)*.56
    tooth_front=(points[8004].z+points[7986].z)/2-.008
    depth_shift=tooth_front+min(p.y for p in tooth_upper+tooth_lower)*.70
    jaw_offset=len(points)
    for v in jaw.data.vertices:
        p=v.co
        # The jaw asset is centered in its local space: Z-up, -Y-forward.
        tooth=components[v.index]!=0
        upper=component_upper[components[v.index]] if tooth else p.z>-.001
        kind=(5 if upper else 6) if tooth else (7 if upper else 8)
        add((p.x*.78,p.z*.56+(upper_shift if upper else lower_shift),depth_shift-p.y*.70),kind)
    for tri in jaw.data.loop_triangles:
        ids=[jaw_offset+i for i in tri.vertices]
        if any(kinds[i]==7 for i in ids) and any(kinds[i]==8 for i in ids):continue
        kept.extend(ids)
    body.update(vertexCount=len(points),triangleCount=len(kept)//3,positions=pack('i',pos),normals=pack('h',nor),kinds=pack('B',kinds),joints=pack('B',joints),weights=pack('B',weights),indices=pack('I',kept),oralPrepared=True,oralParents=oral_parents,oralParts=oral_parts,mouthY=mouth_y,removedMouthCapTriangles=0)
    print('ORAL',sex,'preserved authored mouth, dental vertices',len(jaw.data.vertices),flush=True)
path.write_text(json.dumps(bodies,separators=(',',':')))
