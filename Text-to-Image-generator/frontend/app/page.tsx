"use client";

import { FormEvent, useMemo, useState } from "react";

type ApiError = { error: string };

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5109";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [imageCount, setImageCount] = useState(1);
  const [article, setArticle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");

  const hasResult = useMemo(() => article.length > 0 || images.length > 0, [article, images]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFeedbackStatus("");
    setArticle("");
    setImages([]);

    try {
      const textResponse = await fetch(`${apiBaseUrl}/api/generate/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!textResponse.ok) {
        const payload = (await textResponse.json()) as ApiError;
        throw new Error(payload.error ?? "Article generation failed.");
      }

      const textData = (await textResponse.json()) as { article: string };
      setArticle(textData.article);

      const imageResponse = await fetch(`${apiBaseUrl}/api/generate/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textData.article, count: imageCount })
      });

      if (!imageResponse.ok) {
        const payload = (await imageResponse.json()) as ApiError;
        throw new Error(payload.error ?? "Image generation failed.");
      }

      const imageData = (await imageResponse.json()) as { images: string[] };
      setImages(imageData.images);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackStatus("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comments })
      });
      if (!response.ok) {
        const payload = (await response.json()) as ApiError;
        throw new Error(payload.error ?? "Failed to submit feedback.");
      }
      setFeedbackStatus("Thanks for your feedback.");
      setComments("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setFeedbackStatus(message);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="badge">AI Content Studio</span>
        <h1>Automated Article and Image Generator</h1>
        <p>
          Transform a single prompt into a structured article and visual assets with a clean,
          production-style workflow.
        </p>
      </section>

      <section className="card">
        <h2>Generate New Content</h2>
        <p className="section-note">Describe your topic and choose how many images to produce.</p>
        <form onSubmit={handleGenerate} className="form-stack">
          <div>
            <label htmlFor="prompt">Prompt</label>
            <textarea
              id="prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Future of renewable energy in smart cities"
              required
            />
          </div>

          <div className="control-grid">
            <div>
              <label htmlFor="imageCount">Image count</label>
              <input
                id="imageCount"
                type="number"
                min={1}
                max={4}
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                required
              />
            </div>
            <button
              className="primary-btn"
              type="submit"
              disabled={loading || prompt.trim().length === 0}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>
        {error ? <p className="status error">{error}</p> : null}
      </section>

      {hasResult ? (
        <>
          <section className="card">
            <h2>Generated Article</h2>
            <pre className="article-output">{article}</pre>
          </section>

          <section className="card">
            <h2>Generated Images</h2>
            <div className="images">
              {images.map((src) => (
                <img key={src.slice(0, 40)} src={src} alt="Generated visual" />
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Feedback</h2>
            <p className="section-note">Help improve output quality for future generations.</p>
            <form onSubmit={handleFeedbackSubmit} className="form-stack">
              <div>
                <label htmlFor="rating">Rating (1-5)</label>
                <input
                  id="rating"
                  type="number"
                  min={1}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="comments">Comments</label>
                <textarea
                  id="comments"
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share what could be improved"
                />
              </div>
              <button className="secondary-btn" type="submit">
                Submit Feedback
              </button>
            </form>
            {feedbackStatus ? <p className="status">{feedbackStatus}</p> : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
