"""
Professional Flask backend for Smart Image SEO Generator.

Features:
- POST /analyze endpoint for image uploads
- BLIP caption generation (Salesforce/blip-image-captioning-base)
- SEO keyword extraction helper (exactly 5 keywords when possible)
- CORS restricted to Vite dev server (http://localhost:5173)
"""

from __future__ import annotations

import logging
import re
from typing import List

import torch
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
from transformers import BlipForConditionalGeneration, BlipProcessor


# ------------------------------------------------------------
# Application + logging setup
# ------------------------------------------------------------
app = Flask(__name__)

# Allow only the frontend dev URL to call the API during local development.
CORS(
    app,
    # Allow the Vite dev server origin for local development.
    resources={r"/*": {"origins": ["http://localhost:3100", "http://127.0.0.1:3100"]}},
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# ------------------------------------------------------------
# AI model setup (CPU-only by requirement)
# ------------------------------------------------------------
MODEL_NAME = "Salesforce/blip-image-captioning-base"
DEVICE = torch.device("cpu")

logger.info("Loading model '%s' on %s...", MODEL_NAME, DEVICE)
processor = BlipProcessor.from_pretrained(MODEL_NAME)
model = BlipForConditionalGeneration.from_pretrained(MODEL_NAME).to(DEVICE)
model.eval()
logger.info("Model loaded successfully.")


# ------------------------------------------------------------
# SEO keyword extraction helper
# ------------------------------------------------------------
def extract_seo_keywords(caption: str, limit: int = 5) -> List[str]:
    """
    Extract up to `limit` SEO keywords from a caption.

    Strategy (simple but effective):
    1) Normalize text to lowercase and split into words
    2) Remove generic stop words
    3) Keep unique words in original order
    4) Return first N words
    """
    stop_words = {
        "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for", "with",
        "from", "by", "is", "are", "was", "were", "it", "its", "this", "that", "these",
        "those", "as", "be", "been", "being", "near", "into", "over", "under"
    }

    tokens = re.findall(r"[a-z0-9']+", caption.lower())

    keywords: List[str] = []
    seen = set()
    for token in tokens:
        if token in stop_words:
            continue
        if len(token) < 3:
            continue
        if token not in seen:
            keywords.append(token)
            seen.add(token)
        if len(keywords) == limit:
            break

    # Fallback: if too few keywords, fill with remaining unique tokens.
    if len(keywords) < limit:
        for token in tokens:
            if token not in seen:
                keywords.append(token)
                seen.add(token)
            if len(keywords) == limit:
                break

    return keywords


# ------------------------------------------------------------
# API endpoint
# ------------------------------------------------------------
@app.post("/analyze")
def analyze_image():
    """
    Analyze uploaded image and return:
    - generated alt_text
    - top 5 SEO keywords
    """
    if "image" not in request.files:
        return jsonify({"error": "Missing file. Send form-data with key 'image'."}), 400

    image_file = request.files["image"]
    if image_file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    try:
        image = Image.open(image_file.stream).convert("RGB")
    except UnidentifiedImageError:
        return jsonify({"error": "Unsupported or corrupted image file."}), 400
    except Exception as exc:  # Defensive error handling for upload parsing.
        logger.exception("Failed to read uploaded image.")
        return jsonify({"error": f"Unable to read image: {str(exc)}"}), 400

    try:
        model_inputs = processor(images=image, return_tensors="pt")
        model_inputs = {key: value.to(DEVICE) for key, value in model_inputs.items()}

        with torch.no_grad():
            generated_ids = model.generate(
                **model_inputs,
                max_new_tokens=40,
                num_beams=4,
                early_stopping=True,
            )

        caption = processor.decode(generated_ids[0], skip_special_tokens=True).strip()
        keywords = extract_seo_keywords(caption, limit=5)

        return jsonify(
            {
                "alt_text": caption,
                "keywords": keywords,
            }
        ), 200
    except Exception as exc:
        logger.exception("Model inference failed.")
        return jsonify({"error": f"Image analysis failed: {str(exc)}"}), 500


@app.get("/health")
def health_check():
    """Simple operational check endpoint."""
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # Debug mode is helpful for local development.
    app.run(host="0.0.0.0", port=5101, debug=True)
