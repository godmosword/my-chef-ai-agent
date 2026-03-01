# 使用輕量級的 Python 3.11 環境
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 複製 requirements.txt 並安裝套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有程式碼到容器內
COPY . .

# Cloud Run 預設使用 8080 port
ENV PORT=8080

# 啟動指令
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
