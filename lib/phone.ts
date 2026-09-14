export function cleanPhoneNumber(value: string): string {
  return value.replace(/[\s\-\(\)\.]/g, "").trim();
}

/**
 * Returns the canonical 10-digit cellphone representation (or clean core digits)
 * removing country code (+54, 9), long-distance prefixes (0), and mobile prefix (15).
 */
export function getCanonicalPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (!digits) return "";

  // Strip international prefix +549 / 549 or +54 / 54
  if (digits.startsWith("549") && digits.length >= 12) {
    digits = digits.slice(3);
  } else if (digits.startsWith("54") && digits.length >= 11) {
    digits = digits.slice(2);
  }

  // Strip leading 0 (trunk prefix)
  if (digits.startsWith("0") && digits.length >= 10) {
    digits = digits.slice(1);
  }

  // Handle '15' mobile prefix after area code (e.g., 11 15 xxxxxxxx -> 11 xxxxxxxx)
  if (digits.startsWith("1115") && digits.length === 12) {
    digits = "11" + digits.slice(4);
  } else if (digits.length === 12 && digits.slice(2, 4) === "15") {
    // 2-digit area code + 15
    digits = digits.slice(0, 2) + digits.slice(4);
  } else if (digits.length === 12 && digits.slice(3, 5) === "15") {
    // 3-digit area code + 15
    digits = digits.slice(0, 3) + digits.slice(5);
  }

  return digits;
}

/**
 * Checks if two phone strings represent the same underlying customer phone.
 */
export function arePhonesEquivalent(phoneA: string, phoneB: string): boolean {
  if (!phoneA || !phoneB) return false;
  const canonA = getCanonicalPhone(phoneA);
  const canonB = getCanonicalPhone(phoneB);

  if (canonA && canonB && canonA === canonB) return true;

  // Suffix matching: if both have at least 8 digits and match their last 8 digits
  const rawDigitsA = phoneA.replace(/\D/g, "");
  const rawDigitsB = phoneB.replace(/\D/g, "");

  if (rawDigitsA.length >= 8 && rawDigitsB.length >= 8) {
    if (rawDigitsA.slice(-8) === rawDigitsB.slice(-8)) {
      return true;
    }
  }

  // If one has 10 digits and the other has only 8 digits (local number without area code)
  if (canonA.length === 10 && canonB.length === 8 && canonA.endsWith(canonB)) {
    return true;
  }
  if (canonB.length === 10 && canonA.length === 8 && canonB.endsWith(canonA)) {
    return true;
  }

  return false;
}
