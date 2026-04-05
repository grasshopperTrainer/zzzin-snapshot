// Hono: 경량 웹 프레임워크 (Python의 FastAPI/Flask 같은 역할)
import { Hono } from "hono";
import { captureScreenshot } from "./screenshot.js";
import { uploadScreenshot } from "./upload.js";

// Hono 앱 인스턴스 생성 (Flask의 app = Flask(__name__) 와 비슷)
const app = new Hono();

// GET /heartbeat — 서버가 살아있는지 확인하는 엔드포인트
// c는 Context 객체로, 요청(request)과 응답(response) 정보를 담고 있음
app.get("/heartbeat", (c) => {
  // c.json()은 JSON 응답을 반환 (자동으로 Content-Type: application/json 설정)
  return c.json({ status: "ok" });
});

// POST /screenshot — 스크린샷 캡처 엔드포인트
// README에 정의된 API 스펙대로 구현
app.post("/screenshot", async (c) => {
  // 요청 바디에서 JSON 파싱 — c.req.json()은 await 필요
  const { issue_id, page_width, page_height } = await c.req.json();

  // 필수 파라미터 검증
  if (!issue_id || !page_width || !page_height) {
    // c.json()의 두 번째 인자는 HTTP 상태 코드
    return c.json({ error: "issue_id, page_width, page_height are required" }, 400);
  }

  try {
    // Puppeteer로 스크린샷 캡처 — 결과는 webp 이미지 버퍼
    const buffer = await captureScreenshot({
      issueId: issue_id,
      pageWidth: page_width,
      pageHeight: page_height,
    });

    // S3에 업로드하고 공개 URL을 받아옴
    const imageUrl = await uploadScreenshot(buffer, issue_id);

    // README 스펙대로 { image_url } 반환
    return c.json({ image_url: imageUrl });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// 테스트에서 app을 import할 수 있도록 export
export default app;
