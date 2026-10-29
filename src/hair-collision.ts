import type {Mesh,Vec3} from './deformation';

type Node={minX:number;minY:number;minZ:number;maxX:number;maxY:number;maxZ:number;left:number;right:number;start:number;count:number};

export class HeadCollisionSurface {
 private positions:Float32Array;
 private normals:Float32Array;
 private bounds:Float32Array;
 private centroids:Float32Array;
 private order:Uint32Array;
 private nodes:Node[]=[];
 private stack:number[]=[];
 private closest=new Float64Array(6);
 private best=new Float64Array(6);
 readonly triangleCount:number;

 constructor(mesh:Mesh,center:Vec3){
  const triangles:number[]=[];
  for(let index=0;index<mesh.indices.length;index+=3){
   const ids=[mesh.indices[index],mesh.indices[index+1],mesh.indices[index+2]];
   if(ids.some(id=>mesh.vertices[id*mesh.vertexStride+10]<1.5||mesh.vertices[id*mesh.vertexStride+10]>2.5))continue;
   const headWeights=ids.map(id=>{
    const offset=id*mesh.vertexStride;
    if(mesh.vertexStride===11)return mesh.vertices[offset+9]===2?1:0;
    let weight=0;for(let joint=0;joint<4;joint++)if(mesh.vertices[offset+11+joint]===2)weight+=mesh.vertices[offset+15+joint];
    return weight;
   });
   if(headWeights.some(weight=>weight<.8))continue;
   const a=ids[0]*mesh.vertexStride,b=ids[1]*mesh.vertexStride,c=ids[2]*mesh.vertexStride;
   const ux=mesh.vertices[b]-mesh.vertices[a],uy=mesh.vertices[b+1]-mesh.vertices[a+1],uz=mesh.vertices[b+2]-mesh.vertices[a+2];
   const vx=mesh.vertices[c]-mesh.vertices[a],vy=mesh.vertices[c+1]-mesh.vertices[a+1],vz=mesh.vertices[c+2]-mesh.vertices[a+2];
   const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,area=Math.hypot(nx,ny,nz);
   if(area<1e-10)continue;
   const outward=(mesh.vertices[a]+mesh.vertices[b]+mesh.vertices[c])/3-center[0],outwardY=(mesh.vertices[a+1]+mesh.vertices[b+1]+mesh.vertices[c+1])/3-center[1],outwardZ=(mesh.vertices[a+2]+mesh.vertices[b+2]+mesh.vertices[c+2])/3-center[2],flip=nx*outward+ny*outwardY+nz*outwardZ<0?-1:1;
   triangles.push(ids[0],ids[1],ids[2],flip);
  }
  this.triangleCount=triangles.length/4;
  if(!this.triangleCount)throw Error('The character head has no suitable triangles for detailed hair collision.');
  this.positions=new Float32Array(this.triangleCount*9);
  this.normals=new Float32Array(this.triangleCount*9);
  this.bounds=new Float32Array(this.triangleCount*6);
  this.centroids=new Float32Array(this.triangleCount*3);
  this.order=new Uint32Array(this.triangleCount);
  for(let triangle=0;triangle<this.triangleCount;triangle++){
   const index=triangle*4,flip=triangles[index+3],p=triangle*9;
   const a=triangles[index]*mesh.vertexStride,b=triangles[index+1]*mesh.vertexStride,c=triangles[index+2]*mesh.vertexStride,ux=mesh.vertices[b]-mesh.vertices[a],uy=mesh.vertices[b+1]-mesh.vertices[a+1],uz=mesh.vertices[b+2]-mesh.vertices[a+2],vx=mesh.vertices[c]-mesh.vertices[a],vy=mesh.vertices[c+1]-mesh.vertices[a+1],vz=mesh.vertices[c+2]-mesh.vertices[a+2];
   let faceX=(uy*vz-uz*vy)*flip,faceY=(uz*vx-ux*vz)*flip,faceZ=(ux*vy-uy*vx)*flip;const faceLength=Math.hypot(faceX,faceY,faceZ)||1;faceX/=faceLength;faceY/=faceLength;faceZ/=faceLength;
   for(let corner=0;corner<3;corner++){
    const source=triangles[index+corner]*mesh.vertexStride,position=p+corner*3;
    this.positions[position]=mesh.vertices[source];this.positions[position+1]=mesh.vertices[source+1];this.positions[position+2]=mesh.vertices[source+2];
    let nx=mesh.vertices[source+3],ny=mesh.vertices[source+4],nz=mesh.vertices[source+5];
    if(nx*faceX+ny*faceY+nz*faceZ<0){nx=-nx;ny=-ny;nz=-nz;}
    if(mesh.vertexStride===11){nx+=faceX;ny+=faceY;nz+=faceZ;}
    const length=Math.hypot(nx,ny,nz)||1;this.normals[position]=nx/length;this.normals[position+1]=ny/length;this.normals[position+2]=nz/length;
   }
   const p0=this.positions[p],p1=this.positions[p+3],p2=this.positions[p+6],y0=this.positions[p+1],y1=this.positions[p+4],y2=this.positions[p+7],z0=this.positions[p+2],z1=this.positions[p+5],z2=this.positions[p+8],bound=triangle*6,centroid=triangle*3;
   this.bounds[bound]=Math.min(p0,p1,p2);this.bounds[bound+1]=Math.min(y0,y1,y2);this.bounds[bound+2]=Math.min(z0,z1,z2);this.bounds[bound+3]=Math.max(p0,p1,p2);this.bounds[bound+4]=Math.max(y0,y1,y2);this.bounds[bound+5]=Math.max(z0,z1,z2);
   this.centroids[centroid]=(p0+p1+p2)/3;this.centroids[centroid+1]=(y0+y1+y2)/3;this.centroids[centroid+2]=(z0+z1+z2)/3;
   this.order[triangle]=triangle;
  }
  this.buildNode(0,this.triangleCount);
 }

 project(point:Float32Array,offset:number,margin:number){
  const x=point[offset],y=point[offset+1],z=point[offset+2];let bestDistance=Infinity,bestTriangle=-1;
  this.stack.length=0;this.stack.push(0);
  while(this.stack.length){
   const node=this.nodes[this.stack.pop()!],distance=this.distanceToBounds(x,y,z,node);
   if(distance>bestDistance)continue;
   if(node.count){
    for(let i=node.start;i<node.start+node.count;i++){
     const triangle=this.order[i],triangleOffset=triangle*9;
     this.closestPoint(x,y,z,triangleOffset);
     const dx=x-this.closest[0],dy=y-this.closest[1],dz=z-this.closest[2],d=dx*dx+dy*dy+dz*dz;
     if(d<bestDistance){bestDistance=d;bestTriangle=triangle;this.best.set(this.closest);}
    }
   }else{
    const left=this.nodes[node.left],right=this.nodes[node.right],leftDistance=this.distanceToBounds(x,y,z,left),rightDistance=this.distanceToBounds(x,y,z,right);
    if(leftDistance<rightDistance){if(rightDistance<=bestDistance)this.stack.push(node.right);if(leftDistance<=bestDistance)this.stack.push(node.left);}
    else{if(leftDistance<=bestDistance)this.stack.push(node.left);if(rightDistance<=bestDistance)this.stack.push(node.right);}
   }
  }
  if(bestTriangle<0)return false;
  const triangleOffset=bestTriangle*9,w0=this.best[3],w1=this.best[4],w2=this.best[5],normalOffset=triangleOffset;
  let nx=this.normals[normalOffset]*w0+this.normals[normalOffset+3]*w1+this.normals[normalOffset+6]*w2,ny=this.normals[normalOffset+1]*w0+this.normals[normalOffset+4]*w1+this.normals[normalOffset+7]*w2,nz=this.normals[normalOffset+2]*w0+this.normals[normalOffset+5]*w1+this.normals[normalOffset+8]*w2;
  const length=Math.hypot(nx,ny,nz);
  if(length<1e-8)return false;
  nx/=length;ny/=length;nz/=length;
  const signed=(x-this.best[0])*nx+(y-this.best[1])*ny+(z-this.best[2])*nz;
  if(signed<margin){point[offset]=this.best[0]+nx*margin;point[offset+1]=this.best[1]+ny*margin;point[offset+2]=this.best[2]+nz*margin;return true;}
  return false;
 }

 private buildNode(start:number,end:number){
  const node:Node={minX:Infinity,minY:Infinity,minZ:Infinity,maxX:-Infinity,maxY:-Infinity,maxZ:-Infinity,left:-1,right:-1,start,count:end-start},nodeIndex=this.nodes.length;this.nodes.push(node);
  let cxMin=Infinity,cyMin=Infinity,czMin=Infinity,cxMax=-Infinity,cyMax=-Infinity,czMax=-Infinity;
  for(let i=start;i<end;i++){
   const triangle=this.order[i],b=triangle*6,c=triangle*3;
   node.minX=Math.min(node.minX,this.bounds[b]);node.minY=Math.min(node.minY,this.bounds[b+1]);node.minZ=Math.min(node.minZ,this.bounds[b+2]);node.maxX=Math.max(node.maxX,this.bounds[b+3]);node.maxY=Math.max(node.maxY,this.bounds[b+4]);node.maxZ=Math.max(node.maxZ,this.bounds[b+5]);
   cxMin=Math.min(cxMin,this.centroids[c]);cyMin=Math.min(cyMin,this.centroids[c+1]);czMin=Math.min(czMin,this.centroids[c+2]);cxMax=Math.max(cxMax,this.centroids[c]);cyMax=Math.max(cyMax,this.centroids[c+1]);czMax=Math.max(czMax,this.centroids[c+2]);
  }
  if(end-start<=8)return nodeIndex;
  const extents=[cxMax-cxMin,cyMax-cyMin,czMax-czMin],axis=extents[0]>=extents[1]&&extents[0]>=extents[2]?0:extents[1]>=extents[2]?1:2;
  const sorted=Array.from(this.order.subarray(start,end)).sort((a,b)=>this.centroids[a*3+axis]-this.centroids[b*3+axis]);this.order.set(sorted,start);
  const middle=(start+end)>>1;node.count=0;node.left=this.buildNode(start,middle);node.right=this.buildNode(middle,end);
  return nodeIndex;
 }

 private distanceToBounds(x:number,y:number,z:number,node:Node){
  const dx=Math.max(node.minX-x,0,x-node.maxX),dy=Math.max(node.minY-y,0,y-node.maxY),dz=Math.max(node.minZ-z,0,z-node.maxZ);
  return dx*dx+dy*dy+dz*dz;
 }

 private closestPoint(px:number,py:number,pz:number,offset:number){
  const ax=this.positions[offset],ay=this.positions[offset+1],az=this.positions[offset+2],bx=this.positions[offset+3],by=this.positions[offset+4],bz=this.positions[offset+5],cx=this.positions[offset+6],cy=this.positions[offset+7],cz=this.positions[offset+8];
  const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az,apx=px-ax,apy=py-ay,apz=pz-az,d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
  let w0:number,w1:number,w2:number;
  if(d1<=0&&d2<=0){w0=1;w1=0;w2=0;}
  else{
   const bpx=px-bx,bpy=py-by,bpz=pz-bz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
   if(d3>=0&&d4<=d3){w0=0;w1=1;w2=0;}
   else{
    const vc=d1*d4-d3*d2;
    if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);w0=1-v;w1=v;w2=0;}
    else{
     const cpx=px-cx,cpy=py-cy,cpz=pz-cz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
     if(d6>=0&&d5<=d6){w0=0;w1=0;w2=1;}
     else{
      const vb=d5*d2-d1*d6;
      if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);w0=1-w;w1=0;w2=w;}
      else{
       const va=d3*d6-d5*d4;
       if(va<=0&&d4-d3>=0&&d5-d6>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));w0=0;w1=1-w;w2=w;}
       else{const inverse=1/(va+vb+vc);w1=vb*inverse;w2=vc*inverse;w0=1-w1-w2;}
      }
     }
    }
   }
  }
  this.closest[0]=ax*w0+bx*w1+cx*w2;this.closest[1]=ay*w0+by*w1+cy*w2;this.closest[2]=az*w0+bz*w1+cz*w2;
  this.closest[3]=w0;this.closest[4]=w1;this.closest[5]=w2;
 }
}
