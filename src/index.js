// @hono/node-server: Hono를 Node.js 환경에서 실행하게 해주는 어댑터
import { serve } from "@hono/node-server";
// app.js에서 라우트가 정의된 Hono 앱을 가져옴
import app from "./app.js";

// 환경변수 PORT가 있으면 사용, 없으면 6666 사용
// Railway 같은 배포 환경에서는 PORT 환경변수를 자동으로 주입해줌
const port = process.env.PORT || 6666;

// 서버 시작 — fetch: app.fetch는 Hono 앱의 요청 처리 함수를 서버에 연결
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});
