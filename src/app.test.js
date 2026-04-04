// vitest에서 테스트 함수 import
// describe: 테스트 그룹 묶기, it: 개별 테스트, expect: 검증
import { describe, it, expect } from "vitest";
import app from "./app.js";

describe("GET /heartbeat", () => {
  it("200 OK와 status: ok를 반환해야 한다", async () => {
    // app.request()는 Hono가 제공하는 테스트 헬퍼
    // 실제 서버를 띄우지 않고 HTTP 요청을 시뮬레이션함
    const res = await app.request("/heartbeat");

    // HTTP 상태 코드 검증
    expect(res.status).toBe(200);

    // 응답 바디를 JSON으로 파싱하여 검증
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
