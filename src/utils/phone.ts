export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 7) {
    return null;
  }

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  return digits;
}