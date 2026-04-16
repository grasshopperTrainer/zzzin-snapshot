// upload: upload_url에 따라 HTTP PUT 또는 로컬 파일 저장
// HTTP(S) URL → presigned URL로 PUT 요청
// 그 외 → 로컬 파일 경로로 간주하여 저장
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function upload(buffer, uploadUrl) {
  const t = Date.now();

  if (uploadUrl.startsWith("http://") || uploadUrl.startsWith("https://")) {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: buffer,
      headers: { "Content-Type": "image/webp" },
    });

    console.log(`[upload] PUT ${res.status} — ${Date.now() - t}ms, ${buffer.length} bytes`);

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }
  } else {
    await mkdir(dirname(uploadUrl), { recursive: true });
    await writeFile(uploadUrl, buffer);
    console.log(`[upload] file write — ${Date.now() - t}ms, ${buffer.length} bytes`);
  }
}
