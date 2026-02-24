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

def generate_flex_message(theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost):
    """將 AI 產生的資料轉換為包含報價的 LINE Flex Message"""
    
    def to_str(data):
        if isinstance(data, list):
            return "\n".join(map(str, data)) 
        return str(data) if data is not None else ""

    safe_theme = to_str(theme) or "主廚推薦"
    safe_recipe_name = to_str(recipe_name)
    safe_ingredients = to_str(ingredients)
    safe_steps = to_str(steps)
    safe_shopping_list = to_str(shopping_list)
    safe_estimated_total_cost = to_str(estimated_total_cost) or "價格估算中..."

    bubble_content = {
      "type": "bubble",
      "size": "giga",
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
            "text": "🛒 採買清單與預估費用",
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
            "text": "🥬 食材清單 (含報價)",
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
            "type": "box",
            "layout": "horizontal",
            "margin": "xl",
            "contents": [
              {
                "type": "text",
                "text": "💰 預估總花費",
                "weight": "bold",
                "size": "md",
                "color": "#FF5722",
                "flex": 0
              },
              {
                "type": "text",
                "text": safe_estimated_total_cost,
                "weight": "bold",
                "size": "md",
                "color": "#FF5722",
                "align": "end"
              }
            ]
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
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "你是一個專業的『全聯採買管家』。請根據使用者的需求推薦一道合適的料理。"
                        "請以台灣全聯超市的常見物價，為每項食材估算價格，並計算總花費。"
                        "請嚴格以 JSON 格式回傳，包含以下六個欄位："
                        "'theme' (料理主題), "
                        "'recipe_name' (食譜名稱), "
                        "'ingredients' (所需食材、份量與『預估價格』，請條列式，例如：雞胸肉 1盒 約80元), "
                        "'steps' (料理步驟，請標示 1. 2. 3.), "
                        "'shopping_list' (全聯分類採買清單), "
                        "'estimated_total_cost' (預估總花費，例如：約 250 元)。"
                    )
                },
                {"role": "user", "content": user_message}
            ]
        )
        
        ai_data = json.loads(response.choices[0].message.content)
        
        flex_dict = generate_flex_message(
            ai_data.get("theme"),
            ai_data.get("recipe_name"),
            ai_data.get("ingredients"),
            ai_data.get("steps"),
            ai_data.get("shopping_list"),
            ai_data.get("estimated_total_cost")
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
