import { describe, it, expect, beforeAll } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { LocalUploader } from "./uploader-local.js";

// 테스트용 픽스처 경로
const fixturesDir = join(import.meta.dirname, "../test/fixtures");
// 테스트용 출력 디렉토리 — 테스트 후 직접 확인 가능
const testDir = join(import.meta.dirname, "../.test-uploads");

// 테스트 전에 출력 디렉토리 초기화
beforeAll(async () => {
  await rm(testDir, { recursive: true, force: true });
  await mkdir(testDir, { recursive: true });
});

describe("LocalUploader", () => {
  it("이미지를 로컬 디렉토리에 저장해야 한다", async () => {
    const uploader = new LocalUploader(testDir);
    const buffer = await readFile(join(fixturesDir, "1.webp"));

    const filepath = await uploader.upload(buffer, "test-issue-id");

    // 저장된 파일을 다시 읽어서 원본과 바이트 단위로 일치하는지 확인
    const saved = await readFile(filepath);
    expect(saved).toEqual(buffer);
  });

  it("반환 경로가 issueId.webp 형식이어야 한다", async () => {
    const uploader = new LocalUploader(testDir);
    const buffer = await readFile(join(fixturesDir, "2.webp"));

    const filepath = await uploader.upload(buffer, "my-uuid");

    expect(filepath).toBe(join(testDir, "my-uuid.webp"));
  });
});
