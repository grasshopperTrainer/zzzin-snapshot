// node:fs/promises — 파일 시스템 비동기 API
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Uploader } from "./uploader.js";

// LocalUploader: 로컬 디렉토리에 파일을 저장하는 업로더
// 개발/테스트 환경에서 S3 없이 동작 확인할 때 사용
export class LocalUploader extends Uploader {
  // dir: 파일을 저장할 디렉토리 경로
  constructor(dir) {
    super();
    this.dir = dir;
  }

  async upload(buffer, issueId) {
    // 디렉토리가 없으면 생성 — recursive: true면 중간 경로도 자동 생성
    await mkdir(this.dir, { recursive: true });

    const filename = `${issueId}.webp`;
    const filepath = join(this.dir, filename);

    // 버퍼를 파일로 저장
    await writeFile(filepath, buffer);

    // 로컬 파일 경로를 URL 대신 반환
    return filepath;
  }
}
