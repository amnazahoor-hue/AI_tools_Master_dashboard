from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from database import (
    create_log,
    create_user,
    get_admin_metrics,
    get_recent_logs,
    get_user_by_email_or_username,
    get_user_streak,
    get_username,
    has_log_for_date,
    init_db,
    seed_demo_data,
)
from logic.auditor import (
    generate_daily_advice,
    generate_insight,
    get_correlation_matrix,
    get_predicted_goals,
    predict_tomorrow_focus,
)


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
ASSETS_DIR = FRONTEND_DIR / "assets"

app = Flask(
    __name__,
    static_folder=str(ASSETS_DIR),
    static_url_path="/assets",
)
init_db()


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Smart-Log Health & Productivity Auditor"})


@app.route("/", methods=["GET"])
def dashboard_page():
    return send_from_directory(FRONTEND_DIR, "dashboard.html")


@app.route("/admin", methods=["GET"])
def admin_page():
    return send_from_directory(FRONTEND_DIR, "admin.html")


@app.route("/api/users", methods=["POST"])
def api_create_user():
    payload = request.get_json(force=True)
    username = payload.get("username")
    email = payload.get("email")

    if not username or not email:
        return jsonify({"error": "username and email are required"}), 400

    try:
        user_id = create_user(username=username, email=email)
    except Exception as exc:  # sqlite IntegrityError and others
        existing_user = get_user_by_email_or_username(email=email, username=username)
        if existing_user:
            existing_user["streak"] = get_user_streak(int(existing_user["id"]))
            return jsonify(existing_user), 200
        return jsonify({"error": str(exc)}), 400

    return jsonify({"id": user_id, "username": username, "email": email, "streak": get_user_streak(user_id)}), 201


@app.route("/api/logs", methods=["POST"])
def api_create_log():
    payload = request.get_json(force=True)
    required_fields = ["user_id", "date", "sleep_hours", "steps", "focus_score", "mood_score"]
    missing_fields = [field for field in required_fields if field not in payload]
    if missing_fields:
        return jsonify({"error": f"Missing fields: {', '.join(missing_fields)}"}), 400

    try:
        log_id = create_log(
            user_id=int(payload["user_id"]),
            date=str(payload["date"]),
            sleep_hours=float(payload["sleep_hours"]),
            steps=int(payload["steps"]),
            focus_score=int(payload["focus_score"]),
            mood_score=int(payload["mood_score"]),
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    streak = get_user_streak(int(payload["user_id"]))
    return jsonify({"id": log_id, "message": "Log saved successfully", "streak": streak}), 201


@app.route("/api/demo-seed/<int:user_id>", methods=["POST"])
def api_seed_demo(user_id: int):
    inserted = seed_demo_data(user_id)
    return jsonify({"rows_inserted": inserted, "message": "Demo data generated"})


@app.route("/api/dashboard/<int:user_id>", methods=["GET"])
def api_dashboard_data(user_id: int):
    days = int(request.args.get("days", 7))
    logs = get_recent_logs(user_id=user_id, days=days)
    username = get_username(user_id) or "there"

    sleep_data = [entry["sleep_hours"] for entry in logs]
    steps_data = [entry["steps"] for entry in logs]
    focus_data = [entry["focus_score"] for entry in logs]
    mood_data = [entry["mood_score"] for entry in logs]

    if len(logs) >= 2:
        insight = generate_insight(sleep_data, focus_data)
    else:
        insight = {
            "correlation": 0.0,
            "insight": "Neutral Insight: Add at least 2 daily logs for smart analysis.",
        }
    daily_advice = generate_daily_advice(logs)
    predicted_goals = get_predicted_goals(user_id)
    tomorrow_prediction = predict_tomorrow_focus(user_id)
    correlation_matrix = get_correlation_matrix(sleep_data, steps_data, focus_data, mood_data)
    logged_today = has_log_for_date(user_id, request.args.get("today", ""))
    streak = get_user_streak(user_id)

    return jsonify(
        {
            "logs": logs,
            "insight": insight,
            "daily_advice": daily_advice,
            "predicted_goals": predicted_goals,
            "tomorrow_prediction": tomorrow_prediction,
            "correlation_matrix": correlation_matrix,
            "username": username,
            "logged_today": logged_today,
            "streak": streak,
        }
    )


@app.route("/api/admin/metrics", methods=["GET"])
def api_admin_metrics():
    metrics = get_admin_metrics()
    return jsonify(metrics)


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5104)
