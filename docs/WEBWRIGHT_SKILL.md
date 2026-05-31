# Webwright Skill（Cursor）

來源：[microsoft/Webwright](https://github.com/microsoft/Webwright)

## 已安裝位置

| 範圍 | 路徑 |
|------|------|
| 本專案 | `.cursor/skills/webwright/` |
| 全域 | `~/.cursor/skills/webwright/` |
| 上游原始碼 | `~/.local/share/Webwright` |

## 本機依賴（已完成）

```bash
pip install -e ~/.local/share/Webwright
playwright install firefox
```

## 在 Cursor 使用

1. **新開一個 Agent 對話**（skill 在 session 啟動時載入）。
2. 用自然語言描述網頁任務，例如：「用 Webwright 在 Google Flights 查 8/15 SEA→JFK 機票並存截圖證據」。
3. 或貼上 `.cursor/skills/webwright/commands/run.md` 內的模板並填入任務。

產物會落在 `WORKSPACE_DIR`（例如 `outputs/<task_id>/`）：`plan.md`、`final_runs/run_*/`、`final_script.py`。

## 可選：獨立 CLI

```bash
export OPENAI_API_KEY=...
python -m webwright.run.cli \
  -c base.yaml -c model_openai.yaml \
  -t "任務描述" \
  --start-url https://example.com \
  -o outputs/default
```

## 更新 skill

```bash
cd ~/.local/share/Webwright && git pull
cp -R skills/webwright ~/.cursor/skills/webwright
cp -R skills/webwright /path/to/my-chef-ai-agent/.cursor/skills/webwright
# 再覆寫 SKILL.md 的 Cursor 適配段落（或從本 repo docs 複製）
```
