import os
from logging.handlers import RotatingFileHandler

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from services.generator import GeneratorService


load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)

    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3104")
    CORS(
        app,
        resources={r"/api/*": {"origins": [frontend_origin]}},
        supports_credentials=False,
    )

    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["60 per minute"],
        storage_uri="memory://",
    )

    os.makedirs("logs", exist_ok=True)
    file_handler = RotatingFileHandler("logs/app.log", maxBytes=1_000_000, backupCount=3)
    file_handler.setLevel(os.getenv("LOG_LEVEL", "INFO"))
    app.logger.addHandler(file_handler)
    app.logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

    generator_service = GeneratorService(app.logger)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"})

    @app.route("/api/generate/text", methods=["POST"])
    @limiter.limit("20 per minute")
    def generate_text():
        payload = request.get_json(silent=True) or {}
        prompt = str(payload.get("prompt", "")).strip()
        if not prompt:
            return jsonify({"error": "Prompt is required."}), 400

        try:
            article = generator_service.generate_article(prompt)
            return jsonify({"article": article}), 200
        except Exception:
            app.logger.exception("Text generation failed")
            return jsonify({"error": "Failed to generate article text."}), 503

    @app.route("/api/generate/images", methods=["POST"])
    @limiter.limit("10 per minute")
    def generate_images():
        payload = request.get_json(silent=True) or {}
        text = str(payload.get("text", "")).strip()
        count = int(payload.get("count", os.getenv("DEFAULT_IMAGE_COUNT", "1")))
        if not text:
            return jsonify({"error": "Source text is required."}), 400
        if count < 1 or count > 4:
            return jsonify({"error": "Image count must be between 1 and 4."}), 400

        try:
            images = generator_service.generate_images(text, count)
            return jsonify({"images": images}), 200
        except Exception:
            app.logger.exception("Image generation failed")
            return jsonify({"error": "Failed to generate images."}), 503

    @app.route("/api/feedback", methods=["POST"])
    @limiter.limit("40 per minute")
    def submit_feedback():
        payload = request.get_json(silent=True) or {}
        rating = payload.get("rating")
        comments = str(payload.get("comments", "")).strip()

        if rating not in [1, 2, 3, 4, 5]:
            return jsonify({"error": "Rating must be an integer from 1 to 5."}), 400
        if len(comments) > 1_000:
            return jsonify({"error": "Comments are too long."}), 400

        app.logger.info("Feedback received | rating=%s | comments=%s", rating, comments)
        return jsonify({"status": "received"}), 200

    return app


if __name__ == "__main__":
    flask_app = create_app()
    flask_app.run(
        host=os.getenv("FLASK_HOST", "127.0.0.1"),
        port=int(os.getenv("FLASK_PORT", "5109")),
        debug=os.getenv("FLASK_ENV", "development") == "development",
    )
