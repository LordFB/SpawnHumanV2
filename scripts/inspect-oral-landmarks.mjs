import fs from 'node:fs';
const bodies=JSON.parse(fs.readFileSync('artifacts/raw-bodies.json'));
for(const[sex,b]of Object.entries(bodies)){const p=Buffer.from(b.positions,'base64');console.log(sex,'eyes',b.eyes);for(const id of [8004,8094,29903,7986,7985,26468,8001,7989,7993])console.log(id,[0,1,2].map(a=>p.readInt32LE(id*12+a*4)/1e5));}
