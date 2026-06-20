FROM node:20-bullseye-slim

WORKDIR /app

# Cloudflare CLI (wrangler) や Firebase CLI を使うため、Nodeの環境と一緒にPython (Pythonスクリプト用) を入れる
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    && rm -rf /var/lib/apt/lists/*

# グローバルに firebase-tools と wrangler をインストール
RUN npm install -g firebase-tools wrangler

# Python パッケージ管理用に venv を作成して必要なライブラリを追加 (R2へのアップロードスクリプト等向け)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install boto3 mutagen chardet Flask

COPY package*.json ./
RUN npm install

EXPOSE 5173

# コンテナ起動時はViteサーバーを自動起動
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
