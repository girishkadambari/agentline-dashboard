import { getCsrfToken, getStoredApiKey } from "@/lib/auth/session";

export const API_BASE_URL =
  import.meta.env.VITE_VUKHO_API_URL ?? "http://localhost:3000/v1";

export class VukhoApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(input: { code: string; message: string; status: number; details?: unknown }) {
    super(input.message);
    this.name = "VukhoApiError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}

type ValidationIssue = {
  path?: Array<string | number>;
  message?: string;
};

function isValidationIssue(value: unknown): value is ValidationIssue {
  return Boolean(value && typeof value === "object" && "message" in value);
}

export function formatApiError(caught: unknown, fallback = "Something went wrong.") {
  if (!(caught instanceof VukhoApiError)) {
    return fallback;
  }

  const issues =
    caught.details &&
    typeof caught.details === "object" &&
    "issues" in caught.details &&
    Array.isArray((caught.details as { issues?: unknown }).issues)
      ? (caught.details as { issues: unknown[] }).issues
      : [];

  if (issues.length > 0) {
    return issues
      .filter(isValidationIssue)
      .map((issue) => {
        const field = issue.path?.join(".");
        return field ? `${field}: ${issue.message ?? caught.message}` : issue.message ?? caught.message;
      })
      .join("\n");
  }

  return caught.message;
}

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  authToken?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const { auth = true, authToken, query, headers, body, ...init } = options;
  const token = authToken ?? getStoredApiKey();
  const requestHeaders = new Headers(headers);
  const method = init.method?.toUpperCase() ?? "GET";

  if (body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (auth && !token && ["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf && !requestHeaders.has("X-CSRF-Token")) {
      requestHeaders.set("X-CSRF-Token", csrf);
    }
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    body,
    credentials: "include",
    headers: requestHeaders,
  });
  const payload = await readJson(response);

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { code?: string; message?: string; details?: unknown } }).error
        : undefined;

    throw new VukhoApiError({
      code: errorPayload?.code ?? "request_failed",
      message: errorPayload?.message ?? `Request failed with status ${response.status}`,
      status: response.status,
      details: errorPayload?.details ?? payload,
    });
  }

  return payload as T;
}
