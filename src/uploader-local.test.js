import { describe, it, expect, afterAll } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { LocalUploader } from "./uploader-local.js";

// 테스트용 임시 디렉토리
const testDir = join(import.meta.dirname, "../.test-uploads");

// 테스트 끝나면 임시 디렉토리 삭제
afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("LocalUploader", () => {
  it("파일을 로컬 디렉토리에 저장해야 한다", async () => {
    const uploader = new LocalUploader(testDir);
    const buffer = Buffer.from("test-image-data");

    const filepath = await uploader.upload(buffer, "test-issue-id");

    // 반환된 경로에 실제 파일이 존재하는지 확인
    const saved = await readFile(filepath);
    expect(saved).toEqual(buffer);
  });

  it("반환 경로가 issueId.webp 형식이어야 한다", async () => {
    const uploader = new LocalUploader(testDir);
    const filepath = await uploader.upload(Buffer.from("data"), "my-uuid");

    expect(filepath).toBe(join(testDir, "my-uuid.webp"));
  });
});
