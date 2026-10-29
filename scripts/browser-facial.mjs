import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts/facial',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelector('#state')?.textContent==='Ready',{timeout:30000});
 await page.click('[data-region="hair"]');await page.locator('#controls select').selectOption('bald');await page.waitForTimeout(300);
 await page.click('[data-region="face"]');await page.click('#front');await page.click('#pause');
 for(const [key,value] of [['upperLip','.6'],['lowerLip','.5'],['mouthHeight','.25'],['mouthCorners','.3']]){
  const slider=page.locator(`[id="face.${key}"]`);await slider.fill(String(Number(value)));await slider.dispatchEvent('change');await page.waitForTimeout(350);
 }
 for(const viseme of ['sil','PP','aa','FF','O','U']){
  await page.selectOption('#viseme',viseme);await page.waitForTimeout(400);assert.equal(await page.locator('#error').isVisible(),false);
  await page.screenshot({path:`artifacts/facial/${viseme}.png`});
 }
 for(const key of ['upperLip','lowerLip','mouthHeight','mouthCorners']){const slider=page.locator(`[id="face.${key}"]`);await slider.fill('0');await slider.dispatchEvent('change');await page.waitForTimeout(250);}
 await page.selectOption('#viseme','sil');
 for(const expression of ['blink','jaw-open','neutral']){await page.selectOption('#expression',expression);await page.waitForTimeout(500);await page.screenshot({path:`artifacts/facial/${expression}.png`});assert.equal(await page.locator('#error').isVisible(),false);}
 await page.click('#speech-demo');await page.waitForTimeout(300);assert.equal(await page.locator('#speech-demo').textContent(),'Stop phonetic test');await page.click('#speech-demo');
 await page.locator('#speech-cue-file').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({mouthCues:[{start:0,end:.3,value:'A'},{start:.3,end:1.5,value:'D'}]}))});
 await page.waitForFunction(()=>document.querySelector('#state')?.textContent==='Speech cues loaded');
 const wav=Buffer.alloc(44+16000*2*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 await page.locator('#speech-audio-file').setInputFiles({name:'clock-test.wav',mimeType:'audio/wav',buffer:wav});
 await page.evaluate(async()=>{const audio=document.querySelector('#speech-audio');audio.muted=true;await audio.play();});await page.waitForTimeout(500);
 await page.waitForFunction(()=>document.querySelector('#speech-audio').currentTime>.1,{},{timeout:10000});
 const clock=await page.locator('#speech-audio').evaluate(a=>a.currentTime);assert.ok(clock>.1);await page.locator('#speech-audio').evaluate(a=>a.pause());
 await page.screenshot({path:'artifacts/facial/audio-cue.png'});assert.equal(await page.locator('#error').isVisible(),false);assert.deepEqual(errors,[]);
 await writeFile('artifacts/facial/result.json',JSON.stringify({result:'pass',checks:['mouth sliders','15-pose selector','phonetic test playback','Rhubarb import','local audio cue clock'],audioClock:clock,errors},null,2));
 // Verify both source meshes from useful angles and under body motion.
 for(const [sex,preset] of [['male','0'],['female','1']]){
  await page.click(`[data-preset="${preset}"]`);await page.waitForTimeout(700);
  await page.click('[data-region="hair"]');await page.locator('#controls select').selectOption('bald');await page.waitForTimeout(500);
  await page.click('[data-region="face"]');await page.selectOption('#viseme','sil');
  for(const expression of ['blink','jaw-open']){
   await page.selectOption('#expression',expression);
   for(const view of ['front','side','back']){
    await page.click(`#${view}`);await page.waitForTimeout(400);
    await page.screenshot({path:`artifacts/facial/${sex}-${expression}-${view}.png`});
   }
  }
  await page.click('#front');await page.selectOption('#pose','turn');
  await page.locator('#scrub').fill('1');await page.locator('#scrub').dispatchEvent('input');await page.waitForTimeout(400);
  await page.screenshot({path:`artifacts/facial/${sex}-jaw-motion.png`});
 }
 assert.deepEqual(errors,[]);
 console.log('Facial controls, both bodies, views, motion and cue playback browser checks passed.');
}finally{await browser.close();}
