from dataclasses import dataclass
from typing import Optional


@dataclass
class Product:
    id: Optional[int]
    name: str
    original_image_path: str
    ai_caption: Optional[str] = None
    tags: Optional[str] = None
    marketing_description: Optional[str] = None
    category: Optional[str] = None
    suggested_price: Optional[float] = None
    status: str = "Draft"
    created_at: Optional[str] = None


@dataclass
class StoreSettings:
    id: int = 1
    currency_symbol: str = "$"
    default_tax_rate: float = 0.0
    updated_at: Optional[str] = None

