import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { upload } from "./upload.js";
import { startTestServer } from "../test/server.js";

const fixturesDir = join(import.meta.dirname, "../test/fixtures");
const outputDir = join(import.meta.dirname, "../.test-output/upload");
const putOutputDir = join(import.meta.dirname, "../.test-output/put");

let server;
const TEST_PORT = 4446;

beforeAll(async () => {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await rm(putOutputDir, { recursive: true, force: true });
  server = await startTestServer(TEST_PORT);
});

afterAll(() => {
  server.close();
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

describe("upload (HTTP PUT)", () => {
  it("HTTP URL로 PUT하고 서버가 받은 데이터가 원본과 일치해야 한다", async () => {
    const buffer = await readFile(join(fixturesDir, "1.webp"));

    await upload(buffer, `http://localhost:${TEST_PORT}/upload/put-test.webp`);

    // 테스트 서버가 저장한 파일을 읽어서 원본과 비교
    const saved = await readFile(join(putOutputDir, "put-test.webp"));
    expect(saved).toEqual(buffer);
  });
});
