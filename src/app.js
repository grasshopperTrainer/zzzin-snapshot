import { Hono } from "hono";
import { logger } from "hono/logger";
import { upload } from "./upload.js";

// createApp: capturer를 주입받아 Hono 앱을 생성하는 팩토리 함수
export function createApp({ capturer }) {
  const app = new Hono();

  // 전체 요청/응답 로그
  app.use("*", logger());

  app.get("/heartbeat", (c) => {
    return c.json({ status: "ok" });
  });

  app.post("/screenshot", async (c) => {
    const { url, selector, upload_url, timeout = 30000 } = await c.req.json();

    if (!url || !selector || !upload_url) {
      console.log(`[screenshot] 400 — missing params`);
      return c.json({ error: "url, selector, upload_url are required" }, 400);
    }

    console.log(`[screenshot] start — url=${url} selector=${selector}`);

    try {
      const buffer = await capturer({ url, selector, timeout });
      console.log(`[screenshot] captured — ${buffer.length} bytes`);

      await upload(buffer, upload_url);
      const isHttp = upload_url.startsWith("http");
      const dest = isHttp ? new URL(upload_url).pathname : upload_url;
      console.log(`[screenshot] uploaded — [${isHttp ? "HTTP" : "local"}] ${dest}`);

      return c.json({ status: "ok" });
    } catch (err) {
      console.error(`[screenshot] error — ${err.message}`);
      return c.json({ error: err.message }, 500);
    }
  });

  return app;
}
