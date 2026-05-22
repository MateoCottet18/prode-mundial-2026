/**
 * Admin protection helpers.
 *
 * The protected admin is identified by EITHER:
 *   - `process.env.ADMIN_EMAIL`
 *   - `process.env.ADMIN_USERNAME`
 *
 * Both env vars are optional and lower-cased. When neither is set, the helpers
 * behave as "no protected admin" (passthrough) so the rest of the app keeps
 * working in dev / first install scenarios.
 *
 * This module is server-safe and should be imported from API routes / services,
 * never from client components (the env vars are not NEXT_PUBLIC).
 */

const RAW_ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const RAW_ADMIN_USERNAME = (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();

export const ADMIN_EMAIL: string = RAW_ADMIN_EMAIL;
export const ADMIN_USERNAME: string = RAW_ADMIN_USERNAME;

export type AdminIdentity = {
  email?: string | null;
  username?: string | null;
};

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!ADMIN_EMAIL || !email) {
    return false;
  }
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export function isAdminUsername(username: string | null | undefined): boolean {
  if (!ADMIN_USERNAME || !username) {
    return false;
  }
  return username.trim().toLowerCase() === ADMIN_USERNAME;
}

/** True when the email OR username matches the configured admin identity. */
export function isAdminUser(identity: AdminIdentity): boolean {
  return isAdminEmail(identity.email) || isAdminUsername(identity.username);
}

/**
 * Returns the role that must be persisted for a given user.
 * If they are the protected admin we always force `"admin"`.
 * Otherwise we keep the requested role.
 */
export function enforceRoleForUser(identity: AdminIdentity, requestedRole: string): string {
  return isAdminUser(identity) ? "admin" : requestedRole;
}

/**
 * Returns the payment_status that must be persisted for a given user.
 * The admin user is always treated as "approved" to avoid losing access.
 */
export function enforcePaymentStatusForUser(
  identity: AdminIdentity,
  requestedPaymentStatus: string,
): string {
  return isAdminUser(identity) ? "approved" : requestedPaymentStatus;
}

/** Guard for destructive operations: never let automated flows delete the admin. */
export function shouldBlockAdminDeletion(identity: AdminIdentity): boolean {
  return isAdminUser(identity);
}

// -----------------------------------------------------------------------------
// Backwards-compatible aliases (older callers that only have an email).
// -----------------------------------------------------------------------------

export function enforceRoleForEmail(
  email: string | null | undefined,
  requestedRole: string,
): string {
  return enforceRoleForUser({ email }, requestedRole);
}

export function enforcePaymentStatusForEmail(
  email: string | null | undefined,
  requestedPaymentStatus: string,
): string {
  return enforcePaymentStatusForUser({ email }, requestedPaymentStatus);
}
