import { describe, it, expect } from "vitest";
import { createApp } from "./app.js";

// 가짜 부품들 — mock 프레임워크 없이 직접 만든 단순 함수
const fakeCapturer = async () => Buffer.from("fake-image");
const fakeUploader = async (buffer, issueId) =>
  `https://fake-bucket/thumbnails/${issueId}.webp`;

// 테스트용 앱에 가짜 부품 주입 — Puppeteer도 S3도 필요 없음
const app = createApp({ capturer: fakeCapturer, uploader: fakeUploader });

describe("GET /heartbeat", () => {
  it("200 OK와 status: ok를 반환해야 한다", async () => {
    const res = await app.request("/heartbeat");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});

describe("POST /screenshot", () => {
  it("정상 요청 시 image_url을 반환해야 한다", async () => {
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
    expect(body.image_url).toBe("https://fake-bucket/thumbnails/test-uuid.webp");
  });

  it("필수 파라미터가 없으면 400을 반환해야 한다", async () => {
    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue_id: "test-uuid" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
