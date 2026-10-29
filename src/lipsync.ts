export const visemes=['sil','PP','FF','TH','DD','kk','CH','SS','nn','RR','aa','E','I','O','U'] as const;
export type Viseme=typeof visemes[number];
export type VisemeCue={start:number;end:number;viseme:Viseme;weight?:number};
const rhubarb:Record<string,Viseme>={A:'PP',B:'kk',C:'E',D:'aa',E:'O',F:'U',G:'FF',H:'nn',X:'sil'};

/** Timed Oculus-style cues, or Rhubarb's {mouthCues:[{start,end,value}]} export. */
export function parseVisemeCues(input:unknown):VisemeCue[]{
 const values=Array.isArray(input)?input:(input as {mouthCues?:unknown})?.mouthCues;
 if(!Array.isArray(values)||values.length>10000)throw Error('Expected up to 10,000 timed viseme cues.');
 const cues=values.map((value:unknown)=>{
  if(!value||typeof value!=='object')throw Error('Invalid speech cue.');
  const v=value as Record<string,unknown>,viseme=v.viseme??rhubarb[String(v.value)],weight=v.weight??1;
  if(typeof v.start!=='number'||typeof v.end!=='number'||!Number.isFinite(v.start)||!Number.isFinite(v.end)||v.start<0||v.end<=v.start)throw Error('Cue times must be finite seconds with end after start.');
  if(!visemes.includes(viseme as Viseme)||typeof weight!=='number'||!Number.isFinite(weight)||weight<0||weight>1)throw Error('Unknown viseme or invalid cue weight.');
  return {start:v.start,end:v.end,viseme:viseme as Viseme,weight};
 });
 return cues.sort((a,b)=>a.start-b.start);
}
/** Anticipatory, overlapping speech poses; normalize to prevent overdriving lips. */
export function sampleVisemes(cues:readonly VisemeCue[],time:number):Partial<Record<Viseme,number>>{
 const output:Partial<Record<Viseme,number>>={};let sum=0;
 for(const cue of cues){
  if(cue.start>time+.06)break;
  if(cue.viseme==='sil'||time>cue.end+.08)continue;
  const attack=Math.max(0,Math.min(1,(time-cue.start+.06)/.06)),release=Math.max(0,Math.min(1,(cue.end+.08-time)/.08));
  const weight=attack*attack*(3-2*attack)*release*release*(3-2*release)*(cue.weight??1);
  output[cue.viseme]=(output[cue.viseme]??0)+weight;sum+=weight;
 }
 if(sum>1)for(const key of Object.keys(output) as Viseme[])output[key]!/=sum;
 return output;
}
export const speechDemo:VisemeCue[]=['PP','aa','FF','E','TH','I','CH','O','SS','U','RR','nn','DD','kk'].map((viseme,i)=>({viseme:viseme as Viseme,start:i*.32,end:i*.32+.22}));
