import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { app } from "./api-server";

const PORT = Number(process.env.PORT || 3000);

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const candidatePaths = [
      path.join(process.cwd(), "dist"),
      path.join(__dirname, "dist"),
      path.join(__dirname, "../dist"),
      path.join(process.cwd(), "01_GITHUB/aram-creations-source/dist")
    ];
    const distPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aram Creations] Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NETLIFY !== "true" && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  void start();
}
