import os
import json
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
    return {"status": "ok", "message": "米其林智能研發廚房伺服器運行中 (v4.0 終極排版版)"}

# 環境變數設定
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Supabase 設定 (防呆安全機制)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = None

if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL.strip() and SUPABASE_KEY.strip():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"初始化 Supabase 客戶端失敗: {e}")

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)
client = OpenAI(api_key=OPENAI_API_KEY)

# 記憶體暫存區 (備用方案)
memory_cache = {}

def get_user_memory(user_id: str):
    """取得使用者對話歷史（優先讀取 Supabase）"""
    if supabase:
        try:
            response = supabase.table("user_memory").select("history").eq("user_id", user_id).execute()
            if response.data:
                return response.data[0]["history"]
        except Exception as e:
            print(f"Supabase 讀取錯誤: {e}")
    return memory_cache.get(user_id, [])

def save_user_memory(user_id: str, history: list):
    """儲存使用者對話歷史（寫入 Supabase 與本機快取）"""
    if supabase:
        try:
            supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()
        except Exception as e:
            print(f"Supabase 寫入錯誤: {e}")
    memory_cache[user_id] = history

def generate_flex_message(kitchen_talk, theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost):
    """具備極致排版細節 (Typography) 的雜誌風 Flex Message"""
    
    # 1. 處理廚房對話 (講者與內容分離，懸掛對齊)
    talk_components = []
    if isinstance(kitchen_talk, list):
        for talk in kitchen_talk:
            role = talk.get('role', '') if isinstance(talk, dict) else ''
            content = talk.get('content', str(talk)) if isinstance(talk, dict) else str(talk)
            
            color = "#64748B"
            if "行政主廚" in role: color = "#991B1B"
            elif "副主廚" in role: color = "#1D4ED8"
            elif "食材總管" in role: color = "#047857"
            
            talk_components.append({
                "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
                "contents": [
                    {"type": "text", "text": role, "color": color, "weight": "bold", "size": "xs", "flex": 0},
                    {"type": "text", "text": content, "color": "#334155", "size": "sm", "wrap": True, "flex": 1, "lineSpacing": "4px"}
                ]
            })

    # 2. 處理食材與精準報價 (會計級左右完美切分)
    ingredient_components = []
    if isinstance(ingredients, list):
        for item in ingredients:
            name = item.get('name', '') if isinstance(item, dict) else str(item)
            price = item.get('price', '') if isinstance(item, dict) else ''
            ingredient_components.append({
                "type": "box", "layout": "horizontal", "margin": "md",
                "contents": [
                    {"type": "text", "text": name, "color": "#475569", "size": "sm", "flex": 1},
                    {"type": "text", "text": price, "color": "#0F172A", "size": "sm", "weight": "bold", "align": "end", "flex": 0}
                ]
            })

    # 3. 處理料理步驟 (生成具備懸掛縮排的雜誌風數字清單)
    step_components = []
    if isinstance(steps, list):
        for i, step in enumerate(steps):
            step_components.append({
                "type": "box", "layout": "baseline", "spacing": "md", "margin": "lg",
                "contents": [
                    {"type": "text", "text": f"{i+1:02d}", "color": "#94A3B8", "weight": "bold", "size": "sm", "flex": 0},
                    {"type": "text", "text": str(step), "color": "#334155", "size": "sm", "wrap": True, "flex": 1, "lineSpacing": "5px"}
                ]
            })

    # 4. 處理採買清單 (簡約標籤)
    shopping_components = [{"type": "text", "text": f"• {item}", "size": "sm", "color": "#64748B", "margin": "sm"} for item in shopping_list] if isinstance(shopping_list, list) else []

    bubble_content = {
      "type": "bubble",
      "size": "giga",
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "none",
        "backgroundColor": "#FFFFFF",
        "contents": [
          {"type": "box", "layout": "vertical", "height": "4px", "backgroundColor": "#1E293B", "contents": []},
          
          # 標題區塊
          {
            "type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingBottom": "lg",
            "contents": [
              {"type": "text", "text": str(theme or "CHEF'S SELECTION").upper(), "size": "xs", "color": "#94A3B8", "weight": "bold", "letterSpacing": "2px"},
              {"type": "text", "text": str(recipe_name), "size": "xxl", "weight": "bold", "color": "#0F172A", "margin": "md", "wrap": True}
            ]
          },

          # 專業研發會議區塊
          {
            "type": "box", "layout": "vertical", "margin": "md", "marginHorizontal": "xxl", "paddingAll": "lg", "backgroundColor": "#F8FAFC", "cornerRadius": "lg",
            "contents": [
              {"type": "text", "text": "EXECUTIVE KITCHEN TALK", "size": "xxs", "weight": "bold", "color": "#94A3B8", "letterSpacing": "1px", "margin": "xs"},
              {"type": "box", "layout": "vertical", "margin": "lg", "contents": talk_components}
            ]
          },

          # 採買分類區塊
          {
            "type": "box", "layout": "vertical", "paddingAll": "xxl",
            "contents": [
              {"type": "text", "text": "SHOPPING CATEGORIES", "size": "xxs", "weight": "bold", "color": "#94A3B8", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": shopping_components}
            ]
          },

          # 食材與報價區塊
          {
            "type": "box", "layout": "vertical", "margin": "xxl", "paddingAll": "xl", "borderColor": "#E2E8F0", "borderWidth": "1px", "cornerRadius": "lg",
            "contents": [
              {"type": "text", "text": "INGREDIENTS & COST", "size": "xxs", "weight": "bold", "color": "#94A3B8", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "md", "contents": ingredient_components},
              {"type": "separator", "margin": "xl", "color": "#E2E8F0"},
              {
                "type": "box", "layout": "horizontal", "margin": "lg",
                "contents": [
                  {"type": "text", "text": "TOTAL", "size": "xs", "weight": "bold", "color": "#64748B", "flex": 0, "gravity": "center"},
                  {"type": "text", "text": f"NT$ {estimated_total_cost}", "size": "xl", "weight": "bold", "color": "#0F172A", "align": "end", "gravity": "center"}
                ]
              }
            ]
          },

          # 步驟區塊
          {
            "type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingTop": "none",
            "contents": [
              {"type": "text", "text": "PREPARATION STEPS", "size": "xxs", "weight": "bold", "color": "#94A3B8", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "sm", "contents": step_components}
            ]
          }
        ]
      },
      "footer": {
        "type": "box", "layout": "horizontal", "spacing": "md", "paddingAll": "xl", "paddingTop": "none",
        "contents": [
          {"type": "button", "style": "secondary", "height": "sm", "color": "#F1F5F9", "action": {"type": "message", "label": "重新構思", "text": "團隊，請為我重新構思一套不同風味的提案。"}},
          {"type": "button", "style": "primary", "height": "sm", "color": "#1E293B", "action": {"type": "message", "label": "追加配菜", "text": "這套食譜很棒，請團隊再推薦一道能完美搭配的副菜。"}}
        ]
      }
    }
    return bubble_content

@app.post("/callback")
async def callback(request: Request):
    signature = request.headers.get("X-Line-Signature")
    body = await request.body()
    try:
        handler.handle(body.decode("utf-8"), signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    return "OK"

@handler.add(event=MessageEvent, message=TextMessageContent)
def handle_message(event):
    user_message = event.message.text
    user_id = event.source.user_id 
    
    # 強制使用陣列 (Array) 與物件 (Object) 輸出，供前端進行精準排版
    system_prompt = (
        "你現在是一個頂級米其林餐廳的『菜單研發團隊』，包含三位具備極高專業素養的角色："
        "1. 【行政主廚】：追求極致的味覺層次與料理美學，語氣優雅、沉穩且充滿職人精神。"
        "2. 【副主廚】：講究執行精準度與營養科學，語氣冷靜客觀。"
        "3. 【食材總管】：對台灣全聯的當季食材與物價瞭若指掌，負責預算控管，語氣專業且務實。"
        "【任務】：進行一段 3 到 4 句的『專業研發會議』，討論食材特性、風味或預算，最後給出一道完美料理。"
        "【排版與輸出格式絕對要求】：為了讓前端 UI 能完美對齊渲染，請嚴格使用以下 JSON 格式回傳，不可隨意合併字串："
        "{"
        "  \"kitchen_talk\": [{\"role\": \"食材總管\", \"content\": \"...\"}, {\"role\": \"行政主廚\", \"content\": \"...\"}],"
        "  \"theme\": \"料理主題\","
        "  \"recipe_name\": \"食譜名稱\","
        "  \"ingredients\": [{\"name\": \"食材名稱與份量\", \"price\": \"價格 (例如: 80元)\"}],"
        "  \"steps\": [\"將食材洗淨切塊...\", \"放入鍋中悶煮...\"],"
        "  \"shopping_list\": [\"生鮮區\", \"調味料區\"],"
        "  \"estimated_total_cost\": \"總計數字\""
        "}"
    )

    history = get_user_memory(user_id)
    if not history:
        history = [{"role": "system", "content": system_prompt}]
    
    history.append({"role": "user", "content": user_message})

    if len(history) > 5:
        history = [history[0]] + history[-4:]

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=history
        )
        ai_response_content = response.choices[0].message.content
        
        try:
            ai_data = json.loads(ai_response_content)
        except json.JSONDecodeError:
            raise ValueError("AI 回傳的資料格式非正確的 JSON")
            
        history.append({"role": "assistant", "content": ai_response_content})
        save_user_memory(user_id, history)
        
        flex_dict = generate_flex_message(
            ai_data.get("kitchen_talk", []),
            ai_data.get("theme", ""),
            ai_data.get("recipe_name", ""),
            ai_data.get("ingredients", []),
            ai_data.get("steps", []),
            ai_data.get("shopping_list", []),
            ai_data.get("estimated_total_cost", "")
        )
        
        reply_message = FlexMessage(
            alt_text=f"職人提案：{ai_data.get('recipe_name', '美味食譜')}", 
            contents=FlexContainer.from_dict(flex_dict)
        )
            
    except Exception as e:
        print(f"發生錯誤: {e}")
        reply_message = TextMessage(text="👨‍🍳 抱歉，研發團隊正在廚房熱烈討論中，請稍後換個說法再試一次好嗎？")

    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_bot_api.reply_message(
            ReplyMessageRequest(reply_token=event.reply_token, messages=[reply_message])
        )
