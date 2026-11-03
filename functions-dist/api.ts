import serverless from "serverless-http";
import { app } from "../../api-server";

// Netlify forwards /api/* through this function; Express keeps the same route
// definitions for local development and production.
export const handler = serverless(app, {
  binary: ["image/*"],
});
