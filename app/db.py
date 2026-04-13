"""Database operations: PostgreSQL only (strict tenant-aware)."""
from __future__ import annotations

import asyncio
import functools
import json
from datetime import date, datetime, timezone

import psycopg
from psycopg.rows import dict_row

from app.config import DATABASE_URL, REQUIRE_ATOMIC_USAGE, logger
from app.observability import incr


def _db_active() -> bool:
    return bool(DATABASE_URL)


def is_database_configured() -> bool:
    """True when DATABASE_URL is configured (persistence available)."""
    return _db_active()


def _pg_ping() -> bool:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, connect_timeout=3, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
    return True


async def ping_database() -> bool:
    """
    Return True if no DB is configured, or if a lightweight read succeeds.
    Used by GET /ready; failures mean Postgres is unreachable or misconfigured.
    """
    if not _db_active():
        return True
    try:
        return await asyncio.to_thread(_pg_ping)
    except Exception as exc:
        logger.warning("Database ping failed: %s", exc)
        return False


def _delete_user_data_postgres(user_id: str, tenant_id: str) -> None:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_memory WHERE tenant_id = %s AND user_id = %s", (tenant_id, user_id))
            cur.execute("DELETE FROM user_preferences WHERE tenant_id = %s AND user_id = %s", (tenant_id, user_id))
            cur.execute("DELETE FROM favorite_recipes WHERE tenant_id = %s AND user_id = %s", (tenant_id, user_id))
            cur.execute("DELETE FROM user_cuisine_context WHERE tenant_id = %s AND user_id = %s", (tenant_id, user_id))
            cur.execute("DELETE FROM usage_daily WHERE tenant_id = %s AND user_id = %s", (tenant_id, user_id))
            cur.execute("DELETE FROM usage_ledger WHERE tenant_id = %s AND user_id = %s", (tenant_id, user_id))
            cur.execute("DELETE FROM subscriptions WHERE tenant_id = %s AND user_id = %s", (tenant_id, user_id))


# ─── PostgreSQL (Render Postgres 等) ────────────────────────────────────────────


def _pg_user_memory_select(user_id: str, tenant_id: str) -> list:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT history FROM user_memory WHERE tenant_id = %s AND user_id = %s",
                (tenant_id, user_id),
            )
            row = cur.fetchone()
            if not row or row["history"] is None:
                return []
            h = row["history"]
            if isinstance(h, str):
                return json.loads(h)
            return h if isinstance(h, list) else []


def _pg_user_memory_upsert(user_id: str, history: list, tenant_id: str) -> None:
    assert DATABASE_URL
    payload = json.dumps(history, ensure_ascii=False)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_memory (tenant_id, user_id, history)
                VALUES (%s, %s, %s::jsonb)
                ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                    history = EXCLUDED.history,
                    updated_at = now()
                """,
                (tenant_id, user_id, payload),
            )


def _pg_user_memory_delete(user_id: str, tenant_id: str) -> None:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_memory WHERE tenant_id = %s AND user_id = %s", (tenant_id, user_id))


def _pg_user_preferences_select(user_id: str, tenant_id: str) -> str | None:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT preferences FROM user_preferences WHERE tenant_id = %s AND user_id = %s",
                (tenant_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            prefs = row.get("preferences")
            if prefs is None:
                return None
            if isinstance(prefs, list):
                return "、".join(str(p) for p in prefs) if prefs else None
            return str(prefs).strip() or None


def _pg_favorite_recipes_insert(user_id: str, recipe_name: str, recipe_data: dict, tenant_id: str) -> bool:
    assert DATABASE_URL
    payload = json.dumps(recipe_data, ensure_ascii=False)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO favorite_recipes (tenant_id, user_id, recipe_name, recipe_data)
                VALUES (%s, %s, %s, %s::jsonb)
                """,
                (tenant_id, user_id, recipe_name, payload),
            )
    return True


def _pg_favorite_recipes_select(user_id: str, tenant_id: str, limit: int = 10) -> list[dict]:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT id, recipe_name, recipe_data, created_at
                FROM favorite_recipes
                WHERE tenant_id = %s AND user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (tenant_id, user_id, limit),
            )
            rows = cur.fetchall()
    out: list[dict] = []
    for r in rows or []:
        d = dict(r)
        if d.get("created_at") is not None:
            d["created_at"] = d["created_at"].isoformat() if hasattr(d["created_at"], "isoformat") else str(d["created_at"])
        out.append(d)
    return out


def _pg_favorite_recipe_delete(user_id: str, recipe_id: int, tenant_id: str) -> bool:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM favorite_recipes WHERE id = %s AND tenant_id = %s AND user_id = %s",
                (recipe_id, tenant_id, user_id),
            )
    return True


def _pg_user_cuisine_context_select(user_id: str, tenant_id: str) -> tuple[str | None, str | None]:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT active_cuisine, context_updated_at FROM user_cuisine_context WHERE tenant_id = %s AND user_id = %s",
                (tenant_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                return None, None
            ts = row.get("context_updated_at")
            ts_out = ts.isoformat() if ts is not None and hasattr(ts, "isoformat") else (str(ts) if ts else None)
            return row.get("active_cuisine"), ts_out


def _pg_user_cuisine_context_upsert(user_id: str, active_cuisine: str, tenant_id: str) -> None:
    assert DATABASE_URL
    ts = datetime.now(timezone.utc)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_cuisine_context (tenant_id, user_id, active_cuisine, context_updated_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (tenant_id, user_id) DO UPDATE SET
                    active_cuisine = EXCLUDED.active_cuisine,
                    context_updated_at = EXCLUDED.context_updated_at
                """,
                (tenant_id, user_id, active_cuisine, ts),
            )


# ─── Safe DB Decorator ──────────────────────────────────────────────────────────


def safe_db(fallback=None):
    def deco(sync_fn):
        @functools.wraps(sync_fn)
        async def wrapped(*args, **kwargs):
            if not _db_active():
                return fallback
            try:
                return await asyncio.to_thread(sync_fn, *args, **kwargs)
            except Exception as exc:
                logger.warning("DB %s failed: %s", sync_fn.__name__, exc)
                incr(f"db.ops.errors.{sync_fn.__name__}_total")
                return fallback
        return wrapped
    return deco


# ─── Dispatching sync entrypoints (Postgres first) ─────────────────────────────


def _user_memory_select(user_id: str, tenant_id: str) -> list:
    return _pg_user_memory_select(user_id, tenant_id)


def _user_memory_upsert(user_id: str, history: list, tenant_id: str) -> None:
    return _pg_user_memory_upsert(user_id, history, tenant_id)


def _user_memory_delete(user_id: str, tenant_id: str) -> None:
    return _pg_user_memory_delete(user_id, tenant_id)


def _user_preferences_select(user_id: str, tenant_id: str) -> str | None:
    return _pg_user_preferences_select(user_id, tenant_id)


def _favorite_recipes_insert(user_id: str, recipe_name: str, recipe_data: dict, tenant_id: str) -> bool:
    return _pg_favorite_recipes_insert(user_id, recipe_name, recipe_data, tenant_id)


def _favorite_recipes_select(user_id: str, tenant_id: str, limit: int = 10) -> list[dict]:
    return _pg_favorite_recipes_select(user_id, tenant_id, limit)


def _favorite_recipe_delete(user_id: str, recipe_id: int, tenant_id: str) -> bool:
    return _pg_favorite_recipe_delete(user_id, recipe_id, tenant_id)


def _user_cuisine_context_select(user_id: str, tenant_id: str) -> tuple[str | None, str | None]:
    return _pg_user_cuisine_context_select(user_id, tenant_id)


def _user_cuisine_context_upsert(user_id: str, active_cuisine: str, tenant_id: str) -> None:
    return _pg_user_cuisine_context_upsert(user_id, active_cuisine, tenant_id)


def _usage_daily_select(user_id: str, usage_date: date, tenant_id: str) -> int:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT requests_count
                FROM usage_daily
                WHERE tenant_id = %s AND user_id = %s AND usage_date = %s
                LIMIT 1
                """,
                (tenant_id, user_id, usage_date),
            )
            row = cur.fetchone()
            return int(row[0]) if row else 0


def _usage_daily_increment(user_id: str, usage_date: date, tenant_id: str, units: int) -> int | None:
    assert DATABASE_URL
    try:
        with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO usage_daily (tenant_id, user_id, usage_date, requests_count, updated_at)
                    VALUES (%s, %s, %s, %s, now())
                    ON CONFLICT (tenant_id, user_id, usage_date)
                    DO UPDATE SET
                        requests_count = usage_daily.requests_count + EXCLUDED.requests_count,
                        updated_at = now()
                    RETURNING requests_count
                    """,
                    (tenant_id, user_id, usage_date, units),
                )
                row = cur.fetchone()
                return int(row[0]) if row else None
    except Exception as exc:
        if REQUIRE_ATOMIC_USAGE:
            raise RuntimeError("Atomic usage upsert failed") from exc
        logger.warning("Atomic usage upsert failed: %s", exc)
        return None


def _user_subscription_select(user_id: str, tenant_id: str) -> tuple[str, str]:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT plan_key, status
                FROM subscriptions
                WHERE tenant_id = %s AND user_id = %s
                LIMIT 1
                """,
                (tenant_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                return "free", "inactive"
            return (row.get("plan_key") or "free"), (row.get("status") or "inactive")


def _subscription_upsert(user_id: str, tenant_id: str, plan_key: str, status: str) -> None:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO subscriptions (tenant_id, user_id, plan_key, status, updated_at)
                VALUES (%s, %s, %s, %s, now())
                ON CONFLICT (tenant_id, user_id)
                DO UPDATE SET
                    plan_key = EXCLUDED.plan_key,
                    status = EXCLUDED.status,
                    updated_at = now()
                """,
                (tenant_id, user_id, plan_key, status),
            )


def _usage_ledger_insert(
    user_id: str,
    tenant_id: str,
    units: int,
    event_type: str,
    detail: dict | None = None,
) -> None:
    assert DATABASE_URL
    payload = json.dumps(detail or {}, ensure_ascii=False)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO usage_ledger (tenant_id, user_id, units, event_type, detail, created_at)
                VALUES (%s, %s, %s, %s, %s::jsonb, now())
                """,
                (tenant_id, user_id, units, event_type, payload),
            )


def _delete_user_data(user_id: str, tenant_id: str) -> None:
    _delete_user_data_postgres(user_id, tenant_id)


# ─── Async wrappers ─────────────────────────────────────────────────────────────


@safe_db([])
def get_user_memory(user_id: str, tenant_id: str = "default") -> list:
    return _user_memory_select(user_id, tenant_id)


@safe_db(None)
def save_user_memory(user_id: str, history: list, tenant_id: str = "default") -> None:
    return _user_memory_upsert(user_id, history, tenant_id)


@safe_db(None)
def clear_user_memory(user_id: str, tenant_id: str = "default") -> None:
    return _user_memory_delete(user_id, tenant_id)


@safe_db(None)
def get_user_preferences(user_id: str, tenant_id: str = "default") -> str | None:
    return _user_preferences_select(user_id, tenant_id)


@safe_db(False)
def save_favorite_recipe(user_id: str, recipe_name: str, recipe_data: dict, tenant_id: str = "default") -> bool:
    return _favorite_recipes_insert(user_id, recipe_name, recipe_data, tenant_id)


@safe_db([])
def get_favorite_recipes(user_id: str, limit: int = 10, tenant_id: str = "default") -> list[dict]:
    return _favorite_recipes_select(user_id, tenant_id, limit)


@safe_db(False)
def delete_favorite_recipe(user_id: str, recipe_id: int, tenant_id: str = "default") -> bool:
    return _favorite_recipe_delete(user_id, recipe_id, tenant_id)


@safe_db((None, None))
def get_user_cuisine_context(user_id: str, tenant_id: str = "default") -> tuple[str | None, str | None]:
    return _user_cuisine_context_select(user_id, tenant_id)


async def update_user_cuisine_context(user_id: str, cuisine: str, tenant_id: str = "default") -> None:
    if not _db_active():
        logger.warning("No database configured, skip update_user_cuisine_context")
        return
    try:
        await asyncio.to_thread(_user_cuisine_context_upsert, user_id, cuisine, tenant_id)
        logger.info("Updated cuisine context for user %s tenant=%s: %s", user_id, tenant_id, cuisine)
    except Exception as exc:
        logger.warning("update_user_cuisine_context failed: %s", exc)


@safe_db(0)
def get_daily_usage(user_id: str, usage_date: date | None = None, tenant_id: str = "default") -> int:
    target_date = usage_date or datetime.now(timezone.utc).date()
    return _usage_daily_select(user_id, target_date, tenant_id)


@safe_db(None)
def increment_daily_usage(user_id: str, units: int = 1, tenant_id: str = "default") -> int | None:
    target_date = datetime.now(timezone.utc).date()
    return _usage_daily_increment(user_id, target_date, tenant_id, units)


@safe_db(("free", "inactive"))
def get_user_subscription(user_id: str, tenant_id: str = "default") -> tuple[str, str]:
    return _user_subscription_select(user_id, tenant_id)


@safe_db(None)
def set_user_subscription(user_id: str, tenant_id: str, plan_key: str, status: str) -> None:
    return _subscription_upsert(user_id, tenant_id, plan_key, status)


@safe_db(None)
def append_usage_ledger(
    user_id: str,
    tenant_id: str,
    units: int,
    event_type: str,
    detail: dict | None = None,
) -> None:
    return _usage_ledger_insert(user_id, tenant_id, units, event_type, detail)


@safe_db(None)
def delete_user_data(user_id: str, tenant_id: str = "default") -> None:
    return _delete_user_data(user_id, tenant_id)
