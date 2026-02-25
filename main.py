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
    return {"status": "ok", "message": "米其林職人大腦 (Claude Sonnet 4.6 穩定版)"}

LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "anthropic/claude-sonnet-4.6")

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

# --- 核心排版引擎 ---

def generate_flex_message(kitchen_talk, theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost):
    # 絕對防空機制：LINE 訊息中任何文字欄位不可為 ""
    def safe_str(val, fallback="-"):
        s = str(val).strip()
        if not s or s in ["{}", "[]", "None", "null"]: return fallback
        return s

    def parse_to_list(data):
        if not data: return []
        if isinstance(data, list): return data
        if isinstance(data, dict): return [data]
        if isinstance(data, str):
            try:
                parsed = ast.literal_eval(data)
                if isinstance(parsed, list): return parsed
                if isinstance(parsed, dict): return [parsed]
            except: pass
            return [line for line in data.split('\n') if line.strip()]
        return [str(data)]

    # 1. 廚房對話
    talk_components = []
    for talk in parse_to_list(kitchen_talk):
        role, content = "團隊", str(talk)
        if isinstance(talk, dict):
            role = talk.get('role', talk.get('角色', '團隊'))
            content = talk.get('content', talk.get('內容', str(talk)))
        
        color = "#78350F"
        if "行政主廚" in role: color = "#9F1239"
        elif "副主廚" in role: color = "#B45309"
        elif "食材總管" in role: color = "#166534"
        
        talk_components.append({
            "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
            "contents": [
                {"type": "text", "text": safe_str(role, "團隊"), "color": color, "weight": "bold", "size": "xs", "flex": 0},
                {"type": "text", "text": safe_str(content, "..."), "color": "#431407", "size": "sm", "wrap": True, "flex": 1}
            ]
        })

    # 2. 食材報價
    ingredient_rows = []
    for item in parse_to_list(ingredients):
        name, price = str(item), "-"
        if isinstance(item, dict):
            name = item.get('name', item.get('食材', str(item)))
            price = item.get('price', item.get('價格', '-'))
        ingredient_rows.append({
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
                {"type": "text", "text": safe_str(name, "食材"), "color": "#522504", "size": "sm", "flex": 1, "wrap": True},
                {"type": "text", "text": safe_str(price, "-"), "color": "#431407", "size": "sm", "weight": "bold", "align": "end", "flex": 0}
            ]
        })

    # 3. 料理步驟
    step_rows = []
    for i, step in enumerate(parse_to_list(steps)):
        step_rows.append({
            "type": "box", "layout": "baseline", "spacing": "md", "margin": "lg",
            "contents": [
                {"type": "text", "text": f"{i+1:02d}", "color": "#EA580C", "weight": "bold", "size": "sm", "flex": 0},
                {"type": "text", "text": safe_str(step, "進行中").lstrip('0123456789. '), "color": "#431407", "size": "sm", "wrap": True, "flex": 1}
            ]
        })

    # 4. 採買清單
    shop_rows = [{"type": "text", "text": f"• {safe_str(s, '生鮮')}", "size": "sm", "color": "#78350F", "margin": "sm"} for s in parse_to_list(shopping_list)]

    return {
      "type": "bubble", "size": "giga",
      "body": {
        "type": "box", "layout": "vertical", "paddingAll": "none", "backgroundColor": "#FFFFFF",
        "contents": [
          {"type": "box", "layout": "vertical", "height": "5px", "backgroundColor": "#EA580C", "contents": []},
          {"type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingBottom": "lg",
            "contents": [
              {"type": "text", "text": safe_str(theme, "RECOMMENDATION").upper(), "size": "xs", "color": "#D97706", "weight": "bold", "letterSpacing": "2px"},
              {"type": "text", "text": safe_str(recipe_name, "本日料理"), "size": "xxl", "weight": "bold", "color": "#431407", "margin": "md", "wrap": True}
            ]
          },
          {"type": "box", "layout": "vertical", "margin": "md", "marginHorizontal": "xxl", "paddingAll": "lg", "backgroundColor": "#FFFBEB", "cornerRadius": "lg",
            "contents": [
              {"type": "text", "text": "KITCHEN CONFERENCE", "size": "xxs", "weight": "bold", "color": "#B45309", "margin": "xs"},
              {"type": "box", "layout": "vertical", "margin": "md", "contents": talk_components}
            ]
          },
          {"type": "box", "layout": "vertical", "paddingAll": "xxl",
            "contents": [
              {"type": "text", "text": "SHOPPING LIST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "lg", "contents": shop_rows if shop_rows else [{"type":"text", "text":"全聯生鮮"}]}
            ]
          },
          {"type": "box", "layout": "vertical", "margin": "xxl", "paddingAll": "xl", "backgroundColor": "#FFF7ED", "borderColor": "#FED7AA", "borderWidth": "1px", "cornerRadius": "lg",
            "contents": [
              {"type": "text", "text": "INGREDIENTS & COST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "md", "contents": ingredient_rows if ingredient_rows else [{"type":"text","text":"-"}]},
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
              {"type": "box", "layout": "vertical", "margin": "sm", "contents": step_rows if step_rows else [{"type":"text","text":"-"}]}
            ]
          }
        ]
      },
      "footer": {
        "type": "box", "layout": "horizontal", "spacing": "md", "paddingAll": "xl", "paddingTop": "none",
        "contents": [
          {"type": "button", "style": "secondary", "height": "sm", "color": "#FFEDD5", "action": {"type": "message", "label": "重新構思", "text": "清除記憶"}},
          {"type": "button", "style": "primary", "height": "sm", "color": "#EA580C", "action": {"type": "message", "label": "追加配菜", "text": "這套食譜很棒"}}
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
        reply = TextMessage(text="👨‍🍳 歡迎！廚房已備妥，Claude Sonnet 4.6 已就緒。請問想吃什麼？")
        with ApiClient(configuration) as api_client:
            MessagingApi(api_client).reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[reply]))
        return
    
    system_prompt = (
        "你是一個頂級米其林研發團隊。必須先讓三位主廚(行政主廚、副主廚、食材總管)進行專業對話，再給出食譜。\n"
        "輸出格式必須嚴格遵守以下 JSON 結構，且所有字串內容不可為空：\n"
        "{\"kitchen_talk\": [{\"role\": \"角色\", \"content\": \"內容\"}], \"theme\": \"主題\", \"recipe_name\": \"菜名\", \"ingredients\": [{\"name\": \"食材\", \"price\": \"價格\"}], \"steps\": [\"步驟\"], \"shopping_list\": [\"區塊\"], \"estimated_total_cost\": \"數字\"}"
    )

    history = get_user_memory(user_id)
    if not history: history = [{"role": "system", "content": system_prompt}]
    history.append({"role": "user", "content": user_message})
    if len(history) > 6: history = [history[0]] + history[-5:]

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=history,
            temperature=0.3 # 降低隨機性，防止 AI 寫亂食譜
        )
        ai_content = response.choices[0].message.content.strip()
        print(f"DEBUG AI OUTPUT: {ai_content}") # 在 Render Logs 中可以看到原始輸出
        
        json_match = re.search(r'\{.*\}', ai_content, re.DOTALL)
        if json_match:
            ai_data = json.loads(json_match.group(0))
        else:
            raise ValueError("No JSON found")
            
        save_user_memory(user_id, history + [{"role": "assistant", "content": ai_content}])
        
        flex_dict = generate_flex_message(
            ai_data.get("kitchen_talk", []), ai_data.get("theme", ""), ai_data.get("recipe_name", ""),
            ai_data.get("ingredients", []), ai_data.get("steps", []), ai_data.get("shopping_list", []),
            ai_data.get("estimated_total_cost", "")
        )
        msg = FlexMessage(alt_text=f"職人提案：{ai_data.get('recipe_name', '美味食譜')}", contents=FlexContainer.from_dict(flex_dict))
            
    except Exception as e:
        print(f"ERROR DETAIL: {e}")
        msg = TextMessage(text="👨‍🍳 團隊正在熱烈討論中，請對我輸入「清除記憶」後換個說法試試。")

    with ApiClient(configuration) as api_client:
        MessagingApi(api_client).reply_message(ReplyMessageRequest(reply_token=event.reply_token, messages=[msg]))
