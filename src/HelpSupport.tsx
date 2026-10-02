import {useState} from 'react';
import {BookOpen,Heart} from 'lucide-react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from './components/ui/sheet';

// Set only after the operator supplies a public donation page. Never put secrets here.
const donationUrl='';
export default function HelpSupport(){
 const [open,setOpen]=useState(false);
 return <><nav className="help-support" aria-label="사용 안내와 후원"><a href={import.meta.env.BASE_URL+'guide.html'} target="_blank" rel="noreferrer"><BookOpen size={17}/>사용법 · 연습 책자</a><button type="button" onClick={()=>setOpen(true)}><Heart size={17}/>운영 후원</button></nav><Sheet open={open} onOpenChange={setOpen}><SheetContent className="support-sheet overflow-y-auto"><SheetHeader><SheetTitle>클랜 재화관리 운영 후원</SheetTitle><SheetDescription>함께 사용하는 서비스를 응원해주세요.</SheetDescription></SheetHeader><div className="support-body"><p>클랜원들이 사진을 올리고 재화를 모아 볼 수 있도록 서비스를 관리하고 있습니다.</p><h3>후원은 어디에 사용하나요?</h3><ul><li>사진 저장 공간과 서비스 운영</li><li>사진 인식 오류 수정과 기능 개선</li><li>사용 안내와 연습 자료 제작</li></ul><p>후원은 자율입니다. 후원 여부에 따른 이용 기능의 차이는 없습니다.</p>{donationUrl?<a className="submit" href={donationUrl} target="_blank" rel="noreferrer">후원 페이지 열기</a>:<div className="support-pending" role="status"><strong>후원 방법 준비 중</strong><p>운영자가 계좌 또는 후원 링크를 등록하면 이곳에서 안내합니다. 현재는 결제나 송금이 진행되지 않습니다.</p></div>}<a href={import.meta.env.BASE_URL+'guide.html'} target="_blank" rel="noreferrer">처음이라면 연습 책자부터 보기</a></div></SheetContent></Sheet></>;
}
