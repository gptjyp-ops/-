import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const props=new Map(),sheets=new Map(),folders=new Map(),files=new Map();
function makeSheet(name){const rows=[];const sheet={rows,getLastRow:()=>rows.length,setName(n){sheets.delete(name);name=n;sheets.set(n,sheet);},setFrozenRows(){},appendRow:r=>rows.push([...r]),getRange(row,col,count,width){return {getValues:()=>rows.slice(row-1,row-1+count).map(r=>r.slice(col-1,col-1+width)),setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>rows[row-1+i][col-1+j]=v));}};}};sheets.set(name,sheet);return sheet;}
const book={getId:()=> 'book',getSheets:()=>[...sheets.values()],getSheetByName:n=>sheets.get(n)||null,insertSheet:n=>makeSheet(n)};makeSheet('Sheet1');
function makeFolder(){const id=crypto.randomUUID();const folder={getId:()=>id,createFile(blob){const fileId=crypto.randomUUID();const f={getId:()=>fileId,setTrashed(){f.trashed=true;},getBlob:()=>({getBytes:()=>blob.bytes,getContentType:()=>blob.type}),getParents:()=>{let used=false;return {hasNext:()=>!used,next:()=>{used=true;return folder;}};}};files.set(fileId,f);return f;}};folders.set(id,folder);return folder;}
const context={console:{log(){},error(){}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},Utilities:{getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(value,key)=>[...crypto.createHmac('sha256',key).update(value).digest()],base64Decode:s=>[...Buffer.from(s,'base64')],base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,type)=>({bytes,type})},LockService:{getScriptLock:()=>({waitLock(){},tryLock:()=>true,releaseLock(){}})},SpreadsheetApp:{create:()=>book,openById:()=>book,flush(){}},DriveApp:{createFolder:()=>makeFolder(),getFolderById:id=>folders.get(id),getFileById:id=>files.get(id)}};
vm.createContext(context);vm.runInContext(fs.readFileSync('google/Code.gs','utf8'),context);context.setup_();
const call=(method,payload)=>JSON.parse(JSON.stringify(context.clanRpc(method,payload)));
const action=(operation,p={})=>call('list',{operation,...p});
assert.equal(action('capabilities').multiClan,true);
assert.equal(action('createClan',{name:'A',password:'short'}).ok,false);
const a=action('createClan',{name:'A',server:'0012',password:'administrator-a'}),b=action('createClan',{name:'A',server:'13',password:'administrator-b'});
assert.equal(a.ok,true);assert.equal(b.ok,true);assert.notEqual(a.clan.id,b.clan.id);
assert.equal(a.clan.server,'12');assert.equal(b.clan.server,'13');
assert.deepEqual(action('capabilities').servers,['12','13']);
for(const server of ['0','-1','abc','=1+1','1.2','1234567'])assert.equal(action('createClan',{name:'Bad',server,password:'administrator-a'}).ok,false);
const inventory=Object.fromEntries(['skill','egg','mount','potion'].map(g=>[g,{amount:'10',level:'32',progress:'0',target:'110',selected:'',extra:'0'}]));
const jpeg=Buffer.from([255,216,255,224,0,0,0,0,0,0,0,0]).toString('base64');
const access=c=>({clanId:c.clan.id,accessKey:c.clan.inviteKey});
const payload={nickname:'same-name',password:'member-password',inventory,photos:[{kind:'skill',base64:jpeg}]};
const savedA=call('save',{...access(a),...payload}),savedB=call('save',{...access(b),...payload,inventory:{...inventory,skill:{...inventory.skill,amount:'20'}}});
assert.equal(savedA.ok,true);assert.equal(savedB.ok,true);
assert.equal(call('list',access(a)).records[0].details.skill.amount,'10');assert.equal(call('list',access(b)).records[0].details.skill.amount,'20');
assert.equal(action('setClanServer',{clanId:b.clan.id,adminToken:a.adminToken,server:'99'}).ok,false);
assert.equal(action('setClanServer',{...access(a),server:'99'}).ok,false);
assert.equal(action('setClanServer',{clanId:a.clan.id,adminToken:a.adminToken,server:''}).ok,false);
assert.equal(action('setClanServer',{clanId:a.clan.id,adminToken:a.adminToken,server:'99'}).clan.server,'99');
assert.equal(call('list',access(a)).clan.server,'99');assert.equal(call('list',access(a)).records[0].details.skill.amount,'10');
// Old registries had ten columns. Missing server data remains readable and
// adding the new header must not change passwords, keys or member records.
sheets.get('clans').rows[0].length=10;sheets.get('clans').rows[2].length=10;
assert.equal(action('adminInfo',{clanId:b.clan.id,adminToken:b.adminToken}).clan.server,'');
assert.equal(sheets.get('clans').rows[0][10],'server');assert.equal(call('list',access(b)).records[0].details.skill.amount,'20');
assert.equal(call('list',{clanId:a.clan.id,accessKey:b.clan.inviteKey}).ok,false);
assert.equal(call('photo',{...access(b),id:savedA.photos.skill}).ok,false);assert.equal(call('photo',{...access(a),id:savedA.photos.skill}).ok,true);
assert.equal(action('renameClan',{clanId:b.clan.id,adminToken:a.adminToken,name:'stolen'}).ok,false);
assert.equal(action('renameClan',{clanId:a.clan.id,accessKey:a.clan.inviteKey,name:'stolen'}).ok,false);
const renamed=action('renameClan',{clanId:a.clan.id,adminToken:a.adminToken,name:'=SAFE()'});assert.equal(renamed.clan.name,'=SAFE()');assert.equal(sheets.get('clans').rows[1][1],'"=SAFE()"');
assert.equal(JSON.stringify(call('list',access(a))).includes('adminToken'),false);assert.equal(JSON.stringify(call('list',access(a))).includes(a.clan.inviteKey),false);
// Reports are authenticated, private, bounded and contain no supplied secrets.
const report={version:'2026-10-03.1',kind:'potion',mode:'호환',image:{width:551,height:993,bytes:252631,type:'image/png',filename:'secret.png'},issues:[{code:'OCR-02',field:'amount',message:'secret-password'}],attempts:[{field:'amount',source:'fallback',text:'secret-token 943'}],nickname:'private-name'};
assert.equal(action('capabilities').diagnosticReports,true);
assert.equal(call('report',{report}).ok,false);
assert.equal(sheets.has('ocr_errors'),false);
assert.equal(call('report',{...access(a),report:{...report,issues:[{code:'BAD'}]}}).ok,false);
assert.equal(call('report',{...access(a),report}).ok,true);
const log=sheets.get('ocr_errors');assert.equal(log.rows.length,2);
const serialized=JSON.stringify(log.rows);for(const secret of ['secret','private-name',a.clan.inviteKey])assert.equal(serialized.includes(secret),false);
assert.equal(log.rows[1][1],a.clan.id);assert.equal(JSON.parse(log.rows[1][7])[0].text.trim(),'k 943');
assert.equal(call('report',{...access(a),report}).ok,false);assert.equal(log.rows.length,2);
assert.equal(call('report',{...access(b),report}).ok,true);assert.equal(log.rows.length,3);
assert.equal(JSON.stringify(call('list',access(a))).includes('OCR-02'),false);
props.set('OCR_REPORT_'+a.clan.id,JSON.stringify({time:Date.now()-31000,hour:Math.floor(Date.now()/3600000),count:120}));assert.equal(call('report',{...access(a),report}).ok,false);
const rotated=action('rotateInvite',{clanId:a.clan.id,adminToken:a.adminToken});assert.equal(rotated.ok,true);assert.notEqual(rotated.clan.inviteKey,a.clan.inviteKey);assert.equal(call('list',access(a)).ok,false);assert.equal(call('list',{clanId:a.clan.id,accessKey:rotated.clan.inviteKey}).records.length,1);
const logged=action('adminLogin',{clanId:a.clan.id,password:'administrator-a'});assert.equal(logged.ok,true);assert.equal(action('adminInfo',{clanId:a.clan.id,adminToken:a.adminToken}).ok,false);
const session=JSON.parse(props.get('ADMIN_SESSION_'+a.clan.id));session.expires=0;props.set('ADMIN_SESSION_'+a.clan.id,JSON.stringify(session));assert.equal(action('adminInfo',{clanId:a.clan.id,adminToken:logged.adminToken}).ok,false);
for(let i=0;i<5;i++)assert.equal(action('adminLogin',{clanId:b.clan.id,password:'wrong'}).ok,false);assert.equal(action('adminLogin',{clanId:b.clan.id,password:'administrator-b'}).ok,false);
// Existing clan migration preserves members and photos, and prevents a second claim.
const legacyKey=props.get('CLAN_KEY');const old=call('save',{accessKey:legacyKey,...payload});assert.equal(old.ok,true);
assert.equal(action('claimLegacy',{name:'Original',password:'legacy-admin-password',accessKey:'wrong'}).ok,false);
const legacy=action('claimLegacy',{name:'Original',server:'77',password:'legacy-admin-password',accessKey:legacyKey});assert.equal(legacy.ok,true);assert.equal(legacy.clan.server,'77');assert.equal(call('list',{accessKey:legacyKey}).records.length,1);assert.equal(call('photo',{accessKey:legacyKey,id:old.photos.skill}).ok,true);
assert.equal(action('claimLegacy',{name:'Hijack',password:'legacy-admin-password',accessKey:legacyKey}).ok,false);
const legacyRotate=action('rotateInvite',{clanId:'legacy',adminToken:legacy.adminToken});assert.equal(call('list',{accessKey:legacyKey}).ok,false);assert.equal(call('list',{accessKey:legacyRotate.clan.inviteKey}).records.length,1);
console.log('Clan isolation, photo ownership, administrator authority, lockout, session expiry, invite rotation and legacy migration passed.');
