import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function TransformationSlider({ originalUrl, stagedUrl }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(true);

  const clipPath = useMemo(() => `inset(0 0 0 ${position}%)`, [position]);

  const updatePosition = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, next)));
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    updatePosition(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (!dragging || !e.touches[0]) return;
    updatePosition(e.touches[0].clientX);
  };

  useEffect(() => {
    if (dragging) {
      setIsHintVisible(false);
    }
  }, [dragging]);

  useEffect(() => {
    if (!isHintVisible) return undefined;

    const sequence = [
      { to: 40, delay: 450 },
      { to: 60, delay: 900 },
      { to: 50, delay: 1350 },
    ];
    const timers = sequence.map((item) => setTimeout(() => setPosition(item.to), item.delay));
    const hideTimer = setTimeout(() => setIsHintVisible(false), 1800);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(hideTimer);
    };
  }, [isHintVisible]);

  return (
    <section
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setDragging(false)}
      style={{ aspectRatio: "16/9" }}
    >
      <img src={stagedUrl} alt="AI staged room" className="absolute inset-0 h-full w-full object-contain bg-black/50" />

      <img
        src={originalUrl}
        alt="Empty room"
        className="absolute inset-0 h-full w-full object-contain bg-black/50"
        style={{ clipPath }}
      />

      <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white">Empty</div>
      <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white">AI Staged</div>

      <motion.div
        className="absolute top-0 h-full w-0.5 cursor-ew-resize bg-indigo-200 shadow-[0_0_20px_rgba(165,180,252,.95)]"
        style={{ left: `${position}%` }}
        onMouseDown={() => setDragging(true)}
        onTouchStart={() => setDragging(true)}
        whileHover={{ scaleX: 1.15 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute left-1/2 top-0 h-full w-3 -translate-x-1/2 bg-gradient-to-b from-transparent via-indigo-300/70 to-transparent blur-sm" />
        <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-200 bg-indigo-400/80 backdrop-blur grid place-items-center text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="m8.7 16.7-1.4 1.4L2.2 13l5.1-5.1 1.4 1.4L5.9 12zm6.6 0L18.1 12l-2.8-2.7 1.4-1.4 5.1 5.1-5.1 5.1z" />
          </svg>
        </div>
      </motion.div>
    </section>
  );
}
