import type {PhotoKind} from './inventory';
export type Box={x:number;y:number;width:number;height:number};
export type Pixels={width:number;height:number;data:ArrayLike<number>};

// Find interface landmarks in the image, rather than assuming a phone height
// or a fixed number of rows in the skill collection.
function components(p:Pixels,area:Box,test:(r:number,g:number,b:number)=>boolean,minDensity=.38):Box[]{
 const left=Math.max(0,Math.floor(area.x)),top=Math.max(0,Math.floor(area.y));
 const right=Math.min(p.width,Math.ceil(area.x+area.width)),bottom=Math.min(p.height,Math.ceil(area.y+area.height));
 const width=right-left,height=bottom-top,mask=new Uint8Array(width*height),queue=new Int32Array(width*height),boxes:Box[]=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=((y+top)*p.width+x+left)*4;mask[y*width+x]=test(p.data[i],p.data[i+1],p.data[i+2])?1:0;}
 for(let start=0;start<mask.length;start++){if(!mask[start])continue;let read=0,write=1,minX=width,minY=height,maxX=0,maxY=0;queue[0]=start;mask[start]=0;
  while(read<write){const i=queue[read++],x=i%width,y=Math.floor(i/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const n of [x>0?i-1:-1,x<width-1?i+1:-1,y>0?i-width:-1,y<height-1?i+width:-1])if(n>=0&&mask[n]){mask[n]=0;queue[write++]=n;}
  }
  const w=maxX-minX+1,h=maxY-minY+1;
  if(write/(w*h)>minDensity)boxes.push({x:minX+left,y:minY+top,width:w,height:h});
 }
 return boxes;
}
export function findLandmarks(p:Pixels,kind:PhotoKind):{amount?:Box;info?:Box;selected?:Box;amountMode?:'white'|'yellow'}{
 const w=p.width,h=p.height,result:{amount?:Box;info?:Box;selected?:Box;amountMode?:'white'|'yellow'}={};
 if(kind==='eggMerge'||kind==='mountMerge'){
  const panels=components(p,{x:.05*w,y:.08*h,width:.90*w,height:.38*h},(r,g,b)=>Math.min(r,g,b)>170&&Math.max(r,g,b)<240&&Math.max(r,g,b)-Math.min(r,g,b)<25)
   .filter(b=>b.width>.60*w&&b.height>.20*w).sort((a,b)=>a.y-b.y);
  const panel=panels[0];
  if(panel){
   const glyphs=components(p,{x:panel.x+.02*w,y:panel.y+panel.height-.11*w,width:.24*w,height:.075*w},(r,g,b)=>Math.max(r,g,b)<100,.12)
    .filter(b=>b.height>.017*w&&b.height<.045*w&&b.width<.04*w).sort((a,b)=>a.x-b.x);
   const first=glyphs[0];
   if(first){const number={...first};for(const b of glyphs.slice(1)){if(Math.abs(b.y-first.y)>.012*w)continue;if(b.x-(number.x+number.width)>.008*w)break;const bottom=Math.max(number.y+number.height,b.y+b.height);number.width=b.x+b.width-number.x;number.y=Math.min(number.y,b.y);number.height=bottom-number.y;}result.selected=number;}
  }
 }
 if(kind==='skill'||kind==='egg'||kind==='mount'){
  const area=kind==='mount'?{x:.34*w,y:.17*h,width:.32*w,height:.25*h}:{x:.04*w,y:.025*h,width:.23*w,height:.16*h};
  const bars=components(p,area,(r,g,b)=>Math.min(r,g,b)>40&&Math.max(r,g,b)<185&&Math.max(r,g,b)-Math.min(r,g,b)<40)
   .filter(b=>b.width>.09*w&&b.height>.022*w&&b.height<.075*w&&b.width/b.height>2.3);
  bars.sort((a,b)=>a.y-b.y);result.amount=bars[0];
  const circles=components(p,{x:.70*w,y:.43*h,width:.17*w,height:.44*h},(r,g,b)=>Math.max(r,g,b)<90,.60)
   .filter(b=>b.width>.025*w&&b.width<.075*w&&b.height/b.width>.8&&b.height/b.width<1.25);
  circles.sort((a,b)=>b.y-a.y);result.info=circles[0];
 }
 if(kind==='potion'){
  const digits=components(p,{x:.08*w,y:0,width:.32*w,height:.24*h},(r,g,b)=>r>150&&g>150&&b<140)
   .filter(b=>b.height>.018*w&&b.height<.055*w&&b.width<.05*w).sort((a,b)=>a.x-b.x);
  const lines:Box[]=[];
  for(const b of digits){const line=lines.find(a=>Math.abs((a.y+a.height/2)-(b.y+b.height/2))<.012*w&&b.x-(a.x+a.width)<.025*w);
   if(line){const bottom=Math.max(line.y+line.height,b.y+b.height);line.width=b.x+b.width-line.x;line.y=Math.min(line.y,b.y);line.height=bottom-line.y;}else lines.push({...b});}
  result.amount=lines.sort((a,b)=>a.y-b.y)[0];
  const bars=components(p,{x:.025*w,y:0,width:.38*w,height:.24*h},(r,g,b)=>Math.min(r,g,b)>40&&Math.max(r,g,b)<185&&Math.max(r,g,b)-Math.min(r,g,b)<40)
   .filter(b=>b.width>.09*w&&b.width<.35*w&&b.height>.018*w&&b.height<.075*w&&b.width/b.height>2.3).sort((a,b)=>a.y-b.y);
  const bar=bars[1];
  if(bar&&!result.amount){result.amount=bar;result.amountMode='white';}

 }
 return result;
}
export type LocatedRegion={field:'amount'|'level'|'ratio'|'selected';rect:[number,number,number,number];mode:'white'|'black'|'yellow'|'mixed'|'raw'};
export function locateRegions(p:Pixels,kind:PhotoKind):LocatedRegion[]{
 const landmarks=findLandmarks(p,kind),out:LocatedRegion[]=[],w=p.width;
 const rect=(x:number,y:number,width:number,height:number):LocatedRegion['rect']=>[x/w,y/p.height,width/w,height/p.height];
 if(landmarks.amount){const b=landmarks.amount,pad=kind==='potion'?2:.005*w;out.push({field:'amount',rect:rect(b.x-pad,b.y-pad,b.width+2*pad,b.height+2*pad),mode:kind==='potion'?(landmarks.amountMode||'yellow'):'white'});}
 if(landmarks.info){const b=landmarks.info,cx=b.x+b.width/2,bottom=b.y+b.height;
  out.push({field:'level',rect:rect(cx-.055*w,bottom+.003*w,.11*w,.035*w),mode:'black'});
  out.push({field:'ratio',rect:rect(cx-.058*w,bottom+.044*w,.116*w,.023*w),mode:'mixed'});
 }
 if(landmarks.selected){const b=landmarks.selected,pad=.005*w;out.push({field:'selected',rect:rect(b.x-pad,b.y-pad,b.width+2*pad,b.height+2*pad),mode:'black'});}
 return out;
}

// Keep small progress digits above the bar baseline inside a second crop.
export function ratioCandidates(region:LocatedRegion):LocatedRegion[]{
 if(region.field!=='ratio')return [region];
 const [x,y,w,h]=region.rect,top=Math.max(0,y-h*.28);
 const expanded:LocatedRegion={...region,rect:[Math.max(0,x-.01),top,Math.min(w+.02,1-Math.max(0,x-.01)),Math.min(h*1.3,1-top)]};
 const taller:LocatedRegion={...expanded,rect:[expanded.rect[0],Math.max(0,y-h*.55),expanded.rect[2],Math.min(h*1.7,1-Math.max(0,y-h*.55))]};
 return [region,{...expanded,mode:'raw'},expanded,{...taller,mode:'white'},{...taller,mode:'raw'}];
}
