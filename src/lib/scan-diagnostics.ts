import type {Item,PhotoKind} from './inventory';
export const scanVersion='2026-10-02.3';
export type ScanField='amount'|'level'|'ratio'|'selected';
export type ScanAttempt={field:ScanField;source:'adaptive'|'fallback';text:string};
export type ScanIssue={code:string;field?:ScanField;message:string};
export type ScanReport={version:string;kind:PhotoKind;mode:string;image:{width?:number;height?:number;bytes:number;type:string};attempts:ScanAttempt[];issues:ScanIssue[]};
const labels:Record<ScanField,string>={amount:'보유 수량',level:'소환 레벨',ratio:'현재 단계',selected:'합성 수량'};
export function missingIssues(kind:PhotoKind,item:Partial<Item>,located:Partial<Record<ScanField,unknown>>):ScanIssue[]{
 const fields:ScanField[]=kind.endsWith('Merge')?['selected']:kind==='potion'?['amount']:item.level==='100'?['amount','level']:['amount','level','ratio'];
 return fields.filter(field=>field==='ratio'?item.progress===undefined||item.progress===''||!item.target:item[field]===undefined||item[field]==='').map(field=>({code:located[field]?'OCR-03':'OCR-02',field,message:located[field]?`${labels[field]} 영역에서 유효한 숫자를 읽지 못했습니다.`:`${labels[field]}의 자동 위치를 찾지 못했고 기본 영역에서도 숫자를 읽지 못했습니다.`}));
}
export class ScanFailure extends Error{
 report:ScanReport;
 constructor(report:ScanReport){super(report.issues.map(i=>`${i.code} · ${i.message}`).join('\n'));this.name='ScanFailure';this.report=report;}
}
export function newScanReport(file:File,kind:PhotoKind,fresh:boolean):ScanReport{return {version:scanVersion,kind,mode:fresh?'호환':'일반',image:{bytes:file.size,type:file.type},attempts:[],issues:[]};}
export function reportText(report:ScanReport){return JSON.stringify(report,null,2);}
