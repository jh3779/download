"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  DownloadErrorResponse,
  DownloadRequestBody,
} from "@/types/download";

type FeedbackKind = "idle" | "success" | "error";

interface UiFeedback {
  kind: FeedbackKind;
  message: string;
}

const INITIAL_FEEDBACK: UiFeedback = {
  kind: "idle",
  message: "",
};

const FALLBACK_FILENAME = "video.mp4";

const isYouTubeHostname = (hostname: string): boolean => {
  return [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be",
  ].includes(hostname.toLowerCase());
};

const isValidYouTubeUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return isYouTubeHostname(parsed.hostname);
  } catch {
    return false;
  }
};

const getFilenameFromDisposition = (disposition: string | null): string => {
  if (!disposition) {
    return FALLBACK_FILENAME;
  }

  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8Name) {
    return decodeURIComponent(utf8Name);
  }

  const asciiName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return asciiName ?? FALLBACK_FILENAME;
};

const triggerFileDownload = (blob: Blob, filename: string): void => {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(blobUrl);
};

export default function Home() {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<UiFeedback>(INITIAL_FEEDBACK);

  const canDownload = useMemo(() => {
    return !isLoading && isValidYouTubeUrl(url.trim());
  }, [isLoading, url]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const trimmed = url.trim();
    if (!isValidYouTubeUrl(trimmed)) {
      setFeedback({
        kind: "error",
        message: "유효한 YouTube URL을 입력해 주세요.",
      });
      return;
    }

    setIsLoading(true);
    setFeedback(INITIAL_FEEDBACK);

    const payload: DownloadRequestBody = { url: trimmed };

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody =
          (await response
            .json()
            .catch(() => null)) as DownloadErrorResponse | null;

        throw new Error(errorBody?.error ?? "다운로드 요청에 실패했습니다.");
      }

      const blob = await response.blob();
      const filename = getFilenameFromDisposition(
        response.headers.get("Content-Disposition"),
      );

      triggerFileDownload(blob, filename);
      setFeedback({
        kind: "success",
        message: `다운로드를 시작했습니다: ${filename}`,
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "다운로드 중 오류가 발생했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl sm:p-8">
          <h1 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            YouTube MP4 Downloader
          </h1>
          <p className="mt-3 text-center text-sm text-zinc-300 sm:text-base">
            URL을 입력하면 서버 스트리밍 방식으로 MP4 파일 다운로드를 시작합니다.
          </p>

          <form className="mt-8 space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm text-zinc-300" htmlFor="video-url">
              YouTube URL
            </label>
            <input
              id="video-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              autoComplete="off"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none ring-offset-zinc-950 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="submit"
              disabled={!canDownload}
              className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isLoading ? "다운로드 준비 중..." : "다운로드"}
            </button>
          </form>

          {feedback.message ? (
            <p
              className={`mt-4 text-sm ${
                feedback.kind === "error" ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
