"""Add curved eyelid surfaces fitted to each eyeball, collapsed at the open rim.
Blink unfolds these surfaces over the globe without collapsing the eye socket.
"""
import json,base64,struct,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
def unpack(fmt,value):
    raw=base64.b64decode(value);return list(struct.unpack('<'+fmt*(len(raw)//struct.calcsize(fmt)),raw))
def pack(fmt,values):return base64.b64encode(struct.pack('<'+fmt*len(values),*values)).decode()
path=ROOT/'src/assets/blender-bodies.json';bodies=json.loads(path.read_text())
for sex,body in bodies.items():
    if body.get('eyelidMeta'):continue
    p=unpack('i',body['positions']);n=unpack('h',body['normals']);kinds=unpack('B',body['kinds']);joints=unpack('B',body['joints']);weights=unpack('B',body['weights']);indices=unpack('I',body['indices']);meta={}
    for eye,center in enumerate(body['eyes']):
        for upper in [True,False]:
            offset=len(kinds)
            for row in range(13):
                for column in range(33):
                    u=column/32*2-1;dx=u*.0147;arc=math.sqrt(max(0,1-u*u));dy=(.0068 if upper else -.0068)*arc
                    dz=math.sqrt(max(0,.013**2-dx*dx-dy*dy))+.0008
                    i=len(kinds);p.extend(round(v*1e5) for v in [center[0]+dx,center[1]+dy,center[2]+dz]);normal=[dx,dy,max(.001,dz)];length=math.sqrt(sum(v*v for v in normal));n.extend(round(v/length*32767) for v in normal)
                    kinds.append(9);joints.extend([2,0,0,0]);weights.extend([255,0,0,0]);meta[str(i)]=[eye,upper,u,row/12]
                    if row and column:
                        a=offset+(row-1)*33+column-1;b=a+1;c=offset+row*33+column-1;d=c+1
                        indices.extend([a,c,b,b,c,d] if upper else [a,b,c,b,d,c])
    body.update(vertexCount=len(kinds),triangleCount=len(indices)//3,positions=pack('i',p),normals=pack('h',n),kinds=pack('B',kinds),joints=pack('B',joints),weights=pack('B',weights),indices=pack('I',indices),eyelidMeta=meta)
    print('FITTED EYELIDS',sex,len(meta),'vertices',flush=True)
path.write_text(json.dumps(bodies,separators=(',',':')))
