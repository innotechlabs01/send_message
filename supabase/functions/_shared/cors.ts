export interface CorsOptions {
  credentials?: boolean;
  allowedHeaders?: string[];
  allowedMethods?: string[];
}

const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const DEFAULT_ALLOWED_HEADERS = ["authorization", "x-client-info", "apikey", "content-type"];
const DEFAULT_DEV_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"];

function resolveAllowedOrigins(): string[] {
  const envVal = Deno.env.get("ALLOWED_ORIGINS");
  if (envVal && envVal.trim().length > 0) {
    return envVal
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }
  const appUrl = Deno.env.get("APP_URL")?.trim();
  if (appUrl) {
    const origins = [...DEFAULT_DEV_ORIGINS, appUrl];
    const stripped = appUrl.replace(/\/+$/, "");
    if (!origins.includes(stripped)) {
      origins.push(stripped);
    }
    return Array.from(new Set(origins));
  }
  return DEFAULT_DEV_ORIGINS;
}

export function getCorsHeaders(req: Request, options?: CorsOptions): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigins = resolveAllowedOrigins();

  const isAllowed = allowedOrigins.includes("*") || allowedOrigins.includes(origin);

  const matchedOrigin = isAllowed
    ? origin || (allowedOrigins.includes("*") ? "*" : allowedOrigins[0])
    : allowedOrigins[0];

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Methods": (options?.allowedMethods ?? DEFAULT_ALLOWED_METHODS).join(", "),
    "Access-Control-Allow-Headers": (options?.allowedHeaders ?? DEFAULT_ALLOWED_HEADERS).join(", "),
    Vary: "Origin",
  };

  if (options?.credentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function handleCorsPreflight(req: Request, options?: CorsOptions): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req, options),
    });
  }
  return null;
}
