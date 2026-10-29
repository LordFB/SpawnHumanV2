import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseVisemeCues,sampleVisemes,visemes} from '../src/lipsync.ts';
import {buildCharacter} from '../src/deformation.ts';
import {defaultRecipe,canonical,resolveRecipe} from '../src/character-core.ts';

test('Rhubarb and Oculus cue parsing validates times, names and strengths',()=>{
 assert.deepEqual(parseVisemeCues({mouthCues:[{start:0,end:.2,value:'A'},{start:.2,end:.4,value:'F'}]}).map(c=>c.viseme),['PP','U']);
 for(const cue of [{start:-1,end:1,viseme:'aa'},{start:1,end:0,viseme:'aa'},{start:0,end:1,viseme:'unknown'},{start:0,end:Infinity,viseme:'aa'},{start:0,end:1,viseme:'aa',weight:2}])assert.throws(()=>parseVisemeCues([cue]));
});
test('speech anticipation and release blend adjacent phonemes and return to rest',()=>{
 const cues=parseVisemeCues([{start:.1,end:.3,viseme:'PP'},{start:.3,end:.5,viseme:'aa'}]);
 assert.deepEqual(sampleVisemes(cues,0),{});assert.deepEqual(sampleVisemes(cues,1),{});
 const mid=sampleVisemes(cues,.28);assert.ok(mid.PP!>0&&mid.aa!>0);assert.ok(Object.values(mid).reduce((a,b)=>a+b,0)<=1.000001);
 assert.ok(sampleVisemes(cues,.35).aa!>sampleVisemes(cues,.28).aa!);
});
test('both bases expose actual CC0-derived speech targets with finite sparse deltas',()=>{
 for(const bodyBaseId of ['adult-male-v1','adult-female-v1']){
  const c=buildCharacter({...defaultRecipe(),bodyBaseId}),m=c.morphs!,stride=c.mesh.vertexStride;
  assert.ok(m);assert.ok(visemes.every(name=>m.names.includes(name)));assert.ok(m.names.includes('jawOpen'));
  assert.equal(m.deltas.length,m.names.length*m.vertexCount*8);assert.ok(m.deltas.every(Number.isFinite));
  let rows=0;
  for(let i=0;i<c.mesh.vertices.length;i+=stride){
   const row=c.mesh.vertices[i+19];if(row<0)continue;
   assert.ok(Number.isInteger(row)&&row<m.vertexCount);rows++;
  }
  assert.equal(rows,m.vertexCount);
  for(const name of ['aa','PP','FF','O','U']){
   const offset=m.names.indexOf(name)*m.vertexCount*8;let peak=0;
   for(let row=0;row<m.vertexCount;row++)peak=Math.max(peak,Math.hypot(...m.deltas.subarray(offset+row*8,offset+row*8+3)));
   assert.ok(peak>.001,`${bodyBaseId} ${name} needs real vertex displacement`);
  }
 }
});
test('mouth controls persist, affect lips and preserve the armature',()=>{
 const recipe=defaultRecipe(),neutral=buildCharacter(recipe);
 const edited=buildCharacter({...recipe,face:{...recipe.face,upperLip:.7,lowerLip:.5,mouthHeight:.3,mouthCorners:.4}});
 assert.notEqual(edited.geometryHash,neutral.geometryHash);assert.deepEqual(edited.rig,neutral.rig);
 assert.equal(canonical(edited.recipe),canonical(resolveRecipe(JSON.parse(canonical(edited.recipe)))));
 assert.equal(buildCharacter(JSON.parse(canonical(edited.recipe))).geometryHash,edited.geometryHash);
});
