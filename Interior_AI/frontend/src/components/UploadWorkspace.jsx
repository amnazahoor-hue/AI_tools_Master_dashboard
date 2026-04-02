import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import StatusStepper from "./StatusStepper";

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 text-indigo-200">
      <path
        fill="currentColor"
        d="M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 8a5 5 0 0 1 1 9.9V18h-4v-4h2l-4-4-4 4h2v4z"
      />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="h-[380px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg">
      <div className="h-full w-full animate-pulse rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
    </div>
  );
}

export default function UploadWorkspace({
  previewUrl,
  onFileChange,
  onRemove,
  onStageRoom,
  isLoading,
  activePhase,
  completedPhases,
  selectedTheme,
  isDraggingWorkspace,
}) {
  return (
    <section className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-lg">
      {!previewUrl ? (
        <label className="relative flex h-[380px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-black/20 text-center hover:border-indigo-300/60">
          <UploadIcon />
          <p className="mt-4 text-lg font-medium text-white">Upload your empty room</p>
          <p className="text-sm text-slate-300">Drop image here or click to browse</p>
          <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative h-[380px] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <img src={previewUrl} alt="Original room" className="h-full w-full object-contain" />
            <div className="absolute left-3 top-3 rounded-full bg-black/40 px-3 py-1 text-xs text-white">Original</div>
          </div>

          {isLoading ? (
            <>
              <LoadingSkeleton />
              <StatusStepper activePhase={activePhase} completedPhases={completedPhases} theme={selectedTheme} />
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRemove}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10"
              >
                Remove
              </button>
              <motion.button
                type="button"
                onClick={onStageRoom}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden rounded-xl border border-indigo-300/50 bg-indigo-500/30 px-6 py-2 text-sm font-medium text-white"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                <span className="relative">Stage Room</span>
              </motion.button>
            </div>
          )}
        </div>
      )}
      <AnimatePresence>
        {isDraggingWorkspace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl border border-indigo-300/40 bg-indigo-500/20 backdrop-blur-md"
          >
            <p className="rounded-full border border-indigo-200/40 bg-black/30 px-4 py-2 text-sm font-medium text-indigo-100">
              Drop to Stage Room
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
