import { describe, it, expect } from "vitest";
import { isPendingTransfer, normalizeTransferWhatsApp, transferReceiptUrl, transferSettingsValid } from "@/lib/transfer-payment";
const good = { enabled: true, alias: "COMERCIO.MP", cbu: "", holder: "Comercio SRL", whatsapp: "5491133334444" };
describe("Transferencia manual", () => {
  it("requires opt-in, account and WhatsApp destination", () => {
    expect(transferSettingsValid(good)).toBe(true);
    expect(transferSettingsValid({ ...good, enabled: false })).toBe(false);
    expect(transferSettingsValid({ ...good, holder: "" })).toBe(false);
    expect(transferSettingsValid({ ...good, alias: "", cbu: "" })).toBe(false);
    expect(transferSettingsValid({ ...good, alias: "", cbu: "0012345678901234567890" })).toBe(true);
    expect(transferSettingsValid({ ...good, whatsapp: "123" })).toBe(false);
  });
  it("classifies only unapproved live transfers into the approval tray", () => {
    expect(isPendingTransfer({ paymentMethod: "TRANSFER", paymentStatus: "PENDING", status: "NEW" })).toBe(true);
    expect(isPendingTransfer({ paymentMethod: "TRANSFER", paymentStatus: "PAID", status: "NEW" })).toBe(false);
    expect(isPendingTransfer({ paymentMethod: "TRANSFER", paymentStatus: "PENDING", status: "CANCELLED" })).toBe(false);
    expect(isPendingTransfer({ paymentMethod: "MP", paymentStatus: "PENDING", status: "NEW" })).toBe(false);
  });
  it("builds a wa.me link to share proof, never auto-verifies", () => {
    const url = transferReceiptUrl("+54 9 11 3333-4444", "00000000-0000-0000-0000-123456", 12345);
    expect(url).toContain("wa.me/5491133334444");
    expect(decodeURIComponent(url!)).toContain("#123456");
    expect(url).not.toContain("token=");
    expect(normalizeTransferWhatsApp("123")).toBe("");
  });
});
