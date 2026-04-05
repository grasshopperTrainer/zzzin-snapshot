// upload: upload_url에 따라 HTTP PUT 또는 로컬 파일 저장
// HTTP(S) URL → presigned URL로 PUT 요청
// 그 외 → 로컬 파일 경로로 간주하여 저장
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function upload(buffer, uploadUrl) {
  if (uploadUrl.startsWith("http://") || uploadUrl.startsWith("https://")) {
    // presigned URL에 PUT — S3 자격증명 필요 없음
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: buffer,
      headers: { "Content-Type": "image/webp" },
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }
  } else {
    // 로컬 파일 경로 — 디버깅용
    await mkdir(dirname(uploadUrl), { recursive: true });
    await writeFile(uploadUrl, buffer);
  }
}
