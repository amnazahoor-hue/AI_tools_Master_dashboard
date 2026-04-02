from __future__ import annotations

import re
from collections import Counter
from typing import Iterable

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS


# Small curated lexicon helps make "top skills" more resume-like.
SKILL_LEXICON: list[str] = [
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "node",
    "nodejs",
    "next",
    "django",
    "flask",
    "fastapi",
    "sql",
    "postgres",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure",
    "rest",
    "graphql",
    "pandas",
    "numpy",
    "machine learning",
    "deep learning",
    "nlp",
    "transformers",
    "git",
    "ci/cd",
    "jest",
    "pytest",
    "scikit-learn",
    "tensorflow",
    "pytorch",
]


def _normalize_text(text: str) -> str:
    text = text.lower()
    # Keep characters that are helpful for skill keywords.
    text = re.sub(r"[^a-z0-9+\-#.\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_top_skills(resume_text: str, *, top_n: int = 8) -> list[str]:
    """
    Extracts a human-friendly list of "Top Skills" from a resume.

    Strategy:
    1) Count occurrences of curated skill phrases/keywords.
    2) If that yields nothing, fall back to TF-IDF keyword extraction.
    """
    text = _normalize_text(resume_text)
    if not text:
        return []

    found: Counter[str] = Counter()
    for skill in SKILL_LEXICON:
        # Phrase/keyword matching (simple but effective for many resumes).
        occurrences = len(re.findall(r"\b" + re.escape(skill) + r"\b", text))
        if occurrences > 0:
            found[skill] += occurrences

    if found:
        # Sort by frequency then alphabetically for stability.
        ranked = sorted(found.items(), key=lambda kv: (-kv[1], kv[0]))
        return [s.title() if s.islower() else s for s, _ in ranked[:top_n]]

    # TF-IDF fallback (no global corpus needed; we rank terms within this resume).
    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=60,
    )
    try:
        tfidf = vectorizer.fit_transform([text])
    except ValueError:
        return []

    weights = tfidf.toarray()[0]
    feature_names = vectorizer.get_feature_names_out()
    ranked_terms = sorted(zip(feature_names, weights), key=lambda t: -t[1])

    results: list[str] = []
    for term, _ in ranked_terms:
        # Filter out stopwords-ish / too-short noise.
        if term in ENGLISH_STOP_WORDS:
            continue
        if len(term) < 3:
            continue
        if not re.search(r"[a-z0-9]", term):
            continue
        results.append(term.title() if term.islower() else term)
        if len(results) >= top_n:
            break

    return results

