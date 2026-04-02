import json
import os
import time
import uuid
import re

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from services.qr_service import QRServiceError, generate_artistic_qr

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)


def _debug_log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    # #region agent log
    try:
        with open(
            os.path.join(os.path.dirname(__file__), "..", "debug-5df370.log"),
            "a",
            encoding="utf-8",
        ) as debug_file:
            debug_file.write(
                json.dumps(
                    {
                        "sessionId": "5df370",
                        "runId": "pre-fix",
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


def _agent_log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    # #region agent log
    try:
        with open(
            # Write to the shared session log file used by this debug session.
            os.path.join(os.path.dirname(__file__), "..", "..", "debug-d56b4c.log"),
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


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    health_hits = {"count": 0}
    root_hits = {"count": 0}

    @app.route("/")
    def home():
        root_hits["count"] += 1
        _agent_log(
            "H6",
            "QR_code_generator/backend/app.py:home",
            "Root route hit",
            {
                "count": root_hits["count"],
                "origin": request.headers.get("Origin", ""),
                "referer": request.headers.get("Referer", ""),
                "secFetchDest": request.headers.get("Sec-Fetch-Dest", ""),
                "secFetchMode": request.headers.get("Sec-Fetch-Mode", ""),
                "secFetchSite": request.headers.get("Sec-Fetch-Site", ""),
                "userAgent": request.headers.get("User-Agent", ""),
            },
        )
        return "<html><body><h1>QR API Ready</h1></body></html>"

    @app.after_request
    def add_header(r):
        r.headers["Content-Security-Policy"] = (
            "frame-ancestors 'self' http://localhost:5500 http://127.0.0.1:5500 "
            "http://localhost:3000 http://localhost:3102 http://localhost:5106;"
        )
        return r

    @app.get("/health")
    def health_check():
        health_hits["count"] += 1
        _agent_log(
            "H7",
            "QR_code_generator/backend/app.py:health_check",
            "Health endpoint hit",
            {
                "count": health_hits["count"],
                "origin": request.headers.get("Origin", ""),
                "referer": request.headers.get("Referer", ""),
                "secFetchDest": request.headers.get("Sec-Fetch-Dest", ""),
                "secFetchMode": request.headers.get("Sec-Fetch-Mode", ""),
                "secFetchSite": request.headers.get("Sec-Fetch-Site", ""),
                "userAgent": request.headers.get("User-Agent", ""),
            },
        )
        _debug_log(
            "H11",
            "backend/app.py:health_check",
            "Health endpoint called",
            {"origin": request.headers.get("Origin", ""), "method": request.method},
        )
        return jsonify(
            {
                "status": "online",
                "token_loaded": False,
                "username": "amnazahoor",
            }
        )

    @app.route("/api/generate", methods=["POST", "OPTIONS"])
    def generate():
        if request.method == "OPTIONS":
            return "", 204

        request_id = str(uuid.uuid4())
        _agent_log(
            "H2",
            "QR_code_generator/backend/app.py:generate:entry",
            "Request entered /api/generate",
            {
                "requestId": request_id,
                "method": request.method,
                "origin": request.headers.get("Origin", ""),
                "userAgent": request.headers.get("User-Agent", ""),
            },
        )

        _debug_log(
            "H2",
            "backend/app.py:generate:start",
            "Request reached /api/generate",
            {"method": request.method, "has_json": request.is_json},
        )
        try:
            payload = request.get_json(force=True) or {}
            print(f"DEBUG: Received request data: {payload}")
        except Exception as exc:
            raw_body = request.get_data(as_text=True)
            print(f"DEBUG: JSON parse failed: {str(exc)}")
            print(f"DEBUG: Raw request body: {raw_body}")
            return jsonify({"error": "Invalid JSON body."}), 400

        phone_number = (payload.get("data") or payload.get("phone_number") or "").strip()
        prompt = (payload.get("prompt") or "").strip()

        _agent_log(
            "H2",
            "QR_code_generator/backend/app.py:generate:payload",
            "Parsed payload for /api/generate",
            {
                "requestId": request_id,
                "phoneLength": len(phone_number),
                "promptLength": len(prompt),
            },
        )

        if not phone_number:
            return jsonify({"error": "Missing field: 'data' is required"}), 400
        if not prompt:
            return jsonify({"error": "Missing field: 'prompt' is required"}), 400

        try:
            image_base64 = generate_artistic_qr(phone_number=phone_number, prompt=prompt)
            _agent_log(
                "H2",
                "QR_code_generator/backend/app.py:generate:success",
                "Returning successful generate response",
                {"requestId": request_id, "hasImage": bool(image_base64)},
            )
            return jsonify({"image_base64": image_base64})
        except QRServiceError as exc:
            _debug_log(
                "H4",
                "backend/app.py:generate:QRServiceError",
                "QR service raised expected error",
                {"error": str(exc)},
            )
            return jsonify({"error": str(exc)}), exc.status_code
        except Exception:
            _debug_log(
                "H5",
                "backend/app.py:generate:Exception",
                "Unhandled backend exception",
                {},
            )
            return (
                jsonify(
                    {
                        "error": "Unexpected server error while generating the artistic QR code."
                    }
                ),
                500,
            )

    return app


if __name__ == "__main__":
    flask_app = create_app()
    # Disable Flask dev reloader to prevent duplicate server instances on Windows.
    flask_app.run(
        host="0.0.0.0",
        port=5106,
        debug=False,
        use_reloader=False,
    )
