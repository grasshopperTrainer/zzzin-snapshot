// Hono: 경량 웹 프레임워크 (Python의 FastAPI/Flask 같은 역할)
import { Hono } from "hono";

// Hono 앱 인스턴스 생성 (Flask의 app = Flask(__name__) 와 비슷)
const app = new Hono();

// GET /heartbeat — 서버가 살아있는지 확인하는 엔드포인트
// c는 Context 객체로, 요청(request)과 응답(response) 정보를 담고 있음
app.get("/heartbeat", (c) => {
  // c.json()은 JSON 응답을 반환 (자동으로 Content-Type: application/json 설정)
  return c.json({ status: "ok" });
});

// 테스트에서 app을 import할 수 있도록 export
export default app;
