export interface ApiError { code: string; message: string; details?: unknown }
export interface ApiResult<T> { data: T; error?: ApiError }
export interface ApiList<T> { data: T[]; pagination: { limit: number; nextCursor: string | null } }
export type ApiResponse<T> = ApiResult<T>
export type ApiListResponse<T> = ApiList<T>
