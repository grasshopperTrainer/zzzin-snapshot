import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { capture } from "./capturer.js";
import { startTestServer } from "../test/server.js";

let server;
const TEST_PORT = 4444;
const TEST_URL = `http://localhost:${TEST_PORT}`;
const fixturesDir = join(import.meta.dirname, "../test/fixtures");
const outputDir = join(import.meta.dirname, "../.test-output/captures");

const testImages = ["1", "2", "3", "4", "5", "6"];

beforeAll(async () => {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  server = await startTestServer(TEST_PORT);
});

afterAll(() => {
  server.close();
});

// 두 raw 버퍼의 픽셀 유사도 계산 (0~1)
function pixelSimilarity(dataA, dataB) {
  if (dataA.length !== dataB.length) return 0;
  let match = 0;
  for (let i = 0; i < dataA.length; i++) {
    if (Math.abs(dataA[i] - dataB[i]) <= 5) match++;
  }
  return match / dataA.length;
}

describe("capturer", { timeout: 30000 }, () => {
  for (const name of testImages) {
    it(`이미지 ${name}: 캡처 크기와 내용이 원본과 일치해야 한다`, async () => {
      const original = await readFile(join(fixturesDir, `${name}.webp`));
      const originalMeta = await sharp(original).metadata();

      const captured = await capture({
        url: `${TEST_URL}/preview/${name}`,
        selector: "[data-snapshot-ready]",
      });

      await writeFile(join(outputDir, `${name}.webp`), captured);
      const capturedMeta = await sharp(captured).metadata();

      expect(capturedMeta.width).toBe(originalMeta.width);
      expect(capturedMeta.height).toBe(originalMeta.height);

      const [rawOrig, rawCap] = await Promise.all([
        sharp(original).raw().ensureAlpha().toBuffer(),
        sharp(captured).raw().ensureAlpha().toBuffer(),
      ]);
      expect(pixelSimilarity(rawOrig, rawCap)).toBeGreaterThan(0.9);
    });
  }

  it("tiled: 잘림 방지 — 캡처된 우하단이 좌상단과 일치해야 한다", async () => {
    const captured = await capture({
      url: `${TEST_URL}/preview/tiled`,
      selector: "[data-snapshot-ready]",
    });

    await writeFile(join(outputDir, "tiled.webp"), captured);

    const meta = await sharp(captured).metadata();
    const halfW = Math.floor(meta.width / 2);
    const halfH = Math.floor(meta.height / 2);

    // 좌상단 사분면 추출
    const topLeft = await sharp(captured)
      .extract({ left: 0, top: 0, width: halfW, height: halfH })
      .raw().ensureAlpha().toBuffer();

    // 우하단 사분면 추출
    const bottomRight = await sharp(captured)
      .extract({ left: halfW, top: halfH, width: halfW, height: halfH })
      .raw().ensureAlpha().toBuffer();

    // 잘렸으면 우하단이 빈 영역이므로 유사도가 크게 떨어짐 (<0.5)
    // webp 압축 아티팩트로 완벽 일치는 불가하므로 0.85 기준
    const sim = pixelSimilarity(topLeft, bottomRight);
    expect(sim).toBeGreaterThan(0.85);
  });
});
