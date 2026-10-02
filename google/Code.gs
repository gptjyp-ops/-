// Run setup_ once in the Apps Script editor, then deploy as a web app.
var CLAN_ORIGIN = 'https://gptjyp-ops.github.io';
var KINDS_ = ['skill','egg','eggMerge','mount','mountMerge','potion'];
function setup_() {
 var lock=LockService.getScriptLock();lock.waitLock(15000);
 try {
  var p=PropertiesService.getScriptProperties();
  if(!p.getProperty('SHEET_ID')){
   var book=SpreadsheetApp.create('클랜 재화관리');var sheet=book.getSheets()[0];sheet.setName('members');
   sheet.appendRow(['nickname_json','password_hash','salt','details_json','photos_json','updated_at','failed_attempts','lock_until']);sheet.setFrozenRows(1);
   p.setProperty('SHEET_ID',book.getId());
  }
  if(!p.getProperty('FOLDER_ID'))p.setProperty('FOLDER_ID',DriveApp.createFolder('클랜 재화관리 사진').getId());
  if(!p.getProperty('PEPPER'))p.setProperty('PEPPER',Utilities.getUuid()+Utilities.getUuid());
  if(!p.getProperty('CLAN_KEY'))p.setProperty('CLAN_KEY',Utilities.getUuid().replace(/-/g,'').slice(0,24));
  console.log('클랜 입장 코드: '+p.getProperty('CLAN_KEY'));
  console.log('준비 완료. 구글 드라이브에 클랜 재화관리 시트와 사진 폴더가 생성되었습니다.');
 }finally{lock.releaseLock();}
}
function doGet(e){
 var channel=String((e&&e.parameter&&e.parameter.channel)||'');
 if(!/^[a-zA-Z0-9-]{36}$/.test(channel))return HtmlService.createHtmlOutput('GitHub 클랜 재화관리 사이트에서 이용해주세요.');
 var t=HtmlService.createTemplateFromFile('Bridge');t.channel=channel;t.origin=CLAN_ORIGIN;
 return t.evaluate().setTitle('클랜 재화관리 저장 연결').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function sheet_(clan){if(clan)return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')).getSheetByName(clan.sheetName);var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');if(!id)throw Error('구글 저장 설정이 아직 완료되지 않았습니다.');return SpreadsheetApp.openById(id).getSheetByName('members');}
function rows_(s){return s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,8).getValues();}
function publicRow_(r){return {nickname:JSON.parse(r[0]),details:JSON.parse(r[3]),photos:JSON.parse(r[4]),updated_at:String(r[5])};}
function hash_(password,salt){return Utilities.computeHmacSha256Signature(salt+'\n'+password,PropertiesService.getScriptProperties().getProperty('PEPPER')).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function quantity_(s){var m=s.replace(/,/g,'').match(/^(\d+(?:\.\d+)?)\s*(만|천|억|[kKmMbB])?$/);if(!m)return null;var units={'만':10000,'천':1000,'억':100000000,k:1000,m:1000000,b:1000000000};var n=Math.round(Number(m[1])*(units[(m[2]||'').toLowerCase()]||1));return Number.isSafeInteger(n)&&n<=1e12?n:null;}
function validate_(v){
 var result={},has=false;['skill','egg','mount','potion'].forEach(function(g){if(!v||!v[g]||typeof v[g]!=='object')throw Error('재화 내용을 확인해주세요.');var item={};['amount','level','progress','target','selected','extra'].forEach(function(k){var s=v[g][k];if(typeof s!=='string'||s.length>24)throw Error('입력값을 확인해주세요.');s=s.trim();if(s&&(k==='amount'?quantity_(s)===null:!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s))||Number(s)>1e12))throw Error('수량은 0 이상의 숫자로 입력해주세요.');item[k]=s;if(s&&k!=='extra')has=true;});if(item.target!==''&&Number(item.target)>0&&item.progress!==''&&Number(item.progress)>Number(item.target))throw Error('진행 수량이 목표 수량보다 큽니다.');result[g]=item;});if(!has)throw Error('재화를 하나 이상 입력해주세요.');return result;
}
function clanRpc(method,payload){
 try{
  payload=payload||{};
  if(method==='list'&&payload.operation)return clanOperation_(payload);
  var clan=authorizeClan_(payload);var key=clan.key;
  if(method==='list')return {ok:true,clan:{id:clan.id,name:clan.name,server:clan.server||''},records:rows_(sheet_(clan)).map(publicRow_).sort(function(a,b){return b.updated_at.localeCompare(a.updated_at);})};
  if(method==='photo'){
   var id=String(payload&&payload.id||'');var found=rows_(sheet_(clan)).some(function(r){var photos=JSON.parse(r[4]);return KINDS_.some(function(k){return photos[k]===id;});});
   if(!found)throw Error('사진을 찾을 수 없습니다.');var file=DriveApp.getFileById(id),parents=file.getParents(),inFolder=false;var folderId=clan.folderId;while(parents.hasNext())if(parents.next().getId()===folderId)inFolder=true;if(!inFolder)throw Error('사진을 찾을 수 없습니다.');var blob=file.getBlob();return {ok:true,type:blob.getContentType(),base64:Utilities.base64Encode(blob.getBytes())};
  }
  if(method==='report')return reportScan_(payload,clan);
  if(method==='save')return save_(payload,clan);
  throw Error('지원하지 않는 요청입니다.');
 }catch(e){return {ok:false,error:e.message||'구글 저장 요청에 실패했습니다.'};}
}
function save_(p,clan){
 if(!p||typeof p.nickname!=='string'||typeof p.password!=='string')throw Error('닉네임과 비밀번호를 입력해주세요.');
 var nickname=p.nickname.trim().normalize('NFKC'),password=p.password;
 if(!nickname||nickname.length>24||password.length<6||password.length>100)throw Error('닉네임(24자 이하)과 수정 비밀번호(6자 이상)를 입력해주세요.');
 var details=validate_(p.inventory),uploads=p.photos||[];
 if(!Array.isArray(uploads)||uploads.length>6)throw Error('사진 수를 확인해주세요.');
 var seen={},decoded=uploads.map(function(u){if(!u||KINDS_.indexOf(u.kind)<0||seen[u.kind]||typeof u.base64!=='string'||u.base64.length>1400000)throw Error('사진 크기와 종류를 확인해주세요.');seen[u.kind]=true;var bytes=Utilities.base64Decode(u.base64);if(bytes.length>1024*1024||bytes.length<12)throw Error('사진은 저장용 압축 후 1MB 이하로 올려주세요.');var b=bytes.map(function(x){return (x+256)%256;});var jpg=b[0]===255&&b[1]===216,png=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71,webp=b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80;if(!jpg&&!png&&!webp)throw Error('유효한 사진이 아닙니다.');return {kind:u.kind,bytes:bytes,type:jpg?'image/jpeg':png?'image/png':'image/webp'};});
 var lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw Error('다른 저장을 처리 중입니다. 잠시 후 다시 등록해주세요.');
 var fresh=[],committed=false;
 try{
  var s=sheet_(clan),rows=rows_(s),index=rows.findIndex(function(r){return JSON.parse(r[0])===nickname;}),old=index>=0?rows[index]:null;
  if(old&&Number(old[7])>Date.now())throw Error('비밀번호 확인 시도가 많습니다. 10분 뒤 다시 시도해주세요.');
  var salt=old?old[2]:Utilities.getUuid(),hash=hash_(password,salt);
  if(old&&old[1]!==hash){var fails=Number(old[6]||0)+1;s.getRange(index+2,7,1,2).setValues([[fails,fails>=5?Date.now()+600000:0]]);SpreadsheetApp.flush();throw Error('이 닉네임의 수정 비밀번호가 맞지 않습니다.');}
  var photos=old?JSON.parse(old[4]):{},obsolete=[],folder=DriveApp.getFolderById(clan?clan.folderId:PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
  decoded.forEach(function(u){var file=folder.createFile(Utilities.newBlob(u.bytes,u.type,Utilities.getUuid()+'.'+(u.type==='image/jpeg'?'jpg':u.type==='image/png'?'png':'webp')));fresh.push(file.getId());if(photos[u.kind])obsolete.push(photos[u.kind]);photos[u.kind]=file.getId();});
  var row=[JSON.stringify(nickname),hash,salt,JSON.stringify(details),JSON.stringify(photos),new Date().toISOString(),0,0];
  if(old)s.getRange(index+2,1,1,8).setValues([row]);else s.appendRow(row);SpreadsheetApp.flush();committed=true;
  obsolete.forEach(function(id){try{DriveApp.getFileById(id).setTrashed(true);}catch(e){console.error('이전 사진 정리 실패');}});
  return {ok:true,photos:photos};
 }finally{
  if(!committed)fresh.forEach(function(id){try{DriveApp.getFileById(id).setTrashed(true);}catch(e){}});
  lock.releaseLock();
 }
}

// Each clan has its own member sheet, photo folder and administrator session.
function registry_(){
 var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');if(!id)throw Error('구글 저장 설정이 아직 완료되지 않았습니다.');
 var book=SpreadsheetApp.openById(id),s=book.getSheetByName('clans');
 if(!s){s=book.insertSheet('clans');s.appendRow(['id','name_json','invite_key','admin_hash','salt','member_sheet','folder_id','created_at','failed_attempts','lock_until','server']);s.setFrozenRows(1);}else if(s.getRange(1,11,1,1).getValues()[0][0]!=='server')s.getRange(1,11,1,1).setValues([['server']]);return s;
}
function clanRows_(s){return s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,11).getValues();}
function clanFrom_(r){return {id:String(r[0]),name:JSON.parse(r[1]),key:String(r[2]),sheetName:String(r[5]),folderId:String(r[6]),server:String(r[10]||'')};}
function publicClan_(r){return {id:r[0],name:JSON.parse(r[1]),inviteKey:r[2],server:String(r[10]||'')};}
function findClan_(id){var s=registry_(),rows=clanRows_(s),index=rows.findIndex(function(r){return r[0]===id;});if(index<0)throw Error('클랜을 찾을 수 없습니다. 클랜 주소를 확인해주세요.');return {sheet:s,row:rows[index],index:index};}
function authorizeClan_(p){
 var id=String(p.clanId||'legacy');if(!/^(legacy|[a-f0-9]{24})$/.test(id))throw Error('클랜 주소를 확인해주세요.');
 var clan;if(id==='legacy'){
  var book=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')),registry=book.getSheetByName('clans'),r=registry&&clanRows_(registry).find(function(r){return r[0]==='legacy';});
  clan=r?clanFrom_(r):{id:'legacy',name:'우리 클랜',key:PropertiesService.getScriptProperties().getProperty('CLAN_KEY'),sheetName:'members',folderId:PropertiesService.getScriptProperties().getProperty('FOLDER_ID')};
 }else clan=clanFrom_(findClan_(id).row);
 if(!clan.key||typeof p.accessKey!=='string'||hash_(p.accessKey,'clan-access')!==hash_(clan.key,'clan-access'))throw Error('클랜 입장 코드가 맞지 않습니다.');return clan;
}
function clanAdmin_(p){
 var found=findClan_(String(p.clanId||'')),session=PropertiesService.getScriptProperties().getProperty('ADMIN_SESSION_'+found.row[0]);
 if(!session||typeof p.adminToken!=='string')throw Error('클랜장 로그인이 필요합니다.');var data=JSON.parse(session);
 if(data.expires<Date.now()||data.hash!==hash_(p.adminToken,'admin-session'))throw Error('클랜장 로그인이 만료되었습니다. 다시 로그인해주세요.');return found;
}
function adminReply_(found){
 var token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');PropertiesService.getScriptProperties().setProperty('ADMIN_SESSION_'+found.row[0],JSON.stringify({hash:hash_(token,'admin-session'),expires:Date.now()+21600000}));
 return {ok:true,clan:publicClan_(found.row),adminToken:token};
}
function clanServer_(server){if(server===undefined||server==='')return '';if(typeof server!=='string'||!/^\d{1,6}$/.test(server.trim())||Number(server.trim())<1)throw Error('서버 번호는 1 이상의 숫자로 입력해주세요.');return String(Number(server.trim()));}
function clanName_(name){if(typeof name!=='string'||!name.trim()||name.trim().length>40)throw Error('클랜 이름은 1~40자로 입력해주세요.');return name.trim().normalize('NFKC');}
function clanPassword_(password){if(typeof password!=='string'||password.length<10||password.length>100)throw Error('클랜장 비밀번호는 10~100자로 정해주세요.');return password;}
function clanOperation_(p){
 var op=p.operation;if(op==='capabilities')return {ok:true,multiClan:true,diagnosticReports:true,serverSelection:true,servers:Array.from(new Set(clanRows_(registry_()).map(function(r){return String(r[10]||'');}).filter(function(s){return /^\d{1,6}$/.test(s);}))).sort(function(a,b){return Number(a)-Number(b);})};
 var lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw Error('다른 요청을 처리 중입니다. 잠시 후 다시 시도해주세요.');
 try{
  if(op==='createClan'||op==='claimLegacy'){
   var name=clanName_(p.name),server=clanServer_(p.server),password=clanPassword_(p.password),s=registry_(),rows=clanRows_(s);
   var id=op==='claimLegacy'?'legacy':Utilities.getUuid().replace(/-/g,'').slice(0,24),key,memberSheet,folderId;
   if(op==='claimLegacy'){
    var legacy=authorizeClan_({clanId:'legacy',accessKey:p.accessKey});if(rows.some(function(r){return r[0]==='legacy';}))throw Error('기존 클랜은 이미 클랜장 등록을 마쳤습니다. 클랜장 로그인으로 들어가주세요.');key=legacy.key;memberSheet='members';folderId=legacy.folderId;
   }else{
    // Bound creation per day to protect the shared storage account from unbounded signups.
    var day=new Date().toISOString().slice(0,10);if(rows.filter(function(r){return String(r[7]).slice(0,10)===day;}).length>=20)throw Error('오늘의 신규 클랜 생성 한도에 도달했습니다. 다음 날 다시 시도해주세요.');
    key=Utilities.getUuid().replace(/-/g,'');memberSheet='clan_'+id;
    var book=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')),members=book.insertSheet(memberSheet);
    members.appendRow(['nickname_json','password_hash','salt','details_json','photos_json','updated_at','failed_attempts','lock_until']);members.setFrozenRows(1);
    folderId=DriveApp.createFolder('클랜 재화관리 '+id).getId();
   }
   var salt=Utilities.getUuid();s.appendRow([id,JSON.stringify(name),key,hash_(password,salt),salt,memberSheet,folderId,new Date().toISOString(),0,0,server]);SpreadsheetApp.flush();return adminReply_({row:clanRows_(s).find(function(r){return r[0]===id;})});
  }
  if(op==='adminLogin'){
   var found=findClan_(String(p.clanId||'')),r=found.row;if(Number(r[9])>Date.now())throw Error('클랜장 비밀번호 확인 시도가 많습니다. 10분 뒤 다시 시도해주세요.');
   if(typeof p.password!=='string'||p.password.length>100||hash_(p.password,r[4])!==r[3]){var fails=Number(r[8]||0)+1;found.sheet.getRange(found.index+2,9,1,2).setValues([[fails,fails>=5?Date.now()+600000:0]]);SpreadsheetApp.flush();throw Error('클랜장 비밀번호가 맞지 않습니다.');}
   found.sheet.getRange(found.index+2,9,1,2).setValues([[0,0]]);return adminReply_(found);
  }
  var found=clanAdmin_(p);
  if(op==='adminInfo')return {ok:true,clan:publicClan_(found.row)};
  if(op==='renameClan'){found.row[1]=JSON.stringify(clanName_(p.name));found.sheet.getRange(found.index+2,2,1,1).setValues([[found.row[1]]]);}
  else if(op==='setClanServer'){var server=clanServer_(p.server);if(!server)throw Error('서버 번호를 입력해주세요.');found.row[10]=server;found.sheet.getRange(found.index+2,11,1,1).setValues([[server]]);}
  else if(op==='rotateInvite'){found.row[2]=Utilities.getUuid().replace(/-/g,'');found.sheet.getRange(found.index+2,3,1,1).setValues([[found.row[2]]]);}
  else if(op==='adminLogout'){PropertiesService.getScriptProperties().setProperty('ADMIN_SESSION_'+found.row[0],'');return {ok:true};}
  else throw Error('지원하지 않는 요청입니다.');
  SpreadsheetApp.flush();return {ok:true,clan:publicClan_(found.row)};
 }finally{lock.releaseLock();}
}

// Diagnostic reports are private to the storage owner, never member records.
function reportScan_(p,clan){
 var r=p.report,fields=['amount','level','ratio','selected'];
 if(!r||KINDS_.indexOf(r.kind)<0||typeof r.version!=='string'||!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(r.version)||['일반','호환'].indexOf(r.mode)<0)throw Error('오류 진단 형식을 확인해주세요.');
 if(!Array.isArray(r.issues)||!r.issues.length||r.issues.length>8||!Array.isArray(r.attempts)||r.attempts.length>30)throw Error('오류 진단 형식을 확인해주세요.');
 var issues=r.issues.map(function(i){if(!i||! /^(OCR-0[1-5]|IMG-01)$/.test(i.code)||i.field!==undefined&&fields.indexOf(i.field)<0)throw Error('오류 진단 형식을 확인해주세요.');return {code:i.code,field:i.field||''};});
 var attempts=r.attempts.map(function(a){if(!a||fields.indexOf(a.field)<0||['adaptive','fallback'].indexOf(a.source)<0||typeof a.text!=='string')throw Error('오류 진단 형식을 확인해주세요.');return {field:a.field,source:a.source,text:a.text.replace(/[^0-9.,/kKmMbB\s]/g,'').slice(0,80)};});
 var image={};['bytes','width','height'].forEach(function(k){var n=r.image&&r.image[k];if(n!==undefined){if(!Number.isSafeInteger(n)||n<0||n>100000000)throw Error('오류 진단 형식을 확인해주세요.');image[k]=n;}});image.type=r.image&&/^image\/(png|jpeg|webp)$/.test(r.image.type)?r.image.type:'unknown';
 var lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw Error('다른 요청을 처리 중입니다. 잠시 후 다시 시도해주세요.');
 try{
  var props=PropertiesService.getScriptProperties(),slot='OCR_REPORT_'+clan.id,now=Date.now(),previous=JSON.parse(props.getProperty(slot)||'{}');
  if(previous.time&&now-previous.time<30000)throw Error('오류는 30초마다 전송할 수 있습니다.');
  var hour=Math.floor(now/3600000),count=previous.hour===hour?Number(previous.count||0):0;if(count>=120)throw Error('오류 전송 한도에 도달했습니다. 진단 내용을 복사해주세요.');
  var book=SpreadsheetApp.openById(props.getProperty('SHEET_ID')),s=book.getSheetByName('ocr_errors');
  if(!s){s=book.insertSheet('ocr_errors');s.appendRow(['received_at','clan_id','version','kind','mode','image_json','issues_json','attempts_json']);s.setFrozenRows(1);}
  s.appendRow([new Date(now).toISOString(),clan.id,r.version,r.kind,r.mode,JSON.stringify(image),JSON.stringify(issues),JSON.stringify(attempts)]);
  if(s.getLastRow()>1001)s.deleteRows(2,s.getLastRow()-1001);
  SpreadsheetApp.flush();props.setProperty(slot,JSON.stringify({time:now,hour:hour,count:count+1}));return {ok:true};
 }finally{lock.releaseLock();}
}
