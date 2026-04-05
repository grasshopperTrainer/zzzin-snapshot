import { describe, it, expect, afterAll } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { LocalUploader } from "./uploader-local.js";

// 테스트용 픽스처 경로
const fixturesDir = join(import.meta.dirname, "../test/fixtures");
// 테스트용 임시 출력 디렉토리
const testDir = join(import.meta.dirname, "../.test-uploads");

// 테스트 끝나면 임시 디렉토리 삭제
afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("LocalUploader", () => {
  it("이미지를 로컬 디렉토리에 저장해야 한다", async () => {
    const uploader = new LocalUploader(testDir);
    // 실제 webp 이미지 파일을 읽어서 버퍼로 전달
    const buffer = await readFile(join(fixturesDir, "sample-1.webp"));

    const filepath = await uploader.upload(buffer, "test-issue-id");

    // 저장된 파일을 다시 읽어서 원본과 바이트 단위로 일치하는지 확인
    const saved = await readFile(filepath);
    expect(saved).toEqual(buffer);
  });

  it("반환 경로가 issueId.webp 형식이어야 한다", async () => {
    const uploader = new LocalUploader(testDir);
    const buffer = await readFile(join(fixturesDir, "sample-2.webp"));

    const filepath = await uploader.upload(buffer, "my-uuid");

    expect(filepath).toBe(join(testDir, "my-uuid.webp"));
  });
});
