import csv
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from database import (
    bulk_delete_products,
    create_product,
    delete_product,
    get_product_by_id,
    get_settings,
    init_db,
    list_products,
    mark_products_active,
    update_product,
    update_settings,
)
from nlp_engine import analyze_product_image
from marketing_kit import generate_sale_card, generate_social_posts


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

app = Flask(__name__)
CORS(app)


def is_allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def build_image_path(filename: str) -> Path:
    extension = filename.rsplit(".", 1)[1].lower()
    safe_name = f"{uuid.uuid4().hex}.{extension}"
    return UPLOAD_DIR / safe_name


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "VisionInventory Pro API"})


@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename: str):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/api/products/analyze", methods=["POST"])
def analyze_product():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded. Expected multipart field `image`."}), 400

    image = request.files["image"]
    if not image or image.filename == "":
        return jsonify({"error": "Image file is missing."}), 400
    if not is_allowed_file(image.filename):
        return jsonify({"error": "Unsupported format. Use jpg, jpeg, png, webp."}), 400

    original_name = secure_filename(image.filename)
    target_path = build_image_path(original_name)
    image.save(target_path)

    ai_result = analyze_product_image(str(target_path))
    if "error" in ai_result:
        return jsonify(ai_result), 422

    response = {
        "name": ai_result["seo_title"],
        "original_image_path": str(target_path),
        "status": "Draft",
        **ai_result,
    }
    return jsonify(response), 200


@app.route("/api/products", methods=["POST"])
def save_product():
    payload = request.get_json(silent=True) or {}
    required = ["name", "original_image_path"]
    missing = [field for field in required if not payload.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    payload.setdefault("status", "Draft")
    payload.setdefault("suggested_price", payload.get("price_range", {}).get("max"))
    created = create_product(payload)
    return jsonify(created), 201


@app.route("/api/products", methods=["GET"])
def get_products():
    query = request.args.get("q")
    status = request.args.get("status")
    category = request.args.get("category")
    products = list_products(query=query, status=status, category=category)
    return jsonify(products)


@app.route("/api/products/<int:product_id>", methods=["PATCH"])
def patch_product(product_id: int):
    payload = request.get_json(silent=True) or {}
    updated = update_product(product_id, payload)
    if not updated:
        return jsonify({"error": "No valid fields supplied to update."}), 400
    return jsonify(updated)


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def remove_product(product_id: int):
    deleted_count = delete_product(product_id)
    if deleted_count == 0:
        return jsonify({"error": "Product not found."}), 404
    return jsonify({"deleted_count": deleted_count})


@app.route("/api/products/<int:product_id>/social-kit", methods=["POST"])
def product_social_kit(product_id: int):
    product = get_product_by_id(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404

    product_data = {
        "name": product.get("name"),
        "category": product.get("category"),
        "price": product.get("suggested_price"),
        "ai_caption": product.get("ai_caption"),
        "tags": product.get("tags"),
    }
    posts = generate_social_posts(product_data)
    return jsonify({"product_id": product_id, "social_posts": posts})


@app.route("/api/products/<int:product_id>/generate-image", methods=["GET"])
def generate_product_image(product_id: int):
    output_path = UPLOAD_DIR / f"post_{product_id}.png"
    if not output_path.exists():
        generated = generate_sale_card(product_id)
        if not generated or not generated.exists():
            return jsonify({"error": "Unable to generate image. Original product image may be missing."}), 404
        output_path = generated
    return send_file(output_path, mimetype="image/png")


@app.route("/api/products/bulk/mark-active", methods=["POST"])
def bulk_mark_active():
    payload = request.get_json(silent=True) or {}
    product_ids = payload.get("product_ids", [])
    updated_count = mark_products_active(product_ids)
    return jsonify({"updated_count": updated_count})


@app.route("/api/products/bulk/delete", methods=["POST"])
def bulk_remove_products():
    payload = request.get_json(silent=True) or {}
    product_ids = payload.get("product_ids", [])
    deleted_count = bulk_delete_products(product_ids)
    return jsonify({"deleted_count": deleted_count})


@app.route("/api/products/export/csv", methods=["GET"])
def export_products_csv():
    products = list_products(
        query=request.args.get("q"),
        status=request.args.get("status"),
        category=request.args.get("category"),
    )
    csv_path = BASE_DIR / "exports_inventory.csv"

    with open(csv_path, "w", newline="", encoding="utf-8") as csv_file:
        if products:
            writer = csv.DictWriter(csv_file, fieldnames=list(products[0].keys()))
            writer.writeheader()
            writer.writerows(products)
        else:
            writer = csv.writer(csv_file)
            writer.writerow(["No data"])

    return send_file(csv_path, as_attachment=True, download_name="inventory_export.csv")


@app.route("/api/settings", methods=["GET"])
def read_settings():
    return jsonify(get_settings())


@app.route("/api/settings", methods=["PUT"])
def write_settings():
    payload = request.get_json(silent=True) or {}
    updated = update_settings(payload)
    return jsonify(updated)


def bootstrap() -> None:
    init_db()


if __name__ == "__main__":
    bootstrap()
    app.run(debug=True, host="0.0.0.0", port=5108)

