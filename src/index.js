// config.js를 가장 먼저 import — 필수 환경변수가 없으면 여기서 즉시 에러
import config from "./config.js";
// @hono/node-server: Hono를 Node.js 환경에서 실행하게 해주는 어댑터
import { serve } from "@hono/node-server";
// 팩토리 함수로 앱 생성 — 부품(capturer, uploader)을 주입
import { createApp } from "./app.js";
import { capture } from "./capturer.js";
import { upload } from "./uploader.js";

const app = createApp({
  capturer: capture,
  uploader: upload,
});

// 서버 시작 — fetch: app.fetch는 Hono 앱의 요청 처리 함수를 서버에 연결
serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
