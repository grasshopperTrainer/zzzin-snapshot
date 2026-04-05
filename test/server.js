// 테스트용 정적 HTML 서버
// capturer 테스트를 위해 이미지를 원본 크기 그대로 렌더링
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "fixtures");

const app = new Hono();

// 테스트 픽스처 이미지 서빙
app.get("/fixtures/:filename", async (c) => {
  const buffer = await readFile(join(fixturesDir, c.req.param("filename")));
  return new Response(buffer, {
    headers: { "Content-Type": "image/webp" },
  });
});

// GET /preview/:imageName — 이미지를 원본 크기 그대로 렌더링
// capturer가 [data-snapshot-ready]를 가진 <img> 요소만 캡처함
app.get("/preview/:imageName", (c) => {
  const imageName = c.req.param("imageName");

  return c.html(`<!DOCTYPE html>
<html>
<head><style>* { margin: 0; padding: 0; }</style></head>
<body>
  <img
    src="/fixtures/${imageName}.webp"
    onload="this.setAttribute('data-snapshot-ready', 'true')"
  />
</body>
</html>`);
});

// 테스트에서 서버를 프로그래밍 방식으로 시작/중지할 수 있도록 export
export function startTestServer(port = 4444) {
  return new Promise((resolve) => {
    const server = serve({ fetch: app.fetch, port }, () => {
      resolve(server);
    });
  });
}
