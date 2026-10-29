import {resolveRecipe,canonical,hash} from './character-core';
import {buildCharacter} from './deformation';
import {Renderer} from './webgpu-renderer';
const renderer=new Renderer(document.querySelector('canvas')!),status=document.querySelector('#status')!;
try{await renderer.initialize();status.textContent='Ready to load a recipe.';renderer.onError=m=>status.textContent=m;}catch(e){status.textContent=String(e);}
document.querySelector<HTMLInputElement>('#load')!.onchange=async e=>{try{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;if(file.size>100000)throw Error('Recipe exceeds 100 KB.');const recipe=resolveRecipe(JSON.parse(await file.text())),character=buildCharacter(recipe);renderer.load(character);status.textContent=`Recipe ${hash(canonical(recipe))} · Neutral geometry ${character.geometryHash}`;}catch(e){status.textContent=String(e);}};
renderer.canvas.onwheel=e=>{e.preventDefault();renderer.distance=Math.max(.5,Math.min(7,renderer.distance+e.deltaY*.003));};let x:number|undefined;renderer.canvas.onpointerdown=e=>{x=e.clientX;renderer.canvas.setPointerCapture(e.pointerId);};renderer.canvas.onpointermove=e=>{if(x!==undefined){renderer.yaw+=(e.clientX-x)*.01;x=e.clientX;}};renderer.canvas.onpointerup=()=>x=undefined;
