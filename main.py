import os
import json
from fastapi import FastAPI, Request, HTTPException
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, FlexMessage, FlexContainer
from linebot.v3.webhooks import MessageEvent, TextMessageContent
from openai import OpenAI

app = FastAPI()

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "全聯採買管家伺服器運行中"}

# 環境變數設定
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)
client = OpenAI(api_key=OPENAI_API_KEY)

# 對話記憶暫存區
user_memory = {}

def generate_flex_message(theme, recipe_name, ingredients, steps, shopping_list, estimated_total_cost):
    """將 AI 產生的資料轉換為高質感的 LINE Flex Message"""
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

    # 全新視覺化 Flex Message JSON
    bubble_content = {
      "type": "bubble",
      "size": "giga",
      "header": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "none",
        "contents": [
          {
            "type": "box",
            "layout": "vertical",
            "height": "6px",
            "backgroundColor": "#EE1C24",
            "contents": []
          },
          {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "xl",
            "paddingBottom": "md",
            "contents": [
              {
                "type": "text",
                "text": f"👨‍🍳 {safe_theme}",
                "color": "#1DB446",
                "weight": "bold",
                "size": "sm"
              },
              {
                "type": "text",
                "text": safe_recipe_name,
                "weight": "bold",
                "size": "xxl",
                "margin": "md",
                "color": "#333333",
                "wrap": True
              }
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
              {
                "type": "text",
                "text": "🛒 全聯分類採買",
                "color": "#1DB446",
                "weight": "bold",
                "size": "sm"
              },
              {
                "type": "text",
                "text": safe_shopping_list,
                "wrap": True,
                "size": "sm",
                "color": "#666666"
              }
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
              {
                "type": "text",
                "text": "🥬 所需食材 (含報價)",
                "color": "#1DB446",
                "weight": "bold",
                "size": "sm"
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
                "margin": "md",
                "color": "#DDDDDD"
              },
              {
                "type": "box",
                "layout": "horizontal",
                "margin": "md",
                "contents": [
                  {
                    "type": "text",
                    "text": "💰 預估總花費",
                    "color": "#FF5722",
                    "weight": "bold",
                    "size": "sm",
                    "flex": 0,
                    "gravity": "center"
                  },
                  {
                    "type": "text",
                    "text": safe_estimated_total_cost,
                    "color": "#FF5722",
                    "weight": "bold",
                    "size": "lg",
                    "align": "end",
                    "gravity": "center"
                  }
                ]
              }
            ]
          },
          {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
              {
                "type": "text",
                "text": "👨‍🍳 料理步驟",
                "color": "#1DB446",
                "weight": "bold",
                "size": "sm"
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
        "你是一個專業的『全聯採買管家』。請根據使用者的需求推薦一道合適的料理。"
        "【重要規則】：如果使用者的需求很模糊（例如：推薦晚餐、肚子餓、再一個），"
        "請自動假設為『2到3人份家常菜、預算約200-300元、做法簡單』，並直接給出食譜。"
        "如果有對話紀錄，請根據前文提供『不同』的食譜選項，不要重複。"
        "請以台灣全聯超市的常見物價，為每項食材估算價格，並計算總花費。"
        "請嚴格以 JSON 格式回傳，包含以下六個欄位："
        "'theme' (料理主題), 'recipe_name' (食譜名稱), "
        "'ingredients' (所需食材、份量與『預估價格』，請條列式), "
        "'steps' (料理步驟，請標示 1. 2. 3.), 'shopping_list' (全聯分類採買清單), "
        "'estimated_total_cost' (預估總花費)。"
    )

    if user_id not in user_memory:
        user_memory[user_id] = [{"role": "system", "content": system_prompt}]
    
    user_memory[user_id].append({"role": "user", "content": user_message})

    if len(user_memory[user_id]) > 5:
        user_memory[user_id] = [user_memory[user_id][0]] + user_memory[user_id][-4:]

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=user_memory[user_id]
        )
        
        ai_response_content = response.choices[0].message.content
        user_memory[user_id].append({"role": "assistant", "content": ai_response_content})
        
        ai_data = json.loads(ai_response_content)
        
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
