import {storage,passwordHash} from './storage';
import {validateInventory,photoKinds} from '../src/lib/inventory';
export async function GET(){try{const {db}=storage();const rows=await db.prepare('SELECT nickname,details,photos,updated_at FROM members ORDER BY updated_at DESC').all();return Response.json({records:rows.results.map((r:any)=>({...r,details:JSON.parse(r.details),photos:JSON.parse(r.photos)}))},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return Response.json({error:'현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'},{status:503});}}
export async function POST(request:Request){
 const fresh:string[]=[];let committed=false;
 try{
 if(Number(request.headers.get('content-length')||0)>32*1024*1024)return Response.json({error:'사진은 각각 5MB 이하로 올려주세요.'},{status:413});
 const form=await request.formData();const nickname=String(form.get('nickname')||'').trim().normalize('NFKC');const password=String(form.get('password')||'');
 if(!nickname||nickname.length>24||password.length<6||password.length>100)return Response.json({error:'닉네임(24자 이하)과 수정 비밀번호(6자 이상)를 입력해주세요.'},{status:400});
 let details;try{details=validateInventory(JSON.parse(String(form.get('inventory')||'{}')));}catch(e){return Response.json({error:e instanceof Error?e.message:'입력값을 확인해주세요.'},{status:400});}
 const {db,bucket}=storage();const old:any=await db.prepare('SELECT * FROM members WHERE nickname = ?').bind(nickname).first();
 if(old?.lock_until>Date.now())return Response.json({error:'비밀번호 확인 시도가 많습니다. 10분 뒤 다시 시도해주세요.'},{status:429});
 const salt=old?.salt||crypto.randomUUID();const hash=await passwordHash(password,salt);
 if(old&&old.password_hash!==hash){await db.prepare('UPDATE members SET failed_attempts = failed_attempts + 1, lock_until = ? WHERE nickname = ?').bind(old.failed_attempts>=4?Date.now()+600000:0,nickname).run();return Response.json({error:'이 닉네임의 수정 비밀번호가 맞지 않습니다.'},{status:403});}
 const photos=JSON.parse(old?.photos||'{}');const obsolete:string[]=[];
 const uploads:{kind:string;bytes:Uint8Array;type:string}[]=[];
 for(const kind of photoKinds){const file=form.get('photo_'+kind);if(!(file instanceof File)||!file.size)continue;
 if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))return Response.json({error:'사진은 JPG, PNG, WEBP로 각각 5MB 이하로 올려주세요.'},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216;const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';if(!png&&!jpg&&!webp)return Response.json({error:'유효한 이미지 파일이 아닙니다.'},{status:400});uploads.push({kind,bytes,type:png?'image/png':jpg?'image/jpeg':'image/webp'});}
 for(const u of uploads){const key=crypto.randomUUID();await bucket.put(key,u.bytes,{httpMetadata:{contentType:u.type}});fresh.push(key);if(photos[u.kind])obsolete.push(photos[u.kind]);photos[u.kind]=key;}
 const saved=await db.prepare('INSERT INTO members (nickname,password_hash,salt,details,photos,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(nickname) DO UPDATE SET details=excluded.details,photos=excluded.photos,updated_at=excluded.updated_at,failed_attempts=0,lock_until=0 WHERE members.password_hash=excluded.password_hash').bind(nickname,hash,salt,JSON.stringify(details),JSON.stringify(photos),new Date().toISOString()).run();
 if(!saved.meta.changes){await Promise.all(fresh.map(k=>bucket.delete(k)));return Response.json({error:'닉네임이 이미 등록되었습니다. 수정 비밀번호를 확인해주세요.'},{status:409});}
 committed=true;await Promise.all(obsolete.map(k=>bucket.delete(k).catch(console.error)));return Response.json({ok:true});
 }catch(e){if(!committed&&fresh.length)await Promise.all(fresh.map(k=>storage().bucket.delete(k).catch(console.error)));console.error(e);return Response.json({error:'저장하지 못했습니다. 입력 내용을 유지했으니 다시 시도해주세요.'},{status:503});}
}
