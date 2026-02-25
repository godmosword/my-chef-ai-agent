import os
import json
import re
import ast
from fastapi import FastAPI, Request, HTTPException
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, FlexMessage, FlexContainer, TextMessage
from linebot.v3.webhooks import MessageEvent, TextMessageContent
from openai import OpenAI
from supabase import create_client, Client

app = FastAPI()

@app.api_route("/", methods=["GET", "HEAD"])
async def health_check():
    return {"status": "ok", "message": "米其林職人大腦 (OpenRouter 鈦合金防護版)"}

# 環境變數
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# 鎖定目前地表極致推理之王：Claude Opus 4.6
MODEL_NAME = os.getenv("MODEL_NAME", "anthropic/claude-opus-4.6")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try: supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception: pass

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
    default_headers={"HTTP-Referer": "https://render.com", "X-Title": "My Chef AI Agent"}
)

memory_cache = {}

def get_user_memory(user_id: str):
    if supabase:
        try:
            res = supabase.table("user_memory").select("history").eq("user_id", user_id).execute()
            if res.data: return res.data[0]["history"]
        except Exception: pass
    return memory_cache.get(user_id, [])

def save_user_memory(user_id: str, history: list):
    if supabase:
        try: supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()
        except Exception: pass
    memory_cache[user_id] = history

def clear_user_memory(user_id: str):
    if supabase:
        try: supabase.table("user_memory").delete().eq("user_id", user_id).execute()
        except Exception: pass
    if user_id in memory_cache: del memory_cache[user_id]

def generate_flex_message(kitchen_talk, theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost):
    def safe_str(val, fallback="-"):
        s = str(val).strip()
        return s if s and s not in ["{}", "[]", "None"] else fallback

    # 鈦合金整骨器：對付字串亂碼
    def parse_to_list(data):
        if not data: return []
        if isinstance(data, list): return data
        if isinstance(data, dict): return [data]
        if isinstance(data, str):
            try:
                parsed = ast.literal_eval(data)
                if isinstance(parsed, list): return parsed
                if isinstance(parsed, dict): return [parsed]
            except Exception: pass
            return [line for line in data.split('\n') if line.strip()]
        return [str(data)]

    # 1. 對話解析
    talk_components = []
    talk_list = parse_to_list(kitchen_talk)
    for talk in talk_list:
        role, content = "團隊討論", str(talk)
        if isinstance(talk, dict):
            role = talk.get('role', talk.get('角色', '團隊討論'))
            content = talk.get('content', talk.get('內容', str(talk)))
        else:
            talk_str = str(talk)
            for sep in ["：", ":", " - "]:
                if sep in talk_str:
                    parts = talk_str.split(sep, 1)
                    role, content = parts[0], parts[1]
                    break
        color = "#78350F"
        if "行政主廚" in role: color = "#9F1239"
        elif "副主廚" in role: color = "#B45309"
        elif "食材總管" in role: color = "#166534"
        
        talk_components.append({
            "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
            "contents": [
                {"type": "text", "text": safe_str(role, "團隊"), "color": color, "weight": "bold", "size": "xs", "flex": 0},
                {"type": "text", "text": safe_str(content, "思考中..."), "color": "#431407", "size": "sm", "wrap": True, "flex": 1, "lineSpacing": "4px"}
            ]
        })
    if not talk_components: talk_components.append({"type": "text", "text": "研發團隊默契確認中...", "size": "sm", "color": "#D97706"})

    # 2. 食材解析
    ingredient_rows = []
    ing_list = parse_to_list(ingredients)
    for item in ing_list:
        name, price = str(item), "-"
        if isinstance(item, dict):
            name = item.get('name', item.get('食材', str(item)))
            price = item.get('price', item.get('價格', '-'))
        else:
            item_str = str(item)
            for sep in ["：", ":", " - "]:
                if sep in item_str:
                    parts = item_str.split(sep, 1)
                    name, price = parts[0], parts[1]
                    break
        ingredient_rows.append({
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
                {"type": "text", "text": safe_str(name, "未知食材"), "color": "#522504", "size": "sm", "flex": 1, "wrap": True},
                {"type": "text", "text": safe_str(price, "-"), "color": "#431407", "size": "sm", "weight": "bold", "align": "end", "flex": 0}
            ]
        })
    if not ingredient_rows: ingredient_rows.append({"type": "text", "text": "無特定食材需求", "size": "sm", "color": "#D97706"})

    # 3. 步驟解析
    step_rows = []
    step_list = parse_to_list(steps)
    for i, step in enumerate(step_list):
        step_rows.append({
            "type": "box", "layout": "baseline", "spacing": "md", "margin": "lg",
            "contents": [
                {"type": "text", "text": f"{i+1:02d}", "color": "#EA580C", "weight": "bold", "size": "sm", "flex": 0},
                {"type": "text", "text": safe_str(step, "料理中...").lstrip('0123456789. '), "color": "#431407", "size": "sm", "wrap": True, "flex": 1, "lineSpacing": "5px"}
            ]
        })
    if not step_rows: step_rows.append({"type": "text", "text": "主廚自由發揮", "size": "sm", "color": "#D97706"})

    # 4. 採買清單解析
    shop_rows = []
    shop_list = parse_to_list(shopping_list)
    for item in shop_list:
        if isinstance(item, dict):
            for k, v in item.items():
                if isinstance(v, list): shop_rows.append({"type": "text", "text": f"• {k}: {', '.join(map(str, v))}", "size": "sm", "color": "#78350F", "margin": "sm"})
                else: shop_rows.append({"type": "text", "text": f"• {k}: {v}", "size": "sm", "color": "#78350F", "margin": "sm"})
        else:
            shop_rows.append({"type": "text", "text": f"• {safe_str(item)}", "size": "sm", "color": "#78350F", "margin": "sm"})
    if not shop_rows: shop_rows.append({"type": "text", "text": "• 全聯生鮮區", "size": "sm", "color": "#D97706"})

    return {
      "type": "bubble", "size": "giga",
      "body": {
        "type": "box", "layout": "vertical", "paddingAll": "none", "backgroundColor": "#FFFFFF",
        "contents": [
          {"type": "box", "layout": "vertical", "height": "5px", "backgroundColor": "#EA580C", "contents": []},
          {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingBottom": "lg",
            "contents": [
              {"type": "text", "text": safe_str(theme, "CHEF'S SELECTION").upper(), "size": "xs", "color": "#D97706", "weight": "bold", "letterSpacing": "2px"},
              {"type": "text", "text": safe_str(recipe_name, "主廚特製料理"), "size": "xxl", "weight": "bold", "color": "#431407", "margin": "md", "wrap": True}
            ]
          },
          {"type": "box", "layout": "vertical", "margin": "md", "marginHorizontal": "xxl", "paddingAll": "lg", "backgroundColor": "#FFFBEB", "cornerRadius": "lg",
            "contents": [
              {"type": "text", "text": "EXECUTIVE KITCHEN TALK", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px", "margin": "xs"},
              {"type": "box", "layout": "vertical", "margin": "lg", "contents": talk_components}
            ]
          },
          {"type": "box", "layout": "vertical", "paddingAll": "xxl",
            "contents": [
              {"type": "text", "text": "SHOPPING CATEGORIES", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "lg", "contents": shop_rows}
            ]
          },
          {"type": "box", "layout": "vertical", "margin": "xxl", "paddingAll": "xl", "backgroundColor": "#FFF7ED", "borderColor": "#FED7AA", "borderWidth": "1px", "cornerRadius": "lg",
            "contents": [
              {"type": "text", "text": "INGREDIENTS & COST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "md", "contents": ingredient_rows},
              {"type": "separator", "margin": "xl", "color": "#FED7AA"},
              {"type": "box", "layout": "horizontal", "margin": "lg",
                "contents": [
                  {"type": "text", "text": "TOTAL", "size": "xs", "weight": "bold", "color": "#9A3412", "flex": 0},
                  {"type": "text", "text": f"NT$ {safe_str(estimated_total_cost, '估算中')}", "size": "xl", "weight": "bold", "color": "#431407", "align": "end"}
                ]
              }
            ]
          },
          {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingTop": "none",
            "contents": [
              {"type": "text", "text": "PREPARATION STEPS", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "sm", "contents": step_rows}
            ]
          }
        ]
      },
      "footer": {
        "type": "box", "layout": "horizontal", "spacing": "md", "paddingAll": "xl", "paddingTop": "none",
        "contents": [
          {"type": "button", "style": "secondary", "height": "sm", "color": "#FFEDD5", "action": {"type": "message", "label": "重新構思", "text": "清除記憶"}},
          {"type": "button", "style": "primary", "height": "sm", "color": "#EA580C", "action": {"type": "message", "label": "追加配菜", "text": "這套食譜很棒，請推薦配菜"}}
        ]
      }
    }

@app.post("/callback")
async def callback(request: Request):
    signature = request.headers.get("X-Line-Signature")
    body = await request.body()
    try: handler.handle(body.decode("utf-8"), signature)
    except InvalidSignatureError: raise HTTPException(status_code=400)
    return "OK"

@handler.add(event=MessageEvent, message=TextMessageContent)
def handle_message(event):
    user_message = event.message.text
    user_id = event.source.user_id 

    if user_message.strip() in ["清除記憶", "重新開始", "洗腦", "你好", "嗨"]:
        clear_user_memory(user_id)
        reply = TextMessage(text="👨‍🍳 歡迎！廚房已打掃乾淨，頂級 Claude Opus 大腦已就緒。請問今天想點什麼？")
        with ApiClient(configuration) as api_client:
            MessagingApi(api_client).reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[reply]))
        return
    
    system_prompt = (
        "你是一個頂級米其林研發團隊。必須先讓三位主廚(行政主廚、副主廚、食材總管)進行專業對話，再給出食譜。\n"
        "【絕對格式要求】：請務必回傳純 JSON 格式，不要有任何 Markdown (如 ```json) 標籤。格式必須嚴格如下：\n"
        "{\"kitchen_talk\": [{\"role\": \"角色\", \"content\": \"...\"}], \"theme\": \"...\", \"recipe_name\": \"...\", \"ingredients\": [{\"name\": \"...\", \"price\": \"...\"}], \"steps\": [\"...\"], \"shopping_list\": [\"...\"], \"estimated_total_cost\": \"...\"}"
    )

    history = get_user_memory(user_id)
    if not history: history = [{"role": "system", "content": system_prompt}]
    history.append({"role": "user", "content": user_message})
    if len(history) > 6: history = [history[0]] + history[-5:]

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=history
        )
        ai_content = response.choices[0].message.content.strip()
        
        # 鈦合金正則解析：強制抓出 JSON 區塊，無視 AI 前後廢話
        json_match = re.search(r'\{.*\}', ai_content, re.DOTALL)
        if json_match:
            ai_content = json_match.group(0)
            
        ai_data = json.loads(ai_content)
        save_user_memory(user_id, history + [{"role": "assistant", "content": ai_content}])
        
        flex_dict = generate_flex_message(
            ai_data.get("kitchen_talk", []), ai_data.get("theme", ""), ai_data.get("recipe_name", ""),
            ai_data.get("ingredients", []), ai_data.get("steps", []), ai_data.get("shopping_list", []),
            ai_data.get("estimated_total_cost", "")
        )
        msg = FlexMessage(alt_text=f"職人提案：{ai_data.get('recipe_name', '美味食譜')}", contents=FlexContainer.from_dict(flex_dict))
            
    except Exception as e:
        print(f"Error: {e}")
        msg = TextMessage(text="👨‍🍳 抱歉，研發團隊剛才討論得太激烈，食譜寫亂了。請對我輸入「清除記憶」後再換個說法試試好嗎？")

    with ApiClient(configuration) as api_client:
        MessagingApi(api_client).reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[msg]))
