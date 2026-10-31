"""Access key management endpoints."""

from flask import Blueprint, jsonify, request

from ..clients.admin import admin_client
from ..errors import ApiError

bp = Blueprint("keys", __name__, url_prefix="/api")


def _permission_body(data: dict) -> dict:
    """Build an UpdateKey/CreateKey body fragment for the createBucket right."""
    if "createBucket" not in data:
        return {}
    outcome = "allow" if data["createBucket"] else "deny"
    return {outcome: {"createBucket": True}}


@bp.get("/keys")
def list_keys():
    return jsonify(admin_client().get("ListKeys") or [])


@bp.get("/keys/<key_id>")
def get_key(key_id: str):
    params = {"id": key_id}
    if request.args.get("reveal", "").lower() in ("1", "true", "yes"):
        params["showSecretKey"] = "true"
    return jsonify(admin_client().get("GetKeyInfo", params))


@bp.post("/keys")
def create_key():
    data = request.get_json(silent=True) or {}
    body = {}
    name = (data.get("name") or "").strip()
    if name:
        body["name"] = name
    body.update(_permission_body(data))
    return jsonify(admin_client().post("CreateKey", json=body)), 201


@bp.patch("/keys/<key_id>")
def update_key(key_id: str):
    data = request.get_json(silent=True) or {}
    body = {}
    if "name" in data:
        body["name"] = data["name"]
    body.update(_permission_body(data))
    if not body:
        raise ApiError(400, "NothingToUpdate", "No supported fields were provided.")
    return jsonify(
        admin_client().post("UpdateKey", params={"id": key_id}, json=body)
    )


@bp.delete("/keys/<key_id>")
def delete_key(key_id: str):
    admin_client().post("DeleteKey", params={"id": key_id})
    return jsonify({"deleted": key_id})