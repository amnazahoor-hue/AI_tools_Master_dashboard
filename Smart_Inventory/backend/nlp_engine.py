from __future__ import annotations

import json
import time
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Tuple

from PIL import Image, ImageFilter, ImageStat


# region agent log
_DEBUG_LOG_PATH = Path(__file__).resolve().parents[1] / "debug-bc4c4b.log"


def _debug_log(hypothesis_id: str, location: str, message: str, data: Dict[str, object]) -> None:
    payload = {
        "sessionId": "bc4c4b",
        "runId": "run-1",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as log_file:
            log_file.write(json.dumps(payload) + "\n")
    except Exception:
        pass


# endregion

CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "Electronics": [
        "phone",
        "laptop",
        "tablet",
        "camera",
        "charger",
        "speaker",
        "headphone",
        "monitor",
        "smartwatch",
        "keyboard",
    ],
    "Fashion": [
        "shirt",
        "dress",
        "jacket",
        "shoe",
        "sneaker",
        "bag",
        "jeans",
        "watch",
        "hat",
        "coat",
    ],
    "Home Decor": [
        "lamp",
        "sofa",
        "vase",
        "pillow",
        "curtain",
        "table",
        "chair",
        "mirror",
        "shelf",
        "carpet",
    ],
}


PRICE_RANGES: Dict[str, Tuple[float, float]] = {
    "phone": (300, 1200),
    "laptop": (450, 2500),
    "camera": (250, 1800),
    "headphone": (40, 500),
    "speaker": (50, 900),
    "shirt": (20, 120),
    "dress": (30, 250),
    "jacket": (50, 350),
    "shoe": (30, 300),
    "sofa": (200, 2500),
    "lamp": (25, 400),
    "table": (80, 1200),
    "chair": (40, 800),
}


@lru_cache(maxsize=1)
def _load_blip_components():
    # Lazy import so the app can still run without AI dependencies.
    _debug_log("H1", "backend/nlp_engine.py:_load_blip_components", "Entering BLIP loader", {})
    import torch
    from transformers import AutoProcessor, BlipForConditionalGeneration

    _debug_log(
        "H2",
        "backend/nlp_engine.py:_load_blip_components",
        "Loading BLIP processor/model",
        {
            "model_name": "Salesforce/blip-image-captioning-base",
        },
    )

    processor = AutoProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()

    _debug_log(
        "H6",
        "backend/nlp_engine.py:_load_blip_components",
        "BLIP components initialized successfully",
        {"device": device},
    )
    return processor, model, device


def is_blurry_image(image_path: str, threshold: float = 120.0) -> bool:
    image = Image.open(image_path).convert("L")
    edges = image.filter(ImageFilter.FIND_EDGES)
    edge_stats = ImageStat.Stat(edges)
    variance = edge_stats.var[0] if edge_stats.var else 0.0
    return variance < threshold


def assign_category(caption: str) -> str:
    lowered = caption.lower()
    best_match = "General"
    best_score = 0
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in lowered)
        if score > best_score:
            best_score = score
            best_match = category
    return best_match


def professional_seo_title(caption: str, category: str) -> str:
    normalized_caption = " ".join(caption.split())
    cleaned_caption = normalized_caption[:90].rstrip(" ,.")
    if category == "General":
        return f"Premium Product Listing - {cleaned_caption.title()}"
    return f"{category} | {cleaned_caption.title()} | VisionInventory Pro"


def estimate_price_range(caption: str, category: str) -> Dict[str, float]:
    lowered = caption.lower()
    min_price, max_price = (15.0, 200.0) if category != "Electronics" else (80.0, 1500.0)
    for keyword, range_values in PRICE_RANGES.items():
        if keyword in lowered:
            min_price, max_price = range_values
            break
    return {"min": float(min_price), "max": float(max_price)}


def generate_tags(caption: str, category: str) -> str:
    words = [token.strip(".,") for token in caption.lower().split()]
    keywords = [word for word in words if len(word) > 3][:6]
    tags = [category.lower().replace(" ", "-")] + keywords
    unique_tags = list(dict.fromkeys(tags))
    return ", ".join(unique_tags)


def generate_marketing_description(caption: str, category: str) -> str:
    return (
        f"Discover this {category.lower()} item featuring {caption.lower()}. "
        "Crafted for modern shoppers, this listing is optimized for marketplace visibility "
        "and designed to boost conversion with clear product storytelling."
    )


def analyze_product_image(image_path: str) -> Dict[str, object]:
    image_file = Path(image_path)
    _debug_log(
        "H4",
        "backend/nlp_engine.py:analyze_product_image",
        "Analyze request started",
        {"image_path": str(image_file)},
    )
    if not image_file.exists():
        return {"error": "Image file not found."}

    if is_blurry_image(str(image_file)):
        return {"error": "Image looks too blurry. Please retry with a sharper photo."}

    try:
        import torch

        processor, model, device = _load_blip_components()
        image = Image.open(image_file).convert("RGB")
        inputs = processor(images=image, return_tensors="pt")
        inputs = {key: value.to(device) for key, value in inputs.items()}
        if "pixel_values" in inputs:
            target_dtype = torch.float16 if device == "cuda" else torch.float32
            inputs["pixel_values"] = inputs["pixel_values"].to(dtype=target_dtype)

        with torch.no_grad():
            output_ids = model.generate(**inputs, max_new_tokens=40)
        caption = processor.batch_decode(output_ids, skip_special_tokens=True)[0].strip()
    except Exception as exc:  # pragma: no cover
        _debug_log(
            "H5",
            "backend/nlp_engine.py:analyze_product_image",
            "Analyze failed with exception",
            {"error": str(exc)},
        )
        return {"error": f"AI analysis failed: {exc}"}

    if not caption:
        return {"error": "AI did not produce a valid caption. Please retry."}

    category = assign_category(caption)
    price_range = estimate_price_range(caption, category)

    return {
        "ai_caption": caption,
        "category": category,
        "seo_title": professional_seo_title(caption, category),
        "price_range": price_range,
        "tags": generate_tags(caption, category),
        "marketing_description": generate_marketing_description(caption, category),
    }

