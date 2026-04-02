import { AxiosError } from "axios";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "./api/client";
import { generateArtisticQr } from "./api/qrApi";
import { QrForm } from "./components/QrForm";
import { ResultCard } from "./components/ResultCard";

function App() {
  const submitAttemptRef = useRef(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await apiClient.get<{ status: string }>("/health");
      } catch {
        // Health check failure is non-blocking for UI rendering.
      }
    };

    void checkHealth();
  }, []);

  const phoneValidationError = useMemo(() => {
    if (!phoneNumber) {
      return "";
    }
    const isValid = /^\+?\d{7,15}$/.test(phoneNumber.replace(/\s+/g, ""));
    return isValid
      ? ""
      : "Use 7-15 digits and an optional leading + (e.g., +15551234567).";
  }, [phoneNumber]);

  const handleGenerate = async () => {
    submitAttemptRef.current += 1;
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/cb27c6f4-7e52-4bfa-9fd9-a8571789694d", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "d56b4c",
      },
      body: JSON.stringify({
        sessionId: "d56b4c",
        runId: "qr-repeat-debug",
        hypothesisId: "H1",
        location: "QR_code_generator/frontend/src/App.tsx:handleGenerate:entry",
        message: "handleGenerate invoked",
        data: {
          submitAttempt: submitAttemptRef.current,
          loading,
          hasPhone: Boolean(phoneNumber.trim()),
          hasPrompt: Boolean(prompt.trim()),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
        hypothesisId: "H1",
        location: "src/App.tsx:handleGenerate:start",
        message: "Generate button handler started",
        data: {
          hasPhone: Boolean(phoneNumber.trim()),
          hasPrompt: Boolean(prompt.trim()),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    setErrorMessage("");
    setImageBase64(null);

    if (!phoneNumber.trim()) {
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
          hypothesisId: "H3",
          location: "src/App.tsx:handleGenerate:validation",
          message: "Validation failed: missing phone number",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setErrorMessage("Phone number is required.");
      return;
    }
    if (phoneValidationError) {
      setErrorMessage(phoneValidationError);
      return;
    }
    if (!prompt.trim()) {
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
          hypothesisId: "H3",
          location: "src/App.tsx:handleGenerate:validation",
          message: "Validation failed: missing prompt",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setErrorMessage("Artistic style prompt is required.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        data: phoneNumber.replace(/\s+/g, ""),
        prompt: prompt.trim(),
      };
      const response = await generateArtisticQr(payload);
      setImageBase64(response.image_base64);
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
          hypothesisId: "H5",
          location: "src/App.tsx:handleGenerate:success",
          message: "Image base64 response received",
          data: { hasImage: Boolean(response.image_base64) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
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
          hypothesisId: "H4",
          location: "src/App.tsx:handleGenerate:catch",
          message: "Generate request failed in frontend",
          data: {
            status: axiosError.response?.status ?? null,
            backendError: axiosError.response?.data?.error ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setErrorMessage(
        axiosError.response?.data?.error ||
          "Failed to generate QR code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Artistic AI QR Generator
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
            Turn Phone QR Codes Into AI Art
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Generate a high-correction QR code, then apply an artistic style using
            AI so your QR looks unique while staying practical.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <QrForm
            phoneNumber={phoneNumber}
            prompt={prompt}
            loading={loading}
            validationError={phoneValidationError}
            onPhoneNumberChange={setPhoneNumber}
            onPromptChange={setPrompt}
            onSubmit={handleGenerate}
          />
          <ResultCard imageBase64={imageBase64} />
        </section>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
