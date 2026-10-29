"""Retarget CC0 MakeHuman speech targets onto the extracted CC0 Blender bodies.
Run in Blender's Python. Surface barycentrics transfer displacements; the source
and destination neutral topologies are retained unchanged. This is an automatic
transfer, not an artist-approved facial rig.
"""
import json, base64, struct, math
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'assets/sources/makehuman-speech'
def unpack(fmt,s):
    raw=base64.b64decode(s)
    return list(struct.unpack('<'+fmt*(len(raw)//struct.calcsize(fmt)),raw))
def packed(fmt,values):
    return base64.b64encode(struct.pack('<'+fmt*len(values),*values)).decode()

verts,faces=[],[]
group=''
for line in (SOURCE/'base.obj').read_text().splitlines():
    fields=line.split()
    if not fields: continue
    if fields[0]=='v': verts.append(Vector(tuple(float(v) for v in fields[1:4])))
    if fields[0]=='g': group=fields[1]
    if fields[0]=='f' and group=='body':
        ids=[int(f.split('/')[0])-1 for f in fields[1:]]
        if all(verts[i].y>5.2 for i in ids):
            faces.extend((ids[0],ids[k],ids[k+1]) for k in range(1,len(ids)-1))
names=['sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U']
units=['jawOpen','mouthSmileLeft','mouthSmileRight','mouthFrownLeft','mouthFrownRight','eyeBlinkLeft','eyeBlinkRight']
targets={}
for name in names+units:
    pack='visemes02/targets/visemes/viseme_'+name if name in names else 'faceunits01/targets/faceunits/'+name
    target={}
    for line in (SOURCE/'extra-targets-main/assets'/f'{pack}.target').read_text().splitlines():
        parts=line.split()
        if parts and parts[0].isdigit(): target[int(parts[0])]=Vector(tuple(float(v)*.1 for v in parts[1:4]))
    targets[name]=target

bodies=json.loads((ROOT/'src/assets/blender-bodies.json').read_text())
result={}
jaw_amounts=dict(sil=0,PP=0,FF=.10,TH=.18,DD=.18,kk=.25,CH=.20,SS=.10,nn=.15,RR=.22,aa=.85,E=.35,I=.25,O=.55,U=.28,jawOpen=1)
for sex,body in bodies.items():
    coords=unpack('i',body['positions']); kinds=unpack('B',body['kinds']); indices=unpack('I',body['indices'])
    points=[Vector(tuple(coords[i*3+k]/1e5 for k in range(3))) for i in range(body['vertexCount'])]
    eye_y=sum(e[1] for e in body['eyes'])/2
    source=[Vector((p.x*.1,(p.y-7.35)*.1+eye_y,p.z*.1)) for p in verts]
    tree=BVHTree.FromPolygons(source,faces,all_triangles=True)
    # Nearest-surface transfer can jump across touching lips. Restrict the
    # correspondence to the matching jaw side around the authored lip seam.
    mouth_y=(points[8004].y+points[7986].y)/2
    lower_faces=[f for f in faces if sum(targets['jawOpen'].get(j,Vector()).y for j in f)/3<-.012]
    upper_faces=[f for f in faces if sum(targets['jawOpen'].get(j,Vector()).y for j in f)/3>-.004]
    lower_tree=BVHTree.FromPolygons(source,lower_faces,all_triangles=True)
    upper_tree=BVHTree.FromPolygons(source,upper_faces,all_triangles=True)
    vertex_ids=[i for i,p in enumerate(points) if (kinds[i]==0 or kinds[i]>=4) and p.y>eye_y-.18]
    mappings=[]
    for i in vertex_ids:
        p=points[i];mapping_tree=tree;mapping_faces=faces
        if kinds[i]==0 and abs(p.x)<.032 and abs(p.y-mouth_y)<.018 and p.z>.10:
            mapping_tree,mapping_faces=(lower_tree,lower_faces) if p.y<mouth_y else (upper_tree,upper_faces)
        nearest,normal,triangle,distance=mapping_tree.find_nearest(p)
        ids=mapping_faces[triangle]
        # Use barycentric coordinates on the source surface, avoiding cross-face
        # averaging that would smear upper and lower lips into each other.
        weights=barycentric_transform(nearest,*[source[j] for j in ids],Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
        mappings.append((ids,weights))
    stored_normals=unpack('h',body['normals'])
    def normals(positions):
        output=[Vector() for _ in positions]
        for t in range(0,len(indices),3):
            a,b,c=indices[t:t+3];n=(positions[b]-positions[a]).cross(positions[c]-positions[a])
            for i in [a,b,c]: output[i]+=n
        for i,n in enumerate(output):
            if n.length<1e-12:output[i]=Vector(tuple(stored_normals[i*3+k]/32767 for k in range(3)))
            else:n.normalize()
        return output
    base_normals=normals(points)
    # Diffuse displacement on the actual surface graph, never through Euclidean
    # neighbors across the lip gap. This removes nearest-triangle transfer steps
    # without smoothing or shrinking the neutral anatomy.
    edge_set=set()
    for t in range(0,len(indices),3):
        tri=indices[t:t+3]
        if any(kinds[i]!=0 for i in tri):continue
        for a,b in zip(tri,tri[1:]+tri[:1]):
            if points[a].y>eye_y-.19 or points[b].y>eye_y-.19:
                edge_set.add(tuple(sorted((a,b))))
    edge_array=np.array(sorted(edge_set),dtype=np.int32)
    edge_from=np.concatenate((edge_array[:,0],edge_array[:,1]))
    edge_to=np.concatenate((edge_array[:,1],edge_array[:,0]))
    degree=np.bincount(edge_from,minlength=len(points)).astype(float)
    degree[degree==0]=1
    skin_joints=np.array(unpack('B',body['joints'])).reshape(-1,4)
    skin_weights=np.array(unpack('B',body['weights'])).reshape(-1,4)/255
    jaw_weights=np.sum(skin_weights*(skin_joints==11),axis=1)
    morphs={}
    def smooth(a,b,v):
        t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
    def blink_delta(p,eye):
        eye=Vector(eye);dx,dy,dz=p-eye
        if abs(dx)>.024 or abs(dy)>.031 or dz<-.003 or dz>.026:return Vector()
        horizontal=(1-smooth(.014,.022,abs(dx)))*math.sqrt(max(0,1-(dx/.018)**2))
        amount=(1-smooth(.007,.024,abs(dy)))*smooth(.002,.008,dz)
        new_y=dy+(-.0063 if dy>=0 else .0046)*amount*horizontal
        surface=eye.z+math.sqrt(max(0,.0127**2-dx**2-new_y**2))+.0008
        return Vector((0,new_y-dy,(max(p.z,surface)-p.z)*horizontal*amount))
    for name,target in targets.items():
        posed=[p.copy() for p in points];deltas=[];by_vertex={}
        lower=target.get(494,Vector())
        jaw_amount=max(0,min(1.2,-lower.y/.028))
        jaw_delta=Vector((0,-.016*jaw_amount,-.012*jaw_amount))
        for i,(ids,weights) in zip(vertex_ids,mappings):
            delta=sum((target.get(j,Vector())*weights[k] for k,j in enumerate(ids)),Vector())
            if name.startswith('eyeBlink'):
                delta=Vector()
                lid=body.get('eyelidMeta',{}).get(str(i))
                if lid and lid[0]==(0 if name.endswith('Left') else 1):
                    eye,upper,u,t=lid;center=Vector(body['eyes'][eye]);dx=u*.0147;arc=math.sqrt(max(0,1-u*u))
                    edge=(.0068 if upper else -.0068)*arc;seam=(-.0007 if upper else -.0004)*arc
                    dy=edge+(seam-edge)*t;dz=math.sqrt(max(0,.013**2-dx*dx-dy*dy))+.0008
                    delta=center+Vector((dx,dy,dz))-points[i]
            elif kinds[i]>=4:
                parent=body.get('oralParents',{}).get(str(i),-1)
                if kinds[i]==4:delta=by_vertex.get(parent,jaw_delta*.3)*.4
                elif kinds[i]==10:delta=by_vertex.get(parent,Vector()).copy()
                elif kinds[i] in [6,8]:delta=by_vertex.get(28921,jaw_delta)*.85
                else:delta=Vector()
            # Transfer only the head; fade the lower boundary into the neck.
            blend=max(0,min(1,(points[i].y-(eye_y-.18))/.055));blend=blend*blend*(3-2*blend)
            delta*=blend
            by_vertex[i]=delta
            posed[i]+=delta;deltas.append(delta)
        if not name.startswith('eyeBlink'):
            field=np.zeros((len(points),3),dtype=float)
            for i in vertex_ids:
                if kinds[i]==0:field[i]=by_vertex[i]
            for iteration in range(48):
                average=np.zeros_like(field)
                np.add.at(average,edge_from,field[edge_to])
                average/=degree[:,None]
                field=field*.35+average*.65
            # The skeleton supplies jaw movement. Keep only bounded local lip
            # correctives, avoiding a second full-face opening displacement.
            angle=.36*jaw_amounts.get(name,0);co=math.cos(angle);si=math.sin(angle)
            hinge=Vector(body['rig'][11])
            for i in vertex_ids:
                if kinds[i]==0:
                    p=points[i];q=p-hinge
                    rigid=Vector((0,q.y*co-q.z*si-q.y,q.y*si+q.z*co-q.z))*jaw_weights[i]
                    residual=Vector(field[i])-rigid
                    mask=math.exp(-(p.x/.038)**4-((p.y-mouth_y)/.024)**4)*smooth(.085,.13,p.z)
                    limits=(.006,.004,.004)
                    by_vertex[i]=Vector(tuple(math.tanh(residual[k]/limits[k])*limits[k]*mask for k in range(3))) if name!='jawOpen' else Vector()
                elif kinds[i] in [5,6,7,8]:by_vertex[i]=Vector()
                posed[i]=points[i]+by_vertex[i]
            deltas=[by_vertex[i] for i in vertex_ids]
        posed_normals=normals(posed)
        data=[]
        for i,delta in zip(vertex_ids,deltas):
            data.extend(round(v*1e5) for v in delta)
            data.extend(round(v*16383) for v in posed_normals[i]-base_normals[i])
        morphs[name]=data
    active=[row for row in range(len(vertex_ids)) if any(any(abs(v)>1 for v in data[row*6:row*6+6]) for data in morphs.values())]
    morphs={name:packed('h',[v for row in active for v in data[row*6:row*6+6]]) for name,data in morphs.items()}
    result[sex]=dict(vertexIds=packed('I',[vertex_ids[row] for row in active]),morphs=morphs,jawAmounts=jaw_amounts,facialRigVersion='jaw-v1')
    print('RETARGETED',sex,len(active),'vertices',len(morphs),'targets',flush=True)
(ROOT/'src/assets/speech-morphs.json').write_text(json.dumps(result,separators=(',',':')))
