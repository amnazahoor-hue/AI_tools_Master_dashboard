from __future__ import annotations

import os
import re
import time
import uuid
from typing import Any

from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from fpdf import FPDF
from werkzeug.utils import secure_filename

from database import get_admin_stats, init_db, save_scan
from models.pdf_parser import extract_text_from_pdf
from models.skills import extract_top_skills
from models.similarity import SemanticMatcher, ResumeCandidate


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")

os.makedirs(UPLOADS_DIR, exist_ok=True)


def json_response(data: dict[str, Any], status_code: int = 200):
    # Requirement: "JSONResponse format for all API outputs".
    return jsonify(data), status_code


def candidate_name_from_filename(filename: str) -> str:
    base = os.path.splitext(os.path.basename(filename))[0]
    base = re.sub(r"[_\-]+", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    return base.title() if base else "Candidate"


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app_start = time.time()
    matcher = SemanticMatcher(model_name="sentence-transformers/all-MiniLM-L6-v2")

    init_db()

    @app.route("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.route("/admin")
    def admin():
        return send_from_directory(FRONTEND_DIR, "admin.html")

    @app.route("/assets/<path:filename>")
    def assets(filename: str):
        return send_from_directory(ASSETS_DIR, filename)

    @app.route("/api/match", methods=["POST"])
    def api_match():
        if "job_description" not in request.form:
            return json_response(
                {"success": False, "error": "Missing `job_description` field."},
                status_code=400,
            )

        job_description = (request.form.get("job_description") or "").strip()
        if not job_description:
            return json_response(
                {"success": False, "error": "`job_description` cannot be empty."},
                status_code=400,
            )

        files = request.files.getlist("resumes")
        if not files:
            return json_response(
                {"success": False, "error": "Please upload one or more resume PDFs."},
                status_code=400,
            )

        temp_paths: list[str] = []
        try:
            candidates: list[ResumeCandidate] = []
            for f in files:
                original = f.filename or ""
                if not original:
                    continue

                # Basic filename-based validation.
                if not original.lower().endswith(".pdf"):
                    continue

                safe_name = secure_filename(original)
                unique_name = f"{uuid.uuid4().hex}__{safe_name}"
                save_path = os.path.join(UPLOADS_DIR, unique_name)
                temp_paths.append(save_path)
                f.save(save_path)

                resume_text = extract_text_from_pdf(save_path, max_pages=None)
                candidate_name = candidate_name_from_filename(original)
                candidates.append(ResumeCandidate(candidate_name=candidate_name, resume_text=resume_text))

            if not candidates:
                return json_response(
                    {
                        "success": False,
                        "error": "No valid PDFs were provided (ensure files end with .pdf).",
                    },
                    status_code=400,
                )

            ranked = matcher.rank(job_description=job_description, candidates=candidates)

            results: list[dict[str, Any]] = []
            for item in ranked:
                top_skills = extract_top_skills(item["resume_text"], top_n=8)
                results.append(
                    {
                        "candidate_name": item["candidate_name"],
                        "match_score": item["match_score"],
                        "top_skills": top_skills,
                    }
                )

            # Persist scan scores for admin analytics.
            if results:
                for r in results:
                    save_scan(r["candidate_name"], float(r["match_score"]))

            return json_response(
                {
                    "success": True,
                    "candidates": results,
                    "meta": {"processed": len(results)},
                },
                status_code=200,
            )
        except Exception as e:
            return json_response(
                {
                    "success": False,
                    "error": "Failed to process resumes.",
                    "details": str(e),
                },
                status_code=500,
            )
        finally:
            # Best-effort temp cleanup.
            for p in temp_paths:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except OSError:
                    pass

    @app.route("/api/admin-stats", methods=["GET"])
    def api_admin_stats():
        model_loaded = matcher._model is not None  # intentionally read-only for this endpoint

        try:
            stats = get_admin_stats()
        except RuntimeError as e:
            return json_response(
                {"success": False, "error": "Failed to fetch admin stats.", "details": str(e)},
                status_code=500,
            )

        return json_response(
            {
                "success": True,
                "total_count": stats["total_count"],
                "avg_score": stats["avg_score"],
                "score_distribution": stats["score_distribution"],
                "score_bins": stats["score_bins"],
                "model_loaded": bool(model_loaded),
                "recent_activity": stats["recent_activity"],
                "uptime_seconds": round(time.time() - app_start, 2),
            },
            status_code=200,
        )

    @app.route("/api/admin-report.pdf", methods=["GET"])
    def api_admin_report_pdf():
        model_loaded = matcher._model is not None

        try:
            stats = get_admin_stats()
        except RuntimeError as e:
            return json_response(
                {"success": False, "error": "Failed to generate report data.", "details": str(e)},
                status_code=500,
            )

        try:
            def _safe_pdf_text(value: Any, max_len: int = 120) -> str:
                text = str(value) if value is not None else ""
                text = text.replace("\n", " ").replace("\r", " ").strip()
                text = text[:max_len]
                # Core PDF fonts in FPDF are latin-1; replace unsupported chars.
                return text.encode("latin-1", "replace").decode("latin-1")

            def _line(pdf_obj: FPDF, text: str, *, h: int = 8) -> None:
                pdf_obj.set_x(10)
                pdf_obj.cell(190, h, _safe_pdf_text(text, 180))
                pdf_obj.ln(h)

            pdf = FPDF()
            pdf.set_auto_page_break(auto=True, margin=12)
            pdf.add_page()

            # Header
            pdf.set_font("Helvetica", "B", 16)
            _line(pdf, "AI Resume Screener & Talent Matcher", h=10)
            pdf.set_font("Helvetica", "", 11)
            _line(pdf, "Analytics Report")
            _line(pdf, f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
            pdf.ln(3)

            # Summary
            pdf.set_font("Helvetica", "B", 13)
            _line(pdf, "Summary", h=9)
            pdf.set_font("Helvetica", "", 11)
            _line(pdf, f"Total resumes processed: {stats['total_count']}")
            _line(pdf, f"Average match score: {stats['avg_score']:.2f}%")
            _line(pdf, f"AI model status: {'Ready' if model_loaded else 'Waking up'}")
            pdf.ln(3)

            # Distribution
            dist = stats["score_distribution"]
            pdf.set_font("Helvetica", "B", 13)
            _line(pdf, "Score Distribution", h=9)
            pdf.set_font("Helvetica", "", 11)
            _line(pdf, f"High: {dist.get('High', 0)}")
            _line(pdf, f"Medium: {dist.get('Medium', 0)}")
            _line(pdf, f"Low: {dist.get('Low', 0)}")
            pdf.ln(3)

            # Recent activity
            pdf.set_font("Helvetica", "B", 13)
            _line(pdf, "Recent Activity (Last 5)", h=9)
            pdf.set_font("Helvetica", "", 10)
            recent = stats.get("recent_activity", [])
            if not recent:
                _line(pdf, "No recent activity.", h=7)
            else:
                for item in recent:
                    name = _safe_pdf_text(item.get("candidate_name", "Candidate"), 50)
                    score = float(item.get("match_score", 0.0))
                    created_at = _safe_pdf_text(item.get("created_at", ""), 32)
                    line = _safe_pdf_text(f"- {name} | {score:.2f}% | {created_at}", 110)
                    _line(pdf, line, h=7)

            pdf_bytes = bytes(pdf.output())
        except Exception as e:
            return json_response(
                {"success": False, "error": "Failed to generate PDF.", "details": str(e)},
                status_code=500,
            )

        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="analytics-report.pdf"'},
        )

    return app


if __name__ == "__main__":
    app = create_app()
    # Local dev: open on all interfaces for convenience.
    app.run(host="0.0.0.0", port=5107, debug=True)

