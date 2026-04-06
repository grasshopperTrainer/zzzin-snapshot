import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { capture } from "./capturer.js";
import { startTestServer } from "../test/server.js";

const rootDir = join(import.meta.dirname, "..");
const outputDir = join(rootDir, ".test-output/integration");

let htmlServer;
const HTML_PORT = 4445;

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
  it("멀티스케일 캡처 후 로컬 파일로 저장되어야 한다", async () => {
    const path1x = join(outputDir, "integration-1x.webp");
    const path2x = join(outputDir, "integration-2x.webp");

    const res = await fetch(`http://localhost:${APP_PORT}/screenshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `http://localhost:${HTML_PORT}/preview/1`,
        selector: "[data-snapshot-ready]",
        captures: [
          { upload_url: path1x, device_scale_factor: 1 },
          { upload_url: path2x, device_scale_factor: 2 },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });

    const saved1x = await readFile(path1x);
    const saved2x = await readFile(path2x);

    // webp 헤더 검증
    expect(saved1x[0]).toBe(0x52);
    expect(saved2x[0]).toBe(0x52);

    // 두 파일 모두 저장됨
    expect(saved1x.length).toBeGreaterThan(0);
    expect(saved2x.length).toBeGreaterThan(0);

    // 2x가 1x보다 커야 함 (더 많은 픽셀)
    expect(saved2x.length).toBeGreaterThan(saved1x.length);
  });
});
