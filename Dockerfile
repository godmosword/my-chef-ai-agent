# 使用輕量級的 Python 3.11 環境
FROM python:3.11-slim

# 安裝 Playwright Chromium 所需系統依賴
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    libcairo2 libatspi2.0-0 libwayland-client0 \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製 requirements.txt 並安裝套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 安裝 Playwright Chromium 瀏覽器
RUN python -m playwright install chromium

# 複製所有程式碼到容器內
COPY . .

# Cloud Run 預設使用 8080 port
ENV PORT=8080

# 啟動指令
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
