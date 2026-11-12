import type { Request, Response } from "express";
import ordersHandler from "../netlify/functions/orders";
import stripeConfirmHandler from "../netlify/functions/stripe-confirm";
import stripeWebhookHandler from "../netlify/functions/stripe-webhook";
import catalogBackupsHandler from "../netlify/functions/catalog-backups";
import orderEmailTestHandler from "../netlify/functions/order-email-test";
import contactHandler from "../netlify/functions/contact";

type WebHandler = (request: globalThis.Request, context?: { ip?: string }) => Promise<globalThis.Response>;

export function wrapLocalWebHandler(webHandler: WebHandler, requiredEnvVars: string[]) {
  return async (req: Request, res: Response) => {
    try {
      const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]?.trim());
      if (missingEnvVars.length) {
        return res.status(503).json({
          ok: false,
          code: "LOCAL_BACKEND_NOT_CONFIGURED",
          error: "Η τοπική υπηρεσία δεν είναι ρυθμισμένη. Το αίτημα δεν στάλθηκε στο production.",
          missing: missingEnvVars,
        });
      }

      const hasBody = !["GET", "HEAD"].includes(req.method.toUpperCase());
      const bodyText =
        hasBody && req.body !== undefined
          ? Buffer.isBuffer(req.body)
            ? req.body.toString("utf8")
            : typeof req.body === "string"
              ? req.body
              : JSON.stringify(req.body)
          : undefined;

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
    } catch (err: any) {
      return res.status(502).json({
        ok: false,
        error: err?.message || "Σφάλμα επικοινωνίας με τον διακομιστή παραγγελιών.",
      });
    }
  };
}

export const bridgedOrdersHandler = wrapLocalWebHandler(ordersHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
  "STRIPE_SECRET_KEY",
]);
export const bridgedStripeConfirmHandler = wrapLocalWebHandler(stripeConfirmHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
  "STRIPE_SECRET_KEY",
]);
export const bridgedStripeWebhookHandler = wrapLocalWebHandler(stripeWebhookHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
  "STRIPE_SECRET_KEY",
]);
export const bridgedCatalogBackupsHandler = wrapLocalWebHandler(catalogBackupsHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
]);
export const bridgedOrderEmailTestHandler = wrapLocalWebHandler(orderEmailTestHandler as WebHandler, [
  "FIREBASE_SERVICE_ACCOUNT",
  "RESEND_API_KEY",
]);
export const bridgedContactHandler = wrapLocalWebHandler(contactHandler as WebHandler, [
  "RESEND_API_KEY",
]);
