import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const phases = (theme) => [
  `Optimizing Image...`,
  `Generating ${theme} Furniture...`,
  "Finalizing Lighting...",
];

function CheckmarkIcon() {
  return (
    <motion.svg
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 20 }}
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5 fill-current"
    >
      <path d="M7.63 13.2 4.3 9.9l-1.4 1.4 4.73 4.7L17.1 6.53l-1.4-1.4z" />
    </motion.svg>
  );
}

export default function StatusStepper({ activePhase = 0, completedPhases = [], theme = "Minimalist" }) {
  const steps = phases(theme);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((label, index) => {
          const isComplete = completedPhases.includes(index) || index < activePhase;
          const isActive = index === activePhase;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full border text-xs font-semibold grid place-items-center ${
                  isComplete
                    ? "border-emerald-300 bg-emerald-400/30 text-emerald-100"
                    : isActive
                    ? "border-indigo-300 bg-indigo-400/30 text-indigo-100 animate-pulse"
                    : "border-white/20 bg-white/5 text-slate-300"
                }`}
              >
                <AnimatePresence mode="wait">
                  {isComplete ? (
                    <motion.span key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <CheckmarkIcon />
                    </motion.span>
                  ) : (
                    <motion.span key="index" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className={`text-sm ${isActive ? "text-indigo-100" : "text-slate-300"}`}>{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
