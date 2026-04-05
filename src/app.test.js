// vitest에서 테스트 함수 import
// describe: 테스트 그룹 묶기, it: 개별 테스트, expect: 검증
// vi: vitest의 mock 유틸리티 (함수를 가짜로 대체하는 도구)
import { describe, it, expect, vi } from "vitest";

// vi.mock()으로 모듈을 가짜로 대체
// 실제 Puppeteer, S3를 띄우지 않고 테스트하기 위함
vi.mock("./screenshot.js", () => ({
  captureScreenshot: vi.fn().mockResolvedValue(Buffer.from("fake-image")),
}));

vi.mock("./upload.js", () => ({
  uploadScreenshot: vi
    .fn()
    .mockResolvedValue("https://bucket.s3.region.amazonaws.com/thumbnails/test-uuid.webp"),
}));

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

describe("POST /screenshot", () => {
  it("정상 요청 시 image_url을 반환해야 한다", async () => {
    // app.request()에 두 번째 인자로 요청 옵션을 전달
    // method, headers, body를 지정 — fetch API와 동일한 인터페이스
    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issue_id: "test-uuid",
        page_width: 1000,
        page_height: 1400,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // S3 URL이 반환되는지 확인
    expect(body.image_url).toBe(
      "https://bucket.s3.region.amazonaws.com/thumbnails/test-uuid.webp"
    );
  });

  it("필수 파라미터가 없으면 400을 반환해야 한다", async () => {
    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // issue_id만 보내고 나머지 누락
      body: JSON.stringify({ issue_id: "test-uuid" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
