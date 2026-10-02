import type {ScanReport} from './scan-diagnostics';
import type {Inventory,PhotoKind} from './inventory';
import {googleScriptUrl} from './google-config';
export const apiUrl=(path:string)=>(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'')+path;
export const googleEnabled=!!googleScriptUrl;
const route=new URLSearchParams(location.hash.slice(1));
export const activeClanId=route.get('clan')||'legacy';
const keySlot=activeClanId==='legacy'?'clanAccessKey':'clanAccessKey:'+activeClanId;
let accessKey=sessionStorage.getItem(keySlot)||'';
export const invitedKey=route.get('code')||'';
export let activeClanName='우리 클랜';
export const savedAccessKey=()=>accessKey;
export async function unlockGoogle(key:string){accessKey=key.trim();await rpc('list');sessionStorage.setItem(keySlot,accessKey);}
export function leaveClan(){accessKey='';sessionStorage.removeItem(keySlot);location.href=import.meta.env.BASE_URL;}
const googleUrl=googleScriptUrl;
export type ClanInfo={id:string;name:string;server?:string;inviteKey?:string};
export let serverSelectionSupported=false;
export let serverOptions:string[]=[];
type Reply={clan?:ClanInfo;adminToken?:string;multiClan?:boolean;diagnosticReports?:boolean;serverSelection?:boolean;servers?:string[];ok:boolean;error?:string;records?:any[];photos?:Partial<Record<PhotoKind,string>>;base64?:string;type?:string};
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
async function rpc(method:string,payload:Record<string,unknown>={}):Promise<Reply>{const b=await bridge();return new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(Error('응답이 늦어지고 있습니다. 현황을 새로고침하여 저장 여부를 확인해주세요.'));},120000);pending.set(id,{resolve,reject,timer});b.source.postMessage({type:'clan-request',channel:b.channel,id,method,payload:{accessKey,clanId:activeClanId,...payload}},b.origin);});}
export async function getRecords(){if(googleUrl){const reply=await rpc('list');if(reply.clan)activeClanName=(reply.clan.server?'서버 '+reply.clan.server+' · ':'')+reply.clan.name;return reply.records||[];}const r=await fetch(apiUrl('/api/records'),{cache:'no-store'});const d:any=await r.json();if(!r.ok)throw Error(d.error);return d.records;}
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
export async function supportsClans(){try{const reply=await rpc('list',{operation:'capabilities'});serverSelectionSupported=!!reply.serverSelection;serverOptions=(reply.servers||[]).filter(s=>/^\d{1,6}$/.test(s));return !!reply.multiClan;}catch(e){if(e instanceof Error&&e.message.includes('클랜 입장 코드가 맞지 않습니다'))return false;throw e;}}
export async function clanAction(operation:string,payload:Record<string,unknown>={}){return rpc('list',{operation,...payload});}
export function invitationLink(clan:ClanInfo){return location.origin+import.meta.env.BASE_URL+'#'+new URLSearchParams({clan:clan.id,code:clan.inviteKey||''}).toString();}
const photoCache=new Map<string,Promise<string>>();
export function photoUrl(id:string):Promise<string>{if(!googleUrl)return Promise.resolve(apiUrl('/api/photos/'+id));let p=photoCache.get(id);if(!p){p=rpc('photo',{id}).then(d=>{if(!/^image\/(jpeg|png|webp)$/.test(d.type||'')||!d.base64)throw Error('사진을 읽지 못했습니다.');return 'data:'+d.type+';base64,'+d.base64;}).catch(e=>{photoCache.delete(id);throw e;});photoCache.set(id,p);}return p;}

export async function sendScanReport(report:ScanReport){
 if(!googleEnabled||!savedAccessKey())throw Error('클랜에 입장한 뒤 오류를 전송할 수 있습니다.');
 const capability=await rpc('list',{operation:'capabilities'});
 if(!capability.diagnosticReports)throw Error('오류 자동 전송은 구글 스크립트 업데이트 후 사용할 수 있습니다.');
 // Only diagnostic metadata is sent. Never include photo bytes, filenames,
 // nickname, passwords, browser URLs or invitation codes in the report.
 return rpc('report',{report:{version:report.version,kind:report.kind,mode:report.mode,image:report.image,issues:report.issues.map(({code,field})=>({code,field})),attempts:report.attempts.map(({field,source,text})=>({field,source,text:text.replace(/[^0-9.,/kKmMbB\s]/g,'').slice(0,80)}))}});
}
