import os
import json
from fastapi import FastAPI, Request, HTTPException
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, FlexMessage, FlexContainer
from linebot.v3.webhooks import MessageEvent, TextMessageContent
from openai import OpenAI

app = FastAPI()

# 環境變數設定
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)
client = OpenAI(api_key=OPENAI_API_KEY)

def generate_flex_message(theme, recipe_name, ingredients, steps, shopping_list):
    """將 AI 產生的資料轉換為更豐富的 LINE Flex Message 格式"""
    
    # --- 資料清洗：確保所有輸入都是字串 ---
    def to_str(data):
        if isinstance(data, list):
            return "\n".join(map(str, data)) # 如果是列表，用換行符號接起來
        return str(data) if data is not None else ""

    safe_theme = to_str(theme) or "主廚隨機推薦"
    safe_recipe_name = to_str(recipe_name)
    safe_ingredients = to_str(ingredients)
    safe_steps = to_str(steps)
    safe_shopping_list = to_str(shopping_list)

    # 建立 Flex Message 字典 (版面升級版)
    bubble_content = {
      "type": "bubble",
      "size": "giga", # 加大圖卡尺寸以容納食譜
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": f"🍳 {safe_theme}",
            "weight": "bold",
            "color": "#1DB446",
            "size": "sm"
          },
          {
            "type": "text",
            "text": safe_recipe_name,
            "weight": "bold",
            "size": "xl",
            "margin": "md",
            "wrap": True
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "spacing": "md",
        "contents": [
          {
            "type": "text",
            "text": "🛒 全聯分類採買",
            "weight": "bold",
            "size": "md",
            "color": "#1DB446"
          },
          {
            "type": "text",
            "text": safe_shopping_list,
            "wrap": True,
            "size": "sm",
            "color": "#666666"
          },
          {
            "type": "separator",
            "margin": "lg"
          },
          {
            "type": "text",
            "text": "🥬 所需食材與份量",
            "weight": "bold",
            "size": "md",
            "margin": "lg",
            "color": "#1DB446"
          },
          {
            "type": "text",
            "text": safe_ingredients,
            "wrap": True,
            "size": "sm",
            "color": "#666666"
          },
          {
            "type": "separator",
            "margin": "lg"
          },
          {
            "type": "text",
            "text": "👨‍🍳 料理步驟",
            "weight": "bold",
            "size": "md",
            "margin": "lg",
            "color": "#1DB446"
          },
          {
            "type": "text",
            "text": safe_steps,
            "wrap": True,
            "size": "sm",
            "color": "#666666"
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
    
    try:
        # 呼叫 OpenAI (系統指令大升級！)
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "你是一個專業的『全聯採買管家』。請根據使用者的需求（例如：挑食、下班太累、想減脂等）推薦一道合適的料理。"
                        "如果使用者沒有特定要求，請隨機發揮創意，推薦一道美味的家常菜。"
                        "請嚴格以 JSON 格式回傳，包含以下五個欄位："
                        "'theme' (料理主題，例如：快速上菜、挑食剋星、週末大餐), "
                        "'recipe_name' (食譜名稱), "
                        "'ingredients' (所需食材與份量，請條列式), "
                        "'steps' (簡明扼要的料理步驟，請標示 1. 2. 3.), "
                        "'shopping_list' (全聯分類採買清單，例如 生鮮區、乾貨區)。"
                    )
                },
                {"role": "user", "content": user_message}
            ]
        )
        
        ai_data = json.loads(response.choices[0].message.content)
        
        # 產生圖卡內容 (傳入新的五個欄位)
        flex_dict = generate_flex_message(
            ai_data.get("theme"),
            ai_data.get("recipe_name"),
            ai_data.get("ingredients"),
            ai_data.get("steps"),
            ai_data.get("shopping_list")
        )
        
        flex_message = FlexMessage(
            alt_text=f"為您推薦：{ai_data.get('recipe_name', '美味食譜')}", 
            contents=FlexContainer.from_dict(flex_dict)
        )
        
        with ApiClient(configuration) as api_client:
            line_bot_api = MessagingApi(api_client)
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[flex_message]
                )
            )
            
    except Exception as e:
        print(f"發生錯誤: {e}")
