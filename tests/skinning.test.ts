import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultRecipe} from '../src/character-core.ts';
import {buildCharacter,setPose,transform} from '../src/deformation.ts';

for(const bodyBaseId of ['adult-male-v1','adult-female-v1']){
 test(`${bodyBaseId}: waist and hip extremes preserve arm positions and joints`,()=>{
  const recipe={...defaultRecipe(),bodyBaseId},neutral=buildCharacter(recipe),stride=neutral.mesh.vertexStride;
  for(const control of ['waist','hips'] as const)for(const value of [-1,1]){
   const edited=buildCharacter({...recipe,shape:{...recipe.shape,[control]:value}});
   let arms=0,torsoChanged=false;
   for(let i=0;i<neutral.mesh.vertices.length;i+=stride){
    if(neutral.mesh.vertices[i+10]===3){
     arms++;
     assert.deepEqual(edited.mesh.vertices.subarray(i,i+3),neutral.mesh.vertices.subarray(i,i+3),`${control} changed arm vertex ${i/stride}`);
    }
    if(neutral.mesh.vertices[i+10]===1&&neutral.mesh.vertices[i]!==edited.mesh.vertices[i])torsoChanged=true;
   }
   assert.ok(arms>1000);assert.ok(torsoChanged,`${control} must still deform the torso`);
   for(const bone of [3,4,5,6])assert.deepEqual(edited.rig[bone].position,neutral.rig[bone].position);
  }
 });
 test(`${bodyBaseId}: normalized smooth skinning, posed vertices and scalp anchors`,()=>{
  const c=buildCharacter({...defaultRecipe(),bodyBaseId}),{vertices,indices,vertexStride:stride}=c.mesh;
  assert.ok(vertices.length/stride>40000);assert.ok(indices.every(i=>i<vertices.length/stride));
  let blended=0;
  for(let i=0;i<vertices.length;i+=stride){
   let sum=0,count=0;
   for(let k=0;k<4;k++){
    const joint=vertices[i+11+k],weight=vertices[i+15+k];
    assert.ok(Number.isInteger(joint)&&joint>=0&&joint<c.rig.length);
    assert.ok(weight>=0&&weight<=1);sum+=weight;if(weight>.001)count++;
   }
   assert.ok(Math.abs(sum-1)<1e-6);if(count>1)blended++;
   assert.ok(Math.abs(Math.hypot(...vertices.subarray(i+3,i+6))-1)<1e-4);
  }
  assert.ok(blended>5000,'joint transitions must actually blend multiple bones');
  const neutral=setPose(c,'neutral',0),walk=setPose(c,'walk',.25),crouch=setPose(c,'crouch',0);
  for(const matrices of [neutral,walk,crouch]){
   let moving=0;
   for(let i=0;i<vertices.length;i+=stride*17){
    const p=Array.from(vertices.subarray(i,i+3)) as [number,number,number],posed=[0,0,0];
    for(let k=0;k<4;k++){
     const bone=vertices[i+11+k],q=transform(matrices.subarray(bone*16,bone*16+16),p);
     for(let axis=0;axis<3;axis++)posed[axis]+=q[axis]*vertices[i+15+k];
    }
    assert.ok(posed.every(Number.isFinite));
    const distance=Math.hypot(...posed.map((n,k)=>n-p[k]));
    if(matrices===neutral)assert.ok(distance<1e-6,'neutral bind must preserve the source');
    else if(distance>.001)moving++;
   }
   if(matrices!==neutral)assert.ok(moving>100);
  }
  for(let i=0;i<c.hair.anchorTriangles.length;i++){
   const triangle=c.hair.anchorTriangles[i],root=[0,0,0];
   for(let k=0;k<3;k++){
    const vertex=indices[triangle*3+k]*stride;
    assert.equal(vertices[vertex+11],2);assert.equal(vertices[vertex+15],1);
    for(let axis=0;axis<3;axis++)root[axis]+=vertices[vertex+axis]*c.hair.barycentrics[i*3+k];
   }
   for(let axis=0;axis<3;axis++)assert.ok(Math.abs(root[axis]-c.hair.roots[i*3+axis])<1e-6);
  }
 });
 test(`${bodyBaseId}: breast and butt volume controls stay local and preserve the rig`,()=>{
  const recipe={...defaultRecipe(),bodyBaseId},neutral=buildCharacter(recipe),stride=neutral.mesh.vertexStride;
  for(const control of ['breasts','butt'] as const){
   const smaller=buildCharacter({...recipe,shape:{...recipe.shape,[control]:-1}});
   const larger=buildCharacter({...recipe,shape:{...recipe.shape,[control]:1}});
   assert.deepEqual(larger.rig,neutral.rig);assert.deepEqual(smaller.rig,neutral.rig);
   let maxChange=0;
   for(let i=0;i<neutral.mesh.vertices.length;i+=stride){
    const a=smaller.mesh.vertices,b=larger.mesh.vertices,n=neutral.mesh.vertices;
    if(n[i+10]===3||n[i+10]===2){
     assert.deepEqual(a.subarray(i,i+3),n.subarray(i,i+3));
     assert.deepEqual(b.subarray(i,i+3),n.subarray(i,i+3));
    }
    const delta=b[i+2]-a[i+2];
    assert.ok(control==='breasts'?delta>=-1e-7:delta<=1e-7);
    maxChange=Math.max(maxChange,Math.abs(delta));
   }
   assert.ok(maxChange>.025,`${control} must visibly change local volume`);
  }
 });
}

test('legacy diagnostic recipes retain their original geometry',()=>{
 const c=buildCharacter({...defaultRecipe(),bodyBaseId:'adult-v1'});
 assert.equal(c.mesh.vertexStride,11);assert.equal(c.geometryHash,'97631e47');
});
