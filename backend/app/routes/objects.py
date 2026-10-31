"""Object browser endpoints, backed by the S3 API (the admin API has none)."""

import os

from flask import Blueprint, Response, jsonify, request, stream_with_context

from ..clients.s3 import s3_client, translate_s3_error
from ..errors import ApiError
from ..utils import bucket_alias

bp = Blueprint("objects", __name__, url_prefix="/api")

_CHUNK_SIZE = 64 * 1024
_PAGE_SIZE = 200


@bp.get("/buckets/<bucket_id>/objects")
def list_objects(bucket_id: str):
    alias = bucket_alias(bucket_id)
    prefix = request.args.get("prefix", "")
    token = request.args.get("token") or None

    kwargs = {
        "Bucket": alias,
        "Prefix": prefix,
        "Delimiter": "/",
        "MaxKeys": _PAGE_SIZE,
    }
    if token:
        kwargs["ContinuationToken"] = token

    try:
        result = s3_client().list_objects_v2(**kwargs)
    except Exception as exc:
        raise translate_s3_error(exc) from exc

    folders = [entry["Prefix"] for entry in result.get("CommonPrefixes", [])]
    objects = [
        {
            "key": obj["Key"],
            "size": obj["Size"],
            "lastModified": obj["LastModified"].isoformat(),
            "etag": (obj.get("ETag") or "").strip('"'),
        }
        for obj in result.get("Contents", [])
        if obj["Key"] != prefix
    ]

    return jsonify(
        {
            "bucket": alias,
            "prefix": prefix,
            "folders": folders,
            "objects": objects,
            "nextToken": result.get("NextContinuationToken"),
            "isTruncated": bool(result.get("IsTruncated")),
        }
    )


@bp.post("/buckets/<bucket_id>/objects")
def upload_objects(bucket_id: str):
    alias = bucket_alias(bucket_id)
    prefix = request.form.get("prefix", "")
    files = request.files.getlist("files")
    if not files:
        raise ApiError(400, "NoFiles", "No files were provided.")

    uploaded = []
    for stored in files:
        if not stored.filename:
            continue
        key = f"{prefix}{os.path.basename(stored.filename)}"
        try:
            s3_client().upload_fileobj(
                stored,
                alias,
                key,
                ExtraArgs={"ContentType": stored.mimetype or "application/octet-stream"},
            )
        except Exception as exc:
            raise translate_s3_error(exc) from exc
        uploaded.append(key)

    return jsonify({"uploaded": uploaded}), 201


@bp.get("/buckets/<bucket_id>/objects/download")
def download_object(bucket_id: str):
    alias = bucket_alias(bucket_id)
    key = request.args.get("key", "")
    if not key:
        raise ApiError(400, "MissingKey", "An object key is required.")

    try:
        obj = s3_client().get_object(Bucket=alias, Key=key)
    except Exception as exc:
        raise translate_s3_error(exc) from exc

    filename = os.path.basename(key.rstrip("/")) or "download"
    response = Response(
        stream_with_context(obj["Body"].iter_chunks(chunk_size=_CHUNK_SIZE)),
        mimetype=obj.get("ContentType") or "application/octet-stream",
    )
    response.headers["Content-Length"] = str(obj["ContentLength"])
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@bp.delete("/buckets/<bucket_id>/objects")
def delete_object(bucket_id: str):
    alias = bucket_alias(bucket_id)
    key = request.args.get("key", "")
    if not key:
        raise ApiError(400, "MissingKey", "An object key is required.")

    try:
        s3_client().delete_object(Bucket=alias, Key=key)
    except Exception as exc:
        raise translate_s3_error(exc) from exc

    return jsonify({"deleted": key})