export const MM_TO_PX = 3.7795275591;

export const mmToPixels = (mm: number, scale = 1) => mm * MM_TO_PX * scale;

export const pixelsToMm = (px: number, scale = 1) => (px / (MM_TO_PX * scale));

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const roundTo = (value: number, precision = 2) => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};
