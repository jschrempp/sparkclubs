// Holds the JWT access token in memory only (a module-level variable).
// It is intentionally never written to localStorage/sessionStorage, since
// those are readable by any JS that runs on the page (e.g. via an XSS bug),
// which would let an attacker steal the token. Keeping it in memory means
// it disappears on full page reload/new tab, so the user needs to log in
// again in those cases - a deliberate tradeoff for reduced XSS exposure.

let currentToken: string | null = null;

export function getToken(): string | null {
  return currentToken;
}

export function setToken(token: string): void {
  currentToken = token;
}

export function clearToken(): void {
  currentToken = null;
}