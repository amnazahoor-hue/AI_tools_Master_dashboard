from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Dict, Iterable, List


CATEGORY_NUDGE_WINDOWS = {
    "Job": 3,
    "Client": 2,
    "Personal": 5,
}


def nudge_priority(category: str) -> str:
    if category == "Client":
        return "High"
    if category == "Job":
        return "Medium"
    return "Low"


def suggested_nudge_date(sent_at: datetime, category: str) -> datetime:
    days = CATEGORY_NUDGE_WINDOWS.get(category, 4)
    return sent_at + timedelta(days=days)


def emails_per_day(entries: Iterable[datetime]) -> List[Dict[str, int]]:
    bucket = Counter(dt.strftime("%Y-%m-%d") for dt in entries)
    return [{"date": d, "count": bucket[d]} for d in sorted(bucket.keys())]


def most_used_tone(tones: Iterable[str]) -> str:
    counts = Counter(tones)
    if not counts:
        return "N/A"
    return counts.most_common(1)[0][0]
