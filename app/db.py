"""Database operations: PostgreSQL (DATABASE_URL / Render) or Supabase REST, with async wrappers."""
from __future__ import annotations

import asyncio
import functools
import json
from datetime import date, datetime, timezone

import psycopg
from psycopg.rows import dict_row

from app.config import DATABASE_URL, REQUIRE_ATOMIC_USAGE, logger
from app.clients import supabase
from app.observability import incr


def _db_active() -> bool:
    return bool(DATABASE_URL) or bool(supabase)


def is_database_configured() -> bool:
    """True when DATABASE_URL or Supabase client is configured (persistence available)."""
    return _db_active()


def _pg_ping() -> bool:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, connect_timeout=3, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
    return True


def _sb_ping() -> bool:
    if not supabase:
        return False
    supabase.table("user_memory").select("user_id").limit(1).execute()
    return True


async def ping_database() -> bool:
    """
    Return True if no DB is configured, or if a lightweight read succeeds.
    Used by GET /ready; failures mean Postgres/Supabase is unreachable or misconfigured.
    """
    if not _db_active():
        return True
    try:
        if DATABASE_URL:
            return await asyncio.to_thread(_pg_ping)
        return await asyncio.to_thread(_sb_ping)
    except Exception as exc:
        logger.warning("Database ping failed: %s", exc)
        return False


def _delete_user_data_postgres(user_id: str) -> None:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_memory WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM user_preferences WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM favorite_recipes WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM user_cuisine_context WHERE user_id = %s", (user_id,))


# ─── PostgreSQL (Render Postgres 等) ────────────────────────────────────────────


def _pg_user_memory_select(user_id: str) -> list:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT history FROM user_memory WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row or row["history"] is None:
                return []
            h = row["history"]
            if isinstance(h, str):
                return json.loads(h)
            return h if isinstance(h, list) else []


def _pg_user_memory_upsert(user_id: str, history: list) -> None:
    assert DATABASE_URL
    payload = json.dumps(history, ensure_ascii=False)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_memory (user_id, history)
                VALUES (%s, %s::jsonb)
                ON CONFLICT (user_id) DO UPDATE SET
                    history = EXCLUDED.history,
                    updated_at = now()
                """,
                (user_id, payload),
            )


def _pg_user_memory_delete(user_id: str) -> None:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_memory WHERE user_id = %s", (user_id,))


def _pg_user_preferences_select(user_id: str) -> str | None:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT preferences FROM user_preferences WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                return None
            prefs = row.get("preferences")
            if prefs is None:
                return None
            if isinstance(prefs, list):
                return "、".join(str(p) for p in prefs) if prefs else None
            return str(prefs).strip() or None


def _pg_favorite_recipes_insert(user_id: str, recipe_name: str, recipe_data: dict) -> bool:
    assert DATABASE_URL
    payload = json.dumps(recipe_data, ensure_ascii=False)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO favorite_recipes (user_id, recipe_name, recipe_data)
                VALUES (%s, %s, %s::jsonb)
                """,
                (user_id, recipe_name, payload),
            )
    return True


def _pg_favorite_recipes_select(user_id: str, limit: int = 10) -> list[dict]:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT id, recipe_name, recipe_data, created_at
                FROM favorite_recipes
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall()
    out: list[dict] = []
    for r in rows or []:
        d = dict(r)
        if d.get("created_at") is not None:
            d["created_at"] = d["created_at"].isoformat() if hasattr(d["created_at"], "isoformat") else str(d["created_at"])
        out.append(d)
    return out


def _pg_favorite_recipe_delete(user_id: str, recipe_id: int) -> bool:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM favorite_recipes WHERE id = %s AND user_id = %s",
                (recipe_id, user_id),
            )
    return True


def _pg_user_cuisine_context_select(user_id: str) -> tuple[str | None, str | None]:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT active_cuisine, context_updated_at FROM user_cuisine_context WHERE user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                return None, None
            ts = row.get("context_updated_at")
            ts_out = ts.isoformat() if ts is not None and hasattr(ts, "isoformat") else (str(ts) if ts else None)
            return row.get("active_cuisine"), ts_out


def _pg_user_cuisine_context_upsert(user_id: str, active_cuisine: str) -> None:
    assert DATABASE_URL
    ts = datetime.now(timezone.utc)
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_cuisine_context (user_id, active_cuisine, context_updated_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    active_cuisine = EXCLUDED.active_cuisine,
                    context_updated_at = EXCLUDED.context_updated_at
                """,
                (user_id, active_cuisine, ts),
            )


# ─── Supabase REST ──────────────────────────────────────────────────────────────


def _sb_user_memory_select(user_id: str) -> list:
    if not supabase:
        return []
    res = supabase.table("user_memory").select("history").eq("user_id", user_id).execute()
    return res.data[0]["history"] if res.data else []


def _sb_user_memory_upsert(user_id: str, history: list) -> None:
    if not supabase:
        return
    supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()


def _sb_user_memory_delete(user_id: str) -> None:
    if not supabase:
        return
    supabase.table("user_memory").delete().eq("user_id", user_id).execute()


def _sb_user_preferences_select(user_id: str) -> str | None:
    if not supabase:
        return None
    res = supabase.table("user_preferences").select("preferences").eq("user_id", user_id).execute()
    if not res.data:
        return None
    prefs = res.data[0].get("preferences")
    if prefs is None:
        return None
    if isinstance(prefs, list):
        return "、".join(str(p) for p in prefs) if prefs else None
    return str(prefs).strip() or None


def _sb_favorite_recipes_insert(user_id: str, recipe_name: str, recipe_data: dict) -> bool:
    if not supabase:
        return False
    supabase.table("favorite_recipes").insert({
        "user_id": user_id,
        "recipe_name": recipe_name,
        "recipe_data": recipe_data,
    }).execute()
    return True


def _sb_favorite_recipes_select(user_id: str, limit: int = 10) -> list[dict]:
    if not supabase:
        return []
    res = (
        supabase.table("favorite_recipes")
        .select("id, recipe_name, recipe_data, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data if res.data else []


def _sb_favorite_recipe_delete(user_id: str, recipe_id: int) -> bool:
    if not supabase:
        return False
    supabase.table("favorite_recipes").delete().eq("id", recipe_id).eq("user_id", user_id).execute()
    return True


def _sb_user_cuisine_context_select(user_id: str) -> tuple[str | None, str | None]:
    if not supabase:
        return None, None
    res = supabase.table("user_cuisine_context").select("active_cuisine, context_updated_at").eq("user_id", user_id).execute()
    if not res.data:
        return None, None
    row = res.data[0]
    return row.get("active_cuisine"), row.get("context_updated_at")


def _sb_user_cuisine_context_upsert(user_id: str, active_cuisine: str) -> None:
    if not supabase:
        return
    supabase.table("user_cuisine_context").upsert(
        {
            "user_id": user_id,
            "active_cuisine": active_cuisine,
            "context_updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id",
    ).execute()


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


def _user_memory_select(user_id: str) -> list:
    if DATABASE_URL:
        return _pg_user_memory_select(user_id)
    return _sb_user_memory_select(user_id)


def _user_memory_upsert(user_id: str, history: list) -> None:
    if DATABASE_URL:
        return _pg_user_memory_upsert(user_id, history)
    return _sb_user_memory_upsert(user_id, history)


def _user_memory_delete(user_id: str) -> None:
    if DATABASE_URL:
        return _pg_user_memory_delete(user_id)
    return _sb_user_memory_delete(user_id)


def _user_preferences_select(user_id: str) -> str | None:
    if DATABASE_URL:
        return _pg_user_preferences_select(user_id)
    return _sb_user_preferences_select(user_id)


def _favorite_recipes_insert(user_id: str, recipe_name: str, recipe_data: dict) -> bool:
    if DATABASE_URL:
        return _pg_favorite_recipes_insert(user_id, recipe_name, recipe_data)
    return _sb_favorite_recipes_insert(user_id, recipe_name, recipe_data)


def _favorite_recipes_select(user_id: str, limit: int = 10) -> list[dict]:
    if DATABASE_URL:
        return _pg_favorite_recipes_select(user_id, limit)
    return _sb_favorite_recipes_select(user_id, limit)


def _favorite_recipe_delete(user_id: str, recipe_id: int) -> bool:
    if DATABASE_URL:
        return _pg_favorite_recipe_delete(user_id, recipe_id)
    return _sb_favorite_recipe_delete(user_id, recipe_id)


def _user_cuisine_context_select(user_id: str) -> tuple[str | None, str | None]:
    if DATABASE_URL:
        return _pg_user_cuisine_context_select(user_id)
    return _sb_user_cuisine_context_select(user_id)


def _user_cuisine_context_upsert(user_id: str, active_cuisine: str) -> None:
    if DATABASE_URL:
        return _pg_user_cuisine_context_upsert(user_id, active_cuisine)
    return _sb_user_cuisine_context_upsert(user_id, active_cuisine)


def _usage_daily_select(user_id: str, usage_date: date, tenant_id: str) -> int:
    if not supabase:
        return 0
    res = (
        supabase.table("usage_daily")
        .select("requests_count")
        .eq("user_id", user_id)
        .eq("usage_date", usage_date.isoformat())
        .eq("tenant_id", tenant_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        return 0
    return int(res.data[0].get("requests_count") or 0)


def _usage_daily_increment(user_id: str, usage_date: date, tenant_id: str, units: int) -> int | None:
    if not supabase:
        return None
    try:
        rpc_res = supabase.rpc(
            "increment_usage_daily",
            {
                "p_tenant_id": tenant_id,
                "p_user_id": user_id,
                "p_usage_date": usage_date.isoformat(),
                "p_units": units,
            },
        ).execute()
        data = rpc_res.data
        if isinstance(data, list) and data:
            return int(data[0].get("requests_count") or data[0].get("new_count") or 0)
        if isinstance(data, dict):
            return int(data.get("requests_count") or data.get("new_count") or 0)
        if isinstance(data, (int, float)):
            return int(data)
    except Exception as exc:
        if REQUIRE_ATOMIC_USAGE:
            raise RuntimeError("Atomic usage RPC required but unavailable") from exc
        logger.warning("Atomic usage RPC unavailable; using non-atomic fallback: %s", exc)

    current = _usage_daily_select(user_id, usage_date, tenant_id)
    new_total = current + units
    supabase.table("usage_daily").upsert(
        {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "usage_date": usage_date.isoformat(),
            "requests_count": new_total,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="tenant_id,user_id,usage_date",
    ).execute()
    return new_total


def _user_subscription_select(user_id: str, tenant_id: str) -> tuple[str, str]:
    if not supabase:
        return "free", "inactive"
    res = (
        supabase.table("subscriptions")
        .select("plan_key,status")
        .eq("user_id", user_id)
        .eq("tenant_id", tenant_id)
        .eq("status", "active")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        return "free", "inactive"
    row = res.data[0]
    return (row.get("plan_key") or "free"), (row.get("status") or "inactive")


def _subscription_upsert(user_id: str, tenant_id: str, plan_key: str, status: str) -> None:
    if not supabase:
        return
    supabase.table("subscriptions").upsert(
        {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "plan_key": plan_key,
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="tenant_id,user_id",
    ).execute()


def _usage_ledger_insert(
    user_id: str,
    tenant_id: str,
    units: int,
    event_type: str,
    detail: dict | None = None,
) -> None:
    if not supabase:
        return
    supabase.table("usage_ledger").insert(
        {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "units": units,
            "event_type": event_type,
            "detail": detail or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()


def _delete_user_data(user_id: str, tenant_id: str) -> None:
    if DATABASE_URL:
        _delete_user_data_postgres(user_id)
    if not supabase:
        return
    # 若同時使用 Supabase，一併清除 REST 上的列（含僅存在於 Supabase 的用量／訂閱）
    supabase.table("user_memory").delete().eq("user_id", user_id).execute()
    supabase.table("user_preferences").delete().eq("user_id", user_id).execute()
    supabase.table("favorite_recipes").delete().eq("user_id", user_id).execute()
    supabase.table("user_cuisine_context").delete().eq("user_id", user_id).execute()
    supabase.table("usage_daily").delete().eq("user_id", user_id).eq("tenant_id", tenant_id).execute()
    supabase.table("usage_ledger").delete().eq("user_id", user_id).eq("tenant_id", tenant_id).execute()
    supabase.table("subscriptions").delete().eq("user_id", user_id).eq("tenant_id", tenant_id).execute()


# ─── Async wrappers ─────────────────────────────────────────────────────────────


@safe_db([])
def get_user_memory(user_id: str) -> list:
    return _user_memory_select(user_id)


@safe_db(None)
def save_user_memory(user_id: str, history: list) -> None:
    return _user_memory_upsert(user_id, history)


@safe_db(None)
def clear_user_memory(user_id: str) -> None:
    return _user_memory_delete(user_id)


@safe_db(None)
def get_user_preferences(user_id: str) -> str | None:
    return _user_preferences_select(user_id)


@safe_db(False)
def save_favorite_recipe(user_id: str, recipe_name: str, recipe_data: dict) -> bool:
    return _favorite_recipes_insert(user_id, recipe_name, recipe_data)


@safe_db([])
def get_favorite_recipes(user_id: str, limit: int = 10) -> list[dict]:
    return _favorite_recipes_select(user_id, limit)


@safe_db(False)
def delete_favorite_recipe(user_id: str, recipe_id: int) -> bool:
    return _favorite_recipe_delete(user_id, recipe_id)


@safe_db((None, None))
def get_user_cuisine_context(user_id: str) -> tuple[str | None, str | None]:
    return _user_cuisine_context_select(user_id)


async def update_user_cuisine_context(user_id: str, cuisine: str) -> None:
    if not _db_active():
        logger.warning("No database configured, skip update_user_cuisine_context")
        return
    try:
        await asyncio.to_thread(_user_cuisine_context_upsert, user_id, cuisine)
        logger.info("Updated cuisine context for user %s: %s", user_id, cuisine)
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
