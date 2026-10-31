"""Bucket management endpoints."""

from flask import Blueprint, current_app, jsonify, request

from ..clients.admin import admin_client
from ..errors import ApiError

bp = Blueprint("buckets", __name__, url_prefix="/api")

_UPDATABLE_FIELDS = ("websiteAccess", "quotas", "corsRules", "lifecycleRules")


@bp.get("/buckets")
def list_buckets():
    return jsonify(admin_client().get("ListBucketsInfo") or [])


@bp.get("/buckets/<bucket_id>")
def get_bucket(bucket_id: str):
    return jsonify(admin_client().get("GetBucketInfo", {"id": bucket_id}))


@bp.post("/buckets")
def create_bucket():
    data = request.get_json(silent=True) or {}
    alias = (data.get("globalAlias") or "").strip()
    if not alias:
        raise ApiError(400, "MissingBucketName", "A bucket name is required.")

    info = admin_client().post("CreateBucket", json={"globalAlias": alias}) or {}

    if data.get("grantServiceKey", True) and info.get("id"):
        service_key = current_app.config["GARAGE_S3_ACCESS_KEY"]
        if service_key:
            admin_client().post(
                "AllowBucketKey",
                json={
                    "bucketId": info["id"],
                    "accessKeyId": service_key,
                    "permissions": {"read": True, "write": True, "owner": True},
                },
            )
            info = admin_client().get("GetBucketInfo", {"id": info["id"]})

    return jsonify(info), 201


@bp.delete("/buckets/<bucket_id>")
def delete_bucket(bucket_id: str):
    admin_client().post("DeleteBucket", params={"id": bucket_id})
    return jsonify({"deleted": bucket_id})


@bp.patch("/buckets/<bucket_id>")
def update_bucket(bucket_id: str):
    data = request.get_json(silent=True) or {}
    body = {key: data[key] for key in _UPDATABLE_FIELDS if key in data}
    if not body:
        raise ApiError(400, "NothingToUpdate", "No supported fields were provided.")
    return jsonify(
        admin_client().post("UpdateBucket", params={"id": bucket_id}, json=body)
    )


@bp.post("/buckets/<bucket_id>/permissions")
def set_permissions(bucket_id: str):
    data = request.get_json(silent=True) or {}
    access_key = (data.get("accessKeyId") or "").strip()
    if not access_key:
        raise ApiError(400, "MissingAccessKey", "An access key ID is required.")

    endpoint = "DenyBucketKey" if data.get("action") == "deny" else "AllowBucketKey"
    payload = {
        "bucketId": bucket_id,
        "accessKeyId": access_key,
        "permissions": {
            "read": bool(data.get("read")),
            "write": bool(data.get("write")),
            "owner": bool(data.get("owner")),
        },
    }
    return jsonify(admin_client().post(endpoint, json=payload))


@bp.post("/buckets/<bucket_id>/aliases")
def add_alias(bucket_id: str):
    data = request.get_json(silent=True) or {}
    alias = (data.get("globalAlias") or "").strip()
    if not alias:
        raise ApiError(400, "MissingAlias", "A global alias is required.")
    return jsonify(
        admin_client().post(
            "AddBucketAlias", json={"bucketId": bucket_id, "globalAlias": alias}
        )
    )


@bp.delete("/buckets/<bucket_id>/aliases")
def remove_alias(bucket_id: str):
    alias = (request.args.get("globalAlias") or "").strip()
    if not alias:
        raise ApiError(400, "MissingAlias", "A global alias is required.")
    return jsonify(
        admin_client().post(
            "RemoveBucketAlias", json={"bucketId": bucket_id, "globalAlias": alias}
        )
    )