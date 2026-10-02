import {useState} from 'react';
import {Dialog} from 'radix-ui';
import {ZoomIn,ZoomOut,X} from 'lucide-react';
import {t,useLanguage} from './lib/i18n';

export default function PhotoPreview({src,alt}:{src:string;alt:string}){
 useLanguage();
 const [open,setOpen]=useState(false),[zoom,setZoom]=useState<number|null>(null),[width,setWidth]=useState(0),[failed,setFailed]=useState(false);
 const changeZoom=(delta:number)=>setZoom(z=>Math.min(4,Math.max(.25,(z??1)+delta)));
 return <Dialog.Root open={open} onOpenChange={next=>{setOpen(next);if(next){setZoom(null);setFailed(false);}}}>
  <Dialog.Trigger asChild><button type="button" className="photo-preview" aria-label={alt+' · '+t('사진 확대')}><img src={src} alt={alt}/><span><ZoomIn size={16}/>{t('사진 확대')}</span></button></Dialog.Trigger>
  <Dialog.Portal><Dialog.Overlay className="photo-viewer-overlay"/><Dialog.Content className="photo-viewer">
   <div className="photo-viewer-heading"><Dialog.Title>{alt}</Dialog.Title><Dialog.Close asChild><button type="button" aria-label={t('닫기')}><X size={20}/></button></Dialog.Close></div>
   <Dialog.Description className="photo-viewer-help">{t('올린 사진을 크게 확인하세요. 확대 후 스크롤하면 다른 부분을 볼 수 있어요.')}</Dialog.Description>
   <div className="photo-viewer-controls">
    <button type="button" onClick={()=>changeZoom(-.25)} disabled={zoom!==null&&zoom<=.25} aria-label={t('축소')}><ZoomOut size={18}/></button>
    <output aria-live="polite">{zoom===null?t('화면에 맞춤'):Math.round(zoom*100)+'%'}</output>
    <button type="button" onClick={()=>changeZoom(.25)} disabled={zoom!==null&&zoom>=4} aria-label={t('확대')}><ZoomIn size={18}/></button>
    <button type="button" onClick={()=>setZoom(1)}>{t('원본 크기')}</button>
    <button type="button" onClick={()=>setZoom(null)}>{t('화면에 맞춤')}</button>
   </div>
   <div className="photo-viewer-stage" tabIndex={0} aria-label={t('확대한 사진')}>
    {failed?<p role="alert">{t('사진을 불러오지 못했습니다. 닫은 뒤 다시 열어주세요.')}</p>:<img src={src} alt={alt} onLoad={e=>setWidth(e.currentTarget.naturalWidth)} onError={()=>setFailed(true)} draggable={false} style={zoom===null?{maxWidth:'100%',maxHeight:'100%'}:{width:width?width*zoom:undefined,maxWidth:'none',maxHeight:'none'}}/>}
   </div>
  </Dialog.Content></Dialog.Portal>
 </Dialog.Root>;
}
