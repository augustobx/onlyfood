import { describe, it, expect } from "vitest";
import { isAssistedRecoveryEligible, isAssistedRecoveryValid, normalizeRecoveryCode } from "@/lib/client-recovery-policy";

describe("Recuperación individual y temporal", () => {
  const now = new Date("2026-10-16T12:00:00.000Z");
  const client = { email: null, phone: "1112345678" };
  const code = { phoneAtIssue: client.phone, usedAt: null, expiresAt: new Date(now.getTime() + 60_000) };
  it("rechaza cualquier cuenta con correo, incluso pendiente", () => {
    expect(isAssistedRecoveryEligible(null)).toBe(true);
    expect(isAssistedRecoveryEligible("a@ejemplo.com")).toBe(false);
    expect(isAssistedRecoveryValid({ ...client, email: "a@ejemplo.com" }, code, now)).toBe(false);
  });
  it("rechaza código usado, vencido o teléfono cambiado", () => {
    expect(isAssistedRecoveryValid(client, code, now)).toBe(true);
    expect(isAssistedRecoveryValid(client, { ...code, usedAt: now }, now)).toBe(false);
    expect(isAssistedRecoveryValid(client, { ...code, expiresAt: now }, now)).toBe(false);
    expect(isAssistedRecoveryValid({ ...client, phone: "1199999999" }, code, now)).toBe(false);
  });
  it("normaliza guiones y espacios", () => {
    expect(normalizeRecoveryCode(" abcd-1234 ef90 ")).toBe("ABCD1234EF90");
    expect(normalizeRecoveryCode(" 1234-5678 ")).toBe("12345678");
  });
});
