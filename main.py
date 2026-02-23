import os
import json
from fastapi import FastAPI, Request, HTTPException
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, FlexMessage

# 1. 新增 LINE Bot 需要的 Webhook 事件模組
from linebot.v3.webhooks import MessageEvent, TextMessageContent

# 2. 改為匯入同步版本的 OpenAI
from openai import OpenAI

app = FastAPI()

# 設定環境變數
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

# 3. 改為使用同步版本的 OpenAI 客戶端
client = OpenAI(api_key=OPENAI_API_KEY)

def generate_flex_message(recipe_name, veggies, shopping_list):
    """將 AI 產生的資料轉換為 LINE Flex Message JSON 格式"""
    return {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "🥦 全聯隱形蔬菜食譜",
            "weight": "bold",
            "color": "#1DB446",
            "size": "sm"
          },
          {
            "type": "text",
            "text": recipe_name,
            "weight": "bold",
            "size": "xl",
            "margin": "md"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "偷偷藏了這些菜：",
            "size": "sm",
            "color": "#aaaaaa"
          },
          {
            "type": "text",
            "text": veggies,
            "wrap": True,
            "margin": "sm"
          },
          {
            "type": "separator",
            "margin": "lg"
          },
          {
            "type": "text",
            "text": "🛒 全聯採買清單",
            "weight": "bold",
            "margin": "lg"
          },
          {
            "type": "text",
            "text": shopping_list,
            "wrap": True,
            "size": "sm",
            "margin": "sm",
            "color": "#666666"
          }
        ]
      }
    }

@app.post("/callback")
async def callback(request: Request):
    signature = request.headers.get("X-Line-Signature")
    body = await request.body()
    try:
        handler.handle(body.decode("utf-8"), signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    return "OK"

# 4. 修正裝飾器的呼叫寫法
@handler.add(event=MessageEvent, message=TextMessageContent)
def handle_message(event):
    user_message = event.message.text
    
    # 呼叫 OpenAI 產生食譜與清單
    response = client.chat.completions.create(
        model="gpt-4o",
        response_format={ "type": "json_object" },
        messages=[
            {"role": "system", "content": "你是一個全聯採買管家。請根據使用者的煩惱，設計一道『隱形蔬菜食譜』。請嚴格以 JSON 格式回傳，包含三個欄位：'recipe_name' (食譜名稱), 'veggies' (藏了哪些蔬菜), 'shopping_list' (全聯分類採買清單，例如：生鮮區、乾貨區)。"},
            {"role": "user", "content": user_message}
        ]
    )
    
    # 解析 AI 回傳的 JSON
    try:
        ai_data = json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI JSON 解析失敗: {e}")
        print(f"原始內容: {response.choices[0].message.content}")
        return

    # 轉換成 Flex Message 圖卡
    flex_content = generate_flex_message(
        ai_data.get("recipe_name", "神秘料理"),
        ai_data.get("veggies", "找不到蔬菜"),
        ai_data.get("shopping_list", "清單生成失敗")
    )
    
    # 這裡加上 Exception 捕捉，看 LINE 到底報什麼錯
    try:
        from linebot.v3.messaging import FlexContainer
        
        # 修正：將 dict 轉換為 SDK 要求的 FlexContainer 物件
        flex_message = FlexMessage(
            alt_text="您的全聯採買清單來了！", 
            contents=FlexContainer.from_dict(flex_content)
        )
        
        with ApiClient(configuration) as api_client:
            line_bot_api = MessagingApi(api_client)
            line_bot_api.reply_message(
                ReplyMessageRequest(
                    reply_token=event.reply_token,
                    messages=[flex_message]
                )
            )
        print("訊息回傳成功！")
    except Exception as e:
        print(f"LINE 回傳失敗，錯誤詳情: {e}")
