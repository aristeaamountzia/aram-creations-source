import type { NextFunction, Request, Response } from "express";
import { requireAdmin } from './admin-database';
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

// Retained for authenticated local/native ffmpeg installations. Browser uploads
// use the self-hosted worker and never send raw video to Netlify Functions.
export async function authorizeVideoTranscode(req: Request, res: Response, next: NextFunction) {
  const authorization = req.get('Authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return res.status(401).json({ error: 'Συνδέσου στο Back Office για μετατροπή βίντεο.' });
  try {
    await requireAdmin(new globalThis.Request('https://aramcreationsofficial.netlify.app/api/video-transcode', { headers: { authorization } }));
  } catch (error) {
    const denied = error instanceof Error && error.message === 'ADMIN_REQUIRED';
    return res.status(denied ? 403 : 503).json({ error: denied ? 'Δεν επιτρέπεται η μετατροπή βίντεο.' : 'Η επαλήθευση διαχειριστή δεν είναι διαθέσιμη.' });
  }
  next();
}

export async function handleVideoTranscode(req: Request, res: Response) {
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.byteLength === 0) {
    return res.status(400).json({ ok: false, error: "Δεν ελήφθη έγκυρο αρχείο βίντεο για μετατροπή." });
  }
  const stripAudio = req.query.stripAudio === "1" || req.query.stripAudio === "true";
  const id = randomUUID();
  const inputPath = path.join(os.tmpdir(), `aram-video-in-${id}.mp4`);
  const outputPath = path.join(os.tmpdir(), `aram-video-out-${id}.mp4`);
  try {
    await fs.writeFile(inputPath, body);
    const args = [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=1280:1280:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-r",
      "30",
      "-b:v",
      "1800k",
      "-maxrate",
      "2200k",
      "-bufsize",
      "3600k",
      "-movflags",
      "+faststart",
      ...(stripAudio ? ["-an"] : ["-c:a", "aac", "-b:a", "96k", "-ac", "2", "-ar", "48000"]),
      outputPath,
    ];
    await execFileAsync("ffmpeg", args, { timeout: 180000, maxBuffer: 10 * 1024 * 1024 });
    const outputBuffer = await fs.readFile(outputPath);
    if (!outputBuffer.byteLength) {
      return res.status(500).json({ ok: false, error: "Το μετατρεπόμενο βίντεο H.264 ήταν κενό." });
    }
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", String(outputBuffer.byteLength));
    return res.status(200).send(outputBuffer);
  } catch (err: any) {
    console.error("Error in /api/video-transcode:", err);
    return res.status(500).json({
      ok: false,
      error: `Αποτυχία μετατροπής βίντεο σε H.264: ${err?.message || "Άγνωστο σφάλμα ffmpeg"}`,
    });
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
