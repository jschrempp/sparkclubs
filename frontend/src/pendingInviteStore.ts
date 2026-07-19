// Holds the pending club invite token in memory only, for the same
// XSS-mitigation reason as the access token in tokenStore.ts. When a
// user follows a /join/:token link before logging in, the token is
// held here so the join can be completed immediately after a
// successful login/registration — no localStorage needed.

let pendingInvite: string | null = null;

export function getPendingInvite(): string | null {
  return pendingInvite;
}

export function setPendingInvite(token: string): void {
  pendingInvite = token;
}

export function clearPendingInvite(): void {
  pendingInvite = null;
}