import io
import os
import random
from typing import Dict
from urllib.parse import quote_plus

import requests
from PIL import Image, ImageOps


THEME_PROMPTS: Dict[str, str] = {
    "Minimalist": "High-end minimalist living room, neutral colors, clean lines, designer furniture, 8k, cinematic lighting",
    "Industrial": "Luxury industrial loft interior, exposed textures, matte metal accents, warm ambient lighting, realistic furniture layout, 8k",
    "Bohemian": "Premium bohemian interior design, layered textiles, earthy tones, curated decor, natural daylight, photorealistic, 8k",
    "Modern Office": "Executive modern office interior, ergonomic premium furniture, clean geometry, balanced lighting, photorealistic, 8k",
}

DEFAULT_THEME = "Minimalist"
POLLINATIONS_BASE_URL = "https://image.pollinations.ai/prompt"


def clamp_prompt_strength(value: float) -> float:
    return max(0.1, min(1.0, float(value)))


def build_prompt(theme: str) -> str:
    resolved_theme = theme if theme in THEME_PROMPTS else DEFAULT_THEME
    return (
        f"{resolved_theme} style interior design, architectural photography, 8k, "
        "highly detailed, realistic lighting"
    )


def preprocess_room_photo(image_bytes: bytes) -> Image.Image:
    with Image.open(io.BytesIO(image_bytes)) as raw_img:
        img = ImageOps.exif_transpose(raw_img).convert("RGB")
        max_dim = 1536
        if max(img.width, img.height) > max_dim:
            img.thumbnail((max_dim, max_dim))

        # Normalization pass to improve image consistency before generation.
        img = ImageOps.autocontrast(img, cutoff=1)
        return img


def generate_staged_design(image: Image.Image, theme: str, prompt_strength: float, output_path: str) -> bytes:
    # Keep prompt_strength for endpoint compatibility.
    _ = clamp_prompt_strength(prompt_strength)
    _ = image  # Reserved for future img2img support.
    api_key = os.getenv("POLLINATIONS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("POLLINATIONS_API_KEY is not configured.")

    prompt = build_prompt(theme)
    encoded_prompt = quote_plus(prompt)
    seed = random.randint(1, 999999999)
    pollinations_url = (
        f"{POLLINATIONS_BASE_URL}/{encoded_prompt}"
        f"?width=1024&height=1024&nologo=true&seed={seed}&model=flux"
    )
    response = requests.get(
        pollinations_url,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=180,
    )

    if response.status_code != 200:
        try:
            details = response.json()
        except Exception:
            details = response.text
        raise RuntimeError(f"Pollinations API error ({response.status_code}): {details}")

    content_type = response.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        raise RuntimeError("Pollinations response did not include image bytes.")

    image_bytes = response.content
    with open(output_path, "wb") as staged_file:
        staged_file.write(image_bytes)
    return image_bytes
