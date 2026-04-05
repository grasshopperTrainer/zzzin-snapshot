// Hono: 경량 웹 프레임워크 (Python의 FastAPI/Flask 같은 역할)
import { Hono } from "hono";

// createApp: 의존성을 외부에서 주입받아 Hono 앱을 생성하는 팩토리 함수
// capturer: (opts) => Promise<Buffer> — 스크린샷 캡처 부품
// uploader: Uploader 인스턴스 — upload(buffer, issueId) 메서드를 가진 객체
export function createApp({ capturer, uploader }) {
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
      // 주입된 capturer로 스크린샷 캡처
      const buffer = await capturer({
        issueId: issue_id,
        pageWidth: page_width,
        pageHeight: page_height,
      });

      // 주입된 uploader로 업로드
      const imageUrl = await uploader.upload(buffer, issue_id);

      return c.json({ image_url: imageUrl });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });

  return app;
}
