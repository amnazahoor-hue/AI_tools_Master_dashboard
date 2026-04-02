from __future__ import annotations

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    role = db.Column(db.String(20), nullable=False, default="user")
    last_activity_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    emails = db.relationship(
        "EmailRecord",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "last_activity_at": self.last_activity_at.isoformat() if self.last_activity_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class EmailRecord(db.Model):
    __tablename__ = "emails"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    subject = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(30), nullable=False, default="Client")
    tone = db.Column(db.String(30), nullable=False, default="Professional")
    sent_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    suggested_nudge_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), nullable=False, default="Pending")
    status_updated_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    follow_ups = db.relationship(
        "FollowUp",
        backref="email_record",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "subject": self.subject,
            "body": self.body,
            "category": self.category,
            "tone": self.tone,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "suggested_nudge_at": self.suggested_nudge_at.isoformat() if self.suggested_nudge_at else None,
            "status": self.status,
            "status_updated_at": self.status_updated_at.isoformat() if self.status_updated_at else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class FollowUp(db.Model):
    __tablename__ = "follow_ups"

    id = db.Column(db.Integer, primary_key=True)
    email_id = db.Column(db.Integer, db.ForeignKey("emails.id"), nullable=False, index=True)
    tone = db.Column(db.String(30), nullable=False)
    variation_type = db.Column(db.String(30), nullable=False)
    content = db.Column(db.Text, nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    sent_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), nullable=False, default="Generated")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email_id": self.email_id,
            "tone": self.tone,
            "variation_type": self.variation_type,
            "content": self.content,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "status": self.status,
        }


def init_db(app) -> None:
    """Initialize SQLAlchemy with Flask app and create tables."""
    db.init_app(app)
    with app.app_context():
        db.create_all()
        # Lightweight schema sync for existing SQLite installs.
        columns = {
            row[1] for row in db.session.execute(text("PRAGMA table_info(emails)")).fetchall()
        }
        if "notes" not in columns:
            db.session.execute(text("ALTER TABLE emails ADD COLUMN notes TEXT"))
        if "status_updated_at" not in columns:
            db.session.execute(text("ALTER TABLE emails ADD COLUMN status_updated_at DATETIME"))
        db.session.commit()
