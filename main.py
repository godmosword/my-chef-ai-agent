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

def generate_flex_message(recipe_name, veggies, shopping_list):
    """將 AI 產生的資料轉換為 LINE Flex Message，並確保型別正確"""
    
    # --- 資料清洗：確保所有輸入都是字串 ---
    def to_str(data):
        if isinstance(data, list):
            return "、".join(map(str, data)) # 如果是列表，用「、」接起來
        return str(data) if data is not None else ""

    safe_recipe_name = to_str(recipe_name)
    safe_veggies = to_str(veggies)
    safe_shopping_list = to_str(shopping_list)

    # 建立 Flex Message 字典
    bubble_content = {
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
            "text": safe_recipe_name,
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
            "text": safe_veggies,
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
            "text": safe_shopping_list,
            "wrap": True,
            "size": "sm",
            "margin": "sm",
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
        # 呼叫 OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": "你是一個全聯採買管家。請根據使用者的煩惱，設計一道『隱形蔬菜食譜』。請以 JSON 格式回傳：'recipe_name', 'veggies', 'shopping_list'。"},
                {"role": "user", "content": user_message}
            ]
        )
        
        ai_data = json.loads(response.choices[0].message.content)
        
        # 產生圖卡內容
        flex_dict = generate_flex_message(
            ai_data.get("recipe_name"),
            ai_data.get("veggies"),
            ai_data.get("shopping_list")
        )
        
        # 使用 FlexContainer.from_dict 確保格式符合 SDK 要求
        flex_message = FlexMessage(
            alt_text="您的全聯採買清單來了！", 
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
        # 這裡可以補一個簡單的文字回覆作為備援
