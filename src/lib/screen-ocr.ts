import {parseNumber} from './ocr';
import type {PhotoKind,Group,Item} from './inventory';
import {locateRegions,ratioCandidates} from './screen-layout';
import {maximumStatus} from './summon-status';
export type Region={field:'amount'|'level'|'ratio'|'selected';rect:[number,number,number,number];mode:'white'|'black'|'yellow'|'mixed'|'raw'};
export const regions:Record<PhotoKind,Region[]>={
 skill:[{field:'amount',rect:[.125,.090,.099,.017],mode:'white'},{field:'level',rect:[.738,.728,.085,.018],mode:'black'},{field:'ratio',rect:[.725,.744,.11,.030],mode:'yellow'}],
 egg:[{field:'amount',rect:[.092,.084,.148,.024],mode:'white'},{field:'level',rect:[.738,.542,.085,.018],mode:'black'},{field:'ratio',rect:[.738,.563,.087,.013],mode:'mixed'}],
 mount:[{field:'amount',rect:[.464,.259,.129,.022],mode:'white'},{field:'level',rect:[.747,.699,.085,.018],mode:'black'},{field:'ratio',rect:[.741,.716,.10,.032],mode:'white'}],
 eggMerge:[{field:'selected',rect:[.105,.303,.055,.022],mode:'black'}],
 mountMerge:[{field:'selected',rect:[.105,.303,.034,.022],mode:'black'}],
 potion:[{field:'amount',rect:[.149,.133,.080,.021],mode:'yellow'}]
};
export function parseRead(field:Region['field'],text:string):Partial<Item>{const t=text.replace(/\s/g,'');if(field==='ratio'){const m=t.match(/^(\d+)\/(\d+)$/);return m&&Number(m[1])<=Number(m[2])?{progress:m[1],target:m[2]}:{};}
 if(field==='amount'){return parseNumber(t)!==null?{amount:t}:{};}
 return /^\d+$/.test(t)?{[field]:t}:{};
}
export const groupFor=(kind:PhotoKind):Group=>kind.startsWith('egg')?'egg':kind.startsWith('mount')?'mount':kind as Group;
export async function scanScreen(file:File,kind:PhotoKind,onProgress:(n:number)=>void,fresh=false){
 const bitmap=await createImageBitmap(file);let worker:any,koreanWorker:any;const item:Partial<Item>={};const original:string[]=[];
 try{const {createWorker,PSM}=await import('tesseract.js');const options={workerPath:import.meta.env.BASE_URL+'ocr/worker.min.js',corePath:import.meta.env.BASE_URL+(fresh?'ocr/tesseract-core-lstm.wasm.js':'ocr'),cacheMethod:fresh?'none' as const:undefined,errorHandler:()=>{},langPath:import.meta.env.BASE_URL+'ocr/lang',workerBlobURL:false};worker=await createWorker('eng',1,options);
 const overview=document.createElement('canvas');overview.width=400;overview.height=Math.round(bitmap.height*400/bitmap.width);const overviewContext=overview.getContext('2d')!;overviewContext.drawImage(bitmap,0,0,overview.width,overview.height);
 const adaptive:Partial<Record<Region['field'],Region>>={};for(const r of locateRegions(overviewContext.getImageData(0,0,overview.width,overview.height),kind))adaptive[r.field]=r;
 for(let k=0;k<regions[kind].length;k++){
 const fallback=regions[kind][k],candidates=adaptive[fallback.field]?[...ratioCandidates(adaptive[fallback.field]!),fallback]:[fallback];
 for(const r of candidates){const canvas=document.createElement('canvas');const [x,y,w,h]=r.rect;const scale=Math.min(750/(bitmap.width*w),160/(bitmap.height*h));const cw=Math.round(bitmap.width*w*scale),ch=Math.round(bitmap.height*h*scale);canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,bitmap.width*x,bitmap.height*y,bitmap.width*w,bitmap.height*h,0,0,cw,ch);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<data.data.length;i+=4){if(r.mode==='raw')continue;const red=data.data[i],g=data.data[i+1],b=data.data[i+2];const ink=r.mode==='white'?Math.min(red,g,b)>180&&Math.max(red,g,b)-Math.min(red,g,b)<55:r.mode==='black'?Math.max(red,g,b)<100:r.mode==='mixed'?((Math.min(red,g,b)>180&&Math.max(red,g,b)-Math.min(red,g,b)<55)||(red>150&&g>150&&b<140)):red>150&&g>150&&b<140;const value=ink?0:255;data.data[i]=value;data.data[i+1]=value;data.data[i+2]=value;}ctx.putImageData(data,0,0);const padded=document.createElement('canvas');padded.width=canvas.width+40;padded.height=canvas.height+40;const paddedContext=padded.getContext('2d')!;paddedContext.fillStyle='white';paddedContext.fillRect(0,0,padded.width,padded.height);paddedContext.drawImage(canvas,20,20);
 await worker.setParameters({tessedit_char_whitelist:r.field==='ratio'?'0123456789/':r.field==='amount'?'0123456789.,kKmMbB':'0123456789',tessedit_pageseg_mode:PSM.SINGLE_LINE});const result=await worker.recognize(padded);original.push(result.data.text.trim());const parsed=parseRead(r.field,result.data.text);if(Object.keys(parsed).length){Object.assign(item,parsed);break;}}
 onProgress(Math.round((k+1)/regions[kind].length*100));}
 if((kind==='skill'||kind==='egg'||kind==='mount')&&(!item.progress||!item.target)){
  onProgress(95);
  const level=adaptive.level||regions[kind].find(r=>r.field==='level')!,ratio=adaptive.ratio||regions[kind].find(r=>r.field==='ratio')!;
  const x=Math.min(level.rect[0],ratio.rect[0]),y=Math.min(level.rect[1],ratio.rect[1]),right=Math.max(level.rect[0]+level.rect[2],ratio.rect[0]+ratio.rect[2]),bottom=Math.max(level.rect[1]+level.rect[3],ratio.rect[1]+ratio.rect[3]);
  const canvas=document.createElement('canvas'),scale=Math.min(750/(bitmap.width*(right-x)),240/(bitmap.height*(bottom-y)));canvas.width=Math.round(bitmap.width*(right-x)*scale);canvas.height=Math.round(bitmap.height*(bottom-y)*scale);
  canvas.getContext('2d')!.drawImage(bitmap,bitmap.width*x,bitmap.height*y,bitmap.width*(right-x),bitmap.height*(bottom-y),0,0,canvas.width,canvas.height);
  koreanWorker=await createWorker('kor',1,options);await koreanWorker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});const status=await koreanWorker.recognize(canvas);original.push(status.data.text.trim());Object.assign(item,maximumStatus(status.data.text));
 }
 onProgress(100);return {item,original};
 }finally{bitmap.close();await worker?.terminate().catch(()=>{});await koreanWorker?.terminate().catch(()=>{});}
}
