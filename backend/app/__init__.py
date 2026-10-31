"""Flask application factory for the Garage admin UI backend."""

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .clients.admin import GarageAdminClient
from .clients.s3 import make_s3
from .config import load_config
from .errors import ApiError


def create_app():
    app = Flask(__name__)
    config = load_config()
    app.config.update(config)
    app.config["MAX_CONTENT_LENGTH"] = config["MAX_UPLOAD_MB"] * 1024 * 1024

    app.extensions["admin_client"] = GarageAdminClient(
        config["GARAGE_ADMIN_URL"], config["GARAGE_ADMIN_TOKEN"]
    )
    app.extensions["s3_client"] = make_s3(config)

    CORS(app, resources={r"/api/*": {"origins": config["CORS_ORIGINS"]}})

    from .routes import admin_panel, buckets, cluster, keys, objects

    app.register_blueprint(cluster.bp)
    app.register_blueprint(admin_panel.bp)
    app.register_blueprint(buckets.bp)
    app.register_blueprint(keys.bp)
    app.register_blueprint(objects.bp)

    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return jsonify({"code": err.code, "message": err.message}), err.status

    @app.errorhandler(HTTPException)
    def handle_http_error(err: HTTPException):
        if err.code == 413:
            return (
                jsonify(
                    {
                        "code": "PayloadTooLarge",
                        "message": f"Upload exceeds the {config['MAX_UPLOAD_MB']} MB limit.",
                    }
                ),
                413,
            )
        return jsonify({"code": err.name.replace(" ", ""), "message": err.description}), err.code

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        app.logger.exception("Unhandled error")
        return jsonify({"code": "InternalError", "message": str(err)}), 500

    return app