from typing import Any, Sequence

import numpy as np
import sqlite3
from pathlib import Path


def compute_pearson_correlation(x_values: Sequence[float], y_values: Sequence[float]) -> float:
    if len(x_values) != len(y_values):
        raise ValueError("Both input lists must have the same length.")
    if len(x_values) < 2:
        raise ValueError("At least 2 data points are required to compute correlation.")

    x_array = np.array(x_values, dtype=float)
    y_array = np.array(y_values, dtype=float)

    if np.std(x_array) == 0 or np.std(y_array) == 0:
        return 0.0

    correlation_matrix = np.corrcoef(x_array, y_array)
    return float(correlation_matrix[0, 1])


def generate_insight(x_values: Sequence[float], y_values: Sequence[float]) -> dict[str, float | str]:
    correlation = compute_pearson_correlation(x_values, y_values)

    if correlation > 0.6:
        insight = "Positive Insight: We found a strong link between your sleep and focus!"
    elif correlation < -0.6:
        insight = "Negative Insight: Your sleep and focus appear to move in opposite directions."
    else:
        insight = "Neutral Insight: We do not see a strong relationship yet. Keep logging daily."

    return {"correlation": round(correlation, 4), "insight": insight}


def get_predicted_goals(user_id: int) -> dict[str, float | int]:
    db_path = Path(__file__).resolve().parents[1] / "smart_log.db"
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT
                ROUND(AVG(sleep_hours), 1) AS avg_sleep_hours,
                CAST(ROUND(AVG(steps), 0) AS INTEGER) AS avg_steps,
                CAST(ROUND(AVG(focus_score), 0) AS INTEGER) AS avg_focus_score,
                CAST(ROUND(AVG(mood_score), 0) AS INTEGER) AS avg_mood_score
            FROM logs
            WHERE user_id = ?;
            """,
            (user_id,),
        )
        row = cursor.fetchone()
    finally:
        connection.close()

    if not row or row["avg_sleep_hours"] is None:
        return {
            "sleep_hours": 7.0,
            "steps": 7000,
            "focus_score": 7,
            "mood_score": 7,
        }

    return {
        "sleep_hours": float(row["avg_sleep_hours"]),
        "steps": int(row["avg_steps"]),
        "focus_score": int(row["avg_focus_score"]),
        "mood_score": int(row["avg_mood_score"]),
    }


def get_correlation_matrix(
    sleep_values: Sequence[float],
    steps_values: Sequence[float],
    focus_values: Sequence[float],
    mood_values: Sequence[float],
) -> dict[str, list[list[float]]]:
    if len(sleep_values) < 2:
        return {
            "row_labels": ["Sleep", "Steps"],
            "col_labels": ["Focus", "Mood"],
            "values": [[0.0, 0.0], [0.0, 0.0]],
        }

    matrix = [
        [
            round(compute_pearson_correlation(sleep_values, focus_values), 4),
            round(compute_pearson_correlation(sleep_values, mood_values), 4),
        ],
        [
            round(compute_pearson_correlation(steps_values, focus_values), 4),
            round(compute_pearson_correlation(steps_values, mood_values), 4),
        ],
    ]
    return {
        "row_labels": ["Sleep", "Steps"],
        "col_labels": ["Focus", "Mood"],
        "values": matrix,
    }


def generate_daily_advice(logs: Sequence[dict[str, Any]]) -> str:
    if len(logs) < 3:
        return "Keep logging for a few more days and we will generate a personalized daily tip."

    recent_logs = list(logs)[-7:]
    today = recent_logs[-1]

    avg_focus = float(np.mean([entry["focus_score"] for entry in recent_logs]))
    avg_sleep = float(np.mean([entry["sleep_hours"] for entry in recent_logs]))
    avg_steps = float(np.mean([entry["steps"] for entry in recent_logs]))

    today_focus = float(today["focus_score"])
    if avg_focus <= 0:
        return "Your weekly focus baseline is still stabilizing. Keep adding entries daily."

    focus_drop_pct = ((avg_focus - today_focus) / avg_focus) * 100
    if focus_drop_pct < 8:
        return "Your focus is close to your weekly baseline. Keep your current routine steady."

    sleep_values = [entry["sleep_hours"] for entry in recent_logs]
    step_values = [entry["steps"] for entry in recent_logs]
    focus_values = [entry["focus_score"] for entry in recent_logs]

    sleep_corr = compute_pearson_correlation(sleep_values, focus_values)
    steps_corr = compute_pearson_correlation(step_values, focus_values)

    today_sleep = float(today["sleep_hours"])
    today_steps = float(today["steps"])

    if sleep_corr >= steps_corr and today_sleep < avg_sleep:
        gap = max(0.2, avg_sleep - today_sleep)
        return (
            f"Your focus is {focus_drop_pct:.0f}% lower than usual. Based on your history, "
            f"adding about {gap:.1f} more hours of sleep tends to help recover focus."
        )

    if today_steps < avg_steps:
        step_gap = int(max(500, avg_steps - today_steps))
        return (
            f"Your focus is {focus_drop_pct:.0f}% lower than usual. Based on your history, "
            f"an extra {step_gap} steps (about a 20-minute walk) usually helps."
        )

    return (
        f"Your focus is {focus_drop_pct:.0f}% below baseline. Keep sleep and movement steady "
        "today and reassess tomorrow."
    )


def predict_tomorrow_focus(user_id: int) -> dict[str, float]:
    db_path = Path(__file__).resolve().parents[1] / "smart_log.db"
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT sleep_hours, steps, focus_score
            FROM logs
            WHERE user_id = ?
            ORDER BY date DESC
            LIMIT 14;
            """,
            (user_id,),
        )
        rows = cursor.fetchall()
    finally:
        connection.close()

    if len(rows) < 3:
        return {
            "predicted_focus_score": 7.0,
            "target_sleep_hours": 7.0,
            "target_steps": 7000.0,
        }

    logs = list(reversed(rows))
    sleep = np.array([float(row["sleep_hours"]) for row in logs], dtype=float)
    steps = np.array([float(row["steps"]) for row in logs], dtype=float)
    focus = np.array([float(row["focus_score"]) for row in logs], dtype=float)

    target_sleep = float(np.mean(sleep))
    target_steps = float(np.mean(steps))

    # Multiple linear regression: focus = b0 + b1*sleep + b2*steps
    X = np.column_stack((np.ones(len(logs)), sleep, steps))
    coeffs, _, _, _ = np.linalg.lstsq(X, focus, rcond=None)

    predicted_focus = float(coeffs[0] + coeffs[1] * target_sleep + coeffs[2] * target_steps)
    predicted_focus = float(np.clip(predicted_focus, 1.0, 10.0))

    return {
        "predicted_focus_score": round(predicted_focus, 2),
        "target_sleep_hours": round(target_sleep, 1),
        "target_steps": round(target_steps, 0),
    }
