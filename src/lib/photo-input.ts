const types:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
export const maximumPhotoBytes=10*1024*1024;
export function normalizePhoto(file:File):File|null{
 if(Object.values(types).includes(file.type))return file;
 if(file.type&&file.type!=='application/octet-stream')return null;
 const type=types[file.name.split('.').at(-1)?.toLowerCase()||''];
 return type?new File([file],file.name,{type,lastModified:file.lastModified}):null;
}
export function imageFromTransfer(transfer:Pick<DataTransfer,'files'|'items'>):File|null{
 for(const file of Array.from(transfer.files)){const image=normalizePhoto(file);if(image)return image;}
 for(const item of Array.from(transfer.items)){if(item.kind==='file'){const file=item.getAsFile();if(file){const image=normalizePhoto(file);if(image)return image;}}}
 return null;
}
export async function readScreenshot():Promise<File>{
 if(!navigator.clipboard?.read)throw Error('이 브라우저에서는 붙여넣기 버튼을 사용할 수 없어요. 사진 칸에서 Ctrl+V를 누르거나 캡처 파일을 선택해주세요.');
 let items:ClipboardItems;
 try{items=await navigator.clipboard.read();}catch{throw Error('캡처를 복사한 뒤 사진 칸에서 Ctrl+V를 누르거나 캡처 파일을 선택해주세요.');}
 for(const item of items){const type=item.types.find(t=>Object.values(types).includes(t));if(type){const blob=await item.getType(type);return new File([blob],'capture.'+(type==='image/jpeg'?'jpg':type.split('/')[1]),{type});}}
 throw Error('복사된 이미지가 없어요. 화면을 캡처해서 복사한 뒤 다시 눌러주세요.');
}
