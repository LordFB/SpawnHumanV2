import fs from 'node:fs';
const bodies=JSON.parse(fs.readFileSync('artifacts/raw-bodies.json'));
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900"><rect width="100%" height="100%" fill="white"/>';
for(const [col,sex]of ['male','female'].entries()){
 const b=bodies[sex],p=Buffer.from(b.positions,'base64'),k=Buffer.from(b.kinds,'base64'),idx=Buffer.from(b.indices,'base64'),ey=b.eyes[0][1],chosen=new Map();
 for(let i=0;i<b.vertexCount;i++){const [x,y,z]=[0,1,2].map(a=>p.readInt32LE(i*12+a*4)/1e5);if(k[i]===0&&Math.abs(x)<.0003&&y>ey-.12&&y<ey-.04&&z>.07)chosen.set(i,[col*700+80+(z-.07)*6000,80+(ey-.04-y)*9000]);}
 for(let t=0;t<idx.length;t+=12){const ids=[0,4,8].map(a=>idx.readUInt32LE(t+a));for(let a=0;a<3;a++){const p=chosen.get(ids[a]),q=chosen.get(ids[(a+1)%3]);if(p&&q)svg+=`<path d="M${p} L${q}" stroke="black"/>`;}}
 for(const[i,p]of chosen)svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="red"/><text x="${p[0]+4}" y="${p[1]}" font-size="10">${i}</text>`;
 svg+=`<text x="${col*700+50}" y="25">${sex}</text>`;
}
fs.writeFileSync('artifacts/lip-section.svg',svg+'</svg>');
const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1400,height:900}});await page.goto('file:///'+process.cwd().replaceAll('\\','/')+'/artifacts/lip-section.svg');await page.screenshot({path:'artifacts/lip-section.png'});await browser.close();
