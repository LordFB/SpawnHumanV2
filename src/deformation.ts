import {tongueMatrices} from './tongue';
import {resolveRecipe,manifest as defaultManifest,prng,hash,type Recipe} from './character-core';
import {buildBlenderCharacter} from './blender-character';
import {buildBobGroom,type AuthoredHairClumps} from './hair-groom';
export type Vec3=[number,number,number];
export type Bone={name:string;parent:number;position:Vec3;inverseBind:Float32Array};
export type Mesh={vertices:Float32Array;indices:Uint32Array;vertexStride:number}; // legacy: 11; smooth skinning: 19 floats
export type Character={recipe:Recipe;mesh:Mesh;rig:Bone[];attachments:Record<string,Vec3>;morphs?:{names:string[];vertexCount:number;deltas:Float32Array;jawAmounts?:Record<string,number>};hair:{roots:Float32Array;rest:Float32Array;segments:number;anchorTriangles:Uint32Array;barycentrics:Float32Array;clumps?:AuthoredHairClumps;cap?:Mesh};geometryHash:string;setPose:(pose:string,time:number,face?:string,jawOpen?:number,tongueTarget?:Vec3)=>Float32Array;dispose:()=>void;disposed:boolean};
export const boneNames=['pelvis','spine','head','upperArm.L','forearm.L','upperArm.R','forearm.R','thigh.L','shin.L','thigh.R','shin.R'];
export const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a:Float32Array,b:Float32Array){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function rotation(x:number,y:number,z:number){const a=identity(),b=identity(),c=identity();a[5]=a[10]=Math.cos(x);a[6]=Math.sin(x);a[9]=-a[6];b[0]=b[10]=Math.cos(y);b[8]=Math.sin(y);b[2]=-b[8];c[0]=c[5]=Math.cos(z);c[1]=Math.sin(z);c[4]=-c[1];return multiply(multiply(c,b),a);}
function translate(p:Vec3){const a=identity();a.set(p,12);return a;}
export function transform(m:Float32Array,p:Vec3):Vec3{return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
function rgb(h:string):Vec3 {return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255) as Vec3;}
export function buildCharacter(input:unknown,manifest=defaultManifest):Character {
 const recipe=resolveRecipe(input);if(manifest.version!==recipe.assetManifestVersion)throw Error('Asset manifest version mismatch.');
 if(recipe.bodyBaseId!=='adult-v1')return buildBlenderCharacter(recipe);
 const s=recipe.shape,f=recipe.face,scale=s.stature/1.72,leg=1+s.legs*.10,torso=1+s.torso*.08,hip=.155+s.hips*.025+s.build*.022,shoulder=.205+s.shoulders*.035+s.build*.015;
 const yHip=.86*leg*scale,yShoulder=yHip+.54*torso*scale,yHead=yShoulder+.215*scale,arm=.285*(1+s.arms*.1)*scale;
 const pos:Vec3[]=[[0,yHip,0],[0,yHip+.18*scale,0],[0,yHead,0],[-shoulder*scale,yShoulder,0],[-(shoulder+.045)*scale,yShoulder-arm,0],[shoulder*scale,yShoulder,0],[(shoulder+.045)*scale,yShoulder-arm,0],[-hip*.62*scale,yHip,0],[-hip*.62*scale,.45*leg*scale,0],[hip*.62*scale,yHip,0],[hip*.62*scale,.45*leg*scale,0]];
 const parents=[-1,0,1,1,3,1,5,0,7,0,9];const rig=pos.map((p,i)=>({name:boneNames[i],parent:parents[i],position:p,inverseBind:translate(p.map(n=>-n) as Vec3)}));
 const v:number[]=[],idx:number[]=[],skin=rgb(recipe.skin.tone),outfit=recipe.clothing[0].assetId,cloth=outfit==='studio'?[.13,.24,.28] as Vec3:[.34,.32,.48] as Vec3;
 const rand=prng(recipe.seed);const add=(p:Vec3,n:Vec3,col:Vec3,bone:number,region:number)=>{let noise=1+(rand()-.5)*recipe.skin.variation*.075;v.push(...p,...n,...col.map(c=>c*noise),bone,region);return v.length/11-1;};
 // Authored ring profiles provide one welded torso/neck/head surface. Limb joins are covered by fitted clothing.
 const rings=[ [yHip-.1*scale,hip*.78,.10,0], [yHip,hip,.115,0], [yHip+.12*scale,hip*.96,.12,1], [yHip+.25*torso*scale,.12+s.waist*.025+s.build*.026,.10+s.build*.018,1], [yShoulder-.12*scale,shoulder*.85,.13+s.build*.022,1], [yShoulder-.035*scale,shoulder*.92,.105,1], [yShoulder+.025*scale,.072,.066,2], [yHead-.105*scale,.052,.055,2], [yHead-.08*scale,.067+f.jaw*.013,.072,2], [yHead-.055*scale,.084+f.jaw*.012,.081,2], [yHead-.005*scale,.092+f.cheeks*.008,.084,2], [yHead+.04*scale,.09+f.head*.012,.087,2], [yHead+.09*scale,.077+f.head*.01,.077,2], [yHead+.13*scale,.045,.047,2], [yHead+.145*scale,.003,.003,2] ];
 const sides=48;for(let j=0;j<rings.length;j++){const [y,rx,rz,bone]=rings[j];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2;let x=Math.sin(a)*rx*scale,z=Math.cos(a)*rz*scale,yy=y;const front=Math.max(0,Math.cos(a));if(j===8)yy-=f.chin*.012*scale*front;if(j>=9&&j<=11)z+=Math.pow(front,18)*(.008+f.nose*.006)*scale;const covered=j<=5;add([x,yy,z],[Math.sin(a),0,Math.cos(a)],covered?cloth:skin,bone, j>=7?2:1);if(j){const p=j*sides+i,q=j*sides+(i+1)%sides;idx.push(p,q,p-sides,q,q-sides,p-sides);}}}
 function tube(start:Vec3,end:Vec3,r1:number,r2:number,col:Vec3,bone:number,region:number){const axis=end.map((n,i)=>n-start[i]) as Vec3,len=Math.hypot(...axis),d=axis.map(n=>n/len) as Vec3;const u:Vec3=[d[1],-d[0],0],ul=Math.hypot(...u);for(let i=0;i<3;i++)u[i]/=ul||1;const w:Vec3=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];const off=v.length/11;for(let j=0;j<=8;j++)for(let i=0;i<24;i++){const a=i/24*Math.PI*2,t=j/8,r=(r1*(1-t)+r2*t)*(1+.08*Math.sin(t*Math.PI));const n=u.map((n,k)=>n*Math.cos(a)+w[k]*Math.sin(a)) as Vec3;add(start.map((value,k)=>value+axis[k]*t+n[k]*r) as Vec3,n,col,bone,region);
 const base=v.length-11;for(let k=0;k<3;k++)v[base+k]=start[k]+axis[k]*t+n[k]*r;
 if(j){const p=off+j*24+i,q=off+j*24+(i+1)%24;idx.push(p,p-24,q,q,p-24,q-24);}}
 }
 
 function ellipsoid(center:Vec3,r:Vec3,col:Vec3,bone:number,region:number){const off=v.length/11;for(let j=0;j<=12;j++)for(let i=0;i<24;i++){const a=i/24*2*Math.PI,b=j/12*Math.PI;const n:Vec3=[Math.sin(b)*Math.sin(a),Math.cos(b),Math.sin(b)*Math.cos(a)];add(center.map((c,k)=>c+r[k]*n[k]) as Vec3,n,col,bone,region);if(j){const p=off+j*24+i,q=off+j*24+(i+1)%24;idx.push(p,q,p-24,q,q-24,p-24);}}}
 for(const sign of [-1,1]){const ua=sign<0?3:5,fa=ua+1,th=sign<0?7:9,sh=th+1;const elbow=pos[fa],wrist:Vec3=[elbow[0]+sign*.025*scale,elbow[1]-arm*.88,0];ellipsoid([pos[ua][0],pos[ua][1]-.016*scale,0],[.054*scale,.06*scale,.054*scale],cloth,ua,3);tube(pos[ua],elbow,(.052+s.build*.01)*scale,.038*scale,cloth,ua,3);tube(elbow,wrist,.039*scale,.025*scale,skin,fa,3);ellipsoid([wrist[0],wrist[1]-.047*scale,.004],[.032*scale,.065*scale,.023*scale],skin,fa,3);tube(pos[th],pos[sh],(.085+s.build*.012)*scale,.055*scale,cloth,th,4);tube(pos[sh],[pos[sh][0],.095*scale,0],.056*scale,.034*scale,cloth,sh,4);ellipsoid([pos[sh][0],.065*scale,.035*scale],[.047*scale,.048*scale,.105*scale],[.075,.085,.095],sh,4);
 const eyeX=sign*(.034+f.eyes*.008)*scale;ellipsoid([eyeX,yHead+.026*scale,.078*scale],[.018*scale,.011*scale,.011*scale],[.85,.86,.82],2,2);ellipsoid([eyeX,yHead+.026*scale,.088*scale],[.007*scale,.008*scale,.003*scale],rgb(recipe.eyes.color),2,2);ellipsoid([eyeX,yHead+.026*scale,.091*scale],[.003*scale,.005*scale,.002*scale],[.025,.025,.025],2,2);tube([eyeX-sign*.019*scale,yHead+(.046+f.brows*.008)*scale,.081*scale],[eyeX+sign*.019*scale,yHead+(.05+f.brows*.008)*scale,.078*scale],.0035*scale,.003*scale,rgb(recipe.hair.color),2,2);ellipsoid([sign*(.092+f.head*.005)*scale,yHead,.0],[.014*scale,.027*scale,.017*scale],skin,2,2);}
 ellipsoid([0,yHead-.006*scale,(.086+f.nose*.012)*scale],[.011*scale,.019*scale,.014*scale],skin,2,2);ellipsoid([0,yHead-.046*scale,.098*scale],[(.028+f.mouth*.007)*scale,.004*scale,.007*scale],skin.map((x,i)=>x*(i===0?.85:.58)) as Vec3,2,2);
 const mesh={vertices:new Float32Array(v),indices:new Uint32Array(idx),vertexStride:11};
 const segments=defaultManifest.quality.segments;
 let hair:Character['hair']={roots:new Float32Array(),rest:new Float32Array(),segments,anchorTriangles:new Uint32Array(),barycentrics:new Float32Array()};
 if(recipe.hair.groomId==='bob'){
  const scalpTriangles:number[]=[];
  for(let ring=8;ring<rings.length;ring++)for(let sector=0;sector<sides;sector++){const front=Math.cos((sector+.5)/sides*Math.PI*2),hairline=front>.75?12:front>.15?11:8;if(ring<hairline)continue;const first=(ring-1)*sides*2+sector*2;scalpTriangles.push(first,first+1);}
  hair=buildBobGroom(recipe,mesh,new Uint32Array(scalpTriangles));
 }else if(recipe.hair.groomId!=='bald'){
  const roots:number[]=[],rest:number[]=[],anchors:number[]=[],bary:number[]=[],hr=prng(recipe.seed^0xa341316c),hp=recipe.hair.parameters;
  for(let i=0;i<defaultManifest.quality.maxStrands;i++){
   const angle=hr()*Math.PI*2,rootFront=Math.max(0,Math.cos(angle)),guideRing=Math.min(14,Math.floor((rootFront>.4?12:11)+hr()*(rootFront>.4?3:4)));
   const sector=Math.floor(angle/Math.PI/2*sides)%sides,triangle=(guideRing-1)*sides*2+sector*2+(hr()>.5?1:0),u=Math.sqrt(hr()),w=hr(),weights=[1-u,u*(1-w),u*w];
   const root:Vec3=[0,0,0];for(let k=0;k<3;k++)for(let axis=0;axis<3;axis++)root[axis]+=mesh.vertices[mesh.indices[triangle*3+k]*mesh.vertexStride+axis]*weights[k];
   roots.push(...root);anchors.push(triangle);bary.push(...weights);
   const a=Math.atan2(root[0],root[2]),front=Math.max(0,Math.cos(a)),b=Math.acos(Math.min(1,Math.max(-1,(root[1]-yHead-.023*scale)/(.12*scale))));
   const len=hp.length*(recipe.hair.groomId==='crop'?.48:1),phase=Math.floor(a*12)/12*6;
   for(let j=0;j<=segments;j++){const t=j/segments,sweep=front*t*t,curl=hp.curl*(recipe.hair.groomId==='curls'?1.5:1),spread=t*.025*(1-hp.clumping*.7),part=Math.sign(Math.sin(a)||1)*front*.03*t;rest.push(root[0]+Math.sin(a)*spread+Math.sin(t*12+phase)*curl*.018*t+part+Math.sign(Math.sin(a))*.075*sweep,root[1]+Math.cos(b)*len*t*(1-t)*.2-len*t*t*.8,root[2]+Math.cos(a)*spread+Math.cos(t*12+phase)*curl*.018*t-front*.045*t-.055*sweep);}
  }
  hair={roots:new Float32Array(roots),rest:new Float32Array(rest),segments,anchorTriangles:new Uint32Array(anchors),barycentrics:new Float32Array(bary)};
 }
 const character:Character={recipe,mesh,rig,attachments:{scalp:[0,yHead+.12*scale,0],eyes:[0,yHead+.026*scale,.08*scale],mouth:[0,yHead-.046*scale,.08*scale]},hair,geometryHash:hash(mesh.vertices),setPose:(pose,time,face='neutral')=>poseMatrices(rig,pose,time,face),disposed:false,dispose(){this.disposed=true;}};return character;
}
export function poseMatrices(rig:Bone[],pose:string,time:number,face:string,jawOpen?:number,tongueTarget?:Vec3){const world:Float32Array[]=[],out=new Float32Array(16*Math.max(12,rig.length+1));const walk=Math.sin(time*Math.PI*2),crouch=pose==='crouch'?.65:0;for(let i=0;i<rig.length;i++){const p=rig[i].position,par=rig[i].parent;let x=0,y=0,z=0;if(rig[i].name==='jaw')x=.36*Math.max(0,Math.min(1,jawOpen??(face==='jaw-open'?1:face==='surprise'?.6:0)));if(pose==='walk'){if(i===7)x=walk*.55;if(i===9)x=-walk*.55;if(i===8)x=Math.max(0,-walk)*.65;if(i===10)x=Math.max(0,walk)*.65;if(i===3)x=-walk*.35;if(i===5)x=walk*.35;}if(pose==='turn'&&i===0)y=Math.sin(time)*.65;if(pose==='idle'&&i===2)y=Math.sin(time*.8)*.06;if(crouch){if(i===7||i===9)x=-.7;if(i===8||i===10)x=1.2;if(i===1)x=.18;}const local=p.map((n,k)=>n-(par>=0?rig[par].position[k]:0)) as Vec3;if(i===0)local[1]-=crouch*.24;world[i]=multiply(par>=0?world[par]:identity(),multiply(translate(local),rotation(x,y,z)));out.set(multiply(world[i],rig[i].inverseBind),i*16);}if(rig.length>12)tongueMatrices(rig,out,tongueTarget??[0,0,0]);out.set(identity(),rig.length*16);out[rig.length*16]=['neutral','smile','frown','surprise','blink','jaw-open'].indexOf(face);return out;}
export function setPose(character:Character,pose:string,time:number,face='neutral',jawOpen?:number,tongueTarget?:Vec3){if(character.disposed)throw Error('Character disposed.');return character.setPose(pose,time,face,jawOpen,tongueTarget);}
export function dispose(character:Character){character.dispose();}


