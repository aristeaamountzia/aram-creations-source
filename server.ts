import "dotenv/config";
import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

process.on("uncaughtException", (err) => {
  console.error("[Aram Creations] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Aram Creations] Unhandled rejection:", reason);
});

async function loadApiApp(): Promise<express.Express> {
  try {
    const mod = await import("./api-server");
    return mod.app;
  } catch {
    const require = createRequire(import.meta.url);
    return require("./server-dist/api-server.cjs").app;
  }
}

async function start() {
  const app = await loadApiApp();
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
        watch: process.env.DISABLE_HMR === "true" ? null : {},
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const candidatePaths = [
      path.join(process.cwd(), "dist"),
      path.join(__dirname, "dist"),
      path.join(__dirname, "../dist"),
      path.join(process.cwd(), "01_GITHUB/aram-creations-source/dist"),
    ];
    const distPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.on("error", (err) => {
    console.error("[Aram Creations] HTTP server error:", err);
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aram Creations] Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NETLIFY !== "true" && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  void start();
}
