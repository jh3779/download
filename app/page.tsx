"use client";

import { FormEvent, useMemo, useState } from "react";

interface DownloadRequestBody {
  url: string;
}

interface ApiErrorResponse {
  error: string;
}

const getFilenameFromDisposition = (value: string | null): string => {
  if (!value) return "video.mp4";
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const quotedMatch = value.match(/filename="?([^";]+)"?/i);
  return quotedMatch?.[1] ?? "video.mp4";
};

export default function Home(): JSX.Element {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const canSubmit = useMemo(() => url.trim().length > 0 && !loading, [url, loading]);

  const onDownload = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setMessage("다운로드를 준비하고 있습니다...");

    const payload: DownloadRequestBody = { url: url.trim() };

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: "다운로드 실패" }))) as ApiErrorResponse;
        throw new Error(data.error || "다운로드 실패");
      }

      const blob = await response.blob();
      const filename = getFilenameFromDisposition(response.headers.get("Content-Disposition"));
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      setMessage("다운로드가 시작되었습니다.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <section className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-7 shadow-2xl">
        <h1 className="text-3xl font-bold tracking-tight">YouTube Downloader</h1>
        <p className="mt-2 text-sm text-zinc-300">유튜브 URL을 입력하고 MP4 파일로 다운로드하세요.</p>

        <form className="mt-6 space-y-3" onSubmit={onDownload}>
          <label htmlFor="url" className="text-sm font-medium text-zinc-200">
            YouTube URL
          </label>
          <input
            id="url"
            type="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "다운로드 중..." : "다운로드"}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200">{message}</p>
        )}
      </section>
    </main>
  );
}
