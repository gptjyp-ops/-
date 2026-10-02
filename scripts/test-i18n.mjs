import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),dictionary=JSON.parse(fs.readFileSync('src/lib/en.json','utf8'));
const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
const document={documentElement:{lang:''},title:''};
const location={hash:'',search:'',origin:'https://example.test'};
const cache=new Map();
const api={googleEnabled:false,activeClanName:'Our test clan',invitedKey:'',savedAccessKey:()=>'',getRecords:async()=>[],photoUrl:async()=>'',leaveClan:()=>{}};
function load(filename){filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename);let source=fs.readFileSync(filename,'utf8');source=source.replaceAll('import.meta.env.BASE_URL',JSON.stringify('/clan-resource-manager/'));
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,resolveJsonModule:true}}).outputText;
 const exports={};cache.set(filename,exports);
 const localRequire=specifier=>{
  if(specifier.endsWith('/lib/api')||specifier==='./lib/api')return api;
  if(specifier.endsWith('/lib/screen-ocr')||specifier==='./lib/screen-ocr')return {regions:{skill:[],egg:[],mount:[],potion:[]}};
  if(specifier.endsWith('.json'))return JSON.parse(fs.readFileSync(path.resolve(path.dirname(filename),specifier),'utf8'));
  if(specifier.startsWith('.')||specifier.startsWith('@/')){const base=specifier.startsWith('@/')?path.resolve('src',specifier.slice(2)):path.resolve(path.dirname(filename),specifier);return load(fs.existsSync(base+'.tsx')?base+'.tsx':base+'.ts');}
  return require(specifier);
 };
 vm.runInNewContext(output,{exports,require:localRequire,localStorage:storage,document,location,URLSearchParams,console,window:{},setTimeout,clearTimeout},{filename});return exports;
}
const i18n=load('src/lib/i18n.ts');
assert.equal(i18n.getLanguage(),'ko');
assert.equal(i18n.translate('  소환 레벨 ','en'),'  Summon level ');
assert.equal(i18n.translate('SAVE-01 · 이 닉네임의 수정 비밀번호가 맞지 않습니다.','en'),'SAVE-01 · Incorrect edit password for this nickname.');
assert.equal(i18n.translate('소환 레벨 영역에서 유효한 숫자를 읽지 못했습니다.','en'),'Summon level could not be read in the detected area.');
assert.equal(i18n.translate('보유 수량의 자동 위치를 찾지 못했고 기본 영역에서도 숫자를 읽지 못했습니다.','en'),'Amount held could not be located or read in the fallback area.');
assert.equal(i18n.translate('스킬 합성 사진의 수량을 아직 읽지 못했습니다. 다시 인식해주세요.','en'),'The merge count in 스킬 has not been read. Scan the photo again.');
assert.equal(i18n.translate('CustomNickname 24k','en'),'CustomNickname 24k');
i18n.setLanguage('en');assert.equal(values.get('clanUiLanguage'),'en');assert.equal(document.documentElement.lang,'en');assert.equal(document.title,'Clan Resource Manager');assert.equal(i18n.guidePath(),'guide-en.html');
assert.equal(i18n.tr`다음: ${'Eggs'} 사진 올리기`,'Next: upload Eggs photo');
assert.equal(i18n.tr`${'Member123'}님의 ${'all resources'}를 저장했습니다.`,'Saved all resources for Member123.');
// All visible static Korean text in the translated components must have an English entry.
for(const filename of ['src/App.tsx','src/ClanPortal.tsx','src/OcrCheck.tsx','src/ScanDiagnostics.tsx','src/HelpSupport.tsx','src/PhotoPreview.tsx']){
 const source=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(source)==='t'&&ts.isStringLiteral(node.arguments[0]))assert.ok(dictionary[node.arguments[0].text.trim()],filename+': '+node.arguments[0].text);
 if(ts.isTaggedTemplateExpression(node)&&node.tag.getText(source)==='tr'){const n=node.template,key=ts.isTemplateExpression(n)?n.head.text+n.templateSpans.map((s,i)=>'{'+i+'}'+s.literal.text).join(''):n.text;assert.ok(dictionary[key.trim()],filename+': '+key);}ts.forEachChild(node,visit);}visit(source);
}
const App=load('src/App.tsx').default;
const en=renderToStaticMarkup(React.createElement(App));
for(const s of ['Your clan&#x27;s resources, together','In-game nickname','Save all four resources','Summon level','Current stage','Member resources','Green potions'])assert.ok(en.includes(s),s);
assert.ok(!/[가-힣]/.test(en),'English member form must not contain Korean UI text');
const inventory=load('src/lib/inventory.ts');assert.equal(inventory.quantity('3.3k'),3300);assert.equal(inventory.quantity('0'),0);
i18n.setLanguage('ko');assert.equal(document.documentElement.lang,'ko');assert.equal(i18n.guidePath(),'guide.html');const ko=renderToStaticMarkup(React.createElement(App));assert.ok(ko.includes('내 재화 등록'));assert.ok(ko.includes('현재 단계'));
assert.equal(i18n.translate('Saved all resources for Member123.','ko'),'Member123님의 all resources를 저장했습니다.');
const Switch=load('src/LanguageSwitch.tsx').default;const switchMarkup=renderToStaticMarkup(React.createElement(Switch));assert.ok(switchMarkup.includes('English'));assert.ok(switchMarkup.includes('aria-pressed="true"'));
assert.ok(fs.readFileSync('public/guide-en.html','utf8').includes('3.3k = approximately 3,300'));
console.log('Bilingual member form, dictionary coverage, error messages, language persistence and unchanged quantities passed.');
