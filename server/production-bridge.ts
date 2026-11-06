import type { Request, Response } from "express";
import ordersHandler from "../netlify/functions/orders";
import stripeConfirmHandler from "../netlify/functions/stripe-confirm";
import stripeWebhookHandler from "../netlify/functions/stripe-webhook";
import catalogBackupsHandler from "../netlify/functions/catalog-backups";
import orderEmailTestHandler from "../netlify/functions/order-email-test";
import contactHandler from "../netlify/functions/contact";

const PRODUCTION_BACKEND_ORIGIN = "https://aramcreationsofficial.netlify.app";

type WebHandler = (request: globalThis.Request, context?: { ip?: string }) => Promise<globalThis.Response>;

export function wrapOrProxyToProduction(webHandler: WebHandler, requiredEnvVars: string[]) {
  return async (req: Request, res: Response) => {
    try {
      const hasAllLocalSecrets = requiredEnvVars.every((key) => Boolean(process.env[key]?.trim()));
      const hasBody = !["GET", "HEAD"].includes(req.method.toUpperCase());
      const bodyText =
        hasBody && req.body !== undefined
          ? Buffer.isBuffer(req.body)
            ? req.body.toString("utf8")
            : typeof req.body === "string"
              ? req.body
              : JSON.stringify(req.body)
          : undefined;

      if (hasAllLocalSecrets) {
        const protocol = req.protocol || "http";
        const host = req.get("host") || "localhost:3000";
        const url = `${protocol}://${host}${req.originalUrl}`;
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (typeof value === "string") headers.set(key, value);
          else if (Array.isArray(value)) headers.set(key, value.join(", "));
        }
        const webReq = new globalThis.Request(url, {
          method: req.method,
          headers,
          body: bodyText,
        });
        const webRes = await webHandler(webReq, { ip: req.ip });
        res.status(webRes.status);
        webRes.headers.forEach((val, key) => {
          if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
            res.setHeader(key, val);
          }
        });
        const buf = Buffer.from(await webRes.arrayBuffer());
        return res.send(buf);
      }

      // Transparent bridge to live production Netlify Functions when running in AI Studio / Cloud Run preview
      const targetUrl = `${PRODUCTION_BACKEND_ORIGIN}${req.originalUrl}`;
      const forwardHeaders: Record<string, string> = {
        Origin: PRODUCTION_BACKEND_ORIGIN,
      };
      const authHeader = req.get("authorization");
      if (authHeader) forwardHeaders["Authorization"] = authHeader;
      const contentType = req.get("content-type");
      if (contentType) forwardHeaders["Content-Type"] = contentType;
      else if (hasBody) forwardHeaders["Content-Type"] = "application/json";

      const upstreamRes = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: bodyText,
        signal: AbortSignal.timeout(25000),
      });

      res.status(upstreamRes.status);
      const upstreamContentType = upstreamRes.headers.get("content-type");
      if (upstreamContentType) res.setHeader("Content-Type", upstreamContentType);
      const contentDisposition = upstreamRes.headers.get("content-disposition");
      if (contentDisposition) res.setHeader("Content-Disposition", contentDisposition);
      const buf = Buffer.from(await upstreamRes.arrayBuffer());
      return res.send(buf);
    } catch (err: any) {
      return res.status(502).json({
        ok: false,
        error: err?.message || "Σφάλμα επικοινωνίας με τον διακομιστή παραγγελιών.",
      });
    }
  };
}

export const bridgedOrdersHandler = wrapOrProxyToProduction(ordersHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
  "STRIPE_SECRET_KEY",
]);
export const bridgedStripeConfirmHandler = wrapOrProxyToProduction(stripeConfirmHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
  "STRIPE_SECRET_KEY",
]);
export const bridgedStripeWebhookHandler = wrapOrProxyToProduction(stripeWebhookHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
  "STRIPE_SECRET_KEY",
]);
export const bridgedCatalogBackupsHandler = wrapOrProxyToProduction(catalogBackupsHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
]);
export const bridgedOrderEmailTestHandler = wrapOrProxyToProduction(orderEmailTestHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
  "RESEND_API_KEY",
]);
export const bridgedContactHandler = wrapOrProxyToProduction(contactHandler as WebHandler, [
  "RESEND_API_KEY",
]);
