import { createSign } from "crypto";

const normalizePem = (value: string): string => {
  const trimmed = value.trim();
  const direct = trimmed.replace(/\\n/g, "\n");

  if (direct.startsWith("-----BEGIN")) {
    return direct;
  }

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8").trim();
    if (decoded.startsWith("-----BEGIN")) {
      return decoded;
    }
  } catch {
    // ignore decode errors and use direct value
  }

  return direct;
};

const readEnvPem = (keys: string[]): string | null => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return normalizePem(value);
    }
  }

  return null;
};

export const getQzCertificatePem = (): string | null => {
  return readEnvPem(["QZ_CERT_PEM", "QZ_CERTIFICATE_PEM"]);
};

export const getQzPrivateKeyPem = (): string | null => {
  return readEnvPem(["QZ_PRIVATE_KEY_PEM", "QZ_PRIVATE_KEY"]);
};

export const signQzPayload = (payload: string): string => {
  const key = getQzPrivateKeyPem();
  if (!key) {
    throw new Error("QZ private key is not configured.");
  }

  const signer = createSign("RSA-SHA256");
  signer.update(payload);
  signer.end();

  const passphrase = process.env.QZ_PRIVATE_KEY_PASSPHRASE;

  return signer.sign(
    passphrase
      ? {
          key,
          passphrase,
        }
      : key,
    "base64"
  );
};
