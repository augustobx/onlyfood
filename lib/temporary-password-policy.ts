export type TemporaryAccount = { forcePasswordChange: boolean; temporaryPasswordExpiresAt: Date | null };
export function temporaryPasswordState(account: TemporaryAccount, now: Date): "NORMAL" | "SETUP" | "EXPIRED" {
  if (!account.forcePasswordChange) return "NORMAL";
  return account.temporaryPasswordExpiresAt && account.temporaryPasswordExpiresAt > now ? "SETUP" : "EXPIRED";
}
