export const DEFAULT_BRANCH_TIME_ZONE = "America/Mexico_City";

export const BRANCH_TIME_ZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "America/Mexico_City", label: "México Centro (CDMX)" },
  { value: "America/Cancun", label: "México Sureste (Cancún)" },
  { value: "America/Merida", label: "México Sureste (Mérida)" },
  { value: "America/Monterrey", label: "México Norte (Monterrey)" },
  { value: "America/Chihuahua", label: "México Noroeste (Chihuahua)" },
  { value: "America/Tijuana", label: "México Frontera (Tijuana)" },
];

const getPart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string => {
  const part = parts.find((item) => item.type === type);
  return part?.value ?? "";
};

export const isValidIanaTimeZone = (timeZone?: string | null): boolean => {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const sanitizeBranchTimeZone = (timeZone?: string | null): string => {
  return isValidIanaTimeZone(timeZone) ? timeZone : DEFAULT_BRANCH_TIME_ZONE;
};

export const toDateKeyInBranchTimeZone = (
  value: Date | string | number,
  timeZone?: string | null
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const safeTimeZone = sanitizeBranchTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};

export const formatDateTimeInBranchTimeZone = (
  value: Date | string | number,
  timeZone?: string | null,
  locale = "es-MX",
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  const safeTimeZone = sanitizeBranchTimeZone(timeZone);

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: safeTimeZone,
  }).format(date);
};
