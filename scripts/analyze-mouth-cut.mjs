import fs from 'node:fs';
const bodies=JSON.parse(fs.readFileSync('artifacts/raw-bodies.json')),speech=JSON.parse(fs.readFileSync('src/assets/speech-morphs.json'));
for(const[sex,b]of Object.entries(bodies)){
 const p=Buffer.from(b.positions,'base64'),raw=Buffer.from(b.indices,'base64'),s=speech[sex],ids=Buffer.from(s.vertexIds,'base64'),d=Buffer.from(s.morphs.jawOpen,'base64'),delta=new Map(),pos=i=>[0,1,2].map(a=>p.readInt32LE(i*12+a*4)/1e5);
 for(let r=0;r<ids.length/4;r++)delta.set(ids.readUInt32LE(r*4),[0,1,2].map(a=>d.readInt16LE(r*12+a*2)/1e5));
 const mouth=(pos(8004)[1]+pos(7986)[1])/2;
 for(const ratio of [2,3,3.8,5,8]){
 const edges=new Map();let count=0;
 for(let t=0;t<raw.length;t+=12){const v=[0,4,8].map(a=>raw.readUInt32LE(t+a)),ps=v.map(pos);if(!ps.every(p=>Math.abs(p[0])<.04&&Math.abs(p[1]-mouth)<.014&&p[2]>.12))continue;
 let cut=false;for(let a=0;a<3;a++){const i=v[a],j=v[(a+1)%3],pi=ps[a],pj=ps[(a+1)%3],di=delta.get(i)||[0,0,0],dj=delta.get(j)||[0,0,0];if(Math.hypot(...pi.map((x,k)=>x+di[k]-pj[k]-dj[k]))/Math.hypot(...pi.map((x,k)=>x-pj[k]))>ratio)cut=true;}
 if(!cut)continue;count++;for(let a=0;a<3;a++){const key=[v[a],v[(a+1)%3]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}}
 const adj=new Map();for(const[key,n]of edges)if(n===1){const[i,j]=key.split(',').map(Number);adj.set(i,[...(adj.get(i)||[]),j]);adj.set(j,[...(adj.get(j)||[]),i]);}
 let groups=0;const seen=new Set();for(const i of adj.keys()){if(seen.has(i))continue;groups++;let q=[i];seen.add(i);while(q.length)for(const j of adj.get(q.pop()))if(!seen.has(j)){seen.add(j);q.push(j);}}
 console.log(sex,ratio,count,'loops',groups,'nonmanifold',[...adj.values()].filter(ns=>ns.length!==2).length);
 }
 console.log('lower landmarks',...[7986,7985,7984,7983,28921].map(i=>[i,delta.get(i)]));
}
