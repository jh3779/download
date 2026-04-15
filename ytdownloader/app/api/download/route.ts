import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import ytdl, { type videoFormat } from "ytdl-core";
import {
  DownloadErrorResponse,
  isDownloadRequestBody,
} from "@/types/download";

export const runtime = "nodejs";

const toErrorResponse = (
  payload: DownloadErrorResponse,
  status: number,
): NextResponse<DownloadErrorResponse> => {
  return NextResponse.json(payload, { status });
};

const sanitizeFileName = (value: string): string => {
  const sanitized = value
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized.length > 0 ? sanitized : "video";
};

const getDownloadableMp4Format = (
  formats: videoFormat[],
): videoFormat | null => {
  const mp4Formats = formats.filter((format) => {
    return (
      format.container === "mp4" &&
      Boolean(format.hasVideo) &&
      Boolean(format.hasAudio)
    );
  });

  if (mp4Formats.length === 0) {
    return null;
  }

  return ytdl.chooseFormat(mp4Formats, { quality: "highest" });
};

const getJsonBody = async (
  request: NextRequest,
): Promise<{ url: string } | null> => {
  try {
    const payload: unknown = await request.json();
    if (!isDownloadRequestBody(payload)) {
      return null;
    }

    return { url: payload.url.trim() };
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await getJsonBody(request);

  if (!body) {
    return toErrorResponse(
      { error: "요청 바디 형식이 올바르지 않습니다. url 문자열이 필요합니다." },
      400,
    );
  }

  if (!body.url || !ytdl.validateURL(body.url)) {
    return toErrorResponse(
      { error: "유효한 YouTube URL이 아닙니다." },
      400,
    );
  }

  try {
    const info = await ytdl.getInfo(body.url);
    const format = getDownloadableMp4Format(info.formats);

    if (!format) {
      return toErrorResponse(
        { error: "다운로드 가능한 MP4 포맷을 찾을 수 없습니다." },
        422,
      );
    }

    const filename = `${sanitizeFileName(info.videoDetails.title)}.mp4`;
    const videoStream = ytdl.downloadFromInfo(info, {
      format,
      highWaterMark: 1 << 24,
    });

    request.signal.addEventListener("abort", () => {
      videoStream.destroy(new Error("Client disconnected."));
    });

    const stream = Readable.toWeb(videoStream) as ReadableStream<Uint8Array>;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          filename,
        )}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Download pipeline failed:", error);

    return toErrorResponse(
      {
        error: "다운로드 처리 중 오류가 발생했습니다.",
        details:
          error instanceof Error
            ? error.message
            : "알 수 없는 서버 오류가 발생했습니다.",
      },
      500,
    );
  }
}

export function GET(): NextResponse<DownloadErrorResponse> {
  return toErrorResponse(
    {
      error: "POST 메서드만 지원합니다.",
      details: `요청은 JSON 바디 {"url":"https://www.youtube.com/watch?v=..."} 형태여야 합니다.`,
    },
    405,
  );
}
