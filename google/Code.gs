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
function sheet_(){var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');if(!id)throw Error('구글 저장 설정이 아직 완료되지 않았습니다.');return SpreadsheetApp.openById(id).getSheetByName('members');}
function rows_(s){return s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,8).getValues();}
function publicRow_(r){return {nickname:JSON.parse(r[0]),details:JSON.parse(r[3]),photos:JSON.parse(r[4]),updated_at:String(r[5])};}
function hash_(password,salt){return Utilities.computeHmacSha256Signature(salt+'\n'+password,PropertiesService.getScriptProperties().getProperty('PEPPER')).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function quantity_(s){var m=s.replace(/,/g,'').match(/^(\d+(?:\.\d+)?)\s*(만|천|억|[kKmMbB])?$/);if(!m)return null;var units={'만':10000,'천':1000,'억':100000000,k:1000,m:1000000,b:1000000000};var n=Math.round(Number(m[1])*(units[(m[2]||'').toLowerCase()]||1));return Number.isSafeInteger(n)&&n<=1e12?n:null;}
function validate_(v){
 var result={},has=false;['skill','egg','mount','potion'].forEach(function(g){if(!v||!v[g]||typeof v[g]!=='object')throw Error('재화 내용을 확인해주세요.');var item={};['amount','level','progress','target','selected','extra'].forEach(function(k){var s=v[g][k];if(typeof s!=='string'||s.length>24)throw Error('입력값을 확인해주세요.');s=s.trim();if(s&&(k==='amount'?quantity_(s)===null:!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s))||Number(s)>1e12))throw Error('수량은 0 이상의 숫자로 입력해주세요.');item[k]=s;if(s&&k!=='extra')has=true;});if(item.target!==''&&Number(item.target)>0&&item.progress!==''&&Number(item.progress)>Number(item.target))throw Error('진행 수량이 목표 수량보다 큽니다.');result[g]=item;});if(!has)throw Error('재화를 하나 이상 입력해주세요.');return result;
}
function clanRpc(method,payload){
 try{
  var key=PropertiesService.getScriptProperties().getProperty('CLAN_KEY');
  if(!key||!payload||typeof payload.accessKey!=='string'||hash_(payload.accessKey,'clan-access')!==hash_(key,'clan-access'))throw Error('클랜 입장 코드가 맞지 않습니다.');
  if(method==='list')return {ok:true,records:rows_(sheet_()).map(publicRow_).sort(function(a,b){return b.updated_at.localeCompare(a.updated_at);})};
  if(method==='photo'){
   var id=String(payload&&payload.id||'');var found=rows_(sheet_()).some(function(r){var photos=JSON.parse(r[4]);return KINDS_.some(function(k){return photos[k]===id;});});
   if(!found)throw Error('사진을 찾을 수 없습니다.');var file=DriveApp.getFileById(id),parents=file.getParents(),inFolder=false;var folderId=PropertiesService.getScriptProperties().getProperty('FOLDER_ID');while(parents.hasNext())if(parents.next().getId()===folderId)inFolder=true;if(!inFolder)throw Error('사진을 찾을 수 없습니다.');var blob=file.getBlob();return {ok:true,type:blob.getContentType(),base64:Utilities.base64Encode(blob.getBytes())};
  }
  if(method==='save')return save_(payload);
  throw Error('지원하지 않는 요청입니다.');
 }catch(e){return {ok:false,error:e.message||'구글 저장 요청에 실패했습니다.'};}
}
function save_(p){
 if(!p||typeof p.nickname!=='string'||typeof p.password!=='string')throw Error('닉네임과 비밀번호를 입력해주세요.');
 var nickname=p.nickname.trim().normalize('NFKC'),password=p.password;
 if(!nickname||nickname.length>24||password.length<6||password.length>100)throw Error('닉네임(24자 이하)과 수정 비밀번호(6자 이상)를 입력해주세요.');
 var details=validate_(p.inventory),uploads=p.photos||[];
 if(!Array.isArray(uploads)||uploads.length>6)throw Error('사진 수를 확인해주세요.');
 var seen={},decoded=uploads.map(function(u){if(!u||KINDS_.indexOf(u.kind)<0||seen[u.kind]||typeof u.base64!=='string'||u.base64.length>1400000)throw Error('사진 크기와 종류를 확인해주세요.');seen[u.kind]=true;var bytes=Utilities.base64Decode(u.base64);if(bytes.length>1024*1024||bytes.length<12)throw Error('사진은 저장용 압축 후 1MB 이하로 올려주세요.');var b=bytes.map(function(x){return (x+256)%256;});var jpg=b[0]===255&&b[1]===216,png=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71,webp=b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80;if(!jpg&&!png&&!webp)throw Error('유효한 사진이 아닙니다.');return {kind:u.kind,bytes:bytes,type:jpg?'image/jpeg':png?'image/png':'image/webp'};});
 var lock=LockService.getScriptLock();if(!lock.tryLock(15000))throw Error('다른 저장을 처리 중입니다. 잠시 후 다시 등록해주세요.');
 var fresh=[],committed=false;
 try{
  var s=sheet_(),rows=rows_(s),index=rows.findIndex(function(r){return JSON.parse(r[0])===nickname;}),old=index>=0?rows[index]:null;
  if(old&&Number(old[7])>Date.now())throw Error('비밀번호 확인 시도가 많습니다. 10분 뒤 다시 시도해주세요.');
  var salt=old?old[2]:Utilities.getUuid(),hash=hash_(password,salt);
  if(old&&old[1]!==hash){var fails=Number(old[6]||0)+1;s.getRange(index+2,7,1,2).setValues([[fails,fails>=5?Date.now()+600000:0]]);SpreadsheetApp.flush();throw Error('이 닉네임의 수정 비밀번호가 맞지 않습니다.');}
  var photos=old?JSON.parse(old[4]):{},obsolete=[],folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
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
