from pathlib import Path
from typing import Dict, List

from PIL import Image, ImageDraw, ImageFont

from database import get_product_by_id


def _normalize_tags(tags: str | List[str] | None) -> List[str]:
    if not tags:
        return []
    if isinstance(tags, list):
        raw_tags = tags
    else:
        raw_tags = [tag.strip() for tag in str(tags).split(",")]

    cleaned = []
    for tag in raw_tags:
        normalized = "".join(ch for ch in tag if ch.isalnum() or ch in (" ", "-")).strip()
        if normalized:
            cleaned.append(normalized.replace(" ", ""))
    return cleaned


def _hashtags(category: str, tags: str | List[str] | None) -> str:
    base = ["VisionInventoryPro", "ShopSmart", category.replace(" ", "")]
    from_tags = _normalize_tags(tags)[:4]
    merged = list(dict.fromkeys(base + from_tags))
    selected = merged[:5]
    return " ".join(f"#{tag}" for tag in selected)


def generate_social_posts(product_data: Dict[str, object]) -> Dict[str, str]:
    name = str(product_data.get("name", "Featured Product"))
    category = str(product_data.get("category", "General"))
    price = product_data.get("price") or product_data.get("suggested_price") or "N/A"
    ai_caption = str(product_data.get("ai_caption", "A premium product made for modern buyers."))
    tags = product_data.get("tags", "")
    hashtag_block = _hashtags(category, tags)

    instagram = (
        f"Meet your next favorite find: {name} ✨\n"
        f"Serving serious {category.lower()} vibes with style + function 💖\n"
        f"{ai_caption}\n"
        f"Now only ${price} 🔥\n\n"
        f"{hashtag_block}"
    )

    x_post = (
        f"Limited stock! 🚨 {name} just dropped in {category}.\n"
        f"{ai_caption[:95]}...\n"
        f"Grab it now for ${price} before it sells out. #FOMO #VisionInventoryPro"
    )

    linkedin = (
        f"Introducing {name} in our {category} portfolio.\n\n"
        f"{ai_caption}\n\n"
        f"This product is positioned to deliver strong customer value at ${price}, "
        "combining quality, practical utility, and market-ready presentation."
    )

    return {
        "instagram": instagram,
        "x": x_post,
        "linkedin": linkedin,
    }


def _load_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines[:2]


def generate_sale_card(product_id: int) -> Path | None:
    product = get_product_by_id(product_id)
    if not product:
        return None

    original_path = Path(str(product.get("original_image_path", "")))
    if not original_path.exists():
        return None

    canvas_size = (1080, 1080)
    canvas = Image.new("RGBA", canvas_size)
    draw = ImageDraw.Draw(canvas)

    # Rich slate gradient with soft magenta tint for social-feed pop.
    for y in range(canvas_size[1]):
        ratio = y / (canvas_size[1] - 1)
        r = int(8 + (48 - 8) * ratio)
        g = int(12 + (64 - 12) * ratio)
        b = int(28 + (108 - 28) * ratio)
        draw.line([(0, y), (canvas_size[0], y)], fill=(r, g, b, 255))

    glow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((120, 180, 960, 1000), fill=(236, 72, 153, 55))
    glow_draw.ellipse((240, 220, 920, 980), fill=(167, 139, 250, 45))
    canvas.alpha_composite(glow)

    product_image = Image.open(original_path).convert("RGBA")
    product_image.thumbnail((800, 800), Image.Resampling.LANCZOS)
    px = (canvas_size[0] - product_image.width) // 2
    py = (canvas_size[1] - product_image.height) // 2 + 30

    # Framed glass panel behind product for premium ad aesthetic.
    panel = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(panel)
    panel_x1 = px - 40
    panel_y1 = py - 45
    panel_x2 = px + product_image.width + 40
    panel_y2 = py + product_image.height + 40
    panel_draw.rounded_rectangle(
        [(panel_x1, panel_y1), (panel_x2, panel_y2)],
        radius=42,
        fill=(255, 255, 255, 22),
        outline=(255, 255, 255, 80),
        width=2,
    )
    canvas.alpha_composite(panel)
    canvas.paste(product_image, (px, py), product_image)

    title = str(product.get("name", "Product"))[:45]
    category = str(product.get("category", "Featured"))
    price_value = product.get("suggested_price")
    price_label = "Price N/A" if price_value in (None, "") else f"${float(price_value):.2f}"

    title_font = _load_font(60)
    subtitle_font = _load_font(30)
    badge_font = _load_font(50)
    watermark_font = _load_font(27)
    ribbon_font = _load_font(28)

    # Top promo ribbon.
    draw.rounded_rectangle([(54, 48), (350, 108)], radius=24, fill=(236, 72, 153, 235))
    draw.text((78, 66), "LIMITED DROP", fill=(255, 255, 255, 255), font=ribbon_font)

    # Name + category hierarchy.
    title_lines = _wrap_text(draw, title, title_font, 920)
    title_y = 140
    for line in title_lines:
        draw.text((56, title_y), line, fill=(255, 255, 255, 255), font=title_font)
        title_y += 64
    draw.text((56, title_y + 8), f"{category} Collection", fill=(220, 220, 245, 235), font=subtitle_font)

    badge_padding_x = 34
    badge_padding_y = 20
    badge_text_bbox = draw.textbbox((0, 0), price_label, font=badge_font)
    badge_width = (badge_text_bbox[2] - badge_text_bbox[0]) + badge_padding_x * 2
    badge_height = (badge_text_bbox[3] - badge_text_bbox[1]) + badge_padding_y * 2
    badge_x1 = canvas_size[0] - badge_width - 50
    badge_y1 = canvas_size[1] - badge_height - 55
    badge_x2 = badge_x1 + badge_width
    badge_y2 = badge_y1 + badge_height
    # Drop shadow then badge.
    draw.rounded_rectangle(
        [(badge_x1 + 8, badge_y1 + 10), (badge_x2 + 8, badge_y2 + 10)],
        radius=26,
        fill=(0, 0, 0, 90),
    )
    draw.rounded_rectangle(
        [(badge_x1, badge_y1), (badge_x2, badge_y2)],
        radius=26,
        fill=(236, 72, 153, 245),
    )
    draw.text(
        (badge_x1 + badge_padding_x, badge_y1 + badge_padding_y - 2),
        price_label,
        fill=(255, 255, 255, 255),
        font=badge_font,
    )

    draw.text(
        (56, canvas_size[1] - 125),
        "Shop now before stock runs out",
        fill=(244, 244, 255, 230),
        font=subtitle_font,
    )
    draw.text(
        (52, canvas_size[1] - 60),
        "VisionInventory Pro",
        fill=(230, 230, 240, 235),
        font=watermark_font,
    )

    output_path = Path(__file__).resolve().parent / "uploads" / f"post_{product_id}.png"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output_path, "PNG")
    return output_path

