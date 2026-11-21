export function jsonResponse(
  data: unknown,
  status = 200,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function safeErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string> = {},
  status = 500,
): Response {
  // Log full error detail server-side for observability/debugging
  console.error("[Function Error]", err);

  let message = "Internal Server Error";
  if (status >= 400 && status < 500 && err instanceof Error) {
    message = err.message;
  } else if (status === 500) {
    message = "An unexpected error occurred. Please try again later.";
  }

  return jsonResponse({ error: message }, status, corsHeaders);
}
