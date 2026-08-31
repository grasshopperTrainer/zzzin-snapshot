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

      const [captured] = await capture({
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
    const [captured] = await capture({
      url: `${TEST_URL}/preview/tiled`,
      selector: "[data-snapshot-ready]",
    });

    await writeFile(join(outputDir, "tiled.webp"), captured);

    const meta = await sharp(captured).metadata();
    const halfW = Math.floor(meta.width / 2);
    const halfH = Math.floor(meta.height / 2);

    const topLeft = await sharp(captured)
      .extract({ left: 0, top: 0, width: halfW, height: halfH })
      .raw().ensureAlpha().toBuffer();

    const bottomRight = await sharp(captured)
      .extract({ left: halfW, top: halfH, width: halfW, height: halfH })
      .raw().ensureAlpha().toBuffer();

    const sim = pixelSimilarity(topLeft, bottomRight);
    expect(sim).toBeGreaterThan(0.85);
  });

  /**
   * **찍는 환경에서 정착한 결과여야 한다.**
   *
   * capturer 는 문서 크기를 모르니 일단 기본 뷰포트로 열고, ready 를 본 뒤 요소 크기로
   * 뷰포트를 바꿔 찍었다. 그런데 페이지의 "다 그렸다" 판정은 **그 시점의 뷰포트에서만**
   * 유효하다. 뷰포트를 바꾸면 리플로우가 새로 일어나고, 그때부터 받아야 하는 이미지가
   * 생긴다 — 그것을 아무도 기다리지 않았다.
   *
   * 실제 증상: 썸네일 아래쪽 이미지가 안 그려진 채로 박혔다. 1x 를 찍고 재정착 없이
   * deviceScaleFactor 만 바꿔 2x 를 찍는 것도 같은 결함이다.
   *
   * 픽스처는 좁을 때 빨강, 넓어지면 파랑(늦게 도착)을 쓴다. 최종 뷰포트는 1200 이므로
   * **파랑이 찍혀야 한다.** 빨강이면 보증되지 않은 환경에서 찍은 것이다.
   */
  it("뷰포트를 바꾼 뒤에는 다시 정착을 기다린 후 찍는다", async () => {
    const [captured] = await capture({
      url: `${TEST_URL}/responsive`,
      selector: "[data-snapshot-ready]",
    });

    await writeFile(join(outputDir, "responsive.webp"), captured);

    const { data } = await sharp(captured)
      .resize(1, 1, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const [r, g, b] = data;

    // 파랑(#0000ff) 이어야 한다 — 빨강이면 넓히기 전 상태가 박힌 것.
    expect({ r, g, b }).toMatchObject({ r: expect.any(Number) });
    expect(b).toBeGreaterThan(200);
    expect(r).toBeLessThan(60);
  });

  it("멀티스케일: 각 배율에서도 정착을 기다린 뒤 찍는다", async () => {
    const [buf1x, buf2x] = await capture({
      url: `${TEST_URL}/responsive`,
      selector: "[data-snapshot-ready]",
      scales: [{ deviceScaleFactor: 1 }, { deviceScaleFactor: 2 }],
    });

    for (const [name, buf] of [["responsive-1x", buf1x], ["responsive-2x", buf2x]]) {
      await writeFile(join(outputDir, `${name}.webp`), buf);
      const { data } = await sharp(buf).resize(1, 1, { fit: "fill" }).raw()
        .toBuffer({ resolveWithObject: true });
      expect(data[2], `${name} 은 파랑이어야 한다`).toBeGreaterThan(200);
      expect(data[0], `${name} 은 빨강이면 안 된다`).toBeLessThan(60);
    }
  });

  it("멀티스케일: 한 페이지에서 1x, 2x를 동시 캡처", async () => {
    const original = await readFile(join(fixturesDir, "1.webp"));
    const originalMeta = await sharp(original).metadata();

    const [buf1x, buf2x] = await capture({
      url: `${TEST_URL}/preview/1`,
      selector: "[data-snapshot-ready]",
      scales: [{ deviceScaleFactor: 1 }, { deviceScaleFactor: 2 }],
    });

    await writeFile(join(outputDir, "1-1x.webp"), buf1x);
    await writeFile(join(outputDir, "1-2x.webp"), buf2x);

    const meta1x = await sharp(buf1x).metadata();
    const meta2x = await sharp(buf2x).metadata();

    // 1x는 원본과 같은 크기
    expect(meta1x.width).toBe(originalMeta.width);
    expect(meta1x.height).toBe(originalMeta.height);

    // 2x는 원본의 2배
    expect(meta2x.width).toBe(originalMeta.width * 2);
    expect(meta2x.height).toBe(originalMeta.height * 2);
  });
});
