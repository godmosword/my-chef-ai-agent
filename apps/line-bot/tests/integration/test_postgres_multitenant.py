from __future__ import annotations

import asyncio
import os
from pathlib import Path

import psycopg
import pytest

os.environ.setdefault("LINE_CHANNEL_ACCESS_TOKEN", "test_token")
os.environ.setdefault("LINE_CHANNEL_SECRET", "test_secret")
os.environ.setdefault("GEMINI_API_KEY", "test_key")

from app.db import (
    get_daily_usage,
    get_user_memory,
    increment_daily_usage,
    save_user_memory,
)


DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL is required for postgres integration tests")


def _run_migration() -> None:
    sql = Path(__file__).resolve().parents[2] / "migrations" / "20260414_postgres_multitenant.sql"
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DROP TABLE IF EXISTS usage_ledger CASCADE;
                DROP TABLE IF EXISTS usage_daily CASCADE;
                DROP TABLE IF EXISTS subscriptions CASCADE;
                DROP TABLE IF EXISTS favorite_recipes CASCADE;
                DROP TABLE IF EXISTS user_cuisine_context CASCADE;
                DROP TABLE IF EXISTS user_preferences CASCADE;
                DROP TABLE IF EXISTS user_memory CASCADE;
                """
            )
            cur.execute(sql.read_text(encoding="utf-8"))


def _cleanup_rows(user_id: str) -> None:
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_memory WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM usage_daily WHERE user_id = %s", (user_id,))


@pytest.fixture(scope="module", autouse=True)
def _prepare_schema():
    _run_migration()


@pytest.mark.asyncio
async def test_user_memory_isolation_by_tenant():
    user_id = "U-integration-tenant"
    _cleanup_rows(user_id)

    await save_user_memory(user_id, [{"role": "user", "content": "tenant-a"}], tenant_id="tenant-a")
    await save_user_memory(user_id, [{"role": "user", "content": "tenant-b"}], tenant_id="tenant-b")

    history_a = await get_user_memory(user_id, tenant_id="tenant-a")
    history_b = await get_user_memory(user_id, tenant_id="tenant-b")

    assert history_a[0]["content"] == "tenant-a"
    assert history_b[0]["content"] == "tenant-b"


@pytest.mark.asyncio
async def test_usage_isolation_by_tenant():
    user_id = "U-integration-quota"
    _cleanup_rows(user_id)

    await increment_daily_usage(user_id, units=2, tenant_id="tenant-a")
    await increment_daily_usage(user_id, units=5, tenant_id="tenant-b")

    usage_a = await get_daily_usage(user_id, tenant_id="tenant-a")
    usage_b = await get_daily_usage(user_id, tenant_id="tenant-b")

    assert usage_a == 2
    assert usage_b == 5
