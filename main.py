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
    return {"status": "ok", "message": "米其林智能研發廚房伺服器運行中 (v4.2 暖色食慾版)"}

LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = None

if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL.strip() and SUPABASE_KEY.strip():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"初始化 Supabase 失敗: {e}")

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)
client = OpenAI(api_key=OPENAI_API_KEY)

memory_cache = {}

def get_user_memory(user_id: str):
    if supabase:
        try:
            response = supabase.table("user_memory").select("history").eq("user_id", user_id).execute()
            if response.data: return response.data[0]["history"]
        except Exception:
            pass
    return memory_cache.get(user_id, [])

def save_user_memory(user_id: str, history: list):
    if supabase:
        try:
            supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()
        except Exception:
            pass
    memory_cache[user_id] = history

def generate_flex_message(kitchen_talk, theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost):
    """暖色調法式餐廳風格 (Warm Gourmet) 的 Flex Message"""
    
    # 萬能轉換器：無論 AI 給什麼格式，都強制作為 List 處理
    def parse_to_list(data):
        if not data: return []
        if isinstance(data, list): return data
        if isinstance(data, dict): return [data]
        if isinstance(data, str): return [line for line in data.split('\n') if line.strip()]
        return [str(data)]

    # 1. 廚房對話防呆解析 (暖色系角色設定)
    talk_components = []
    for talk in parse_to_list(kitchen_talk):
        role, content = "團隊討論", str(talk)
        if isinstance(talk, dict):
            role = talk.get('role', talk.get('角色', '團隊討論'))
            content = talk.get('content', talk.get('內容', str(talk)))
        else:
            talk_str = str(talk)
            for sep in ["：", ":", " - "]:
                if sep in talk_str:
                    parts = talk_str.split(sep, 1)
                    role, content = parts[0].strip(), parts[1].strip()
                    break
        
        # 角色代表色更新為溫暖/食物相關色系
        color = "#78350F" # 預設暖棕色
        if "行政主廚" in role: color = "#9F1239" # 勃根地酒紅
        elif "副主廚" in role: color = "#B45309" # 焦糖琥珀
        elif "食材總管" in role: color = "#166534" # 羅勒鮮綠
        
        talk_components.append({
            "type": "box", "layout": "baseline", "spacing": "sm", "margin": "md",
            "contents": [
                {"type": "text", "text": role, "color": color, "weight": "bold", "size": "xs", "flex": 0},
                {"type": "text", "text": content, "color": "#431407", "size": "sm", "wrap": True, "flex": 1, "lineSpacing": "4px"}
            ]
        })
    if not talk_components: talk_components.append({"type": "text", "text": "研發團隊默契確認中...", "size": "sm", "color": "#D97706"})

    # 2. 食材報價防呆解析
    ingredient_components = []
    for item in parse_to_list(ingredients):
        name, price = str(item), ""
        if isinstance(item, dict):
            name = item.get('name', item.get('食材', str(item)))
            price = item.get('price', item.get('價格', ''))
        else:
            item_str = str(item)
            for sep in ["：", ":", " - "]:
                if sep in item_str:
                    parts = item_str.split(sep, 1)
                    name, price = parts[0].strip(), parts[1].strip()
                    break
        ingredient_components.append({
            "type": "box", "layout": "horizontal", "margin": "md",
            "contents": [
                {"type": "text", "text": name, "color": "#522504", "size": "sm", "flex": 1, "wrap": True},
                {"type": "text", "text": price, "color": "#431407", "size": "sm", "weight": "bold", "align": "end", "flex": 0}
            ]
        })
    if not ingredient_components: ingredient_components.append({"type": "text", "text": "請參閱步驟說明", "size": "sm", "color": "#D97706"})

    # 3. 料理步驟防呆解析
    step_components = []
    for i, step in enumerate(parse_to_list(steps)):
        step_str = str(step).strip().lstrip('1234567890.、 ')
        step_components.append({
            "type": "box", "layout": "baseline", "spacing": "md", "margin": "lg",
            "contents": [
                {"type": "text", "text": f"{i+1:02d}", "color": "#EA580C", "weight": "bold", "size": "sm", "flex": 0}, # 亮橘色數字
                {"type": "text", "text": step_str, "color": "#431407", "size": "sm", "wrap": True, "flex": 1, "lineSpacing": "5px"} # 濃縮咖啡色文字
            ]
        })
    if not step_components: step_components.append({"type": "text", "text": "依常規方式烹調", "size": "sm", "color": "#D97706"})

    # 4. 採買清單防呆解析
    shopping_components = [{"type": "text", "text": f"• {item}", "size": "sm", "color": "#78350F", "margin": "sm"} for item in parse_to_list(shopping_list)]
    if not shopping_components: shopping_components.append({"type": "text", "text": "• 全聯生鮮區", "size": "sm", "color": "#D97706"})

    bubble_content = {
      "type": "bubble",
      "size": "giga",
      "body": {
        "type": "box", "layout": "vertical", "paddingAll": "none", "backgroundColor": "#FFFFFF",
        "contents": [
          # 頂部裝飾線：開胃的暖橘紅色
          {"type": "box", "layout": "vertical", "height": "5px", "backgroundColor": "#EA580C", "contents": []},
          
          # 標題區塊
          {
            "type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingBottom": "lg",
            "contents": [
              {"type": "text", "text": str(theme or "CHEF'S SELECTION").upper(), "size": "xs", "color": "#D97706", "weight": "bold", "letterSpacing": "2px"},
              {"type": "text", "text": str(recipe_name or "主廚特製料理"), "size": "xxl", "weight": "bold", "color": "#431407", "margin": "md", "wrap": True}
            ]
          },

          # 專業研發會議 (香草奶油底色 #FFFBEB)
          {
            "type": "box", "layout": "vertical", "margin": "md", "marginHorizontal": "xxl", "paddingAll": "lg", "backgroundColor": "#FFFBEB", "cornerRadius": "lg",
            "contents": [
              {"type": "text", "text": "EXECUTIVE KITCHEN TALK", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px", "margin": "xs"},
              {"type": "box", "layout": "vertical", "margin": "lg", "contents": talk_components}
            ]
          },

          # 採買分類
          {
            "type": "box", "layout": "vertical", "paddingAll": "xxl",
            "contents": [
              {"type": "text", "text": "SHOPPING CATEGORIES", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": shopping_components}
            ]
          },

          # 食材與報價 (淺橘奶油底色 #FFF7ED，帶暖金邊框)
          {
            "type": "box", "layout": "vertical", "margin": "xxl", "paddingAll": "xl", "backgroundColor": "#FFF7ED", "borderColor": "#FED7AA", "borderWidth": "1px", "cornerRadius": "lg",
            "contents": [
              {"type": "text", "text": "INGREDIENTS & COST", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "md", "contents": ingredient_components},
              {"type": "separator", "margin": "xl", "color": "#FED7AA"},
              {
                "type": "box", "layout": "horizontal", "margin": "lg",
                "contents": [
                  {"type": "text", "text": "TOTAL", "size": "xs", "weight": "bold", "color": "#9A3412", "flex": 0, "gravity": "center"},
                  {"type": "text", "text": f"NT$ {estimated_total_cost or '估算中'}", "size": "xl", "weight": "bold", "color": "#431407", "align": "end", "gravity": "center"}
                ]
              }
            ]
          },

          # 步驟
          {
            "type": "box", "layout": "vertical", "paddingAll": "xxl", "paddingTop": "none",
            "contents": [
              {"type": "text", "text": "PREPARATION STEPS", "size": "xxs", "weight": "bold", "color": "#B45309", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "sm", "contents": step_components}
            ]
          }
        ]
      },
      # 互動按鈕：溫暖色系配搭
      "footer": {
        "type": "box", "layout": "horizontal", "spacing": "md", "paddingAll": "xl", "paddingTop": "none",
        "contents": [
          {"type": "button", "style": "secondary", "height": "sm", "color": "#FFEDD5", "action": {"type": "message", "label": "重新構思", "text": "團隊，請為我重新構思一套不同風味的提案。"}},
          {"type": "button", "style": "primary", "height": "sm", "color": "#EA580C", "action": {"type": "message", "label": "追加配菜", "text": "這套食譜很棒，請團隊再推薦一道能完美搭配的副菜。"}}
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
    
    system_prompt = (
        "你現在是一個頂級米其林餐廳的『菜單研發團隊』，包含三位角色："
        "1. 【行政主廚】：語氣優雅沉穩。"
        "2. 【副主廚】：語氣冷靜客觀。"
        "3. 【食材總管】：對台灣全聯物價瞭若指掌，語氣專業。"
        "【任務】：進行一段3句的專業會議，最後給出一道完美料理。"
        "【輸出格式】：請以純 JSON 格式回傳，不可包裝在 markdown 語法中。"
        "{"
        "  \"kitchen_talk\": [{\"role\": \"角色\", \"content\": \"內容\"}],"
        "  \"theme\": \"料理主題\","
        "  \"recipe_name\": \"食譜名稱\","
        "  \"ingredients\": [{\"name\": \"食材名稱與份量\", \"price\": \"價格\"}],"
        "  \"steps\": [\"步驟一\", \"步驟二\"],"
        "  \"shopping_list\": [\"生鮮區\", \"調味料區\"],"
        "  \"estimated_total_cost\": \"總計數字\""
        "}"
    )

    history = get_user_memory(user_id)
    if not history: history = [{"role": "system", "content": system_prompt}]
    
    history.append({"role": "user", "content": user_message})
    if len(history) > 5: history = [history[0]] + history[-4:]

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=history
        )
        ai_response_content = response.choices[0].message.content
        
        # 強制清理 Markdown 殘留符號，避免 json.loads 崩潰
        ai_response_content = ai_response_content.replace('```json', '').replace('```', '').strip()
        
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
