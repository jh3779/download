import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import ytdl, { videoFormat } from "ytdl-core";

export const runtime = "nodejs";

interface DownloadRequestBody {
  url: string;
}

interface ErrorResponse {
  error: string;
}

const getSafeFilename = (title: string): string => title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 150);

const createError = (message: string, status: number): NextResponse<ErrorResponse> => {
  return NextResponse.json({ error: message }, { status });
};

export async function POST(request: Request): Promise<NextResponse | Response> {
  let body: DownloadRequestBody;

  try {
    body = (await request.json()) as DownloadRequestBody;
  } catch {
    return createError("요청 본문(JSON)을 해석할 수 없습니다.", 400);
  }

  const url = body?.url?.trim();
  if (!url || !ytdl.validateURL(url)) {
    return createError("유효한 YouTube URL을 입력하세요.", 400);
  }

  try {
    const info = await ytdl.getInfo(url);
    const selectedFormat = ytdl
      .filterFormats(info.formats, "videoandaudio")
      .find((format: videoFormat) => format.container === "mp4")
      ?? ytdl.chooseFormat(info.formats, { quality: "highest", filter: "audioandvideo" });

    const stream = ytdl.downloadFromInfo(info, {
      quality: selectedFormat.itag,
    });

    stream.on("error", (error: Error) => {
      console.error("ytdl stream error:", error.message);
    });

    const filename = `${getSafeFilename(info.videoDetails.title || "video")}.mp4`;

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("download handler error:", error);
    return createError("다운로드 처리 중 서버 오류가 발생했습니다.", 500);
  }
}
