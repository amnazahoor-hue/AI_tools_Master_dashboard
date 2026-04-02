from __future__ import annotations

import os
import sqlite3
from typing import Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "resume_data.db")


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize SQLite DB and ensure schema exists."""
    conn = _get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                score REAL NOT NULL,
                category TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cur.execute("CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at)")
        conn.commit()
    except sqlite3.Error as exc:
        raise RuntimeError(f"Failed to initialize database: {exc}") from exc
    finally:
        conn.close()


def categorize_score(score: float) -> str:
    # High / Medium / Low categories for admin distribution.
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def save_scan(filename: str, score: float) -> None:
    """Save one scan result row into SQLite."""
    category = categorize_score(float(score))
    conn = _get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO scans(filename, score, category)
            VALUES (?, ?, ?)
            """,
            (filename, float(score), category),
        )
        conn.commit()
    except sqlite3.Error as exc:
        raise RuntimeError(f"Failed to save scan: {exc}") from exc
    finally:
        conn.close()


def get_admin_stats() -> dict[str, Any]:
    """Load aggregated dashboard stats from SQLite."""
    conn = _get_connection()
    try:
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) AS total_count FROM scans")
        total_count = int(cur.fetchone()["total_count"] or 0)

        cur.execute("SELECT AVG(score) AS avg_score FROM scans")
        avg_score_raw = cur.fetchone()["avg_score"]
        avg_score = float(avg_score_raw) if avg_score_raw is not None else 0.0

        cur.execute(
            """
            SELECT
                SUM(CASE WHEN category = 'Low' THEN 1 ELSE 0 END) AS low_count,
                SUM(CASE WHEN category = 'Medium' THEN 1 ELSE 0 END) AS medium_count,
                SUM(CASE WHEN category = 'High' THEN 1 ELSE 0 END) AS high_count
            FROM scans
            """
        )
        row = cur.fetchone()
        low = int(row["low_count"] or 0)
        medium = int(row["medium_count"] or 0)
        high = int(row["high_count"] or 0)

        cur.execute(
            """
            SELECT filename, score, created_at
            FROM scans
            ORDER BY created_at DESC
            LIMIT 5
            """
        )
        recent = [
            {
                "candidate_name": str(r["filename"]),
                "match_score": float(r["score"]),
                "created_at": str(r["created_at"]),
            }
            for r in cur.fetchall()
        ]

        return {
            "total_count": total_count,
            "avg_score": round(avg_score, 2),
            "score_distribution": {
                "High": high,
                "Medium": medium,
                "Low": low,
            },
            # Keep compatibility with current frontend chart contract.
            "score_bins": [low, medium, high],
            "recent_activity": recent,
        }
    except sqlite3.Error as exc:
        raise RuntimeError(f"Failed to query admin stats: {exc}") from exc
    finally:
        conn.close()

