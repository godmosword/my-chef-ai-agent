"""Durable recipe image storage abstraction (memory / GCS)."""
from __future__ import annotations

import asyncio
import secrets
import urllib.parse
from dataclasses import dataclass
from pathlib import PurePosixPath

from app.config import (
    GCP_PROJECT_ID,
    RECIPE_IMAGE_GCS_BUCKET,
    RECIPE_IMAGE_GCS_PREFIX,
    RECIPE_IMAGE_GCS_SIGNED_URL_TTL_SEC,
    RECIPE_IMAGE_STORAGE_BACKEND,
    logger,
)
from app.observability import incr
from app.recipe_hero_media import register_recipe_hero_png


@dataclass(frozen=True)
class StoredMedia:
    url: str
    backend: str


_warned_missing_gcs_config = False


def _gcs_object_path(*, purpose: str) -> str:
    token = secrets.token_urlsafe(20)
    prefix = RECIPE_IMAGE_GCS_PREFIX or "recipe-hero"
    path = PurePosixPath(prefix) / purpose / f"{token}.png"
    return str(path)


def _public_gcs_url(bucket: str, object_name: str) -> str:
    encoded = urllib.parse.quote(object_name, safe="/")
    return f"https://storage.googleapis.com/{bucket}/{encoded}"


def _upload_to_gcs_sync(*, payload: bytes, object_name: str) -> str | None:
    try:
        from google.cloud import storage
    except Exception as exc:
        logger.warning("recipe media storage: google-cloud-storage unavailable: %s", exc)
        return None

    client = storage.Client(project=GCP_PROJECT_ID or None)
    bucket = client.bucket(RECIPE_IMAGE_GCS_BUCKET)
    blob = bucket.blob(object_name)
    blob.upload_from_string(payload, content_type="image/png")

    # Prefer public URL when bucket/object ACL is public; otherwise signed URL.
    try:
        public = _public_gcs_url(RECIPE_IMAGE_GCS_BUCKET, object_name)
        if blob.public_url:
            return blob.public_url
        if bucket.iam_configuration.uniform_bucket_level_access_enabled:
            # UBLA likely means ACL-based public check is unavailable; sign URL by default.
            raise RuntimeError("ubla_enabled")
        acl_entities = {entry.get("entity") for entry in (blob.acl.get_entities() or [])}
        if "allUsers" in acl_entities:
            return public
    except Exception:
        pass

    if RECIPE_IMAGE_GCS_SIGNED_URL_TTL_SEC <= 0:
        return _public_gcs_url(RECIPE_IMAGE_GCS_BUCKET, object_name)

    return blob.generate_signed_url(
        version="v4",
        expiration=RECIPE_IMAGE_GCS_SIGNED_URL_TTL_SEC,
        method="GET",
    )


async def store_recipe_png(*, payload: bytes, purpose: str = "hero") -> StoredMedia | None:
    """Store generated PNG and return a public/signed https URL.

    Backend selection:
    - memory: short-lived in-process route `/media/recipe-hero/{token}`
    - gcs: durable cloud storage with public or signed URLs
    """
    backend = (RECIPE_IMAGE_STORAGE_BACKEND or "memory").lower().strip()
    if backend not in {"memory", "gcs"}:
        logger.warning("recipe media storage: unknown backend=%s, fallback to memory", backend)
        backend = "memory"

    if backend == "gcs":
        global _warned_missing_gcs_config
        if not RECIPE_IMAGE_GCS_BUCKET:
            if not _warned_missing_gcs_config:
                logger.warning(
                    "recipe media storage: backend=gcs but RECIPE_IMAGE_GCS_BUCKET missing; fallback to memory"
                )
                _warned_missing_gcs_config = True
            backend = "memory"
        else:
            object_name = _gcs_object_path(purpose=purpose)
            try:
                out = await asyncio.to_thread(_upload_to_gcs_sync, payload=payload, object_name=object_name)
                if isinstance(out, str) and out.startswith("https://"):
                    incr("media.storage.gcs.success_total")
                    logger.info("recipe media storage: gcs upload success bucket=%s object=%s", RECIPE_IMAGE_GCS_BUCKET, object_name)
                    return StoredMedia(url=out, backend="gcs")
                incr("media.storage.gcs.errors_total")
            except Exception as exc:
                incr("media.storage.gcs.errors_total")
                logger.warning("recipe media storage: gcs upload failed: %s", exc)
            # graceful fallback to memory
            backend = "memory"

    out = await register_recipe_hero_png(payload)
    if isinstance(out, str) and out.startswith("https://"):
        incr("media.storage.memory.success_total")
        return StoredMedia(url=out, backend="memory")
    incr("media.storage.memory.errors_total")
    logger.warning("recipe media storage: memory backend unavailable (PUBLIC_APP_BASE_URL missing?)")
    return None
