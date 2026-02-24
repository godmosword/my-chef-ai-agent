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
    return {"status": "ok", "message": "私人智慧廚房代理人伺服器運行中 (v3.0 質感升級版)"}

# 環境變數設定
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Supabase 設定 (加入嚴格防呆：確保變數存在且非空字串才初始化)
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
    """採用高質感、北歐扁平化設計風格的 Flex Message"""
    
    def format_list_to_components(data, icon=None, color="#4A4A4A"):
        """將條列文字轉換為扁平化清單，具備細膩的排版對齊"""
        if not data: return []
        items = data if isinstance(data, list) else str(data).split('\n')
        components = []
        for item in items:
            clean_item = item.strip().lstrip('-').lstrip('123456789.').strip()
            if not clean_item: continue
            
            # 判斷是否包含報價，進行精確的左右排版
            if any(sep in clean_item for sep in [":", "：", " - "]):
                # 統一分隔符
                parts = clean_item.replace("：", ":").replace(" - ", ":").split(":", 1)
                name, detail = parts[0].strip(), parts[1].strip()
                components.append({
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "md",
                    "contents": [
                        {"type": "text", "text": f"{icon + ' ' if icon else ''}{name}", "size": "sm", "color": color, "flex": 4, "wrap": True},
                        {"type": "text", "text": detail, "size": "sm", "color": "#111111", "align": "end", "flex": 2, "weight": "bold"}
                    ]
                })
            else:
                components.append({
                    "type": "text",
                    "text": f"{icon + ' ' if icon else '· '}{clean_item}",
                    "size": "sm",
                    "color": color,
                    "wrap": True,
                    "margin": "sm"
                })
        return components

    # 視覺組件生成
    ingredient_rows = format_list_to_components(ingredients, icon=None, color="#666666")
    shopping_rows = format_list_to_components(shopping_list, icon="○", color="#333333")

    bubble_content = {
      "type": "bubble",
      "size": "giga",
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "none",
        "backgroundColor": "#FFFFFF",
        "contents": [
          # 頂部主題裝飾線 (極簡細線)
          {"type": "box", "layout": "vertical", "height": "4px", "backgroundColor": "#334155", "contents": []},
          
          # 標題區塊
          {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "xxl",
            "paddingBottom": "lg",
            "contents": [
              {"type": "text", "text": str(theme or "CHEF'S SELECTION").upper(), "size": "xs", "color": "#64748B", "weight": "bold", "letterSpacing": "2px"},
              {"type": "text", "text": str(recipe_name), "size": "xxl", "weight": "bold", "color": "#0F172A", "margin": "md", "wrap": True}
            ]
          },

          # 分類採買區塊 (扁平化卡片)
          {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "xxl",
            "paddingTop": "none",
            "contents": [
              {"type": "text", "text": "SHOPPING LIST", "size": "xs", "weight": "bold", "color": "#94A3B8", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": shopping_rows}
            ]
          },

          # 食材與報價 (柔和底色區塊)
          {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#F8FAFC",
            "paddingAll": "xxl",
            "spacing": "md",
            "contents": [
              {"type": "text", "text": "INGREDIENTS", "size": "xs", "weight": "bold", "color": "#94A3B8", "letterSpacing": "1px"},
              {"type": "box", "layout": "vertical", "spacing": "sm", "contents": ingredient_rows},
              {"type": "separator", "margin": "xl", "color": "#E2E8F0"},
              {
                "type": "box",
                "layout": "horizontal",
                "margin": "lg",
                "contents": [
                  {"type": "text", "text": "ESTIMATED TOTAL", "size": "xs", "weight": "bold", "color": "#64748B", "flex": 0, "gravity": "center"},
                  {"type": "text", "text": f"NT$ {estimated_total_cost}", "size": "xl", "weight": "bold", "color": "#0F172A", "align": "end", "gravity": "center"}
                ]
              }
            ]
          },

          # 步驟區塊
          {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "xxl",
            "contents": [
              {"type": "text", "text": "COOKING STEPS", "size": "xs", "weight": "bold", "color": "#94A3B8", "letterSpacing": "1px"},
              {"type": "text", "text": str(steps), "margin": "lg", "size": "sm", "color": "#475569", "wrap": True, "lineSpacing": "6px"}
            ]
          }
        ]
      },
      # 底部互動按鈕 (極簡透明感)
      "footer": {
        "type": "box",
        "layout": "horizontal",
        "spacing": "lg",
        "paddingAll": "xl",
        "paddingTop": "none",
        "contents": [
          {
            "type": "button",
            "style": "secondary",
            "height": "md",
            "color": "#F1F5F9",
            "action": {"type": "message", "label": "REFRESH", "text": "換一道菜"}
          },
          {
            "type": "button",
            "style": "primary",
            "height": "md",
            "color": "#334155",
            "action": {"type": "message", "label": "ANOTHER ONE", "text": "再來一菜"}
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
    
    # 系統提示詞：升級為高質感智慧代理人語氣，並嚴格要求輸出格式
    system_prompt = (
        "你是一個專業的『私人智慧廚房代理人』。請根據使用者的需求推薦一道合適的料理。"
        "【重要規則】：如果需求模糊（例如：推薦晚餐、肚子餓），請自動假設為『2到3人份家常菜、預算約200-300元』。"
        "如果有對話紀錄，請根據前文提供『不同』的食譜選項，不要重複。"
        "【精準報價要求】：請參考近期真實物價，給出符合行情的精準估價。食材報價請統一使用『食材名稱 : 價格』的格式，例如『高麗菜 : 80元』。"
        "請嚴格以 JSON 格式回傳以下六個欄位："
        "'theme', 'recipe_name', 'ingredients' (食材與預估價格，請條列), 'steps' (標示 1. 2. 3.), 'shopping_list' (生鮮/乾貨分類), 'estimated_total_cost' (預估總花費數字)。"
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
        # 防呆機制：錯誤發生時給予友善回應
        reply_message = TextMessage(text="👨‍🍳 抱歉，系統正在整理最棒的食譜，請換個說法再試一次好嗎？")

    # 統一發送回應
    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_bot_api.reply_message(
            ReplyMessageRequest(reply_token=event.reply_token, messages=[reply_message])
        )
