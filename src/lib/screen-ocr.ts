import {parseNumber} from './ocr';
import type {PhotoKind,Group,Item} from './inventory';
import {locateRegions} from './screen-layout';
export type Region={field:'amount'|'level'|'ratio'|'selected';rect:[number,number,number,number];mode:'white'|'black'|'yellow'|'mixed'};
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
export async function scanScreen(file:File,kind:PhotoKind,onProgress:(n:number)=>void){
 const bitmap=await createImageBitmap(file);let worker:any;const item:Partial<Item>={};const original:string[]=[];
 try{const {createWorker,PSM}=await import('tesseract.js');worker=await createWorker('eng',1,{workerPath:import.meta.env.BASE_URL+'ocr/worker.min.js',corePath:import.meta.env.BASE_URL+'ocr',langPath:import.meta.env.BASE_URL+'ocr/lang',workerBlobURL:false});
 const overview=document.createElement('canvas');overview.width=400;overview.height=Math.round(bitmap.height*400/bitmap.width);const overviewContext=overview.getContext('2d')!;overviewContext.drawImage(bitmap,0,0,overview.width,overview.height);
 const adaptive:Partial<Record<Region['field'],Region>>={};for(const r of locateRegions(overviewContext.getImageData(0,0,overview.width,overview.height),kind))adaptive[r.field]=r;
 for(let k=0;k<regions[kind].length;k++){
 const fallback=regions[kind][k],candidates=adaptive[fallback.field]?[adaptive[fallback.field]!,fallback]:[fallback];
 for(const r of candidates){const canvas=document.createElement('canvas');const [x,y,w,h]=r.rect;const scale=Math.min(750/(bitmap.width*w),160/(bitmap.height*h));const cw=Math.round(bitmap.width*w*scale),ch=Math.round(bitmap.height*h*scale);canvas.width=cw;canvas.height=ch;const ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,bitmap.width*x,bitmap.height*y,bitmap.width*w,bitmap.height*h,0,0,cw,ch);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<data.data.length;i+=4){const red=data.data[i],g=data.data[i+1],b=data.data[i+2];const ink=r.mode==='white'?Math.min(red,g,b)>180&&Math.max(red,g,b)-Math.min(red,g,b)<55:r.mode==='black'?Math.max(red,g,b)<100:r.mode==='mixed'?((Math.min(red,g,b)>180&&Math.max(red,g,b)-Math.min(red,g,b)<55)||(red>150&&g>150&&b<140)):red>150&&g>150&&b<140;const value=ink?0:255;data.data[i]=value;data.data[i+1]=value;data.data[i+2]=value;}ctx.putImageData(data,0,0);const padded=document.createElement('canvas');padded.width=canvas.width+40;padded.height=canvas.height+40;const paddedContext=padded.getContext('2d')!;paddedContext.fillStyle='white';paddedContext.fillRect(0,0,padded.width,padded.height);paddedContext.drawImage(canvas,20,20);
 await worker.setParameters({tessedit_char_whitelist:r.field==='ratio'?'0123456789/':r.field==='amount'?'0123456789.,kKmMbB':'0123456789',tessedit_pageseg_mode:PSM.SINGLE_LINE});const result=await worker.recognize(padded);original.push(result.data.text.trim());const parsed=parseRead(r.field,result.data.text);if(Object.keys(parsed).length){Object.assign(item,parsed);break;}}
 onProgress(Math.round((k+1)/regions[kind].length*100));}
 return {item,original};
 }finally{bitmap.close();await worker?.terminate();}
}
