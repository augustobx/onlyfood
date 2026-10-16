export const RECOVERY_CODE_TTL_MINUTES = 10;
export function isAssistedRecoveryEligible(email: string | null | undefined): boolean {
  return !email;
}
export function isAssistedRecoveryValid(
  client: { email: string | null; phone: string },
  credential: { phoneAtIssue: string; usedAt: Date | null; expiresAt: Date },
  now: Date,
): boolean {
  return isAssistedRecoveryEligible(client.email)
    && client.phone === credential.phoneAtIssue
    && credential.usedAt === null
    && credential.expiresAt > now;
}
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}
