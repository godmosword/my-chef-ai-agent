# 米其林職人大腦 - GCP Cloud Run
FROM python:3.12-slim

WORKDIR /app

# 僅安裝正式依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Cloud Run 會注入 PORT 環境變數
ENV PORT=8080
EXPOSE 8080

CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT
