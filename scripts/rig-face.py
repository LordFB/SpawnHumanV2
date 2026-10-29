"""Fit the jaw hinge and diffuse its envelope over the authored surface graph.
Run after prepare-facial-geometry.py and add-fitted-eyelids.py, before retargeting.
"""
import json,base64,struct,math
import numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
path=ROOT/'src/assets/blender-bodies.json'
data=json.loads(path.read_text())
def unpack(fmt,s):
    raw=base64.b64decode(s);return list(struct.unpack('<'+fmt*(len(raw)//struct.calcsize(fmt)),raw))
def pack(fmt,v):return base64.b64encode(struct.pack('<'+fmt*len(v),*v)).decode()
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
for sex,b in data.items():
    p=np.array(unpack('i',b['positions']),dtype=float).reshape(-1,3)/1e5
    kinds=np.array(unpack('B',b['kinds']));indices=np.array(unpack('I',b['indices'])).reshape(-1,3)
    joints=np.array(unpack('B',b['joints'])).reshape(-1,4);weights=np.array(unpack('B',b['weights'])).reshape(-1,4)
    y=b['mouthY'];hinge=[0,y+.038,.078 if sex=='male' else .084]
    b['rig']=b['rig'][:11]+[hinge]
    mask=(kinds==0)&(p[:,1]>y-.11)&(p[:,1]<y+.045)
    faces=indices[np.all(mask[indices],axis=1)]
    edges=np.concatenate((faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]))
    edges=np.unique(np.sort(edges,axis=1),axis=0)
    a=np.concatenate((edges[:,0],edges[:,1]));c=np.concatenate((edges[:,1],edges[:,0]))
    degree=np.bincount(a,minlength=len(p)).astype(float);degree[degree==0]=1
    value=(1-smooth(y-.010,y+.004,p[:,1]))*smooth(y-.105,y-.065,p[:,1])*smooth(-.005,.045,p[:,2])
    value*=mask
    # Pin anatomical regions, not a rectangular deformation patch. Unpinned
    # vertices solve a harmonic transition along connected mesh edges.
    lower=mask&(p[:,1]<y-.006)&(p[:,1]>y-.065)&(p[:,2]>.060)&(np.abs(p[:,0])<.055)
    lower|=mask&(p[:,1]<y-.0006)&(p[:,1]>y-.012)&(p[:,2]>.125)&(np.abs(p[:,0])<.022)
    upper=(~mask)|(p[:,1]>y+.003)|(p[:,1]<y-.098)|(p[:,2]<.008)
    upper|=mask&(p[:,1]>y)&(p[:,2]>.12)&(np.abs(p[:,0])<.025)
    for iteration in range(400):
        sums=np.bincount(a,weights=value[c],minlength=len(p))
        value=value*.3+sums/degree*.7
        value[lower]=1;value[upper]=0
    # Ease the harmonic weights so derivatives taper at rigid regions.
    value=smooth(0,1,value)
    # Relax the seed boundary too. Keeping adjacent pinned rings at 0 and 1
    # produces abrupt weights on the very short edges inside the lip folds.
    for iteration in range(64):
        sums=np.bincount(a,weights=value[c],minlength=len(p))
        value=value*.35+sums/degree*.65
        value[~mask]=0
    value[(kinds==6)|(kinds==8)]=1
    for i in range(len(p)):
        if kinds[i] in [5,7]:joints[i]=[2,0,0,0];weights[i]=[255,0,0,0];continue
        if kinds[i] in [6,8]:joints[i]=[11,0,0,0];weights[i]=[255,0,0,0];continue
        if value[i]<1/255:continue
        influences={}
        for bone,weight in zip(joints[i],weights[i]):
            if weight:influences[int(bone)]=influences.get(int(bone),0)+int(weight)
        head=influences.pop(2,0)+influences.pop(11,0)
        jaw=round(head*float(value[i]));influences[2]=head-jaw;influences[11]=jaw
        chosen=sorted(((bone,w) for bone,w in influences.items() if w),key=lambda v:-v[1])[:4]
        total=sum(w for _,w in chosen);chosen=[(bone,round(w*255/total)) for bone,w in chosen]
        chosen[0]=(chosen[0][0],chosen[0][1]+255-sum(w for _,w in chosen))
        chosen+= [(0,0)]*(4-len(chosen));joints[i]=[v[0] for v in chosen];weights[i]=[v[1] for v in chosen]
    b['joints']=pack('B',joints.flatten().tolist());b['weights']=pack('B',weights.flatten().tolist())
    b['facialRigVersion']='jaw-v1';b['jawMaxAngle']=.36
    print('JAW RIG',sex,'hinge',hinge,'blended vertices',int(np.sum((value>.05)&(value<.95))),flush=True)
path.write_text(json.dumps(data,separators=(',',':')))
