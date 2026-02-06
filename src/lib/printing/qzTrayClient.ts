"use client";

const QZ_WEBSOCKET_PORTS = {
  secure: [8181, 8282, 8383, 8484],
  insecure: [8182, 8283, 8384, 8485],
};

let qzInstance: any | null = null;
let configured = false;
let certCache: string | null = null;

const getQz = async () => {
  if (qzInstance) return qzInstance;

  const mod = await import('qz-tray');
  qzInstance = (mod as any).default ?? mod;
  return qzInstance;
};

const configureSecurity = (qz: any) => {
  if (configured) return;

  qz.security.setCertificatePromise(async (resolve: (value: string) => void) => {
    try {
      if (certCache) {
        resolve(certCache);
        return;
      }

      const response = await fetch('/api/qz/certificate', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        resolve('');
        return;
      }

      const certificate = await response.text();
      certCache = certificate;
      resolve(certificate);
    } catch {
      // Fallback to unsigned mode when signed mode is unavailable.
      resolve('');
    }
  });
  qz.security.setSignatureAlgorithm('SHA256');
  qz.security.setSignaturePromise((toSign: string) => {
    return async (resolve: (value: string) => void, _reject: (reason?: unknown) => void) => {
      try {
        const response = await fetch('/api/qz/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ request: toSign }),
          cache: 'no-store',
        });

        if (!response.ok) {
          resolve('');
          return;
        }

        const signature = await response.text();
        resolve(signature);
      } catch {
        // Fallback to unsigned mode when signing service is unavailable.
        resolve('');
      }
    };
  });

  configured = true;
};

export const isQzActive = async (): Promise<boolean> => {
  try {
    const qz = await getQz();
    return Boolean(qz.websocket.isActive());
  } catch {
    return false;
  }
};

export const connectQz = async (): Promise<void> => {
  const qz = await getQz();
  configureSecurity(qz);

  if (qz.websocket.isActive()) {
    return;
  }

  const useSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

  await qz.websocket.connect({
    host: ['localhost', '127.0.0.1'],
    usingSecure: useSecure,
    retries: 0,
    delay: 0,
    port: QZ_WEBSOCKET_PORTS,
  });
};

export const disconnectQz = async (): Promise<void> => {
  const qz = await getQz();
  if (qz.websocket.isActive()) {
    await qz.websocket.disconnect();
  }
};

export const findQzPrinters = async (): Promise<string[]> => {
  const qz = await getQz();
  if (!qz.websocket.isActive()) {
    await connectQz();
  }

  const printers = await qz.printers.find();
  if (Array.isArray(printers)) {
    return printers;
  }
  if (typeof printers === 'string' && printers.length > 0) {
    return [printers];
  }
  return [];
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
};

export const printPdfWithQz = async (printerName: string, pdfBlob: Blob): Promise<void> => {
  if (!printerName) {
    throw new Error('No hay impresora configurada para QZ Tray.');
  }

  const qz = await getQz();

  if (!qz.websocket.isActive()) {
    await connectQz();
  }

  const base64 = await blobToBase64(pdfBlob);
  const config = qz.configs.create(printerName, {
    copies: 1,
    scaleContent: true,
  });

  await qz.print(config, [
    {
      type: 'pixel',
      format: 'pdf',
      flavor: 'base64',
      data: base64,
    },
  ]);
};
