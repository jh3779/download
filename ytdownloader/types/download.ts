export interface DownloadRequestBody {
  url: string;
}

export interface DownloadErrorResponse {
  error: string;
  details?: string;
}

export const isDownloadRequestBody = (
  payload: unknown,
): payload is DownloadRequestBody => {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const { url } = payload as Partial<DownloadRequestBody>;
  return typeof url === "string";
};
