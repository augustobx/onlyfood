export function cleanPhoneNumber(value: string): string {
  return value.replace(/[\s\-\(\)\.]/g, "").trim();
}
