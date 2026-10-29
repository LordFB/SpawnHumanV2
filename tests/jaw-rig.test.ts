import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildCharacter,setPose,transform} from '../src/deformation.ts';
import {defaultRecipe} from '../src/character-core.ts';
import bodies from '../src/assets/blender-bodies.json';
for(const sex of ['male','female'] as const)test(`${sex}: jaw hinges under the head and teeth stay rigid`,()=>{
 const c=buildCharacter({...defaultRecipe(),bodyBaseId:`adult-${sex}-v1`}),jaw=c.rig.findIndex(b=>b.name==='jaw');
 assert.equal(jaw,11);assert.equal(c.rig[jaw].parent,2);
 const closed=setPose(c,'neutral',0),open=setPose(c,'neutral',0,'jaw-open');
 assert.equal(open.length,(c.rig.length+1)*16);
 assert.deepEqual(open.slice(32,48),closed.slice(32,48),'jaw must not move the head');
 const pivot=c.rig[jaw].position,posed=transform(open.slice(jaw*16,jaw*16+16),pivot);
 assert.ok(Math.hypot(...posed.map((v,i)=>v-pivot[i]))<1e-6,'hinge stays fixed');
 const kinds=Buffer.from(bodies[sex].kinds,'base64'),v=c.mesh.vertices,s=c.mesh.vertexStride;let blended=0;
 for(let i=0;i<kinds.length;i++){
  let jw=0,hw=0;for(let k=0;k<4;k++){const bone=v[i*s+11+k],weight=v[i*s+15+k];if(bone===jaw)jw+=weight;if(bone===2)hw+=weight;}
  if(kinds[i]===5)assert.equal(hw,1);
  if(kinds[i]===6){assert.equal(jw,1);const p=[v[i*s],v[i*s+1],v[i*s+2]] as [number,number,number],q=transform(open.slice(jaw*16,jaw*16+16),p);assert.ok(q[1]<p[1]);}
  if(kinds[i]===0&&jw>.05&&jw<.95)blended++;
 }
 assert.ok(blended>100,'jaw envelope blends across the face');
 const m=c.morphs!,target=m.names.indexOf('jawOpen');
 assert.ok(m.deltas.subarray(target*m.vertexCount*8,(target+1)*m.vertexCount*8).every(x=>x===0),'jaw opening must not be applied twice as a morph');
});

