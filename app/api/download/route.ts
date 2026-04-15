import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import ytdl, { videoFormat } from "ytdl-core";

export const runtime = "nodejs";

interface DownloadRequestBody {
  url: string;
}

interface ErrorResponse {
  error: string;
}

const createError = (message: string, status: number): NextResponse<ErrorResponse> => {
  return NextResponse.json({ error: message }, { status });
};

const getSafeFilename = (title: string): string => {
  return title.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 150) || "video";
};

const isSupportedYoutubeHost = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be";
  } catch {
    return false;
  }
};

const pickBestMp4Format = (formats: videoFormat[]): videoFormat | null => {
  const progressiveMp4 = formats
    .filter((format) => format.container === "mp4" && format.hasAudio && format.hasVideo)
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

  return progressiveMp4[0] ?? null;
};

export async function POST(request: NextRequest): Promise<Response> {
  let body: DownloadRequestBody;

  try {
    body = (await request.json()) as DownloadRequestBody;
  } catch {
    return createError("요청 본문(JSON)을 해석할 수 없습니다.", 400);
  }

  const url = body?.url?.trim();

  if (!url || !isSupportedYoutubeHost(url) || !ytdl.validateURL(url)) {
    return createError("유효한 YouTube URL을 입력하세요.", 400);
  }

  try {
    const info = await ytdl.getInfo(url);
    const selectedFormat = pickBestMp4Format(info.formats as videoFormat[]);

    if (!selectedFormat?.itag) {
      return createError("다운로드 가능한 MP4 포맷을 찾지 못했습니다.", 422);
    }

    const videoStream = ytdl.downloadFromInfo(info, {
      quality: selectedFormat.itag,
      requestOptions: {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      },
    });

    videoStream.once("error", (error: Error) => {
      console.error("stream error:", error.message);
    });

    const filename = `${getSafeFilename(info.videoDetails.title)}.mp4`;
    const contentLength = selectedFormat.contentLength;

    return new Response(Readable.toWeb(videoStream) as ReadableStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
    });
  } catch (error) {
    console.error("download handler error:", error);
    return createError("다운로드 처리 중 서버 오류가 발생했습니다.", 500);
  }
}
