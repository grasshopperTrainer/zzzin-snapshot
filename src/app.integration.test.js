import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { capture } from "./capturer.js";
import { startTestServer } from "../test/server.js";

const rootDir = join(import.meta.dirname, "..");
const outputDir = join(rootDir, ".test-output/integration");

// 테스트용 HTML 서버 (캡처 대상)
let htmlServer;
const HTML_PORT = 4445;

// 실제 snapshot 서버
let appServer;
const APP_PORT = 5555;

beforeAll(async () => {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  htmlServer = await startTestServer(HTML_PORT);

  const app = createApp({ capturer: capture });
  appServer = await new Promise((resolve) => {
    const s = serve({ fetch: app.fetch, port: APP_PORT }, () => resolve(s));
  });
});

afterAll(() => {
  htmlServer.close();
  appServer.close();
});

describe("POST /screenshot 통합 테스트", { timeout: 30000 }, () => {
  it("캡처 후 로컬 파일로 저장되어야 한다", async () => {
    const filepath = join(outputDir, "integration.webp");

    const res = await fetch(`http://localhost:${APP_PORT}/screenshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:${HTML_PORT}/preview/1`,
        selector: "[data-snapshot-ready]",
        upload_url: filepath,
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });

    // 저장된 파일을 읽어서 원본 픽스처와 비교
    const saved = await readFile(filepath);
    const original = await readFile(join(rootDir, "test/fixtures/1.webp"));

    // webp 헤더 검증
    expect(saved[0]).toBe(0x52); // R
    expect(saved[1]).toBe(0x49); // I

    // 캡처 이미지가 원본과 유사한 크기인지 확인
    // (webp 재압축으로 바이트 동일하진 않지만 원본의 50% 이상이어야 함)
    expect(saved.length).toBeGreaterThan(original.length * 0.5);
  });
});
