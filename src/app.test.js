import { describe, it, expect, beforeAll } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./app.js";

// capturer가 scales 배열을 받아 버퍼 배열을 반환하도록 변경
const fakeCapturer = async ({ scales }) =>
  scales.map(() => Buffer.from("fake-image"));

const outputDir = join(import.meta.dirname, "../.test-output/app");
const app = createApp({ capturer: fakeCapturer });

beforeAll(async () => {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
});

describe("GET /health", () => {
  it("200 OK를 반환해야 한다", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  /*
   * 배포가 실제로 반영됐는지 밖에서 확인할 수 있어야 한다 — 릴리즈 워크플로우가
   * 성공했다는 것과 그 이미지가 돌고 있다는 것은 다른 사실이고, 종전에는 Actions
   * 로그를 뒤져야 알 수 있었다.
   */
  it("현재 버전을 함께 알려준다 — package.json 과 일치", async () => {
    const { version } = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    const res = await app.request("/health");
    expect((await res.json()).version).toBe(version);
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("POST /screenshot", () => {
  it("captures 배열로 요청하면 파일이 저장되어야 한다", async () => {
    const filepath = join(outputDir, "test.webp");

    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "http://example.com/page",
        selector: "[data-ready]",
        captures: [{ upload_url: filepath }],
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });

    const saved = await readFile(filepath);
    expect(saved).toEqual(Buffer.from("fake-image"));
  });

  it("멀티스케일 captures로 여러 파일이 저장되어야 한다", async () => {
    const path1x = join(outputDir, "multi-1x.webp");
    const path2x = join(outputDir, "multi-2x.webp");

    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "http://example.com/page",
        selector: "[data-ready]",
        captures: [
          { upload_url: path1x, device_scale_factor: 1 },
          { upload_url: path2x, device_scale_factor: 2 },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const saved1x = await readFile(path1x);
    const saved2x = await readFile(path2x);
    expect(saved1x).toEqual(Buffer.from("fake-image"));
    expect(saved2x).toEqual(Buffer.from("fake-image"));
  });

  it("필수 파라미터가 없으면 400을 반환해야 한다", async () => {
    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://example.com" }),
    });

    expect(res.status).toBe(400);
  });

  it("captures에 upload_url이 없으면 400을 반환해야 한다", async () => {
    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "http://example.com",
        selector: "[data-ready]",
        captures: [{ device_scale_factor: 2 }],
      }),
    });

    expect(res.status).toBe(400);
  });
});
