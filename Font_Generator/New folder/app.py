from flask import Blueprint, Flask, jsonify, render_template, request


main_bp = Blueprint("main", __name__)


@main_bp.get("/")
def index():
    return render_template("index.html")


@main_bp.post("/convert")
def convert_text():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", ""))
    style = str(payload.get("style", "plain"))

    unsupported_found = any(
        not (char.isascii() and (char.isalnum() or char.isspace() or char in ".,!?@#$%^&*()-_=+[]{};:'\"/\\|`~<>"))
        for char in text
    )

    return jsonify(
        {
            "ok": True,
            "text": text,
            "style": style,
            "warning": "Some non-Latin characters may remain unchanged." if unsupported_found else None,
        }
    )


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(main_bp)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5103, debug=True)
