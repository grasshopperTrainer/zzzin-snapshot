import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { capture } from "./capturer.js";

const port = process.env.PORT || 6666;

const app = createApp({ capturer: capture });

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});
