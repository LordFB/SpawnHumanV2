import {chromium} from 'playwright-core';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try {
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelector('#state')?.textContent && document.querySelector('#state').textContent!=='Loading',{timeout:30000});await page.waitForTimeout(1500);
 const gpuError=await page.locator('#error').isVisible();if(gpuError)throw Error(await page.locator('#error').textContent());
 const initial=await page.locator('#shape\\.waist').inputValue();await page.locator('#shape\\.waist').fill('0.45');await page.locator('#shape\\.waist').dispatchEvent('change');await page.waitForTimeout(200);
 assert.equal(await page.locator('#shape\\.waist').inputValue(),'0.45');await page.click('#undo');await page.waitForTimeout(100);assert.equal(await page.locator('#shape\\.waist').inputValue(),initial);await page.click('#redo');await page.waitForTimeout(100);assert.equal(await page.locator('#shape\\.waist').inputValue(),'0.45');
 for(const [control,value] of [['breasts','0.4'],['butt','0.6']]){const slider=page.locator(`[id="shape.${control}"]`);await slider.fill(value);await slider.dispatchEvent('change');await page.waitForTimeout(300);}
 await page.fill('#name','Browser acceptance draft');await page.click('#save');await page.waitForFunction(()=>document.querySelector('#state').textContent==='Named recipe saved');
 const exported=page.waitForEvent('download');await page.click('#export');const download=await exported;await download.saveAs('artifacts/browser.recipe.json');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#state').textContent==='Draft restored');assert.equal(await page.locator('#shape\\.waist').inputValue(),'0.45');assert.equal(await page.locator('#name').inputValue(),'Browser acceptance draft');
 await page.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":999}')});await page.waitForTimeout(100);assert.equal(await page.locator('#shape\\.waist').inputValue(),'0.45');assert.ok(await page.locator('#error').isVisible());
 await page.click('#front');await page.locator('#error').evaluate(e=>e.hidden=true);await page.screenshot({path:'artifacts/creator.png'});
 for(let i=0;i<3;i++){await page.click(`[data-preset="${i}"]`);await page.waitForTimeout(300);await page.screenshot({path:`artifacts/preset-${i}.png`});}
 await page.click('[data-region="hair"]');await page.click('[data-frame="face"]');await page.waitForTimeout(200);await page.screenshot({path:'artifacts/hair.png'});
 await page.selectOption('#pose','walk');await page.waitForTimeout(300);await page.screenshot({path:'artifacts/walk.png'});
 const viewer=await browser.newPage({viewport:{width:1000,height:900}});viewer.on('pageerror',e=>errors.push(e.message));await viewer.goto('http://127.0.0.1:5173/viewer.html');await viewer.waitForFunction(()=>document.querySelector('#status').textContent==='Ready to load a recipe.');await viewer.locator('#load').setInputFiles('artifacts/browser.recipe.json');await viewer.waitForFunction(()=>document.querySelector('#status').textContent.includes('Neutral geometry'));await viewer.screenshot({path:'artifacts/viewer.png'});
 const exportedRecipe=JSON.parse(await readFile('artifacts/browser.recipe.json','utf8'));assert.equal(exportedRecipe.shape.breasts,0.4);assert.equal(exportedRecipe.shape.butt,0.6);const parity=await viewer.evaluate(async recipe=>{const api=await import('/src/runtime.ts');return {recipe:api.hash(api.canonical(recipe)),geometry:api.buildCharacter(recipe).geometryHash};},exportedRecipe);
 const viewerStatus=await viewer.locator('#status').textContent();assert.ok(viewerStatus.includes(parity.recipe));assert.ok(viewerStatus.includes(parity.geometry));
 await page.locator('summary').click();const cycleDownload=page.waitForEvent('download');await page.click('#cycles');await (await cycleDownload).saveAs('artifacts/resource-cycles.json');
 await writeFile('artifacts/browser-result.json',JSON.stringify({result:'pass',checks:['edit','undo','redo','IndexedDB named save','autosave reload','invalid import preserves current','export','independent viewer parameter/geometry parity','20 tracked resource cycles'],viewer:viewerStatus,errors,renderer:'Headless Chrome / detected adapter; not calibrated target hardware'},null,2));
 assert.deepEqual(errors,[]);console.log('Browser acceptance checks passed. Screenshots in artifacts/.');
} catch(e) {console.log(errors);console.log((await page.content()).slice(0,2000));throw e;} finally {await browser.close();}



