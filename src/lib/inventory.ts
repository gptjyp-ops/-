import {parseNumber} from './ocr';
export const groups=['skill','egg','mount','potion'] as const;
export type Group=typeof groups[number];
export const titles:Record<Group,string>={skill:'스킬',egg:'알 / 펫',mount:'탈것',potion:'녹색 물약'};
export const photoKinds=['skill','egg','eggMerge','mount','mountMerge','potion'] as const;
export type PhotoKind=typeof photoKinds[number];
export const photoTitles:Record<PhotoKind,string>={skill:'스킬 화면',egg:'알 소환 화면',eggMerge:'알 합성 화면',mount:'탈것 소환 화면',mountMerge:'탈것 합성 화면',potion:'녹색 물약 화면'};
export type Item={amount:string;level:string;progress:string;target:string;selected:string;extra:string};
export type Inventory=Record<Group,Item>;
export const emptyItem=():Item=>({amount:'',level:'',progress:'',target:'',selected:'',extra:'0'});
export const emptyInventory=():Inventory=>({skill:emptyItem(),egg:emptyItem(),mount:emptyItem(),potion:emptyItem()});
export const totalMerge=(i:Item)=>i.selected===''&&(!i.extra||i.extra==='0')?null:Number(i.selected||0)+Number(i.extra||0);
export const quantity=(s:string)=>s===''?null:parseNumber(s);
export const approximate=(s:string)=>/[kmb만천억]/i.test(s);
export function validateInventory(value:unknown):Inventory{
 if(!value||typeof value!=='object')throw Error('재화 내용을 확인해주세요.');
 const result=emptyInventory();let hasData=false;
 for(const g of groups){const item=(value as any)[g];if(!item||typeof item!=='object')throw Error('재화 내용을 확인해주세요.');for(const key of Object.keys(result[g]) as (keyof Item)[]){const raw=item[key];if(typeof raw!=='string'||raw.length>24)throw Error('입력값을 확인해주세요.');const s=raw.trim();
 if(s&&(key==='amount'?quantity(s)===null:!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s))||Number(s)>1e12))throw Error('수량은 0 이상의 숫자로 입력해주세요.');
 result[g][key]=s;if(s&&key!=='extra')hasData=true;}
 if(result[g].target!==''&&Number(result[g].target)>0&&result[g].progress!==''&&Number(result[g].progress)>Number(result[g].target))throw Error('진행 수량이 목표 수량보다 큽니다.');}
 if(!hasData)throw Error('재화를 하나 이상 입력해주세요.');return result;
}

export function incompleteGroups(value:Inventory):Group[]{
 return groups.filter(g=>{const item=value[g],required:(keyof Item)[]=g==='potion'?['amount']:item.level==='100'?['amount','level']:['amount','level','progress'];return required.some(key=>item[key].trim()==='');});
}
