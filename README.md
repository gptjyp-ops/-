# 클랜 재화관리

포지마스터 클랜원이 스크린샷을 직접 올려 재화를 기록하고, 같은 사이트에서 개인별 현황과 클랜 합계를 확인하는 프로그램입니다. **GitHub Pages 화면 + 구글 시트 기록 + 구글 드라이브 사진** 구조입니다.

## 포함된 기능

- 스킬: 보유 재화, 소환 레벨, 진행 수량 / 목표 수량
- 알·펫과 탈것: 보유 재화, 소환 레벨·진행도, 합성 선택 수량 + 수동 추가 수량(+α)
- 녹색 물약: 수량만 기록
- 브라우저 숫자 인식 후 직접 확인·수정
- 사진 여섯 종류별 증빙과 개인별 상세 조회
- 클랜 공통 입장 코드와 닉네임별 수정 비밀번호
- `35.8k`와 같은 원래 표시를 유지하고 환산값·합계는 ‘약’으로 표시

점수 계산은 추후 추가합니다. 실제 클랜 사진·재화 기록·입장 코드·계정 비밀번호는 저장소에 넣지 않습니다.

## 실제 사이트를 여는 방법

[클랜 재화관리 사이트 열기](https://gptjyp-ops.github.io/clan-resource-manager/)

구글 계정에서 Apps Script를 실행·배포한 뒤 GitHub Pages에 연결해야 합니다. **코드 업로드만으로 사이트나 공유 저장소가 자동 개설되지는 않습니다.**

[구글 연결 순서 보기](google/README.md)

## 개발

```sh
npm ci --ignore-scripts
cp .env.example .env
# .env에 VITE_GOOGLE_SCRIPT_URL 설정
npm run dev
npm run check
node scripts/test-google.mjs
npm run build
```

Google Bridge는 `https://gptjyp-ops.github.io`에서만 메시지를 받도록 설정되어 있습니다. 로컬 테스트 또는 소유 계정 변경 시 `google/Code.gs`의 `CLAN_ORIGIN`을 해당 사이트의 정확한 origin으로 바꾸고 구글 앱을 재배포하세요. 운영 도메인에는 경로를 넣지 않습니다.

인식 작업용 Tesseract 파일은 빌드 때 설치 패키지에서 복사합니다. 사이트에서 외부 유료 OCR API를 호출하지 않습니다. 저장 사진은 최대 1600px JPEG로 압축하며 숫자 인식은 원본을 사용합니다.

구글 연동 코드의 저장·조회·검증은 로컬 모의 서비스로 검사합니다. 실제 구글 로그인, Drive 권한, Apps Script iframe 연결과 iOS 동작은 배포 후 추가 검증이 필요합니다.

`worker/`, `wrangler.jsonc`, `migrations/`와 수동 Worker workflow는 이전 Cloudflare 구현의 선택사항입니다. 구글 방식에서는 실행할 필요가 없습니다. Pages workflow는 `src/lib/google-config.ts`의 연결 주소를 사용하며, `VITE_GOOGLE_SCRIPT_URL` 변수로 재정의할 수 있습니다.
