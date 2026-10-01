import type {Item} from './inventory';
export function maximumStatus(text:string):Partial<Item>{
 // Only a complete label in the summon-info crop counts as maximum.
 return text.split(/\r?\n/).some(line=>line.replace(/\s/g,'')==='최대')?{level:'100',progress:'',target:''}:{};
}
