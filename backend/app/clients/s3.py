"""S3 client used for object-level operations (the admin API has none)."""

from __future__ import annotations

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from flask import current_app

from ..errors import ApiError

_S3_ERROR_HINTS = {
    "AccessDenied": "The UI service key has no access to this bucket. Grant it read/write "
    "permission from the bucket's Permissions tab.",
    "NoSuchBucket": "The bucket does not exist or has no global alias.",
    "NoSuchKey": "The object does not exist.",
}


def make_s3(config: dict):
    return boto3.client(
        "s3",
        endpoint_url=config["GARAGE_S3_ENDPOINT"],
        aws_access_key_id=config["GARAGE_S3_ACCESS_KEY"],
        aws_secret_access_key=config["GARAGE_S3_SECRET_KEY"],
        region_name=config["GARAGE_S3_REGION"],
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            retries={"max_attempts": 3, "mode": "standard"},
        ),
    )


def s3_client():
    return current_app.extensions["s3_client"]


def translate_s3_error(exc: Exception) -> ApiError:
    if isinstance(exc, ClientError):
        code = exc.response.get("Error", {}).get("Code", "S3Error")
        message = exc.response.get("Error", {}).get("Message") or str(exc)
        hint = _S3_ERROR_HINTS.get(code)
        status = 403 if code in ("AccessDenied", "InvalidAccessKeyId") else 404
        if code not in _S3_ERROR_HINTS:
            status = 502
            hint = None
        return ApiError(status, code, f"{hint}" if hint else message)
    if isinstance(exc, BotoCoreError):
        return ApiError(502, "S3Unreachable", f"Cannot reach the Garage S3 API: {exc}")
    return ApiError(500, "InternalError", str(exc))