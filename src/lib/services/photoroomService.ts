'use server';

const PHOTOROOM_SEGMENT_URL = "https://sdk.photoroom.com/v1/segment";
const PHOTOROOM_ACCOUNT_URL = "https://image-api.photoroom.com/v2/account";
const PHOTOROOM_API_KEY = process.env.PHOTOROOM_API_KEY;

if (!PHOTOROOM_API_KEY) {
  console.warn("Missing PHOTOROOM_API_KEY environment variable");
}

const MAX_ERROR_TEXT_LENGTH = 500;

const truncate = (value: string) =>
  value.length > MAX_ERROR_TEXT_LENGTH ? `${value.slice(0, MAX_ERROR_TEXT_LENGTH)}...` : value;

export const removeBackgroundWithPhotoroom = async (
  imageBuffer: Buffer,
  fileName = "product-image.png"
): Promise<Buffer> => {
  if (!PHOTOROOM_API_KEY) {
    throw new Error("Missing PHOTOROOM_API_KEY environment variable");
  }

  const formData = new FormData();
  formData.append("image_file", new Blob([imageBuffer], { type: "application/octet-stream" }), fileName);
  formData.append("format", "png");
  formData.append("channels", "rgba");
  formData.append("size", "full");
  formData.append("crop", "false");

  const response = await fetch(PHOTOROOM_SEGMENT_URL, {
    method: "POST",
    headers: {
      "x-api-key": PHOTOROOM_API_KEY,
    },
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    const rawError = await response.text();
    throw new Error(`PhotoRoom failed (${response.status}): ${truncate(rawError)}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

export const getPhotoroomAccount = async (): Promise<unknown> => {
  if (!PHOTOROOM_API_KEY) {
    throw new Error("Missing PHOTOROOM_API_KEY environment variable");
  }

  const response = await fetch(PHOTOROOM_ACCOUNT_URL, {
    headers: {
      "x-api-key": PHOTOROOM_API_KEY,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const rawError = await response.text();
    throw new Error(`PhotoRoom account failed (${response.status}): ${truncate(rawError)}`);
  }

  return response.json();
};
