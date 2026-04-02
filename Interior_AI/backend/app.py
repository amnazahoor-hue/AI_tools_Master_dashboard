import os
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from engine import generate_staged_design, preprocess_room_photo


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
DEFAULT_PROMPT_STRENGTH = 0.55

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024  # 15MB
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
)


def _is_allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.get("/api/health")
def health_check():
    return jsonify({"status": "ok"})


@app.post("/api/stage-room")
def stage_room():
    if "image" not in request.files:
        return jsonify({"error": "Missing image file. Use field name 'image'."}), 400

    image_file = request.files["image"]
    if not image_file.filename:
        return jsonify({"error": "No file selected."}), 400

    filename = secure_filename(image_file.filename)
    if not _is_allowed_file(filename):
        return jsonify({"error": "Unsupported file type."}), 400

    theme = request.form.get("theme", "Minimalist")
    raw_strength = request.form.get("prompt_strength", str(DEFAULT_PROMPT_STRENGTH))

    try:
        prompt_strength = float(raw_strength)
    except ValueError:
        return jsonify({"error": "prompt_strength must be a number between 0.1 and 1.0."}), 400

    file_ext = filename.rsplit(".", 1)[1].lower()
    file_uuid = str(uuid.uuid4())
    original_path = UPLOAD_DIR / f"{file_uuid}_original.{file_ext}"
    staged_path = UPLOAD_DIR / f"{file_uuid}_staged.png"

    try:
        image_bytes = image_file.read()
        processed_image = preprocess_room_photo(image_bytes)

        # Save normalized original for traceability and retries.
        processed_image.save(original_path, optimize=True)

        generate_staged_design(
            image=processed_image,
            theme=theme,
            prompt_strength=prompt_strength,
            output_path=str(staged_path),
        )
    except RuntimeError as exc:
        return jsonify({"error": "Staging provider request failed.", "details": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": "Failed to stage room.", "details": str(exc)}), 500

    return jsonify(
        {
            "id": file_uuid,
            "theme": theme,
            "prompt_strength": prompt_strength,
            "original_image_url": f"/api/uploads/{original_path.name}",
            "staged_image_url": f"/api/uploads/{staged_path.name}",
            "download_url": f"/api/download/{staged_path.name}",
        }
    )


@app.get("/api/uploads/<path:filename>")
def serve_uploaded_file(filename: str):
    target = (UPLOAD_DIR / filename).resolve()
    if not str(target).startswith(str(UPLOAD_DIR.resolve())) or not target.exists():
        return jsonify({"error": "File not found."}), 404
    return send_file(target)


@app.get("/api/download/<path:filename>")
def download_staged(filename: str):
    target = (UPLOAD_DIR / filename).resolve()
    if not str(target).startswith(str(UPLOAD_DIR.resolve())) or not target.exists():
        return jsonify({"error": "File not found."}), 404
    return send_file(target, as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.getenv("PORT", "5105")))
