"""Full admin-panel endpoints: layout, node operations, workers, admin tokens."""

from flask import Blueprint, jsonify, request

from ..clients.admin import admin_client
from ..errors import ApiError

bp = Blueprint("admin_panel", __name__, url_prefix="/api")


def _json() -> dict:
    return request.get_json(silent=True) or {}


def _node_param(node_id: str) -> dict:
    return {"node": node_id}


# ---- Cluster layout -------------------------------------------------------


@bp.get("/cluster/layout")
def get_layout():
    return jsonify(admin_client().get("GetClusterLayout"))


@bp.post("/cluster/layout")
def stage_layout():
    body = _json()
    roles = body.get("roles", [])
    if not isinstance(roles, list):
        raise ApiError(400, "InvalidRoles", "`roles` must be a list.")
    payload = {"roles": roles}
    if body.get("parameters") is not None:
        payload["parameters"] = body["parameters"]
    return jsonify(admin_client().post("UpdateClusterLayout", json=payload))


@bp.post("/cluster/layout/preview")
def preview_layout():
    return jsonify(admin_client().post("PreviewClusterLayoutChanges"))


@bp.post("/cluster/layout/apply")
def apply_layout():
    version = _json().get("version")
    if not isinstance(version, int):
        raise ApiError(400, "MissingVersion", "A layout version number is required.")
    return jsonify(admin_client().post("ApplyClusterLayout", json={"version": version}))


@bp.post("/cluster/layout/revert")
def revert_layout():
    return jsonify(admin_client().post("RevertClusterLayout"))


@bp.post("/cluster/layout/skip-dead-nodes")
def skip_dead_nodes():
    data = _json()
    version = data.get("version")
    if not isinstance(version, int):
        raise ApiError(400, "MissingVersion", "A layout version number is required.")
    return jsonify(
        admin_client().post(
            "ClusterLayoutSkipDeadNodes",
            json={
                "version": version,
                "allowMissingData": bool(data.get("allowMissingData")),
            },
        )
    )


# ---- Per-node operations (Garage returns a MultiResponse) -----------------


@bp.get("/cluster/nodes/<node_id>")
def node_info(node_id: str):
    return jsonify(admin_client().get("GetNodeInfo", params=_node_param(node_id)))


@bp.get("/cluster/nodes/<node_id>/statistics")
def node_statistics(node_id: str):
    return jsonify(
        admin_client().get("GetNodeStatistics", params=_node_param(node_id))
    )


@bp.post("/cluster/nodes/<node_id>/snapshot")
def node_snapshot(node_id: str):
    return jsonify(
        admin_client().post("CreateMetadataSnapshot", params=_node_param(node_id))
    )


@bp.post("/cluster/nodes/<node_id>/repair")
def node_repair(node_id: str):
    data = _json()
    repair_type = data.get("repairType")
    if repair_type is None:
        raise ApiError(400, "MissingRepairType", "A repair type is required.")
    return jsonify(
        admin_client().post(
            "LaunchRepairOperation",
            params=_node_param(node_id),
            json={"repairType": repair_type},
        )
    )


@bp.post("/cluster/nodes/<node_id>/workers")
def node_workers(node_id: str):
    data = _json()
    payload = {
        "busyOnly": bool(data.get("busyOnly", False)),
        "errorOnly": bool(data.get("errorOnly", False)),
    }
    return jsonify(
        admin_client().post(
            "ListWorkers", params=_node_param(node_id), json=payload
        )
    )


@bp.get("/cluster/nodes/<node_id>/block-errors")
def node_block_errors(node_id: str):
    return jsonify(
        admin_client().get("ListBlockErrors", params=_node_param(node_id))
    )


# ---- Admin API tokens -----------------------------------------------------


@bp.get("/admin-tokens")
def list_admin_tokens():
    return jsonify(admin_client().get("ListAdminTokens"))


@bp.post("/admin-tokens")
def create_admin_token():
    data = _json()
    name = (data.get("name") or "").strip()
    if not name:
        raise ApiError(400, "MissingTokenName", "A token name is required.")
    payload = {"name": name}
    if data.get("scope"):
        payload["scope"] = data["scope"]
    if data.get("expiration"):
        payload["expiration"] = data["expiration"]
    if data.get("neverExpires"):
        payload["neverExpires"] = True
    return jsonify(admin_client().post("CreateAdminToken", json=payload)), 201


@bp.post("/admin-tokens/<token_id>/delete")
def delete_admin_token(token_id: str):
    admin_client().post("DeleteAdminToken", params={"id": token_id})
    return jsonify({"deleted": token_id})