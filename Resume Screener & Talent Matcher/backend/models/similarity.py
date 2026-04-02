from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Iterable, Optional

import numpy as np
from sentence_transformers import SentenceTransformer


@dataclass(frozen=True)
class ResumeCandidate:
    candidate_name: str
    resume_text: str


class SemanticMatcher:
    """
    Semantic matcher based on Sentence Transformers + cosine similarity.

    Cosine Similarity:
    - We L2-normalize embeddings so cosine similarity becomes a dot product.
    - We then map cosine similarity [-1, 1] into a more intuitive score [0, 100].
    """

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self._model: Optional[SentenceTransformer] = None
        self._lock = threading.Lock()

    def _get_model(self) -> SentenceTransformer:
        # Lazy load so startup doesn't fail immediately if the model can't download.
        if self._model is None:
            with self._lock:
                if self._model is None:
                    self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed(self, text: str) -> np.ndarray:
        model = self._get_model()
        # normalize_embeddings=True gives unit vectors so cosine similarity = dot product.
        emb = model.encode([text], normalize_embeddings=True)
        return np.asarray(emb[0], dtype=np.float32)

    def rank(self, job_description: str, candidates: Iterable[ResumeCandidate]) -> list[dict]:
        job_description = (job_description or "").strip()
        if not job_description:
            raise ValueError("job_description is required")

        cand_list = [c for c in candidates if (c.resume_text or "").strip()]
        if not cand_list:
            return []

        model = self._get_model()
        # Batch encode for speed.
        texts = [c.resume_text for c in cand_list]
        with self._lock:
            job_emb = model.encode([job_description], normalize_embeddings=True)
            resume_embs = model.encode(texts, normalize_embeddings=True)

        job_emb = np.asarray(job_emb[0], dtype=np.float32)
        resume_embs = np.asarray(resume_embs, dtype=np.float32)  # shape: (n, dim)

        # Cosine similarity via dot product because embeddings are normalized.
        sims = resume_embs @ job_emb  # shape: (n,)

        # Map [-1, 1] -> [0, 100]
        scores = np.clip((sims + 1.0) * 50.0, 0.0, 100.0)

        ranked = []
        for c, score in sorted(
            zip(cand_list, scores),
            key=lambda x: float(x[1]),
            reverse=True,
        ):
            ranked.append(
                {
                    "candidate_name": c.candidate_name,
                    "match_score": round(float(score), 2),
                    "resume_text": c.resume_text,  # kept for any post-processing by caller
                }
            )
        return ranked

