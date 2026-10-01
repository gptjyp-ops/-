import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/lib/screen-layout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {findLandmarks,locateRegions}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function image(barY,infoY){
 const p={width:400,height:870,data:new Uint8ClampedArray(400*870*4).fill(255)};
 const paint=(x,y,color)=>{const i=(y*400+x)*4;p.data.set([...color,255],i);};
 for(let y=barY;y<barY+17;y++)for(let x=30;x<94;x++)paint(x,y,[100,100,100]);
 for(let y=infoY-10;y<=infoY+10;y++)for(let x=302;x<=322;x++)if((x-312)**2+(y-infoY)**2<=100)paint(x,y,[0,0,0]);
 // A notification ring below the real icon must not become the anchor.
 for(let y=750;y<=770;y++)for(let x=302;x<=322;x++){const d=(x-312)**2+(y-760)**2;if(d<=100&&d>=75)paint(x,y,[0,0,0]);}
 return p;
}
const a=image(78,620),b=image(62,660),old=findLandmarks(a,'skill'),next=findLandmarks(b,'skill');
assert.equal(next.amount.y-old.amount.y,-16);
assert.equal(next.info.y-old.info.y,40);
const oldRegions=locateRegions(a,'skill'),newRegions=locateRegions(b,'skill');
for(const field of ['level','ratio'])assert.ok(Math.abs((newRegions.find(r=>r.field===field).rect[1]-oldRegions.find(r=>r.field===field).rect[1])*870-40)<1e-8);
assert.deepEqual(findLandmarks({width:400,height:870,data:new Uint8ClampedArray(400*870*4).fill(255)},'skill'),{amount:undefined,info:undefined});
assert.deepEqual(locateRegions(a,'eggMerge'),[]);
function mergeImage(offset){
 const p={width:400,height:870,data:new Uint8ClampedArray(400*870*4).fill(255)};
 const fill=(x,y,w,h,color)=>{for(let dy=y;dy<y+h;dy++)for(let dx=x;dx<x+w;dx++)p.data.set([...color,255],(dy*400+dx)*4);};
 fill(30,130+offset,340,180,[215,215,215]);
 fill(44,278+offset,6,10,[0,0,0]);fill(52,278+offset,6,10,[0,0,0]);
 // The separate Korean label after the number must be outside the crop.
 fill(66,278+offset,10,10,[0,0,0]);
 return p;
}
for(const kind of ['eggMerge','mountMerge']){
 const first=findLandmarks(mergeImage(0),kind).selected,shifted=findLandmarks(mergeImage(11),kind).selected;
 assert.equal(first.width,14);assert.equal(shifted.y-first.y,11);
 assert.equal(locateRegions(mergeImage(11),kind)[0].field,'selected');
}
console.log('Screen landmarks: shifted header, added skill row, false icon, merge count and missing anchors passed');
