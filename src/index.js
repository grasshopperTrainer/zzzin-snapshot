import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { capture } from "./capturer.js";

// 모든 console 로그 앞에 ISO 타임스탬프 추가
for (const level of ["log", "warn", "error"]) {
  const original = console[level];
  console[level] = (...args) => original(`[${new Date().toISOString()}]`, ...args);
}

const port = process.env.PORT || 6666;

const app = createApp({ capturer: capture });

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});
