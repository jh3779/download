# ytdownloader

Next.js 14(App Router) + TypeScript + Tailwind CSS + `ytdl-core`로 구성된 YouTube MP4 다운로드 예제입니다.

> ⚠️ 저작권 및 YouTube 이용약관을 준수하는 범위에서만 사용하세요.

## 기능

- 중앙 정렬 UI에서 YouTube URL 입력 후 다운로드 요청
- 다운로드 처리 중 버튼 비활성화 및 로딩 문구 표시
- `/api/download` POST API에서 `ytdl-core` 스트리밍으로 MP4 응답
- `Content-Type: video/mp4`, `Content-Disposition: attachment` 헤더로 즉시 파일 다운로드
- 잘못된 URL/JSON 파싱 실패/서버 오류에 대한 견고한 에러 처리

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 핵심 구조

- `app/page.tsx`: 클라이언트 UI 및 다운로드 요청/응답 처리
- `app/api/download/route.ts`: URL 검증, 포맷 선택, 스트리밍 응답
- `app/layout.tsx`, `app/globals.css`: 기본 레이아웃 및 스타일

## API 스펙

### `POST /api/download`

요청 본문(JSON):

```json
{ "url": "https://www.youtube.com/watch?v=..." }
```

성공 응답:

- HTTP 200
- Body: MP4 바이너리 스트림
- Headers:
  - `Content-Type: video/mp4`
  - `Content-Disposition: attachment; filename*=UTF-8''<encoded>.mp4`

실패 응답(JSON):

```json
{ "error": "유효한 YouTube URL을 입력하세요." }
```

## GitHub 업로드 가이드

```bash
# 1) 저장소 초기화
git init

# 2) 파일 추가 및 커밋
git add .
git commit -m "feat: implement ytdownloader app with streaming API"

# 3) 원격 저장소 연결
git remote add origin https://github.com/<your-account>/ytdownloader.git

# 4) main 브랜치 푸시
git branch -M main
git push -u origin main
```

## 참고 문서

- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js Node.js Runtime: https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes
- ytdl-core: https://github.com/fent/node-ytdl-core
- MDN `Blob`: https://developer.mozilla.org/docs/Web/API/Blob
- MDN `Content-Disposition`: https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Disposition

## PR가 안 올라갈 때 점검

다음 항목 중 하나가 빠져 있으면 GitHub에서 PR 생성이 되지 않습니다.

1. `origin` 원격 저장소가 등록되어 있는지 확인
2. 현재 브랜치가 원격으로 push 되었는지 확인
3. PR 대상 기본 브랜치(`main`)가 원격에 존재하는지 확인

```bash
git remote -v
git push -u origin <현재브랜치>
```
