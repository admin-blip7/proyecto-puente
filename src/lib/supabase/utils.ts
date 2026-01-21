export const toDate = (value: unknown): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;

  // Handle Firestore timestamp format {_seconds, _nanoseconds}
  if (typeof value === "object" && value !== null) {
    const maybe = value as { _seconds?: number; _nanoseconds?: number };
    if (typeof maybe._seconds === "number") {
      const millis = maybe._seconds * 1000 + (maybe._nanoseconds ?? 0) / 1_000_000;
      return new Date(millis);
    }
  }

  // Handle string values (potentially with extra quotes from JSONB)
  if (typeof value === "string") {
    let cleanValue = value.trim();
    if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
      try {
        cleanValue = JSON.parse(cleanValue);
      } catch (e) {
        cleanValue = cleanValue.slice(1, -1);
      }
    }
    const parsed = new Date(cleanValue);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  // Fallback to current date but log warning if possible
  return new Date();
};

export const nowIso = (): string => new Date().toISOString();
