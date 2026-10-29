import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent.parent
source=root/'assets/sources/blender-human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend'
with bpy.data.libraries.load(str(source),link=False) as (src,dst):
    dst.objects=['Jaw - Realistic']
obj=dst.objects[0]
points=[obj.matrix_world @ v.co for v in obj.data.vertices]
neighbors=[[] for p in points]
for edge in obj.data.edges:
    a,b=edge.vertices;neighbors[a].append(b);neighbors[b].append(a)
seen=set();result=[]
for i in range(len(points)):
    if i in seen: continue
    stack=[i];seen.add(i);component=[]
    while stack:
        j=stack.pop();component.append(j)
        for k in neighbors[j]:
            if k not in seen: seen.add(k);stack.append(k)
    bounds=[[min(points[j][k] for j in component),max(points[j][k] for j in component)] for k in range(3)]
    result.append(dict(count=len(component),bounds=bounds,ids=component))
(root/'artifacts/oral-components.json').write_text(json.dumps(result))
print(json.dumps([{k:v for k,v in c.items() if k!='ids'} for c in result]))
