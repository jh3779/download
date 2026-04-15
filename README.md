# ytdownloader

Vercel 같은 배포 절차는 제외하고, **로컬 환경 구축**과 **GitHub 업로드**에 집중한 YouTube Downloader 프로젝트 가이드입니다.

## 1) 프로젝트 목표

- **스택**: Next.js(App Router), TypeScript, Tailwind CSS, `@distube/ytdl-core`
- **기능**: YouTube URL을 입력하면 서버가 스트리밍 방식으로 MP4를 내려주고, 브라우저에서 파일로 저장
- **런타임 원칙**: 배포 플랫폼 종속 기능 없이 **Node.js 런타임** 기준으로 동작

---

## 2) 로컬 환경 구축

### 사전 준비

- Node.js 20 LTS 이상 권장
- npm 또는 pnpm
- Git

### 프로젝트 생성

```bash
npx create-next-app@latest ytdownloader --typescript --tailwind --app
cd ytdownloader
npm i @distube/ytdl-core
```

### Next.js API Route (스트리밍)

`app/api/download/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: "유효한 YouTube URL이 아닙니다." }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, "_");

    const videoStream = ytdl(url, {
      quality: "highest",
      filter: "audioandvideo",
    });

    return new NextResponse(videoStream as any, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${title}.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "다운로드 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
```

---

## 3) 프론트엔드 UI/UX 예시

`app/page.tsx`:

```tsx
"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onDownload = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error("다운로드 실패");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "video.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(downloadUrl);
      setMessage("다운로드가 시작되었습니다.");
    } catch {
      setMessage("다운로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">YouTube Downloader</h1>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="YouTube URL을 입력하세요"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onDownload}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "다운로드 준비 중..." : "MP4 다운로드"}
        </button>
        {message && <p className="text-sm text-zinc-300">{message}</p>}
      </div>
    </main>
  );
}
```

---

## 4) 핵심 문법/로직 해석

### 클라이언트

```ts
const blob = await res.blob();
```
- HTTP 응답의 바이너리 바디를 **Blob 객체**로 변환합니다.

```ts
const downloadUrl = window.URL.createObjectURL(blob);
```
- Blob을 가리키는 브라우저 메모리상의 임시 URL을 만듭니다.

```ts
a.download = "video.mp4";
```
- 링크 클릭 시 브라우저가 열기 대신 지정 파일명으로 저장하도록 지시합니다.

### 서버

```ts
const videoStream = ytdl(url, { quality: "highest", filter: "audioandvideo" });
```
- YouTube에서 영상/오디오 스트림을 조각 단위로 읽는 Readable Stream을 생성합니다.

```ts
return new NextResponse(videoStream as any, { headers: { ... } });
```
- 전체 파일을 메모리에 올리지 않고, 들어오는 스트림을 즉시 클라이언트로 전달합니다.

```ts
"Content-Type": "video/mp4"
```
- 응답 데이터 MIME 타입이 MP4 영상임을 알리는 표준 헤더입니다.

---

## 5) GitHub 업로드 절차

```bash
# 1) 프로젝트 폴더 이동
cd ytdownloader

# 2) git 초기화 및 첫 커밋
git init
git add .
git commit -m "feat: implement youtube download logic with stream"

# 3) 원격 저장소 연결
git remote add origin https://github.com/<your-account>/ytdownloader.git

# 4) main 브랜치로 푸시
git branch -M main
git push -u origin main
```

---

## 6) 참고 기술 문서 (전문 출처)

- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- NextResponse API: https://nextjs.org/docs/app/api-reference/functions/next-response
- MDN Blob: https://developer.mozilla.org/docs/Web/API/Blob
- MDN URL.createObjectURL: https://developer.mozilla.org/docs/Web/API/URL/createObjectURL_static
- MDN Content-Disposition: https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Disposition
- Node.js Streams: https://nodejs.org/api/stream.html
- `@distube/ytdl-core`: https://github.com/distubejs/ytdl-core

> 참고: YouTube 이용약관 및 저작권 정책을 준수하는 범위에서만 사용하세요.
