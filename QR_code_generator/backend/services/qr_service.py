import base64
import io
import os
import random
import re
import json
import time
from typing import Final
from urllib.parse import quote_plus

import qrcode
import requests
from PIL import Image, ImageChops, ImageEnhance
from qrcode.constants import ERROR_CORRECT_H

POLLINATIONS_BASE_URL: Final[str] = "https://image.pollinations.ai/prompt"
NAVA_BASE_URL: Final[str] = "https://api.nava.ai/v1/generate"


def _agent_log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    # #region agent log
    try:
        with open(
            # Write to the shared session log file used by this debug session.
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "debug-d56b4c.log"),
            "a",
            encoding="utf-8",
        ) as debug_file:
            debug_file.write(
                json.dumps(
                    {
                        "sessionId": "d56b4c",
                        "runId": "qr-repeat-debug",
                        "hypothesisId": hypothesis_id,
                        "location": location,
                        "message": message,
                        "data": data,
                        "timestamp": int(time.time() * 1000),
                    }
                )
                + "\n"
            )
    except Exception:
        pass
    # #endregion


class QRServiceError(Exception):
    """Raised when QR generation or AI styling fails."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def _normalize_phone_number(phone_number: str) -> str:
    normalized = re.sub(r"\s+", "", phone_number)
    if not re.fullmatch(r"\+?\d{7,15}", normalized):
        raise QRServiceError(
            "Invalid phone number format. Use 7-15 digits, optional leading +."
        )
    return normalized


def _build_qr_image(phone_number: str) -> Image.Image:
    qr = qrcode.QRCode(
        version=4,
        error_correction=ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(f"tel:{phone_number}")
    qr.make(fit=True)

    return qr.make_image(fill_color="black", back_color="white").convert("RGB")


def _build_qr_base64(phone_number: str) -> str:
    image = _build_qr_image(phone_number)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _fetch_pollinations_image(prompt: str) -> Image.Image:
    encoded_prompt = quote_plus(prompt.strip())
    seed = random.randint(1, 999_999_999)
    key = (os.getenv("POLLINATIONS_API_KEY") or "").strip()
    key_query = f"&key={quote_plus(key)}" if key else ""
    url = (
        f"{POLLINATIONS_BASE_URL}/{encoded_prompt}"
        f"?width=1024&height=1024&nologo=true&seed={seed}{key_query}"
    )
    _agent_log(
        "H4",
        "QR_code_generator/backend/services/qr_service.py:_fetch_pollinations_image",
        "Calling Pollinations provider",
        {"seed": seed, "promptLength": len(prompt.strip())},
    )
    try:
        response = requests.get(url, timeout=15)
    except requests.RequestException as exc:
        print(f"DEBUG: Pollinations URL failed: {url}")
        raise QRServiceError("Pollinations is unreachable. Please try again.") from exc

    if response.status_code != 200:
        print(f"DEBUG: Pollinations URL failed: {url}")
        raise QRServiceError(
            f"Pollinations request failed with status {response.status_code}: {response.text}"
        )

    try:
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    except Exception as exc:
        raise QRServiceError("Pollinations returned an invalid image payload.") from exc


def _fetch_nava_image(prompt: str) -> Image.Image:
    encoded_prompt = quote_plus(prompt.strip())
    seed = random.randint(1, 999_999_999)
    url = (
        f"{NAVA_BASE_URL}"
        f"?prompt={encoded_prompt}&model=fast-flux&aspect_ratio=1:1&seed={seed}"
    )
    _agent_log(
        "H4",
        "QR_code_generator/backend/services/qr_service.py:_fetch_nava_image",
        "Calling Nava provider fallback",
        {"seed": seed, "promptLength": len(prompt.strip())},
    )
    headers = {}
    public_key = (os.getenv("NAVA_PUBLIC_KEY") or "nava_guest_2026").strip()
    if public_key:
        headers["X-API-Key"] = public_key

    try:
        response = requests.get(url, headers=headers, timeout=15)
    except requests.RequestException as exc:
        print(f"DEBUG: Nava URL failed: {url}")
        raise QRServiceError("Nava AI is unreachable. Please try again.") from exc

    if response.status_code != 200:
        print(f"DEBUG: Nava URL failed: {url}")
        raise QRServiceError(f"Nava request failed with status {response.status_code}: {response.text}")

    content_type = response.headers.get("Content-Type", "")
    if "application/json" in content_type:
        payload = response.json()
        if payload.get("image_base64"):
            return Image.open(io.BytesIO(base64.b64decode(payload["image_base64"]))).convert("RGB")
        if payload.get("image_url"):
            image_response = requests.get(payload["image_url"], timeout=15)
            image_response.raise_for_status()
            return Image.open(io.BytesIO(image_response.content)).convert("RGB")
        raise QRServiceError("Nava response did not include image data.")

    return Image.open(io.BytesIO(response.content)).convert("RGB")


def generate_stylized_image(prompt: str, qr_image: Image.Image) -> str:
    try:
        ai_image = _fetch_pollinations_image(prompt)
    except QRServiceError as pollinations_error:
        print(f"DEBUG: Pollinations failed. Trying Nava fallback. Reason: {pollinations_error}")
        ai_image = _fetch_nava_image(prompt)

    ai_image = ai_image.resize(qr_image.size, Image.Resampling.LANCZOS)
    ai_image = ImageEnhance.Color(ai_image).enhance(1.15)
    ai_image = ImageEnhance.Contrast(ai_image).enhance(1.08)

    # Build a mask where only dark QR modules are selected.
    qr_l = qr_image.convert("L")
    qr_mask = qr_l.point(lambda p: 255 if p < 100 else 0).convert("L")

    # Keep style visible: use darkened AI only on QR modules.
    darkened_ai = ImageEnhance.Brightness(ai_image).enhance(0.22)
    qr_layer = Image.composite(darkened_ai, ai_image, qr_mask)

    # Blend back with original AI so output stays artistic, not purely black/white.
    blended = Image.blend(ai_image, qr_layer, 0.72)

    output_buffer = io.BytesIO()
    blended.save(output_buffer, format="PNG")
    return base64.b64encode(output_buffer.getvalue()).decode("utf-8")


def generate_artistic_qr(phone_number: str, prompt: str) -> str:
    _agent_log(
        "H3",
        "QR_code_generator/backend/services/qr_service.py:generate_artistic_qr:entry",
        "generate_artistic_qr called",
        {"phoneLength": len(phone_number), "promptLength": len(prompt)},
    )
    normalized_phone_number = _normalize_phone_number(phone_number)
    qr_image = _build_qr_image(normalized_phone_number)
    qr_base64 = _build_qr_base64(normalized_phone_number)
    styled_prompt = (
        f"{prompt}. Artistic style inspired by a phone QR composition for {normalized_phone_number}."
    )
    try:
        return generate_stylized_image(styled_prompt, qr_image)
    except QRServiceError as exc:
        # Final local fallback: always return a working QR code.
        print(f"DEBUG: Pollinations failed, falling back to raw QR. Reason: {exc}")
        return qr_base64
    except Exception as exc:
        # Safety net to avoid 500 for unexpected provider/runtime errors.
        print(f"DEBUG: Unexpected styling error, falling back to raw QR. Reason: {exc}")
        return qr_base64
