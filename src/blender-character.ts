import {appendTongue} from './tongue';
import bodies from './assets/blender-bodies.json';
import speechData from './assets/speech-morphs.json';
import {hash,prng,manifest,type Recipe} from './character-core';
import {boneNames,identity,poseMatrices,type Character,type Vec3} from './deformation';
import {buildBobGroom} from './hair-groom';

// The checked-in extraction is bundled locally. Character construction stays synchronous
// and DOM-free, and never needs Blender or a network request at runtime.
function bytes(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
type BodyAsset={mouthY?:number;vertexCount:number;rig:number[][];eyes:number[][];positions:string;normals:string;joints:string;weights:string;kinds:string;indices:string;eyelidMeta?:Record<string,(number|boolean)[]>};
function decode(base:BodyAsset){
 const positions=new Int32Array(bytes(base.positions).buffer),normals=new Int16Array(bytes(base.normals).buffer);
 return {base,positions,normals,joints:bytes(base.joints),weights:bytes(base.weights),kinds:bytes(base.kinds),indices:new Uint32Array(bytes(base.indices).buffer)};
}
const assets={male:decode(bodies.male),female:decode(bodies.female)};
function decodeSpeech(data:{vertexIds:string;morphs:Record<string,string>;jawAmounts?:Record<string,number>}){return {vertexIds:new Uint32Array(bytes(data.vertexIds).buffer),morphs:Object.fromEntries(Object.entries(data.morphs).map(([name,value])=>[name,new Int16Array(bytes(value).buffer)])),jawAmounts:data.jawAmounts};}
const speechAssets={male:decodeSpeech(speechData.male),female:decodeSpeech(speechData.female)};
const morphCache=new Map<string,Float32Array>();
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const gaussian=(value:number,center:number,width:number)=>Math.exp(-(((value-center)/width)**2));
const smooth=(low:number,high:number,value:number)=>{const t=Math.max(0,Math.min(1,(value-low)/(high-low)));return t*t*(3-2*t);};

export function buildBlenderCharacter(recipe:Recipe):Character {
 const asset=assets[recipe.bodyBaseId==='adult-female-v1'?'female':'male'],{base}=asset,s=recipe.shape,f=recipe.face;
 const scale=s.stature/1.72,leg=1+s.legs*.10,torso=1+s.torso*.08;
 const eyeY=(base.eyes[0][1]+base.eyes[1][1])/2,headY=eyeY-.026;
 function warp(p:Vec3,armWeight=0,facial=true):Vec3 {
  let [x,y,z]=p;const height=y,front=Math.max(0,Math.min(1,(z+.01)/.08));
  const headBlend=smooth(headY-.16,headY-.06,height);
  const torsoMask=Math.max(0,1-armWeight*4);
  const width=1+s.build*.065+s.hips*.12*gaussian(height,.88,.17)*torsoMask+s.waist*.15*gaussian(height,1.08,.12)*torsoMask+s.shoulders*.12*gaussian(height,1.39,.16);
  let bodyX=x*width,bodyZ=z*(1+s.build*.09+s.waist*.10*gaussian(height,1.08,.13)*torsoMask);
  // Local volume controls in neutral anatomical space; arm weights suppress any
  // overlap with the hanging limbs, and front/back masks keep the opposite side fixed.
  const breastMask=gaussian(Math.abs(x),.075,.060)*gaussian(height,1.285,.070)*smooth(.025,.085,z)*torsoMask*smooth(1.10,1.18,height)*(1-smooth(1.38,1.44,height));
  const buttMask=gaussian(Math.abs(x),.080,.080)*gaussian(height,.90,.105)*(1-smooth(-.070,-.015,z))*torsoMask*smooth(.65,.72,height)*(1-smooth(1.08,1.16,height));
  bodyZ+=s.breasts*.038*breastMask-s.butt*.040*buttMask;
  bodyX+=Math.sign(x)*(s.breasts*.006*breastMask+s.butt*.008*buttMask);
  if(headBlend>0&&facial){
   const h=height-headY;
   x*=1+f.head*.10+f.jaw*.10*gaussian(h,-.065,.035)+f.cheeks*.06*gaussian(h,-.015,.025);
   x+=Math.sign(x)*f.eyes*.006*gaussian(h,.026,.020)*gaussian(Math.abs(x),.034,.023)*front;
   z+=f.nose*.008*gaussian(x,0,.019)*gaussian(h,0,.030)*front;
   x*=1+f.mouth*.12*gaussian(h,-.047,.013)*front;
   const mouthH=h+.047,mouthMask=gaussian(x,0,.032)*front*headBlend;
   const upper=gaussian(mouthH,.004,.0055)*mouthMask,lower=gaussian(mouthH,-.005,.0065)*mouthMask;
   z+=f.upperLip*.004*upper+f.lowerLip*.005*lower;
   y+=(f.upperLip*.002*upper-f.lowerLip*.0025*lower);
   y+=f.mouthHeight*.009*gaussian(mouthH,0,.023)*mouthMask;
   y+=f.mouthCorners*.006*gaussian(Math.abs(x),.024,.010)*gaussian(mouthH,0,.012)*front*headBlend;
   y+=f.brows*.006*gaussian(h,.047,.012)*front*headBlend;
   y-=f.chin*.010*gaussian(h,-.080,.021)*front*headBlend;
  }
  // Blend two displacements, rather than switching formulas at one neck row.
  x=bodyX*(1-headBlend)+x*headBlend;z=bodyZ*(1-headBlend)+z*headBlend;
  if(armWeight>0){x+=Math.sign(x)*s.shoulders*.022*armWeight;y+=(height-1.40)*s.arms*.10*armWeight;x+=(x-Math.sign(x)*.185)*s.arms*.10*armWeight;}
  y=y<.88?y*leg:.88*leg+(Math.min(y,1.40)-.88)*torso+Math.max(0,y-1.40);
  return [x*scale,y*scale,z*scale];
 }
 const rig=base.rig.map((p,i)=>{
  const position=warp(p as Vec3,i>=3&&i<=6?1:0,false),inverseBind=identity();
  inverseBind.set(position.map(x=>-x),12);
  return {name:i===11?'jaw':boneNames[i],parent:[-1,0,1,1,3,1,5,0,7,0,9,2][i],position,inverseBind};
 });
 const stride=20,vertices=new Float32Array(base.vertexCount*stride),indices=asset.indices.slice();
 const skin=rgb(recipe.skin.tone),iris=rgb(recipe.eyes.color),cloth=recipe.clothing[0].assetId==='studio'?[.13,.24,.28]:[.34,.32,.48];
 for(let i=0;i<base.vertexCount;i++){
  const original:Vec3=[asset.positions[i*3]/1e5,asset.positions[i*3+1]/1e5,asset.positions[i*3+2]/1e5];
  let armWeight=0,dominant=0,largest=-1;
  for(let k=0;k<4;k++){const bone=asset.joints[i*4+k],w=asset.weights[i*4+k]/255;if(bone>=3&&bone<=6)armWeight+=w;if(w>largest){largest=w;dominant=bone;}}
  const p=warp(original,armWeight),kind=asset.kinds[i];
  const region=kind>0||original[1]>headY-.12?2:armWeight>.5?3:original[1]<.88?4:1;
  // Preserve existing outfit controls as a fitted surface treatment, not garment art.
  const sleeve=smooth(1.205,1.235,original[1]);
  const covered=kind===0?(1-smooth(1.415,1.445,original[1]))*smooth(.09,.11,original[1])*(1-armWeight*(1-sleeve)):0;
  let color=kind===1?[.80,.81,.77]:kind===2?iris:kind===3?[.008,.009,.012]:kind===4||kind===10?[.018,.006,.008]:kind===5||kind===6?[.73,.70,.62]:kind===7||kind===8?[.10,.018,.022]:skin.map((c,k)=>c*(1-covered)+cloth[k]*covered);
  if(kind===9){const edge=Number(base.eyelidMeta?.[String(i)]?.[3]??0);color=color.map(c=>c*(1-.14*smooth(.85,1,edge)));}
  if(kind===0&&covered<1){
   const lip=gaussian(original[1],headY-.047,.008)*gaussian(original[0],0,.026)*Math.max(0,original[2]/.10);
   color=color.map((c,k)=>c*(1-Math.min(1,lip)*[.10,.32,.25][k]));
  }
  const variation=1+recipe.skin.variation*.018*Math.sin(original[0]*137+Math.sin(original[1]*83))*Math.sin(original[2]*121+original[1]*61);
  const offset=i*stride;vertices.set(p,offset);vertices.set(color.map(c=>c*variation),offset+6);vertices[offset+9]=dominant;vertices[offset+10]=region;
  for(let k=0;k<4;k++){vertices[offset+11+k]=asset.joints[i*4+k];vertices[offset+15+k]=asset.weights[i*4+k]/255;}
  vertices[offset+19]=-1;
 }
 // Recompute after all shape warps; normals remain continuous across shared topology.
 for(let t=0;t<indices.length;t+=3){
  const a=indices[t]*stride,b=indices[t+1]*stride,c=indices[t+2]*stride;
  const ux=vertices[b]-vertices[a],uy=vertices[b+1]-vertices[a+1],uz=vertices[b+2]-vertices[a+2];
  const vx=vertices[c]-vertices[a],vy=vertices[c+1]-vertices[a+1],vz=vertices[c+2]-vertices[a+2];
  const n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
  for(const offset of [a,b,c])for(let k=0;k<3;k++)vertices[offset+3+k]+=n[k];
 }
 for(let i=0;i<base.vertexCount;i++){
  const offset=i*stride+3,len=Math.hypot(vertices[offset],vertices[offset+1],vertices[offset+2]);
  for(let k=0;k<3;k++)vertices[offset+k]=len>1e-12?vertices[offset+k]/len:asset.normals[i*3+k]/32767;
 }
 const speech=speechAssets[recipe.bodyBaseId==='adult-female-v1'?'female':'male'],names=Object.keys(speech.morphs),rowCount=speech.vertexIds.length;
 const morphKey=JSON.stringify([recipe.bodyBaseId,s,f]);
 let deltas=morphCache.get(morphKey);
 const cached=!!deltas;
 deltas??=new Float32Array(names.length*rowCount*8);
 for(let row=0;row<rowCount;row++){
  const id=speech.vertexIds[row],p:Vec3=[asset.positions[id*3]/1e5,asset.positions[id*3+1]/1e5,asset.positions[id*3+2]/1e5];
  vertices[id*stride+19]=row;
  if(cached)continue;
  for(let target=0;target<names.length;target++){
   const values=speech.morphs[names[target]],offset=(target*rowCount+row)*8;
   if(values[row*6]||values[row*6+1]||values[row*6+2]){
    const posed=warp(p.map((n,k)=>n+values[row*6+k]/1e5) as Vec3);
    for(let k=0;k<3;k++)deltas[offset+k]=posed[k]-vertices[id*stride+k];
   }
   for(let k=0;k<3;k++)deltas[offset+4+k]=values[row*6+3+k]/16383;
  }
 }
 if(!cached){morphCache.set(morphKey,deltas);if(morphCache.size>4)morphCache.delete(morphCache.keys().next().value!);}
 const eyes=warp([0,eyeY,(base.eyes[0][2]+base.eyes[1][2])/2]),headCenter=warp([0,headY,0]);
 const attachments:Record<string,Vec3>={scalp:warp([0,1.70,0]),eyes,mouth:warp([0,headY-.047,.10]),head:headCenter};
 const roots:number[]=[],rest:number[]=[],anchors:number[]=[],bary:number[]=[],segments=manifest.quality.segments,hp=recipe.hair.parameters,rand=prng(recipe.seed^0xa341316c);
 // Sample actual scalp triangles by surface area. Groups of ten share a local guide.
 const candidates:number[]=[],areas:number[]=[];let area=0;
 for(let t=0;t<indices.length;t+=3){
  const ids=[indices[t],indices[t+1],indices[t+2]],p=ids.map(i=>[asset.positions[i*3]/1e5,asset.positions[i*3+1]/1e5,asset.positions[i*3+2]/1e5]);
  if(ids.some(i=>asset.kinds[i]!==0)||p.some(v=>v[1]<eyeY+.025+(v[2]>.025?.020:0)))continue;
  const u=p[1].map((n,k)=>n-p[0][k]),v=p[2].map((n,k)=>n-p[0][k]);
  const a=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
  if(a>0){area+=a;candidates.push(t/3);areas.push(area);}
 }
 if(recipe.hair.groomId!=='bald'&&!candidates.length)throw Error('The selected base has no scalp triangles.');
 if(recipe.hair.groomId!=='bald'&&recipe.hair.groomId!=='bob')for(let strand=0;strand<manifest.quality.maxStrands;strand++){
  const pick=rand()*area;let lo=0,hi=areas.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(areas[mid]<pick)lo=mid+1;else hi=mid;}const guide=candidates[lo];
  const u=Math.sqrt(rand()),w=rand(),weights=[1-u,u*(1-w),u*w],root:Vec3=[0,0,0];
  for(let k=0;k<3;k++)for(let axis=0;axis<3;axis++)root[axis]+=vertices[indices[guide*3+k]*stride+axis]*weights[k];
  roots.push(...root);anchors.push(guide);bary.push(...weights);
  const angle=Math.atan2(root[0],root[2]),front=Math.max(0,Math.cos(angle)),length=hp.length*(recipe.hair.groomId==='crop'?.48:1),up=Math.max(0,(root[1]-headCenter[1])/(.12*scale));
  for(let j=0;j<=segments;j++){
   const t=j/segments,sweep=front*t*t,curl=hp.curl*(recipe.hair.groomId==='curls'?1.5:1),phase=angle*6,spread=t*.025*(1-hp.clumping*.7);
   const part=Math.sign(Math.sin(angle)||1)*front*.03*t;
   rest.push(root[0]+Math.sin(angle)*spread+Math.sin(t*12+phase)*curl*.018*t+part+Math.sign(Math.sin(angle))*.075*sweep,root[1]+up*length*t*(1-t)*.2-length*t*t*.8,root[2]+Math.cos(angle)*spread+Math.cos(t*12+phase)*curl*.018*t-front*.045*t-.055*sweep);
  }
 }
 const mesh={vertices,indices,vertexStride:stride};
 const mouthY=base.mouthY??headY-.047;appendTongue(mesh,rig,warp([0,mouthY-.017,.086],0,false),warp([0,mouthY-.017,(asset.positions[8004*3+2]+asset.positions[7986*3+2])/2e5-.009],0,false)[2],scale);
 const hair=recipe.hair.groomId==='bob'?buildBobGroom(recipe,mesh,new Uint32Array(candidates)):{roots:new Float32Array(roots),rest:new Float32Array(rest),segments,anchorTriangles:new Uint32Array(anchors),barycentrics:new Float32Array(bary)};
 return {recipe,mesh,rig,attachments,morphs:{names,vertexCount:rowCount,deltas,jawAmounts:speech.jawAmounts},hair,geometryHash:hash(mesh.vertices),setPose:(pose,time,face='neutral',jawOpen,tongueTarget)=>poseMatrices(rig,pose,time,face,jawOpen,tongueTarget),disposed:false,dispose(){this.disposed=true;}};
}


