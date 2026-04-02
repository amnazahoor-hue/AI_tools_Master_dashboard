import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "vision_inventory.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with closing(get_connection()) as conn, conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                original_image_path TEXT NOT NULL,
                ai_caption TEXT,
                tags TEXT,
                marketing_description TEXT,
                category TEXT,
                suggested_price REAL,
                status TEXT NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft', 'Active', 'Archived')),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                currency_symbol TEXT NOT NULL DEFAULT '$',
                default_tax_rate REAL NOT NULL DEFAULT 0.0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO settings (id, currency_symbol, default_tax_rate)
            VALUES (1, '$', 0.0)
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)")


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return dict(row) if row else {}


def list_products(
    query: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    clauses = []
    params: List[Any] = []

    if query:
        clauses.append("(name LIKE ? OR ai_caption LIKE ? OR tags LIKE ?)")
        like_value = f"%{query}%"
        params.extend([like_value, like_value, like_value])
    if status:
        clauses.append("status = ?")
        params.append(status)
    if category:
        clauses.append("category = ?")
        params.append(category)

    sql = "SELECT * FROM products"
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY datetime(created_at) DESC"

    with closing(get_connection()) as conn:
        rows = conn.execute(sql, params).fetchall()
        return [row_to_dict(row) for row in rows]


def create_product(payload: Dict[str, Any]) -> Dict[str, Any]:
    fields = (
        "name",
        "original_image_path",
        "ai_caption",
        "tags",
        "marketing_description",
        "category",
        "suggested_price",
        "status",
    )
    values = [payload.get(field) for field in fields]

    with closing(get_connection()) as conn, conn:
        cursor = conn.execute(
            """
            INSERT INTO products (
                name, original_image_path, ai_caption, tags,
                marketing_description, category, suggested_price, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            values,
        )
        created = conn.execute(
            "SELECT * FROM products WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return row_to_dict(created)


def update_product(product_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    allowed_fields = {
        "name",
        "ai_caption",
        "tags",
        "marketing_description",
        "category",
        "suggested_price",
        "status",
    }
    updates = []
    params: List[Any] = []
    for key, value in payload.items():
        if key in allowed_fields:
            updates.append(f"{key} = ?")
            params.append(value)

    if not updates:
        return {}

    params.append(product_id)
    with closing(get_connection()) as conn, conn:
        conn.execute(
            f"UPDATE products SET {', '.join(updates)} WHERE id = ?",
            params,
        )
        updated = conn.execute(
            "SELECT * FROM products WHERE id = ?", (product_id,)
        ).fetchone()
        return row_to_dict(updated)


def get_product_by_id(product_id: int) -> Dict[str, Any]:
    with closing(get_connection()) as conn:
        row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        return row_to_dict(row)


def mark_products_active(product_ids: List[int]) -> int:
    if not product_ids:
        return 0

    placeholders = ",".join(["?"] * len(product_ids))
    with closing(get_connection()) as conn, conn:
        cursor = conn.execute(
            f"UPDATE products SET status = 'Active' WHERE id IN ({placeholders})",
            product_ids,
        )
        return cursor.rowcount


def delete_product(product_id: int) -> int:
    with closing(get_connection()) as conn, conn:
        cursor = conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
        return cursor.rowcount


def bulk_delete_products(product_ids: List[int]) -> int:
    if not product_ids:
        return 0

    placeholders = ",".join(["?"] * len(product_ids))
    with closing(get_connection()) as conn, conn:
        cursor = conn.execute(
            f"DELETE FROM products WHERE id IN ({placeholders})",
            product_ids,
        )
        return cursor.rowcount


def get_settings() -> Dict[str, Any]:
    with closing(get_connection()) as conn:
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        return row_to_dict(row)


def update_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    currency_symbol = payload.get("currency_symbol", "$")
    default_tax_rate = float(payload.get("default_tax_rate", 0.0))

    with closing(get_connection()) as conn, conn:
        conn.execute(
            """
            UPDATE settings
            SET currency_symbol = ?, default_tax_rate = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            """,
            (currency_symbol, default_tax_rate),
        )
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        return row_to_dict(row)

