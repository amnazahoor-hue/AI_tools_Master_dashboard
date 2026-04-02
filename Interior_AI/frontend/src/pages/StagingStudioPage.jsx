import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import ThemeSelector from "../components/ThemeSelector";
import TransformationSlider from "../components/TransformationSlider";
import UploadWorkspace from "../components/UploadWorkspace";
import useStaging from "../hooks/useStaging";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5105";

export default function StagingStudioPage() {
  const [selectedTheme, setSelectedTheme] = useState("Minimalist");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDraggingWorkspace, setIsDraggingWorkspace] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const downloadLinkRef = useRef(null);
  const { isLoading, activePhase, completedPhases, result, error, runStaging, resetStaging } = useStaging();

  const stagedUrl = useMemo(() => (result?.staged_image_url ? `${API_BASE}${result.staged_image_url}` : ""), [result]);

  const originalUrl = useMemo(() => {
    if (result?.original_image_url) return `${API_BASE}${result.original_image_url}`;
    return previewUrl;
  }, [previewUrl, result]);

  const applyFileSelection = (next) => {
    if (!next) return;
    resetStaging();
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  };

  const handleFileChange = (e) => {
    const next = e.target.files?.[0];
    applyFileSelection(next);
  };

  const handleRemove = () => {
    resetStaging();
    setFile(null);
    setPreviewUrl("");
  };

  const handleStageRoom = async () => {
    if (!file) return;
    await runStaging({ file, theme: selectedTheme });
  };

  const handleWorkspaceDragEnter = (e) => {
    e.preventDefault();
    setDragDepth((prev) => prev + 1);
    setIsDraggingWorkspace(true);
  };

  const handleWorkspaceDragOver = (e) => {
    e.preventDefault();
    setIsDraggingWorkspace(true);
  };

  const handleWorkspaceDragLeave = (e) => {
    e.preventDefault();
    setDragDepth((prev) => {
      const nextDepth = Math.max(0, prev - 1);
      if (nextDepth === 0) {
        setIsDraggingWorkspace(false);
      }
      return nextDepth;
    });
  };

  const handleWorkspaceDrop = (e) => {
    e.preventDefault();
    setDragDepth(0);
    setIsDraggingWorkspace(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile?.type?.startsWith("image/")) {
      applyFileSelection(droppedFile);
    }
  };

  const triggerDownload = () => {
    if (!result?.staged_image_url || !downloadLinkRef.current) return;
    downloadLinkRef.current.href = `${API_BASE}${result.staged_image_url}`;
    downloadLinkRef.current.download = `interior-ai-staged-${result.id || "room"}.png`;
    downloadLinkRef.current.click();
  };

  useEffect(() => {
    if (!stagedUrl) return;
    confetti({
      particleCount: 120,
      spread: 68,
      origin: { y: 0.65 },
      colors: ["#818cf8", "#c4b5fd", "#a5b4fc", "#f8fafc"],
    });
  }, [stagedUrl]);

  const examplePairs = [
    { id: "one", left: "https://picsum.photos/seed/empty-room-1/600/380", right: "https://picsum.photos/seed/staged-room-1/600/380" },
    { id: "two", left: "https://picsum.photos/seed/empty-room-2/600/380", right: "https://picsum.photos/seed/staged-room-2/600/380" },
    { id: "three", left: "https://picsum.photos/seed/empty-room-3/600/380", right: "https://picsum.photos/seed/staged-room-3/600/380" },
  ];

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-[#090b1a] via-[#120f2d] to-[#211043] px-4 py-8 text-slate-100"
      onDragEnter={handleWorkspaceDragEnter}
      onDragOver={handleWorkspaceDragOver}
      onDragLeave={handleWorkspaceDragLeave}
      onDrop={handleWorkspaceDrop}
    >
      <div className="mx-auto max-w-6xl space-y-6 font-['Inter',system-ui,sans-serif]">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Interior-AI</h1>
          <p className="mt-1 text-slate-300">Professional virtual staging for real estate visuals.</p>
        </header>

        <ThemeSelector selectedTheme={selectedTheme} onSelectTheme={setSelectedTheme} />

        <UploadWorkspace
          previewUrl={previewUrl}
          onFileChange={handleFileChange}
          onRemove={handleRemove}
          onStageRoom={handleStageRoom}
          isLoading={isLoading}
          activePhase={activePhase}
          completedPhases={completedPhases}
          selectedTheme={selectedTheme}
          isDraggingWorkspace={isDraggingWorkspace}
        />

        {!previewUrl && !stagedUrl && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">Gallery of Examples</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {examplePairs.map((pair) => (
                <article key={pair.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  <div className="grid grid-cols-2">
                    <img src={pair.left} alt="Empty room example" className="h-24 w-full object-cover" />
                    <img src={pair.right} alt="Staged room example" className="h-24 w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-300">
                    <span>Empty</span>
                    <span>AI Staged</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
        )}

        {stagedUrl && <TransformationSlider originalUrl={originalUrl} stagedUrl={stagedUrl} />}

        {result?.download_url && (
          <div className="flex justify-end">
            <motion.button
              type="button"
              onClick={triggerDownload}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl border border-indigo-300/40 bg-indigo-500/30 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-400/40"
            >
              Download Staged Image
            </motion.button>
            <a ref={downloadLinkRef} className="hidden" />
          </div>
        )}

        <footer className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-300 backdrop-blur-lg">
          Built by GPT-5 Codex - Model docs:
          {" "}
          <a
            className="text-indigo-200 underline underline-offset-4 hover:text-indigo-100"
            href="https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0"
            target="_blank"
            rel="noreferrer"
          >
            Stable Diffusion XL on Hugging Face
          </a>
        </footer>
      </div>
    </main>
  );
}
