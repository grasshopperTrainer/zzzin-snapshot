import { describe, it, expect, beforeAll } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createApp } from "./app.js";

const fakeCapturer = async () => Buffer.from("fake-image");
const outputDir = join(import.meta.dirname, "../.test-output/app");

const app = createApp({ capturer: fakeCapturer });

beforeAll(async () => {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
});

describe("GET /heartbeat", () => {
  it("200 OK를 반환해야 한다", async () => {
    const res = await app.request("/heartbeat");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("POST /screenshot", () => {
  it("로컬 경로로 upload_url을 주면 파일이 저장되어야 한다", async () => {
    const filepath = join(outputDir, "test.webp");

    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "http://example.com/page",
        selector: "[data-ready]",
        upload_url: filepath,
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });

    const saved = await readFile(filepath);
    expect(saved).toEqual(Buffer.from("fake-image"));
  });

  it("필수 파라미터가 없으면 400을 반환해야 한다", async () => {
    const res = await app.request("/screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://example.com" }),
    });

    expect(res.status).toBe(400);
  });
});
