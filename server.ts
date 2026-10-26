import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { app } from "./api-server";

function readCliOption(name: string): string | undefined {
  const option = `--${name}`;
  const equalsPrefix = `${option}=`;
  const index = process.argv.findIndex((argument) => argument === option || argument.startsWith(equalsPrefix));
  if (index === -1) return undefined;

  const argument = process.argv[index];
  return argument.startsWith(equalsPrefix) ? argument.slice(equalsPrefix.length) : process.argv[index + 1];
}

// Editor V passes its own port and host as CLI arguments. Respect them so the
// Express wrapper and Vite middleware are served at the address it expects.
const PORT = Number(readCliOption("port") || process.env.PORT || 3000);
const HOST = readCliOption("host") || process.env.HOST || "0.0.0.0";

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Aram Creations] Server running on http://${HOST}:${PORT}`);
  });
}

if (process.env.NETLIFY !== "true" && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  void start();
}
