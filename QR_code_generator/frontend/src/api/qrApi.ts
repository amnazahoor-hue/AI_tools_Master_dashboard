import { apiClient } from "./client";

export interface GenerateQrRequest {
  data: string;
  prompt: string;
}

export interface GenerateQrResponse {
  image_base64: string;
}

export async function generateArtisticQr(
  payload: GenerateQrRequest,
): Promise<GenerateQrResponse> {
  // #region agent log
  fetch("http://127.0.0.1:7628/ingest/32cd249d-a874-4c06-9bd3-391f4ec08df4", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "5df370",
    },
    body: JSON.stringify({
      sessionId: "5df370",
      runId: "pre-fix",
      hypothesisId: "H2",
      location: "src/api/qrApi.ts:generateArtisticQr",
      message: "About to call backend /api/generate",
      data: { hasPhone: Boolean(payload.data), hasPrompt: Boolean(payload.prompt) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const response = await apiClient.post<GenerateQrResponse>(
    "/api/generate",
    payload,
  );
  return response.data;
}
