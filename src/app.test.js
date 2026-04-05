import { describe, it, expect } from "vitest";
import { createApp } from "./app.js";
import { Uploader } from "./uploader.js";

// 가짜 업로더 — Uploader를 상속해서 테스트용 구현
class FakeUploader extends Uploader {
  async upload(buffer, issueId) {
    return `https://fake-bucket/thumbnails/${issueId}.webp`;
  }
}

// 가짜 capturer — 단순 함수
const fakeCapturer = async () => Buffer.from("fake-image");

// 테스트용 앱에 가짜 부품 주입
const app = createApp({ capturer: fakeCapturer, uploader: new FakeUploader() });

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
