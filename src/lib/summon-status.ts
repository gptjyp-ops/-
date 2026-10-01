import type {Item} from './inventory';
export function ascensionStatus(level:string):string{
 if(!/^\d+$/.test(level)||Number(level)>100)return '미입력';
 return Number(level)===100?'승천대기':'승천불가';
}
export function maximumStatus(text:string):Partial<Item>{
 // Only a complete label in the summon-info crop counts as maximum.
 return text.split(/\r?\n/).some(line=>line.replace(/\s/g,'')==='최대')?{level:'100',progress:'',target:''}:{};
}
