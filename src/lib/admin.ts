import { cookies } from "next/headers";

export const ADMIN_COOKIE = "wt_admin";

/**
 * The admin password gates the review queue. Set ADMIN_PASSWORD in your
 * environment (e.g. .env.local) before deploying. If it's unset, we fall
 * back to a dev-only default so local testing still works.
 */
export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "changeme";
}

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === getAdminPassword();
}
