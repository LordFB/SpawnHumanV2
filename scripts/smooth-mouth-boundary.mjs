import fs from 'node:fs';
const bodies=JSON.parse(fs.readFileSync('src/assets/blender-bodies.json'));
for(const [sex,b] of Object.entries(bodies)){
 const raw=Buffer.from(b.indices,'base64'),k=Buffer.from(b.kinds,'base64'),adj=new Map(),edges=new Map();
 for(let t=0;t<raw.length;t+=12){const ids=[0,4,8].map(a=>raw.readUInt32LE(t+a));if(ids.some(i=>k[i]!==0))continue;
 for(let a=0;a<3;a++){const i=ids[a],j=ids[(a+1)%3],key=[i,j].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}}
 for(const [key,n]of edges)if(n===1){const[i,j]=key.split(',').map(Number);adj.set(i,[...(adj.get(i)||[]),j]);adj.set(j,[...(adj.get(j)||[]),i]);}
 const seen=new Set(),groups=[];for(const i of adj.keys()){if(seen.has(i))continue;const q=[i],g=[];seen.add(i);while(q.length){const v=q.pop();g.push(v);for(const j of adj.get(v))if(!seen.has(j)){seen.add(j);q.push(j);}}groups.push(g);}
 const pos=Buffer.from(b.positions,'base64'),p=Array.from({length:b.vertexCount},(_,i)=>[0,1,2].map(a=>pos.readInt32LE(i*12+a*4)/1e5));
 if(!b.smoothedMouthBoundary){
 for(let pass=0;pass<12;pass++){
  const next=new Map();for(const [i,ns] of adj)next.set(i,[0,1,2].map(a=>p[i][a]*.5+ns.reduce((sum,j)=>sum+p[j][a],0)*.5/ns.length));
  for(const [i,v] of next)p[i]=v;
 }
 for(const [id,parent]of Object.entries(b.oralParents)){
  if(k[+id]===10)p[+id]=p[parent].slice();
  if(k[+id]===4&&parent>=0)p[+id]=[p[parent][0]*.78,b.mouthY+(p[parent][1]-b.mouthY)*.5,.092];
 }
 p.forEach((v,i)=>v.forEach((value,a)=>pos.writeInt32LE(Math.round(value*1e5),i*12+a*4)));
 b.positions=pos.toString('base64');b.smoothedMouthBoundary=true;
 }
 console.log(sex,'smoothed mouth boundary loops',groups.map(g=>g.length));
}
fs.writeFileSync('src/assets/blender-bodies.json',JSON.stringify(bodies));
