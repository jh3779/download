# ytdownloader

YouTube URL을 입력하면 서버 스트리밍으로 MP4 다운로드를 시작하는 Next.js 앱입니다.

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript (`strict: true`)
- Tailwind CSS
- `ytdl-core`

## 주요 기능

- 메인 화면(`/`): URL 입력 + 다운로드 버튼 + 로딩/에러 상태 표시
- API (`/api/download`): `POST` 요청으로 URL 수신
- 서버 스트리밍: 전체 파일을 메모리에 적재하지 않고 스트림 전달
- 다운로드 헤더 설정: `Content-Type: video/mp4`, `Content-Disposition: attachment`

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 YouTube URL 입력.

## API 명세

### `POST /api/download`

요청 바디:

```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

성공 응답:

- `200 OK`
- `Content-Type: video/mp4`
- `Content-Disposition: attachment; filename="..."`
- 본문: MP4 바이너리 스트림

실패 응답 예시:

```json
{
  "error": "유효한 YouTube URL이 아닙니다.",
  "details": "..."
}
```

## 핵심 문법 해석

```ts
const videoStream = ytdl(url, { format: 'mp4' });
```
- YouTube 서버에서 영상 데이터를 조각(chunk) 단위로 읽어오는 Readable Stream 생성입니다.

```ts
return new NextResponse(videoStream as any, { ... });
```
- 전체 파일을 먼저 다 받지 않고, 스트림을 즉시 클라이언트로 전달해 서버 메모리 부담을 줄입니다.

```ts
headers: { 'Content-Disposition': 'attachment; filename="video.mp4"' }
```
- 브라우저에 “화면 재생”이 아닌 “파일 다운로드”를 강제하는 표준 헤더입니다.

```ts
window.URL.createObjectURL(blob);
```
- 서버에서 받은 Blob 데이터를 브라우저가 접근 가능한 임시 메모리 URL로 변환합니다.

## GitHub Workflow (main 브랜치 푸시)

프로젝트 루트가 `ytdownloader`라고 가정:

```bash
cd ytdownloader
git init
git add .
git commit -m "feat: implement youtube mp4 streaming downloader"
git branch -M main
git remote add origin https://github.com/<your-account>/ytdownloader.git
git push -u origin main
```

## 주의사항

- YouTube 이용약관 및 저작권 정책을 준수해 사용하세요.
- 일부 영상은 지역/연령/저작권 제한으로 다운로드가 실패할 수 있습니다.
- 이 앱은 `app/api/download` 서버 라우트를 사용하므로 GitHub Pages(정적 호스팅)에는 배포할 수 없습니다.
