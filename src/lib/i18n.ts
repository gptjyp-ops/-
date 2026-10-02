import {useSyncExternalStore} from 'react';
import english from './en.json';
export type Language='ko'|'en';
const dictionary:Record<string,string>=english;
const storageKey='clanUiLanguage';
let language:Language='ko';
try{const requested=typeof location!=='undefined'?new URLSearchParams(location.search).get('lang'):null;const saved=localStorage.getItem(storageKey);language=requested==='en'||requested==='ko'?requested:saved==='en'?'en':'ko';localStorage.setItem(storageKey,language);}catch{}
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getLanguage=()=>language;
export function setLanguage(next:Language){language=next;try{localStorage.setItem(storageKey,next);}catch{}if(typeof history!=='undefined'&&typeof location!=='undefined'){const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState(null,'',url);}applyLanguage();listeners.forEach(listener=>listener());}
function applyLanguage(){if(typeof document!=='undefined'){document.documentElement.lang=language;document.title=language==='en'?'Clan Resource Manager':'클랜 재화관리';}}
applyLanguage();
export function useLanguage(){return useSyncExternalStore(subscribe,getLanguage,getLanguage);}
export function translate(text:string,lang:Language):string{
 if(!text)return text;
 const key=text.trim(),value=dictionary[key];
 if(lang==='en'&&value!==undefined)return text.replace(key,value);
 if(lang==='ko'){const original=Object.keys(dictionary).find(k=>dictionary[k]===key);if(original)return text.replace(key,original);}
 // Dynamic notices retain their parameters when the language is changed.
 for(const [ko,en] of Object.entries(dictionary)){
  if(!ko.includes('{0}'))continue;
  const source=lang==='en'?ko:en,target=lang==='en'?en:ko;
  const positions:number[]=[];
  const regex=source.split(/(\{\d+\})/).map(part=>{const placeholder=part.match(/^\{(\d+)\}$/);if(placeholder){positions.push(Number(placeholder[1]));return '(.*?)';}return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('');
  const match=key.match(new RegExp('^'+regex+'$'));if(match){const params:Record<number,string>={};positions.forEach((p,i)=>{params[p]=match[i+1];});return target.replace(/\{(\d+)\}/g,(_,i)=>params[Number(i)]);}
 }
 if(lang==='ko')return text;
 // Errors stay in Korean in storage and diagnostic JSON; localize only their UI.
 const missing=key.match(/^(보유 수량|소환 레벨|현재 단계|합성 수량)(의 자동 위치를 찾지 못했고 기본 영역에서도 숫자를 읽지 못했습니다\.| 영역에서 유효한 숫자를 읽지 못했습니다\.)$/);
 if(missing)return translate(missing[1],lang)+(missing[2].startsWith('의')?' could not be located or read in the fallback area.':' could not be read in the detected area.');
 if(/^(?:IMG|OCR|SAVE)-\d{2} · /.test(key))return key.split(' · ').map(part=>translate(part,lang)).join(' · ');
 const photoError=key.match(/^(스킬 화면|알 소환 화면|알 합성 화면|탈것 소환 화면|탈것 합성 화면|녹색 물약 화면): (.+)$/);
 if(photoError)return translate(photoError[1],lang)+': '+translate(photoError[2],lang);
 return text;
}
export const t=(text:string)=>translate(text,language);
export function tr(strings:TemplateStringsArray,...values:unknown[]){const key=strings.reduce((out,s,i)=>out+(i?'{'+(i-1)+'}':'')+s,'');return t(key).replace(/\{(\d+)\}/g,(_,i)=>String(values[Number(i)]??''));}
export const guidePath=()=>language==='en'?'guide-en.html':'guide.html';
