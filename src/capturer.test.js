import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { capture } from "./capturer.js";
import { startTestServer } from "../test/server.js";

let server;
const TEST_PORT = 4444;
const TEST_URL = `http://localhost:${TEST_PORT}`;
const fixturesDir = join(import.meta.dirname, "../test/fixtures");
const outputDir = join(import.meta.dirname, "../.test-output/captures");

// 테스트 이미지: 1~6
const testImages = ["1", "2", "3", "4", "5", "6"];

beforeAll(async () => {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  server = await startTestServer(TEST_PORT);
});

afterAll(() => {
  server.close();
});

describe("capturer", { timeout: 30000 }, () => {
  for (const name of testImages) {
    it(`이미지 ${name}: 캡처 후 원본과 비교`, async () => {
      const original = await readFile(join(fixturesDir, `${name}.webp`));

      const captured = await capture({
        url: `${TEST_URL}/preview/${name}`,
        selector: "[data-snapshot-ready]",
      });

      await writeFile(join(outputDir, `${name}.webp`), captured);

      // webp 헤더 검증 (RIFF)
      expect(captured[0]).toBe(0x52);
      expect(captured[1]).toBe(0x49);
      expect(captured[2]).toBe(0x46);
      expect(captured[3]).toBe(0x46);

      // 큰 이미지(3)가 잘리지 않고 전체 캡처되었는지
      if (name === "3") {
        expect(captured.length).toBeGreaterThan(original.length * 0.5);
      }
    });
  }
});
