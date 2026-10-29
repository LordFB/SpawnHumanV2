import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solveTongue} from '../src/tongue.ts';
import {buildCharacter} from '../src/deformation.ts';
import {defaultRecipe} from '../src/character-core.ts';
test('tongue target preserves root, reaches a reachable tip and resets',()=>{
 const rest:[[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[0,0,0],[0,.004,.02],[0,.004,.04],[0,0,.06]];
 const pose=solveTongue(rest,[.012,.012,-.008]);
 assert.deepEqual(pose[0],rest[0]);assert.ok(Math.hypot(pose[3][0]-.012,pose[3][1]-.012,pose[3][2]-.052)<.0002);
 for(let i=1;i<4;i++)assert.ok(Math.abs(Math.hypot(...pose[i].map((v,k)=>v-pose[i-1][k]))-Math.hypot(...rest[i].map((v,k)=>v-rest[i-1][k])))<.0002);
 assert.deepEqual(solveTongue(rest,[0,0,0]),rest);
 assert.ok(solveTongue(rest,[10,10,10]).flat().every(Number.isFinite));
});
test('tongue is a closed skinned surface with a jaw-parented chain',()=>{
 const c=buildCharacter(defaultRecipe());assert.equal(c.rig[12].name,'tongue.root');assert.equal(c.rig[12].parent,11);assert.equal(c.rig[13].parent,12);assert.equal(c.rig[14].parent,13);
 const s=c.mesh.vertexStride,v=c.mesh.vertices;let count=0;
 for(let i=0;i<v.length;i+=s)if(v[i+11]>=12){count++;assert.equal(v[i+19],-1);const sum=v[i+15]+v[i+16]+v[i+17]+v[i+18];assert.ok(Math.abs(sum-1)<1e-6);}
 assert.ok(count>500);
});

