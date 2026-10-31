"""Cluster-level endpoints proxied from Garage's admin API."""

from flask import Blueprint, current_app, jsonify

from ..clients.admin import admin_client
from ..errors import ApiError

bp = Blueprint("cluster", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    try:
        garage = admin_client().get("GetClusterHealth")
    except ApiError as exc:
        return jsonify({"status": "unreachable", "garage": exc.message}), 503
    return jsonify({"status": "ok", "garage": garage})


@bp.get("/cluster/status")
def cluster_status():
    return jsonify(admin_client().get("GetClusterStatus"))


@bp.get("/cluster/health")
def cluster_health():
    return jsonify(admin_client().get("GetClusterHealth"))


@bp.get("/cluster/statistics")
def cluster_statistics():
    return jsonify(admin_client().get("GetClusterStatistics"))


@bp.get("/settings")
def settings():
    config = current_app.config
    return jsonify(
        {
            "adminUrl": config["GARAGE_ADMIN_URL"],
            "s3Endpoint": config["GARAGE_S3_ENDPOINT"],
            "s3Region": config["GARAGE_S3_REGION"],
            "serviceAccessKey": config["GARAGE_S3_ACCESS_KEY"],
            "maxUploadMb": config["MAX_UPLOAD_MB"],
            "websiteDomain": config["GARAGE_WEBSITE_DOMAIN"],
            "singleNode": config["GARAGE_SINGLE_NODE"],
        }
    )