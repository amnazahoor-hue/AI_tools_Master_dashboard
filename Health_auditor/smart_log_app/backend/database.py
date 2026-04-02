import sqlite3
from datetime import date, timedelta
from pathlib import Path
import random
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "smart_log.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                current_streak INTEGER NOT NULL DEFAULT 0,
                longest_streak INTEGER NOT NULL DEFAULT 0
            );
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                sleep_hours REAL NOT NULL,
                steps INTEGER NOT NULL,
                focus_score INTEGER NOT NULL CHECK (focus_score BETWEEN 1 AND 10),
                mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE (user_id, date)
            );
            """
        )
        cursor.execute("PRAGMA table_info(users);")
        user_columns = {row["name"] for row in cursor.fetchall()}
        if "current_streak" not in user_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;")
        if "longest_streak" not in user_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0;")
        conn.commit()


def create_user(username: str, email: str) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, current_streak, longest_streak) VALUES (?, ?, 0, 0);",
            (username, email),
        )
        conn.commit()
        return int(cursor.lastrowid)


def create_log(
    user_id: int,
    date: str,
    sleep_hours: float,
    steps: int,
    focus_score: int,
    mood_score: int,
) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO logs (
                user_id, date, sleep_hours, steps, focus_score, mood_score
            )
            VALUES (?, ?, ?, ?, ?, ?);
            """,
            (user_id, date, sleep_hours, steps, focus_score, mood_score),
        )
        update_user_streak(user_id=user_id, connection=conn)
        conn.commit()
        return int(cursor.lastrowid)


def get_recent_logs(user_id: int, days: int = 7) -> list[dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT date, sleep_hours, steps, focus_score, mood_score
            FROM logs
            WHERE user_id = ?
            ORDER BY date DESC
            LIMIT ?;
            """,
            (user_id, days),
        )
        rows = cursor.fetchall()
        # Return ascending by date for chart friendliness.
        return [dict(row) for row in reversed(rows)]


def get_admin_metrics() -> dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) AS total_users FROM users;")
        total_users = int(cursor.fetchone()["total_users"])

        cursor.execute("SELECT COUNT(*) AS total_logs FROM logs;")
        total_logs = int(cursor.fetchone()["total_logs"])

        cursor.execute("SELECT ROUND(AVG(mood_score), 2) AS avg_mood FROM logs;")
        avg_row = cursor.fetchone()
        average_mood = float(avg_row["avg_mood"]) if avg_row["avg_mood"] is not None else 0.0

        cursor.execute(
            """
            SELECT date, COUNT(DISTINCT user_id) AS active_users
            FROM logs
            GROUP BY date
            ORDER BY date ASC;
            """
        )
        daily_activity = [dict(row) for row in cursor.fetchall()]

    return {
        "total_users": total_users,
        "total_logs": total_logs,
        "average_mood": average_mood,
        "daily_activity": daily_activity,
    }


def get_username(user_id: int) -> str | None:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        return str(row["username"]) if row else None


def _compute_streak_from_log_dates(dates_desc: list[str]) -> int:
    if not dates_desc:
        return 0

    streak = 1
    previous_date = date.fromisoformat(dates_desc[0])
    for value in dates_desc[1:]:
        current = date.fromisoformat(value)
        if previous_date - current == timedelta(days=1):
            streak += 1
            previous_date = current
            continue
        break
    return streak


def update_user_streak(user_id: int, connection: sqlite3.Connection | None = None) -> tuple[int, int]:
    owns_connection = connection is None
    conn = connection or get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT date
            FROM logs
            WHERE user_id = ?
            ORDER BY date DESC;
            """,
            (user_id,),
        )
        dates_desc = [row["date"] for row in cursor.fetchall()]
        current_streak = _compute_streak_from_log_dates(dates_desc)

        cursor.execute("SELECT longest_streak FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        longest_streak = max(int(row["longest_streak"]) if row else 0, current_streak)

        cursor.execute(
            "UPDATE users SET current_streak = ?, longest_streak = ? WHERE id = ?;",
            (current_streak, longest_streak, user_id),
        )
        if owns_connection:
            conn.commit()
        return current_streak, longest_streak
    finally:
        if owns_connection:
            conn.close()


def get_user_streak(user_id: int) -> dict[str, int | bool]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT current_streak, longest_streak
            FROM users
            WHERE id = ?;
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        current_streak = int(row["current_streak"]) if row else 0
        longest_streak = int(row["longest_streak"]) if row else 0
        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "has_data_scientist_badge": current_streak >= 14,
        }


def get_user_by_email_or_username(email: str, username: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, username, email
            FROM users
            WHERE email = ? OR username = ?
            LIMIT 1;
            """,
            (email, username),
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def has_log_for_date(user_id: int, target_date: str) -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM logs WHERE user_id = ? AND date = ? LIMIT 1;",
            (user_id, target_date),
        )
        return cursor.fetchone() is not None


def seed_demo_data(user_id: int) -> int:
    today = date.today()
    rows: list[tuple[int, str, float, int, int, int]] = []

    for day_offset in range(13, -1, -1):
        current_day = today - timedelta(days=day_offset)
        day_str = current_day.isoformat()

        sleep_hours = round(random.uniform(5.3, 8.8), 1)
        sleep_scaled = (sleep_hours - 5.0) / 4.0

        focus_base = 3.8 + (sleep_scaled * 5.1) + random.uniform(-1.0, 1.0)
        focus_score = max(1, min(10, int(round(focus_base))))

        mood_base = 4.2 + (sleep_scaled * 3.8) + random.uniform(-1.2, 1.2)
        mood_score = max(1, min(10, int(round(mood_base))))

        steps_base = 4500 + int(sleep_scaled * 6500) + random.randint(-900, 1200)
        steps = max(1800, steps_base)

        rows.append((user_id, day_str, sleep_hours, steps, focus_score, mood_score))

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.executemany(
            """
            INSERT OR REPLACE INTO logs (user_id, date, sleep_hours, steps, focus_score, mood_score)
            VALUES (?, ?, ?, ?, ?, ?);
            """,
            rows,
        )
        update_user_streak(user_id=user_id, connection=conn)
        conn.commit()

    return len(rows)
