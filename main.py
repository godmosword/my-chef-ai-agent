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

# 🌟 新增：對話記憶暫存區
# 格式：{ "user_id": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, ...] }
user_memory = {}

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
    user_id = event.source.user_id # 取得使用者的專屬 ID
    
    # --- 系統提示詞強化 (賦予補腦能力與記憶力) ---
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

    # --- 記憶體管理邏輯 ---
    # 如果這個使用者是第一次互動，幫他建立一個專屬的記憶陣列
    if user_id not in user_memory:
        user_memory[user_id] = [{"role": "system", "content": system_prompt}]
    
    # 把使用者剛剛說的話加入記憶中
    user_memory[user_id].append({"role": "user", "content": user_message})

    # 為了避免對話太長導致浪費 Token，只保留最近的 5 次互動 (1次system + 最後4次對話)
    if len(user_memory[user_id]) > 5:
        user_memory[user_id] = [user_memory[user_id][0]] + user_memory[user_id][-4:]

    try:
        # 將整串帶有記憶的對話丟給 OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=user_memory[user_id]
        )
        
        # 取得 AI 回覆並加入記憶中，這樣它下次才知道自己說過什麼
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
