import type {Inventory,PhotoKind} from './inventory';
import {googleScriptUrl} from './google-config';
export const apiUrl=(path:string)=>(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'')+path;
export const googleEnabled=!!googleScriptUrl;
let accessKey=sessionStorage.getItem('clanAccessKey')||'';
export async function unlockGoogle(key:string){accessKey=key.trim();await rpc('list');sessionStorage.setItem('clanAccessKey',accessKey);}
export function leaveClan(){accessKey='';sessionStorage.removeItem('clanAccessKey');location.reload();}
const googleUrl=googleScriptUrl;
type Reply={ok:boolean;error?:string;records?:any[];photos?:Partial<Record<PhotoKind,string>>;base64?:string;type?:string};
let bridgePromise:Promise<{source:Window;origin:string;channel:string}>|undefined;
const pending=new Map<string,{resolve:(r:Reply)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
function bridge(){
 if(bridgePromise)return bridgePromise;
 bridgePromise=new Promise((resolve,reject)=>{
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(googleUrl)){reject(Error('구글 저장 연결이 아직 설정되지 않았습니다.'));return;}
  const channel=crypto.randomUUID(),frame=document.createElement('iframe');frame.hidden=true;frame.title='구글 저장 연결';frame.src=googleUrl+'?channel='+channel;
  let source:Window|null=null,origin='';
  const timer=setTimeout(()=>{window.removeEventListener('message',listen);frame.remove();bridgePromise=undefined;reject(Error('구글 저장 연결을 열지 못했습니다. 웹 앱 배포 권한과 주소를 확인해주세요.'));},30000);
  function listen(event:MessageEvent){
   const m=event.data;if(!m||m.channel!==channel||!/^https:\/\/(?:[a-z0-9-]+\.)*googleusercontent\.com$/.test(event.origin))return;
   if(!source&&m.type==='clan-ready'&&event.source){source=event.source as Window;origin=event.origin;clearTimeout(timer);resolve({source,origin,channel});return;}
   if(event.source!==source||event.origin!==origin||m.type!=='clan-response')return;
   const request=pending.get(m.id);if(!request)return;clearTimeout(request.timer);pending.delete(m.id);if(!m.result?.ok)request.reject(Error(m.result?.error||'저장 요청 실패'));else request.resolve(m.result);
  }
  window.addEventListener('message',listen);document.body.appendChild(frame);
 });return bridgePromise;
}
async function rpc(method:string,payload:Record<string,unknown>={}):Promise<Reply>{const b=await bridge();return new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(Error('응답이 늦어지고 있습니다. 현황을 새로고침하여 저장 여부를 확인해주세요.'));},120000);pending.set(id,{resolve,reject,timer});b.source.postMessage({type:'clan-request',channel:b.channel,id,method,payload:{...payload,accessKey}},b.origin);});}
export async function getRecords(){if(googleUrl)return (await rpc('list')).records||[];const r=await fetch(apiUrl('/api/records'),{cache:'no-store'});const d:any=await r.json();if(!r.ok)throw Error(d.error);return d.records;}
async function encodedPhoto(file:File,kind:PhotoKind){
 const image=await createImageBitmap(file);try{
  const scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.88,.75,.6,.45]){const url=canvas.toDataURL('image/jpeg',quality),base64=url.split(',')[1];if(base64.length<=1398100)return {kind,base64};}
  throw Error('사진을 저장 크기로 줄이지 못했습니다. 더 작은 사진을 선택해주세요.');
 }finally{image.close();}
}
export async function saveInventory(nickname:string,password:string,inventory:Inventory,files:Partial<Record<PhotoKind,File>>){
 if(googleUrl){const photos=[];for(const [kind,file] of Object.entries(files))if(file)photos.push(await encodedPhoto(file,kind as PhotoKind));return rpc('save',{nickname,password,inventory,photos});}
 const form=new FormData();form.set('nickname',nickname);form.set('password',password);form.set('inventory',JSON.stringify(inventory));for(const [kind,file] of Object.entries(files))if(file)form.set('photo_'+kind,file);const r=await fetch(apiUrl('/api/records'),{method:'POST',body:form});const d:any=await r.json();if(!r.ok)throw Error(d.error);return d as Reply;
}
const photoCache=new Map<string,Promise<string>>();
export function photoUrl(id:string):Promise<string>{if(!googleUrl)return Promise.resolve(apiUrl('/api/photos/'+id));let p=photoCache.get(id);if(!p){p=rpc('photo',{id}).then(d=>{if(!/^image\/(jpeg|png|webp)$/.test(d.type||'')||!d.base64)throw Error('사진을 읽지 못했습니다.');return 'data:'+d.type+';base64,'+d.base64;}).catch(e=>{photoCache.delete(id);throw e;});photoCache.set(id,p);}return p;}
