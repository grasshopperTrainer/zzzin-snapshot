FROM node:24-slim

# Puppeteer가 사용할 Chromium 의존 라이브러리 설치
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto-cjk \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Puppeteer가 내장 Chromium 대신 시스템 Chromium 사용
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ src/

CMD ["node", "src/index.js"]
