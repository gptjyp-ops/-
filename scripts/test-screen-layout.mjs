import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/lib/screen-layout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {findLandmarks,locateRegions,ratioCandidates}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
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
// Downscaled filled icons can have only ~58% dark pixels because of the
// white information glyph and antialiasing. A notification ring is sparser.
const small=image(62,660);
let erased=0;
for(let y=651;y<=665;y++)for(let x=307;x<=317;x++){
 const i=(y*400+x)*4;
 if(erased<60&&small.data[i]===0){small.data.set([255,255,255,255],i);erased++;}
}
assert.ok(findLandmarks(small,'skill').info.y>=650&&findLandmarks(small,'skill').info.y<=653);
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
const statusSource=ts.transpileModule(fs.readFileSync('src/lib/summon-status.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {maximumStatus}=await import('data:text/javascript;base64,'+Buffer.from(statusSource).toString('base64'));
assert.deepEqual(maximumStatus('최대'),{level:'100',progress:'',target:''});
assert.deepEqual(maximumStatus('Lv. 100\n최 대'),{level:'100',progress:'',target:''});
for(const text of ['41/110','100','최대 5MB','최대치'])assert.deepEqual(maximumStatus(text),{});
console.log('Screen landmarks and maximum summon level checks passed');

const narrow={field:'ratio',mode:'mixed',rect:[.69,.81,.116,.013]};
const alternatives=ratioCandidates(narrow);
assert.equal(alternatives[0],narrow);
assert.equal(alternatives[1].mode,'raw');
assert.ok(alternatives[1].rect[1]<narrow.rect[1]);
assert.ok(alternatives[1].rect[3]>narrow.rect[3]);
for(const r of ratioCandidates({...narrow,rect:[0,0,1,1]}))for(const n of r.rect)assert.ok(n>=0&&n<=1);

// A cropped screenshot can put the potion count right at the top.
// A longer yellow technology title below it must not be read as the count.
const potion={width:400,height:870,data:new Uint8ClampedArray(400*870*4).fill(255)};
function yellowGlyph(x,y,width=8,height=12){for(let row=y;row<y+height;row++)for(let col=x;col<x+width;col++)potion.data.set([240,220,20,255],(row*400+col)*4);}
for(const x of [120,130,140])yellowGlyph(x,3);
for(const x of [100,114,128,142])yellowGlyph(x,150,12,14);
assert.deepEqual(findLandmarks(potion,'potion').amount,{x:120,y:3,width:28,height:12});

const whitePotion={width:400,height:870,data:new Uint8ClampedArray(400*870*4).fill(255)};
for(const y0 of [20,65])for(let y=y0;y<y0+14;y++)for(let x=22;x<82;x++)whitePotion.data.set([100,100,100,255],(y*400+x)*4);
assert.equal(findLandmarks(whitePotion,'potion').amount.y,65);
assert.equal(locateRegions(whitePotion,'potion')[0].mode,'white');

// The clan technology page has the green vial in row one; the overview
// has a red potion in row one and the green vial in row two.
for(const vialY of [78,120]){
 const p={width:400,height:870,data:new Uint8ClampedArray(400*870*4).fill(255)};
 const fill=(x,y,width,height,color)=>{for(let row=y;row<y+height;row++)for(let col=x;col<x+width;col++)p.data.set([...color,255],(row*400+col)*4);};
 for(const y of [78,120])fill(32,y,60,14,[100,100,100]);
 // Red potion and every other resource have green square '+' controls too.
 for(const y of [78,120])fill(25,y+12,8,8,[20,210,35]);
 // A diagonally tilted tube has a near-square green bounding box.
 fill(14,vialY+3,14,15,[20,210,35]);
 // Another yellow numeric-looking label must not override the matched vial.
 fill(50,160,8,12,[240,220,20]);
 assert.equal(findLandmarks(p,'potion').amount.y,vialY);
 assert.equal(locateRegions(p,'potion')[0].mode,'mixed');
}
