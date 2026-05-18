const API_KEY_STORAGE_KEY = "vukho.apiKey";
export const CSRF_COOKIE_NAME = "vukho_csrf";

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function getStoredApiKey() {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setStoredApiKey(apiKey: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
}

export function clearStoredApiKey() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function hasStoredApiKey() {
  return Boolean(getStoredApiKey());
}

export function getCsrfToken() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`));

  return cookie ? decodeURIComponent(cookie.slice(CSRF_COOKIE_NAME.length + 1)) : null;
}
