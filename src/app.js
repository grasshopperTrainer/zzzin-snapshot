// Hono: 경량 웹 프레임워크 (Python의 FastAPI/Flask 같은 역할)
import { Hono } from "hono";
import { captureScreenshot } from "./screenshot.js";

// createApp: 의존성을 외부에서 주입받아 Hono 앱을 생성하는 팩토리 함수
// uploader를 인자로 받으므로, S3 / 로컬파일 / 메모리 등 자유롭게 교체 가능
// uploader 시그니처: (buffer, issueId) => Promise<string(url)>
export function createApp({ uploader }) {
  const app = new Hono();

  // GET /heartbeat — 서버가 살아있는지 확인하는 엔드포인트
  app.get("/heartbeat", (c) => {
    return c.json({ status: "ok" });
  });

  // POST /screenshot — 스크린샷 캡처 엔드포인트
  app.post("/screenshot", async (c) => {
    // 요청 바디에서 JSON 파싱 — c.req.json()은 await 필요
    const { issue_id, page_width, page_height } = await c.req.json();

    // 필수 파라미터 검증
    if (!issue_id || !page_width || !page_height) {
      return c.json({ error: "issue_id, page_width, page_height are required" }, 400);
    }

    try {
      // Puppeteer로 스크린샷 캡처 — 결과는 webp 이미지 버퍼
      const buffer = await captureScreenshot({
        issueId: issue_id,
        pageWidth: page_width,
        pageHeight: page_height,
      });

      // 주입된 uploader로 업로드 — S3든 로컬이든 같은 인터페이스
      const imageUrl = await uploader(buffer, issue_id);

      return c.json({ image_url: imageUrl });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });

  return app;
}
