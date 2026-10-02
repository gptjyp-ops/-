import {t,tr,useLanguage} from './lib/i18n';
import {useState} from 'react';
import {reportText,type ScanReport} from './lib/scan-diagnostics';
export default function ScanDiagnostics({report}:{report:ScanReport}){useLanguage();
 const [copied,setCopied]=useState(false),[manual,setManual]=useState(false);const text=reportText(report);
 return <section className="scan-diagnostics" style={{padding:16,border:'1px solid #d9dde5',borderRadius:12,marginTop:12}}><p><strong>{t("사진 인식 진단 · ")}{report.version}</strong></p>{report.issues.length?<ul role="alert">{report.issues.map((i,n)=><li key={n}>{i.code} · {t(i.message)}</li>)}</ul>:<p>{t("필요한 숫자를 모두 읽었습니다. 사진과 값이 같은지 확인해주세요.")}</p>}<button type="button" className="capture-paste" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setManual(false);}catch{setManual(true);}}}>{copied?t("진단 내용 복사 완료"):t("오류 내용 복사")}</button>{manual&&<label>{t("자동 복사가 안 됩니다. 아래 내용을 전체 선택해 복사해주세요.")}<textarea readOnly value={text} rows={8} onFocus={e=>e.currentTarget.select()}/></label>}<details><summary>{t("진단 상세 보기")}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{text}</pre></details></section>;
}
