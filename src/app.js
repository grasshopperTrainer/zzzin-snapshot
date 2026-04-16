import { Hono } from "hono";
import { logger } from "hono/logger";
import { upload } from "./upload.js";

export function createApp({ capturer }) {
  const app = new Hono();

  app.use("*", logger());

  app.get("/heartbeat", (c) => {
    return c.json({ status: "ok" });
  });

  // POST /screenshot
  // url: 캡처할 페이지 주소
  // selector: 캡처할 요소의 CSS 셀렉터
  // captures: [{ upload_url, device_scale_factor }] — 캡처 목록
  // timeout: 셀렉터 대기 시간 ms (기본 30000)
  app.post("/screenshot", async (c) => {
    const { url, selector, captures, timeout = 30000 } = await c.req.json();

    if (!url || !selector || !captures || captures.length === 0) {
      console.log(`[screenshot] 400 — missing params`);
      return c.json({ error: "url, selector, captures are required" }, 400);
    }

    // captures의 각 항목에 upload_url이 있는지 검증
    for (const cap of captures) {
      if (!cap.upload_url) {
        console.log(`[screenshot] 400 — capture missing upload_url`);
        return c.json({ error: "each capture must have upload_url" }, 400);
      }
    }

    console.log(`[screenshot] start — url=${url} selector=${selector} scales=${captures.length}`);
    const startTime = Date.now();

    try {
      const warnings = [];

      // 한 페이지에서 여러 스케일로 캡처
      const scales = captures.map((cap) => ({
        deviceScaleFactor: cap.device_scale_factor || 1,
      }));
      const captureStart = Date.now();
      const buffers = await capturer({ url, selector, timeout, scales });
      console.log(`[screenshot] capture done — ${Date.now() - captureStart}ms`);

      // 각 캡처 결과를 업로드
      for (let i = 0; i < captures.length; i++) {
        const { upload_url } = captures[i];
        const buffer = buffers[i];
        const scale = scales[i].deviceScaleFactor;

        const isHttp = upload_url.startsWith("http");
        const dest = isHttp ? new URL(upload_url).pathname : upload_url;

        // 확장자가 .webp가 아니면 warning
        if (!dest.endsWith(".webp")) {
          console.warn(`[screenshot] warning — EXTENSION_MISMATCH: ${dest}`);
          warnings.push(`EXTENSION_MISMATCH: ${dest}`);
        }

        await upload(buffer, upload_url);
        console.log(`[screenshot] uploaded — [${isHttp ? "HTTP" : "local"}] ${dest} (${scale}x, ${buffer.length} bytes)`);
      }

      console.log(`[screenshot] done — total ${Date.now() - startTime}ms`);

      const response = { status: "ok" };
      if (warnings.length > 0) response.warnings = warnings;
      return c.json(response);
    } catch (err) {
      console.error(`[screenshot] error — ${err.message}`);
      return c.json({ error: err.message }, 500);
    }
  });

  return app;
}
