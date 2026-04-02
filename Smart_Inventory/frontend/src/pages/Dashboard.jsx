import { useEffect, useMemo, useState } from "react";
import { CloudUpload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Webcam from "react-webcam";
import { useApp } from "../context/AppContext";

const steps = ["Uploading", "AI Analyzing", "Cataloging"];

const categories = ["Electronics", "Fashion", "Home Decor", "General"];

export default function Dashboard() {
  const { request, saveProduct, settings, apiLoading } = useApp();
  const [activeStep, setActiveStep] = useState(-1);
  const [analysisError, setAnalysisError] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [webcamRef, setWebcamRef] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) {
        URL.revokeObjectURL(uploadPreviewUrl);
      }
    };
  }, [uploadPreviewUrl]);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await processFile(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
  });

  const processFile = async (file) => {
    setAnalysisError("");
    setPreviewData(null);
    setActiveStep(0);
    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
    }
    setUploadPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    try {
      setActiveStep(1);
      const analysis = await request("/products/analyze", {
        method: "POST",
        body: formData,
      });
      setActiveStep(2);

      setPreviewData({
        name: analysis.name,
        original_image_path: analysis.original_image_path,
        ai_caption: analysis.ai_caption,
        tags: analysis.tags,
        marketing_description: analysis.marketing_description,
        category: analysis.category || "General",
        suggested_price: analysis.price_range?.max || "",
      });
    } catch (err) {
      setAnalysisError(err.message || "AI processing failed. Please retry.");
    } finally {
      setTimeout(() => setActiveStep(-1), 700);
    }
  };

  const captureFromWebcam = async () => {
    if (!webcamRef) return;
    const screenshot = webcamRef.getScreenshot();
    if (!screenshot) return;

    const response = await fetch(screenshot);
    const blob = await response.blob();
    const file = new File([blob], "webcam-snapshot.jpg", { type: "image/jpeg" });
    setShowCamera(false);
    await processFile(file);
  };

  const stepper = useMemo(
    () => (
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {steps.map((step, index) => {
          const done = activeStep > index;
          const active = activeStep === index;
          return (
            <div
              key={step}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm transition ${
                done
                  ? "border-pink-300/60 bg-pink-300/20 text-pink-100"
                  : active
                  ? "border-fuchsia-300/70 bg-fuchsia-500/25 text-fuchsia-100 animate-pulse"
                  : "border-white/15 bg-white/5 text-slate-300"
              }`}
            >
              <span className="font-semibold">Step {index + 1}:</span> {step}
            </div>
          );
        })}
      </div>
    ),
    [activeStep]
  );

  return (
    <div className="space-y-6">
      <section className="workspace-card rounded-3xl bg-white/10 p-6 sm:p-8">
        <h1 className="title-shimmer text-2xl font-bold sm:text-3xl">Quick Upload Workspace</h1>
        <p className="mt-3 text-sm text-pink-100/90">
          Drop a product image, run AI catalog generation, and confirm inventory details instantly.
        </p>

        <div
          {...getRootProps()}
          className={`upload-shimmer mt-6 cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition ${
            isDragActive
              ? "border-pink-300 bg-pink-400/20"
              : "border-pink-300/40 bg-black/20 hover:border-pink-300 hover:bg-pink-300/10"
          }`}
        >
          <input {...getInputProps()} />
          {showCamera ? (
            <div className="space-y-4">
              <Webcam
                audio={false}
                screenshotFormat="image/jpeg"
                className="mx-auto w-full max-w-xl rounded-2xl"
                ref={(ref) => setWebcamRef(ref)}
              />
              <div className="flex justify-center gap-3">
                <button
                  className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    captureFromWebcam();
                  }}
                >
                  Capture & Analyze
                </button>
                <button
                  className="rounded-xl border border-white/25 px-4 py-2 text-slate-200"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowCamera(false);
                  }}
                >
                  Close Camera
                </button>
              </div>
            </div>
          ) : uploadPreviewUrl ? (
            <div className="relative mx-auto w-fit">
              <img
                src={uploadPreviewUrl}
                alt="Uploaded preview"
                className="h-48 w-48 rounded-2xl object-cover ring-2 ring-pink-200/40"
              />
              <button
                type="button"
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-lg text-white shadow-lg"
                onClick={(event) => {
                  event.stopPropagation();
                  URL.revokeObjectURL(uploadPreviewUrl);
                  setUploadPreviewUrl("");
                  setPreviewData(null);
                  setAnalysisError("");
                }}
              >
                ✖
              </button>
            </div>
          ) : (
            <>
              <CloudUpload className="mx-auto mb-3 h-10 w-10 text-pink-100/85" strokeWidth={1.75} />
              <p className="text-lg font-semibold text-white">Drag and drop image here, or tap to upload.</p>
              <p className="mt-2 text-sm text-pink-100/80">Supports JPG, PNG, WEBP</p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCamera((prev) => !prev)}
          className="mt-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:opacity-90"
        >
          {showCamera ? "Hide Webcam" : "Toggle Live Webcam"}
        </button>

        {activeStep >= 0 && stepper}

        {analysisError && (
          <div className="mt-4 rounded-xl border border-rose-300/50 bg-rose-500/20 p-3 text-rose-100">
            {analysisError}
            <button
              className="ml-3 underline"
              onClick={() => {
                setAnalysisError("");
              }}
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {previewData && (
        <section className="rounded-3xl border border-pink-200/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Quick Edit Preview</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-pink-100">
              AI SEO Title
              <input
                value={previewData.name}
                onChange={(e) => setPreviewData((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-white placeholder:text-pink-100/60"
              />
            </label>
            <label className="text-sm text-pink-100">
              Suggested Price ({settings.currency_symbol})
              <input
                type="number"
                value={previewData.suggested_price}
                onChange={(e) =>
                  setPreviewData((p) => ({ ...p, suggested_price: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-pink-100">
              Category
              <select
                value={previewData.category}
                onChange={(e) => setPreviewData((p) => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-white"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-pink-100">
              Tags
              <input
                value={previewData.tags}
                onChange={(e) => setPreviewData((p) => ({ ...p, tags: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-white"
              />
            </label>
          </div>
          <p className="mt-4 text-sm text-pink-100/80">{previewData.ai_caption}</p>

          <button
            type="button"
            disabled={apiLoading}
            onClick={async () => {
              await saveProduct(previewData);
              setPreviewData(null);
            }}
            className="mt-6 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-2 font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60"
          >
            Confirm to Inventory
          </button>
        </section>
      )}

    </div>
  );
}

