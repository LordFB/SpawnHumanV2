import fs from 'node:fs';import {chromium} from 'playwright-core';
const bodies=JSON.parse(fs.readFileSync('artifacts/raw-bodies.json'));let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900"><rect width="100%" height="100%" fill="white"/>';
for(const [col,sex]of ['male','female'].entries()){
 const b=bodies[sex],p=Buffer.from(b.positions,'base64'),idx=Buffer.from(b.indices,'base64'),pos=i=>[0,1,2].map(a=>p.readInt32LE(i*12+a*4)/1e5),ey=b.eyes[0][1];
 const screen=p=>[col*700+60+(p[2]-.07)*5500,60+(ey-.04-p[1])*8500];
 for(let t=0;t<idx.length;t+=12){const ids=[0,4,8].map(k=>idx.readUInt32LE(t+k)),v=ids.map(pos);if(!v.every(p=>p[1]>ey-.12&&p[1]<ey-.04&&p[2]>.07))continue;const cross=[];
 for(let a=0;a<3;a++){const p=v[a],q=v[(a+1)%3];if((p[0]-.001)*(q[0]-.001)<0){const w=(.001-p[0])/(q[0]-p[0]);cross.push(p.map((x,k)=>x+w*(q[k]-x)));}}
 if(cross.length===2){const ps=cross.map(screen);svg+=`<path d="M${ps[0]}L${ps[1]}" stroke="black"/>`;if(cross.every(p=>p[1]>1.53&&p[1]<1.54))svg+=`<text x="${ps[0][0]+5}" y="${ps[0][1]}" font-size="9">${ids.join('/')}</text>`;}
 }
}fs.writeFileSync('artifacts/mouth-plane.svg',svg+'</svg>');const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1400,height:900}});await page.goto('file:///'+process.cwd().replaceAll('\\','/')+'/artifacts/mouth-plane.svg');await page.screenshot({path:'artifacts/mouth-plane.png'});await browser.close();
