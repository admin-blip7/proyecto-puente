export const toDate = (value: unknown): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (typeof value === "object" && value !== null) {
    const maybe = value as { _seconds?: number; _nanoseconds?: number };
    if (typeof maybe._seconds === "number") {
      const millis = maybe._seconds * 1000 + (maybe._nanoseconds ?? 0) / 1_000_000;
      return new Date(millis);
    }
  }

  return new Date();
};

export const nowIso = (): string => new Date().toISOString();
