import { Hono } from "hono";
import { upload } from "./upload.js";

// createApp: capturer를 주입받아 Hono 앱을 생성하는 팩토리 함수
// capturer: ({ url, selector }) => Promise<Buffer>
export function createApp({ capturer }) {
  const app = new Hono();

  app.get("/heartbeat", (c) => {
    return c.json({ status: "ok" });
  });

  // POST /screenshot
  // url: 캡처할 페이지 주소
  // selector: 캡처할 요소의 CSS 셀렉터
  // upload_url: presigned URL 또는 로컬 파일 경로 (디버깅용)
  app.post("/screenshot", async (c) => {
    const { url, selector, upload_url } = await c.req.json();

    if (!url || !selector || !upload_url) {
      return c.json({ error: "url, selector, upload_url are required" }, 400);
    }

    try {
      const buffer = await capturer({ url, selector });
      await upload(buffer, upload_url);
      return c.json({ status: "ok" });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });

  return app;
}
