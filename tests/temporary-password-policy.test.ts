import { describe, expect, it } from "vitest";
import { temporaryPasswordState } from "@/lib/temporary-password-policy";

describe("Acceso temporal", () => {
  const now = new Date("2026-10-16T18:00:00Z");
  it("el acceso normal no usa el permiso temporal", () => {
    expect(temporaryPasswordState({ forcePasswordChange: false, temporaryPasswordExpiresAt: null }, now)).toBe("NORMAL");
  });
  it("requiere rotación en el plazo permitido", () => {
    expect(temporaryPasswordState({ forcePasswordChange: true, temporaryPasswordExpiresAt: new Date(now.getTime() + 1000) }, now)).toBe("SETUP");
  });
  it("rechaza contraseña temporal vencida o sin fecha", () => {
    expect(temporaryPasswordState({ forcePasswordChange: true, temporaryPasswordExpiresAt: now }, now)).toBe("EXPIRED");
    expect(temporaryPasswordState({ forcePasswordChange: true, temporaryPasswordExpiresAt: null }, now)).toBe("EXPIRED");
  });
});
