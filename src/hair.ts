import {manifest} from './character-core';
import {HeadCollisionSurface} from './hair-collision';
import {transform,type Character} from './deformation';

const STEP=1/120;
const MAX_STEPS=4;
const GUIDE_STRIDE=manifest.quality.guideStride;

export class HairSimulation {
 positions:Float32Array;
 clumpPositions:Float32Array;
 private previous:Float32Array;
 private previousClumps:Float32Array;
 private guideSegmentLengths:Float32Array;
 private clumpSegmentLengths:Float32Array;
 private collisionPoint=new Float32Array(3);
 private headCollision?:HeadCollisionSurface;
 private previousHead=new Float32Array(16);
 private accumulator=0;
 private elapsed=0;
 private hasPreviousHead=false;

 constructor(public character:Character){
  this.positions=character.hair.rest.slice();
  this.previous=this.positions.slice();
  const clumps=character.hair.clumps;
  if(clumps)this.headCollision=new HeadCollisionSurface(character.mesh,character.rig[2].position);
  this.clumpPositions=clumps?.curves.slice()??new Float32Array();
  this.previousClumps=this.clumpPositions.slice();
  this.clumpSegmentLengths=new Float32Array((clumps?.count??0)*(clumps?.segments??0));
  if(clumps)for(let clump=0;clump<clumps.count;clump++)for(let point=1;point<=clumps.segments;point++){
   const k=(clump*(clumps.segments+1)+point)*3,prior=k-3,dx=clumps.curves[k]-clumps.curves[prior],dy=clumps.curves[k+1]-clumps.curves[prior+1],dz=clumps.curves[k+2]-clumps.curves[prior+2];
   this.clumpSegmentLengths[clump*clumps.segments+point-1]=Math.sqrt(dx*dx+dy*dy+dz*dz);
  }
  const {rest,segments}=character.hair;
  const guideCount=Math.ceil(rest.length/(segments+1)/3/GUIDE_STRIDE);
  this.guideSegmentLengths=new Float32Array(guideCount*segments);
  for(let strand=0;strand<guideCount*GUIDE_STRIDE;strand+=GUIDE_STRIDE){
   const guide=strand/GUIDE_STRIDE,base=strand*(segments+1)*3;
   for(let point=1;point<=segments;point++){
    const k=base+point*3,prior=k-3,dx=rest[k]-rest[prior],dy=rest[k+1]-rest[prior+1],dz=rest[k+2]-rest[prior+2];
    this.guideSegmentLengths[guide*segments+point-1]=Math.sqrt(dx*dx+dy*dy+dz*dz);
   }
  }
 }

 reset(){
  this.positions.set(this.character.hair.rest);
  this.previous.set(this.positions);
  this.clumpPositions.set(this.character.hair.clumps?.curves??new Float32Array());
  this.previousClumps.set(this.clumpPositions);
  this.accumulator=0;
  this.elapsed=0;
  this.hasPreviousHead=false;
 }

 update(dt:number,head:Float32Array,visibleStrands=this.character.hair.rest.length/(this.character.hair.segments+1)/3){
  const strandCount=this.character.hair.rest.length/(this.character.hair.segments+1)/3;
  const activeStrands=Math.min(strandCount,Math.max(0,Math.ceil(visibleStrands/GUIDE_STRIDE)*GUIDE_STRIDE));
  this.accumulator=Math.min(this.accumulator+Math.max(0,dt),STEP*MAX_STEPS);
  while(this.accumulator>=STEP){
   this.step(head,activeStrands);
   this.accumulator-=STEP;
  }
  this.updateFollowers(head,activeStrands);
 }

 private step(head:Float32Array,strandCount:number){
  if(this.character.hair.clumps){this.stepClumps(head);return;}
  const {rest,segments}=this.character.hair;
  const points=segments+1;
  const scale=this.character.recipe.shape.stature/1.72;
  const headCenter=transform(head,this.character.rig[2].position);
  const previousHead=this.hasPreviousHead?this.previousHead:head;
  const shoulderY=this.character.rig[3].position[1]-.015*scale;
  const inertia=.68;

  for(let strand=0;strand<strandCount;strand+=GUIDE_STRIDE){
   const base=strand*points*3;
   const rootX=head[0]*rest[base]+head[4]*rest[base+1]+head[8]*rest[base+2]+head[12];
   const rootY=head[1]*rest[base]+head[5]*rest[base+1]+head[9]*rest[base+2]+head[13];
   const rootZ=head[2]*rest[base]+head[6]*rest[base+1]+head[10]*rest[base+2]+head[14];
   this.positions[base]=this.previous[base]=rootX;
   this.positions[base+1]=this.previous[base+1]=rootY;
   this.positions[base+2]=this.previous[base+2]=rootZ;

   for(let point=1;point<=segments;point++){
    const k=base+point*3;
    const rx=rest[k],ry=rest[k+1],rz=rest[k+2];
    const goalX=head[0]*rx+head[4]*ry+head[8]*rz+head[12];
    const goalY=head[1]*rx+head[5]*ry+head[9]*rz+head[13];
    const goalZ=head[2]*rx+head[6]*ry+head[10]*rz+head[14];
    const oldGoalX=previousHead[0]*rx+previousHead[4]*ry+previousHead[8]*rz+previousHead[12];
    const oldGoalY=previousHead[1]*rx+previousHead[5]*ry+previousHead[9]*rz+previousHead[13];
    const oldGoalZ=previousHead[2]*rx+previousHead[6]*ry+previousHead[10]*rz+previousHead[14];
    const x=this.positions[k],y=this.positions[k+1],z=this.positions[k+2];
    const t=point/segments,tail=t*t,phase=this.elapsed*1.7+strand*.137+point*.31;

    this.positions[k]=x+(x-this.previous[k])*.94+(goalX-x)*.13-(goalX-oldGoalX)*inertia+Math.sin(phase)*.000012*tail;
    this.positions[k+1]=y+(y-this.previous[k+1])*.94+(goalY-y)*.13-(goalY-oldGoalY)*inertia-.000045*tail;
    this.positions[k+2]=z+(z-this.previous[k+2])*.94+(goalZ-z)*.13-(goalZ-oldGoalZ)*inertia+Math.cos(phase*.73)*.000009*tail;
    this.previous[k]=x;
    this.previous[k+1]=y;
    this.previous[k+2]=z;
   }

   for(let iteration=0;iteration<5;iteration++){
    this.positions[base]=rootX;
    this.positions[base+1]=rootY;
    this.positions[base+2]=rootZ;
    for(let point=1;point<=segments;point++){
     const k=base+point*3,prior=k-3;
     const dx=this.positions[k]-this.positions[prior],dy=this.positions[k+1]-this.positions[prior+1],dz=this.positions[k+2]-this.positions[prior+2];
     const distance=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
     const length=this.guideSegmentLengths[strand/GUIDE_STRIDE*segments+point-1];
     this.positions[k]=this.positions[prior]+dx*length/distance;
     this.positions[k+1]=this.positions[prior+1]+dy*length/distance;
     this.positions[k+2]=this.positions[prior+2]+dz*length/distance;

     this.projectOutsideEllipsoid(this.positions,k,headCenter[0],headCenter[1]+.012*scale,headCenter[2],.096*scale,.124*scale,.091*scale);
     this.projectOutsideEllipsoid(this.positions,k,-.14*scale,shoulderY,-.015*scale,.11*scale,.09*scale,.13*scale);
     this.projectOutsideEllipsoid(this.positions,k,.14*scale,shoulderY,-.015*scale,.11*scale,.09*scale,.13*scale);
    }
   }
  }

  this.previousHead.set(head);
  this.hasPreviousHead=true;
  this.elapsed+=STEP;
 }

 private stepClumps(head:Float32Array){
  const clumps=this.character.hair.clumps!;
  const points=clumps.segments+1,scale=this.character.recipe.shape.stature/1.72,oldHead=this.hasPreviousHead?this.previousHead:head;
  for(let clump=0;clump<clumps.count;clump++){
   const base=clump*points*3,root=transform(head,[clumps.curves[base],clumps.curves[base+1],clumps.curves[base+2]]);
   this.clumpPositions[base]=this.previousClumps[base]=root[0];this.clumpPositions[base+1]=this.previousClumps[base+1]=root[1];this.clumpPositions[base+2]=this.previousClumps[base+2]=root[2];
   for(let point=1;point<=clumps.segments;point++){
    const k=base+point*3,t=point/clumps.segments,tail=t*t,rx=clumps.curves[k],ry=clumps.curves[k+1],rz=clumps.curves[k+2];
    const gx=head[0]*rx+head[4]*ry+head[8]*rz+head[12],gy=head[1]*rx+head[5]*ry+head[9]*rz+head[13],gz=head[2]*rx+head[6]*ry+head[10]*rz+head[14];
    const ox=oldHead[0]*rx+oldHead[4]*ry+oldHead[8]*rz+oldHead[12],oy=oldHead[1]*rx+oldHead[5]*ry+oldHead[9]*rz+oldHead[13],oz=oldHead[2]*rx+oldHead[6]*ry+oldHead[10]*rz+oldHead[14];
    const x=this.clumpPositions[k],y=this.clumpPositions[k+1],z=this.clumpPositions[k+2],phase=this.elapsed*1.4+clump*.61+point*.17,flow=clump*3,flutter=Math.sin(phase)*.000025*tail;
    this.clumpPositions[k]=x+(x-this.previousClumps[k])*.975+(gx-x)*.11-(gx-ox)*.88+Math.sin(phase)*.000012*tail+clumps.flow[flow]*flutter;
    this.clumpPositions[k+1]=y+(y-this.previousClumps[k+1])*.975+(gy-y)*.11-(gy-oy)*.88-9.81*STEP*STEP*.32*tail+clumps.flow[flow+1]*flutter;
    this.clumpPositions[k+2]=z+(z-this.previousClumps[k+2])*.975+(gz-z)*.11-(gz-oz)*.88+Math.cos(phase*.73)*.000009*tail+clumps.flow[flow+2]*flutter;
    this.previousClumps[k]=x;this.previousClumps[k+1]=y;this.previousClumps[k+2]=z;
   }
   for(let iteration=0;iteration<6;iteration++){
    this.clumpPositions[base]=root[0];this.clumpPositions[base+1]=root[1];this.clumpPositions[base+2]=root[2];
    for(let point=1;point<=clumps.segments;point++){
     const k=base+point*3,prior=k-3,dx=this.clumpPositions[k]-this.clumpPositions[prior],dy=this.clumpPositions[k+1]-this.clumpPositions[prior+1],dz=this.clumpPositions[k+2]-this.clumpPositions[prior+2],distance=Math.hypot(dx,dy,dz)||1,length=this.clumpSegmentLengths[clump*clumps.segments+point-1];
     this.clumpPositions[k]=this.clumpPositions[prior]+dx*length/distance;this.clumpPositions[k+1]=this.clumpPositions[prior+1]+dy*length/distance;this.clumpPositions[k+2]=this.clumpPositions[prior+2]+dz*length/distance;
     this.projectBodyCollision(k,head,scale);
    }
   }
  }
  this.previousHead.set(head);this.hasPreviousHead=true;this.elapsed+=STEP;
 }

 private projectBodyCollision(k:number,head:Float32Array,scale:number){
  const previousX=this.clumpPositions[k],previousY=this.clumpPositions[k+1],previousZ=this.clumpPositions[k+2],dx=previousX-head[12],dy=previousY-head[13],dz=previousZ-head[14],point=this.collisionPoint;
  point[0]=head[0]*dx+head[1]*dy+head[2]*dz;point[1]=head[4]*dx+head[5]*dy+head[6]*dz;point[2]=head[8]*dx+head[9]*dy+head[10]*dz;
  const shoulder=this.character.rig[3].position,headCenter=this.character.rig[2].position,stature=scale;
  for(let iteration=0;iteration<2;iteration++){
   this.headCollision?.project(point,0,.0045*stature);
   this.projectOutsideCapsuleY(point,0,0,shoulder[1]+.025*stature,headCenter[1]-.085*stature,0,.060*stature,.057*stature);
   this.projectOutsideEllipsoid(point,0,this.character.rig[3].position[0],shoulder[1]-.016*stature,0,.057*stature,.063*stature,.057*stature);
   this.projectOutsideEllipsoid(point,0,this.character.rig[5].position[0],shoulder[1]-.016*stature,0,.057*stature,.063*stature,.057*stature);
  }
  this.clumpPositions[k]=head[0]*point[0]+head[4]*point[1]+head[8]*point[2]+head[12];
  this.clumpPositions[k+1]=head[1]*point[0]+head[5]*point[1]+head[9]*point[2]+head[13];
  this.clumpPositions[k+2]=head[2]*point[0]+head[6]*point[1]+head[10]*point[2]+head[14];
  this.previousClumps[k]+=this.clumpPositions[k]-previousX;
  this.previousClumps[k+1]+=this.clumpPositions[k+1]-previousY;
  this.previousClumps[k+2]+=this.clumpPositions[k+2]-previousZ;
 }

 private projectOutsideCapsuleY(positions:Float32Array,k:number,cx:number,minY:number,maxY:number,cz:number,rx:number,rz:number){
  const closestY=Math.max(minY,Math.min(maxY,positions[k+1])),nx=(positions[k]-cx)/rx,nz=(positions[k+2]-cz)/rz,distanceSquared=nx*nx+nz*nz;
  if(distanceSquared<1){
   if(distanceSquared<1e-10){positions[k]=cx+rx;positions[k+1]=closestY;positions[k+2]=cz;return;}
   const scale=1/Math.sqrt(distanceSquared);positions[k]=cx+nx*scale*rx;positions[k+2]=cz+nz*scale*rz;
  }
 }

 private projectOutsideEllipsoid(positions:Float32Array,k:number,cx:number,cy:number,cz:number,rx:number,ry:number,rz:number){
  const nx=(positions[k]-cx)/rx,ny=(positions[k+1]-cy)/ry,nz=(positions[k+2]-cz)/rz;
  const distanceSquared=nx*nx+ny*ny+nz*nz;
  if(distanceSquared<1){
   if(distanceSquared<=1e-10){positions[k]=cx;positions[k+1]=cy+ry;positions[k+2]=cz;return;}
   const scale=1/Math.sqrt(distanceSquared);
   positions[k]=cx+nx*scale*rx;
   positions[k+1]=cy+ny*scale*ry;
   positions[k+2]=cz+nz*scale*rz;
  }
 }

 private updateFollowers(head:Float32Array,strandCount:number){
  const {rest,segments}=this.character.hair;
  const points=segments+1;
  const clumps=this.character.hair.clumps;
  if(clumps){
   for(let strand=0;strand<strandCount;strand++){
    const base=strand*points*3,guide=clumps.strandClumpIds[strand]*points*3;
    for(let point=0;point<=segments;point++){
     const k=base+point*3,g=guide+point*3,dx=rest[k]-clumps.curves[g],dy=rest[k+1]-clumps.curves[g+1],dz=rest[k+2]-clumps.curves[g+2];
     this.positions[k]=this.clumpPositions[g]+head[0]*dx+head[4]*dy+head[8]*dz;
     this.positions[k+1]=this.clumpPositions[g+1]+head[1]*dx+head[5]*dy+head[9]*dz;
     this.positions[k+2]=this.clumpPositions[g+2]+head[2]*dx+head[6]*dy+head[10]*dz;
    }
   }
   return;
  }
  for(let strand=0;strand<strandCount;strand++){
   if(strand%GUIDE_STRIDE===0)continue;
   const base=strand*points*3,guide=Math.floor(strand/GUIDE_STRIDE)*GUIDE_STRIDE*points*3;
   for(let point=0;point<=segments;point++){
    const k=base+point*3,g=guide+point*3;
    const dx=rest[k]-rest[g],dy=rest[k+1]-rest[g+1],dz=rest[k+2]-rest[g+2];
    this.positions[k]=this.positions[g]+head[0]*dx+head[4]*dy+head[8]*dz;
    this.positions[k+1]=this.positions[g+1]+head[1]*dx+head[5]*dy+head[9]*dz;
    this.positions[k+2]=this.positions[g+2]+head[2]*dx+head[6]*dy+head[10]*dz;
   }
  }
 }
}
