'use server';

const REMOVE_BG_API_URL = "https://api.remove.bg/v1.0/removebg";
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

if (!REMOVE_BG_API_KEY) {
  console.warn("Missing REMOVE_BG_API_KEY environment variable");
}

const MAX_ERROR_TEXT_LENGTH = 500;

export const removeBackgroundWithRemoveBg = async (
  imageBuffer: Buffer,
  fileName = "product-image.png"
): Promise<Buffer> => {
  if (!REMOVE_BG_API_KEY) {
    throw new Error("Missing REMOVE_BG_API_KEY environment variable");
  }

  const formData = new FormData();
  formData.append("image_file", new Blob([imageBuffer], { type: "application/octet-stream" }), fileName);
  formData.append("size", "auto");
  formData.append("format", "png");

  const response = await fetch(REMOVE_BG_API_URL, {
    method: "POST",
    headers: {
      "X-Api-Key": REMOVE_BG_API_KEY,
    },
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    const rawError = await response.text();
    const errorText =
      rawError.length > MAX_ERROR_TEXT_LENGTH
        ? `${rawError.slice(0, MAX_ERROR_TEXT_LENGTH)}...`
        : rawError;
    throw new Error(`remove.bg failed (${response.status}): ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
};
