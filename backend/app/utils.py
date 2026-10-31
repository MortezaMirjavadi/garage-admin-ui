"""Shared helpers for route modules."""

from __future__ import annotations

from .clients.admin import admin_client
from .errors import ApiError


def bucket_alias(bucket_id: str) -> str:
    """Resolve a bucket ID to its first global alias, which S3 operations require."""
    info = admin_client().get("GetBucketInfo", {"id": bucket_id})
    aliases = info.get("globalAliases") or []
    if not aliases:
        raise ApiError(
            409,
            "BucketWithoutAlias",
            "This bucket has no global alias, so it cannot be addressed through the S3 API. "
            "Add a global alias in the bucket settings.",
        )
    return aliases[0]


def clean_none(value):
    """Turn empty form strings into None so Garage can clear optional fields."""
    return None if value in ("", "null", "none") else value