"""Supabase database operations with async wrappers and graceful degradation."""
from __future__ import annotations

import asyncio
import functools
from datetime import datetime, timezone

from app.config import logger
from app.clients import supabase


# ─── Safe DB Decorator (DRY) ─────────────────────────────────────────────────────

def safe_db(fallback=None):
    """Wrap sync Supabase queries as async with automatic error handling."""
    def deco(sync_fn):
        @functools.wraps(sync_fn)
        async def wrapped(*args, **kwargs):
            if not supabase:
                return fallback
            try:
                return await asyncio.to_thread(sync_fn, *args, **kwargs)
            except Exception as exc:
                logger.warning("DB %s failed: %s", sync_fn.__name__, exc)
                return fallback
        return wrapped
    return deco


# ─── Raw sync helpers ────────────────────────────────────────────────────────────

def _user_memory_select(user_id: str) -> list:
    res = supabase.table("user_memory").select("history").eq("user_id", user_id).execute()
    return res.data[0]["history"] if res.data else []


def _user_memory_upsert(user_id: str, history: list) -> None:
    supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()


def _user_memory_delete(user_id: str) -> None:
    supabase.table("user_memory").delete().eq("user_id", user_id).execute()


def _user_preferences_select(user_id: str) -> str | None:
    res = supabase.table("user_preferences").select("preferences").eq("user_id", user_id).execute()
    if not res.data:
        return None
    prefs = res.data[0].get("preferences")
    if prefs is None:
        return None
    if isinstance(prefs, list):
        return "、".join(str(p) for p in prefs) if prefs else None
    return str(prefs).strip() or None


def _favorite_recipes_insert(user_id: str, recipe_name: str, recipe_data: dict) -> bool:
    supabase.table("favorite_recipes").insert({
        "user_id": user_id,
        "recipe_name": recipe_name,
        "recipe_data": recipe_data,
    }).execute()
    return True


def _favorite_recipes_select(user_id: str, limit: int = 10) -> list[dict]:
    """Fetch user's favorite recipes, most recent first."""
    res = (
        supabase.table("favorite_recipes")
        .select("id, recipe_name, recipe_data, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data if res.data else []


def _favorite_recipe_delete(user_id: str, recipe_id: int) -> bool:
    """Delete a single favorite recipe by id (scoped to user)."""
    supabase.table("favorite_recipes").delete().eq("id", recipe_id).eq("user_id", user_id).execute()
    return True


def _user_cuisine_context_select(user_id: str) -> tuple[str | None, str | None]:
    res = supabase.table("user_cuisine_context").select("active_cuisine, context_updated_at").eq("user_id", user_id).execute()
    if not res.data:
        return None, None
    row = res.data[0]
    return row.get("active_cuisine"), row.get("context_updated_at")


def _user_cuisine_context_upsert(user_id: str, active_cuisine: str) -> None:
    supabase.table("user_cuisine_context").upsert(
        {
            "user_id": user_id,
            "active_cuisine": active_cuisine,
            "context_updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id",
    ).execute()


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
    if not supabase:
        logger.warning("Supabase not configured, skip update_user_cuisine_context")
        return
    try:
        await asyncio.to_thread(_user_cuisine_context_upsert, user_id, cuisine)
        logger.info("Updated cuisine context for user %s: %s", user_id, cuisine)
    except Exception as exc:
        logger.warning("update_user_cuisine_context failed: %s", exc)
