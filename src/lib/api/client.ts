/**
 * AgentLine API client.
 *
 * Currently returns mock data. Codex will replace these implementations
 * with real backend HTTP calls. Keep the function shapes stable.
 */
import type { ApiList, ApiResult } from "./types";

export const API_BASE_URL = "/api/v1";

export const wrap = <T>(data: T): ApiResult<T> => ({ data });
export const wrapList = <T>(
  data: T[],
  pagination: Partial<ApiList<T>["pagination"]> = {},
): ApiList<T> => ({
  data,
  pagination: { limit: pagination.limit ?? 50, nextCursor: pagination.nextCursor ?? null },
});

export const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));