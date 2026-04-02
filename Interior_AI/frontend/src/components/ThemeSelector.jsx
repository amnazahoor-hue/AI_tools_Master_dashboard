import React from "react";
import { motion } from "framer-motion";

const THEMES = [
  { name: "Minimalist", hint: "Neutral elegance" },
  { name: "Industrial", hint: "Raw textures" },
  { name: "Bohemian", hint: "Warm layers" },
  { name: "Modern Office", hint: "Executive clean" },
];

function ThemeCard({ theme, isActive, onSelect }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(theme.name)}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative min-w-[180px] rounded-2xl border p-3 text-left transition-all duration-300 ${
        isActive
          ? "border-indigo-400 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(129,140,248,.6),0_0_24px_rgba(99,102,241,.35)]"
          : "border-white/10 bg-white/5 hover:border-indigo-300/50 hover:bg-white/10"
      }`}
    >
      <div className="mb-3 h-24 rounded-xl bg-gradient-to-br from-slate-700/60 via-slate-600/40 to-slate-800/70" />
      <p className="font-medium text-white">{theme.name}</p>
      <p className="text-xs text-slate-300">{theme.hint}</p>
      {isActive && (
        <div className="absolute right-3 top-3 rounded-full bg-indigo-500 p-1 text-white">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
            <path d="M7.63 13.2 4.3 9.9l-1.4 1.4 4.73 4.7L17.1 6.53l-1.4-1.4z" />
          </svg>
        </div>
      )}
    </motion.button>
  );
}

export default function ThemeSelector({ selectedTheme, onSelectTheme }) {
  return (
    <section className="rounded-2xl bg-white/5 p-4 backdrop-blur-lg border border-white/10">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">Theme</p>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
        {THEMES.map((theme) => (
          <ThemeCard
            key={theme.name}
            theme={theme}
            isActive={selectedTheme === theme.name}
            onSelect={onSelectTheme}
          />
        ))}
      </div>
    </section>
  );
}

export { THEMES };
