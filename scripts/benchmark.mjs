import {chromium} from 'playwright-core';
import {mkdir,readFile} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-webgpu']});
try{const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelector('#state')?.textContent==='Ready');await page.evaluate(()=>{const studio=document.querySelector('.studio');studio.style.cssText='position:fixed;inset:0;width:1920px;height:1080px;z-index:10';document.querySelector('aside').style.cssText='position:fixed;z-index:11;right:0;width:300px;opacity:0';document.querySelector('summary').click();});
const download=page.waitForEvent('download',{timeout:90000});await page.locator('#benchmark').evaluate(b=>b.click());await (await download).saveAs('artifacts/benchmark.json');console.log(await readFile('artifacts/benchmark.json','utf8'));}finally{await browser.close();}
