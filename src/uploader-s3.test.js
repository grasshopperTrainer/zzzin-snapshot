import { describe, it, expect, afterAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { S3Uploader } from "./uploader-s3.js";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// 테스트용 S3 설정 — 프로덕션 데이터와 분리된 prefix 사용
const testConfig = {
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  prefix: "test/thumbnails",
};

// S3 자격증명이 없으면 테스트 스킵
const hasCredentials = testConfig.bucket && testConfig.accessKeyId;
const describeS3 = hasCredentials ? describe : describe.skip;

// 테스트 후 S3에 올린 파일 정리용 키 목록
const uploadedKeys = [];

describeS3("S3Uploader", () => {
  const uploader = new S3Uploader(testConfig);

  // 테스트 끝나면 S3에서 테스트 파일 삭제
  afterAll(async () => {
    for (const key of uploadedKeys) {
      await uploader.s3.send(
        new DeleteObjectCommand({ Bucket: testConfig.bucket, Key: key })
      );
    }
  });

  it("이미지를 S3에 업로드하고 URL을 반환해야 한다", async () => {
    const buffer = await readFile(
      join(import.meta.dirname, "../test/fixtures/sample-1.webp")
    );

    const url = await uploader.upload(buffer, "test-issue-id");

    // 업로드된 키 기록 (정리용)
    uploadedKeys.push(`${testConfig.prefix}/test-issue-id.webp`);

    // URL 형식 검증
    expect(url).toBe(
      `https://${testConfig.bucket}.s3.${testConfig.region}.amazonaws.com/test/thumbnails/test-issue-id.webp`
    );

    // S3에서 다시 다운로드해서 원본과 바이트 단위로 일치하는지 확인
    const key = `${testConfig.prefix}/test-issue-id.webp`;
    const res = await uploader.s3.send(
      new GetObjectCommand({ Bucket: testConfig.bucket, Key: key })
    );
    // S3 응답의 Body는 스트림이므로 Buffer로 변환
    const downloaded = Buffer.from(await res.Body.transformToByteArray());
    expect(downloaded).toEqual(buffer);
  });
});
