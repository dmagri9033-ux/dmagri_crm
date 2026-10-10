/** Remove digits from a customer name (names should not include phone/numbers). */
export function stripDigitsFromCustomerName(value: string): string {
  return value.replace(/\d/g, "");
}

/** True when the value contains any digit 0–9. */
export function customerNameHasDigits(value: string): boolean {
  return /\d/.test(value);
}

/**
 * Normalize/validate a customer name for save.
 * Returns an error message, or the cleaned name (may be empty).
 */
export function normalizeCustomerNameInput(
  value: string | null | undefined,
): { name: string; error?: string } {
  const name = stripDigitsFromCustomerName(String(value ?? "")).trim();
  if (customerNameHasDigits(String(value ?? ""))) {
    return {
      name,
      error: "Customer name cannot include numbers",
    };
  }
  if (name.length > 120) {
    return { name, error: "Name is too long" };
  }
  return { name };
}
