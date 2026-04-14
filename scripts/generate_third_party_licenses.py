#!/usr/bin/env python3
"""Write docs/THIRD_PARTY_LICENSES.md using pip-licenses (-p) for project deps only.

Parses `requirements.txt` and `requirements-dev.txt` (including nested `-r`),
then runs `python -m piplicenses` with `-p` for each distribution name so the
report does not include unrelated site-packages (no venv required).
"""
from __future__ import annotations

import importlib.metadata
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "THIRD_PARTY_LICENSES.md"
REQ_MAIN = ROOT / "requirements.txt"
REQ_DEV = ROOT / "requirements-dev.txt"

_HEADER = """# 第三方套件授權摘要

本檔由 `scripts/generate_third_party_licenses.py` 產生：自 `requirements.txt` 與 `requirements-dev.txt` 解析套件名稱後，以 **pip-licenses** 的 `-p` 僅輸出這些套件（需已安裝於目前 Python 環境，通常為執行過 `pip install -r requirements-dev.txt` 的機器或 CI）。

更新依賴後請重新執行該腳本並一併 commit。

**注意**：本專案原始碼授權見根目錄 [`LICENSE`](../LICENSE)；下列為**相依套件**之授權與來源連結，不代表本專案對第三方商標或服務之背書。

---

"""


def _parse_requirement_line(line: str) -> str | None:
    """Return normalized distribution name, or None to skip."""
    line = line.split("#", 1)[0].strip()
    if not line or line.startswith("#"):
        return None
    if line.startswith("-r "):
        return None
    # strip env markers (pkg; python_version ...)
    if ";" in line:
        line = line.split(";", 1)[0].strip()
    # strip extras: pkg[extra] -> pkg
    base = re.split(r"[\[<>=!~]", line, maxsplit=1)[0].strip()
    base = base.split("[", 1)[0].strip()
    return base or None


def collect_package_names() -> list[str]:
    seen_keys: set[str] = set()
    ordered: list[str] = []

    def add(name: str | None) -> None:
        if not name:
            return
        key = name.lower().replace("_", "-")
        if key in seen_keys:
            return
        seen_keys.add(key)
        ordered.append(name)

    def read_file(path: Path) -> None:
        text = path.read_text(encoding="utf-8")
        for raw in text.splitlines():
            s = raw.strip()
            if s.startswith("-r "):
                nested = (path.parent / s[3:].strip()).resolve()
                if nested.exists():
                    read_file(nested)
                continue
            add(_parse_requirement_line(s))

    for f in (REQ_MAIN, REQ_DEV):
        if f.exists():
            read_file(f)
    return ordered


def main() -> int:
    pkgs = collect_package_names()
    if not pkgs:
        sys.stderr.write("No packages parsed from requirements files.\n")
        return 1

    args = [
        sys.executable,
        "-m",
        "piplicenses",
        "--from=mixed",
        "--format=markdown",
        "--with-urls",
        "--with-authors",
        "-p",
        *pkgs,
    ]

    proc = subprocess.run(args, cwd=str(ROOT), capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr or proc.stdout or "")
        sys.stderr.write(
            "pip-licenses 失敗：請先 `pip install -r requirements-dev.txt`，"
            "並確認 `python3 -m piplicenses --help` 可用。\n"
        )
        return proc.returncode or 1

    body = (proc.stdout or "").strip() + "\n"
    # pip-licenses 以 -p 篩選時常無法列出自身，改由 metadata 補列
    wants_pip_licenses = any(p.lower().replace("_", "-") == "pip-licenses" for p in pkgs)
    if wants_pip_licenses and "pip-licenses" not in body.lower():
        try:
            m = importlib.metadata.metadata("pip-licenses")
            ver = importlib.metadata.version("pip-licenses")
            lic = (m.get("License-Expression") or m.get("License") or "MIT").strip()
            author = (m.get("Author") or "").strip() or "-"
            url = "https://github.com/raimon49/pip-licenses"
            for line in m.get_all("Project-URL") or ():
                if line.lower().startswith("homepage"):
                    url = line.split(",", 1)[-1].strip()
                    break
            row = f"| pip-licenses | {ver} | {lic} | {author} | {url} |\n"
            body = body.rstrip() + "\n" + row
        except importlib.metadata.PackageNotFoundError:
            pass

    OUT.write_text(_HEADER + body, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({len(pkgs)} packages)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
