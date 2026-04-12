"""Database operations: PostgreSQL (DATABASE_URL / Render) or Supabase REST, with async wrappers."""
from __future__ import annotations

import asyncio
import functools
import json
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row

from app.config import DATABASE_URL, logger
from app.clients import supabase


def _db_active() -> bool:
    return bool(DATABASE_URL) or bool(supabase)


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
                ON CONFLICT (user_id) DO UPDATE SET history = EXCLUDED.history
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
    res = supabase.table("user_memory").select("history").eq("user_id", user_id).execute()
    return res.data[0]["history"] if res.data else []


def _sb_user_memory_upsert(user_id: str, history: list) -> None:
    supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()


def _sb_user_memory_delete(user_id: str) -> None:
    supabase.table("user_memory").delete().eq("user_id", user_id).execute()


def _sb_user_preferences_select(user_id: str) -> str | None:
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
    supabase.table("favorite_recipes").insert({
        "user_id": user_id,
        "recipe_name": recipe_name,
        "recipe_data": recipe_data,
    }).execute()
    return True


def _sb_favorite_recipes_select(user_id: str, limit: int = 10) -> list[dict]:
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
    supabase.table("favorite_recipes").delete().eq("id", recipe_id).eq("user_id", user_id).execute()
    return True


def _sb_user_cuisine_context_select(user_id: str) -> tuple[str | None, str | None]:
    res = supabase.table("user_cuisine_context").select("active_cuisine, context_updated_at").eq("user_id", user_id).execute()
    if not res.data:
        return None, None
    row = res.data[0]
    return row.get("active_cuisine"), row.get("context_updated_at")


def _sb_user_cuisine_context_upsert(user_id: str, active_cuisine: str) -> None:
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
