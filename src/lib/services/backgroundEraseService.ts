'use server';

const BACKGROUNDERASE_API_URL = "https://api.backgrounderase.com/v2";
const BACKGROUNDERASE_API_KEY = process.env.BACKGROUNDERASE_API_KEY;

if (!BACKGROUNDERASE_API_KEY) {
  console.warn("Missing BACKGROUNDERASE_API_KEY environment variable");
}

const MAX_ERROR_TEXT_LENGTH = 500;

const truncate = (value: string) =>
  value.length > MAX_ERROR_TEXT_LENGTH ? `${value.slice(0, MAX_ERROR_TEXT_LENGTH)}...` : value;

export const removeBackgroundWithBackgroundErase = async (
  imageBuffer: Buffer,
  fileName = "product-image.png"
): Promise<Buffer> => {
  if (!BACKGROUNDERASE_API_KEY) {
    throw new Error("Missing BACKGROUNDERASE_API_KEY environment variable");
  }

  const formData = new FormData();
  formData.append("image_file", new Blob([imageBuffer], { type: "application/octet-stream" }), fileName);

  const response = await fetch(BACKGROUNDERASE_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": BACKGROUNDERASE_API_KEY,
    },
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    const rawError = await response.text();
    throw new Error(`BackgroundErase failed (${response.status}): ${truncate(rawError)}`);
  }

  return Buffer.from(await response.arrayBuffer());
};
