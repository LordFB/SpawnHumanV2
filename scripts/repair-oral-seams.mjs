// Remove gum faces spanning the independently animated upper/lower jaw.
// Safe to rerun on prepared assets; also applied by the source exporter.
import fs from 'node:fs';
const path='src/assets/blender-bodies.json',bodies=JSON.parse(fs.readFileSync(path,'utf8'));
for(const [sex,body] of Object.entries(bodies)){
 const kinds=Buffer.from(body.kinds,'base64'),raw=Buffer.from(body.indices,'base64'),kept=[];let removed=0;
 for(let t=0;t<raw.length;t+=12){const ids=[0,4,8].map(k=>raw.readUInt32LE(t+k));
  if(ids.some(i=>kinds[i]===7)&&ids.some(i=>kinds[i]===8)){removed++;continue;}
  kept.push(...ids);
 }
 const fields={positions:12,normals:6,joints:4,weights:4,kinds:1},buffers=Object.fromEntries(Object.keys(fields).map(f=>[f,[Buffer.from(body[f],'base64')]])),rim=new Map();
 for(let t=0;t<kept.length;t+=3){
  if(!kept.slice(t,t+3).some(i=>kinds[i]===4))continue;
  for(let j=0;j<3;j++){const i=kept[t+j];if(kinds[i]!==0)continue;
   if(!rim.has(i)){
    const id=body.vertexCount++;rim.set(i,id);body.oralParents[String(id)]=i;body.oralParts[String(id)]=10;
    for(const [f,size] of Object.entries(fields))buffers[f].push(f==='kinds'?Buffer.from([10]):buffers[f][0].subarray(i*size,(i+1)*size));
   }
   kept[t+j]=rim.get(i);
  }
 }
 for(const f of Object.keys(fields))body[f]=Buffer.concat(buffers[f]).toString('base64');
 const output=Buffer.alloc(kept.length*4);kept.forEach((v,i)=>output.writeUInt32LE(v,i*4));body.indices=output.toString('base64');body.triangleCount=kept.length/3;
 console.log(sex,'removed crossing gum faces',removed);
}
fs.writeFileSync(path,JSON.stringify(bodies));
