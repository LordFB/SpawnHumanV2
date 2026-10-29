import {canonical,resolveRecipe,type Recipe} from './character-core';
export class History {
 private past:Recipe[]=[];private future:Recipe[]=[];
 constructor(public current:Recipe){}
 commit(input:unknown){const next=resolveRecipe(input);if(canonical(next)===canonical(this.current))return false;this.past.push(structuredClone(this.current));if(this.past.length>100)this.past.shift();this.current=next;this.future=[];return true;}
 undo(){const next=this.past.pop();if(!next)return false;this.future.push(this.current);this.current=next;return true;}
 redo(){const next=this.future.pop();if(!next)return false;this.past.push(this.current);this.current=next;return true;}
 get canUndo(){return this.past.length>0;}get canRedo(){return this.future.length>0;}
}
export class BuildCoordinator<T>{private token=0;async run(build:()=>Promise<T>,apply:(result:T)=>void,discard:(result:T)=>void){const token=++this.token;const result=await build();if(token===this.token){apply(result);return true;}discard(result);return false;}cancel(){this.token++;}}
export type Saved={id:string;name:string;recipe:Recipe;updated:number};
export class RecipeStore {
 private db?:IDBDatabase;
 async open(){this.db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('private-human-lab',1);request.onupgradeneeded=()=>request.result.createObjectStore('recipes',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 async save(id:string,name:string,recipe:Recipe){const value:Saved={id,name,recipe:resolveRecipe(recipe),updated:Date.now()};await this.transaction('readwrite',store=>store.put(value));}
 async list():Promise<Saved[]>{return this.transaction('readonly',store=>store.getAll());}
 async load(id:string){const record:Saved|undefined=await this.transaction('readonly',store=>store.get(id));return record?{...record,recipe:resolveRecipe(record.recipe)}:undefined;}
 private transaction(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest):Promise<any>{return new Promise((resolve,reject)=>{if(!this.db){reject(Error('Local storage unavailable. Export JSON to keep your edits.'));return;}const tx=this.db.transaction('recipes',mode),request=action(tx.objectStore('recipes'));tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Storage transaction aborted.'));});}
}
