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
    return {"status": "ok", "message": "全聯採買管家伺服器運行中 (v2.0 升級版)"}

# 環境變數設定
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Supabase 設定 (若無設定環境變數，則自動退回使用記憶體暫存)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)
client = OpenAI(api_key=OPENAI_API_KEY)

# 記憶體暫存區 (當作 Supabase 異常或未設定時的備用方案)
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
            # 使用 upsert 確保資料存在就更新，不存在就新增
            supabase.table("user_memory").upsert({"user_id": user_id, "history": history}).execute()
        except Exception as e:
            print(f"Supabase 寫入錯誤: {e}")
    memory_cache[user_id] = history

def generate_flex_message(theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost):
    """將 AI 產生的資料轉換為高質感的 LINE Flex Message (含互動按鈕)"""
    def to_str(data):
        if isinstance(data, list):
            return "\n".join(map(str, data)) 
        return str(data) if data is not None else ""

    bubble_content = {
      "type": "bubble",
      "size": "giga",
      "header": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "none",
        "contents": [
          {"type": "box", "layout": "vertical", "height": "6px", "backgroundColor": "#EE1C24", "contents": []},
          {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "xl",
            "paddingBottom": "md",
            "contents": [
              {"type": "text", "text": f"👨‍🍳 {to_str(theme) or '主廚推薦'}", "color": "#1DB446", "weight": "bold", "size": "sm"},
              {"type": "text", "text": to_str(recipe_name), "weight": "bold", "size": "xxl", "margin": "md", "color": "#333333", "wrap": True}
            ]
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "spacing": "xl",
        "paddingAll": "xl",
        "paddingTop": "none",
        "contents": [
          {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {"type": "text", "text": "🛒 全聯分類採買", "color": "#1DB446", "weight": "bold", "size": "sm"},
              {"type": "text", "text": to_str(shopping_list), "wrap": True, "size": "sm", "color": "#666666"}
            ]
          },
          {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#F6F6F6",
            "cornerRadius": "md",
            "paddingAll": "md",
            "spacing": "sm",
            "contents": [
              {"type": "text", "text": "🥬 所需食材 (含報價)", "color": "#1DB446", "weight": "bold", "size": "sm"},
              {"type": "text", "text": to_str(ingredients), "wrap": True, "size": "sm", "color": "#666666"},
              {"type": "separator", "margin": "md", "color": "#DDDDDD"},
              {
                "type": "box",
                "layout": "horizontal",
                "margin": "md",
                "contents": [
                  {"type": "text", "text": "💰 預估總花費", "color": "#FF5722", "weight": "bold", "size": "sm", "flex": 0, "gravity": "center"},
                  {"type": "text", "text": to_str(estimated_total_cost) or "估算中...", "color": "#FF5722", "weight": "bold", "size": "lg", "align": "end", "gravity": "center"}
                ]
              }
            ]
          },
          {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {"type": "text", "text": "👨‍🍳 料理步驟", "color": "#1DB446", "weight": "bold", "size": "sm"},
              {"type": "text", "text": to_str(steps), "wrap": True, "size": "sm", "color": "#666666"}
            ]
          }
        ]
      },
      # 新增 Footer：互動按鈕區塊
      "footer": {
        "type": "box",
        "layout": "horizontal",
        "spacing": "sm",
        "paddingAll": "md",
        "contents": [
          {
            "type": "button",
            "style": "secondary",
            "height": "sm",
            "color": "#E0E0E0",
            "action": {
              "type": "message",
              "label": "換一道菜",
              "text": "這個我不太喜歡，請幫我換一道不同的菜色"
            }
          },
          {
            "type": "button",
            "style": "primary",
            "height": "sm",
            "color": "#1DB446",
            "action": {
              "type": "message",
              "label": "再來一道",
              "text": "這道不錯！請再推薦一道可以搭配的菜色"
            }
          }
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
    
    # 優化：精準報價 Prompt
    system_prompt = (
        "你是一個專業的『全聯採買管家』。請根據使用者的需求推薦一道合適的料理。"
        "【重要規則】：如果需求模糊（例如：推薦晚餐、肚子餓），請自動假設為『2到3人份家常菜、預算約200-300元』。"
        "如果有對話紀錄，請根據前文提供『不同』的食譜選項，不要重複。"
        "【精準報價要求】：請參考台灣全聯近期真實物價（例如：高麗菜約60-90元/顆、豬肉片約100-120元/盒、雞蛋約60元/盒），給出符合行情的精準估價。"
        "請嚴格以 JSON 格式回傳以下六個欄位："
        "'theme', 'recipe_name', 'ingredients' (食材與預估價格，請條列), 'steps' (標示 1. 2. 3.), 'shopping_list' (全聯分類), 'estimated_total_cost' (預估總花費數字)。"
    )

    # 取得歷史紀錄 (從 DB 或 快取)
    history = get_user_memory(user_id)
    if not history:
        history = [{"role": "system", "content": system_prompt}]
    
    history.append({"role": "user", "content": user_message})

    # 限制記憶長度，保留 System Prompt 與最近 4 句對話
    if len(history) > 5:
        history = [history[0]] + history[-4:]

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=history
        )
        ai_response_content = response.choices[0].message.content
        
        # 防呆機制：確保 JSON 解析正確
        try:
            ai_data = json.loads(ai_response_content)
        except json.JSONDecodeError:
            raise ValueError("AI 回傳的資料格式非正確的 JSON")
            
        # 解析成功才寫入記憶並存檔
        history.append({"role": "assistant", "content": ai_response_content})
        save_user_memory(user_id, history)
        
        flex_dict = generate_flex_message(
            ai_data.get("theme"),
            ai_data.get("recipe_name"),
            ai_data.get("ingredients"),
            ai_data.get("steps"),
            ai_data.get("shopping_list"),
            ai_data.get("estimated_total_cost")
        )
        
        reply_message = FlexMessage(
            alt_text=f"為您推薦：{ai_data.get('recipe_name', '美味食譜')}", 
            contents=FlexContainer.from_dict(flex_dict)
        )
            
    except Exception as e:
        print(f"發生錯誤: {e}")
        # 防呆機制：錯誤發生時給予友善回應，不讓機器人已讀不回
        reply_message = TextMessage(text="👨‍🍳 抱歉，主廚剛剛在廚房忙中有錯，請換個說法再試一次好嗎？")

    # 統一發送回應
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_bot_api.reply_message(
            ReplyMessageRequest(reply_token=event.reply_token, messages=[reply_message])
        )
