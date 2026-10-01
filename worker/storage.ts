import { env } from 'cloudflare:workers';
export function storage(){ if(!env.DB || !env.BUCKET) throw new Error('Storage unavailable'); return {db:env.DB,bucket:env.BUCKET}; }
export async function passwordHash(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return Array.from(new Uint8Array(bits)).map(v=>v.toString(16).padStart(2,'0')).join('');
}
