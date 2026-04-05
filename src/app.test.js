import { describe, it, expect, vi } from "vitest";
import { createApp } from "./app.js";

// screenshot.js만 mock — Puppeteer 없이 테스트하기 위함
vi.mock("./screenshot.js", () => ({
  captureScreenshot: vi.fn().mockResolvedValue(Buffer.from("fake-image")),
}));

// 가짜 uploader — mock 없이 직접 만든 테스트용 부품
// 실제 S3 대신 URL만 반환하는 단순 함수
const fakeUploader = async (buffer, issueId) =>
  `https://fake-bucket/thumbnails/${issueId}.webp`;

// 테스트용 앱에 가짜 uploader 주입
const app = createApp({ uploader: fakeUploader });

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
