import {test} from 'node:test';
import assert from 'node:assert/strict';
import bodies from '../src/assets/blender-bodies.json';
import {buildCharacter,setPose,transform,type Vec3} from '../src/deformation.ts';
import {defaultRecipe} from '../src/character-core.ts';

for(const sex of ['male','female'] as const){
 test(`${sex}: jaw deformation has no abrupt envelope steps`,()=>{
  const body=bodies[sex],p=Buffer.from(body.positions,'base64'),k=Buffer.from(body.kinds,'base64'),ix=Buffer.from(body.indices,'base64');
  const c=buildCharacter({...defaultRecipe(),bodyBaseId:`adult-${sex}-v1`}),m=c.morphs!,target=m.names.indexOf('jawOpen'),v=c.mesh.vertices,stride=c.mesh.vertexStride;
  const matrices=setPose(c,'neutral',0,'jaw-open');
  const delta=(id:number)=>{const offset=id*stride,point=Array.from(v.subarray(offset,offset+3)) as Vec3,out=[0,0,0];for(let k=0;k<4;k++){const joint=v[offset+11+k],weight=v[offset+15+k],q=transform(matrices.subarray(joint*16,joint*16+16),point);for(let a=0;a<3;a++)out[a]+=(q[a]-point[a])*weight;}return out;};
  let worst=0;
  for(let t=0;t<ix.length;t+=12){const ids=[0,4,8].map(a=>ix.readUInt32LE(t+a));if(ids.some(i=>k[i]!==0))continue;
   for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],rest=Math.hypot(...[0,1,2].map(axis=>(p.readInt32LE(a*12+axis*4)-p.readInt32LE(b*12+axis*4))/1e5));if(rest<.0001)continue;const da=delta(a),db=delta(b);worst=Math.max(worst,Math.hypot(...da.map((x,k)=>x-db[k]))/rest);}
  }
  assert.ok(worst<2,`adjacent vertices have a displacement gradient of ${worst}; mouth envelopes must blend continuously`);
 });
 test(`${sex}: authored mouth cavity has no artificial face cuts`,()=>{
  const body=bodies[sex],kinds=Buffer.from(body.kinds,'base64'),raw=Buffer.from(body.indices,'base64'),edges=new Map<string,number>();
  for(let t=0;t<raw.length;t+=12){const ids=[0,4,8].map(k=>raw.readUInt32LE(t+k));if(ids.some(i=>kinds[i]!==0))continue;
   for(let j=0;j<3;j++){const key=[ids[j],ids[(j+1)%3]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)??0)+1);}
  }
  const adjacent=new Map<number,number[]>();
  for(const [key,count]of edges)if(count===1){const[a,b]=key.split(',').map(Number);adjacent.set(a,[...(adjacent.get(a)??[]),b]);adjacent.set(b,[...(adjacent.get(b)??[]),a]);}
  const seen=new Set<number>();let loops=0;
  for(const id of adjacent.keys()){assert.equal(adjacent.get(id)!.length,2,'lip boundary must be manifold');if(seen.has(id))continue;loops++;const pending=[id];seen.add(id);while(pending.length)for(const next of adjacent.get(pending.pop()!)!)if(!seen.has(next)){seen.add(next);pending.push(next);}}
  assert.equal(loops,0,'the authored mouth bag is closed topology; boundary loops indicate artificial face cuts');
 });
 test(`${sex}: blink stays local to fitted eyelids and leaves eyeballs and mouth fixed`,()=>{
  const c=buildCharacter({...defaultRecipe(),bodyBaseId:`adult-${sex}-v1`}),m=c.morphs!,v=c.mesh.vertices,stride=c.mesh.vertexStride;
  for(const name of ['eyeBlinkLeft','eyeBlinkRight']){
   const target=m.names.indexOf(name);let moved=0,maxDrop=0;
   for(let i=0;i<v.length;i+=stride){
    const row=v[i+19];if(row<0)continue;
    const offset=(target*m.vertexCount+row)*8,delta=m.deltas.subarray(offset,offset+3),distance=Math.hypot(...delta);
    if(distance<1e-6)continue;
    moved++;maxDrop=Math.max(maxDrop,Math.abs(delta[1]));
    assert.equal(v[i+10],2);assert.ok(Math.abs(v[i+1]-bodies[sex].eyes[0][1])<.032,'blink must not drag brows, cheeks or lips');
   }
   assert.ok(moved>100);assert.ok(maxDrop<.008,'blink should move lids millimeters, not collapse the eye socket');
  }
 });
 test(`${sex}: open mouth exposes recessed cavity and separately moving teeth`,()=>{
  const body=bodies[sex];assert.ok(body.oralPrepared);assert.equal(body.removedMouthCapTriangles,0);
  const c=buildCharacter({...defaultRecipe(),bodyBaseId:`adult-${sex}-v1`}),v=c.mesh.vertices,stride=c.mesh.vertexStride,m=c.morphs!,target=m.names.indexOf('jawOpen');
  const kinds=Uint8Array.from(atob(body.kinds),x=>x.charCodeAt(0));
  const bytes=Uint8Array.from(atob(body.indices),x=>x.charCodeAt(0));
  const indices=new Uint32Array(bytes.buffer);
  for(let i=0;i<indices.length;i+=3){
   const face=Array.from(indices.subarray(i,i+3),id=>kinds[id]);
   assert.ok(!(face.includes(7)&&face.includes(8)),'gum faces must not bridge independently moving jaws');
  }
  let upper=0,lower=0,cavity=0;
  for(let i=0;i<kinds.length;i++){
   const row=v[i*stride+19],dy=row<0?0:m.deltas[(target*m.vertexCount+row)*8+1];
   if(kinds[i]===4){cavity++;assert.ok(v[i*stride+2]<.10);}
   if(kinds[i]===5){upper++;assert.ok(Math.abs(dy)<1e-6,'upper teeth stay attached to the skull');}
   if(kinds[i]===6){lower++;assert.equal(dy,0,'lower teeth move rigidly with the jaw, not via a duplicate morph');}
  }
  assert.ok(upper>500&&lower>500);
  const positions=Buffer.from(body.positions,'base64');
  const component=(i:number,a:number)=>positions.readInt32LE(i*12+a*4)/1e5;
  const seamY=(component(8004,1)+component(7986,1))/2;
  const lipZ=(component(8004,2)+component(7986,2))/2;
  const upperIds=Array.from(kinds.keys()).filter(i=>kinds[i]===5),lowerIds=Array.from(kinds.keys()).filter(i=>kinds[i]===6);
  assert.ok(Math.abs(Math.min(...upperIds.map(i=>component(i,1)))-seamY-.001)<.00002,'upper incisor edge fits the upper lip');
  assert.ok(Math.abs(Math.max(...lowerIds.map(i=>component(i,1)))-seamY+.001)<.00002,'lower incisor edge fits the lower lip');
  assert.ok(Math.abs(Math.max(...[...upperIds,...lowerIds].map(i=>component(i,2)))-lipZ+.008)<.00002,'teeth sit behind the lips');
 });
}
