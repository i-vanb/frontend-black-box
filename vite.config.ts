import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "black-box-mock-api",
      configureServer(server) {
        server.middlewares.use("/api/monitoring/events", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }

          let body = "";

          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });

          req.on("end", () => {
            console.log("[Mock Monitoring API]", JSON.parse(body));

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          });
        });
      },
    },
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
