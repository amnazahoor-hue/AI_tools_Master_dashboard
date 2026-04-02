from __future__ import annotations

import os
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy import func

from database import db, init_db, User, EmailRecord, FollowUp
from logic.analytics import nudge_priority, suggested_nudge_date, emails_per_day, most_used_tone
from logic.nlp_engine import NudgeGenerator, AIEngineWarmingError


app = Flask(__name__, static_folder="../frontend", static_url_path="/")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///email_chaser.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
init_db(app)

generator = NudgeGenerator()


def _parse_iso_dt(value: str | None) -> datetime:
    if not value:
        return datetime.utcnow()
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _safe_json() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/dashboard")
def dashboard():
    return send_from_directory(app.static_folder, "dashboard.html")


@app.route("/admin")
def admin():
    return send_from_directory(app.static_folder, "admin.html")


@app.route("/assets/<path:filename>")
def frontend_assets(filename: str):
    assets_dir = os.path.join(app.static_folder, "assets")
    return send_from_directory(assets_dir, filename)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "email-no-response-chaser"})


@app.post("/api/users")
def create_user():
    data = _safe_json()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    role = data.get("role", "user").strip() or "user"

    if not name or not email:
        return jsonify({"error": "name and email are required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify(existing.to_dict()), 200

    user = User(name=name, email=email, role=role)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@app.post("/api/emails")
def create_email_record():
    data = _safe_json()

    user_id = data.get("user_id")
    subject = data.get("subject", "").strip()
    body = data.get("body", "").strip()
    category = data.get("category", "Client").strip() or "Client"
    tone = data.get("tone", "Professional").strip() or "Professional"
    notes = data.get("notes")
    sent_at = _parse_iso_dt(data.get("sent_at"))

    if not user_id or not subject or not body:
        return jsonify({"error": "user_id, subject, and body are required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    email_record = EmailRecord(
        user_id=user_id,
        subject=subject,
        body=body,
        category=category,
        tone=tone,
        sent_at=sent_at,
        suggested_nudge_at=suggested_nudge_date(sent_at, category),
        status="Pending",
        notes=notes,
    )
    db.session.add(email_record)
    user.last_activity_at = datetime.utcnow()
    db.session.commit()

    return jsonify(
        {
            **email_record.to_dict(),
            "nudge_priority": nudge_priority(category),
        }
    ), 201


@app.post("/api/emails/<int:email_id>/generate")
def generate_followups(email_id: int):
    email_record = EmailRecord.query.get(email_id)
    if not email_record:
        return jsonify({"error": "email not found"}), 404

    variations = generator.generate_variations(
        original_email=email_record.body,
        category=email_record.category,
        priority=nudge_priority(email_record.category),
    )
    created = []
    for variation_type, content in variations.items():
        follow_up = FollowUp(
            email_id=email_record.id,
            tone=variation_type,
            variation_type=variation_type,
            content=content,
            status="Generated",
        )
        db.session.add(follow_up)
        created.append(follow_up)

    owner = User.query.get(email_record.user_id)
    if owner:
        owner.last_activity_at = datetime.utcnow()
    db.session.commit()

    return jsonify(
        {
            "email_id": email_record.id,
            "generated_count": len(created),
            "follow_ups": [item.to_dict() for item in created],
        }
    )


@app.get("/api/emails/<int:email_id>/drafts")
def get_email_drafts(email_id: int):
    email_record = EmailRecord.query.get(email_id)
    if not email_record:
        return jsonify({"error": "email not found"}), 404

    drafts = (
        FollowUp.query.filter_by(email_id=email_id)
        .order_by(FollowUp.generated_at.desc())
        .all()
    )
    return jsonify(
        {
            "email_id": email_id,
            "follow_ups": [d.to_dict() for d in drafts],
        }
    )


@app.route("/api/emails/<int:email_id>/mark_sent", methods=["POST"])
def mark_email_sent(email_id: int):
    try:
        payload = _safe_json()
        email_record = EmailRecord.query.get(email_id)
        if not email_record:
            return jsonify({"success": False, "message": "Email not found"}), 404

        now = datetime.utcnow()
        email_record.status = "Sent"
        email_record.status_updated_at = now
        selected_tone = payload.get("variation_type")
        followups = FollowUp.query.filter_by(email_id=email_id).all()
        for row in followups:
            if selected_tone and row.variation_type != selected_tone:
                continue
            row.status = "Sent"
            row.sent_at = now

        owner = User.query.get(email_record.user_id)
        if owner:
            owner.last_activity_at = now
        db.session.commit()
        print(f"DEBUG: Successfully marked email {email_id} as Sent")
        return jsonify({"success": True, "message": "Status updated"}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/emails/<int:email_id>", methods=["DELETE"])
def delete_email(email_id: int):
    email_record = EmailRecord.query.get(email_id)
    if not email_record:
        return jsonify({"success": False, "message": "Email not found"}), 404
    db.session.delete(email_record)
    db.session.commit()
    return jsonify({"success": True, "message": "Email deleted"}), 200


@app.get("/api/dashboard/<int:user_id>")
def user_dashboard(user_id: int):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    emails = (
        EmailRecord.query.filter_by(user_id=user_id)
        .order_by(EmailRecord.sent_at.desc())
        .all()
    )

    follow_up_count = (
        db.session.query(func.count(FollowUp.id))
        .join(EmailRecord, FollowUp.email_id == EmailRecord.id)
        .filter(EmailRecord.user_id == user_id)
        .scalar()
    ) or 0

    payload_emails = []
    for e in emails:
        payload_emails.append(
            {
                "id": e.id,
                "subject": e.subject,
                "date_sent": e.sent_at.isoformat() if e.sent_at else None,
                "suggested_nudge_date": e.suggested_nudge_at.isoformat() if e.suggested_nudge_at else None,
                "status": e.status,
                "nudge_priority": nudge_priority(e.category),
            }
        )

    return jsonify(
        {
            "user": user.to_dict(),
            "active_chases": payload_emails,
            "success_rate": {
                "follow_ups_generated": follow_up_count,
                "emails_analyzed": len(emails),
            },
        }
    )


@app.get("/api/admin/stats")
def admin_stats():
    users = User.query.all()
    emails = EmailRecord.query.all()
    tones = [e.tone for e in emails]
    followups = FollowUp.query.all()
    today_key = datetime.utcnow().strftime("%Y-%m-%d")
    nudges_sent_today = sum(
        1
        for f in followups
        if f.sent_at and f.sent_at.strftime("%Y-%m-%d") == today_key
    )
    active_waiters = sum(1 for e in emails if e.status != "Sent")


    chart_data = emails_per_day([e.sent_at for e in emails if e.sent_at])

    users_payload = []
    for u in users:
        users_payload.append(
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "last_activity": u.last_activity_at.isoformat() if u.last_activity_at else None,
                "total_emails": len(u.emails),
            }
        )

    tone_distribution = {
        "Casual": 0,
        "Professional": 0,
        "Value-Add": 0,
    }
    for item in followups:
        if item.status == "Sent" and item.variation_type in tone_distribution:
            tone_distribution[item.variation_type] += 1

    return jsonify(
        {
            "global_stats": {
                "total_users": len(users),
                "total_emails_analyzed": len(emails),
                "most_used_tone": most_used_tone(tones),
                "active_waiters": active_waiters,
                "nudges_sent_today": nudges_sent_today,
            },
            "system_health": {
                "emails_chased_per_day": chart_data,
            },
            "tone_distribution": tone_distribution,
            "user_management": users_payload,
        }
    )


@app.errorhandler(AIEngineWarmingError)
def handle_ai_warming(_err):
    return jsonify({"error": "AI Engine is warming up, please try again in 30 seconds."}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5102)
