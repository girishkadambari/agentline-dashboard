const API_KEY_STORAGE_KEY = "agentline.apiKey";

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
