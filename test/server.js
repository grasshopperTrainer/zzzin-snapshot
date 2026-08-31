// 테스트용 정적 HTML 서버
// capturer 테스트를 위해 이미지를 원본 크기 그대로 렌더링
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

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

/*
 * GET /solid/:color/:w/:h?ms=  — 단색 webp 를 만들어 준다. `ms` 만큼 늦게 응답한다.
 *
 * "뷰포트가 바뀌면 그때부터 새로 받아야 하는 이미지" 를 결정적으로 만들기 위한 것.
 * 색이 다르면 어느 쪽이 찍혔는지 픽셀로 판정할 수 있다.
 */
app.get("/solid/:color/:w/:h", async (c) => {
  const { color, w, h } = c.req.param();
  const ms = Number(c.req.query("ms") ?? 0);
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  const buffer = await sharp({
    create: {
      width: Number(w),
      height: Number(h),
      channels: 3,
      background: `#${color}`,
    },
  })
    .webp()
    .toBuffer();
  return new Response(buffer, { headers: { "Content-Type": "image/webp" } });
});

/*
 * GET /responsive — **캡처 순서 결함을 드러내는 페이지.**
 *
 * 실제 프리뷰와 같은 구조를 최소로 흉내낸다: 페이지가 스스로 "다 그렸다" 를 판정해
 * data-snapshot-ready 를 붙인다(이미지가 전부 complete + 3프레임 안정).
 *
 * 핵심은 **판정이 그 시점의 뷰포트에서만 유효**하다는 것이다. 좁은 뷰포트에서는
 * 빨강(즉시)을, 넓어지면 파랑(늦게 오는)을 받도록 해 뒀다. capturer 가 ready 를 본
 * *뒤에* 뷰포트를 넓히면 파랑을 받기 시작하고, 기다리지 않고 찍으면 **빨강이 박힌다.**
 * 뷰포트를 먼저 정하고 기다리면 파랑이 박힌다.
 */
app.get("/responsive", (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head><style>
  * { margin: 0; padding: 0; }
  #root { width: 1200px; height: 800px; }
  img { display: block; width: 1200px; height: 800px; }
</style></head>
<body>
  <div id="root">
    <picture>
      <source media="(min-width: 1000px)" srcset="/solid/0000ff/1200/800?ms=1200">
      <img src="/solid/ff0000/1200/800">
    </picture>
  </div>
<script>
  // 실제 프리뷰의 정착 판정을 최소로 흉내 — 덜 받은 이미지가 없고 3프레임 안정.
  (async () => {
    const root = document.getElementById('root');
    const frame = () => new Promise(r => requestAnimationFrame(() => r()));
    let stable = 0, prev = '';
    for (let i = 0; i < 600; i++) {
      const imgs = Array.from(document.images);
      const pending = imgs.filter(x => !x.complete).length;
      const sig = String(imgs.length);
      stable = (pending === 0 && sig === prev) ? stable + 1 : 0;
      prev = sig;
      if (stable >= 3) break;
      await frame();
    }
    await frame();
    root.setAttribute('data-snapshot-ready', 'true');
  })();
</script>
</body>
</html>`);
});

// PUT /upload/:filename — HTTP PUT 업로드 테스트용
// presigned URL 대신 이 엔드포인트로 PUT하여 업로드 동작을 검증
app.put("/upload/:filename", async (c) => {
  const filename = c.req.param("filename");
  const buffer = Buffer.from(await c.req.arrayBuffer());
  const filepath = join(fixturesDir, "..", "..", ".test-output", "put", filename);
  await mkdir(join(filepath, ".."), { recursive: true });
  await writeFile(filepath, buffer);
  return c.text("OK", 200);
});

// 테스트에서 서버를 프로그래밍 방식으로 시작/중지할 수 있도록 export
export function startTestServer(port = 4444) {
  return new Promise((resolve) => {
    const server = serve({ fetch: app.fetch, port }, () => {
      resolve(server);
    });
  });
}
