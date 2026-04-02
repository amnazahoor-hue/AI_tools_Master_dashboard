from __future__ import annotations

import os
from typing import Optional

import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_path: str, *, max_pages: Optional[int] = None) -> str:
    """
    Extracts text from a PDF using PyMuPDF.

    Notes:
    - We concatenate text across pages.
    - For very large CVs, `max_pages` can cap processing cost.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(pdf_path)

    doc = fitz.open(pdf_path)
    try:
        texts: list[str] = []
        page_count = doc.page_count
        if max_pages is not None:
            page_count = min(page_count, max_pages)

        for page_index in range(page_count):
            page = doc.load_page(page_index)
            # "text" extraction is usually good enough for semantic matching.
            texts.append(page.get_text("text"))

        return "\n".join(texts).strip()
    finally:
        doc.close()

