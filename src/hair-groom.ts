import {manifest,prng,type Recipe} from './character-core';
import {bobHeroV1} from './hair-groom-assets';
import type {Mesh,Vec3} from './deformation';

export type AuthoredHairClumps={
 assetId:string;
 version:number;
 count:number;
 segments:number;
 curves:Float32Array;
 widths:Float32Array;
 flow:Float32Array;
 strandClumpIds:Uint16Array;
};

export type HairGroomData={
 roots:Float32Array;
 rest:Float32Array;
 segments:number;
 anchorTriangles:Uint32Array;
 barycentrics:Float32Array;
 clumps:AuthoredHairClumps;
 cap:Mesh;
};

type Candidate={triangle:number;area:number;cumulative:number};

export function buildBobGroom(recipe:Recipe,mesh:Mesh,triangleIds:Uint32Array):HairGroomData {
 const {clumpCount,segments,maxHalfWidth,widthProfile}=bobHeroV1,points=segments+1,strandCount=manifest.quality.maxStrands;
 const candidates:Candidate[]=[];let totalArea=0;
 for(const triangle of triangleIds){
  const offset=triangle*3,ia=mesh.indices[offset],ib=mesh.indices[offset+1],ic=mesh.indices[offset+2],a=ia*mesh.vertexStride,b=ib*mesh.vertexStride,c=ic*mesh.vertexStride;
  const abx=mesh.vertices[b]-mesh.vertices[a],aby=mesh.vertices[b+1]-mesh.vertices[a+1],abz=mesh.vertices[b+2]-mesh.vertices[a+2];
  const acx=mesh.vertices[c]-mesh.vertices[a],acy=mesh.vertices[c+1]-mesh.vertices[a+1],acz=mesh.vertices[c+2]-mesh.vertices[a+2];
  const area=Math.hypot(aby*acz-abz*acy,abz*acx-abx*acz,abx*acy-aby*acx);
  if(area>0){totalArea+=area;candidates.push({triangle,area,cumulative:totalArea});}
 }
 if(!candidates.length)throw Error('The selected base has no scalp triangles for the authored bob groom.');

 const rand=prng(recipe.seed^0x7f4a7c15),curves=new Float32Array(clumpCount*points*3),widths=new Float32Array(clumpCount*points),flow=new Float32Array(clumpCount*3),strandClumpIds=new Uint16Array(strandCount),roots:number[]=[],rest:number[]=[],anchors:number[]=[],barycentrics:number[]=[];
 const sampleTriangle=(target:number)=>{
  let low=0,high=candidates.length-1;
  while(low<high){const mid=(low+high)>>1;if(candidates[mid].cumulative<target)low=mid+1;else high=mid;}
  return candidates[low].triangle;
 };
 const sampleWeights=()=>{const u=Math.sqrt(rand()),v=rand();return [1-u,u*(1-v),u*v];};
 const pointOnTriangle=(triangle:number,weights:number[]):Vec3=>{
  const offset=triangle*3,a=mesh.indices[offset]*mesh.vertexStride,b=mesh.indices[offset+1]*mesh.vertexStride,c=mesh.indices[offset+2]*mesh.vertexStride;
  return [0,1,2].map(axis=>mesh.vertices[a+axis]*weights[0]+mesh.vertices[b+axis]*weights[1]+mesh.vertices[c+axis]*weights[2]) as Vec3;
 };
 const capVertices:number[]=[],capIndices:number[]=[],capVertexBySource=new Map<number,number>(),hairColor=[1,3,5].map(i=>parseInt(recipe.hair.color.slice(i,i+2),16)/255);
 for(const candidate of candidates){
  const offset=candidate.triangle*3;
  for(let corner=0;corner<3;corner++){
   const source=mesh.indices[offset+corner];let target=capVertexBySource.get(source);
   if(target===undefined){
    target=capVertices.length/mesh.vertexStride;capVertexBySource.set(source,target);
    const vertex=mesh.vertices.subarray(source*mesh.vertexStride,(source+1)*mesh.vertexStride);
    capVertices.push(...vertex);
    const base=target*mesh.vertexStride;
    capVertices[base]+=vertex[3]*.0012;capVertices[base+1]+=vertex[4]*.0012;capVertices[base+2]+=vertex[5]*.0012;
    capVertices[base+6]=hairColor[0];capVertices[base+7]=hairColor[1];capVertices[base+8]=hairColor[2];capVertices[base+10]=6;
   }
   capIndices.push(target);
  }
 }

 for(let clump=0;clump<clumpCount;clump++){
  const triangle=sampleTriangle((clump+rand())/clumpCount*totalArea),centerWeights=sampleWeights(),root=pointOnTriangle(triangle,centerWeights),angle=Math.atan2(root[0],root[2]),front=Math.max(0,Math.cos(angle)),radial=Math.hypot(root[0],root[2])||1;
  const outwardX=root[0]/radial,outwardZ=root[2]/radial,sideSign=Math.abs(root[0])<.003?(clump%2===0?1:-1):Math.sign(root[0]);
  const sweepX=sideSign*(bobHeroV1.sideSweep+front*bobHeroV1.frontSweep),sweepZ=-front*bobHeroV1.frontSweep;
  flow.set([sweepX,-1,sweepZ],clump*3);
  const variation=.82+rand()*.36,length=recipe.hair.parameters.length*(.72-front*.37);
  const firstStrand=Math.ceil(clump*strandCount/clumpCount),endStrand=Math.ceil((clump+1)*strandCount/clumpCount),groupSize=endStrand-firstStrand;
  for(let point=0;point<=segments;point++){
   const t=point/segments,ease=t*t*(3-2*t),k=(clump*points+point)*3;
   const wave=Math.sin(t*Math.PI)*bobHeroV1.waveAmplitude*Math.sin(angle*9+clump*.73);
   curves[k]=root[0]+sweepX*length*ease+outwardX*bobHeroV1.rearLift*Math.sin(t*Math.PI)+wave;
   curves[k+1]=root[1]-length*(.08*t+.92*t*t);
   curves[k+2]=root[2]+sweepZ*length*ease+outwardZ*bobHeroV1.rearLift*Math.sin(t*Math.PI);
   widths[clump*points+point]=maxHalfWidth*widthProfile[point]*variation;
  }
  const sideX=-outwardZ,sideZ=outwardX;
  for(let strand=firstStrand;strand<endStrand;strand++){
   const fiber=strand-firstStrand,offset=(fiber+.5)/groupSize-.5,strandRoot=root;
   strandClumpIds[strand]=clump;
   roots.push(...strandRoot);anchors.push(triangle);barycentrics.push(...centerWeights);
   for(let point=0;point<=segments;point++){
    const t=point/segments,ease=t*t*(3-2*t),clumpIndex=(clump*points+point)*3,deltaX=strandRoot[0]-root[0],deltaY=strandRoot[1]-root[1],deltaZ=strandRoot[2]-root[2],width=widths[clump*points+point]*2*offset,k=strand*points*3+point*3;
    rest[k]=curves[clumpIndex]+sideX*width+deltaX*(1-ease);
    rest[k+1]=curves[clumpIndex+1]+deltaY*(1-ease);
    rest[k+2]=curves[clumpIndex+2]+sideZ*width+deltaZ*(1-ease);
   }
  }
 }
 return {
  roots:new Float32Array(roots),
  rest:new Float32Array(rest),
  segments,
  anchorTriangles:new Uint32Array(anchors),
  barycentrics:new Float32Array(barycentrics),
  clumps:{assetId:bobHeroV1.assetId,version:bobHeroV1.version,count:clumpCount,segments,curves,widths,flow,strandClumpIds},
  cap:{vertices:new Float32Array(capVertices),indices:new Uint32Array(capIndices),vertexStride:mesh.vertexStride}
 };
}
