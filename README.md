# 클랜 재화관리 · clan-vault

포지마스터 클랜원이 각자 게임 화면 사진을 올리고, 인식된 재화를 확인한 뒤 등록하는 프로그램입니다. 점수 계산은 포함하지 않습니다.

## 기록 항목

| 항목 | 보유 재화 | 소환 레벨·진행도 | 합성 수량 |
| --- | --- | --- | --- |
| 스킬 | 사진 표시값 보존 | 지원 | — |
| 알 / 펫 | 사진 표시값 보존 | 지원 | 선택 수량 + 직접 입력한 추가 수량 |
| 탈것 | 사진 표시값 보존 | 지원 | 선택 수량 + 직접 입력한 추가 수량 |
| 녹색 물약 | 보유 수량만 | — | — |

- 닉네임별 최신 등록 현황과 클랜 합계를 표시합니다.
- `35.8k`처럼 축약된 표시는 그대로 저장하고, 합계는 ‘약’으로 표시합니다.
- 숫자 인식 결과는 본인이 확인하고 수정한 뒤 저장합니다. 화면 비율이나 위치가 다른 사진은 직접 수정해야 할 수 있습니다.
- 알·탈것 합성 화면의 ‘선택됨’ 수량에 포함되지 않은 수량을 추가(+α)할 수 있습니다.
- 사진 6종은 각각 따로 저장합니다. 재화 화면과 합성 화면을 구분해서 올립니다.
- 처음 등록할 때 정한 6자 이상의 비밀번호로 같은 닉네임의 기록을 수정합니다. 별도의 비밀번호 복구 기능은 아직 없습니다.
- 일반 공개 운영을 위한 가입 인증은 없습니다. 클랜에 공유하는 용도로 사용하세요. 접근 제한이 필요하면 서버 측 가입 코드나 인증을 추가해야 합니다.

## 코드와 데이터의 분리

GitHub에는 코드만 올립니다. 클랜원의 사진은 Cloudflare R2, 재화 기록은 D1에 저장합니다. 이 저장소에 개인정보, 클랜원 사진, 비밀번호, API 토큰을 올리지 않습니다.

GitHub Pages는 정적 화면을 제공합니다. 다른 사람들이 등록한 기록을 함께 보려면 공유 저장 서버 연결이 반드시 필요합니다. 연결 전에는 사이트 게시 workflow가 건너뛰어지며, 코드 검사만 실행됩니다.

## 로컬 확인

```sh
npm ci --ignore-scripts
npm run check
npm run build
npm run dev
```

OCR 실행 파일과 영어 숫자 인식 모델은 빌드 시 설치된 패키지에서 복사됩니다. 별도 외부 CDN에 의존하지 않습니다. 모델과 WebAssembly 파일은 Git에 넣지 않습니다.

## 공유 저장 서버: Cloudflare Workers + D1 + R2

Cloudflare 계정의 리소스 설정이 필요합니다. 아직 이 저장소만으로 공동 저장 서버가 게시된 상태는 아닙니다.

```sh
npx wrangler login
npx wrangler d1 create clan-vault-db
npx wrangler r2 bucket create clan-vault-photos
```

생성된 D1의 `database_id`를 `wrangler.jsonc`의 `REPLACE_WITH_YOUR_D1_DATABASE_ID` 자리에 넣습니다.

```sh
npm run db:migrate:remote
npm run deploy:worker
```

Workers 주소에서는 화면과 API를 같이 제공하므로 `.env` 없이 사용할 수 있습니다. 사진은 최대 5MB이고, 최초 숫자 인식 시 모델 다운로드에 시간이 걸릴 수 있습니다.

GitHub Actions로 서버를 게시하려면:

1. `Settings → Secrets and variables → Actions`에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`를 **Secrets**로 등록합니다. 토큰은 코드나 채팅에 넣지 않습니다.
2. `D1_DATABASE_ID`를 **Variables**로 등록합니다. 먼저 D1·R2 리소스가 만들어져 있어야 합니다.
3. `Actions → Publish shared storage backend → Run workflow`를 실행합니다.

## GitHub Pages에 화면 게시

1. 위의 공유 저장 서버를 먼저 게시합니다.
2. GitHub 저장소 `Settings → Secrets and variables → Actions → Variables`에 `VITE_API_BASE_URL`을 생성해 Workers 주소를 넣습니다. 주소만 공개 코드에 사용되며 인증키는 넣지 않습니다.
3. `Settings → Pages → Source`에서 **GitHub Actions**를 선택합니다.
4. `Actions → Publish GitHub Pages → Run workflow`를 실행합니다.

서버의 `FRONTEND_ORIGIN`은 `https://gptjyp-ops.github.io`로 설정되어 있습니다. 저장소 이름을 바꿔도 같은 사용자 도메인이라 서버 설정을 바꿀 필요가 없습니다. 다른 계정이나 별도 도메인을 사용하면 해당 origin으로 바꿔주세요.

현재 저장소 이름 `-`도 사용할 수 있습니다. `clan-vault`로 이름을 바꾸면 Pages workflow가 새 저장소 경로에 맞춰 자동으로 빌드합니다.

## 검증 범위

기존 구현에서 제공된 사진 기준 숫자 인식, 등록·조회, 본인 수정, 비밀번호 오류 차단, 합성 추가 수량 합산을 확인했습니다. 이 저장소의 TypeScript 검사, 정적 화면 빌드, Worker 묶음을 검증합니다. 실제 Cloudflare 리소스 연결과 GitHub Pages 게시 성공은 리소스 설정 후 별도로 확인해야 합니다.
