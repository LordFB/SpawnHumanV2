import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts/mouth',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelector('#state')?.textContent==='Ready',{timeout:30000});
 for(const[sex,preset]of [['male','0'],['female','1']]){
  await page.click(`[data-preset="${preset}"]`);await page.waitForTimeout(500);
  await page.click('[data-region="hair"]');await page.locator('#controls select').selectOption('bald');await page.waitForTimeout(400);
  await page.click('[data-region="face"]');await page.selectOption('#pose','neutral');await page.selectOption('#viseme','sil');
  for(const expression of ['neutral','jaw-open','blink']){
   await page.selectOption('#expression',expression);
   for(const view of ['front','side']){await page.click(`#${view}`);await page.waitForTimeout(300);await page.screenshot({path:`artifacts/mouth/${sex}-${expression}-${view}.png`});}
  }
  await page.click('#tongue-preview');
  for(const[name,target]of [['forward',[0,0,30]],['up',[0,25,15]],['left',[-20,5,15]],['right',[20,5,15]]]){
   for(const[axis,id]of ['tongue-x','tongue-y','tongue-z'].entries()){await page.locator(`#${id}`).fill(String(target[axis]));await page.locator(`#${id}`).dispatchEvent('input');}
   for(const view of ['front','side']){await page.click(`#${view}`);await page.waitForTimeout(350);await page.screenshot({path:`artifacts/mouth/${sex}-tongue-${name}-${view}.png`});}
  }
  await page.click('#tongue-reset');for(const id of ['tongue-x','tongue-y','tongue-z'])assert.equal(await page.locator(`#${id}`).inputValue(),'0');
 }
 assert.deepEqual(errors,[]);await writeFile('artifacts/mouth/result.json',JSON.stringify({result:'pass',errors}));console.log('Both mouth poses and views rendered without errors.');
}finally{await browser.close();}

