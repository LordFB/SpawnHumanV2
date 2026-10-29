import {mkdir,writeFile} from 'node:fs/promises';
import {buildCharacter} from '../src/deformation.ts';
import {defaultRecipe,manifest,presets,canonical,type Recipe} from '../src/character-core.ts';

async function exportBody(id:string,recipe:Recipe){
 const c=buildCharacter(recipe),stride=c.mesh.vertexStride,count=c.mesh.vertices.length/stride;
 const positions=new Float32Array(count*3),normals=new Float32Array(count*3),colors=new Float32Array(count*3),joints=new Uint16Array(count*4),weights=new Float32Array(count*4);
 for(let i=0;i<count;i++){
  positions.set(c.mesh.vertices.subarray(i*stride,i*stride+3),i*3);
  normals.set(c.mesh.vertices.subarray(i*stride+3,i*stride+6),i*3);
  colors.set(c.mesh.vertices.subarray(i*stride+6,i*stride+9),i*3);
  for(let k=0;k<4;k++){joints[i*4+k]=stride>=19?c.mesh.vertices[i*stride+11+k]:k===0?c.mesh.vertices[i*stride+9]:0;weights[i*4+k]=stride>=19?c.mesh.vertices[i*stride+15+k]:k===0?1:0;}
 }
 const binds=new Float32Array(c.rig.length*16);c.rig.forEach((b,i)=>binds.set(b.inverseBind,i*16));
 const chunks=[positions,normals,colors,joints,weights,c.mesh.indices,binds];
 const targets:{POSITION:number;NORMAL:number}[]=[],morphAccessors:object[]=[];
 if(c.morphs){
  const m=c.morphs,ids=new Uint32Array(m.vertexCount);
  for(let i=0;i<count;i++){const row=c.mesh.vertices[i*stride+19];if(row>=0)ids[row]=i;}
  const idsView=chunks.length;chunks.push(ids);
  for(let target=0;target<m.names.length;target++){
   const pair:number[]=[];
   for(const channel of [0,4]){
    const values=new Float32Array(m.vertexCount*3),low=[0,0,0],high=[0,0,0];
    for(let row=0;row<m.vertexCount;row++)for(let k=0;k<3;k++){const value=m.deltas[(target*m.vertexCount+row)*8+channel+k];values[row*3+k]=value;low[k]=Math.min(low[k],value);high[k]=Math.max(high[k],value);}
    const view=chunks.length;chunks.push(values);pair.push(7+morphAccessors.length);
    morphAccessors.push({componentType:5126,count,type:'VEC3',...(channel===0?{min:low,max:high}:{}),sparse:{count:m.vertexCount,indices:{bufferView:idsView,componentType:5125},values:{bufferView:view}}});
   }
   targets.push({POSITION:pair[0],NORMAL:pair[1]});
  }
 }
 let offset=0;const bufferViews=chunks.map(a=>{const view={buffer:0,byteOffset:offset,byteLength:a.byteLength};offset+=a.byteLength;return view;});
 const bin=Buffer.concat(chunks.map(a=>Buffer.from(a.buffer))),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<count;i++)for(let k=0;k<3;k++){min[k]=Math.min(min[k],positions[i*3+k]);max[k]=Math.max(max[k],positions[i*3+k]);}
 const nodes=[{mesh:0,skin:0,name:id},...c.rig.map((b,i)=>({name:b.name,translation:b.position.map((p,k)=>p-(b.parent<0?0:c.rig[b.parent].position[k])),children:c.rig.flatMap((other,j)=>other.parent===i?[j+1]:[])}))];
 const gltf={asset:{version:'2.0',generator:'Private Human Lab',copyright:'CC0-1.0; Blender Studio/community human bases and original procedural grooms'},scene:0,scenes:[{nodes:[0,1]}],nodes,
  skins:[{inverseBindMatrices:6,skeleton:1,joints:c.rig.map((_,i)=>i+1)}],
  meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,COLOR_0:2,JOINTS_0:3,WEIGHTS_0:4},indices:5,mode:4,...(targets.length?{targets}:{})}],...(c.morphs?{weights:c.morphs.names.map(()=>0),extras:{targetNames:c.morphs.names}}:{})}],buffers:[{byteLength:bin.length}],bufferViews,
  accessors:[...chunks.slice(0,7).map((a,i)=>({bufferView:i,componentType:i===3?5123:i===5?5125:5126,count:i===5?a.length:i===6?c.rig.length:count,type:i===3||i===4?'VEC4':i===5?'SCALAR':i===6?'MAT4':'VEC3',...(i===0?{min,max}:{})})),...morphAccessors],
  extras:{geometryHash:c.geometryHash,facialRigVersion:c.rig.length>11?'jaw-tongue-v1':undefined,jawAmounts:c.morphs?.jawAmounts,tongueTargetSpace:'offset from neutral tip in jaw-local meters; bounded FABRIK in src/tongue.ts',note:'Neutral skinned runtime body with jaw and tongue bones plus lip/expression morphs. Drive jaw using jawAmounts metadata; jawOpen morph is deliberately zero to avoid double deformation. Runtime IK is not a glTF animation clip.'}};
 const json=Buffer.from(JSON.stringify(gltf)),jsonChunk=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonChunk.length+8+bin.length,8);jh.writeUInt32LE(jsonChunk.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 const path=id==='adult-v1'?'adult-diagnostic-v1.glb':`${id}.glb`;
 await writeFile(`public/assets/${path}`,Buffer.concat([header,jh,jsonChunk,bh,bin]));
 console.log(`Exported ${id}: ${count} vertices, ${c.mesh.indices.length/3} triangles, ${c.geometryHash}.`);
 return {id,path,status:id==='adult-v1'?'diagnostic':'integrated-base',vertices:count,triangles:c.mesh.indices.length/3,geometryHash:c.geometryHash,morphTargets:c.morphs?.names??[]};
}
await mkdir('public/assets',{recursive:true});await mkdir('fixtures',{recursive:true});
const assets=[];for(const id of manifest.bodyIds)assets.push(await exportBody(id,{...defaultRecipe(),bodyBaseId:id}));
await writeFile('public/assets/manifest.json',JSON.stringify({...manifest,assets},null,2));
await writeFile('public/assets/grooms-v1.json',JSON.stringify({version:'1.0.0',grooms:manifest.grooms,algorithm:'src/deformation.ts; src/blender-character.ts',anchorStatus:'independent mesh triangle IDs and barycentric coordinates; guides drive local follower groups',segments:manifest.quality.segments,renderSegments:manifest.quality.renderSegments,guideStride:manifest.quality.guideStride}));
for(const preset of presets)await writeFile(`fixtures/${preset.name.toLowerCase()}.json`,canonical(preset.recipe)+'\n');
