import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { BriefcaseBusiness, Check, Copy, Download, Image, Loader2, Send, Sparkles, X as CloseIcon } from "lucide-react";
import { useApp } from "../context/AppContext";

const PlatformCard = ({ icon: Icon, title, content, copied, onCopy }) => (
  <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-white">
        <Icon size={18} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          copied ? "bg-emerald-500/30 text-emerald-200" : "bg-white/10 text-slate-200 hover:bg-white/20"
        }`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
    <div className="rounded-lg border border-white/5 bg-slate-800/50 p-4 text-sm leading-relaxed text-slate-200">
      {content}
    </div>
  </article>
);

const SkeletonCards = () =>
  Array.from({ length: 3 }).map((_, idx) => (
    <div key={idx} className="animate-pulse rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-3 h-5 w-32 rounded bg-white/15" />
      <div className="space-y-2 rounded-lg border border-white/5 bg-slate-800/50 p-4">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-5/6 rounded bg-white/10" />
        <div className="h-3 w-4/6 rounded bg-white/10" />
      </div>
    </div>
  ));

export default function SocialKitDrawer({ isOpen, onClose, posts, loading, productName, productId }) {
  const { request } = useApp();
  const [copiedPlatform, setCopiedPlatform] = useState("");
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualPostUrl, setVisualPostUrl] = useState("");

  const platformItems = useMemo(
    () => [
      { key: "instagram", title: "Instagram", icon: Image, text: posts?.instagram || "" },
      { key: "x", title: "X (Twitter)", icon: Send, text: posts?.x || "" },
      { key: "linkedin", title: "LinkedIn", icon: BriefcaseBusiness, text: posts?.linkedin || "" },
    ],
    [posts]
  );

  const copyToClipboard = async (platformKey, text) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedPlatform(platformKey);
    toast.success("Caption copied to clipboard!");
    setTimeout(() => setCopiedPlatform(""), 1400);
  };

  useEffect(() => {
    if (!isOpen && visualPostUrl) {
      URL.revokeObjectURL(visualPostUrl);
      setVisualPostUrl("");
      setVisualLoading(false);
    }
  }, [isOpen, visualPostUrl]);

  const generateVisualPost = async () => {
    if (!productId) return;
    setVisualLoading(true);
    try {
      const blob = await request(`/products/${productId}/generate-image`, { method: "GET" });
      if (visualPostUrl) {
        URL.revokeObjectURL(visualPostUrl);
      }
      const url = URL.createObjectURL(blob);
      setVisualPostUrl(url);
      toast.success("Visual post generated!");
    } catch (error) {
      toast.error("Could not generate image.");
    } finally {
      setVisualLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl border-l border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Social Kit Generator</h2>
                <p className="mt-1 text-sm text-slate-300">{productName || "Selected Product"}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/15 p-2 text-slate-200 hover:bg-white/10"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">Visual Post</h3>
                  <button
                    type="button"
                    disabled={visualLoading || !productId}
                    onClick={generateVisualPost}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {visualLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {visualLoading ? "Generating..." : "Generate Ready-to-Post Image"}
                  </button>
                </div>

                {visualPostUrl ? (
                  <div className="space-y-3">
                    <div className="h-[300px] w-[300px] overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                      <img src={visualPostUrl} alt="Generated visual post" className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const anchor = document.createElement("a");
                        anchor.href = visualPostUrl;
                        anchor.download = `visioninventory-post-${productId}.png`;
                        anchor.click();
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                    >
                      <Download size={16} />
                      Download PNG
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/5 bg-slate-800/50 p-4 text-sm text-slate-300">
                    Generate a branded square visual ready for social posting.
                  </div>
                )}
              </section>

              {loading ? (
                <SkeletonCards />
              ) : (
                platformItems.map((item) => (
                  <PlatformCard
                    key={item.key}
                    icon={item.icon}
                    title={item.title}
                    content={item.text}
                    copied={copiedPlatform === item.key}
                    onCopy={() => copyToClipboard(item.key, item.text)}
                  />
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

