import { describe, it, expect, beforeAll } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { upload } from "./upload.js";

const fixturesDir = join(import.meta.dirname, "../test/fixtures");
const outputDir = join(import.meta.dirname, "../.test-output/upload");

beforeAll(async () => {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
});

describe("upload (로컬 경로)", () => {
  it("파일을 저장하고 원본과 일치해야 한다", async () => {
    const buffer = await readFile(join(fixturesDir, "1.webp"));
    const filepath = join(outputDir, "upload-test.webp");

    await upload(buffer, filepath);

    const saved = await readFile(filepath);
    expect(saved).toEqual(buffer);
  });

  it("중간 디렉토리가 없어도 자동 생성해야 한다", async () => {
    const buffer = await readFile(join(fixturesDir, "2.webp"));
    const filepath = join(outputDir, "nested/dir/test.webp");

    await upload(buffer, filepath);

    const saved = await readFile(filepath);
    expect(saved).toEqual(buffer);
  });
});
