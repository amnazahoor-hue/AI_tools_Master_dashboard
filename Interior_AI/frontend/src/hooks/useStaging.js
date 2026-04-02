import { useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5105";

export default function useStaging() {
  const [isLoading, setIsLoading] = useState(false);
  const [activePhase, setActivePhase] = useState(0);
  const [completedPhases, setCompletedPhases] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const phaseTimers = useMemo(() => [], []);
  const requestIdRef = useRef(0);

  const clearTimers = () => {
    while (phaseTimers.length) {
      const timer = phaseTimers.pop();
      clearTimeout(timer);
    }
  };

  const resetStaging = () => {
    requestIdRef.current += 1;
    clearTimers();
    setIsLoading(false);
    setActivePhase(0);
    setCompletedPhases([]);
    setResult(null);
    setError("");
  };

  const compressImage = (file, maxDimension = 1536, quality = 0.9) =>
    new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Only image files are supported."));
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const { width, height } = img;
        const longestSide = Math.max(width, height);
        const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
        const targetWidth = Math.round(width * scale);
        const targetHeight = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not initialize image compressor."));
          return;
        }

        context.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error("Failed to compress image."));
              return;
            }
            const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
            resolve(new File([blob], file.name, { type: outputType, lastModified: Date.now() }));
          },
          file.type === "image/png" ? "image/png" : "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read image for compression."));
      };
      img.src = objectUrl;
    });

  const runStaging = async ({ file, theme, promptStrength = 0.55 }) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setError("");
    setResult(null);
    setIsLoading(true);
    setActivePhase(0);
    setCompletedPhases([]);

    const markComplete = (phaseIndex) => {
      setCompletedPhases((prev) => (prev.includes(phaseIndex) ? prev : [...prev, phaseIndex]));
    };
    phaseTimers.push(
      setTimeout(() => {
        markComplete(0);
        setActivePhase(1);
      }, 600)
    );
    phaseTimers.push(
      setTimeout(() => {
        markComplete(1);
        setActivePhase(2);
      }, 1600)
    );
    phaseTimers.push(
      setTimeout(() => {
        markComplete(2);
        setActivePhase(3);
      }, 2600)
    );

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressedFile);
      formData.append("theme", theme);
      formData.append("prompt_strength", String(promptStrength));

      const response = await fetch(`${API_BASE}/api/stage-room`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (requestIdRef.current !== requestId) return null;
      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || "Staging request failed.");
      }

      // Backend returned a staged image: complete all visual phases immediately.
      clearTimers();
      setCompletedPhases([0, 1, 2]);
      setActivePhase(3);

      if (requestIdRef.current !== requestId) return null;
      setResult(payload);
      return payload;
    } catch (err) {
      if (requestIdRef.current !== requestId) return null;
      setError(err.message || "Failed to stage room.");
      throw err;
    } finally {
      if (requestIdRef.current === requestId) {
        clearTimers();
        setIsLoading(false);
      }
    }
  };

  return {
    isLoading,
    activePhase,
    completedPhases,
    result,
    error,
    resetStaging,
    compressImage,
    runStaging,
  };
}
