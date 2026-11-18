import serverless from "serverless-http";
import { withLambda, type HandlerResponse } from "@netlify/aws-lambda-compat";
import { app } from "../../api-server";

// Netlify forwards /api/* through this function; Express keeps the same route
// definitions for local development and production.
const handleExpress = serverless(app, {
  binary: ["image/*"],
});

// Keep Express's existing request/response adaptation, but deploy on the modern
// Netlify runtime rather than Lambda compatibility mode's 4 KB environment limit.
export default withLambda(async (event, context) =>
  await handleExpress(event, context) as HandlerResponse,
);
