import {identity,multiply,type Vec3,type Bone,type Mesh} from './deformation';
const add=(a:Vec3,b:Vec3):Vec3=>a.map((v,i)=>v+b[i]) as Vec3;
const sub=(a:Vec3,b:Vec3):Vec3=>a.map((v,i)=>v-b[i]) as Vec3;
const mul=(a:Vec3,s:number):Vec3=>a.map(v=>v*s) as Vec3;
const length=(a:Vec3)=>Math.hypot(...a);
const unit=(a:Vec3):Vec3=>mul(a,1/(length(a)||1));
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function solveTongue(rest:Vec3[],offset:Vec3):Vec3[]{
 if(offset.every(v=>v===0))return rest.map(p=>[...p] as Vec3);
 const bounded=offset.map(v=>Math.max(-.035,Math.min(.035,Number.isFinite(v)?v:0))) as Vec3;
 let target=add(rest[3],bounded);const root=rest[0],distance=length(sub(target,root));
 const lengths=rest.slice(1).map((p,i)=>length(sub(p,rest[i]))),total=lengths.reduce((a,b)=>a+b,0);
 const stretch=Math.min(1.35,Math.max(1,distance/total));
 if(distance>total*stretch)target=add(root,mul(unit(sub(target,root)),total*stretch));
 const p=rest.map(p=>[...p] as Vec3),sizes=lengths.map(n=>n*stretch);
 for(let iteration=0;iteration<40;iteration++){
  p[3]=[...target];for(let i=2;i>=0;i--)p[i]=add(p[i+1],mul(unit(sub(p[i],p[i+1])),sizes[i]));
  p[0]=[...root];for(let i=1;i<4;i++)p[i]=add(p[i-1],mul(unit(sub(p[i],p[i-1])),sizes[i-1]));
  if(length(sub(p[3],target))<.00001)break;
 }
 return p;
}
export function tongueMatrices(rig:Bone[],out:Float32Array,offset:Vec3){
 if(rig[12]?.name!=='tongue.root')return;
 const rest=[rig[12].position,rig[13].position,rig[14].position,add(rig[14].position,sub(rig[14].position,rig[13].position))];
 // The final segment descends from the dorsal arch to the rounded tip.
 rest[3][1]=rest[0][1];const pose=solveTongue(rest,offset),jaw=out.slice(11*16,12*16);
 for(let i=0;i<3;i++){
  const a=unit(sub(rest[i+1],rest[i])),b=unit(sub(pose[i+1],pose[i])),axis=cross(a,b),dot=a.reduce((s,v,k)=>s+v*b[k],0);
  const qlen=Math.hypot(...axis,1+dot)||1,[x,y,z]=axis.map(v=>v/qlen),w=(1+dot)/qlen;
  const m=identity();m[0]=1-2*(y*y+z*z);m[1]=2*(x*y+z*w);m[2]=2*(x*z-y*w);m[4]=2*(x*y-z*w);m[5]=1-2*(x*x+z*z);m[6]=2*(y*z+x*w);m[8]=2*(x*z+y*w);m[9]=2*(y*z-x*w);m[10]=1-2*(x*x+y*y);
  const stretch=length(sub(pose[i+1],pose[i]))/length(sub(rest[i+1],rest[i]));
  const scale=identity();for(let r=0;r<3;r++)for(let c=0;c<3;c++)scale[c*4+r]+=(stretch-1)*a[r]*a[c];
  const local=multiply(m,scale);for(let k=0;k<3;k++)local[12+k]=pose[i][k]-local[k]*rest[i][0]-local[4+k]*rest[i][1]-local[8+k]*rest[i][2];
  out.set(multiply(jaw,local),(12+i)*16);
 }
}
export function appendTongue(mesh:Mesh,rig:Bone[],root:Vec3,tipZ:number,scale:number){
 const s=mesh.vertexStride,start=mesh.vertices.length/s,verts:number[]=[],indices:number[]=[],rings=32,sides=32;
 const center=(t:number):Vec3=>[root[0],root[1]+Math.sin(Math.PI*t)*.004*scale,root[2]+(tipZ-root[2])*t];
 for(let i=0;i<3;i++){const p=center(i/3),bind=identity();bind.set(p.map(v=>-v),12);rig.push({name:['tongue.root','tongue.middle','tongue.tip'][i],parent:i===0?11:11+i,position:p,inverseBind:bind});}
 const vertex=(p:Vec3,t:number,dorsal:number)=>{
  const v=new Array(s).fill(0),u=Math.max(0,Math.min(2,t*3-.5)),a=Math.floor(u),b=Math.min(2,a+1),blend=u-a;
  v.splice(0,3,...p);v.splice(6,3,.45+dorsal*.035,.17+dorsal*.018,.19+dorsal*.018);v[9]=12+a;v[10]=2;v[11]=12+a;v[12]=12+b;v[15]=1-blend;v[16]=blend;v[19]=-1;verts.push(...v);
 };
 for(let r=0;r<rings;r++){
  const t=r/rings,c=center(t),width=.018*scale*Math.pow(Math.sin(Math.PI*(.18+.82*t)),.55),thickness=(.0045-.0015*t)*scale;
  for(let j=0;j<sides;j++){const angle=j/sides*Math.PI*2,x=Math.cos(angle)*width,top=Math.max(0,Math.sin(angle)),groove=.00065*scale*Math.exp(-((x/(.003*scale))**2))*top*Math.sin(Math.PI*t);vertex([c[0]+x,c[1]+Math.sin(angle)*thickness-groove,c[2]],t,top);}
 }
 const firstCap=verts.length/s;vertex(center(0),0,0);const lastCap=verts.length/s;vertex(center(1),1,0);
 for(let r=0;r<rings-1;r++)for(let j=0;j<sides;j++){const a=r*sides+j,b=r*sides+(j+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,c,b,d,c);}
 for(let j=0;j<sides;j++){indices.push(firstCap,(j+1)%sides,j);const a=(rings-1)*sides+j,b=(rings-1)*sides+(j+1)%sides;indices.push(a,b,lastCap);}
 for(let t=0;t<indices.length;t+=3){const ids=indices.slice(t,t+3),ps=ids.map(i=>verts.slice(i*s,i*s+3) as Vec3),n=cross(sub(ps[1],ps[0]),sub(ps[2],ps[0]));for(const id of ids)for(let k=0;k<3;k++)verts[id*s+3+k]+=n[k];}
 for(let i=0;i<verts.length;i+=s){const n=unit(verts.slice(i+3,i+6) as Vec3);verts.splice(i+3,3,...n);}
 const all=new Float32Array(mesh.vertices.length+verts.length);all.set(mesh.vertices);all.set(verts,mesh.vertices.length);mesh.vertices=all;
 const triangles=new Uint32Array(mesh.indices.length+indices.length);triangles.set(mesh.indices);triangles.set(indices.map(i=>i+start),mesh.indices.length);mesh.indices=triangles;
}

