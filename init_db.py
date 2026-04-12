#!/usr/bin/env python3
"""建立 Render Postgres（或任何 PostgreSQL）上專案所需的核心資料表。

用法：
  設定環境變數 DATABASE_URL（或於專案根目錄放置 .env），然後執行：
    python3 init_db.py
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

DDL_STATEMENTS: list[str] = [
    """
    CREATE TABLE IF NOT EXISTS user_memory (
      user_id text PRIMARY KEY,
      history jsonb NOT NULL,
      updated_at timestamptz DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id text PRIMARY KEY,
      preferences text,
      updated_at timestamptz DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS favorite_recipes (
      id bigserial PRIMARY KEY,
      user_id text NOT NULL,
      recipe_name text NOT NULL,
      recipe_data jsonb NOT NULL,
      created_at timestamptz DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS user_cuisine_context (
      user_id text PRIMARY KEY,
      active_cuisine text NOT NULL,
      context_updated_at timestamptz NOT NULL
    )
    """,
]


def main() -> int:
    url = (os.getenv("DATABASE_URL") or "").strip()
    if not url:
        print(
            "錯誤：未設定 DATABASE_URL。請在 Render Dashboard 複製 Postgres 的 "
            "Internal 或 External Database URL，寫入 .env 或匯出環境變數後再執行。",
            file=sys.stderr,
        )
        return 1

    try:
        import psycopg
    except ImportError as exc:
        print(
            "錯誤：無法匯入 psycopg。請先執行：pip install -r requirements.txt",
            file=sys.stderr,
        )
        print(str(exc), file=sys.stderr)
        return 1

    try:
        with psycopg.connect(url, autocommit=True) as conn:
            with conn.cursor() as cur:
                for stmt in DDL_STATEMENTS:
                    cur.execute(stmt.strip())
    except Exception as exc:
        print(f"錯誤：連線或建立資料表失敗：{exc}", file=sys.stderr)
        return 1

    print("成功：已於 DATABASE_URL 所指的資料庫建立（或確認）以下資料表：")
    print("  - user_memory")
    print("  - user_preferences")
    print("  - favorite_recipes")
    print("  - user_cuisine_context")
    return 0


if __name__ == "__main__":
    sys.exit(main())
